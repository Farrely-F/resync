import { describe, expect, it } from "vitest";

import ashbyFixture from "@/lib/jd/fixtures/ashby.json";
import greenhouseFixture from "@/lib/jd/fixtures/greenhouse.json";
import leverNotFoundFixture from "@/lib/jd/fixtures/lever-not-found.json";
import leverFixture from "@/lib/jd/fixtures/lever.json";
import linkedinJobFixture from "@/lib/jd/fixtures/linkedin-job.html?raw";
import linkedinSearchFixture from "@/lib/jd/fixtures/linkedin-search.html?raw";
import {
  InvalidJobUrlError,
  classifyHost,
  extractAshbyJob,
  extractGreenhouseJob,
  extractLeverPosting,
  extractLinkedInJob,
  htmlToText,
  isPrivateHostname,
  linkedInJobIds,
  normalizeText,
  planExtraction,
  readableArticle,
} from "@/lib/jd/hosts";

describe("classifyHost", () => {
  it.each([
    ["boards.greenhouse.io", "greenhouse"],
    ["job-boards.greenhouse.io", "greenhouse"],
    ["boards-api.greenhouse.io", "greenhouse"],
    ["jobs.ashbyhq.com", "ashby"],
    ["api.ashbyhq.com", "ashby"],
    ["jobs.lever.co", "lever"],
    ["api.lever.co", "lever"],
    ["www.linkedin.com", "linkedin"],
    ["linkedin.com", "linkedin"],
    ["uk.linkedin.com", "linkedin"],
    ["www.linkedin.cn", "linkedin"],
  ])("routes %s to %s", (host, expected) => {
    expect(classifyHost(host)).toBe(expected);
  });

  it("falls back to generic for unknown and look-alike hosts", () => {
    expect(classifyHost("example.com")).toBe("generic");
    expect(classifyHost("careers.example.com")).toBe("generic");
    expect(classifyHost("notgreenhouse.io")).toBe("generic");
    expect(classifyHost("linkedin.com.evil.example")).toBe("generic");
  });
});

describe("planExtraction", () => {
  it("uses the single-posting Greenhouse endpoint when the URL names a job", () => {
    const plan = planExtraction("https://boards.greenhouse.io/stripe/jobs/8172510");
    expect(plan).toMatchObject({
      source: "greenhouse",
      contentType: "json",
      shape: "single",
      jobKey: "8172510",
      requestUrl: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs/8172510?content=true",
    });
  });

  it("falls back to the Greenhouse board list when no job id is present", () => {
    const plan = planExtraction("https://job-boards.greenhouse.io/stripe");
    expect(plan).toMatchObject({
      source: "greenhouse",
      shape: "board",
      jobKey: null,
      requestUrl: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true",
    });
  });

  it("reads the Greenhouse embed form", () => {
    const plan = planExtraction("https://job-boards.greenhouse.io/embed/job_app?for=stripe&token=8172510");
    expect(plan).toMatchObject({ shape: "single", jobKey: "8172510" });
  });

  it("routes an Ashby job URL to the board API with the posting id", () => {
    const plan = planExtraction("https://jobs.ashbyhq.com/openai/8fb1615c-34bf-47c4-a1d1-b7b2f836bbd3");
    expect(plan).toMatchObject({
      source: "ashby",
      jobKey: "8fb1615c-34bf-47c4-a1d1-b7b2f836bbd3",
      requestUrl: "https://api.ashbyhq.com/posting-api/job-board/openai?includeCompensation=true",
    });
  });

  it("uses the single-posting Lever endpoint when the URL names a job", () => {
    const plan = planExtraction("https://jobs.lever.co/leverdemo/681fbc53-1e34-4a46-8677-3a78118674eb");
    expect(plan).toMatchObject({
      source: "lever",
      shape: "single",
      requestUrl: "https://api.lever.co/v0/postings/leverdemo/681fbc53-1e34-4a46-8677-3a78118674eb?mode=json",
    });
  });

  it("fetches the Lever board when the URL names only an org", () => {
    const plan = planExtraction("https://jobs.lever.co/leverdemo");
    expect(plan).toMatchObject({ source: "lever", shape: "board", jobKey: null });
  });

  it("recognises a LinkedIn job URL, including a slugged one", () => {
    expect(planExtraction("https://www.linkedin.com/jobs/view/4419969671")).toMatchObject({
      source: "linkedin",
      kind: "job",
      jobId: "4419969671",
      requestUrl: "https://www.linkedin.com/jobs/view/4419969671",
    });
    expect(
      planExtraction("https://www.linkedin.com/jobs/view/senior-software-engineer-go-at-general-motors-4419969671"),
    ).toMatchObject({ kind: "job", jobId: "4419969671" });
  });

  it("turns a LinkedIn search page into a guest search request", () => {
    const plan = planExtraction("https://www.linkedin.com/jobs/search/?keywords=go%20engineer&location=Berlin");
    expect(plan).toMatchObject({
      source: "linkedin",
      kind: "search",
      requestUrl: "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=go+engineer&location=Berlin",
    });
  });

  it("passes unknown hosts through untouched for readable-text extraction", () => {
    expect(planExtraction("https://example.com/careers/123")).toMatchObject({
      source: "generic",
      contentType: "html",
      requestUrl: "https://example.com/careers/123",
    });
  });

  it("rejects non-http protocols and unparseable input", () => {
    expect(() => planExtraction("file:///etc/passwd")).toThrow(InvalidJobUrlError);
    expect(() => planExtraction("javascript:alert(1)")).toThrow(InvalidJobUrlError);
    expect(() => planExtraction("not a url")).toThrow(InvalidJobUrlError);
    expect(() => planExtraction("")).toThrow(InvalidJobUrlError);
  });
});

describe("isPrivateHostname", () => {
  it.each([
    "localhost",
    "api.localhost",
    "intranet",
    "printer.local",
    "vault.internal",
    "metadata.google.internal",
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks %s", (host) => {
    expect(isPrivateHostname(host)).toBe(true);
  });

  it.each(["example.com", "boards.greenhouse.io", "www.linkedin.com", "8.8.8.8", "172.32.0.1", "93.184.216.34"])(
    "allows %s",
    (host) => {
      expect(isPrivateHostname(host)).toBe(false);
    },
  );
});

describe("greenhouse extraction", () => {
  it("selects the requested posting from a board response", () => {
    const parsed = extractGreenhouseJob(greenhouseFixture, "8172510");
    expect(parsed).not.toBeNull();
    expect(parsed?.hints.title).toBe("Abuse Investigator");
    expect(parsed?.hints.company).toBe("Stripe");
    expect(parsed?.text).toContain("Stripe is a financial infrastructure platform");
    expect(parsed?.text).not.toContain("must not be selected");
    expect(parsed?.text.length).toBeGreaterThan(1000);
  });

  it("parses the single-posting response shape", () => {
    const parsed = extractGreenhouseJob(greenhouseFixture.jobs[0], "8172510");
    expect(parsed?.hints.title).toBe("Abuse Investigator");
  });

  it("returns null for an unknown posting id", () => {
    expect(extractGreenhouseJob(greenhouseFixture, "999999999")).toBeNull();
  });

  it("does not emit raw markup", () => {
    const parsed = extractGreenhouseJob(greenhouseFixture, "8172510");
    expect(parsed?.text).not.toMatch(/<(h2|p|span|strong)\b/i);
    expect(parsed?.text).not.toContain("&lt;");
  });
});

describe("ashby extraction", () => {
  const jobId = ashbyFixture.jobs[0].id;

  it("selects the posting by id", () => {
    const parsed = extractAshbyJob(ashbyFixture, jobId);
    expect(parsed?.hints.title).toBe(ashbyFixture.jobs[0].title);
    expect(parsed?.hints.location).toBe(ashbyFixture.jobs[0].location);
    expect(parsed?.text.length).toBeGreaterThan(100);
  });

  it("returns null for an unknown posting id", () => {
    expect(extractAshbyJob(ashbyFixture, "no-such-id")).toBeNull();
  });
});

describe("lever extraction", () => {
  const job = leverFixture[0];

  it("selects the posting by id from a board array", () => {
    const parsed = extractLeverPosting(leverFixture, job.id);
    expect(parsed?.hints.title).toBe(job.text);
    expect(parsed?.hints.location).toBe(job.categories.location);
    expect(parsed?.text).toBe(normalizeText(job.descriptionPlain));
  });

  it("parses the single-posting shape", () => {
    const parsed = extractLeverPosting(job, job.id);
    expect(parsed?.hints.title).toBe(job.text);
  });

  it("returns null for an unknown posting id and for the not-found payload", () => {
    expect(extractLeverPosting(leverFixture, "no-such-id")).toBeNull();
    expect(extractLeverPosting(leverNotFoundFixture, null)).toBeNull();
  });
});

describe("linkedin extraction", () => {
  it("lists job ids from a guest search response in page order", () => {
    expect(linkedInJobIds(linkedinSearchFixture)).toEqual(["4419969671", "4470016722", "4455931376"]);
  });

  it("returns no ids when the search response has no cards", () => {
    expect(linkedInJobIds("<html><body>No results</body></html>")).toEqual([]);
  });

  it("extracts description text and hints from a posting page", () => {
    const parsed = extractLinkedInJob(linkedinJobFixture);
    expect(parsed).not.toBeNull();
    expect(parsed?.hints.company).toBe("General Motors");
    expect(parsed?.hints.title).toBe("Senior Software Engineer – Go (Golang)");
    expect(parsed?.hints.location).toBe("Warren, MI");
    expect(parsed?.text).toContain("high-performance middleware");
    expect(parsed?.text.length).toBeGreaterThan(500);
  });

  it("returns null when the page carries no description container", () => {
    expect(extractLinkedInJob("<html><body><p>Sign in to LinkedIn</p></body></html>")).toBeNull();
  });
});

describe("generic readable extraction", () => {
  it("pulls the article body and title from a plain page", () => {
    const html = `<html><head><title>Backend Engineer at Acme</title></head><body>
      <nav>Home About</nav>
      <article><h1>Backend Engineer</h1>${"<p>We are hiring a backend engineer to build reliable services in Go and Postgres.</p>".repeat(12)}</article>
      <footer>Copyright</footer></body></html>`;

    const parsed = readableArticle(html);
    expect(parsed?.hints.title).toBe("Backend Engineer at Acme");
    expect(parsed?.text).toContain("reliable services in Go and Postgres");
  });

  it("returns null for a page with no readable content", () => {
    expect(readableArticle("<html><body></body></html>")).toBeNull();
  });
});

describe("text normalisation", () => {
  it("decodes entity-escaped markup and strips tags, keeping paragraph breaks", () => {
    const escaped = "&lt;h2&gt;About&lt;/h2&gt;&lt;p&gt;Line one&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Item A&lt;/li&gt;&lt;li&gt;Item B&lt;/li&gt;&lt;/ul&gt;";
    const text = htmlToText(escaped);
    expect(text).toBe("About\n\nLine one\n\nItem A\n\nItem B");
  });

  it("collapses runs of blank lines and trailing whitespace", () => {
    expect(normalizeText(" a  b \n\n\n  c  \n\n")).toBe("a b\n\nc");
  });
});
