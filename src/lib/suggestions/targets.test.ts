import { describe, expect, it } from "vitest";

import { parseResumeFixture } from "@/lib/resume/fixtures";
import type { Resume } from "@/lib/resume/schema";
import {
  collectEditableTargets,
  describeTarget,
  parseTargetId,
  readTargetText,
  targetId,
  writeTargetText,
} from "@/lib/suggestions/targets";

/**
 * The editable surface is what keeps a proposal honest: the model may only
 * rewrite spans we listed, so an unresolvable target has to fail here rather
 * than in the prompt.
 */

describe("target ids", () => {
  it("round-trips every id it mints", () => {
    for (const target of collectEditableTargets(parseResumeFixture)) {
      expect(parseTargetId(target.id)).toEqual(target.target);
      expect(targetId(target.target)).toBe(target.id);
    }
  });

  it("rejects ids that do not name a real editable span", () => {
    for (const id of [
      "work.0.highlights", // a list needs an item
      "work.highlights.1", // an entry index is required
      "work.0.summary", // not a work field
      "basics.summary.0", // basics fields are scalars
      "basics.0.summary",
      "volunteer.0.name",
      "work.0.highlights.1.2",
      "work.-1.highlights.0",
      "work.0.highlights.x",
      "work",
      "",
    ]) {
      expect(parseTargetId(id), id).toBeNull();
    }
  });
});

describe("reading and writing", () => {
  it("reads the stored text at a scalar and a list target", () => {
    expect(readTargetText(parseResumeFixture, { section: "basics", entryIndex: null, field: "summary", itemIndex: null }))
      .toBe(parseResumeFixture.basics.summary);
    expect(readTargetText(parseResumeFixture, { section: "work", entryIndex: 1, field: "highlights", itemIndex: 0 })).toBe(
      "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.",
    );
  });

  it("reports null for a target the resume does not have", () => {
    expect(readTargetText(parseResumeFixture, { section: "work", entryIndex: 9, field: "highlights", itemIndex: 0 })).toBeNull();
    expect(readTargetText(parseResumeFixture, { section: "work", entryIndex: 0, field: "highlights", itemIndex: 9 })).toBeNull();
    expect(readTargetText(parseResumeFixture, { section: "skills", entryIndex: 0, field: "keywords", itemIndex: null })).toBeNull();
    expect(readTargetText(parseResumeFixture, { section: "basics", entryIndex: 0, field: "summary", itemIndex: null })).toBeNull();
    expect(readTargetText(parseResumeFixture, { section: "work", entryIndex: 0, field: "summary", itemIndex: null })).toBeNull();
    // A null field is not a span of text, so it is not editable.
    expect(readTargetText(parseResumeFixture, { section: "work", entryIndex: 0, field: "location", itemIndex: null })).toBeNull();
  });

  it("writes one span and leaves the original resume untouched", () => {
    const before = JSON.stringify(parseResumeFixture);
    const next = writeTargetText(parseResumeFixture, { section: "work", entryIndex: 1, field: "highlights", itemIndex: 1 }, "Rewritten.");

    expect(next).not.toBeNull();
    expect(next!.work[1].highlights[1]).toBe("Rewritten.");
    expect(next!.work[1].highlights[0]).toBe("Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.");
    expect(next!.work[0]).toBe(parseResumeFixture.work[0]);
    expect(JSON.stringify(parseResumeFixture)).toBe(before);
  });

  it("writes the summary and a skill keyword", () => {
    const summary = writeTargetText(parseResumeFixture, { section: "basics", entryIndex: null, field: "summary", itemIndex: null }, "New summary.");
    const keyword = writeTargetText(parseResumeFixture, { section: "skills", entryIndex: 0, field: "keywords", itemIndex: 3 }, "SQL");

    expect(summary!.basics.summary).toBe("New summary.");
    expect(summary!.work).toBe(parseResumeFixture.work);
    expect(keyword!.skills[0].keywords).toEqual(["Go", "Python", "TypeScript", "SQL"]);
  });

  it("refuses to write a target that does not resolve, and never invents one", () => {
    for (const target of [
      { section: "work" as const, entryIndex: 9, field: "highlights", itemIndex: 0 },
      { section: "work" as const, entryIndex: 0, field: "highlights", itemIndex: 9 },
      { section: "work" as const, entryIndex: 0, field: "summary", itemIndex: null },
      { section: "basics" as const, entryIndex: 0, field: "summary", itemIndex: null },
      { section: "work" as const, entryIndex: 0, field: "highlights", itemIndex: null },
      { section: "work" as const, entryIndex: 0, field: "location", itemIndex: null },
    ]) {
      expect(writeTargetText(parseResumeFixture, target, "x"), JSON.stringify(target)).toBeNull();
    }
  });
});

describe("collectEditableTargets", () => {
  const targets = collectEditableTargets(parseResumeFixture);

  it("lists every span that holds text, and nothing else", () => {
    const ids = targets.map((target) => target.id);

    expect(ids).toContain("basics.summary");
    expect(ids).toContain("work.0.highlights.2");
    expect(ids).toContain("work.1.highlights.1");
    expect(ids).toContain("skills.0.keywords.3");
    expect(ids).toContain("projects.0.description");
    expect(ids).toContain("languages.2.fluency");
    // The first work entry has three bullets, the second two.
    expect(ids.filter((id) => id.startsWith("work.0.highlights"))).toHaveLength(3);
    expect(ids.filter((id) => id.startsWith("work.1.highlights"))).toHaveLength(2);
    // Nothing targets a field the fixture leaves null or empty.
    expect(ids).not.toContain("basics.label.0");
    expect(ids).not.toContain("education.0.highlights.0");
    expect(ids.every((id) => parseTargetId(id) !== null)).toBe(true);
  });

  it("leaves out a field that holds only whitespace", () => {
    const resume: Resume = { ...parseResumeFixture, basics: { ...parseResumeFixture.basics, summary: "   " } };

    expect(collectEditableTargets(resume).map((target) => target.id)).not.toContain("basics.summary");
  });

  it("labels a span by what it is, not by its index", () => {
    expect(describeTarget(parseResumeFixture, { section: "work", entryIndex: 1, field: "highlights", itemIndex: 0 })).toBe(
      "Experience · Cobalt Analytics · bullet 1",
    );
    expect(describeTarget(parseResumeFixture, { section: "basics", entryIndex: null, field: "summary", itemIndex: null })).toBe(
      "Summary · summary",
    );
  });
});
