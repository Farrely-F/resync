import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MissingFixtureError, runStructured } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";

const mockEnv: AppEnv = { aiMode: "mock", model: "openrouter/free", apiKey: null };
const liveEnv: AppEnv = { aiMode: "live", model: "openrouter/free", apiKey: "sk-test" };

const schema = z.object({ headline: z.string() });

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

describe("runStructured", () => {
  it("fails loudly when mock mode has no recorded fixture for the task", async () => {
    await expect(
      runStructured({
        task: "parse-resume",
        schema,
        instructions: "unused",
        prompt: "unused",
        env: mockEnv,
        fixtures: {},
      }),
    ).rejects.toBeInstanceOf(MissingFixtureError);
  });

  it("serves a recorded fixture in mock mode and makes no network call", async () => {
    const result = await runStructured({
      task: "parse-resume",
      schema,
      instructions: "unused",
      prompt: "unused",
      env: mockEnv,
      fixtures: { "parse-resume": { headline: "Systems Engineer" } },
    });

    expect(result).toEqual({ headline: "Systems Engineer" });
  });

  it("rejects a stale fixture that no longer satisfies the schema", async () => {
    await expect(
      runStructured({
        task: "parse-resume",
        schema,
        instructions: "unused",
        prompt: "unused",
        env: mockEnv,
        fixtures: { "parse-resume": { headline: 42 } },
      }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("returns validated structured output in live mode", async () => {
    const model = modelReturning({ headline: "Backend Engineer" });

    const result = await runStructured({
      task: "extract-jd",
      schema,
      instructions: "Extract the headline.",
      prompt: "A job posting.",
      env: liveEnv,
      model,
    });

    expect(result).toEqual({ headline: "Backend Engineer" });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doGenerateCalls[0].prompt.length).toBeGreaterThan(0);
  });
});
