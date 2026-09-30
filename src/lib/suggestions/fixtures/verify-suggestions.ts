import type { SuggestionVerification } from "@/lib/suggestions/verify";

/**
 * Recorded `verify-suggestions` output for AI_MODE=mock.
 *
 * The verdicts answer the proposals in `suggest-adjustments.ts` by the target
 * each one rewrites: 1 and 2 re-word and re-order facts the resume already
 * states, so they are grounded; the third invents an employer (Volkswagen) and a
 * product line the resume never mentions, so it is not, and the claims it rests
 * on are listed rather than summarised away. The count the user sees on the
 * report page comes from this recording.
 *
 * Verdicts are keyed by target, not by position, so they stay attached to the
 * proposal they judged even when another proposal is dropped or the list is
 * regenerated. A test pins the mapping, so a drifted recording fails loudly
 * instead of grounding the wrong text.
 */
export const suggestionVerificationFixture: SuggestionVerification = {
  results: [
    {
      targetId: "work.1.highlights.0",
      grounded: true,
      reason: "The pipeline, its throughput and both technologies are stated in the Cobalt Analytics role.",
      unsupported: [],
    },
    {
      targetId: "basics.summary",
      grounded: true,
      reason:
        "The years, the platforms, the on-call ownership and the schema contracts are all in the resume, in the summary and the two roles.",
      unsupported: [],
    },
    {
      targetId: "work.0.highlights.2",
      grounded: false,
      reason: "The resume names no infotainment or connected-vehicle work, and no employer called Volkswagen.",
      unsupported: ["Volkswagen", "connected-vehicle infotainment platform integration"],
    },
  ],
};
