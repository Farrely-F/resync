import type { LanguageModel } from "ai";

import type { AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import { buildTailoredCopy, findTailoredCopy, isTailoredCopy } from "@/lib/resume/tailor";
import type { ResumeRecord, StorageApi } from "@/lib/storage/types";
import { applyRefusalMessages, applySuggestion, type ApplyResult } from "@/lib/suggestions/apply";
import { appendToDestination } from "@/lib/suggestions/attest";
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
  storage: Pick<StorageApi, "getResume" | "putResume" | "listResumes">;
  now?: () => string;
  newId?: () => string;
}

export type AcceptResult = ApplyResult & { created?: boolean };

/**
 * Applies one suggestion.
 *
 * With a `jdId`, the suggestion lands in a copy of the resume tailored for that
 * posting, and the baseline is never written: the copy is found if an earlier
 * accept made one, and built from the baseline if not. A resume that is itself a
 * copy is changed in place, so analysing a copy does not copy the copy. Without
 * a `jdId` the stored resume is changed directly.
 *
 * The record is read fresh rather than taken from the page, so a change made
 * elsewhere (another tab, the editor) is what the staleness check sees. A
 * refusal never reaches `putResume`, and a copy is only stored together with the
 * suggestion that justified it — a refused accept leaves no empty copy behind.
 */
export async function acceptSuggestion(
  input: { resumeId: string; suggestion: Suggestion; jdId?: string },
  deps: AcceptSuggestionDeps,
): Promise<AcceptResult> {
  const record = await deps.storage.getResume(input.resumeId);

  if (record === null) {
    return {
      applied: false,
      reason: "missing-resume",
      message: "This resume is no longer stored in this browser, so there is nothing to change.",
    };
  }

  let target = record;
  let created = false;

  if (input.jdId !== undefined && !isTailoredCopy(record)) {
    const existing = findTailoredCopy(await deps.storage.listResumes(), record.id, input.jdId);

    if (existing !== null) {
      target = existing;
    } else if (record.mode === "manual") {
      // A copy would drop the hand-edited LaTeX, so the baseline's own refusal stands.
      return applySuggestion(record, input.suggestion, deps.now);
    } else {
      const now = (deps.now ?? (() => new Date().toISOString()))();
      target = buildTailoredCopy(record, input.jdId, (deps.newId ?? (() => crypto.randomUUID()))(), now);
      created = true;
    }
  }

  const outcome = applySuggestion(target, input.suggestion, deps.now);

  if (!outcome.applied) {
    return outcome;
  }

  const stored = isTailoredCopy(outcome.record)
    ? {
        ...outcome.record,
        adjustments: [
          ...(outcome.record.adjustments ?? []).filter((entry) => entry.id !== input.suggestion.id),
          {
            id: input.suggestion.id,
            targetId: input.suggestion.targetId,
            requirement: input.suggestion.requirement,
            before: input.suggestion.current,
            after: input.suggestion.proposed,
            at: outcome.record.updatedAt,
          },
        ],
      }
    : outcome.record;

  await deps.storage.putResume(stored);

  return { ...outcome, record: stored, created };
}

export type EnsureCopyResult =
  | { ok: true; record: ResumeRecord; created: boolean }
  | { ok: false; reason: "missing-resume" | "manual-mode"; message: string };

/**
 * The tailored copy for a posting, found or made, without a suggestion.
 *
 * Accepting a proposal is one way to get a copy; this is the other, for a reader
 * who wants to rewrite the resume for the job by hand, or whose analysis produced
 * no proposals. A resume that is already a copy is returned as it is.
 */
export async function ensureTailoredCopy(
  input: { resumeId: string; jdId: string },
  deps: AcceptSuggestionDeps,
): Promise<EnsureCopyResult> {
  const record = await deps.storage.getResume(input.resumeId);

  if (record === null) {
    return { ok: false, reason: "missing-resume", message: applyRefusalMessages["missing-resume"] };
  }

  if (isTailoredCopy(record)) {
    return { ok: true, record, created: false };
  }

  const existing = findTailoredCopy(await deps.storage.listResumes(), record.id, input.jdId);
  if (existing !== null) {
    return { ok: true, record: existing, created: false };
  }

  if (record.mode === "manual") {
    return { ok: false, reason: "manual-mode", message: applyRefusalMessages["manual-mode"] };
  }

  const now = (deps.now ?? (() => new Date().toISOString()))();
  const copy = buildTailoredCopy(record, input.jdId, (deps.newId ?? (() => crypto.randomUUID()))(), now);
  await deps.storage.putResume(copy);

  return { ok: true, record: copy, created: true };
}

export type AttestResult =
  | { added: true; record: ResumeRecord; created: boolean }
  | { added: false; reason: "missing-resume" | "manual-mode" | "empty" | "duplicate" | "unknown-destination"; message: string };

const attestRefusalMessages = {
  empty: "Write the experience first; there is nothing to add yet.",
  duplicate: "That exact line is already in the place you chose, so it was not added a second time.",
  "unknown-destination": "The place you chose is no longer in the resume, so nothing was added.",
} as const;

/**
 * Adds a line the reader wrote to their tailored copy.
 *
 * The same rules as accepting a suggestion: the baseline is never written, the copy
 * is found or made, a hand-edited resume is refused, and a refusal stores nothing —
 * not even an empty copy. The difference is the author. The line is the reader's own
 * statement, so the log records it as theirs (`source: "you"`) and there is no
 * grounding check: the reader is the ground truth.
 */
export async function addAttestedExperience(
  input: { resumeId: string; jdId: string; requirement: string; destinationId: string; text: string },
  deps: AcceptSuggestionDeps,
): Promise<AttestResult> {
  const record = await deps.storage.getResume(input.resumeId);

  if (record === null) {
    return { added: false, reason: "missing-resume", message: applyRefusalMessages["missing-resume"] };
  }

  let target = record;
  let created = false;
  const now = (deps.now ?? (() => new Date().toISOString()))();

  if (!isTailoredCopy(record)) {
    const existing = findTailoredCopy(await deps.storage.listResumes(), record.id, input.jdId);

    if (existing !== null) {
      target = existing;
    } else if (record.mode === "manual") {
      return { added: false, reason: "manual-mode", message: applyRefusalMessages["manual-mode"] };
    } else {
      target = buildTailoredCopy(record, input.jdId, (deps.newId ?? (() => crypto.randomUUID()))(), now);
      created = true;
    }
  }

  if (target.mode === "manual") {
    return { added: false, reason: "manual-mode", message: applyRefusalMessages["manual-mode"] };
  }

  const appended = appendToDestination(target.resume, input.destinationId, input.text);
  if (!appended.ok) {
    return { added: false, reason: appended.reason, message: attestRefusalMessages[appended.reason] };
  }

  const text = input.text.trim();
  const stored: ResumeRecord = {
    ...target,
    resume: appended.resume,
    updatedAt: now,
    adjustments: [
      ...(target.adjustments ?? []),
      {
        id: `you:${(deps.newId ?? (() => crypto.randomUUID()))()}`,
        targetId: input.destinationId,
        requirement: input.requirement,
        before: "",
        after: text,
        at: now,
        source: "you",
      },
    ],
  };

  await deps.storage.putResume(stored);

  return { added: true, record: stored, created };
}
