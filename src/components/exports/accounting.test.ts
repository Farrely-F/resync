import { describe, expect, it } from "vitest";

import { accountStorage, jsonBytes } from "@/components/exports/accounting";
import { formatBytes } from "@/lib/compile/assets";
import { emptyJd } from "@/lib/jd/schema";
import type { MatchReport } from "@/lib/match/types";
import { emptyResume } from "@/lib/resume/schema";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

function resumeRecord(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    title: "Jane Doe",
    resume: emptyResume(),
    plainText: "Jane Doe",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function jdRecord(overrides: Partial<JdRecord> = {}): JdRecord {
  return {
    id: "jd-1",
    title: "Senior Engineer",
    company: "Acme",
    sourceUrl: null,
    rawText: "We are hiring.",
    structured: emptyJd(),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function reportRecord(overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    id: "report-1",
    resumeId: "resume-1",
    jdId: "jd-1",
    rubricVersion: "1.0.0",
    score: 50,
    criteria: [],
    atsChecks: [],
    summary: null,
    inputHash: "hash-1",
    model: "recorded",
    aiMode: "mock",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("jsonBytes", () => {
  it("counts UTF-8 bytes, so an accented letter is worth more than one", () => {
    expect(jsonBytes({ name: "José" }) - jsonBytes({ name: "Jose" })).toBe(1);
  });

  it("counts nothing for a value JSON cannot represent", () => {
    expect(jsonBytes(undefined)).toBe(0);
  });
});

describe("accountStorage", () => {
  it("reports every store as empty when nothing is stored", () => {
    const breakdown = accountStorage({ resumes: [], jds: [], reports: [] });

    expect(breakdown).toEqual({
      resumes: { count: 0, bytes: 0 },
      jds: { count: 0, bytes: 0 },
      reports: { count: 0, bytes: 0 },
      totalBytes: 0,
      totalRecords: 0,
    });
    expect(formatBytes(breakdown.totalBytes)).toBe("0 B");
  });

  it("attributes bytes to the store that holds the record, never to another", () => {
    const resume = resumeRecord();
    const jd = jdRecord();
    const report = reportRecord();
    const breakdown = accountStorage({ resumes: [resume], jds: [jd], reports: [report] });

    expect(breakdown.resumes).toEqual({ count: 1, bytes: jsonBytes(resume) });
    expect(breakdown.jds).toEqual({ count: 1, bytes: jsonBytes(jd) });
    expect(breakdown.reports).toEqual({ count: 1, bytes: jsonBytes(report) });
    expect(breakdown.totalBytes).toBe(jsonBytes(resume) + jsonBytes(jd) + jsonBytes(report));
    expect(breakdown.totalRecords).toBe(3);
  });

  it("grows by exactly the bytes a record gains, so the figure is a measurement", () => {
    const short = jdRecord({ rawText: "one" });
    const longer = jdRecord({ rawText: `one${"x".repeat(500)}` });

    const before = accountStorage({ resumes: [], jds: [short], reports: [] });
    const after = accountStorage({ resumes: [], jds: [longer], reports: [] });

    expect(after.jds.bytes - before.jds.bytes).toBe(500);
    expect(after.totalRecords).toBe(before.totalRecords);
  });

  it("counts each record of a multi-record store", () => {
    const breakdown = accountStorage({
      resumes: [resumeRecord({ id: "a" }), resumeRecord({ id: "b", plainText: "second" })],
      jds: [],
      reports: [reportRecord({ id: "r1" }), reportRecord({ id: "r2" }), reportRecord({ id: "r3" })],
    });

    expect(breakdown.resumes.count).toBe(2);
    expect(breakdown.reports.count).toBe(3);
    expect(breakdown.totalRecords).toBe(5);
    expect(breakdown.jds.bytes).toBe(0);
  });
});
