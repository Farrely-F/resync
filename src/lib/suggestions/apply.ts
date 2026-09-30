import type { ResumeRecord } from "@/lib/storage/types";
import { readTargetText, writeTargetText } from "@/lib/suggestions/targets";
import type { Suggestion } from "@/lib/suggestions/types";

/**
 * The only place a suggestion meets the user's data.
 *
 * `applySuggestion` is pure: it returns a new record or a refusal, and never
 * touches storage. `service.ts` is what puts the result back, and only after a
 * refusal has been ruled out. So rejecting a suggestion writes nothing, a
 * refusal writes nothing, and the record it was offered against is left exactly
 * as it was — which the tests compare byte for byte.
 *
 * Three things are refused:
 *
 * - **A hand-edited resume.** In `manual` mode the LaTeX was edited by the user,
 *   so their document and this data no longer say the same thing; applying a
 *   suggestion would silently make them disagree. The way back is the editor's
 *   "Regenerate from data" action, which discards the hand edits, so the refusal
 *   points at it rather than leaving the resume stuck.
 * - **A stale target.** If the text at the target is no longer the text the
 *   suggestion was written against, applying it would overwrite a different
 *   bullet. The offer is refused and the user can generate again.
 * - **A target that no longer resolves.**
 */

export type ApplyRefusal = "manual-mode" | "missing-resume" | "stale-target" | "unknown-target";

export type ApplyResult =
  | { applied: true; record: ResumeRecord }
  | { applied: false; reason: ApplyRefusal; message: string };

export const applyRefusalMessages: Record<ApplyRefusal, string> = {
  "manual-mode":
    "This resume's LaTeX was hand-edited, so it no longer comes from this data. Applying a suggestion would leave your document and your data describing different things, so nothing was applied. Use \"Regenerate from data\" in the editor to go back to a document generated from your data; that discards the hand-edited LaTeX.",
  "missing-resume": "This resume is no longer stored in this browser, so there is nothing to change.",
  "stale-target":
    "The text this suggestion was written against has changed since it was generated, so applying it would overwrite something else. Generate the suggestions again for the current version of the resume.",
  "unknown-target": "This suggestion points at a part of the resume that is not there any more, so nothing was applied.",
};

/** Applies one suggestion to a record, returning a new record rather than mutating one. */
export function applySuggestion(
  record: ResumeRecord,
  suggestion: Suggestion,
  now: () => string = () => new Date().toISOString(),
): ApplyResult {
  if (record.mode === "manual") {
    return { applied: false, reason: "manual-mode", message: applyRefusalMessages["manual-mode"] };
  }

  const current = readTargetText(record.resume, suggestion.target);

  if (current === null) {
    return { applied: false, reason: "unknown-target", message: applyRefusalMessages["unknown-target"] };
  }

  if (current !== suggestion.current) {
    return { applied: false, reason: "stale-target", message: applyRefusalMessages["stale-target"] };
  }

  const resume = writeTargetText(record.resume, suggestion.target, suggestion.proposed);

  if (resume === null) {
    return { applied: false, reason: "unknown-target", message: applyRefusalMessages["unknown-target"] };
  }

  // The title is the user's display label for the record, not a derived value
  // worth rewriting behind their back; only the text they accepted changes.
  return { applied: true, record: { ...record, resume, updatedAt: now() } };
}
