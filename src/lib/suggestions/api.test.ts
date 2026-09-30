import { afterEach, describe, expect, it, vi } from "vitest";

import { failureResponse } from "@/app/api/suggestions/route";
import { AiFailureError } from "@/lib/ai/failures";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { requestSuggestions, suggestionsDeadlineMs } from "@/lib/suggestions/api";

/**
 * The client half of the failure vocabulary, checked against the server's own
 * serializer: the body `failureResponse` produces is the body this parser reads,
 * so a 429 cannot arrive as a generic model error.
 */

function body() {
  return {
    resume: parseResumeFixture,
    jd: extractJdFixture,
    criteria: [{ id: "c1", kind: "required" as const, requirement: "Go", verdict: "missing" as const, evidence: null }],
  };
}

function stubFetch(response: Response) {
  const requests: { url: unknown; init?: RequestInit }[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      requests.push({ url, init });
      return response;
    }),
  );

  return requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestSuggestions", () => {
  it("surfaces a spent allowance as quota, with the wait the provider asked for", async () => {
    const { status, body: failure } = failureResponse(
      new AiFailureError("quota", "detail", { retryAfterSeconds: 20 }),
    );
    stubFetch(new Response(JSON.stringify(failure), { status, headers: { "content-type": "application/json" } }));

    const caught: unknown = await requestSuggestions(body()).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(AiFailureError);
    if (!(caught instanceof AiFailureError)) {
      return;
    }

    expect(caught.kind).toBe("quota");
    expect(caught.retryable).toBe(true);
    expect(caught.retryAfterSeconds).toBe(20);
    expect(caught.message).toContain("allowance");
  });

  it("keeps every class the route sent rather than collapsing them", async () => {
    for (const kind of ["quota", "provider", "offline", "timeout", "config", "unknown"] as const) {
      const { status, body: failure } = failureResponse(new AiFailureError(kind, "detail"));
      stubFetch(new Response(JSON.stringify(failure), { status, headers: { "content-type": "application/json" } }));

      const caught: unknown = await requestSuggestions(body()).catch((error: unknown) => error);

      expect(caught, kind).toBeInstanceOf(AiFailureError);
      expect(caught instanceof AiFailureError ? caught.kind : null, kind).toBe(kind);
    }
  });

  it("reads a failure body the route did not classify as unknown, keeping its message", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { reason: "missing-fixture", message: "No recorded fixture here." } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const caught: unknown = await requestSuggestions(body()).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(AiFailureError);
    expect(caught instanceof AiFailureError ? caught.kind : null).toBe("unknown");
    expect(caught instanceof Error ? caught.message : "").toBe("No recorded fixture here.");
  });

  it("reads an unreadable body as unknown rather than throwing something else", async () => {
    stubFetch(new Response("not json", { status: 502 }));

    const caught: unknown = await requestSuggestions(body()).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(AiFailureError);
    expect(caught instanceof AiFailureError ? caught.kind : null).toBe("unknown");
  });

  it("returns the proposals, and gives the request a deadline rather than hanging", async () => {
    const requests = stubFetch(
      new Response(
        JSON.stringify({
          suggestions: [
            {
              id: "abc",
              targetId: "work.1.highlights.0",
              target: { section: "work", entryIndex: 1, field: "highlights", itemIndex: 0 },
              current: "Built the pipeline.",
              proposed: "Built the pipeline, handling 400M events a day.",
              rationale: "Names the throughput.",
              criterionId: "c1",
              requirement: "Go",
            },
          ],
          dropped: [{ reason: "not-grounded", targetId: "work.0.highlights.2", proposed: "Volkswagen.", detail: "Invented." }],
          groundingDropped: 1,
          modelCalls: 2,
          model: "openrouter/free",
          aiMode: "mock",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await requestSuggestions(body());

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].proposed).toContain("400M events");
    expect(result.dropped).toHaveLength(1);
    expect(result.groundingDropped).toBe(1);
    expect(result.modelCalls).toBe(2);

    const init = requests[0]?.init;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(suggestionsDeadlineMs).toBeGreaterThan(60_000);
  });
});
