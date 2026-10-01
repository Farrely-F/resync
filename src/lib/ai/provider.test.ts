import { describe, expect, it } from "vitest";

import { AiFailureError } from "@/lib/ai/failures";
import { createModel, providerOptionsFor } from "@/lib/ai/provider";

describe("createModel", () => {
  it("builds a Fireworks model for the requested id", () => {
    const model = createModel(
      { provider: "fireworks", modelId: "accounts/fireworks/models/llama-v3p3-70b-instruct" },
      { fireworks: "fw-key" },
    );

    expect(model).toMatchObject({ modelId: "accounts/fireworks/models/llama-v3p3-70b-instruct" });
  });

  it("refuses a provider that has no key, naming the variable to set", () => {
    expect(() => createModel({ provider: "fireworks", modelId: "x" }, { groq: "gsk" })).toThrow(AiFailureError);
    expect(() => createModel({ provider: "fireworks", modelId: "x" }, {})).toThrow(/FIREWORKS_API_KEY/);
  });
});

describe("providerOptionsFor", () => {
  it("caps the thinking of Fireworks reasoning models, which otherwise think past any deadline", () => {
    for (const modelId of [
      "accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b",
      "accounts/fireworks/models/glm-5p3-flash",
    ]) {
      expect(providerOptionsFor({ provider: "fireworks", modelId })).toEqual({
        fireworks: { thinking: { type: "enabled", budgetTokens: 1024 } },
      });
    }
  });

  it("sends gpt-oss nothing, because Fireworks rejects a thinking budget for it", () => {
    expect(providerOptionsFor({ provider: "fireworks", modelId: "accounts/fireworks/models/gpt-oss-120b" })).toBeUndefined();
  });

  it("leaves other providers alone", () => {
    expect(providerOptionsFor({ provider: "groq", modelId: "llama-3.3-70b-versatile" })).toBeUndefined();
    expect(providerOptionsFor({ provider: "openrouter", modelId: "openrouter/free" })).toBeUndefined();
  });
});
