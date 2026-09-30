import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { type BackoffPolicy } from "@/lib/ai/backoff";
import { AiFailureError } from "@/lib/ai/failures";
import { MissingFixtureError, runStructured } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";

const mockEnv: AppEnv = { aiMode: "mock", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: {} };
const liveEnv: AppEnv = { aiMode: "live", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: { openrouter: "sk-test" } };
const fallbackEnv: AppEnv = {
  aiMode: "live",
  provider: "openrouter",
  model: "primary/model",
  fallbacks: [
    { provider: "openrouter", modelId: "fallback/one" },
    { provider: "openrouter", modelId: "fallback/two" },
  ],
  apiKeys: { openrouter: "sk-test" },
};

/** Two providers configured, which is what makes a quota failure recoverable. */
const crossProviderEnv: AppEnv = {
  aiMode: "live",
  provider: "openrouter",
  model: "openrouter/free",
  fallbacks: [
    { provider: "openrouter", modelId: "openrouter/second" },
    { provider: "groq", modelId: "llama-3.3-70b-versatile" },
  ],
  apiKeys: { openrouter: "sk-or-test", groq: "gsk-test" },
};

const schema = z.object({ headline: z.string() });

/** Waits between attempts are real here, so keep them tiny. */
const quickPolicy: BackoffPolicy = { maxAttempts: 3, baseDelayMs: 1, factor: 2, maxDelayMs: 5 };

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

function modelFailing(error: unknown) {
  return new MockLanguageModelV4({
    doGenerate: () => {
      throw error;
    },
  });
}

function providerError(status: number, headers?: Record<string, string>) {
  return new APICallError({
    message: `provider answered ${status}`,
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    statusCode: status,
    responseHeaders: headers,
    isRetryable: true,
  });
}

const liveCall = { task: "extract-jd", schema, instructions: "Extract the headline.", prompt: "A job posting." } as const;

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

describe("runStructured under a throttled or broken provider", () => {
  it("retries a 429 within the attempt budget, then reports the spent allowance", async () => {
    const model = modelFailing(providerError(429));

    const failure = await runStructured({ ...liveCall, env: liveEnv, model, backoff: quickPolicy }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(AiFailureError);
    expect((failure as AiFailureError).kind).toBe("quota");
    expect(model.doGenerateCalls).toHaveLength(quickPolicy.maxAttempts);
  });

  it("does not sit out a Retry-After longer than the cap: it reports it instead", async () => {
    const model = modelFailing(providerError(429, { "Retry-After": "60" }));

    const failure = await runStructured({ ...liveCall, env: liveEnv, model, backoff: quickPolicy }).catch(
      (error: unknown) => error,
    );

    expect(model.doGenerateCalls).toHaveLength(1);
    expect((failure as AiFailureError).kind).toBe("quota");
    expect((failure as AiFailureError).retryAfterSeconds).toBe(60);
  });

  it("stops at the provider whose allowance is spent instead of trying its other models", async () => {
    const seen: string[] = [];
    const model = modelFailing(providerError(429));

    await runStructured({
      ...liveCall,
      env: fallbackEnv,
      backoff: quickPolicy,
      modelFor: (target) => {
        seen.push(`${target.provider}:${target.modelId}`);
        return model;
      },
    }).catch(() => undefined);

    // Both fallbacks here belong to the same provider, so neither is attempted.
    expect(seen).toEqual(["openrouter:primary/model"]);
    expect(model.doGenerateCalls).toHaveLength(quickPolicy.maxAttempts);
  });

  it("moves to a different provider when one provider's allowance is spent", async () => {
    const seen: string[] = [];
    const good = modelReturning({ headline: "Backend Engineer" });
    const spent = modelFailing(providerError(429));

    const result = await runStructured({
      ...liveCall,
      env: crossProviderEnv,
      backoff: quickPolicy,
      modelFor: (target) => {
        seen.push(`${target.provider}:${target.modelId}`);
        return target.provider === "groq" ? good : spent;
      },
    });

    expect(result).toEqual({ headline: "Backend Engineer" });
    // The second OpenRouter model is skipped: its key is the exhausted one.
    expect(seen).toEqual(["openrouter:openrouter/free", "groq:llama-3.3-70b-versatile"]);
    expect(good.doGenerateCalls).toHaveLength(1);
  });

  it("walks the fallback list in order after a 503 and stops at the model that answers", async () => {
    const seen: string[] = [];
    const good = modelReturning({ headline: "Backend Engineer" });
    const bad = modelFailing(providerError(503));

    const result = await runStructured({
      ...liveCall,
      env: fallbackEnv,
      backoff: quickPolicy,
      modelFor: (target) => {
        seen.push(target.modelId);
        return target.modelId === "fallback/two" ? good : bad;
      },
    });

    expect(result).toEqual({ headline: "Backend Engineer" });
    expect(seen).toEqual(["primary/model", "fallback/one", "fallback/two"]);
    // A 503 is routing failing, not a slow provider: each model is tried once.
    expect(bad.doGenerateCalls).toHaveLength(2);
    expect(good.doGenerateCalls).toHaveLength(1);
  });

  it("reports a provider failure once the last fallback has also failed", async () => {
    const model = modelFailing(providerError(503));

    const failure = await runStructured({
      ...liveCall,
      env: fallbackEnv,
      backoff: quickPolicy,
      modelFor: () => model,
    }).catch((error: unknown) => error);

    expect((failure as AiFailureError).kind).toBe("provider");
    expect((failure as AiFailureError).routing).toBe(true);
    expect(model.doGenerateCalls).toHaveLength(fallbackEnv.fallbacks.length + 1);
  });

  it("does not retry a provider it cannot reach at all", async () => {
    const model = modelFailing(new TypeError("fetch failed", { cause: new Error("ECONNREFUSED") }));

    const failure = await runStructured({ ...liveCall, env: liveEnv, model, backoff: quickPolicy }).catch(
      (error: unknown) => error,
    );

    expect((failure as AiFailureError).kind).toBe("offline");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("ends a model call that never answers with a timeout instead of hanging", async () => {
    const model = new MockLanguageModelV4({ doGenerate: () => new Promise<never>(() => undefined) });

    const failure = await runStructured({
      ...liveCall,
      env: liveEnv,
      model,
      deadlineMs: 25,
      backoff: quickPolicy,
    }).catch((error: unknown) => error);

    expect((failure as AiFailureError).kind).toBe("timeout");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("collapses two identical concurrent requests into one model call", async () => {
    const model = modelReturning({ headline: "Backend Engineer" });

    const [first, second] = await Promise.all([
      runStructured({ ...liveCall, env: liveEnv, model }),
      runStructured({ ...liveCall, env: liveEnv, model }),
    ]);

    expect(first).toEqual({ headline: "Backend Engineer" });
    expect(second).toEqual(first);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("keeps different requests apart", async () => {
    const model = modelReturning({ headline: "Backend Engineer" });

    await Promise.all([
      runStructured({ ...liveCall, env: liveEnv, model, prompt: "One posting." }),
      runStructured({ ...liveCall, env: liveEnv, model, prompt: "Another posting." }),
    ]);

    expect(model.doGenerateCalls).toHaveLength(2);
  });
});
