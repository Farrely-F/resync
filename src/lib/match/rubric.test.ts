import { describe, expect, it } from "vitest";

import { criterionWeights, scoreCriteria, verdictCredit } from "@/lib/match/rubric";
import { rubricVersion, type CriterionKind, type CriterionVerdict, type MatchCriterion } from "@/lib/match/types";

let counter = 0;

function criterion(kind: CriterionKind, verdict: CriterionVerdict): MatchCriterion {
  counter += 1;
  return {
    id: `criterion-${counter}`,
    kind,
    requirement: `${kind} requirement ${counter}`,
    verdict,
    evidence: verdict === "missing" ? null : "quoted resume text",
  };
}

describe("scoreCriteria", () => {
  it("weights each criterion by kind and credits each verdict", () => {
    const result = scoreCriteria([
      criterion("required", "met"),
      criterion("required", "missing"),
      criterion("seniority", "partial"),
    ]);

    // 12 + 0 + 8×0.5 earned out of 12 + 12 + 8 available.
    expect(result.earned).toBe(16);
    expect(result.possible).toBe(32);
    expect(result.score).toBe(50);
    expect(result.rubricVersion).toBe(rubricVersion);
    expect(result.rows.map((row) => row.earned)).toEqual([12, 0, 4]);
  });

  it("counts partial as half of met", () => {
    const met = scoreCriteria([criterion("required", "met")]);
    const partial = scoreCriteria([criterion("required", "partial")]);
    const missing = scoreCriteria([criterion("required", "missing")]);

    expect(met.earned).toBe(criterionWeights.required * verdictCredit.met);
    expect(partial.earned).toBe(criterionWeights.required * verdictCredit.partial);
    expect(missing.earned).toBe(0);
    expect(partial.earned).toBe(met.earned / 2);
  });

  it("scores one met and one partial requirement at 75", () => {
    const result = scoreCriteria([criterion("required", "met"), criterion("required", "partial")]);

    expect(result.earned).toBe(18);
    expect(result.possible).toBe(24);
    expect(result.score).toBe(75);
  });

  it("returns an unanalysable result rather than a score of zero when there are no criteria", () => {
    const result = scoreCriteria([]);

    expect(result.analysable).toBe(false);
    expect(result.rows).toEqual([]);
    expect(result.possible).toBe(0);
    expect(result.score).toBe(0);
  });

  it("scores a resume that meets everything at exactly 100 and never above", () => {
    const everything = (["required", "nice-to-have", "seniority", "domain", "education"] as const).map((kind) =>
      criterion(kind, "met"),
    );
    const result = scoreCriteria([...everything, ...everything]);

    expect(result.earned).toBe(result.possible);
    expect(result.score).toBe(100);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("scores a resume that meets nothing at 0", () => {
    const result = scoreCriteria([
      criterion("required", "missing"),
      criterion("seniority", "missing"),
      criterion("domain", "missing"),
      criterion("education", "missing"),
    ]);

    expect(result.earned).toBe(0);
    expect(result.score).toBe(0);
    expect(result.analysable).toBe(true);
  });

  it("does not penalise a missing nice-to-have item", () => {
    const base = [criterion("required", "met"), criterion("required", "missing")];
    const withMissingOptional = [...base, criterion("nice-to-have", "missing")];

    expect(scoreCriteria(withMissingOptional).score).toBe(scoreCriteria(base).score);
    expect(scoreCriteria(base).score).toBe(50);
    // The unmet option is left out of the denominator, not counted as a low score.
    expect(scoreCriteria(withMissingOptional).possible).toBe(scoreCriteria(base).possible);
  });

  it("lets a met nice-to-have item raise the score without reaching past 100", () => {
    const base = [criterion("required", "met"), criterion("required", "missing")];
    const withMetOptional = [...base, criterion("nice-to-have", "met")];

    expect(scoreCriteria(withMetOptional).score).toBeGreaterThan(scoreCriteria(base).score);
    // 15/27 = 55.6, not 15/24 = 62.5.
    expect(scoreCriteria(withMetOptional).score).toBe(55.6);
  });

  it("treats a resume whose only gaps are optional items as nothing missed", () => {
    const result = scoreCriteria([criterion("nice-to-have", "missing")]);

    expect(result.possible).toBe(0);
    expect(result.score).toBe(100);
    expect(result.analysable).toBe(true);
  });

  it("changes the score when the weights change, from the same criteria", () => {
    const criteria = [criterion("required", "met"), criterion("domain", "missing")];

    const defaultWeights = scoreCriteria(criteria);
    const heavierDomain = scoreCriteria(criteria, { ...criterionWeights, domain: 24 });

    expect(defaultWeights.score).toBe(66.7);
    expect(heavierDomain.score).toBe(33.3);
    expect(defaultWeights.rows.map((row) => row.criterion)).toEqual(heavierDomain.rows.map((row) => row.criterion));
  });

  it("is deterministic for the same criteria", () => {
    const criteria = [criterion("required", "partial"), criterion("education", "met")];

    expect(scoreCriteria(criteria)).toEqual(scoreCriteria(criteria));
  });

  it("is unaffected by the criteria's own ids", () => {
    const a = criterion("required", "met");
    const b = { ...a, id: "a-different-id" };

    expect(scoreCriteria([b]).score).toBe(scoreCriteria([a]).score);
  });
});
