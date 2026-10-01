import { describe, expect, it } from "vitest";

import { countHedges, scoreAnswer, scoreBand, scoreConfidence } from "@/lib/practice/rubric";

describe("scoreAnswer", () => {
  it("is the weighted share of the credit that was available", () => {
    const result = scoreAnswer({ answered: "strong", evidence: "adequate", grounded: "strong", structure: "weak", honesty: "weak" });
    // 3 + 1.5 + 2 + 0 + 0 = 6.5 of 10
    expect(result).toMatchObject({ earned: 6.5, possible: 10, score: 65 });
  });

  it("leaves a not-applicable dimension out of the total instead of scoring it zero", () => {
    const result = scoreAnswer({ answered: "strong", evidence: "strong", grounded: "strong", structure: "strong", honesty: "not-applicable" });
    expect(result).toMatchObject({ earned: 9, possible: 9, score: 100 });
    expect(result.rows.find((row) => row.dimension === "honesty")?.counted).toBe(false);
  });
});

describe("confidence", () => {
  it("counts hedges in the wording and deducts a fixed amount for each", () => {
    expect(countHedges("I think it was maybe about ten, kind of, I'm not sure")).toBe(4);
    expect(scoreConfidence("assertive", "I think so. Maybe.")).toEqual({ confidence: 88, base: 100, hedges: 2 });
  });

  it("never goes below zero", () => {
    expect(scoreConfidence("hedged", "maybe ".repeat(20)).confidence).toBe(0);
  });
});

describe("scoreBand", () => {
  it("names the range a score is in", () => {
    expect([90, 70, 50, 10].map(scoreBand)).toEqual(["Interview-ready", "Solid", "Needs sharpening", "Rework this one"]);
  });
});
