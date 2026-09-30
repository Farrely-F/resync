import { describe, expect, it } from "vitest";

import { parseResumeFixture } from "@/lib/resume/fixtures";
import type { ResumeRecord } from "@/lib/storage/types";
import { applySuggestion } from "@/lib/suggestions/apply";
import { buildSuggestions } from "@/lib/suggestions/assemble";
import type { Suggestion } from "@/lib/suggestions/types";

/**
 * Apply is the only write in this feature, and it must be boring: one span
 * changes, everything else is byte-identical, and every refusal leaves the record
 * exactly as it was.
 */

function record(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    title: "Priya Raman",
    resume: parseResumeFixture,
    plainText: "the text the resume was parsed from",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function suggestionFor(targetId: string, proposed: string): Suggestion {
  const built = buildSuggestions({
    resume: parseResumeFixture,
    criteria: [
      { id: "c1", kind: "required", requirement: "Distributed systems", verdict: "missing", evidence: null },
    ],
    drafts: [{ targetId, proposed, rationale: "Because.", criterionIndex: 1 }],
  });

  if (built.suggestions.length !== 1) {
    throw new Error(`test setup: ${targetId} did not build a suggestion (${built.dropped[0]?.reason})`);
  }

  return built.suggestions[0];
}

describe("applySuggestion", () => {
  it("changes the accepted span and nothing else in the record", () => {
    const before = record();
    const suggestion = suggestionFor("work.1.highlights.0", "Built the event-ingestion pipeline on Kafka and Flink, handling 400M events per day.");

    const outcome = applySuggestion(before, suggestion, () => "2026-02-02T00:00:00.000Z");

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) {
      return;
    }

    expect(outcome.record.resume.work[1].highlights[0]).toBe(
      "Built the event-ingestion pipeline on Kafka and Flink, handling 400M events per day.",
    );
    expect(outcome.record.resume.work[1].highlights[1]).toBe(before.resume.work[1].highlights[1]);
    expect(outcome.record.resume.basics).toEqual(before.resume.basics);
    expect(outcome.record.resume.work[0]).toEqual(before.resume.work[0]);
    expect(outcome.record.resume.skills).toEqual(before.resume.skills);
    expect(outcome.record.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(outcome.record.createdAt).toBe(before.createdAt);
    expect(outcome.record.title).toBe(before.title);
    expect(outcome.record.plainText).toBe(before.plainText);
    expect(outcome.record.mode).toBe("structured");
    expect(outcome.record.manualTex).toBeNull();
  });

  it("does not mutate the record it was given", () => {
    const before = record();
    const snapshot = JSON.stringify(before);

    applySuggestion(before, suggestionFor("basics.summary", "A rewritten summary."));

    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("refuses a hand-edited resume with the reason, whatever the target says", () => {
    const manual = record({ mode: "manual", manualTex: "\\documentclass{article}" });
    const snapshot = JSON.stringify(manual);
    const suggestion = suggestionFor("work.1.highlights.0", "Rewritten bullet.");

    const outcome = applySuggestion(manual, suggestion);

    expect(outcome.applied).toBe(false);
    if (outcome.applied) {
      return;
    }

    expect(outcome.reason).toBe("manual-mode");
    expect(outcome.message).toContain("hand-edited");
    // The refusal names the way out, which is the editor's "Regenerate from data".
    expect(outcome.message).toContain("Regenerate from data");
    expect(JSON.stringify(manual)).toBe(snapshot);
  });

  it("refuses when the text it was written against has changed", () => {
    const edited = record({
      resume: {
        ...parseResumeFixture,
        work: parseResumeFixture.work.map((entry, index) =>
          index === 1 ? { ...entry, highlights: ["Something else entirely.", ...entry.highlights.slice(1)] } : entry,
        ),
      },
    });
    const snapshot = JSON.stringify(edited);

    const outcome = applySuggestion(edited, suggestionFor("work.1.highlights.0", "Rewritten bullet."));

    expect(outcome.applied).toBe(false);
    if (!outcome.applied) {
      expect(outcome.reason).toBe("stale-target");
    }

    expect(JSON.stringify(edited)).toBe(snapshot);
  });

  it("refuses when the target no longer exists", () => {
    const shorter = record({
      resume: { ...parseResumeFixture, work: parseResumeFixture.work.slice(0, 1) },
    });

    const outcome = applySuggestion(shorter, suggestionFor("work.1.highlights.0", "Rewritten bullet."));

    expect(outcome.applied).toBe(false);
    if (!outcome.applied) {
      expect(outcome.reason).toBe("unknown-target");
    }
  });

  it("refuses the same suggestion a second time, because the first apply changed the text", () => {
    const suggestion = suggestionFor("work.0.highlights.2", "Mentored four engineers and ran the on-call rotation for a team of eight.");

    const first = applySuggestion(record(), suggestion);
    expect(first.applied).toBe(true);
    if (!first.applied) {
      return;
    }

    const second = applySuggestion(first.record, suggestion);

    expect(second.applied).toBe(false);
    if (!second.applied) {
      expect(second.reason).toBe("stale-target");
    }
  });
});
