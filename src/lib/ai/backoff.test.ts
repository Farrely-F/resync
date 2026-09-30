import { describe, expect, it } from "vitest";

import {
  defaultBackoffPolicy,
  exponentialDelayMs,
  parseRetryAfter,
  planRetry,
  type BackoffPolicy,
} from "@/lib/ai/backoff";

describe("parseRetryAfter", () => {
  it("reads delta-seconds", () => {
    expect(parseRetryAfter("30")).toBe(30_000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter("  7 ")).toBe(7_000);
  });

  it("reads an HTTP-date as the wait from now, never negative", () => {
    const now = new Date("2026-09-30T12:00:00Z");

    expect(parseRetryAfter("Wed, 30 Sep 2026 12:00:45 GMT", now)).toBe(45_000);
    // A date already in the past means "now", not a negative wait.
    expect(parseRetryAfter("Wed, 30 Sep 2026 11:59:00 GMT", now)).toBe(0);
  });

  it("has nothing to say about a missing, blank or unusable value", () => {
    for (const value of [null, undefined, "", "   ", "soon", "-5", "1.5", "30 seconds"]) {
      expect(parseRetryAfter(value)).toBeNull();
    }
  });
});

describe("exponentialDelayMs", () => {
  it("doubles from the base and stops at the cap", () => {
    const policy: BackoffPolicy = { maxAttempts: 9, baseDelayMs: 500, factor: 2, maxDelayMs: 3_000 };

    expect(exponentialDelayMs(1, policy)).toBe(500);
    expect(exponentialDelayMs(2, policy)).toBe(1_000);
    expect(exponentialDelayMs(3, policy)).toBe(2_000);
    expect(exponentialDelayMs(4, policy)).toBe(3_000);
    // Far out, the schedule saturates instead of overflowing.
    expect(exponentialDelayMs(500, policy)).toBe(3_000);
  });
});

describe("planRetry", () => {
  it("backs off exponentially while attempts remain", () => {
    expect(planRetry(1, null)).toEqual({ retry: true, delayMs: 500, source: "backoff" });
    expect(planRetry(2, null)).toEqual({ retry: true, delayMs: 1_000, source: "backoff" });
  });

  it("gives up once the attempt budget is spent", () => {
    expect(planRetry(defaultBackoffPolicy.maxAttempts, null)).toEqual({
      retry: false,
      reason: "attempts-exhausted",
      retryAfterMs: null,
    });
  });

  it("honours Retry-After over the schedule", () => {
    expect(planRetry(1, 4_000)).toEqual({ retry: true, delayMs: 4_000, source: "retry-after" });
    // Exactly the cap is still worth waiting for.
    expect(planRetry(1, defaultBackoffPolicy.maxDelayMs)).toEqual({
      retry: true,
      delayMs: defaultBackoffPolicy.maxDelayMs,
      source: "retry-after",
    });
  });

  it("gives up instead of waiting past the cap the provider asked for", () => {
    expect(planRetry(1, 60_000)).toEqual({ retry: false, reason: "retry-after-too-long", retryAfterMs: 60_000 });
  });

  it("treats a negative Retry-After as no wait rather than an error", () => {
    expect(planRetry(1, -1)).toEqual({ retry: true, delayMs: 0, source: "retry-after" });
  });
});
