import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import { MissingFixtureError } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import { analyzeMatchEvidence, criterionEvidenceSchema } from "@/lib/match/analyze";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import { parseResumeFixture } from "@/lib/resume/fixtures";

const mockEnv: AppEnv = { aiMode: "mock", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: {} };
const liveEnv: AppEnv = { aiMode: "live", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: { openrouter: "sk-test" } };

function modelReturning(json: unknown) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(json) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

const input = { resume: parseResumeFixture, jd: extractJdFixture };

describe("analyzeMatchEvidence", () => {
  it("replays the feature's own recording in mock mode and makes no network call", async () => {
    const evidence = await analyzeMatchEvidence({ ...input, env: mockEnv });

    expect(evidence.criteria.map((criterion) => criterion.requirement)).toEqual(
      analyzeMatchFixture.criteria.map((criterion) => criterion.requirement),
    );
    expect(evidence.criteria.map((criterion) => criterion.verdict)).toEqual(
      analyzeMatchFixture.criteria.map((criterion) => criterion.verdict),
    );
    expect(evidence.summary).toBe(analyzeMatchFixture.summary);
  });

  it("mints its own criterion ids rather than asking the model for them", async () => {
    const first = await analyzeMatchEvidence({ ...input, env: mockEnv });
    const second = await analyzeMatchEvidence({ ...input, env: mockEnv });

    expect(first.criteria.every((criterion) => criterion.id.length > 0)).toBe(true);
    expect(new Set(first.criteria.map((criterion) => criterion.id)).size).toBe(first.criteria.length);
    expect(first.criteria.map((criterion) => criterion.id)).not.toEqual(second.criteria.map((criterion) => criterion.id));
  });

  it("fails loudly when mock mode has no recording for the task", async () => {
    await expect(analyzeMatchEvidence({ ...input, env: mockEnv, fixtures: {} })).rejects.toBeInstanceOf(
      MissingFixtureError,
    );
  });

  it("rejects a verdict outside the frozen vocabulary instead of scoring it", async () => {
    const model = modelReturning({
      criteria: [{ kind: "required", requirement: "Go", verdict: "excellent", evidence: null }],
      summary: null,
    });

    // The live path wraps the schema failure, so the error is recognised by shape.
    await expect(analyzeMatchEvidence({ ...input, env: liveEnv, model })).rejects.toSatisfy(isInvalidModelOutputError);
  });

  it("returns validated criteria from a live model", async () => {
    const model = modelReturning({
      criteria: [{ kind: "seniority", requirement: "Senior level", verdict: "met", evidence: "Senior Engineer" }],
      summary: "A good match.",
    });

    const evidence = await analyzeMatchEvidence({ ...input, env: liveEnv, model });

    expect(evidence.criteria).toHaveLength(1);
    expect(evidence.criteria[0]).toMatchObject({ kind: "seniority", verdict: "met", evidence: "Senior Engineer" });
    expect(evidence.summary).toBe("A good match.");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("drops a score the model volunteers, so it can never reach the report", () => {
    const parsed = criterionEvidenceSchema.parse({ criteria: [], summary: null, score: 91 });

    expect(parsed).toEqual({ criteria: [], summary: null });
    expect("score" in parsed).toBe(false);
  });

  it("asks the model for verdicts and explicitly not for a number", async () => {
    const model = modelReturning({ criteria: [], summary: null });

    await analyzeMatchEvidence({ ...input, env: liveEnv, model });

    const call = model.doGenerateCalls[0];
    const promptText = JSON.stringify(call);
    expect(promptText).toContain("Never return a score");
    expect(promptText).toContain("Go (Golang)");
  });

  it("does not touch the network in mock mode", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await analyzeMatchEvidence({ ...input, env: mockEnv });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
