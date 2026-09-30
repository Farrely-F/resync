import type { LanguageModel } from "ai";
import { z } from "zod";

import { runStructured, type AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import { suggestAdjustmentsFixture } from "@/lib/suggestions/fixtures/suggest-adjustments";
import { collectEditableTargets, type EditableTarget } from "@/lib/suggestions/targets";

/**
 * The model's half of adjustment generation: proposals, never edits.
 *
 * The model may only rewrite spans we listed for it, so `targetId` is checked
 * against that list before anything is shown; `current` is filled in by us from
 * the resume, not quoted back by the model. A proposal that survives that is
 * still only a proposal — `verify.ts` reads it again before the user sees it,
 * and `apply.ts` is the one function that ever writes.
 *
 * Criteria are referenced by their number in the list we send. A recorded
 * fixture then stays readable and remains valid whatever ids a report's
 * criteria carry, which is what lets the mock app demonstrate the whole path.
 */

export const suggestionDraftSchema = z.object({
  suggestions: z.array(
    z.object({
      /** Copied from the target list we sent; an id we did not send cannot resolve. */
      targetId: z.string().min(1),
      /** The replacement text. We never ask the model for the text it is replacing. */
      proposed: z.string().min(1),
      rationale: z.string().min(1),
      /** 1-based position in the criteria list we sent. */
      criterionIndex: z.number().int().min(1),
    }),
  ),
});

export type SuggestionDraft = z.infer<typeof suggestionDraftSchema>["suggestions"][number];

export const suggestAdjustmentsInstructions = [
  "You propose concrete edits that would bring a candidate's resume closer to one job posting.",
  "You are given the resume as structured data, the posting, the criteria an analysis already scored, and the list of editable targets: spans of text that are already in the resume, each with an id and its current text.",
  "Address only criteria that are `partial` or `missing`; a criterion that is already met needs no edit.",
  "Copy `targetId` exactly as given, and use each target at most once.",
  "`proposed` is the replacement for that target's text, in the same voice and person, and it must stand on its own as the text of that bullet or field.",
  "`rationale` is one sentence saying what the rewrite surfaces and why it helps; the user reads it before deciding.",
  "`criterionIndex` is the number of the criterion the rewrite addresses, copied from the numbered list.",
  "Never add an employer, client, product, technology, metric, number, date, degree, certificate or skill that the resume data does not already contain, and never move a fact from one role to another. Re-word, re-order, compress and foreground what is already there.",
  "Never invent a requirement, and never return a score, a percentage or a rating.",
].join("\n");

export function buildSuggestionsPrompt(input: {
  resume: Resume;
  jd: Jd;
  criteria: readonly MatchCriterion[];
  targets: readonly EditableTarget[];
}): string {
  const criteria = input.criteria.map(
    (criterion, index) =>
      `${index + 1}. [${criterion.kind}] ${criterion.requirement} — currently ${criterion.verdict}${
        criterion.evidence === null ? "" : ` (resume evidence: ${criterion.evidence})`
      }`,
  );

  const targets = input.targets.map((target) => `[${target.id}] ${target.label}: ${JSON.stringify(target.text)}`);

  return [
    "RESUME (structured data)",
    JSON.stringify(input.resume, null, 2),
    "",
    "JOB POSTING (structured data)",
    JSON.stringify(input.jd, null, 2),
    "",
    "CRITERIA ALREADY SCORED (reference one by its number)",
    criteria.join("\n"),
    "",
    "EDITABLE TARGETS (copy an id exactly; these are the only spans you may rewrite)",
    targets.join("\n"),
  ].join("\n");
}

export interface SuggestAdjustmentsInput {
  resume: Resume;
  jd: Jd;
  criteria: readonly MatchCriterion[];
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

/** The `suggest-adjustments` call. In mock mode it replays this feature's own recording. */
export async function suggestAdjustments(input: SuggestAdjustmentsInput): Promise<SuggestionDraft[]> {
  const drafts = await runStructured({
    task: "suggest-adjustments",
    schema: suggestionDraftSchema,
    instructions: suggestAdjustmentsInstructions,
    prompt: buildSuggestionsPrompt({ ...input, targets: collectEditableTargets(input.resume) }),
    env: input.env,
    fixtures: input.fixtures ?? { "suggest-adjustments": suggestAdjustmentsFixture },
    model: input.model,
  });

  return drafts.suggestions;
}
