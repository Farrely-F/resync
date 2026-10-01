import { APICallError } from "ai";
import { describe, expect, it } from "vitest";

import { AiFailureError, isAiFailureKind, toAiFailure, toRequestFailure } from "@/lib/ai/failures";

function apiCallError(options: { status?: number; headers?: Record<string, string>; cause?: unknown }) {
  return new APICallError({
    message: `provider said ${options.status ?? "nothing"}`,
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    statusCode: options.status,
    responseHeaders: options.headers,
    cause: options.cause,
    isRetryable: true,
  });
}

describe("isAiFailureKind", () => {
  it("accepts only the kinds the app knows", () => {
    expect(isAiFailureKind("quota")).toBe(true);
    expect(isAiFailureKind("timeout")).toBe(true);
    expect(isAiFailureKind("quota-exhausted")).toBe(false);
    expect(isAiFailureKind(429)).toBe(false);
  });
});

describe("toAiFailure", () => {
  it("reads a 429 as a spent allowance, with the wait the provider asked for", () => {
    const failure = toAiFailure(apiCallError({ status: 429, headers: { "Retry-After": "30" } }));

    expect(failure.kind).toBe("quota");
    expect(failure.retryAfterSeconds).toBe(30);
    expect(failure.retryable).toBe(true);
  });

  it("reads an HTTP-date Retry-After too", () => {
    const at = new Date(Date.now() + 60_000).toUTCString();
    const failure = toAiFailure(apiCallError({ status: 429, headers: { "retry-after": at } }));

    expect(failure.retryAfterSeconds).toBeGreaterThanOrEqual(59);
    expect(failure.retryAfterSeconds).toBeLessThanOrEqual(61);
  });

  it("reads a 402, running out of credit, as the same next step", () => {
    expect(toAiFailure(apiCallError({ status: 402 })).kind).toBe("quota");
  });

  it("reads a 503 as routing failure, and other 5xx as the provider failing", () => {
    expect(toAiFailure(apiCallError({ status: 503 })).routing).toBe(true);
    expect(toAiFailure(apiCallError({ status: 503 })).kind).toBe("provider");
    expect(toAiFailure(apiCallError({ status: 500 })).routing).toBe(false);
    expect(toAiFailure(apiCallError({ status: 504 })).kind).toBe("provider");
  });

  it("reads rejected credentials as a configuration problem, not something to retry", () => {
    for (const status of [401, 403]) {
      const failure = toAiFailure(apiCallError({ status }));
      expect(failure.kind).toBe("config");
      expect(failure.retryable).toBe(false);
    }
  });

  it("reads a fetch failure as the provider being unreachable", () => {
    const refused = new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:443") });

    expect(toAiFailure(refused).kind).toBe("offline");
    expect(toAiFailure(new TypeError("Failed to fetch")).kind).toBe("offline");
  });

  it("reads Node's connect failure, an empty AggregateError under a status-less provider error, as unreachable", () => {
    // What the AI SDK throws when every address Node tried failed to connect: the message
    // is "Cannot connect to API: " and the only detail is an AggregateError with no text.
    const connect = apiCallError({ cause: new AggregateError([new Error("connect ENETUNREACH"), new Error("connect ETIMEDOUT")]) });

    expect(toAiFailure(connect).kind).toBe("offline");
  });

  it("reads an abort as the deadline, including one wrapped by the provider", () => {
    expect(toAiFailure(new DOMException("aborted", "TimeoutError")).kind).toBe("timeout");
    expect(toAiFailure(new DOMException("aborted", "AbortError")).kind).toBe("timeout");

    const wrapped = apiCallError({ status: undefined, cause: new DOMException("aborted", "AbortError") });
    expect(toAiFailure(wrapped).kind).toBe("timeout");
  });

  it("finds the real cause through a wrapper the SDK added", () => {
    const wrapper = new Error("AI_NoObjectGeneratedError", { cause: apiCallError({ status: 429 }) });

    expect(toAiFailure(wrapper).kind).toBe("quota");
  });

  it("passes a failure it already classified straight through", () => {
    const failure = new AiFailureError("quota", "already known");
    expect(toAiFailure(failure)).toBe(failure);
  });

  it("does not invent a kind for something it cannot place", () => {
    const failure = toAiFailure(new Error("something else entirely"));

    expect(failure.kind).toBe("unknown");
    expect(failure.retryable).toBe(false);
  });
});

describe("toRequestFailure", () => {
  it("treats a browser fetch rejection as offline", () => {
    expect(toRequestFailure(new TypeError("Failed to fetch")).kind).toBe("offline");
  });

  it("treats the browser's own deadline as a timeout", () => {
    expect(toRequestFailure(new DOMException("timed out", "TimeoutError")).kind).toBe("timeout");
  });

  it("keeps a failure the route already classified, message included", () => {
    const fromRoute = new AiFailureError("provider", "no model provider would take it", { retryAfterSeconds: null });
    const failure = toRequestFailure(fromRoute);

    expect(failure).toBe(fromRoute);
    expect(failure.message).toBe("no model provider would take it");
  });
});
