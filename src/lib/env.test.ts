import { describe, expect, it } from "vitest";

import { EnvError, defaultFallbackModels, defaultModel, parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to mock mode outside production, with no key required", () => {
    const env = parseEnv({}, "development");

    expect(env.aiMode).toBe("mock");
    expect(env.apiKey).toBeNull();
    expect(env.model).toBe(defaultModel);
  });

  it("defaults to live mode in production and then demands a key", () => {
    expect(() => parseEnv({}, "production")).toThrow(EnvError);

    try {
      parseEnv({}, "production");
    } catch (error) {
      expect((error as EnvError).issues.join(" ")).toContain("OPENROUTER_API_KEY");
    }
  });

  it("names the offending variable when AI_MODE is not a known mode", () => {
    try {
      parseEnv({ AI_MODE: "prod" }, "development");
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      const issues = (error as EnvError).issues.join(" ");
      expect(issues).toContain("AI_MODE");
      expect(issues).toContain("prod");
      expect(issues).toContain("mock, live");
    }
  });

  it("accepts live mode once a key is present and trims surrounding whitespace", () => {
    const env = parseEnv(
      { AI_MODE: "live", OPENROUTER_API_KEY: "  sk-test  ", OPENROUTER_MODEL: " some/model:free " },
      "development",
    );

    expect(env).toEqual({
      aiMode: "live",
      model: "some/model:free",
      fallbackModels: defaultFallbackModels,
      apiKey: "sk-test",
    });
  });

  it("treats a blank model or key as absent rather than as a value", () => {
    const env = parseEnv({ AI_MODE: "mock", OPENROUTER_MODEL: "   ", OPENROUTER_API_KEY: "   " }, "development");

    expect(env.model).toBe(defaultModel);
    expect(env.apiKey).toBeNull();
  });

  it("uses the documented fallback list when none is configured", () => {
    expect(parseEnv({}, "development").fallbackModels).toEqual(defaultFallbackModels);
  });

  it("reads a comma-separated fallback list, trimming blanks and keeping the order", () => {
    const env = parseEnv(
      { OPENROUTER_FALLBACK_MODELS: " a/one:free ,, b/two:free ,\n c/three:free " },
      "development",
    );

    expect(env.fallbackModels).toEqual(["a/one:free", "b/two:free", "c/three:free"]);
  });

  it("falls back to the default list for a blank or comma-only value", () => {
    for (const value of ["", "   ", ",", " , , "]) {
      expect(parseEnv({ OPENROUTER_FALLBACK_MODELS: value }, "development").fallbackModels).toEqual(
        defaultFallbackModels,
      );
    }
  });

  it("reports every problem at once instead of only the first", () => {
    try {
      parseEnv({ AI_MODE: "nonsense" }, "production");
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      const issues = (error as EnvError).issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain("AI_MODE");
    }
  });
});
