/**
 * Server-side environment contract.
 *
 * AI_MODE=mock serves every AI call from a recorded fixture: no network, no API
 * key, fully deterministic. AI_MODE=live calls OpenRouter with the server-side
 * key. Outside production the default is mock so a fresh clone runs immediately.
 */
export const aiModes = ["mock", "live"] as const;

export type AiMode = (typeof aiModes)[number];

/** Free auto-router; see the quota notes in `.env.example`. */
export const defaultModel = "openrouter/free";

/**
 * Models tried in order when the provider answers 503 "no available model
 * provider meets your routing requirements" — that answer means routing failed,
 * not that the request was wrong, so the same request is sent to a named model
 * instead of the router.
 *
 * The provider listed these as free, and as supporting the structured output
 * every call in this app asks for, on 2026-09-30. Free model availability
 * changes, so they are a default and not a guarantee: `OPENROUTER_FALLBACK_MODELS`
 * replaces the list, and listing only the configured model leaves none.
 */
export const defaultFallbackModels = [
  "qwen/qwen3.8-27b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "dots-studio/dots-3-note-preview:free",
] as const;

export interface AppEnv {
  aiMode: AiMode;
  model: string;
  fallbackModels: readonly string[];
  apiKey: string | null;
}

export class EnvError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "EnvError";
    this.issues = issues;
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * A comma-separated model list. A missing, blank or comma-only value counts as
 * absent, exactly as a blank model or key does, and falls back to the default.
 */
function modelList(value: string | undefined): readonly string[] | undefined {
  const entries = value?.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return entries === undefined || entries.length === 0 ? undefined : entries;
}

export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AppEnv {
  const issues: string[] = [];

  const rawMode = nonEmpty(raw.AI_MODE);
  let aiMode: AiMode;
  if (rawMode === undefined) {
    aiMode = nodeEnv === "production" ? "live" : "mock";
  } else if ((aiModes as readonly string[]).includes(rawMode)) {
    aiMode = rawMode as AiMode;
  } else {
    issues.push(`AI_MODE must be one of ${aiModes.join(", ")} (received ${JSON.stringify(rawMode)})`);
    aiMode = "mock";
  }

  const model = nonEmpty(raw.OPENROUTER_MODEL) ?? defaultModel;
  const fallbackModels = modelList(raw.OPENROUTER_FALLBACK_MODELS) ?? defaultFallbackModels;
  const apiKey = nonEmpty(raw.OPENROUTER_API_KEY) ?? null;

  if (aiMode === "live" && apiKey === null) {
    issues.push(
      "OPENROUTER_API_KEY is required when AI_MODE=live (set AI_MODE=mock to run against recorded fixtures)",
    );
  }

  if (issues.length > 0) {
    throw new EnvError(issues);
  }

  return { aiMode, model, fallbackModels, apiKey };
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  cached ??= parseEnv();
  return cached;
}
