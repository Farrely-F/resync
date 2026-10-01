import { createFireworks } from "@ai-sdk/fireworks";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { generateText, LanguageModel } from "ai";

import { AiFailureError } from "@/lib/ai/failures";
import { providerDefaults, type AppEnv, type ModelTarget } from "@/lib/env";

/**
 * Builds a model handle for a target, whoever the vendor is.
 *
 * One place maps a provider name to its SDK, so the seam above can walk a
 * fallback list that crosses vendors without knowing anything about them.
 */
export function createModel(target: ModelTarget, apiKeys: AppEnv["apiKeys"]): LanguageModel {
  const apiKey = apiKeys[target.provider];

  if (apiKey === undefined) {
    throw new AiFailureError(
      "config",
      `No ${providerDefaults[target.provider].keyVariable} is configured, so ${providerDefaults[target.provider].label} cannot be called.`,
    );
  }

  switch (target.provider) {
    case "openrouter":
      // `compatibility: "strict"` is required when talking to the OpenRouter API
      // rather than to a third-party OpenAI-compatible endpoint.
      return createOpenRouter({ apiKey, compatibility: "strict", appName: "resync" }).chat(target.modelId);

    case "groq":
      return createGroq({ apiKey })(target.modelId);

    case "fireworks":
      return createFireworks({ apiKey })(target.modelId);
  }
}

/**
 * The most a Fireworks reasoning model may spend thinking before it answers.
 *
 * Left alone, Nemotron Lightning spent 4,000 to 8,000 tokens on a resume rewrite
 * (17 to 110 s) and sometimes never reached the answer. At 1,024 the same request
 * finished in about 5 s with every suggestion intact. 1,024 is the smallest budget
 * Fireworks accepts.
 */
const fireworksThinkingBudgetTokens = 1024;

/**
 * Per-call options that belong to one vendor's API rather than to the seam.
 *
 * `gpt-oss` is excluded because Fireworks reads a thinking budget as a reasoning
 * effort for it and rejects the request ("Invalid reasoning effort: 1024"); it is
 * fast enough without one.
 */
type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;

export function providerOptionsFor(target: ModelTarget): ProviderOptions | undefined {
  if (target.provider === "fireworks" && !target.modelId.includes("gpt-oss")) {
    return { fireworks: { thinking: { type: "enabled", budgetTokens: fireworksThinkingBudgetTokens } } };
  }

  return undefined;
}
