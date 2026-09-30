import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

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
  }
}
