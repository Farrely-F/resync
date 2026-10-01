import { describe, expect, it } from "vitest";

import { failureResponse, POST } from "@/app/api/practice/route";
import { AiFailureError } from "@/lib/ai/failures";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import { parseResumeFixture } from "@/lib/resume/fixtures";

process.env.AI_MODE = "mock";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/practice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    resume: parseResumeFixture,
    jd: extractJdFixture,
    criteria: analyzeMatchFixture.criteria.map((criterion, index) => ({ ...criterion, id: `criterion-${index + 1}` })),
    question: { question: "Tell me about the ledger migration.", why: "w", how: "h" },
    answer: "I moved the ledger to sharded Postgres and cut p99 write latency by 60%.",
    earlier: null,
    ...overrides,
  };
}

describe("POST /api/practice", () => {
  it("grades one answer from the recording in mock mode", async () => {
    const response = await post(validBody());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.aiMode).toBe("mock");
    expect(payload.grade.verdicts).toBeDefined();
    expect(payload.grade).not.toHaveProperty("score");
  });

  it("never asks a second follow-up, whatever the model returns", async () => {
    const response = await post(validBody({ earlier: { question: "First?", answer: "First answer." } }));
    expect((await response.json()).grade.followUp).toBeNull();
  });

  it("rejects bad JSON, an empty answer and an oversized one with a local reason", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post(validBody({ answer: "   " }))).status).toBe(400);
    expect((await post(validBody({ answer: "x".repeat(4001) }))).status).toBe(400);
  });
});

describe("failureResponse", () => {
  it("uses the statuses the analyze route uses", () => {
    expect(failureResponse(new AiFailureError("quota", "x")).status).toBe(429);
    expect(failureResponse(new AiFailureError("timeout", "x")).status).toBe(504);
  });
});
