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

export interface AppEnv {
  aiMode: AiMode;
  model: string;
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
  const apiKey = nonEmpty(raw.OPENROUTER_API_KEY) ?? null;

  if (aiMode === "live" && apiKey === null) {
    issues.push(
      "OPENROUTER_API_KEY is required when AI_MODE=live (set AI_MODE=mock to run against recorded fixtures)",
    );
  }

  if (issues.length > 0) {
    throw new EnvError(issues);
  }

  return { aiMode, model, apiKey };
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  cached ??= parseEnv();
  return cached;
}
