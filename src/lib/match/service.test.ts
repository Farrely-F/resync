import { describe, expect, it, vi } from "vitest";

import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { computeInputHash } from "@/lib/match/hash";
import { scoreCriteria } from "@/lib/match/rubric";
import { analyzeMatch, UnanalysableMatchError, type AnalyzeMatchDeps, type AnalyzeMatchInput } from "@/lib/match/service";
import type { MatchCriterion, MatchReport } from "@/lib/match/types";
import { parseResumeFixture } from "@/lib/resume/fixtures";

function fakeStorage() {
  const reports: MatchReport[] = [];

  return {
    reports,
    findReportByInputHash: async (inputHash: string) => reports.find((report) => report.inputHash === inputHash) ?? null,
    putReport: async (report: MatchReport) => {
      reports.push(report);
    },
  };
}

const criteria: MatchCriterion[] = [
  { id: "c1", kind: "required", requirement: "Go", verdict: "met", evidence: "Languages: Go" },
  { id: "c2", kind: "required", requirement: "Vehicle integration", verdict: "missing", evidence: null },
  { id: "c3", kind: "nice-to-have", requirement: "Infotainment", verdict: "missing", evidence: null },
  { id: "c4", kind: "education", requirement: "Computer science degree", verdict: "met", evidence: "MEng Computer Science" },
];

function input(overrides: Partial<AnalyzeMatchInput> = {}): AnalyzeMatchInput {
  return {
    resumeId: "resume-1",
    jdId: "jd-1",
    resume: parseResumeFixture,
    jd: extractJdFixture,
    themeId: "classic",
    model: "openrouter/free",
    aiMode: "mock",
    ...overrides,
  };
}

function deps(overrides: Partial<AnalyzeMatchDeps> = {}) {
  const storage = fakeStorage();
  const evidence = vi.fn(async () => ({ criteria, summary: "Commentary." }));

  return { storage, evidence, deps: { storage, evidence, ...overrides } satisfies AnalyzeMatchDeps };
}

describe("analyzeMatch", () => {
  it("builds a report whose score is the rubric's, not the model's", async () => {
    const { storage, deps: analyzeDeps } = deps();

    const outcome = await analyzeMatch(input(), analyzeDeps);
    const rubric = scoreCriteria(criteria);

    expect(outcome.cached).toBe(false);
    expect(outcome.report.score).toBe(rubric.score);
    // 12 (Go, met) + 0 (vehicle, missing) + 4 (degree, met) over 12 + 12 + 4.
    expect(outcome.report.score).toBe(57.1);
    expect(outcome.report.rubricVersion).toBe(rubric.rubricVersion);
    expect(outcome.report.criteria).toEqual(criteria);
    expect(outcome.report.summary).toBe("Commentary.");
    expect(outcome.report.model).toBe("openrouter/free");
    expect(outcome.report.aiMode).toBe("mock");
    expect(outcome.report.resumeId).toBe("resume-1");
    expect(outcome.report.jdId).toBe("jd-1");
    expect(outcome.report.inputHash).toBe(await computeInputHash(input()));
    expect(outcome.report.atsChecks.map((check) => check.id)).toContain("contact-details");
    expect(storage.reports).toEqual([outcome.report]);
  });

  it("serves an identical re-run from the stored report with no second model request", async () => {
    const { storage, evidence, deps: analyzeDeps } = deps();

    const first = await analyzeMatch(input(), analyzeDeps);
    const second = await analyzeMatch(input(), analyzeDeps);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.report).toEqual(first.report);
    expect(second.report.id).toBe(first.report.id);
    expect(evidence).toHaveBeenCalledTimes(1);
    expect(storage.reports).toHaveLength(1);
  });

  it("treats a different resume, posting, theme, model or AI mode as a different analysis", async () => {
    const { evidence, deps: analyzeDeps } = deps();
    const changedResume = { ...parseResumeFixture, basics: { ...parseResumeFixture.basics, summary: "Other." } };

    await analyzeMatch(input(), analyzeDeps);
    await analyzeMatch(input({ resumeId: "resume-2", resume: changedResume }), analyzeDeps);
    await analyzeMatch(input({ jdId: "jd-2", jd: { ...extractJdFixture, title: "Other role" } }), analyzeDeps);
    await analyzeMatch(input({ themeId: "compact" }), analyzeDeps);
    await analyzeMatch(input({ model: "another/model" }), analyzeDeps);
    await analyzeMatch(input({ aiMode: "live" }), analyzeDeps);

    expect(evidence).toHaveBeenCalledTimes(6);
  });

  it("keys the cache on the analysed content, not on the ids of the records holding it", async () => {
    const { evidence, deps: analyzeDeps } = deps();

    const first = await analyzeMatch(input({ resumeId: "a", jdId: "b" }), analyzeDeps);
    const second = await analyzeMatch(input({ resumeId: "c", jdId: "d" }), analyzeDeps);

    expect(second.cached).toBe(true);
    expect(second.report.id).toBe(first.report.id);
    // The reused report still names the records it was originally built from.
    expect(second.report.resumeId).toBe("a");
    expect(evidence).toHaveBeenCalledTimes(1);
  });

  it("refuses to invent a score when the model returned no criteria", async () => {
    const storage = fakeStorage();
    const evidence = vi.fn(async () => ({ criteria: [], summary: null }));

    await expect(analyzeMatch(input(), { storage, evidence })).rejects.toBeInstanceOf(UnanalysableMatchError);
    expect(storage.reports).toEqual([]);
  });

  it("records the id and timestamp it was given, not the wall clock", async () => {
    const { deps: analyzeDeps } = deps({
      newId: () => "report-fixed",
      now: () => new Date("2026-03-01T10:00:00.000Z"),
    });

    const outcome = await analyzeMatch(input(), analyzeDeps);

    expect(outcome.report.id).toBe("report-fixed");
    expect(outcome.report.createdAt).toBe("2026-03-01T10:00:00.000Z");
  });

  it("does not call the model when a stored report already covers the input", async () => {
    const { storage, evidence, deps: analyzeDeps } = deps();

    await analyzeMatch(input(), analyzeDeps);
    evidence.mockClear();
    await analyzeMatch(input(), analyzeDeps);

    expect(evidence).not.toHaveBeenCalled();
    expect(storage.reports).toHaveLength(1);
  });
});
