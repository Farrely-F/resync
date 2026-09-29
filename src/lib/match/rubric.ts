import { rubricVersion, type CriterionKind, type CriterionVerdict, type MatchCriterion } from "@/lib/match/types";

/**
 * The scoring function: evidence in, percentage out.
 *
 * This is ours, not the model's, and it is pure, so the same criteria always
 * produce the same number and the report can show the arithmetic line by line.
 * Changing a weight here changes every score computed from now on — with no new
 * model call, because the criteria are already stored — which is why
 * `rubricVersion` is recorded on each report: a stored score and a fresh score
 * are only comparable when their versions match.
 *
 * Rules, stated once and implemented below:
 *
 * - **Credit.** `met` earns the criterion's full weight, `partial` earns half of
 *   it, `missing` earns nothing.
 * - **Nice-to-have items do not penalise.** An optional item is added to the
 *   denominator only when the resume earns something from it (`met` or
 *   `partial`). Failing to have an optional item therefore costs nothing, and
 *   having one raises the score without ever pushing it past 100.
 * - **Everything else always counts.** A required, seniority, domain or
 *   education criterion sits in the denominator whether or not it is met, so
 *   missing one lowers the score.
 * - **Normalisation.** `score = 100 × earned ÷ possible`, clamped to 0–100. If
 *   the only criteria were optional items the resume did not have, nothing the
 *   rubric penalises was missed and the score is 100.
 * - **Nothing to score is not a score of zero.** With no criteria at all the
 *   result is marked `analysable: false`; callers must say the pair could not be
 *   analysed rather than display a fabricated percentage.
 */

/**
 * Explicit weights, in points. Requirements dominate; an optional item is worth
 * about a quarter of one, so a strong optional section can move the score but
 * cannot carry an application on its own.
 */
export const criterionWeights: Record<CriterionKind, number> = {
  required: 12,
  "nice-to-have": 3,
  seniority: 8,
  domain: 6,
  education: 4,
};

/** Fraction of the weight a verdict earns. */
export const verdictCredit: Record<CriterionVerdict, number> = {
  met: 1,
  partial: 0.5,
  missing: 0,
};

/** Options are opportunity, not debt; see the rules above. */
const optionalKind: CriterionKind = "nice-to-have";

export interface RubricRow {
  criterion: MatchCriterion;
  weight: number;
  /** 0–1, from `verdictCredit`. */
  credit: number;
  /** `weight × credit`. */
  earned: number;
  /** False for an unmet optional item, which is left out of the denominator. */
  counted: boolean;
}

export interface RubricResult {
  rubricVersion: string;
  /** 0–100, rounded to one decimal. */
  score: number;
  /** Points earned, the numerator. */
  earned: number;
  /** Points available, the denominator. */
  possible: number;
  /** False when there were no criteria to score; the caller must not show a number. */
  analysable: boolean;
  rows: RubricRow[];
}

/** One decimal is enough to show the arithmetic without implying precision we do not have. */
function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * `weights` is a parameter rather than a closed-over constant so the caller can
 * re-score stored criteria under a different table — which is exactly how a
 * weight change moves a score with no model call — and so the tests can prove
 * that the arithmetic, not the evidence, is what changed.
 */
export function scoreCriteria(
  criteria: readonly MatchCriterion[],
  weights: Record<CriterionKind, number> = criterionWeights,
): RubricResult {
  const rows: RubricRow[] = criteria.map((criterion) => {
    const weight = weights[criterion.kind];
    const credit = verdictCredit[criterion.verdict];

    return {
      criterion,
      weight,
      credit,
      earned: weight * credit,
      counted: criterion.kind !== optionalKind || criterion.verdict !== "missing",
    };
  });

  const earned = rows.reduce((total, row) => total + row.earned, 0);
  const possible = rows.reduce((total, row) => total + (row.counted ? row.weight : 0), 0);

  if (rows.length === 0) {
    return { rubricVersion, score: 0, earned: 0, possible: 0, analysable: false, rows };
  }

  const score = possible === 0 ? 100 : Math.min(100, Math.max(0, roundScore((100 * earned) / possible)));

  return { rubricVersion, score, earned, possible, analysable: true, rows };
}
