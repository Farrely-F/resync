import { describe, expect, it } from "vitest";

import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import type { MatchCriterion } from "@/lib/match/types";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { buildSuggestions, stableSuggestionId } from "@/lib/suggestions/assemble";
import { suggestAdjustmentsFixture } from "@/lib/suggestions/fixtures/suggest-adjustments";

/** Criteria shaped like the ones a report stores, with ids this build minted. */
const criteria: MatchCriterion[] = [
  { id: "crit-go", kind: "required", requirement: "Strong Go experience", verdict: "met", evidence: "Languages: Go" },
  { id: "crit-ownership", kind: "required", requirement: "Own delivery end to end", verdict: "partial", evidence: "on-call" },
  { id: "crit-infotainment", kind: "nice-to-have", requirement: "Infotainment", verdict: "missing", evidence: null },
];

const drafts = [
  {
    targetId: "work.1.highlights.0",
    proposed: "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink, in Go.",
    rationale: "Foregrounds the throughput.",
    criterionIndex: 2,
  },
];

describe("buildSuggestions", () => {
  it("fills the current text from the resume and resolves the criterion", () => {
    const built = buildSuggestions({ resume: parseResumeFixture, criteria, drafts });

    expect(built.dropped).toEqual([]);
    expect(built.suggestions).toHaveLength(1);
    expect(built.suggestions[0]).toMatchObject({
      targetId: "work.1.highlights.0",
      current: "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.",
      proposed: "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink, in Go.",
      criterionId: "crit-ownership",
      requirement: "Own delivery end to end",
    });
  });

  it("drops a target the resume does not have", () => {
    const built = buildSuggestions({
      resume: parseResumeFixture,
      criteria,
      drafts: [{ ...drafts[0], targetId: "work.4.highlights.0" }],
    });

    expect(built.suggestions).toEqual([]);
    expect(built.dropped[0].reason).toBe("unknown-target");
    expect(built.dropped[0].detail).toContain("work.4.highlights.0");
  });

  it("drops a criterion number the report does not have, rather than guessing one", () => {
    const built = buildSuggestions({ resume: parseResumeFixture, criteria, drafts: [{ ...drafts[0], criterionIndex: 7 }] });

    expect(built.suggestions).toEqual([]);
    expect(built.dropped[0].reason).toBe("unknown-criterion");
    expect(built.dropped[0].detail).toContain("7");
  });

  it("drops an edit aimed at a requirement the report already scores as met", () => {
    const built = buildSuggestions({ resume: parseResumeFixture, criteria, drafts: [{ ...drafts[0], criterionIndex: 1 }] });

    expect(built.suggestions).toEqual([]);
    expect(built.dropped[0].reason).toBe("already-met");
    expect(built.dropped[0].detail).toContain("Strong Go experience");
  });

  it("drops a proposal that would not change the text", () => {
    const built = buildSuggestions({
      resume: parseResumeFixture,
      criteria,
      drafts: [
        {
          targetId: "work.1.highlights.0",
          proposed: "  Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink. ",
          rationale: "No change.",
          criterionIndex: 2,
        },
      ],
    });

    expect(built.suggestions).toEqual([]);
    expect(built.dropped[0].reason).toBe("no-change");
  });

  it("keeps one copy of a repeated proposal", () => {
    const built = buildSuggestions({ resume: parseResumeFixture, criteria, drafts: [drafts[0], drafts[0]] });

    expect(built.suggestions).toHaveLength(1);
    expect(built.dropped.map((drop) => drop.reason)).toEqual(["duplicate"]);
  });

  it("allows one proposal per span, so a verdict can name the span it judged", () => {
    const built = buildSuggestions({
      resume: parseResumeFixture,
      criteria,
      drafts: [drafts[0], { ...drafts[0], proposed: "A different rewrite of the same bullet.", criterionIndex: 2 }],
    });

    expect(built.suggestions).toHaveLength(1);
    expect(built.dropped.map((drop) => drop.reason)).toEqual(["duplicate"]);
    expect(built.dropped[0].targetId).toBe("work.1.highlights.0");
  });

  it("trims a trimmed-away difference in the replacement", () => {
    const built = buildSuggestions({
      resume: parseResumeFixture,
      criteria,
      drafts: [{ ...drafts[0], proposed: `  ${drafts[0].proposed}  ` }],
    });

    expect(built.suggestions[0].proposed).toBe(drafts[0].proposed);
  });
});

describe("stableSuggestionId", () => {
  it("is the same for the same proposal and different for a different one", () => {
    const first = stableSuggestionId({ targetId: "work.1.highlights.0", criterionId: "crit-a", proposed: "One." });

    expect(stableSuggestionId({ targetId: "work.1.highlights.0", criterionId: "crit-a", proposed: "One." })).toBe(first);
    expect(stableSuggestionId({ targetId: "work.1.highlights.0", criterionId: "crit-a", proposed: "Two." })).not.toBe(first);
    expect(stableSuggestionId({ targetId: "work.1.highlights.1", criterionId: "crit-a", proposed: "One." })).not.toBe(first);
    expect(stableSuggestionId({ targetId: "work.1.highlights.0", criterionId: "crit-b", proposed: "One." })).not.toBe(first);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
  });

  it("does not collide across the field boundaries of its parts", () => {
    const a = stableSuggestionId({ targetId: "work.1.highlights.0", criterionId: "c", proposed: "x" });
    const b = stableSuggestionId({ targetId: "work.1.highlights.0c", criterionId: "", proposed: "x" });

    expect(a).not.toBe(b);
  });
});

describe("the recorded suggestion fixture", () => {
  it("references the criteria and spans of the other fixtures, so the recording cannot drift", () => {
    const built = buildSuggestions({
      resume: parseResumeFixture,
      criteria: analyzeMatchFixture.criteria.map((criterion, index) => ({ ...criterion, id: `criterion-${index + 1}` })),
      drafts: suggestAdjustmentsFixture.suggestions,
    });

    expect(built.dropped.map((drop) => drop.reason)).toEqual([]);
    expect(built.suggestions.map((suggestion) => suggestion.requirement)).toEqual([
      "Exposure to high-performance networking or streaming workloads",
      "Ability to own delivery end to end and collaborate across cross-functional teams",
      "Experience with in-vehicle infotainment or connected vehicle systems",
    ]);
  });
});
