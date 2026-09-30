/**
 * Retry timing for provider throttling.
 *
 * Pure arithmetic: no timers, no I/O, so the schedule can be tested exactly and
 * the caller alone decides what to do with a delay. A `Retry-After` response
 * header wins over the schedule when the provider sends one, because it is the
 * provider stating when its window reopens; the exponential schedule is the
 * fallback for responses that do not say. Every wait is capped, and a
 * `Retry-After` longer than the cap ends the attempt loop rather than holding
 * the user for it.
 */

export interface BackoffPolicy {
  /** Attempts allowed for one model, the first try included. */
  maxAttempts: number;
  /** First wait, multiplied by `factor` for each further attempt. */
  baseDelayMs: number;
  factor: number;
  /** Ceiling for a single wait, whatever the schedule or the provider asks. */
  maxDelayMs: number;
}

export const defaultBackoffPolicy: BackoffPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  factor: 2,
  maxDelayMs: 8_000,
};

/**
 * A `Retry-After` header in milliseconds, or null when there is nothing usable
 * in it. Both HTTP forms are understood: a delta in seconds (`Retry-After: 30`)
 * and an HTTP-date (`Retry-After: Wed, 21 Oct 2026 07:28:00 GMT`), which is
 * measured against `now` and never goes below zero.
 */
export function parseRetryAfter(value: string | null | undefined, now: Date = new Date()): number | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) ? seconds * 1000 : null;
  }

  // All three HTTP-date forms carry a time of day. Requiring the colon keeps
  // `Date.parse`'s looser v8 readings ("1.5", "-5") from turning into a wait.
  if (!trimmed.includes(":")) {
    return null;
  }

  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) {
    return null;
  }

  return Math.max(0, at - now.getTime());
}

/** `base * factor^(attemptsMade - 1)`, capped. A long run saturates at the cap. */
export function exponentialDelayMs(attemptsMade: number, policy: BackoffPolicy = defaultBackoffPolicy): number {
  const step = Math.max(1, Math.floor(attemptsMade));
  return Math.min(policy.baseDelayMs * policy.factor ** (step - 1), policy.maxDelayMs);
}

export type RetryPlan =
  | { readonly retry: true; readonly delayMs: number; readonly source: "retry-after" | "backoff" }
  | {
      readonly retry: false;
      readonly reason: "attempts-exhausted" | "retry-after-too-long";
      readonly retryAfterMs: number | null;
    };

/**
 * Whether to try again after `attemptsMade` attempts of one model, and how long
 * to wait first. `retryAfterMs` is the parsed header, when there was one.
 */
export function planRetry(
  attemptsMade: number,
  retryAfterMs: number | null | undefined,
  policy: BackoffPolicy = defaultBackoffPolicy,
): RetryPlan {
  if (attemptsMade >= policy.maxAttempts) {
    return { retry: false, reason: "attempts-exhausted", retryAfterMs: retryAfterMs ?? null };
  }

  if (retryAfterMs !== null && retryAfterMs !== undefined) {
    const wait = Math.max(0, retryAfterMs);
    if (wait > policy.maxDelayMs) {
      // Waiting that long is not a retry, it is giving up slowly.
      return { retry: false, reason: "retry-after-too-long", retryAfterMs: wait };
    }
    return { retry: true, delayMs: wait, source: "retry-after" };
  }

  return { retry: true, delayMs: exponentialDelayMs(attemptsMade, policy), source: "backoff" };
}
