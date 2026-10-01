import { describe, expect, it } from "vitest";

import {
  guideStepIds,
  guideStorageKey,
  markStepDone,
  readMarks,
  stepStates,
  unmarkStep,
  type GuideStore,
} from "@/lib/guide/progress";

/** The smallest store that behaves like localStorage, so a test owns the bytes. */
function memoryStore(initial: Record<string, string> = {}): GuideStore & { values: Record<string, string> } {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

const nothingStored = { resumes: 0, postings: 0 };

describe("guide progress", () => {
  it("starts with nothing done", () => {
    const states = stepStates(nothingStored, readMarks(memoryStore()));

    expect(states).toHaveLength(guideStepIds.length);
    expect(states.every((state) => !state.done)).toBe(true);
    expect(states.every((state) => state.source === null)).toBe(true);
  });

  it("persists a step the reader marks done, and survives a fresh read", () => {
    const store = memoryStore();

    const marks = markStepDone("match", "2026-09-30T10:00:00.000Z", store);

    expect(marks).toEqual(["match"]);
    expect(readMarks(store)).toEqual(["match"]);
    expect(JSON.parse(store.values[guideStorageKey])).toEqual({
      version: 1,
      done: { match: "2026-09-30T10:00:00.000Z" },
    });

    const states = stepStates(nothingStored, readMarks(store));
    expect(states.find((state) => state.id === "match")).toEqual({ id: "match", done: true, source: "marked" });
    // A mark on one step says nothing about the others.
    expect(states.filter((state) => state.done).map((state) => state.id)).toEqual(["match"]);
  });

  it("takes a mark back without touching the rest", () => {
    const store = memoryStore();
    markStepDone("intro", "2026-09-30T10:00:00.000Z", store);
    markStepDone("prepare", "2026-09-30T10:01:00.000Z", store);

    expect(unmarkStep("intro", store)).toEqual(["prepare"]);
    expect(readMarks(store)).toEqual(["prepare"]);
  });

  it("treats an unreadable or outdated record as nothing done", () => {
    const unreadable = [
      "{",
      "null",
      '"match"',
      "[]",
      JSON.stringify({ version: 0, done: { match: "x" } }),
      JSON.stringify({ version: 1 }),
      JSON.stringify({ version: 1, done: null }),
      JSON.stringify({ version: 2, done: { match: "x" } }),
    ];

    for (const raw of unreadable) {
      const store = memoryStore({ [guideStorageKey]: raw });
      expect(readMarks(store)).toEqual([]);
      expect(stepStates(nothingStored, readMarks(store)).every((state) => !state.done)).toBe(true);
    }
  });

  it("keeps only marks whose step this build still has", () => {
    const store = memoryStore({
      [guideStorageKey]: JSON.stringify({ version: 1, done: { match: "x", "retired-step": "y", report: 7 } }),
    });

    expect(readMarks(store)).toEqual(["match"]);
  });

  it("reads a stored record as the fact a step asks about", () => {
    const states = stepStates({ resumes: 1, postings: 0 }, []);

    expect(states.find((state) => state.id === "resume")).toEqual({ id: "resume", done: true, source: "stored" });
    expect(states.find((state) => state.id === "posting")).toEqual({ id: "posting", done: false, source: null });
    expect(states.filter((state) => state.done).map((state) => state.id)).toEqual(["resume"]);
  });

  it("keeps a step done by what is stored even if the mark is gone", () => {
    const store = memoryStore();
    markStepDone("posting", "2026-09-30T10:00:00.000Z", store);
    unmarkStep("posting", store);

    const state = stepStates({ resumes: 0, postings: 2 }, readMarks(store)).find((step) => step.id === "posting");

    expect(state).toEqual({ id: "posting", done: true, source: "stored" });
  });

  it("returns the marks in flow order, whatever order they were made in", () => {
    const store = memoryStore();
    markStepDone("prepare", "2026-09-30T10:02:00.000Z", store);
    markStepDone("intro", "2026-09-30T10:00:00.000Z", store);
    markStepDone("match", "2026-09-30T10:01:00.000Z", store);

    expect(readMarks(store)).toEqual(["intro", "match", "prepare"]);
  });

  it("does nothing without a store, rather than throwing", () => {
    expect(readMarks(null)).toEqual([]);
    expect(markStepDone("match", "2026-09-30T10:00:00.000Z", null)).toEqual([]);
    expect(() => unmarkStep("match", null)).not.toThrow();
  });
});
