import { describe, expect, it } from "vitest";

import {
  clearDraft,
  draftKeyFor,
  preferNewerRecord,
  readDraft,
  writeDraft,
} from "@/components/editor/draft-journal";
import { emptyResume } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";

function memoryStorage() {
  const entries = new Map<string, string>();
  const state = { failWrites: false };

  return {
    entries,
    state,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem(key: string, value: string) {
      if (state.failWrites) {
        throw new Error("QuotaExceededError");
      }
      entries.set(key, value);
    },
    removeItem(key: string) {
      entries.delete(key);
    },
  };
}

function record(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    title: "Ada",
    resume: emptyResume(),
    plainText: "",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("draft journal", () => {
  it("round-trips a record, and keeps it until the reader clears it", () => {
    const storage = memoryStorage();
    const key = draftKeyFor("resume-1");
    const draft = record({ title: "Ada Lovelace" });

    writeDraft(key, draft, storage);
    expect(readDraft(key, storage)).toEqual(draft);
    // Read twice: two development effect runs must both see it, or the run that
    // React throws away would take the draft with it.
    expect(readDraft(key, storage)).toEqual(draft);

    clearDraft(key, storage);
    expect(readDraft(key, storage)).toBeNull();
    expect(storage.entries.size).toBe(0);
  });

  it("reads nothing when no draft was written", () => {
    expect(readDraft(draftKeyFor("resume-1"), memoryStorage())).toBeNull();
  });

  it("ignores a draft that is not readable JSON", () => {
    const storage = memoryStorage();
    const key = draftKeyFor("resume-1");
    storage.entries.set(key, "{not json");

    expect(readDraft(key, storage)).toBeNull();
  });

  it("does not throw when the browser refuses the write or the clear", () => {
    const storage = memoryStorage();
    storage.state.failWrites = true;

    expect(() => writeDraft(draftKeyFor("resume-1"), record(), storage)).not.toThrow();
    expect(() => clearDraft(draftKeyFor("resume-1"), storage)).not.toThrow();
  });
});

describe("preferNewerRecord", () => {
  it("opens the draft when the session was cut short before the write landed", () => {
    const stored = record({ title: "Old", updatedAt: "2026-01-01T00:00:00.000Z" });
    const draft = record({ title: "Newer", updatedAt: "2026-01-01T00:00:01.000Z" });

    expect(preferNewerRecord(stored, draft, "resume-1")?.title).toBe("Newer");
  });

  it("ignores a draft that storage has already caught up with", () => {
    const stored = record({ title: "Stored", updatedAt: "2026-01-01T00:00:01.000Z" });
    const draft = record({ title: "Stale", updatedAt: "2026-01-01T00:00:00.000Z" });

    expect(preferNewerRecord(stored, draft, "resume-1")?.title).toBe("Stored");
  });

  it("ignores a draft written for a different resume", () => {
    const stored = record();
    const draft = record({ id: "resume-2", updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(preferNewerRecord(stored, draft, "resume-1")).toBe(stored);
  });

  it("does not bring back a resume that storage no longer has", () => {
    const draft = record({ updatedAt: "2026-01-02T00:00:00.000Z" });

    expect(preferNewerRecord(null, draft, "resume-1")).toBeNull();
  });
});
