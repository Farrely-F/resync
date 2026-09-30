import { describe, expect, it } from "vitest";

import { forgetTours, hasSeenTour, markTourSeen, tourStorageKey, type TourStore } from "./progress";

/** The smallest store that behaves like localStorage, so a test owns the bytes. */
function memoryStore(initial: Record<string, string> = {}): TourStore & { values: Record<string, string> } {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
}

describe("tour progress", () => {
  it("treats a tour as unseen until it is recorded", () => {
    const store = memoryStore();

    expect(hasSeenTour("library", store)).toBe(false);
    markTourSeen("library", "2026-01-01T00:00:00.000Z", store);
    expect(hasSeenTour("library", store)).toBe(true);
    // Another tour is unaffected: seeing one says nothing about the others.
    expect(hasSeenTour("match", store)).toBe(false);
  });

  it("keeps the record per tour, not per page visit", () => {
    const store = memoryStore();

    markTourSeen("library", "2026-01-01T00:00:00.000Z", store);
    markTourSeen("match", "2026-01-02T00:00:00.000Z", store);

    expect(JSON.parse(store.values[tourStorageKey])).toEqual({
      version: 1,
      seen: { library: "2026-01-01T00:00:00.000Z", match: "2026-01-02T00:00:00.000Z" },
    });
  });

  it("forgets everything, so the tours can be offered again", () => {
    const store = memoryStore();
    markTourSeen("library", "2026-01-01T00:00:00.000Z", store);

    forgetTours(store);

    expect(hasSeenTour("library", store)).toBe(false);
  });

  it("treats an unreadable record as nothing seen", () => {
    // Showing a tour twice is a small cost; never showing it because a stale
    // value said so is the failure worth avoiding.
    for (const raw of ["not json", "[]", "null", '{"version":99,"seen":{"library":"x"}}', '{"seen":"library"}']) {
      const store = memoryStore({ [tourStorageKey]: raw });
      expect(hasSeenTour("library", store)).toBe(false);
    }
  });

  it("ignores an entry that is not a timestamp", () => {
    const store = memoryStore({ [tourStorageKey]: JSON.stringify({ version: 1, seen: { library: 42 } }) });

    expect(hasSeenTour("library", store)).toBe(false);
  });

  it("does nothing without a store, rather than throwing", () => {
    expect(hasSeenTour("library", null)).toBe(false);
    expect(() => markTourSeen("library", "2026-01-01T00:00:00.000Z", null)).not.toThrow();
    expect(() => forgetTours(null)).not.toThrow();
  });
});
