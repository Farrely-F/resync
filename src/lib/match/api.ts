import { AiFailureError, isAiFailureKind } from "@/lib/ai/failures";
import { aiProviders, type AiMode, type AiProvider } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";

/**
 * Wire contract between the match workspace and `POST /api/analyze`, plus the
 * budget identity behind the quota indicator.
 *
 * The model call has to happen on the server (that is where the key and the
 * mock fixtures live), while the report is stored in this browser's IndexedDB.
 * So the route returns evidence and the identity it ran under, and the client
 * decides whether a report already exists for that identity before calling.
 */

/**
 * The browser gives up on an analysis after this long and reports a timeout,
 * rather than leaving the page waiting on a server that stopped answering. It
 * sits past the seam's own 30 s budget so the server's terminal answer normally
 * wins; this is the backstop for when it does not arrive at all.
 */
export const evidenceDeadlineMs = 45_000;

export interface AnalyzeRequestBody {
  resume: Resume;
  jd: Jd;
  themeId: string | null;
}

export interface AnalyzeSuccess {
  criteria: MatchCriterion[];
  summary: string | null;
  model: string;
  aiMode: AiMode;
}

export interface AnalyzeFailure {
  error: {
    reason: string;
    message: string;
    /** One of `aiFailureKinds` when the route classified the failure. */
    kind?: string;
    retryAfterSeconds?: number | null;
  };
}

export type AnalyzeResponse = AnalyzeSuccess | AnalyzeFailure;

export interface ModelIdentity {
  aiMode: AiMode;
  provider: AiProvider;
  model: string;
}

export function isAnalyzeFailure(response: AnalyzeResponse): response is AnalyzeFailure {
  return "error" in response;
}

function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error?: { message?: unknown } };
    if (typeof error?.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }

  return fallback;
}

/**
 * The route's error body as a typed failure. A body the route did not classify
 * keeps its message and becomes `unknown`, which the page renders generically.
 */
function failureFrom(body: unknown, fallback: string): AiFailureError {
  const message = messageFrom(body, fallback);

  if (typeof body !== "object" || body === null || !("error" in body)) {
    return new AiFailureError("unknown", message);
  }

  const { error } = body;
  if (typeof error !== "object" || error === null) {
    return new AiFailureError("unknown", message);
  }

  const kind = "kind" in error && isAiFailureKind(error.kind) ? error.kind : "unknown";
  const retryAfterSeconds =
    "retryAfterSeconds" in error && typeof error.retryAfterSeconds === "number" ? error.retryAfterSeconds : null;

  return new AiFailureError(kind, message, { retryAfterSeconds });
}

/** Which model and mode an analysis would run under; needed before the cache check. */
export async function fetchModelIdentity(): Promise<ModelIdentity> {
  const response = await fetch("/api/analyze", { method: "GET" });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(messageFrom(body, `Could not read the AI mode (HTTP ${response.status}).`));
  }

  const identity = body as Partial<ModelIdentity> | null;
  const provider = identity?.provider;
  if (
    !identity ||
    (identity.aiMode !== "mock" && identity.aiMode !== "live") ||
    typeof identity.model !== "string" ||
    typeof provider !== "string" ||
    !(aiProviders as readonly string[]).includes(provider)
  ) {
    throw new Error("The analyze route returned an unexpected identity.");
  }

  return { aiMode: identity.aiMode, provider: provider as AiProvider, model: identity.model };
}

export async function requestEvidence(input: AnalyzeRequestBody): Promise<AnalyzeSuccess> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    // A hung request must end in a message, not in a spinner that never stops.
    signal: AbortSignal.timeout(evidenceDeadlineMs),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw failureFrom(body, `Analysis failed (HTTP ${response.status}).`);
  }

  const parsed = body as Partial<AnalyzeSuccess> | null;
  if (!parsed || !Array.isArray(parsed.criteria) || typeof parsed.model !== "string") {
    throw new Error("The analyze route returned an unexpected response.");
  }

  return {
    criteria: parsed.criteria,
    summary: parsed.summary ?? null,
    model: parsed.model,
    aiMode: parsed.aiMode === "live" ? "live" : "mock",
  };
}
