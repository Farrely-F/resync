import type { KeyValueStore } from "@/lib/ai/usage";

/**
 * The user's decisions about the proposals for one report.
 *
 * Accepting changes the resume, and the record itself is the evidence of that.
 * Rejecting must change nothing in the resume — so the decision is kept here
 * instead, beside the browser's other local state. That is also what makes a
 * rejected proposal stay rejected: suggestion ids are stable across
 * regenerations of the same report, so regenerating shows the same item as
 * rejected rather than presenting it again as something new.
 *
 * A store that is unavailable or holds nonsense is read as "no decisions yet";
 * an unreadable store must never look like an accepted change.
 */

export const suggestionDecisionsKey = "resync.suggestionDecisions.v1";

export type SuggestionDecision = "accepted" | "rejected";

export interface DecisionEntry {
  decision: SuggestionDecision;
  at: string;
}

export type DecisionMap = Record<string, DecisionEntry>;

function isDecisionEntry(value: unknown): value is DecisionEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { decision, at } = value as { decision?: unknown; at?: unknown };
  return (decision === "accepted" || decision === "rejected") && typeof at === "string";
}

function readAll(store: KeyValueStore): Record<string, DecisionMap> {
  let parsed: unknown;

  try {
    const raw = store.getItem(suggestionDecisionsKey);
    if (raw === null) {
      return {};
    }

    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  const all: Record<string, DecisionMap> = {};

  for (const [reportId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) {
      continue;
    }

    const map: DecisionMap = {};
    for (const [suggestionId, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isDecisionEntry(entry)) {
        map[suggestionId] = entry;
      }
    }

    all[reportId] = map;
  }

  return all;
}

function writeAll(store: KeyValueStore, all: Record<string, DecisionMap>): void {
  try {
    store.setItem(suggestionDecisionsKey, JSON.stringify(all));
  } catch {
    // A full or unavailable store must not break the decision the user just made;
    // the resume itself is only ever written by `applySuggestion`.
  }
}

export function readDecisions(store: KeyValueStore | null, reportId: string): DecisionMap {
  if (store === null) {
    return {};
  }

  return readAll(store)[reportId] ?? {};
}

/** Records a decision and returns the report's decisions as they now stand. */
export function recordDecision(
  store: KeyValueStore | null,
  reportId: string,
  suggestionId: string,
  decision: SuggestionDecision,
  now: Date = new Date(),
): DecisionMap {
  if (store === null) {
    return {};
  }

  const all = readAll(store);
  const map = all[reportId] ?? {};
  map[suggestionId] = { decision, at: now.toISOString() };
  all[reportId] = map;
  writeAll(store, all);

  return map;
}

/** Forgets a decision, which is how a rejected proposal is restored to the list. */
export function clearDecision(store: KeyValueStore | null, reportId: string, suggestionId: string): DecisionMap {
  if (store === null) {
    return {};
  }

  const all = readAll(store);
  const map = all[reportId] ?? {};
  delete map[suggestionId];
  all[reportId] = map;
  writeAll(store, all);

  return map;
}

/** The browser's `localStorage`, or null where it is unavailable (server render, private mode). */
export function browserDecisionStore(): KeyValueStore | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
