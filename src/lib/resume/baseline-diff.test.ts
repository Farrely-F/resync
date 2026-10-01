import { describe, expect, it } from "vitest";

import { changesAgainstBaseline } from "@/lib/resume/baseline-diff";
import { parseResumeFixture } from "@/lib/resume/fixtures";

describe("changesAgainstBaseline", () => {
  it("reports nothing for an identical copy", () => {
    expect(changesAgainstBaseline(parseResumeFixture, structuredClone(parseResumeFixture))).toEqual([]);
  });

  it("reports a rewritten summary with the baseline text as before", () => {
    const copy = structuredClone(parseResumeFixture);
    copy.basics.summary = "Rewritten for the job.";

    const changes = changesAgainstBaseline(parseResumeFixture, copy);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ targetId: "basics.summary", after: "Rewritten for the job.", before: parseResumeFixture.basics.summary });
  });

  it("does not count a reordered bullet as a change", () => {
    const copy = structuredClone(parseResumeFixture);
    const highlights = copy.work[0]?.highlights;
    if (highlights === undefined || highlights.length < 2) {
      return;
    }
    copy.work[0]!.highlights = [...highlights].reverse();

    expect(changesAgainstBaseline(parseResumeFixture, copy)).toEqual([]);
  });

  it("reports a bullet added past the end of the baseline's list as new text", () => {
    const copy = structuredClone(parseResumeFixture);
    copy.work[0]!.highlights.push("Traded on-chain.");

    const changes = changesAgainstBaseline(parseResumeFixture, copy);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ before: "", after: "Traded on-chain." });
  });
});
