import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MissingFixtureError } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { jdSchema } from "@/lib/jd/schema";
import { buildJdPrompt, isInvalidModelOutputError, structureJd } from "@/lib/jd/structure";

const mockEnv: AppEnv = { aiMode: "mock", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: {} };
const liveEnv: AppEnv = { aiMode: "live", provider: "openrouter", model: "openrouter/free", fallbacks: [], apiKeys: { openrouter: "sk-test" } };

function modelReturning(payload: unknown) {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });
}

const baseInput = { rawText: "Senior Go Engineer at Acme. Requirements: Go, Postgres.", source: "paste" } as const;

describe("structureJd", () => {
  it("replays the feature's own recording in mock mode", async () => {
    const jd = await structureJd({ ...baseInput, env: mockEnv });
    expect(jd).toEqual(extractJdFixture);
    expect(jdSchema.safeParse(jd).success).toBe(true);
  });

  it("fails loudly when no fixture is supplied in mock mode", async () => {
    await expect(structureJd({ ...baseInput, env: mockEnv, fixtures: {} })).rejects.toBeInstanceOf(MissingFixtureError);
  });

  it("rejects a recorded fixture that no longer matches the schema", async () => {
    await expect(
      structureJd({ ...baseInput, env: mockEnv, fixtures: { "extract-jd": { title: 42, requirements: "Go" } } }),
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it("returns validated model output in live mode", async () => {
    // The schema the model is asked for is strict, so a response without the
    // optional-looking keys is not a valid one: the model says `null` or `[]`
    // rather than omitting a property.
    const jd = await structureJd({
      ...baseInput,
      env: liveEnv,
      model: modelReturning({
        title: "Senior Go Engineer",
        company: "Acme",
        seniority: null,
        location: null,
        requirements: ["Go", "Postgres"],
        niceToHave: [],
        skills: [],
        responsibilities: [],
        keywords: [],
      }),
    });

    expect(jd.title).toBe("Senior Go Engineer");
    expect(jd.company).toBe("Acme");
    expect(jd.requirements).toEqual(["Go", "Postgres"]);
    expect(jd.niceToHave).toEqual([]);
  });

  it("rejects a response that leaves out a required property", async () => {
    // The failure mode that started this: a schema whose properties are not all
    // required is rejected by a strict provider before the model even runs.
    await expect(
      structureJd({
        ...baseInput,
        env: liveEnv,
        model: modelReturning({ title: "Senior Go Engineer", company: "Acme", requirements: ["Go"] }),
      }),
    ).rejects.toSatisfy(isInvalidModelOutputError);
  });

  it("rejects malformed model output in live mode", async () => {
    await expect(
      structureJd({ ...baseInput, env: liveEnv, model: modelReturning({ title: "Engineer", requirements: 7 }) }),
    ).rejects.toSatisfy(isInvalidModelOutputError);
  });
});

describe("buildJdPrompt", () => {
  it("carries the origin, hints and raw text", () => {
    const prompt = buildJdPrompt({
      rawText: "We need a Go engineer.",
      source: "linkedin",
      url: "https://www.linkedin.com/jobs/view/123",
      hints: { title: "Go Engineer", company: "Acme", location: "Berlin" },
    });

    expect(prompt).toContain("Source: linkedin");
    expect(prompt).toContain("URL: https://www.linkedin.com/jobs/view/123");
    expect(prompt).toContain("Page title: Go Engineer");
    expect(prompt).toContain("Company: Acme");
    expect(prompt).toContain("Location: Berlin");
    expect(prompt).toContain("We need a Go engineer.");
  });

  it("omits hint lines that were not provided", () => {
    const prompt = buildJdPrompt({ rawText: "Text.", source: "paste" });
    expect(prompt).not.toContain("Page title:");
    expect(prompt).not.toContain("URL:");
    expect(prompt.endsWith("Text.")).toBe(true);
  });
});
