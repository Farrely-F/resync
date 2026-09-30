/**
 * The confirmation machine behind every destructive control in Settings.
 *
 * It is a reducer with an explicit effect, not a set of booleans, so the two
 * rules the ticket states can be checked by tests rather than by reading the JSX:
 * an effect is produced only by a `confirm` event, so cancelling or dismissing a
 * prompt can never perform anything; and clearing all user data needs a typed
 * phrase that nothing else requires.
 */

/** Typed verbatim to clear every stored record. Matched case- and spacing-insensitively. */
export const clearAllPhrase = "delete everything";

export type DeleteTarget =
  | { kind: "resume"; id: string }
  | { kind: "jd"; id: string }
  | { kind: "report"; id: string }
  | { kind: "clear-all" };

/** True for targets whose prompt asks for the typed phrase. */
export function requiresPhrase(target: DeleteTarget): boolean {
  return target.kind === "clear-all";
}

export interface ConfirmationState {
  /** The prompt currently open, if any. */
  target: DeleteTarget | null;
  /** What the user has typed into the phrase field. */
  typed: string;
  /** Set when Confirm was pressed while the phrase was not satisfied. */
  rejected: boolean;
}

export const idleConfirmation: ConfirmationState = { target: null, typed: "", rejected: false };

export type ConfirmationEvent =
  | { type: "request"; target: DeleteTarget }
  | { type: "type"; value: string }
  | { type: "cancel" }
  | { type: "confirm" };

export interface ConfirmationStep {
  state: ConfirmationState;
  /** The deletion to run, or null when this event performs nothing. */
  effect: DeleteTarget | null;
}

/** Whether the prompt is allowed to be confirmed as it stands. */
export function phraseSatisfied(state: ConfirmationState): boolean {
  if (state.target === null) {
    return false;
  }

  // Case and spacing are forgiven: the phrase is a deliberate act, not a typing test.
  return requiresPhrase(state.target)
    ? state.typed.trim().replace(/\s+/g, " ").toLowerCase() === clearAllPhrase
    : true;
}

export function step(state: ConfirmationState, event: ConfirmationEvent): ConfirmationStep {
  switch (event.type) {
    case "request":
      // Opening a prompt replaces whatever was open and forgets any typed text,
      // so a half-typed phrase can never carry over to a new target.
      return { state: { target: event.target, typed: "", rejected: false }, effect: null };

    case "type":
      return { state: { ...state, typed: event.value, rejected: false }, effect: null };

    case "cancel":
      return { state: idleConfirmation, effect: null };

    case "confirm": {
      if (state.target === null || !phraseSatisfied(state)) {
        return { state: { ...state, rejected: state.target !== null }, effect: null };
      }

      return { state: idleConfirmation, effect: state.target };
    }
  }
}

/** Whether the prompt currently on screen is for this target. */
export function isConfirming(state: ConfirmationState, target: DeleteTarget): boolean {
  const open = state.target;
  if (open === null || open.kind !== target.kind) {
    return false;
  }

  return "id" in open && "id" in target ? open.id === target.id : true;
}
