import { describe, expect, it } from "vitest";

import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { computeInputHash } from "@/lib/match/hash";
import type { MatchReport } from "@/lib/match/types";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";
import { reportFreshness } from "@/lib/suggestions/freshness";

/**
 * The report page has to be able to say that its numbers are about an earlier
 * version of the resume — accepting a suggestion is exactly the moment that
 * becomes true, and the stored report does not change to say so.
 */

async function report(overrides: Partial<MatchReport> = {}): Promise<MatchReport> {
  const base: MatchReport = {
    id: "report-1",
    resumeId: "resume-1",
    jdId: "jd-1",
    rubricVersion: "1.0.0",
    score: 62,
    criteria: [],
    atsChecks: [],
    summary: null,
    inputHash: await computeInputHash({
      resume: parseResumeFixture,
      jd: extractJdFixture,
      themeId: "classic",
      model: "openrouter/free",
      aiMode: "mock",
    }),
    model: "openrouter/free",
    aiMode: "mock",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  return { ...base, ...overrides };
}

function resumeRecord(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    title: "Priya Raman",
    resume: parseResumeFixture,
    plainText: "",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const jdRecord: JdRecord = {
  id: "jd-1",
  title: "Senior Software Engineer - Go (Golang)",
  company: "General Motors",
  sourceUrl: null,
  rawText: "",
  structured: extractJdFixture,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("reportFreshness", () => {
  it("is current while the stored resume is the one the report was built from", async () => {
    expect(await reportFreshness({ report: await report(), resume: resumeRecord(), jd: jdRecord })).toBe("current");
  });

  it("is changed once the resume no longer produces the report's input hash", async () => {
    const accepted = resumeRecord({
      resume: { ...parseResumeFixture, basics: { ...parseResumeFixture.basics, summary: "A rewritten summary." } },
    });

    expect(await reportFreshness({ report: await report(), resume: accepted, jd: jdRecord })).toBe("changed");
  });

  it("treats a changed theme, model or mode as changed too, because all of them are inputs", async () => {
    const otherTheme = resumeRecord({ themeId: "compact" });

    expect(await reportFreshness({ report: await report(), resume: otherTheme, jd: jdRecord })).toBe("changed");
    expect(await reportFreshness({ report: await report({ model: "another/model" }), resume: resumeRecord(), jd: jdRecord })).toBe(
      "changed",
    );
  });

  it("is inputs-missing when either document is gone, rather than calling it current", async () => {
    expect(await reportFreshness({ report: await report(), resume: null, jd: jdRecord })).toBe("inputs-missing");
    expect(await reportFreshness({ report: await report(), resume: resumeRecord(), jd: null })).toBe("inputs-missing");
  });
});
