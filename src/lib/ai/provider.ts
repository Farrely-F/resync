import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

import type { AppEnv } from "@/lib/env";

/**
 * Live model handle for OpenRouter. `compatibility: "strict"` is required when
 * talking to the OpenRouter API rather than a third-party compatible endpoint.
 * `modelId` defaults to the configured model and is overridden when the seam
 * walks its fallback list after a routing failure.
 */
export function createLiveModel(env: AppEnv, modelId: string = env.model): LanguageModel {
  if (env.apiKey === null) {
    throw new Error("createLiveModel requires a resolved API key; use parseEnv/getEnv first");
  }

  const provider = createOpenRouter({
    apiKey: env.apiKey,
    compatibility: "strict",
    appName: "resync",
  });

  return provider.chat(modelId);
}
