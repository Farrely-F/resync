import type { LanguageModel } from "ai";

import type { AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import type { StorageApi } from "@/lib/storage/types";
import { applySuggestion, type ApplyResult } from "@/lib/suggestions/apply";
import { buildSuggestions } from "@/lib/suggestions/assemble";
import { suggestAdjustments, type SuggestionDraft } from "@/lib/suggestions/generate";
import type { GenerationOutcome, Suggestion } from "@/lib/suggestions/types";
import { filterGrounded, verifySuggestions, type SuggestionVerification } from "@/lib/suggestions/verify";

/**
 * The two ends of this feature: making proposals, and storing one the user
 * accepted.
 *
 * Generation is two model calls — propose, then verify — and nothing else.
 * Neither call can reach storage: the only write in this slice is
 * `acceptSuggestion`, which is called from one button, after one click, and
 * refuses anything `applySuggestion` refuses.
 *
 * The verifier is skipped when the first call proposed nothing, because there
 * would be nothing to check; `modelCalls` reports what the run actually spent.
 */

export interface GenerateSuggestionsInput {
  resume: Resume;
  jd: Jd;
  /** The report's criteria, in the order the prompt numbers them. */
  criteria: readonly MatchCriterion[];
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

export interface SuggestionsDeps {
  /** The proposal call. Injected by tests; defaults to the real `suggest-adjustments` task. */
  drafts: (input: GenerateSuggestionsInput) => Promise<SuggestionDraft[]>;
  /** The grounding call, given the proposals built from the drafts. */
  verification: (input: { resume: Resume; suggestions: readonly Suggestion[] }) => Promise<SuggestionVerification>;
}

export async function generateGroundedSuggestions(
  input: GenerateSuggestionsInput,
  deps: Partial<SuggestionsDeps> = {},
): Promise<GenerationOutcome> {
  const drafts = await (deps.drafts ?? suggestAdjustments)(input);
  const built = buildSuggestions({ resume: input.resume, criteria: input.criteria, drafts });

  if (built.suggestions.length === 0) {
    return { suggestions: [], dropped: built.dropped, groundingDropped: 0, modelCalls: 1 };
  }

  const verify = deps.verification ?? ((toCheck) =>
    verifySuggestions({ ...toCheck, env: input.env, fixtures: input.fixtures, model: input.model }));

  const verification = await verify({ resume: input.resume, suggestions: built.suggestions });
  const grounded = filterGrounded(built.suggestions, verification);

  return {
    suggestions: grounded.kept,
    dropped: [...built.dropped, ...grounded.dropped],
    groundingDropped: grounded.dropped.length,
    modelCalls: 2,
  };
}

export interface AcceptSuggestionDeps {
  storage: Pick<StorageApi, "getResume" | "putResume">;
  now?: () => string;
}

/**
 * Applies one suggestion to the stored resume.
 *
 * The record is read fresh rather than taken from the page, so a change made
 * elsewhere (another tab, the editor) is what the staleness check sees, and a
 * refusal never reaches `putResume`.
 */
export async function acceptSuggestion(
  input: { resumeId: string; suggestion: Suggestion },
  deps: AcceptSuggestionDeps,
): Promise<ApplyResult> {
  const record = await deps.storage.getResume(input.resumeId);

  if (record === null) {
    return {
      applied: false,
      reason: "missing-resume",
      message: "This resume is no longer stored in this browser, so there is nothing to change.",
    };
  }

  const outcome = applySuggestion(record, input.suggestion, deps.now);

  if (!outcome.applied) {
    return outcome;
  }

  await deps.storage.putResume(outcome.record);

  return outcome;
}
