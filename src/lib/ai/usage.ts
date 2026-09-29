/**
 * Local model-request counter.
 *
 * The provider exposes no per-browser request history, so this counts what this
 * browser actually started: one increment per model-backed request the page
 * makes. It is a local tally kept in this browser, never a provider-reported
 * figure, and the UI must say so — the remaining quota the provider would quote
 * is not knowable from here.
 *
 * The day boundary is the browser's local midnight, because "today" means the
 * user's own calendar day, not UTC. A count written on an earlier day is read
 * back as zero and never rolled into today's total.
 */

export const modelRequestUsageKey = "resync.modelRequests.v1";

/** The slice of `Storage` this counter needs, so tests can pass a map. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ModelRequestUsage {
  /** Local calendar day the count belongs to, `YYYY-MM-DD`. */
  day: string;
  /** Model-backed requests this browser started on that day. */
  count: number;
}

/** `YYYY-MM-DD` in the browser's local time zone. */
export function localDay(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseUsage(raw: string | null, day: string): ModelRequestUsage {
  if (raw === null) {
    return { day, count: 0 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { day, count: 0 };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { day, count: 0 };
  }

  const { day: storedDay, count } = parsed as { day?: unknown; count?: unknown };
  if (typeof storedDay !== "string" || typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return { day, count: 0 };
  }

  // A different day is a rollover: yesterday's total has no bearing on today's.
  return storedDay === day ? { day, count: Math.floor(count) } : { day, count: 0 };
}

/** Today's count, with any previous day's tally rolled away. Never throws. */
export function readModelRequests(store: KeyValueStore, now: Date = new Date()): ModelRequestUsage {
  const day = localDay(now);

  try {
    return parseUsage(store.getItem(modelRequestUsageKey), day);
  } catch {
    // Private mode can make even reads throw; an unknown count is shown as none.
    return { day, count: 0 };
  }
}

/**
 * Records one model-backed request and returns the new total. Call this where
 * the request is started, before the response, so a request that fails after
 * leaving the browser still counts against the day.
 */
export function recordModelRequest(store: KeyValueStore, now: Date = new Date()): ModelRequestUsage {
  const next: ModelRequestUsage = { day: localDay(now), count: readModelRequests(store, now).count + 1 };

  try {
    store.setItem(modelRequestUsageKey, JSON.stringify(next));
  } catch {
    // A full or unavailable store must not break the request it is counting.
  }

  return next;
}

/**
 * The browser's `localStorage`, or null where it is unavailable (server render,
 * private mode). Callers treat null as an environment with no counter rather
 * than as a count of zero they can write to.
 */
export function browserUsageStore(): KeyValueStore | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
