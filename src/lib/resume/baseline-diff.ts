import type { Resume } from "@/lib/resume/schema";
import type { ResumeAdjustment } from "@/lib/storage/types";
import { collectEditableTargets, readTargetText } from "@/lib/suggestions/targets";

/**
 * What a tailored copy says differently from the resume it was copied from.
 *
 * The accepted-adjustment log only knows about suggestions that were accepted
 * after it existed, and nothing about hand edits. The baseline is the ground
 * truth, so the editor compares against it: a span of the copy is a change when
 * its text appears nowhere in the baseline. Comparing by text rather than by
 * position keeps a bullet that was only dragged somewhere else from counting as
 * a change.
 */

export interface ResumeChange {
  id: string;
  targetId: string;
  /** Where it is, in the reader's words: "Experience · Acme · bullet 2". */
  label: string;
  /** The requirement it answers, when an accepted adjustment is what wrote it. */
  requirement?: string;
  /** The baseline text at the same position; empty when the copy has a span the baseline did not. */
  before: string;
  after: string;
  at?: string;
  /** `you` when the reader wrote the line themselves rather than accepting a proposal. */
  source?: "suggestion" | "you";
}

export function changesAgainstBaseline(
  baseline: Resume,
  copy: Resume,
  adjustments: readonly ResumeAdjustment[] = [],
): ResumeChange[] {
  const known = new Set(collectEditableTargets(baseline).map((entry) => entry.text));

  return collectEditableTargets(copy)
    .filter((entry) => !known.has(entry.text))
    .map((entry) => {
      const logged = adjustments.find((adjustment) => adjustment.after === entry.text);

      return {
        id: entry.id,
        targetId: entry.id,
        label: entry.label,
        requirement: logged?.requirement,
        before: readTargetText(baseline, entry.target) ?? "",
        after: entry.text,
        at: logged?.at,
        source: logged?.source,
      };
    });
}
