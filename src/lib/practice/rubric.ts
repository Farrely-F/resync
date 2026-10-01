import type { GradeVerdicts, Delivery, Verdict } from "@/lib/practice/grade";

/**
 * How an answer becomes a number.
 *
 * The model is never asked for a score. It judges each dimension of the answer as
 * strong, adequate or weak — the same split the match report uses for met, partly
 * met and missing — and this file does the arithmetic, so the same verdicts always
 * give the same number and the screen can show the sum. A change to the weights
 * bumps `practiceRubricVersion`, which is stored with every graded answer.
 */

export const practiceRubricVersion = 1;

export const dimensions = ["answered", "evidence", "grounded", "structure", "honesty"] as const;
export type Dimension = (typeof dimensions)[number];

export const dimensionLabels: Record<Dimension, { label: string; hint: string }> = {
  answered: { label: "Answered the question", hint: "Addressed what was asked, not a neighbouring topic." },
  evidence: { label: "Specific evidence", hint: "Named a project, a decision or a number instead of speaking in general." },
  grounded: { label: "Backed by your resume", hint: "Claims the resume supports; anything it does not is flagged." },
  structure: { label: "Structure", hint: "Context, what you did, and the result, in an order a listener can follow." },
  honesty: { label: "Honest about gaps", hint: "Where the resume has a gap, said so plainly and showed a way forward." },
};

export const dimensionWeights: Record<Dimension, number> = {
  answered: 3,
  evidence: 3,
  grounded: 2,
  structure: 1,
  honesty: 1,
};

export const verdictCredit: Record<Exclude<Verdict, "not-applicable">, number> = {
  strong: 1,
  adequate: 0.5,
  weak: 0,
};

export interface DimensionRow {
  dimension: Dimension;
  verdict: Verdict;
  weight: number;
  credit: number;
  earned: number;
  /** False for a dimension that did not apply to this question: it is left out of the total, not scored zero. */
  counted: boolean;
}

export function scoreAnswer(verdicts: GradeVerdicts): { score: number; earned: number; possible: number; rows: DimensionRow[] } {
  const rows = dimensions.map<DimensionRow>((dimension) => {
    const verdict = verdicts[dimension];
    const weight = dimensionWeights[dimension];
    const counted = verdict !== "not-applicable";
    const credit = counted ? verdictCredit[verdict] : 0;

    return { dimension, verdict, weight, credit, earned: counted ? weight * credit : 0, counted };
  });

  const possible = rows.reduce((sum, row) => sum + (row.counted ? row.weight : 0), 0);
  const earned = rows.reduce((sum, row) => sum + row.earned, 0);

  return { score: possible === 0 ? 0 : Math.round((100 * earned) / possible), earned, possible, rows };
}

/**
 * Confidence is read from the wording alone: how the model rates the delivery, less
 * a fixed deduction for each hedge the text contains. It says nothing about voice,
 * pace or presence — an answer typed in a box has none of those — and the screen
 * says so.
 */

export const deliveryBase: Record<Delivery, number> = { assertive: 100, mixed: 65, hedged: 30 };
export const hedgeDeduction = 6;

const hedgePatterns = [
  /\bi think\b/gi,
  /\bi guess\b/gi,
  /\bi believe\b/gi,
  /\bmaybe\b/gi,
  /\bperhaps\b/gi,
  /\bprobably\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\bhopefully\b/gi,
  /\bi(?:'m| am) not (?:really )?sure\b/gi,
  /\bi (?:don'?t|do not) (?:really )?know\b/gi,
  /\bI'?m (?:no|not an) expert\b/gi,
];

/** Hedging phrases in the answer, counted by the app so the deduction can be shown and checked. */
export function countHedges(text: string): number {
  return hedgePatterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0);
}

export function scoreConfidence(delivery: Delivery, answer: string): { confidence: number; base: number; hedges: number } {
  const base = deliveryBase[delivery];
  const hedges = countHedges(answer);

  return { confidence: Math.max(0, base - hedges * hedgeDeduction), base, hedges };
}

/** A word for a score, so a number is never the only thing on screen. */
export function scoreBand(score: number): string {
  if (score >= 85) {
    return "Interview-ready";
  }
  if (score >= 65) {
    return "Solid";
  }
  if (score >= 40) {
    return "Needs sharpening";
  }
  return "Rework this one";
}
