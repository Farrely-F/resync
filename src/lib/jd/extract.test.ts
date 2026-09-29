import { describe, expect, it, vi } from "vitest";

import ashbyFixture from "@/lib/jd/fixtures/ashby.json";
import greenhouseFixture from "@/lib/jd/fixtures/greenhouse.json";
import leverFixture from "@/lib/jd/fixtures/lever.json";
import linkedinJobFixture from "@/lib/jd/fixtures/linkedin-job.html?raw";
import linkedinSearchFixture from "@/lib/jd/fixtures/linkedin-search.html?raw";
import { extractJd, type FetchLike } from "@/lib/jd/extract";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

const neverCalled: FetchLike = () => {
  throw new Error("fetch must not be called");
};

describe("extractJd", () => {
  it("rejects an unusable URL without touching the network", async () => {
    const outcome = await extractJd("not-a-url", { fetchImpl: neverCalled });
    expect(outcome).toMatchObject({ ok: false, reason: "invalid-url" });
  });

  it("refuses a private address before fetching", async () => {
    const fetchImpl = vi.fn(neverCalled);
    const outcome = await extractJd("http://127.0.0.1:8080/jobs", { fetchImpl });
    expect(outcome).toMatchObject({ ok: false, reason: "private-network" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("re-validates redirects so a public URL cannot bounce to metadata", async () => {
    const fetchImpl: FetchLike = async (input) => {
      if (String(input).includes("169.254")) {
        throw new Error("must not fetch the redirect target");
      }
      return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
    };

    const outcome = await extractJd("https://example.com/job", { fetchImpl });
    expect(outcome).toMatchObject({ ok: false, reason: "private-network" });
  });

  it("reports a timeout when the site does not answer in time", async () => {
    const fetchImpl: FetchLike = (_input, init) => {
      const { promise, reject } = Promise.withResolvers<Response>();
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("expected an abort signal"));
      } else {
        signal.addEventListener("abort", () => reject(signal.reason));
      }
      return promise;
    };

    const outcome = await extractJd("https://example.com/job", { fetchImpl, timeoutMs: 10 });
    expect(outcome).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("reports a network error when the request itself fails", async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError("fetch failed");
    };

    const outcome = await extractJd("https://example.com/job", { fetchImpl });
    expect(outcome).toMatchObject({ ok: false, reason: "network-error" });
  });

  it.each([
    [404, "not-found"],
    [410, "not-found"],
    [401, "login-required"],
    [403, "blocked"],
    [429, "blocked"],
    [503, "network-error"],
  ])("maps HTTP %i to %s", async (status, reason) => {
    const outcome = await extractJd("https://example.com/job", {
      fetchImpl: async () => new Response("nope", { status, headers: { "content-type": "text/html" } }),
    });
    expect(outcome).toMatchObject({ ok: false, reason });
  });

  it("maps LinkedIn's non-standard 999 status to blocked", async () => {
    const outcome = await extractJd("https://www.linkedin.com/jobs/view/4419969671", {
      fetchImpl: async () => {
        const response = new Response("nope", { status: 200, headers: { "content-type": "text/html" } });
        // The Response constructor rejects out-of-range statuses, so the real
        // 999 is reproduced by overriding the instance property.
        Object.defineProperty(response, "status", { value: 999 });
        return response;
      },
    });
    expect(outcome).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("treats a bot challenge served with 200 as blocked", async () => {
    const outcome = await extractJd("https://example.com/job", {
      fetchImpl: async () => htmlResponse("<html><body>Just a moment... Enable JavaScript and cookies to continue</body></html>"),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("refuses a response larger than the cap by declared length", async () => {
    const outcome = await extractJd("https://example.com/job", {
      fetchImpl: async () => {
        const response = htmlResponse("<html><body>hello</body></html>");
        response.headers.set("content-length", "900000");
        return response;
      },
      maxBytes: 1000,
    });
    expect(outcome).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("refuses a streamed response that grows past the cap", async () => {
    const big = "x".repeat(5000);
    const outcome = await extractJd("https://example.com/job", {
      fetchImpl: async () => htmlResponse(`<html><body><article>${big}</article></body></html>`),
      maxBytes: 1000,
    });
    expect(outcome).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("refuses a non-HTML response", async () => {
    const outcome = await extractJd("https://example.com/job", {
      fetchImpl: async () => new Response("PDF", { status: 200, headers: { "content-type": "application/pdf" } }),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "unsupported-content" });
  });

  it("structurally extracts a Greenhouse posting from the single-job endpoint", async () => {
    const requests: string[] = [];
    const outcome = await extractJd("https://boards.greenhouse.io/stripe/jobs/8172510", {
      fetchImpl: async (input) => {
        requests.push(String(input));
        return jsonResponse(greenhouseFixture.jobs[0]);
      },
    });

    expect(requests[0]).toBe("https://boards-api.greenhouse.io/v1/boards/stripe/jobs/8172510?content=true");
    expect(outcome).toMatchObject({ ok: true, source: "greenhouse" });
    if (outcome.ok) {
      expect(outcome.hints.title).toBe("Abuse Investigator");
      expect(outcome.rawText).toContain("Stripe is a financial infrastructure platform");
    }
  });

  it("returns not-found when the board has no matching posting", async () => {
    const outcome = await extractJd("https://boards.greenhouse.io/stripe/jobs/123456789", {
      fetchImpl: async () => jsonResponse(greenhouseFixture),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("extracts an Ashby posting", async () => {
    const outcome = await extractJd("https://jobs.ashbyhq.com/openai/8fb1615c-34bf-47c4-a1d1-b7b2f836bbd3", {
      fetchImpl: async () => jsonResponse(ashbyFixture),
    });
    expect(outcome).toMatchObject({ ok: true, source: "ashby" });
    if (outcome.ok) {
      expect(outcome.hints.title).toBe(ashbyFixture.jobs[0].title);
      expect(outcome.rawText.length).toBeGreaterThan(100);
    }
  });

  it("extracts a Lever posting and handles the not-found payload", async () => {
    const ok = await extractJd("https://jobs.lever.co/leverdemo/681fbc53-1e34-4a46-8677-3a78118674eb", {
      fetchImpl: async () => jsonResponse(leverFixture[0]),
    });
    expect(ok).toMatchObject({ ok: true, source: "lever" });

    const missing = await extractJd("https://jobs.lever.co/leverdemo/nope", {
      fetchImpl: async () => jsonResponse({ ok: false, error: "Document not found" }, 404),
    });
    expect(missing).toMatchObject({ ok: false, reason: "not-found" });
  });

  it("extracts a LinkedIn posting", async () => {
    const outcome = await extractJd("https://www.linkedin.com/jobs/view/4419969671", {
      fetchImpl: async () => htmlResponse(linkedinJobFixture),
    });
    expect(outcome).toMatchObject({ ok: true, source: "linkedin" });
    if (outcome.ok) {
      expect(outcome.hints.company).toBe("General Motors");
      expect(outcome.rawText).toContain("high-performance middleware");
    }
  });

  it("resolves a LinkedIn search page to its first posting", async () => {
    const requests: string[] = [];
    const outcome = await extractJd("https://www.linkedin.com/jobs/search/?keywords=go", {
      fetchImpl: async (input) => {
        requests.push(String(input));
        return String(input).includes("seeMoreJobPostings") ? htmlResponse(linkedinSearchFixture) : htmlResponse(linkedinJobFixture);
      },
    });

    expect(requests[0]).toContain("/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=go");
    expect(requests[1]).toBe("https://www.linkedin.com/jobs/view/4419969671");
    expect(outcome).toMatchObject({ ok: true, source: "linkedin" });
  });

  it("reports a login wall when LinkedIn serves a sign-in page", async () => {
    const outcome = await extractJd("https://www.linkedin.com/jobs/view/4419969671", {
      fetchImpl: async () => htmlResponse("<html><body><p>Sign in to LinkedIn</p><div id='authwall'></div></body></html>"),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "login-required" });
  });

  it("reports a JavaScript-only LinkedIn page honestly", async () => {
    const outcome = await extractJd("https://www.linkedin.com/jobs/view/4419969671", {
      fetchImpl: async () => htmlResponse("<html><body><div id='root'></div></body></html>"),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "javascript-required" });
  });

  it("falls back to readable text for an unknown host", async () => {
    const article = `<html><head><title>Backend Engineer at Acme</title></head><body><article><h1>Backend Engineer</h1>${"<p>Build reliable Go services and Postgres schemas.</p>".repeat(10)}</article></body></html>`;
    const outcome = await extractJd("https://careers.example.com/jobs/42", {
      fetchImpl: async () => htmlResponse(article),
    });
    expect(outcome).toMatchObject({ ok: true, source: "generic" });
    if (outcome.ok) {
      expect(outcome.rawText).toContain("Build reliable Go services");
    }
  });

  it("reports a JavaScript-only generic page honestly", async () => {
    const outcome = await extractJd("https://careers.example.com/jobs/42", {
      fetchImpl: async () => htmlResponse("<html><body><div id='__next'></div></body></html>"),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "javascript-required" });
  });

  it("reports an empty page distinctly from a JavaScript one", async () => {
    const outcome = await extractJd("https://careers.example.com/jobs/42", {
      fetchImpl: async () => htmlResponse(`<html><head><title>Job</title></head><body><article><p>Too short.</p></article></body></html>`),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "empty" });
  });

  it("treats malformed JSON from a board API as unsupported content", async () => {
    const outcome = await extractJd("https://boards.greenhouse.io/stripe/jobs/8172510", {
      fetchImpl: async () => new Response("<html>maintenance</html>", { status: 200, headers: { "content-type": "application/json" } }),
    });
    expect(outcome).toMatchObject({ ok: false, reason: "unsupported-content" });
  });
});
