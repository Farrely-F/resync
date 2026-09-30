import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/suggestions/route";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import { parseResumeFixture } from "@/lib/resume/fixtures";

/**
 * The route runs both model calls and hands back what survived plus what was
 * dropped. It must never persist anything: the report's criteria come from the
 * browser and the proposals go back to it.
 */

process.env.AI_MODE = "mock";

function postRequest(body: string) {
  return new Request("http://localhost/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function validBody() {
  return JSON.stringify({
    resume: parseResumeFixture,
    jd: extractJdFixture,
    criteria: analyzeMatchFixture.criteria.map((criterion, index) => ({ ...criterion, id: `criterion-${index + 1}` })),
  });
}

describe("POST /api/suggestions", () => {
  it("returns 400 for malformed JSON rather than throwing", async () => {
    const response = await POST(postRequest("{not json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { reason: "invalid-json", message: "Request body must be valid JSON." },
    });
  });

  it("returns 400 when the body is not a resume, a posting and a criteria list", async () => {
    for (const body of [JSON.stringify({}), JSON.stringify({ resume: parseResumeFixture }), JSON.stringify({ resume: parseResumeFixture, jd: extractJdFixture, criteria: [{ id: "x" }] })]) {
      const response = await POST(postRequest(body));

      expect(response.status).toBe(400);
      const payload = (await response.json()) as { error: { reason: string } };
      expect(payload.error.reason).toBe("invalid-request");
    }
  });

  it("returns the grounded proposals and the count the grounding check dropped", async () => {
    const response = await POST(postRequest(validBody()));

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      suggestions: { targetId: string; current: string; proposed: string }[];
      dropped: { reason: string; detail: string }[];
      groundingDropped: number;
      modelCalls: number;
      model: string;
      aiMode: string;
    };

    expect(payload.modelCalls).toBe(2);
    expect(payload.aiMode).toBe("mock");
    expect(payload.model).toBeTruthy();
    expect(payload.suggestions.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.0", "basics.summary"]);
    // The current text comes from the resume we sent, not from the model.
    expect(payload.suggestions[0].current).toBe(parseResumeFixture.work[1].highlights[0]);
    expect(payload.dropped).toHaveLength(1);
    expect(payload.dropped[0].reason).toBe("not-grounded");
    expect(payload.dropped[0].detail).toContain("Volkswagen");
    expect(payload.groundingDropped).toBe(1);
  });

  it("returns suggestions that are not applied to anything", async () => {
    const before = JSON.stringify(parseResumeFixture);

    await POST(postRequest(validBody()));

    expect(JSON.stringify(parseResumeFixture)).toBe(before);
  });
});
