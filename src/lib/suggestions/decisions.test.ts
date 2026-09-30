import { describe, expect, it } from "vitest";

import { clearDecision, readDecisions, recordDecision, suggestionDecisionsKey } from "@/lib/suggestions/decisions";

/**
 * Decisions live beside the resume, not inside it: rejecting a proposal must
 * leave the stored record untouched, so the fact that the user said no is kept
 * here instead.
 */

function memoryStore() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("suggestion decisions", () => {
  it("starts empty and remembers a decision per report", () => {
    const store = memoryStore();

    expect(readDecisions(store, "report-1")).toEqual({});

    const map = recordDecision(store, "report-1", "suggestion-a", "rejected", new Date("2026-04-04T10:00:00.000Z"));

    expect(map).toEqual({ "suggestion-a": { decision: "rejected", at: "2026-04-04T10:00:00.000Z" } });
    expect(readDecisions(store, "report-1")["suggestion-a"].decision).toBe("rejected");
    // Another report's decisions are its own.
    expect(readDecisions(store, "report-2")).toEqual({});
  });

  it("records an acceptance and can forget a decision, which is how a rejection is undone", () => {
    const store = memoryStore();

    recordDecision(store, "report-1", "a", "rejected");
    recordDecision(store, "report-1", "b", "accepted");
    expect(Object.keys(readDecisions(store, "report-1")).sort()).toEqual(["a", "b"]);

    const afterClear = clearDecision(store, "report-1", "a");

    expect(afterClear).toEqual({ b: expect.objectContaining({ decision: "accepted" }) });
    expect(readDecisions(store, "report-1").a).toBeUndefined();
    // Forgetting the last decision leaves the report with none, not with a stub.
    expect(clearDecision(store, "report-1", "b")).toEqual({});
  });

  it("reads an unreadable or hostile store as no decisions rather than as an accepted change", () => {
    const broken = memoryStore();
    broken.setItem(suggestionDecisionsKey, "{not json");

    const wrongShapes = memoryStore();
    wrongShapes.setItem(
      suggestionDecisionsKey,
      JSON.stringify({ "report-1": { a: { decision: "maybe", at: 3 }, b: "rejected", c: { decision: "rejected", at: "now" } } }),
    );

    expect(readDecisions(broken, "report-1")).toEqual({});
    expect(readDecisions(wrongShapes, "report-1")).toEqual({ c: { decision: "rejected", at: "now" } });
    expect(readDecisions(null, "report-1")).toEqual({});
    expect(recordDecision(null, "report-1", "a", "accepted")).toEqual({});
  });

  it("does not lose an earlier decision when another one is recorded", () => {
    const store = memoryStore();

    recordDecision(store, "report-1", "a", "rejected");
    recordDecision(store, "report-1", "b", "rejected");
    recordDecision(store, "report-2", "c", "accepted");

    expect(Object.keys(readDecisions(store, "report-1")).sort()).toEqual(["a", "b"]);
    expect(readDecisions(store, "report-2")).toEqual({ c: expect.objectContaining({ decision: "accepted" }) });
  });
});
