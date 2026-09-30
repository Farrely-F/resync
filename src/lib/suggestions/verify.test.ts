import { describe, expect, it } from "vitest";

import { parseResumeFixture } from "@/lib/resume/fixtures";
import { buildSuggestions } from "@/lib/suggestions/assemble";
import { suggestionVerificationFixture } from "@/lib/suggestions/fixtures/verify-suggestions";
import type { Suggestion } from "@/lib/suggestions/types";
import { filterGrounded, type SuggestionVerification } from "@/lib/suggestions/verify";

/**
 * The grounding filter is the one thing standing between a plausible rewrite and
 * the user's resume, so it is tested with the fabrications it exists to catch: an
 * invented employer, an inflated metric and an invented skill. It must also fail
 * closed — a verdict it did not receive is not a pass — and it must attach each
 * verdict to the proposal it judged rather than to a position in a list.
 */

const criteria = [
  { id: "c1", kind: "required" as const, requirement: "Distributed systems", verdict: "missing" as const, evidence: null },
  { id: "c2", kind: "required" as const, requirement: "Streaming workloads", verdict: "partial" as const, evidence: "Kafka" },
  { id: "c3", kind: "required" as const, requirement: "Go", verdict: "missing" as const, evidence: null },
  { id: "c4", kind: "required" as const, requirement: "Ownership", verdict: "missing" as const, evidence: null },
];

function proposals(): Suggestion[] {
  const built = buildSuggestions({
    resume: parseResumeFixture,
    criteria,
    drafts: [
      {
        targetId: "work.1.highlights.0",
        proposed: "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink, in Rust.",
        rationale: "Names a systems language.",
        criterionIndex: 3,
      },
      {
        targetId: "work.0.highlights.0",
        proposed: "Led the ledger migration, cutting p99 write latency by 85%.",
        rationale: "Leads with the outcome.",
        criterionIndex: 1,
      },
      {
        targetId: "work.0.highlights.2",
        proposed: "Mentored four engineers and led the connected-vehicle infotainment integration for Volkswagen.",
        rationale: "Shows the domain the posting wants.",
        criterionIndex: 4,
      },
      {
        targetId: "work.1.highlights.1",
        proposed: "Introduced schema contracts between producers and consumers, which ended a class of silent data breaks.",
        rationale: "Foregrounds cross-team work.",
        criterionIndex: 4,
      },
    ],
  });

  expect(built.dropped).toEqual([]);
  return built.suggestions;
}

function verdict(targetId: string, grounded: boolean, reason = "Stated in the resume.", unsupported: string[] = []) {
  return { targetId, grounded, reason, unsupported };
}

describe("filterGrounded", () => {
  it("drops an invented skill, an inflated metric and an invented employer, and names the claims", () => {
    const suggestions = proposals();

    const verification: SuggestionVerification = {
      results: [
        verdict("work.1.highlights.0", false, "The resume does not mention Rust.", ["Rust"]),
        verdict("work.0.highlights.0", false, "The resume states 60%, not 85%.", ["cutting p99 write latency by 85%"]),
        verdict("work.0.highlights.2", false, "No infotainment work and no Volkswagen.", [
          "Volkswagen",
          "connected-vehicle infotainment integration",
        ]),
        verdict("work.1.highlights.1", true, "Stated verbatim in the Cobalt role."),
      ],
    };

    const { kept, dropped } = filterGrounded(suggestions, verification);

    expect(kept.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.1"]);
    expect(dropped).toHaveLength(3);
    expect(dropped.every((drop) => drop.reason === "not-grounded")).toBe(true);
    expect(dropped[0].detail).toContain("Rust");
    expect(dropped[1].detail).toContain("85%");
    expect(dropped[2].detail).toContain("Volkswagen");
    // The dropped proposals come back with their text, so the UI can show what was thrown away.
    expect(dropped[2].proposed).toContain("Volkswagen");
    expect(dropped[2].targetId).toBe("work.0.highlights.2");
  });

  it("drops every proposal when the check rejects them all", () => {
    const suggestions = proposals();

    const { kept, dropped } = filterGrounded(suggestions, {
      results: suggestions.map((suggestion) => verdict(suggestion.targetId, false, "Nothing in the resume supports this.")),
    });

    expect(kept).toEqual([]);
    expect(dropped).toHaveLength(suggestions.length);
  });

  it("fails closed: a proposal the check did not answer for is dropped, not assumed safe", () => {
    const suggestions = proposals();

    const { kept, dropped } = filterGrounded(suggestions, {
      results: [verdict("work.1.highlights.0", true)],
    });

    expect(kept.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.0"]);
    expect(dropped).toHaveLength(3);
    expect(dropped.every((drop) => drop.reason === "no-verdict")).toBe(true);
    expect(dropped[0].detail).toContain("no verdict");
  });

  it("drops a proposal that claims to be grounded while listing unsupported claims", () => {
    const suggestions = proposals();

    const { kept, dropped } = filterGrounded(suggestions, {
      results: [verdict("work.1.highlights.0", true, "Mostly fine.", ["Rust"])],
    });

    expect(kept).toEqual([]);
    expect(dropped[0].reason).toBe("not-grounded");
    expect(dropped[0].detail).toContain("Rust");
  });

  it("attaches a verdict to the proposal it names, not to a position in the list", () => {
    const suggestions = proposals();
    const fabricated = suggestions.filter((suggestion) => suggestion.targetId === "work.0.highlights.2");

    // The same recorded verdict, applied to a list that no longer contains the
    // proposals it used to sit beside: position-based matching would ground the
    // wrong text here, which is exactly what regeneration after an accepted edit
    // used to do.
    const { kept, dropped } = filterGrounded(fabricated, {
      results: [verdict("work.1.highlights.0", true), verdict("work.0.highlights.2", false, "Invented.", ["Volkswagen"])],
    });

    expect(kept).toEqual([]);
    expect(dropped[0].targetId).toBe("work.0.highlights.2");
  });

  it("reaches the same decision whatever order the proposals arrive in", () => {
    const suggestions = proposals();
    const verification: SuggestionVerification = {
      results: [
        verdict("work.0.highlights.2", false, "Invented.", ["Volkswagen"]),
        verdict("work.1.highlights.0", true),
        verdict("work.0.highlights.0", true),
        verdict("work.1.highlights.1", true),
      ],
    };

    const forwards = filterGrounded(suggestions, verification);
    const backwards = filterGrounded([...suggestions].reverse(), verification);

    expect(forwards.dropped.map((drop) => drop.targetId)).toEqual(["work.0.highlights.2"]);
    expect(backwards.dropped.map((drop) => drop.targetId)).toEqual(["work.0.highlights.2"]);
    expect(forwards.kept.map((suggestion) => suggestion.targetId).sort()).toEqual(
      backwards.kept.map((suggestion) => suggestion.targetId).sort(),
    );
  });

  it("keeps the first verdict for a repeated target and ignores targets it was not asked about", () => {
    const suggestions = proposals();

    const { kept, dropped } = filterGrounded(suggestions, {
      results: [
        verdict("work.0.highlights.9", false, "Not a proposal we sent."),
        verdict("work.1.highlights.0", false, "Invented language.", ["Rust"]),
        verdict("work.1.highlights.0", true, "Second thoughts."),
        verdict("work.0.highlights.0", true),
        verdict("work.0.highlights.2", true),
        verdict("work.1.highlights.1", true),
      ],
    });

    expect(kept.map((suggestion) => suggestion.targetId)).toEqual([
      "work.0.highlights.0",
      "work.0.highlights.2",
      "work.1.highlights.1",
    ]);
    expect(dropped.map((drop) => drop.reason)).toEqual(["not-grounded"]);
  });

  it("keeps everything when the check grounds everything", () => {
    const suggestions = proposals();

    const { kept, dropped } = filterGrounded(suggestions, {
      results: suggestions.map((suggestion) => verdict(suggestion.targetId, true)),
    });

    expect(kept).toHaveLength(4);
    expect(dropped).toEqual([]);
  });
});

describe("the recorded verification fixture", () => {
  it("names the targets of the recorded proposals", () => {
    expect(suggestionVerificationFixture.results.map((result) => result.targetId)).toEqual([
      "work.1.highlights.0",
      "basics.summary",
      "work.0.highlights.2",
    ]);
  });
});
