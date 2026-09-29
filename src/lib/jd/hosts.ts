import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

/**
 * Hostname routing for job-description intake.
 *
 * Everything here is pure: it maps a pasted URL to the endpoint that actually
 * carries the text, and turns recorded API/page bodies into plain text. Network
 * calls live in `extract.ts`, so these rules are unit-tested against fixtures
 * with no network involved.
 */

export type JdSource = "greenhouse" | "ashby" | "lever" | "linkedin" | "generic";

export class InvalidJobUrlError extends Error {
  constructor(input: string) {
    super(`Not a usable job URL: ${JSON.stringify(input)}`);
    this.name = "InvalidJobUrlError";
  }
}

export interface BoardPlan {
  source: "greenhouse" | "ashby" | "lever";
  contentType: "json";
  requestUrl: string;
  /** Posting identifier parsed from the pasted URL, or null for a whole board. */
  jobKey: string | null;
  /** `single` means the endpoint returns one posting object; `board` returns a list. */
  shape: "single" | "board";
}

export interface LinkedInJobPlan {
  source: "linkedin";
  contentType: "html";
  kind: "job";
  requestUrl: string;
  jobId: string;
}

export interface LinkedInSearchPlan {
  source: "linkedin";
  contentType: "html";
  kind: "search";
  /** Guest search endpoint returning job cards. */
  requestUrl: string;
}

export interface GenericPlan {
  source: "generic";
  contentType: "html";
  requestUrl: string;
}

export type ExtractionPlan = BoardPlan | LinkedInJobPlan | LinkedInSearchPlan | GenericPlan;

export interface JobHints {
  title: string | null;
  company: string | null;
  location: string | null;
}

export interface ParsedJob {
  hints: JobHints;
  text: string;
}

const sourceByHost: Record<string, JdSource> = {
  "boards.greenhouse.io": "greenhouse",
  "job-boards.greenhouse.io": "greenhouse",
  "boards-api.greenhouse.io": "greenhouse",
  "jobs.ashbyhq.com": "ashby",
  "api.ashbyhq.com": "ashby",
  "jobs.lever.co": "lever",
  "api.lever.co": "lever",
};

export function classifyHost(hostname: string): JdSource {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  const known = sourceByHost[host];
  if (known) {
    return known;
  }
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "linkedin.cn" || host.endsWith(".linkedin.cn")) {
    return "linkedin";
  }

  return "generic";
}

function segments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function greenhousePlan(url: URL): ExtractionPlan {
  let parts = segments(url.pathname);
  if (parts[0] === "v1" && parts[1] === "boards") {
    parts = parts.slice(2);
  }

  const isEmbed = parts[0] === "embed";
  const org = isEmbed ? (url.searchParams.get("for") ?? "") : (parts[0] ?? "");
  const rawId = isEmbed ? url.searchParams.get("token") : parts[1] === "jobs" || parts[1] === "job" ? parts[2] : null;
  const jobKey = rawId && /^\d+$/.test(rawId) ? rawId : null;

  // The single-posting endpoint is an order of magnitude smaller than the board
  // list, which can reach several megabytes on large boards.
  if (jobKey) {
    return {
      source: "greenhouse",
      contentType: "json",
      requestUrl: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(org)}/jobs/${jobKey}?content=true`,
      jobKey,
      shape: "single",
    };
  }

  return {
    source: "greenhouse",
    contentType: "json",
    requestUrl: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(org)}/jobs?content=true`,
    jobKey: null,
    shape: "board",
  };
}

function ashbyPlan(url: URL): ExtractionPlan {
  let parts = segments(url.pathname);
  if (parts[0] === "posting-api" && parts[1] === "job-board") {
    parts = parts.slice(2);
  }

  const org = parts[0] ?? "";
  const jobKey = parts[1] ?? null;

  return {
    source: "ashby",
    contentType: "json",
    // Ashby publishes no single-posting endpoint on the public board API, so the
    // board is fetched and the posting is selected by id.
    requestUrl: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}?includeCompensation=true`,
    jobKey,
    shape: "board",
  };
}

function leverPlan(url: URL): ExtractionPlan {
  let parts = segments(url.pathname);
  if (parts[0] === "v0" && parts[1] === "postings") {
    parts = parts.slice(2);
  }

  const org = parts[0] ?? "";
  const jobKey = parts[1] ?? null;

  if (jobKey) {
    return {
      source: "lever",
      contentType: "json",
      requestUrl: `https://api.lever.co/v0/postings/${encodeURIComponent(org)}/${encodeURIComponent(jobKey)}?mode=json`,
      jobKey,
      shape: "single",
    };
  }

  return {
    source: "lever",
    contentType: "json",
    requestUrl: `https://api.lever.co/v0/postings/${encodeURIComponent(org)}?mode=json`,
    jobKey: null,
    shape: "board",
  };
}

const linkedInSearchApiPath = "/jobs-guest/jobs/api/seeMoreJobPostings/search";

function linkedInPlan(url: URL): ExtractionPlan {
  const parts = segments(url.pathname);

  if (url.pathname.includes("/jobs/view/")) {
    const slug = parts[parts.length - 1] ?? "";
    const id = slug.match(/(\d+)$/)?.[1];
    if (id) {
      return {
        source: "linkedin",
        contentType: "html",
        kind: "job",
        requestUrl: `https://www.linkedin.com/jobs/view/${id}`,
        jobId: id,
      };
    }
  }

  const isSearchApi = url.pathname.includes(linkedInSearchApiPath);
  const isSearchPage = parts[0] === "jobs" && (parts[1] === "search" || parts[1] === "collections");

  if (isSearchApi || isSearchPage) {
    const params = url.searchParams.toString();
    return {
      source: "linkedin",
      contentType: "html",
      kind: "search",
      requestUrl: `https://www.linkedin.com${linkedInSearchApiPath}${params ? `?${params}` : ""}`,
    };
  }

  return { source: "generic", contentType: "html", requestUrl: url.href };
}

/**
 * Maps a pasted URL to the request that carries the posting text. Never performs
 * I/O: the caller fetches `requestUrl` and feeds the body back into a parser.
 */
export function planExtraction(rawUrl: string): ExtractionPlan {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new InvalidJobUrlError(rawUrl);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidJobUrlError(rawUrl);
  }

  switch (classifyHost(url.hostname)) {
    case "greenhouse":
      return greenhousePlan(url);
    case "ashby":
      return ashbyPlan(url);
    case "lever":
      return leverPlan(url);
    case "linkedin":
      return linkedInPlan(url);
    default:
      return { source: "generic", contentType: "html", requestUrl: url.href };
  }
}

export function linkedInJobUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs/view/${jobId}`;
}

/**
 * Rejects addresses that must never be requested from the server: loopback,
 * private ranges, link-local (cloud metadata), and bare intranet names.
 */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

  if (host === "" || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }

  if (host === "metadata.google.internal") {
    return true;
  }

  if (/^[0-9a-f:.]+$/.test(host) && host.includes(":")) {
    // IPv6, including IPv4-mapped addresses.
    const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      return isPrivateIpv4(mapped[1]);
    }
    if (host === "::" || host === "::1") {
      return true;
    }
    const firstGroup = parseInt(host.split(":")[0] || "0", 16);
    if (Number.isNaN(firstGroup)) {
      return false;
    }
    // fc00::/7 unique-local, fe80::/10 link-local.
    return (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return isPrivateIpv4(host);
  }

  // A hostname with no dot is an intranet name, not a public site.
  return !host.includes(".");
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function decodeHtmlEntities(value: string): string {
  const { document } = parseHTML(`<div id="__root">${value}</div>`);
  return document.getElementById("__root")?.textContent ?? value;
}

const blockPattern = /<\/?(?:p|div|section|article|ul|ol|li|h[1-6]|table|tr|td|th|blockquote|pre|figure)\b[^>]*>/gi;

/** Collapses runs of whitespace while keeping paragraph breaks. */
export function normalizeText(value: string): string {
  const lines = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim());

  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && out[out.length - 1] === "") {
      continue;
    }
    out.push(line);
  }

  return out.join("\n").replace(/^\n+|\n+$/g, "");
}

/**
 * Converts a block of HTML to readable text. Accepts entity-escaped markup as
 * well, because Greenhouse returns its `content` field double-encoded.
 */
export function htmlToText(html: string): string {
  const decoded = decodeHtmlEntities(html);
  const withBreaks = decoded.replace(/<br\s*\/?>/gi, "\n").replace(blockPattern, "\n");
  const { document } = parseHTML(`<!doctype html><html><body>${withBreaks}</body></html>`);
  for (const node of document.querySelectorAll("script, style, noscript, template")) {
    node.remove();
  }

  return normalizeText(document.body?.textContent ?? "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function matchesKey(candidate: string | null, jobKey: string | null): boolean {
  if (!jobKey) {
    return true;
  }
  return candidate !== null && candidate.includes(jobKey);
}

export function extractGreenhouseJob(data: unknown, jobKey: string | null): ParsedJob | null {
  const record = asRecord(data);
  if (!record) {
    return null;
  }

  let job: Record<string, unknown> | null = null;
  if (Array.isArray(record.jobs)) {
    const jobs = record.jobs.map(asRecord).filter((value): value is Record<string, unknown> => value !== null);
    job =
      jobKey === null
        ? (jobs[0] ?? null)
        : (jobs.find(
            (candidate) =>
              String(candidate.id ?? "") === jobKey || matchesKey(asString(candidate.absolute_url), jobKey),
          ) ?? null);
  } else if (typeof record.content === "string") {
    job = record;
  }

  if (!job) {
    return null;
  }

  const content = asString(job.content);
  if (!content) {
    return null;
  }

  return {
    hints: {
      title: asString(job.title),
      company: asString(job.company_name),
      location: asString(asRecord(job.location)?.name),
    },
    text: htmlToText(content),
  };
}

export function extractAshbyJob(data: unknown, jobKey: string | null): ParsedJob | null {
  const record = asRecord(data);
  const jobs = Array.isArray(record?.jobs)
    ? (record.jobs as unknown[]).map(asRecord).filter((value): value is Record<string, unknown> => value !== null)
    : [];
  if (jobs.length === 0) {
    return null;
  }

  const job =
    jobKey === null
      ? jobs[0]
      : (jobs.find(
          (candidate) => String(candidate.id ?? "") === jobKey || matchesKey(asString(candidate.jobUrl), jobKey),
        ) ?? null);
  if (!job) {
    return null;
  }

  const text = asString(job.descriptionPlain) ?? asString(job.descriptionHtml) ?? "";
  if (text === "") {
    return null;
  }

  return {
    hints: { title: asString(job.title), company: null, location: asString(job.location) },
    text: normalizeText(text),
  };
}

export function extractLeverPosting(data: unknown, jobKey: string | null): ParsedJob | null {
  if (asRecord(data)?.ok === false) {
    return null;
  }

  const candidates = (Array.isArray(data) ? data : [data])
    .map(asRecord)
    .filter((value): value is Record<string, unknown> => value !== null);
  if (candidates.length === 0) {
    return null;
  }

  const job =
    jobKey === null
      ? candidates[0]
      : (candidates.find(
          (candidate) => String(candidate.id ?? "") === jobKey || matchesKey(asString(candidate.hostedUrl), jobKey),
        ) ?? null);
  if (!job) {
    return null;
  }

  const description = asString(job.descriptionPlain);
  const html = asString(job.description);
  const text = description ? normalizeText(description) : html ? htmlToText(html) : null;
  if (!text) {
    return null;
  }

  const categories = asRecord(job.categories);

  return {
    hints: {
      title: asString(job.text),
      company: null,
      location: asString(categories?.location),
    },
    text,
  };
}

const linkedInAuthwallPatterns = [/authwall/i, /Sign in to LinkedIn/i, /Join now to see/i, /Sign in to see who you already know/i];

export function looksLikeLoginWall(html: string): boolean {
  return linkedInAuthwallPatterns.some((pattern) => pattern.test(html));
}

/** Job ids from a guest search response, in the order the page lists them. */
export function linkedInJobIds(html: string): string[] {
  const ids: string[] = [];
  const pattern = /urn:li:jobPosting:(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }

  return ids;
}

function titleFromLinkedInTitleTag(html: string): { title: string | null; company: string | null; location: string | null } {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!raw) {
    return { title: null, company: null, location: null };
  }

  const cleaned = raw.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  const hiring = cleaned.match(/^(.*?)\s+hiring\s+(.*?)(?:\s+in\s+(.*))?$/i);
  if (hiring) {
    return {
      company: hiring[1]?.trim() || null,
      title: hiring[2]?.trim() || null,
      location: hiring[3]?.trim() || null,
    };
  }

  return { title: cleaned || null, company: null, location: null };
}

export function extractLinkedInJob(html: string): ParsedJob | null {
  const { document } = parseHTML(html);
  const container = document.querySelector(".description__text, .show-more-less-html__markup");
  if (!container) {
    return null;
  }

  const domTitle = document.querySelector(".topcard__title")?.textContent?.trim() || null;
  const domCompany = document.querySelector(".topcard__org-name-link")?.textContent?.trim() || null;
  const fromTag = domTitle && domCompany ? { title: domTitle, company: domCompany, location: null } : titleFromLinkedInTitleTag(html);

  const text = normalizeText(container.textContent ?? "");
  if (text.length === 0) {
    return null;
  }

  return {
    hints: {
      title: domTitle ?? fromTag.title,
      company: domCompany ?? fromTag.company,
      location: fromTag.location,
    },
    text,
  };
}

/** Generic fallback: readable article text for anything without a known API. */
export function readableArticle(html: string): ParsedJob | null {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document, { charThreshold: 0 }).parse();
  if (!article) {
    return null;
  }

  const text = normalizeText(article.textContent ?? "");
  if (text.length === 0) {
    return null;
  }

  return { hints: { title: asString(article.title), company: null, location: null }, text };
}
