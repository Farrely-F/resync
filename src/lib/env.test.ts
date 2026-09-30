import { describe, expect, it } from "vitest";

import { EnvError, defaultFallbackModels, defaultModel, parseEnv, summariseAiMode } from "./env";

describe("parseEnv", () => {
  it("defaults to mock mode outside production, with no key required", () => {
    const env = parseEnv({}, "development");

    expect(env.aiMode).toBe("mock");
    expect(env.apiKey).toBeNull();
    expect(env.model).toBe(defaultModel);
  });

  it("treats a configured key as a request for real calls, without AI_MODE being set", () => {
    // The regression this guards: a key was present, AI_MODE was not, and the app
    // answered from fixtures while the user believed their own document was parsed.
    const env = parseEnv({ OPENROUTER_API_KEY: "sk-real" }, "development");

    expect(env.aiMode).toBe("live");
  });

  it("still honours an explicit AI_MODE=mock even when a key is present", () => {
    const env = parseEnv({ AI_MODE: "mock", OPENROUTER_API_KEY: "sk-real" }, "development");

    expect(env.aiMode).toBe("mock");
  });

  it("keeps a blank key from implying live mode", () => {
    const env = parseEnv({ OPENROUTER_API_KEY: "   " }, "development");

    expect(env.aiMode).toBe("mock");
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

describe("summariseAiMode", () => {
  it("reports mock with no key, and flags that AI_MODE was not set", () => {
    const summary = summariseAiMode({}, "development");

    expect(summary).toEqual({
      aiMode: "mock",
      model: defaultModel,
      explicit: false,
      hasApiKey: false,
      valid: true,
    });
  });

  it("reports live and marks the mode as inferred when only a key is present", () => {
    const summary = summariseAiMode({ OPENROUTER_API_KEY: "sk-real" }, "development");

    expect(summary.aiMode).toBe("live");
    expect(summary.explicit).toBe(false);
    expect(summary.hasApiKey).toBe(true);
  });

  it("marks an explicit mock, so the notice can point at the actual cause", () => {
    const summary = summariseAiMode({ AI_MODE: "mock", OPENROUTER_API_KEY: "sk-real" }, "development");

    expect(summary.aiMode).toBe("mock");
    expect(summary.explicit).toBe(true);
  });

  it("never throws on a broken configuration, and reports it as mock and invalid", () => {
    const summary = summariseAiMode({ AI_MODE: "live" }, "development");

    expect(summary.valid).toBe(false);
    expect(summary.aiMode).toBe("mock");
    expect(summary.model).toBe(defaultModel);
  });

  it("does not claim validity when production has no key either", () => {
    expect(summariseAiMode({}, "production").valid).toBe(false);
    expect(summariseAiMode({}, "production").aiMode).toBe("mock");
  });
});
