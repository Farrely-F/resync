import {
  InvalidJobUrlError,
  extractAshbyJob,
  extractGreenhouseJob,
  extractLeverPosting,
  extractLinkedInJob,
  isPrivateHostname,
  linkedInJobIds,
  linkedInJobUrl,
  looksLikeLoginWall,
  planExtraction,
  readableArticle,
  type ExtractionPlan,
  type JobHints,
  type JdSource,
} from "@/lib/jd/hosts";

/**
 * Server-side JD extraction.
 *
 * Failure is a normal outcome here: job sites block, rate-limit, sign-wall and
 * JavaScript-render constantly, so every branch returns a specific reason that
 * the UI pairs with a paste-the-text path. The fetch itself is defended:
 * timeouts, redirect re-validation, size caps, content-type checks and a
 * private-address refusal so the endpoint cannot be used to probe the network.
 */

export type ExtractionFailureReason =
  | "invalid-url"
  | "private-network"
  | "timeout"
  | "not-found"
  | "blocked"
  | "login-required"
  | "javascript-required"
  | "unsupported-content"
  | "too-large"
  | "network-error"
  | "empty";

export interface ExtractionResult {
  ok: true;
  source: JdSource;
  url: string;
  rawText: string;
  hints: JobHints;
}

export type ExtractionSuccess = ExtractionResult;

export interface ExtractionFailure {
  ok: false;
  reason: ExtractionFailureReason;
  message: string;
  url: string;
  /** Always true: the intake UI must offer pasting the text as an alternative. */
  canPaste: true;
}

export type ExtractionOutcome = ExtractionResult | ExtractionFailure;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ExtractOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxBytes?: number;
}

const defaultTimeoutMs = 15_000;
const defaultMaxBytes = 20 * 1024 * 1024;
const maxRedirects = 3;
const minTextLength = 120;

const browserUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const failureMessages: Record<ExtractionFailureReason, string> = {
  "invalid-url": "That is not a valid http(s) job URL.",
  "private-network": "Refusing to fetch a private or local address.",
  timeout: "The site took too long to respond and the request was stopped.",
  "not-found": "The posting was not found at that URL; it may have been removed or the link may be wrong.",
  blocked: "The site refused the request, usually bot protection or rate limiting.",
  "login-required": "The posting is behind a sign-in wall, so its text could not be read.",
  "javascript-required": "The page renders its content with JavaScript, so the posting text was not in the response.",
  "unsupported-content": "The URL did not return a readable job posting.",
  "too-large": "The response was too large to process.",
  "network-error": "The page could not be loaded.",
  empty: "The page contained no readable job description text.",
};

function fail(reason: ExtractionFailureReason, url: string): ExtractionFailure {
  return { ok: false, reason, message: failureMessages[reason], url, canPaste: true };
}

class TooLargeError extends Error {
  constructor() {
    super("Response exceeded the size cap");
    this.name = "TooLargeError";
  }
}

function looksLikeBotChallenge(html: string): boolean {
  return /Just a moment|cf-challenge|Attention Required|Enable JavaScript and cookies to continue|Access Denied/i.test(html);
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
}

/**
 * Performs the request while re-validating every redirect hop, so a public URL
 * cannot bounce the server into a private address.
 */
async function fetchChecked(
  target: string,
  fetchImpl: FetchLike,
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<{ response: Response; finalUrl: string }> {
  let current = new URL(target);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new InvalidJobUrlError(current.href);
    }
    if (isPrivateHostname(current.hostname)) {
      throw new PrivateAddressError(current.href);
    }

    const response = await fetchImpl(current, { redirect: "manual", signal, headers });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return { response, finalUrl: current.href };
      }
      current = new URL(location, current);
      continue;
    }

    return { response, finalUrl: current.href };
  }

  throw new Error(`Too many redirects while fetching ${target}`);
}

class PrivateAddressError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Private address: ${url}`);
    this.name = "PrivateAddressError";
    this.url = url;
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && Number.parseInt(declared, 10) > maxBytes) {
    throw new TooLargeError();
  }

  const body = response.body;
  if (!body) {
    return response.text();
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new TooLargeError();
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

function statusFailure(status: number, html: string): ExtractionFailureReason | null {
  if (status === 401) {
    return "login-required";
  }
  if (status === 403 || status === 429 || status === 999) {
    return "blocked";
  }
  if (status === 404 || status === 410) {
    return "not-found";
  }
  if (status >= 500) {
    return "network-error";
  }
  if (status >= 400) {
    return looksLikeBotChallenge(html) ? "blocked" : "unsupported-content";
  }

  return null;
}

interface Body {
  text: string;
  finalUrl: string;
}

async function load(
  plan: ExtractionPlan,
  target: string,
  options: Required<Pick<ExtractOptions, "fetchImpl" | "timeoutMs" | "maxBytes">>,
): Promise<Body | ExtractionFailure> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  const headers: Record<string, string> = {
    "user-agent": browserUserAgent,
    accept: plan.contentType === "json" ? "application/json, text/plain;q=0.8, */*;q=0.1" : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    "accept-language": "en-US,en;q=0.9",
  };

  let response: Response;
  let finalUrl: string;
  try {
    ({ response, finalUrl } = await fetchChecked(target, options.fetchImpl, signal, headers));
  } catch (error) {
    if (error instanceof PrivateAddressError) {
      return fail("private-network", error.url);
    }
    if (error instanceof InvalidJobUrlError) {
      return fail("invalid-url", target);
    }
    return fail(isAbortError(error) ? "timeout" : "network-error", target);
  }

  let text: string;
  try {
    text = await readCapped(response, options.maxBytes);
  } catch (error) {
    if (error instanceof TooLargeError) {
      return fail("too-large", finalUrl);
    }
    return fail(isAbortError(error) ? "timeout" : "network-error", finalUrl);
  }

  const statusReason = statusFailure(response.status, text);
  if (statusReason) {
    return fail(statusReason, finalUrl);
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const expectsHtml = plan.contentType === "html";
  const contentTypeMatches = expectsHtml
    ? contentType.includes("html") || contentType.includes("xhtml") || contentType === ""
    : contentType.includes("json") || contentType.includes("text/plain");
  if (!contentTypeMatches) {
    return fail(plan.contentType === "json" && looksLikeBotChallenge(text) ? "blocked" : "unsupported-content", finalUrl);
  }

  return { text, finalUrl };
}

function parseForPlan(plan: ExtractionPlan, body: Body): ExtractionResult | ExtractionFailure {
  if (looksLikeBotChallenge(body.text)) {
    return fail("blocked", body.finalUrl);
  }

  if (plan.source === "greenhouse" || plan.source === "ashby" || plan.source === "lever") {
    let data: unknown;
    try {
      data = JSON.parse(body.text);
    } catch {
      return fail(looksLikeBotChallenge(body.text) ? "blocked" : "unsupported-content", body.finalUrl);
    }

    const parsed =
      plan.source === "greenhouse"
        ? extractGreenhouseJob(data, plan.jobKey)
        : plan.source === "ashby"
          ? extractAshbyJob(data, plan.jobKey)
          : extractLeverPosting(data, plan.jobKey);

    if (!parsed) {
      return fail("not-found", body.finalUrl);
    }
    if (parsed.text.length < minTextLength) {
      return fail("empty", body.finalUrl);
    }

    return { ok: true, source: plan.source, url: body.finalUrl, rawText: parsed.text, hints: parsed.hints };
  }

  if (plan.source === "linkedin") {
    const parsed = extractLinkedInJob(body.text);
    if (!parsed) {
      return fail(looksLikeLoginWall(body.text) ? "login-required" : "javascript-required", body.finalUrl);
    }
    if (parsed.text.length < minTextLength) {
      return fail("empty", body.finalUrl);
    }

    return { ok: true, source: "linkedin", url: body.finalUrl, rawText: parsed.text, hints: parsed.hints };
  }

  const parsed = readableArticle(body.text);
  if (!parsed || parsed.text.length < minTextLength) {
    if (looksLikeLoginWall(body.text)) {
      return fail("login-required", body.finalUrl);
    }
    return fail(parsed ? "empty" : "javascript-required", body.finalUrl);
  }

  return { ok: true, source: "generic", url: body.finalUrl, rawText: parsed.text, hints: parsed.hints };
}

/** Fetches a job URL and returns plain description text, or a specific reason it could not. */
export async function extractJd(rawUrl: string, options: ExtractOptions = {}): Promise<ExtractionOutcome> {
  const resolved = {
    fetchImpl: options.fetchImpl ?? ((input, init) => fetch(input, init)),
    timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
    maxBytes: options.maxBytes ?? defaultMaxBytes,
  };

  let plan: ExtractionPlan;
  try {
    plan = planExtraction(rawUrl);
  } catch (error) {
    if (error instanceof InvalidJobUrlError) {
      return fail("invalid-url", rawUrl);
    }
    return fail("invalid-url", rawUrl);
  }

  const requested = plan.requestUrl;
  if (isPrivateHostname(new URL(requested).hostname)) {
    return fail("private-network", requested);
  }

  const body = await load(plan, requested, resolved);
  if ("ok" in body) {
    return body;
  }

  if (plan.source === "linkedin" && plan.kind === "search") {
    const [jobId] = linkedInJobIds(body.text);
    if (!jobId) {
      return fail(looksLikeLoginWall(body.text) ? "login-required" : "javascript-required", body.finalUrl);
    }

    const jobUrl = linkedInJobUrl(jobId);
    const jobPlan: ExtractionPlan = {
      source: "linkedin",
      contentType: "html",
      kind: "job",
      requestUrl: jobUrl,
      jobId,
    };
    const jobBody = await load(jobPlan, jobUrl, resolved);
    if ("ok" in jobBody) {
      return jobBody;
    }

    return parseForPlan(jobPlan, jobBody);
  }

  return parseForPlan(plan, body);
}
