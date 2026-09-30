import { describe, expect, it } from "vitest";

import { EnvError, parseEnv, providerDefaults, summariseAiMode } from "./env";

describe("parseEnv", () => {
  it("defaults to mock mode with OpenRouter, and needs no key", () => {
    const env = parseEnv({}, "development");

    expect(env.aiMode).toBe("mock");
    expect(env.provider).toBe("openrouter");
    expect(env.model).toBe(providerDefaults.openrouter.model);
    expect(env.fallbacks).toEqual(
      providerDefaults.openrouter.fallbacks.map((modelId) => ({ provider: "openrouter", modelId })),
    );
    expect(env.apiKeys).toEqual({});
  });

  it("treats a configured key as a request for real calls, without AI_MODE being set", () => {
    // The regression this guards: a key was present, AI_MODE was not, and the app
    // answered from fixtures while the user believed their own document was parsed.
    const env = parseEnv({ OPENROUTER_API_KEY: "sk-real" }, "development");

    expect(env.aiMode).toBe("live");
  });

  it("still honours an explicit AI_MODE=mock even when a key is present", () => {
    expect(parseEnv({ AI_MODE: "mock", OPENROUTER_API_KEY: "sk-real" }, "development").aiMode).toBe("mock");
  });

  it("keeps a blank key from implying live mode", () => {
    expect(parseEnv({ OPENROUTER_API_KEY: "   " }, "development").aiMode).toBe("mock");
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
      const issues = (error as EnvError).issues.join(" ");
      expect(issues).toContain("AI_MODE");
      expect(issues).toContain("prod");
      expect(issues).toContain("mock, live");
    }
  });

  it("uses MODEL_ID when given, trimming it, and the provider default otherwise", () => {
    const overridden = parseEnv({ MODEL_ID: " some/model:free ", OPENROUTER_API_KEY: "sk" }, "development");
    expect(overridden.model).toBe("some/model:free");

    for (const blank of ["", "   "]) {
      expect(parseEnv({ MODEL_ID: blank, OPENROUTER_API_KEY: "sk" }, "development").model).toBe(
        providerDefaults.openrouter.model,
      );
    }
  });

  it("infers the Groq provider from a Groq key alone, with Groq's own default model", () => {
    const env = parseEnv({ GROQ_API_KEY: "gsk-real" }, "development");

    expect(env.aiMode).toBe("live");
    expect(env.provider).toBe("groq");
    expect(env.model).toBe(providerDefaults.groq.model);
    expect(env.fallbacks).toEqual(
      providerDefaults.groq.fallbacks.map((modelId) => ({ provider: "groq", modelId })),
    );
  });

  it("keeps a vendor-shaped model id working through MODEL_ID, whichever provider is chosen", () => {
    const env = parseEnv({ GROQ_API_KEY: "gsk", MODEL_ID: "openai/gpt-oss-120b" }, "development");

    expect(env.provider).toBe("groq");
    expect(env.model).toBe("openai/gpt-oss-120b");
  });

  it("adds the other configured provider as a last resort, which is the point of two keys", () => {
    const env = parseEnv({ OPENROUTER_API_KEY: "sk", GROQ_API_KEY: "gsk" }, "development");

    expect(env.provider).toBe("openrouter");
    expect(env.fallbacks).toContainEqual({ provider: "groq", modelId: providerDefaults.groq.model });
    // The primary provider's own fallbacks stay first.
    expect(env.fallbacks[0].provider).toBe("openrouter");
  });

  it("puts the chosen provider first and the other one after it", () => {
    const env = parseEnv({ AI_PROVIDER: "groq", OPENROUTER_API_KEY: "sk", GROQ_API_KEY: "gsk" }, "development");

    expect(env.provider).toBe("groq");
    expect(env.model).toBe(providerDefaults.groq.model);
    expect(env.fallbacks).toContainEqual({ provider: "openrouter", modelId: providerDefaults.openrouter.model });
  });

  it("rejects an unknown AI_PROVIDER and names the ones it knows", () => {
    try {
      parseEnv({ AI_PROVIDER: "anthropic", OPENROUTER_API_KEY: "sk" }, "development");
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      const issues = (error as EnvError).issues.join(" ");
      expect(issues).toContain("AI_PROVIDER");
      expect(issues).toContain("openrouter, groq");
    }
  });

  it("demands the key of the provider that was explicitly chosen", () => {
    try {
      parseEnv({ AI_PROVIDER: "groq", OPENROUTER_API_KEY: "sk" }, "development");
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      expect((error as EnvError).issues.join(" ")).toContain("GROQ_API_KEY");
    }
  });

  it("reads a comma-separated fallback list, trimming blanks and keeping the order", () => {
    const env = parseEnv(
      { OPENROUTER_API_KEY: "sk", FALLBACK_MODEL_IDS: " a/one:free ,, b/two:free ,\n c/three:free " },
      "development",
    );

    expect(env.fallbacks).toEqual([
      { provider: "openrouter", modelId: "a/one:free" },
      { provider: "openrouter", modelId: "b/two:free" },
      { provider: "openrouter", modelId: "c/three:free" },
    ]);
  });

  it("reads a cross-provider fallback entry, written with @", () => {
    const env = parseEnv(
      { AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "sk", GROQ_API_KEY: "gsk", FALLBACK_MODEL_IDS: "groq@llama-3.1-8b-instant" },
      "development",
    );

    expect(env.fallbacks).toEqual([{ provider: "groq", modelId: "llama-3.1-8b-instant" }]);
  });

  it("obeys an explicit fallback list exactly, without appending the other provider", () => {
    const env = parseEnv(
      { OPENROUTER_API_KEY: "sk", GROQ_API_KEY: "gsk", FALLBACK_MODEL_IDS: "only/this" },
      "development",
    );

    expect(env.fallbacks).toEqual([{ provider: "openrouter", modelId: "only/this" }]);
  });

  it("rejects a fallback entry naming a provider it does not know, and one with no model", () => {
    for (const [value, expected] of [
      ["anthropic@claude", "unknown provider"],
      ["groq@", "no model id"],
    ] as const) {
      try {
        parseEnv({ OPENROUTER_API_KEY: "sk", FALLBACK_MODEL_IDS: value }, "development");
        throw new Error("expected parseEnv to throw");
      } catch (error) {
        expect((error as EnvError).issues.join(" ")).toContain(expected);
      }
    }
  });

  it("never lists the primary model again as its own fallback", () => {
    const env = parseEnv(
      { MODEL_ID: "same/model", OPENROUTER_API_KEY: "sk", FALLBACK_MODEL_IDS: "same/model,other/model" },
      "development",
    );

    expect(env.fallbacks).toEqual([{ provider: "openrouter", modelId: "other/model" }]);
  });

  it("falls back to the default list for a blank or comma-only value", () => {
    for (const value of ["", "   ", ",", " , , "]) {
      expect(parseEnv({ OPENROUTER_API_KEY: "sk", FALLBACK_MODEL_IDS: value }, "development").fallbacks).toEqual(
        providerDefaults.openrouter.fallbacks.map((modelId) => ({ provider: "openrouter", modelId })),
      );
    }
  });

  it("reports every problem at once instead of only the first", () => {
    try {
      parseEnv({ AI_MODE: "nonsense" }, "production");
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      expect((error as EnvError).issues).toHaveLength(1);
      expect((error as EnvError).issues[0]).toContain("AI_MODE");
    }
  });
});

describe("summariseAiMode", () => {
  it("reports mock with no key, and flags that AI_MODE was not set", () => {
    expect(summariseAiMode({}, "development")).toEqual({
      aiMode: "mock",
      provider: "openrouter",
      model: providerDefaults.openrouter.model,
      explicit: false,
      hasApiKey: false,
      providersWithKeys: [],
      valid: true,
    });
  });

  it("reports live, the provider and the key it will use", () => {
    const summary = summariseAiMode({ GROQ_API_KEY: "gsk" }, "development");

    expect(summary.aiMode).toBe("live");
    expect(summary.provider).toBe("groq");
    expect(summary.hasApiKey).toBe(true);
    expect(summary.providersWithKeys).toEqual(["groq"]);
  });

  it("lists both providers when both keys are configured", () => {
    expect(summariseAiMode({ OPENROUTER_API_KEY: "sk", GROQ_API_KEY: "gsk" }, "development").providersWithKeys).toEqual(
      ["openrouter", "groq"],
    );
  });

  it("marks an explicit mock, so the notice can point at the actual cause", () => {
    const summary = summariseAiMode({ AI_MODE: "mock", OPENROUTER_API_KEY: "sk" }, "development");

    expect(summary.aiMode).toBe("mock");
    expect(summary.explicit).toBe(true);
  });

  it("never throws on a broken configuration, and reports it as mock and invalid", () => {
    const summary = summariseAiMode({ AI_MODE: "live" }, "development");

    expect(summary.valid).toBe(false);
    expect(summary.aiMode).toBe("mock");
    expect(summary.model).toBe(providerDefaults.openrouter.model);
  });

  it("does not claim validity when production has no key either", () => {
    expect(summariseAiMode({}, "production").valid).toBe(false);
    expect(summariseAiMode({}, "production").aiMode).toBe("mock");
  });
});
