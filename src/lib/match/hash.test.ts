import { describe, expect, it } from "vitest";

import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { canonicalJson, computeInputHash, type MatchInputIdentity } from "@/lib/match/hash";
import { parseResumeFixture } from "@/lib/resume/fixtures";

const base: MatchInputIdentity = {
  resume: parseResumeFixture,
  jd: extractJdFixture,
  themeId: "classic",
  model: "openrouter/free",
  aiMode: "mock",
};

describe("canonicalJson", () => {
  it("orders object keys so key order does not change the string", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("keeps array order, which is meaningful", () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it("distinguishes a null from a missing key", () => {
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
    expect(canonicalJson({ a: undefined })).toBe("{}");
  });
});

describe("computeInputHash", () => {
  it("is a stable hex digest of the same identity", async () => {
    const first = await computeInputHash(base);
    const second = await computeInputHash({ ...base });

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores the order in which the same resume was built", async () => {
    const reordered = Object.fromEntries(Object.entries(parseResumeFixture).reverse()) as typeof parseResumeFixture;

    expect(await computeInputHash({ ...base, resume: reordered })).toBe(await computeInputHash(base));
  });

  it("changes when the resume changes", async () => {
    const changed = { ...parseResumeFixture, basics: { ...parseResumeFixture.basics, summary: "Different summary." } };

    expect(await computeInputHash({ ...base, resume: changed })).not.toBe(await computeInputHash(base));
  });

  it("changes when the posting changes", async () => {
    const changed = { ...extractJdFixture, requirements: [...extractJdFixture.requirements, "Own the roadmap"] };

    expect(await computeInputHash({ ...base, jd: changed })).not.toBe(await computeInputHash(base));
  });

  it("changes when the theme changes, because the ATS checks depend on it", async () => {
    expect(await computeInputHash({ ...base, themeId: "compact" })).not.toBe(await computeInputHash(base));
  });

  it("changes when the model or the AI mode changes", async () => {
    const hash = await computeInputHash(base);

    expect(await computeInputHash({ ...base, model: "another/model" })).not.toBe(hash);
    expect(await computeInputHash({ ...base, aiMode: "live" })).not.toBe(hash);
  });
});
