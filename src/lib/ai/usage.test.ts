import { describe, expect, it } from "vitest";

import {
  browserUsageStore,
  localDay,
  modelRequestUsageKey,
  readModelRequests,
  recordModelRequest,
  type KeyValueStore,
} from "@/lib/ai/usage";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("localDay", () => {
  it("uses local date components, zero-padded", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("keeps the local day across a late-evening boundary that UTC would shift", () => {
    // 23:30 local on 5 January is already the next day in UTC east of Greenwich,
    // and still the previous one west of it; the local calendar is what counts.
    expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("usage counter", () => {
  it("starts at zero when nothing has been recorded", () => {
    expect(readModelRequests(memoryStore(), new Date(2026, 2, 1))).toEqual({ day: "2026-03-01", count: 0 });
  });

  it("counts each recorded request", () => {
    const store = memoryStore();
    const now = new Date(2026, 2, 1, 9, 0);

    recordModelRequest(store, now);
    recordModelRequest(store, now);
    const usage = recordModelRequest(store, now);

    expect(usage).toEqual({ day: "2026-03-01", count: 3 });
    expect(readModelRequests(store, new Date(2026, 2, 1, 23, 59))).toEqual({ day: "2026-03-01", count: 3 });
  });

  it("rolls over at local midnight without a write", () => {
    const store = memoryStore();
    recordModelRequest(store, new Date(2026, 2, 1, 23, 59, 59));

    expect(readModelRequests(store, new Date(2026, 2, 2, 0, 0, 1))).toEqual({ day: "2026-03-02", count: 0 });
  });

  it("does not carry an old day's count into the first request of the new day", () => {
    const store = memoryStore();
    recordModelRequest(store, new Date(2026, 2, 1, 23, 59, 59));

    expect(recordModelRequest(store, new Date(2026, 2, 2, 0, 0, 1))).toEqual({ day: "2026-03-02", count: 1 });
    expect(readModelRequests(store, new Date(2026, 2, 2, 12, 0))).toEqual({ day: "2026-03-02", count: 1 });
  });

  it("falls back to zero for a corrupt or unknown-shaped record instead of throwing", () => {
    for (const raw of ["not json", "null", "[]", '{"day":5,"count":2}', '{"day":"2026-03-01","count":-4}']) {
      const store = memoryStore({ [modelRequestUsageKey]: raw });
      expect(readModelRequests(store, new Date(2026, 2, 1))).toEqual({ day: "2026-03-01", count: 0 });
    }
  });

  it("keeps counting when the store rejects the write", () => {
    const store: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    expect(recordModelRequest(store, new Date(2026, 2, 1))).toEqual({ day: "2026-03-01", count: 1 });
  });

  it("returns null for the browser store outside the browser", () => {
    expect(browserUsageStore()).toBeNull();
  });
});
