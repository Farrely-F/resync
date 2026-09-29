import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { emptyJd } from "@/lib/jd/schema";
import type { MatchReport } from "@/lib/match/types";
import { emptyResume, resumeSchema } from "@/lib/resume/schema";
import { createStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

let storage = createStorage({ name: "resync-test" });
let counter = 0;

function resumeRecord(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  counter += 1;
  const timestamp = new Date(2026, 0, counter).toISOString();
  return {
    id: `resume-${counter}`,
    title: `Resume ${counter}`,
    resume: emptyResume(),
    plainText: "",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function jdRecord(overrides: Partial<JdRecord> = {}): JdRecord {
  counter += 1;
  const timestamp = new Date(2026, 0, counter).toISOString();
  return {
    id: `jd-${counter}`,
    title: `Job ${counter}`,
    company: null,
    sourceUrl: null,
    rawText: "",
    structured: emptyJd(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function reportRecord(overrides: Partial<MatchReport> = {}): MatchReport {
  counter += 1;
  return {
    id: `report-${counter}`,
    resumeId: "resume-1",
    jdId: "jd-1",
    rubricVersion: "1.0.0",
    score: 62,
    criteria: [],
    atsChecks: [],
    summary: null,
    inputHash: `hash-${counter}`,
    model: "openrouter/free",
    aiMode: "mock",
    createdAt: new Date(2026, 0, counter).toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  counter += 1;
  storage = createStorage({ name: `resync-test-${counter}-${Date.now()}` });
});

describe("storage", () => {
  it("returns null for a record that was never stored", async () => {
    expect(await storage.getResume("missing")).toBeNull();
    expect(await storage.getJd("missing")).toBeNull();
  });

  it("round-trips a resume without losing nested structure", async () => {
    const record = resumeRecord({
      plainText: "Ada Lovelace — Analytical Engines",
      resume: resumeSchema.parse({
        basics: { name: "Ada Lovelace", email: "ada@example.com" },
        work: [{ name: "Analytical Engines Ltd", position: "Mathematician", highlights: ["Wrote the first algorithm"] }],
      }),
    });

    await storage.putResume(record);
    const loaded = await storage.getResume(record.id);

    expect(loaded?.resume.work[0].highlights).toEqual(["Wrote the first algorithm"]);
    expect(loaded?.resume.basics.email).toBe("ada@example.com");
    expect(loaded?.plainText).toBe("Ada Lovelace — Analytical Engines");
  });

  it("lists resumes newest first", async () => {
    const older = resumeRecord({ updatedAt: new Date(2026, 0, 1).toISOString() });
    const newer = resumeRecord({ updatedAt: new Date(2026, 5, 1).toISOString() });

    await storage.putResume(older);
    await storage.putResume(newer);

    expect((await storage.listResumes()).map((record) => record.id)).toEqual([newer.id, older.id]);
  });

  it("repairs a stored resume whose section configuration is missing or foreign", async () => {
    const record = resumeRecord();
    await storage.putResume({
      ...record,
      resume: { ...emptyResume(), sections: [] },
    });

    const loaded = await storage.getResume(record.id);

    expect(loaded?.resume.sections.map((section) => section.id)).toEqual([
      "work",
      "education",
      "skills",
      "projects",
      "certificates",
      "languages",
    ]);
  });

  it("deletes only the record it was asked to delete", async () => {
    const keep = resumeRecord();
    const drop = resumeRecord();
    await storage.putResume(keep);
    await storage.putResume(drop);

    await storage.deleteResume(drop.id);

    expect(await storage.getResume(drop.id)).toBeNull();
    expect((await storage.listResumes()).map((record) => record.id)).toEqual([keep.id]);
  });

  it("keeps resumes and job descriptions in separate stores", async () => {
    const resume = resumeRecord({ id: "shared-id" });
    const jd = jdRecord({ id: "shared-id" });

    await storage.putResume(resume);
    await storage.putJd(jd);
    await storage.deleteResume("shared-id");

    expect(await storage.getResume("shared-id")).toBeNull();
    expect(await storage.getJd("shared-id")).not.toBeNull();
  });

  it("reports unsupported size accounting rather than pretending storage is empty", async () => {
    expect(await storage.estimate()).toEqual({ supported: false, usageBytes: 0, quotaBytes: null });
  });

  it("clears user data and stays usable afterwards", async () => {
    const record = resumeRecord();
    await storage.putResume(record);

    await storage.clearUserData();

    expect(await storage.listResumes()).toEqual([]);
    await storage.putResume(record);
    expect((await storage.listResumes()).map((r) => r.id)).toEqual([record.id]);
  });

  it("round-trips a match report and finds it by input identity", async () => {
    const report = reportRecord({ inputHash: "abc123" });
    await storage.putReport(report);

    expect(await storage.getReport(report.id)).toEqual(report);
    expect((await storage.findReportByInputHash("abc123"))?.id).toBe(report.id);
    expect(await storage.findReportByInputHash("different")).toBeNull();
  });

  it("returns the newest report when several share an input identity", async () => {
    const older = reportRecord({ inputHash: "same", createdAt: new Date(2026, 0, 1).toISOString() });
    const newer = reportRecord({ inputHash: "same", createdAt: new Date(2026, 5, 1).toISOString() });
    await storage.putReport(older);
    await storage.putReport(newer);

    expect((await storage.findReportByInputHash("same"))?.id).toBe(newer.id);
  });

  it("preserves data written by the previous schema version when upgrading", async () => {
    const name = `resync-upgrade-${Date.now()}`;
    const record = resumeRecord();

    // Open as version 1, which is what an existing user has on disk: no reports store.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("resumes", { keyPath: "id" });
        request.result.createObjectStore("jds", { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("resumes", "readwrite");
        tx.objectStore("resumes").put(record);
        tx.onerror = () => reject(tx.error);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });

    const upgraded = createStorage({ name });

    expect((await upgraded.getResume(record.id))?.title).toBe(record.title);
    expect(await upgraded.listReports()).toEqual([]);
    await upgraded.putReport(reportRecord());
    expect(await upgraded.listReports()).toHaveLength(1);
  });
});
