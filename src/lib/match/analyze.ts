import type { LanguageModel } from "ai";
import { z } from "zod";

import { runStructured, type AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import type { CriterionKind, CriterionVerdict, MatchCriterion } from "@/lib/match/types";
import type { Jd } from "@/lib/jd/schema";
import type { Resume } from "@/lib/resume/schema";

/**
 * The model's half of match analysis: per-criterion evidence, never a number.
 *
 * The model is asked one question per requirement — is it met, partly met, or
 * missing, and what in the resume supports that — and it is told explicitly not
 * to answer with a score. The percentage is computed from this evidence by
 * `rubric.ts`, which is what makes it reproducible and auditable.
 */

/** Kept in lockstep with the frozen `CriterionKind`/`CriterionVerdict` unions. */
const criterionKinds = ["required", "nice-to-have", "seniority", "domain", "education"] as const satisfies readonly CriterionKind[];
const verdicts = ["met", "partial", "missing"] as const satisfies readonly CriterionVerdict[];

/**
 * Wire schema for the `analyze-match` task. Criterion ids are deliberately not
 * asked of the model: they are ours to mint, so a repeated analysis of the same
 * inputs cannot be distinguished by an invented identifier.
 */
export const criterionEvidenceSchema = z.object({
  criteria: z.array(
    z.object({
      kind: z.enum(criterionKinds),
      requirement: z.string().min(1),
      verdict: z.enum(verdicts),
      /**
       * A quote or close paraphrase from the resume; null when nothing supports
       * the verdict. `nullable` rather than defaulted: a default makes the
       * property optional, and a strict provider rejects a schema whose
       * properties are not all required.
       */
      evidence: z.string().nullable(),
    }),
  ),
  /** Optional prose. Presented as commentary, never as the score. */
  summary: z.string().nullable(),
});

export type CriterionEvidence = z.infer<typeof criterionEvidenceSchema>;
export type ModelCriterion = CriterionEvidence["criteria"][number];

export const analyzeMatchInstructions = [
  "You compare a candidate's resume with a job posting and answer only per-criterion questions.",
  "Return one criterion for every must-have requirement, one for every nice-to-have item, and one each for seniority, domain and education when the posting implies them.",
  "`kind` is the requirement's role: `required` for a must-have, `nice-to-have` for an optional or preferred item, `seniority` for the level asked for, `domain` for industry or product-area experience, `education` for a stated qualification.",
  "`verdict` is `met` when the resume plainly satisfies the requirement, `partial` when it satisfies part of it or an adjacent form of it, and `missing` when nothing in the resume supports it.",
  "`evidence` must quote or closely paraphrase the resume text that supports a `met` or `partial` verdict, and must be null for `missing`.",
  "Never return a score, a percentage, a rating or a recommendation; the caller computes the number from your verdicts.",
  "Do not invent requirements the posting does not state.",
].join(" ");

export interface AnalyzeMatchEvidenceInput {
  resume: Resume;
  jd: Jd;
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

export function buildAnalyzePrompt(input: { resume: Resume; jd: Jd }): string {
  return [
    "JOB POSTING",
    JSON.stringify(input.jd, null, 2),
    "",
    "RESUME",
    JSON.stringify(input.resume, null, 2),
  ].join("\n");
}

function withIds(criteria: ModelCriterion[]): MatchCriterion[] {
  return criteria.map((criterion) => ({
    id: crypto.randomUUID(),
    kind: criterion.kind,
    requirement: criterion.requirement,
    verdict: criterion.verdict,
    evidence: criterion.evidence,
  }));
}

export interface MatchEvidence {
  criteria: MatchCriterion[];
  summary: string | null;
}

/** The `analyze-match` call. In mock mode it replays this feature's own recording. */
export async function analyzeMatchEvidence(input: AnalyzeMatchEvidenceInput): Promise<MatchEvidence> {
  const evidence = await runStructured({
    task: "analyze-match",
    schema: criterionEvidenceSchema,
    instructions: analyzeMatchInstructions,
    prompt: buildAnalyzePrompt(input),
    env: input.env,
    fixtures: input.fixtures ?? { "analyze-match": analyzeMatchFixture },
    model: input.model,
  });

  return { criteria: withIds(evidence.criteria), summary: evidence.summary };
}
