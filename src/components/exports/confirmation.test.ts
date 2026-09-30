import { describe, expect, it } from "vitest";

import {
  clearAllPhrase,
  idleConfirmation,
  isConfirming,
  phraseSatisfied,
  requiresPhrase,
  step,
  type ConfirmationState,
  type DeleteTarget,
} from "@/components/exports/confirmation";

const resume: DeleteTarget = { kind: "resume", id: "resume-1" };
const otherResume: DeleteTarget = { kind: "resume", id: "resume-2" };
const report: DeleteTarget = { kind: "report", id: "report-1" };
const clearAll: DeleteTarget = { kind: "clear-all" };

/** Runs events from a starting state and returns what each one performed. */
function run(start: ConfirmationState, events: Parameters<typeof step>[1][]) {
  let state = start;
  const effects: (DeleteTarget | null)[] = [];

  for (const event of events) {
    const next = step(state, event);
    state = next.state;
    effects.push(next.effect);
  }

  return { state, effects };
}

describe("confirmation", () => {
  it("performs nothing when nothing was requested", () => {
    const { state, effects } = run(idleConfirmation, [{ type: "confirm" }, { type: "cancel" }]);

    expect(effects).toEqual([null, null]);
    expect(state).toEqual(idleConfirmation);
    expect(phraseSatisfied(idleConfirmation)).toBe(false);
  });

  it("performs the deletion only on confirm, and closes the prompt afterwards", () => {
    const { state, effects } = run(idleConfirmation, [{ type: "request", target: resume }, { type: "confirm" }]);

    expect(effects).toEqual([null, resume]);
    expect(state).toEqual(idleConfirmation);
  });

  it("performs nothing when the prompt is dismissed", () => {
    const { state, effects } = run(idleConfirmation, [
      { type: "request", target: resume },
      { type: "cancel" },
      { type: "confirm" },
    ]);

    expect(effects).toEqual([null, null, null]);
    expect(state).toEqual(idleConfirmation);
  });

  it("does not need a phrase for a single record, but does for everything", () => {
    expect(requiresPhrase(resume)).toBe(false);
    expect(requiresPhrase(clearAll)).toBe(true);

    const single = run(idleConfirmation, [{ type: "request", target: resume }]);
    expect(phraseSatisfied(single.state)).toBe(true);
  });

  it("refuses to clear everything until the phrase is typed, and says it was refused", () => {
    const { state, effects } = run(idleConfirmation, [{ type: "request", target: clearAll }, { type: "confirm" }]);

    expect(effects).toEqual([null, null]);
    expect(state.target).toEqual(clearAll);
    expect(state.rejected).toBe(true);
    expect(phraseSatisfied(state)).toBe(false);
  });

  it("rejects a near-miss phrase", () => {
    for (const typed of ["delete", "everything", "delete every thing", "delete-all"]) {
      const { state, effects } = run(idleConfirmation, [
        { type: "request", target: clearAll },
        { type: "type", value: typed },
        { type: "confirm" },
      ]);

      expect(effects[2], `"${typed}" must not authorise the deletion`).toBeNull();
      expect(state.target).toEqual(clearAll);
    }
  });

  it("accepts the phrase typed with different case and spacing", () => {
    const { state, effects } = run(idleConfirmation, [
      { type: "request", target: clearAll },
      { type: "type", value: `  ${clearAllPhrase.toUpperCase()}  ` },
      { type: "confirm" },
    ]);

    expect(effects[2]).toEqual(clearAll);
    expect(state).toEqual(idleConfirmation);
  });

  it("clears a refusal as soon as the user types again", () => {
    const refused = run(idleConfirmation, [{ type: "request", target: clearAll }, { type: "confirm" }]).state;
    const typing = step(refused, { type: "type", value: "del" });

    expect(typing.state.rejected).toBe(false);
    expect(typing.state.typed).toBe("del");
    expect(typing.effect).toBeNull();
  });

  it("forgets typed text when a different target is requested", () => {
    const typed = run(idleConfirmation, [{ type: "request", target: clearAll }, { type: "type", value: clearAllPhrase }])
      .state;
    const switched = step(typed, { type: "request", target: report });

    expect(switched.state).toEqual({ target: report, typed: "", rejected: false });
    expect(switched.effect).toBeNull();
  });

  it("keeps a prompt bound to the record it names", () => {
    const state = run(idleConfirmation, [{ type: "request", target: resume }]).state;

    expect(isConfirming(state, resume)).toBe(true);
    expect(isConfirming(state, otherResume)).toBe(false);
    expect(isConfirming(state, { kind: "report", id: "resume-1" })).toBe(false);
    expect(isConfirming(idleConfirmation, resume)).toBe(false);
  });

  it("does not mutate the state it was given", () => {
    const state: ConfirmationState = { target: null, typed: "", rejected: false };
    step(state, { type: "request", target: clearAll });
    step(state, { type: "confirm" });

    expect(state).toEqual(idleConfirmation);
  });
});
