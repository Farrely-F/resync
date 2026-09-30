import type { LanguageModel } from "ai";
import { z } from "zod";

import { runStructured, type AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import type { Resume } from "@/lib/resume/schema";
import { suggestionVerificationFixture } from "@/lib/suggestions/fixtures/verify-suggestions";
import type { DroppedSuggestion, Suggestion } from "@/lib/suggestions/types";

/**
 * The grounding verifier: the second call, and the reason a suggestion can be
 * trusted enough to show.
 *
 * It is given the user's own resume data and the proposals, and asked one
 * question per proposal — is every factual claim in the replacement entailed by
 * this data? A rewrite that only re-orders or re-words what is there is
 * entailed; an employer, metric, date, technology or certificate the resume does
 * not contain is not, however plausible it looks for the posting.
 *
 * Two rules make the result safe to act on:
 *
 * - **It only judges.** The verifier may not rewrite a proposal, so a rejected
 *   one cannot come back softened; it is dropped.
 * - **A missing verdict is not a pass.** `filterGrounded` drops any proposal the
 *   verifier did not answer for, so a partial or lazy response cannot let an
 *   ungrounded claim through unchecked.
 *
 * Proposals are identified by the target id they rewrite. The model is told to
 * produce one proposal per target, and generation enforces that, so a verdict
 * attaches to the proposal and not to its position in a list: regenerating after
 * the resume changed cannot slide a verdict onto a different proposal.
 */

export const suggestionVerificationSchema = z.object({
  results: z.array(
    z.object({
      /** The id of the proposal this verdict is about, copied from the list we sent. */
      targetId: z.string().min(1),
      /** True only when every factual claim in the replacement is already in the resume data. */
      grounded: z.boolean(),
      reason: z.string().min(1),
      /** The claims the resume does not support; empty when grounded. */
      unsupported: z.array(z.string()),
    }),
  ),
});

export type SuggestionVerification = z.infer<typeof suggestionVerificationSchema>;
export type SuggestionVerdict = SuggestionVerification["results"][number];

export const verifySuggestionsInstructions = [
  "You verify that proposed resume edits are grounded in the candidate's own data. You never improve or rewrite a proposal; you only judge it.",
  "You are given the resume as structured data and a list of proposals, each identified by the target it rewrites and showing the text it would replace and the text that would replace it.",
  "For each proposal, decide whether every factual claim in the proposed text is entailed by the resume data.",
  "Entailed: re-wording, re-ordering, emphasis, shortening, and combinations of facts that are all present in the resume data.",
  "Not entailed: any employer, client, product, technology, tool, metric, number, date, degree, certificate, job title or skill that does not appear in the resume data — even if the job posting asks for it, even if it is plausible, and even if it would be an improvement.",
  "Also not entailed: moving a fact from one employer to another, inflating a number that is present, or stating a claim more strongly than the resume does.",
  "Return exactly one result per proposal, copying the `targetId` given, and return `grounded: false` with a reason and the list of unsupported claims for anything the resume does not support.",
  "A proposal you are unsure about is not grounded. Never return a score or a percentage.",
].join("\n");

export function buildVerificationPrompt(input: { resume: Resume; suggestions: readonly Suggestion[] }): string {
  const proposals = input.suggestions.map((suggestion) =>
    [
      `[${suggestion.targetId}] for the requirement: ${suggestion.requirement}`,
      `   replaces: ${JSON.stringify(suggestion.current)}`,
      `   proposed: ${JSON.stringify(suggestion.proposed)}`,
      `   stated rationale: ${suggestion.rationale}`,
    ].join("\n"),
  );

  return [
    "RESUME (structured data — the only evidence a proposal may rest on)",
    JSON.stringify(input.resume, null, 2),
    "",
    "PROPOSALS TO CHECK",
    proposals.join("\n\n"),
  ].join("\n");
}

export interface VerifySuggestionsInput {
  resume: Resume;
  suggestions: readonly Suggestion[];
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

/** The `verify-suggestions` call. In mock mode it replays this feature's own recording. */
export async function verifySuggestions(input: VerifySuggestionsInput): Promise<SuggestionVerification> {
  return runStructured({
    task: "verify-suggestions",
    schema: suggestionVerificationSchema,
    instructions: verifySuggestionsInstructions,
    prompt: buildVerificationPrompt(input),
    env: input.env,
    fixtures: input.fixtures ?? { "verify-suggestions": suggestionVerificationFixture },
    model: input.model,
  });
}

export interface GroundingOutcome {
  kept: Suggestion[];
  dropped: DroppedSuggestion[];
}

function ungroundedDetail(verdict: SuggestionVerdict): string {
  const claims = verdict.unsupported.filter((claim) => claim.trim() !== "");

  if (claims.length === 0) {
    return verdict.reason;
  }

  return `${verdict.reason} Claims the resume data does not support: ${claims.join("; ")}.`;
}

/**
 * Keeps what the verifier grounded and drops the rest, counting the drops so the
 * UI can say how many proposals were removed rather than quietly showing fewer.
 * A verdict is matched to the proposal by the target it names — not by position —
 * so a recording stays attached to the proposal it judged even when the list
 * around it changes. The first verdict for a target wins.
 */
export function filterGrounded(
  suggestions: readonly Suggestion[],
  verification: SuggestionVerification,
): GroundingOutcome {
  const byTarget = new Map<string, SuggestionVerdict>();
  for (const verdict of verification.results) {
    if (!byTarget.has(verdict.targetId)) {
      byTarget.set(verdict.targetId, verdict);
    }
  }

  const kept: Suggestion[] = [];
  const dropped: DroppedSuggestion[] = [];

  for (const suggestion of suggestions) {
    const verdict = byTarget.get(suggestion.targetId);

    if (verdict === undefined) {
      dropped.push({
        reason: "no-verdict",
        targetId: suggestion.targetId,
        proposed: suggestion.proposed,
        detail: "The grounding check returned no verdict for this proposal, so it was dropped rather than assumed safe.",
      });
      continue;
    }

    if (!verdict.grounded || verdict.unsupported.some((claim) => claim.trim() !== "")) {
      dropped.push({
        reason: "not-grounded",
        targetId: suggestion.targetId,
        proposed: suggestion.proposed,
        detail: ungroundedDetail(verdict),
      });
      continue;
    }

    kept.push(suggestion);
  }

  return { kept, dropped };
}
