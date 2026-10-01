import { describe, expect, it } from "vitest";

import { failureResponse, POST } from "@/app/api/documents/route";
import { AiFailureError } from "@/lib/ai/failures";
import { failureStatusByKind } from "@/lib/ai/http";
import { documentKinds } from "@/lib/documents/types";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import { parseResumeFixture } from "@/lib/resume/fixtures";

/**
 * One route, three documents. What is worth pinning here is the pipeline rather
 * than the prose: every kind answers in the shape its panel renders, the evidence
 * travels with the request because it lives in the browser, and a model failure
 * leaves in the shared vocabulary with the same statuses `/api/analyze` uses.
 *
 * The default mode is mock, so these run with no network and no key — which is
 * also the mode a fresh clone starts in.
 */

process.env.AI_MODE = "mock";

function postRequest(body: string) {
  return new Request("http://localhost/api/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function validBody(kind: string) {
  return JSON.stringify({
    kind,
    resume: parseResumeFixture,
    jd: extractJdFixture,
    criteria: analyzeMatchFixture.criteria.map((criterion, index) => ({ ...criterion, id: `criterion-${index + 1}` })),
    summary: "The resume covers the platform work and misses the device integration.",
  });
}

describe("POST /api/documents", () => {
  it("answers a prose document for the letter and the message", async () => {
    for (const kind of ["cover-letter", "outreach"] as const) {
      const response = await POST(postRequest(validBody(kind)));
      const body = (await response.json()) as {
        content: { shape: string; subject: string | null; body: string };
        model: string;
        aiMode: string;
      };

      expect(response.status).toBe(200);
      expect(body.content.shape).toBe("prose");
      expect(body.content.body.trim().length).toBeGreaterThan(0);
      expect(body.aiMode).toBe("mock");
      // A letter has no subject line; an email cannot be sent without one.
      expect(body.content.subject === null).toBe(kind === "cover-letter");
    }
  });

  it("answers a set of questions for interview prep", async () => {
    const response = await POST(postRequest(validBody("interview-prep")));
    const body = (await response.json()) as { content: { shape: string; questions: unknown[] } };

    expect(response.status).toBe(200);
    expect(body.content.shape).toBe("questions");
    expect(body.content.questions.length).toBeGreaterThanOrEqual(5);
    expect(body.content.questions.length).toBeLessThanOrEqual(8);
  });

  it("refuses a kind it does not write", async () => {
    const response = await POST(postRequest(validBody("dissertation")));

    expect(response.status).toBe(400);
    expect((await response.json()) as { error: { reason: string } }).toMatchObject({
      error: { reason: "invalid-request" },
    });
  });

  it("refuses a body that is not JSON", async () => {
    const response = await POST(postRequest("{not json"));

    expect(response.status).toBe(400);
    expect((await response.json()) as { error: { reason: string } }).toMatchObject({
      error: { reason: "invalid-json" },
    });
  });

  it("covers every kind the app offers", () => {
    // If a kind is added without a spec, this fails here rather than on the page.
    expect(documentKinds).toHaveLength(3);
  });
});

describe("failureResponse", () => {
  it("uses the shared status map, so one failure reads the same on every page", () => {
    // Asserted against the map itself rather than against numbers repeated here:
    // a second copy of the mapping is a second thing to keep in step.
    for (const kind of ["quota", "provider", "offline", "timeout", "config", "unknown"] as const) {
      const { status, body } = failureResponse(new AiFailureError(kind, "message"));

      expect(status).toBe(failureStatusByKind[kind]);
      expect(body.error.kind).toBe(kind);
      expect(body.error.message.length).toBeGreaterThan(0);
    }
  });
});
