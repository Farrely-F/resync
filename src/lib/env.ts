/**
 * Server-side environment contract.
 *
 * Provider and model are named separately so nothing is tied to one vendor:
 * `AI_PROVIDER` selects where calls go and `MODEL_ID` selects which model,
 * rather than both being encoded in one vendor-shaped variable.
 *
 * Mode precedence, in order:
 *   1. an explicit AI_MODE, which always wins;
 *   2. otherwise any configured API key means live — a key is an unambiguous
 *      request to use it, and silently substituting fixtures for a user's own
 *      documents is the worst possible default;
 *   3. otherwise production means live, which fails loudly without a key;
 *   4. otherwise mock, so a fresh clone runs with no setup at all.
 */
export const aiModes = ["mock", "live"] as const;

export type AiMode = (typeof aiModes)[number];

export const aiProviders = ["openrouter", "groq", "fireworks"] as const;

export type AiProvider = (typeof aiProviders)[number];

/**
 * Which provider leads, and the order the rest follow, when `AI_PROVIDER` is not
 * set and more than one key is configured. Free allowances first (Groq,
 * OpenRouter), the paid-by-default Fireworks last.
 */
export const providerPriority: readonly AiProvider[] = [
  "groq",
  "openrouter",
  "fireworks",
];

export interface ProviderDefaults {
  label: string;
  keyVariable: string;
  model: string;
  /**
   * Models tried in order when this provider cannot route the primary model.
   * Listed by the provider as free and as supporting the structured output every
   * call here asks for, as of 2026-09-30 — free availability drifts, so this is a
   * default and not a promise. `FALLBACK_MODEL_IDS` replaces it entirely.
   */
  fallbacks: readonly string[];
}

export const providerDefaults: Record<AiProvider, ProviderDefaults> = {
  openrouter: {
    label: "OpenRouter",
    keyVariable: "OPENROUTER_API_KEY",
    model: "openrouter/free",
    fallbacks: [
      "qwen/qwen3.8-27b:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "dots-studio/dots-3-note-preview:free",
    ],
  },
  groq: {
    label: "Groq",
    keyVariable: "GROQ_API_KEY",
    model: "openai/gpt-oss-120b",
    fallbacks: ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"],
  },
  fireworks: {
    label: "Fireworks AI",
    keyVariable: "FIREWORKS_API_KEY",
    model: "accounts/fireworks/models/gpt-oss-120b",
    fallbacks: [
      "accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b",
      "accounts/fireworks/models/glm-5p3-flash",
    ],
  },
};

/** A provider plus the model to ask it for. */
export interface ModelTarget {
  provider: AiProvider;
  modelId: string;
}

export interface AppEnv {
  aiMode: AiMode;
  /** Primary provider. */
  provider: AiProvider;
  /** Primary model id: `MODEL_ID`, or the provider's default. */
  model: string;
  /**
   * Ordered targets tried after the primary. These may name a different
   * provider, which is the point: when one vendor's free allowance is spent, the
   * next target is a different vendor rather than the same exhausted key.
   */
  fallbacks: readonly ModelTarget[];
  /** Configured keys by provider. A provider without a key cannot be called. */
  apiKeys: Partial<Record<AiProvider, string>>;
}

/**
 * Variables that were renamed. Kept as a list so a stale `.env.local` fails
 * loudly rather than quietly doing nothing.
 */
const renamedVariables = [
  ["OPENROUTER_MODEL", "MODEL_ID"],
  ["OPENROUTER_FALLBACK_MODELS", "FALLBACK_MODEL_IDS"],
] as const;

export class EnvError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((issue) => `  - ${issue}`)
        .join("\n")}`,
    );
    this.name = "EnvError";
    this.issues = issues;
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * A comma-separated list. A missing, blank or comma-only value counts as absent,
 * exactly as a blank model or key does. An explicitly empty list is different
 * from an absent one only for fallbacks, where it means "nothing to fall back to".
 */
function itemList(value: string | undefined): readonly string[] | undefined {
  const entries = value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries === undefined || entries.length === 0 ? undefined : entries;
}

function isProvider(value: string): value is AiProvider {
  return (aiProviders as readonly string[]).includes(value);
}

/**
 * A fallback entry is either `provider@model` or a bare `model` that belongs to
 * the primary provider.
 *
 * `@` rather than `:` or `/`: OpenRouter model ids end in variants like `:free`
 * and vendor-prefixed ids contain `/`, so both separators would be ambiguous.
 * `@` appears in neither.
 */
function parseTarget(entry: string, primary: AiProvider): ModelTarget | string {
  const separator = entry.indexOf("@");
  if (separator === -1) {
    return { provider: primary, modelId: entry };
  }

  const provider = entry.slice(0, separator).trim();
  const modelId = entry.slice(separator + 1).trim();

  if (!isProvider(provider)) {
    return `FALLBACK_MODEL_IDS entry ${JSON.stringify(
      entry,
    )} names an unknown provider ${JSON.stringify(
      provider,
    )} before "@"; expected one of ${aiProviders.join(
      ", ",
    )} or a bare model id`;
  }
  if (modelId.length === 0) {
    return `FALLBACK_MODEL_IDS entry ${JSON.stringify(
      entry,
    )} has no model id after "@"`;
  }

  return { provider, modelId };
}

export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AppEnv {
  const issues: string[] = [];

  // A renamed variable that is still set is a configuration that silently stops
  // working, which is the same class of failure as answering from fixtures while
  // the user believes otherwise. Say so instead of ignoring it.
  for (const [oldName, newName] of renamedVariables) {
    if (nonEmpty(raw[oldName]) !== undefined) {
      issues.push(
        `${oldName} was renamed to ${newName}; ${oldName} is no longer read`,
      );
    }
  }

  const apiKeys: Partial<Record<AiProvider, string>> = {};
  for (const provider of aiProviders) {
    const key = nonEmpty(raw[providerDefaults[provider].keyVariable]);
    if (key !== undefined) {
      apiKeys[provider] = key;
    }
  }

  const configured = providerPriority.filter(
    (provider) => apiKeys[provider] !== undefined,
  );

  const rawProvider = nonEmpty(raw.AI_PROVIDER);
  let provider: AiProvider;
  if (rawProvider !== undefined) {
    if (isProvider(rawProvider)) {
      provider = rawProvider;
    } else {
      issues.push(
        `AI_PROVIDER must be one of ${aiProviders.join(
          ", ",
        )} (received ${JSON.stringify(rawProvider)})`,
      );
      provider = "openrouter";
    }
  } else if (configured.length > 0) {
    // The highest-priority provider that has a key leads; the other keys still
    // contribute cross-provider fallbacks below, in the same order.
    provider = configured[0];
  } else {
    // No key at all: mock mode, or a loud failure naming OpenRouter's variable.
    provider = "openrouter";
  }

  const model = nonEmpty(raw.MODEL_ID) ?? providerDefaults[provider].model;

  const rawFallbacks = nonEmpty(raw.FALLBACK_MODEL_IDS);
  const explicitFallbacks = itemList(raw.FALLBACK_MODEL_IDS);
  let fallbacks: ModelTarget[] = [];

  if (explicitFallbacks !== undefined) {
    for (const entry of explicitFallbacks) {
      const parsed = parseTarget(entry, provider);
      if (typeof parsed === "string") {
        issues.push(parsed);
      } else if (!(parsed.provider === provider && parsed.modelId === model)) {
        fallbacks.push(parsed);
      }
    }
  } else {
    fallbacks = providerDefaults[provider].fallbacks
      .filter((modelId) => modelId !== model)
      .map((modelId) => ({ provider, modelId }));

    // A key for another provider buys real resilience: when this vendor's free
    // allowance is spent, the next attempt goes to a different vendor. Implicit
    // only for the default list — an explicit FALLBACK_MODEL_IDS is obeyed as written.
    for (const other of configured) {
      if (other === provider) {
        continue;
      }
      fallbacks.push({
        provider: other,
        modelId: providerDefaults[other].model,
      });
    }
  }

  const rawMode = nonEmpty(raw.AI_MODE);
  let aiMode: AiMode;
  if (rawMode !== undefined) {
    if ((aiModes as readonly string[]).includes(rawMode)) {
      aiMode = rawMode as AiMode;
    } else {
      issues.push(
        `AI_MODE must be one of ${aiModes.join(
          ", ",
        )} (received ${JSON.stringify(rawMode)})`,
      );
      aiMode = "mock";
    }
  } else if (configured.length > 0 || nodeEnv === "production") {
    aiMode = "live";
  } else {
    aiMode = "mock";
  }

  if (aiMode === "live" && apiKeys[provider] === undefined) {
    issues.push(
      `AI_PROVIDER=${provider} needs ${providerDefaults[provider].keyVariable}; set it in .env.local, choose another provider, or set AI_MODE=mock to run against recorded fixtures` +
        (rawFallbacks === undefined
          ? ""
          : ` (${rawFallbacks} does not help: a fallback needs its own provider's key)`),
    );
  }

  if (issues.length > 0) {
    throw new EnvError(issues);
  }

  return { aiMode, provider, model, fallbacks, apiKeys };
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  cached ??= parseEnv();
  return cached;
}

export interface AiModeSummary {
  aiMode: AiMode;
  provider: AiProvider;
  model: string;
  /** True when AI_MODE was set explicitly rather than inferred from a key. */
  explicit: boolean;
  /** True when the selected provider has a usable key. */
  hasApiKey: boolean;
  /** Providers with a configured key, for the notice to report. */
  providersWithKeys: readonly AiProvider[];
  /** False when the configuration is invalid; callers should say so rather than guess. */
  valid: boolean;
}

/**
 * Never throws, so a shell component can disclose the current mode even when the
 * configuration is broken. An invalid configuration reports mock, because that
 * is what the app will actually do once the error surfaces.
 */
export function summariseAiMode(
  raw: Record<string, string | undefined> = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AiModeSummary {
  const explicit = nonEmpty(raw.AI_MODE) !== undefined;
  const providersWithKeys = aiProviders.filter(
    (provider) =>
      nonEmpty(raw[providerDefaults[provider].keyVariable]) !== undefined,
  );

  try {
    const env = parseEnv(raw, nodeEnv);
    return {
      aiMode: env.aiMode,
      provider: env.provider,
      model: env.model,
      explicit,
      hasApiKey: env.apiKeys[env.provider] !== undefined,
      providersWithKeys,
      valid: true,
    };
  } catch {
    return {
      aiMode: "mock",
      provider: "openrouter",
      model: providerDefaults.openrouter.model,
      explicit,
      hasApiKey: false,
      providersWithKeys,
      valid: false,
    };
  }
}
