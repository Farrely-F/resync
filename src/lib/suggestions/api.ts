import type { AiMode } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import type { DroppedSuggestion, Suggestion } from "@/lib/suggestions/types";

/**
 * Wire contract between the report page and `POST /api/suggestions`.
 *
 * Both model calls happen on the server, where the key and the mock fixtures
 * live; the resume and the report's criteria travel up, and proposals come back.
 * Nothing is stored here — the route never touches the user's resume, and the
 * browser only writes when the user accepts.
 */

export interface SuggestionsRequestBody {
  resume: Resume;
  jd: Jd;
  criteria: MatchCriterion[];
}

export interface SuggestionsSuccess {
  suggestions: Suggestion[];
  dropped: DroppedSuggestion[];
  groundingDropped: number;
  modelCalls: number;
  model: string;
  aiMode: AiMode;
}

export interface SuggestionsFailure {
  error: { reason: string; message: string };
}

export type SuggestionsResponse = SuggestionsSuccess | SuggestionsFailure;

export function isSuggestionsFailure(response: SuggestionsResponse): response is SuggestionsFailure {
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

function isSuggestion(value: unknown): value is Suggestion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Suggestion>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.targetId === "string" &&
    typeof candidate.current === "string" &&
    typeof candidate.proposed === "string" &&
    typeof candidate.rationale === "string" &&
    typeof candidate.criterionId === "string" &&
    typeof candidate.requirement === "string" &&
    typeof candidate.target === "object" &&
    candidate.target !== null
  );
}

function isDropped(value: unknown): value is DroppedSuggestion {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DroppedSuggestion>;
  return typeof candidate.reason === "string" && typeof candidate.proposed === "string" && typeof candidate.detail === "string";
}

export async function requestSuggestions(body: SuggestionsRequestBody): Promise<SuggestionsSuccess> {
  const response = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(messageFrom(payload, `Generating suggestions failed (HTTP ${response.status}).`));
  }

  const parsed = payload as Partial<SuggestionsSuccess> | null;

  if (!parsed || !Array.isArray(parsed.suggestions) || !parsed.suggestions.every(isSuggestion)) {
    throw new Error("The suggestions route returned an unexpected response.");
  }

  return {
    suggestions: parsed.suggestions,
    dropped: Array.isArray(parsed.dropped) ? parsed.dropped.filter(isDropped) : [],
    groundingDropped: typeof parsed.groundingDropped === "number" ? parsed.groundingDropped : 0,
    modelCalls: typeof parsed.modelCalls === "number" ? parsed.modelCalls : 1,
    model: typeof parsed.model === "string" ? parsed.model : "unknown",
    aiMode: parsed.aiMode === "live" ? "live" : "mock",
  };
}
