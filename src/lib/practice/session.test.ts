import { describe, expect, it } from "vitest";

import { gradeFixture } from "@/lib/practice/grade";
import { newSession, readSession, summarise, writeSession, type Turn } from "@/lib/practice/session";

function memoryStore() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

const turn = (overrides: Partial<Turn> = {}): Turn => ({
  id: "t1", questionIndex: 0, followUp: false, asked: "Q?", answer: "An answer.", grade: gradeFixture, rubricVersion: 1, at: "2026-10-01T00:00:00.000Z", ...overrides,
});

describe("practice sessions", () => {
  it("round-trips per report and treats nonsense as no session", () => {
    const store = memoryStore();
    const session = { ...newSession(new Date("2026-10-01T00:00:00Z")), turns: [turn()] };

    writeSession(store, "r1", session);
    expect(readSession(store, "r1")).toEqual(session);
    expect(readSession(store, "r2")).toBeNull();

    store.setItem("resync.practiceSessions.v1", "not json");
    expect(readSession(store, "r1")).toBeNull();
    expect(readSession(null, "r1")).toBeNull();
  });

  it("summarises from the judgements, not from stored numbers", () => {
    const summary = summarise({ ...newSession(), turns: [turn(), turn({ id: "t2" })] });
    expect(summary.answered).toBe(2);
    expect(summary.averageScore).toBe(44); // 1.5 + 0 + 2 + 0.5 = 4 of 9 available
    expect(summary.weakest).toBe("evidence");
  });
});
