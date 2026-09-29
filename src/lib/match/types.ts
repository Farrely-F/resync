/**
 * Match report model.
 *
 * A report is evidence plus a computed number, never a model's opinion of a
 * percentage. The model only answers per-criterion questions; `score` comes from
 * the weighting function in `rubric.ts`, so the same evidence always produces the
 * same number and the reasoning can be shown line by line.
 */

/** Bumped whenever weights or criterion kinds change; recorded on every report. */
export const rubricVersion = "1.0.0";

export type CriterionKind = "required" | "nice-to-have" | "seniority" | "domain" | "education";

export type CriterionVerdict = "met" | "partial" | "missing";

export interface MatchCriterion {
  id: string;
  kind: CriterionKind;
  /** The requirement as stated by the posting. */
  requirement: string;
  verdict: CriterionVerdict;
  /** Quoted support from the resume, or null when missing. */
  evidence: string | null;
}

/** A deterministic formatting check over the generated document, not a judgement call. */
export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface MatchReport {
  id: string;
  resumeId: string;
  jdId: string;
  rubricVersion: string;
  /** 0-100, computed by us from `criteria`. */
  score: number;
  criteria: MatchCriterion[];
  atsChecks: AtsCheck[];
  /**
   * Model prose, always presented as commentary and never as the score. Null
   * when the model returned none.
   */
  summary: string | null;
  /** Identity of the analysed inputs; identical inputs reuse the stored report. */
  inputHash: string;
  /** Which model produced the evidence, and under which mode. Worth recording:
   * `openrouter/free` is an auto-router and may pick a different model per call. */
  model: string;
  aiMode: "mock" | "live";
  createdAt: string;
}
