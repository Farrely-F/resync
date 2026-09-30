import { describe, expect, it } from "vitest";

import { failureResponse as analyzeFailure } from "@/app/api/analyze/route";
import { failureResponse as suggestionsFailure } from "@/app/api/suggestions/route";
import { AiFailureError, aiFailureKinds, type AiFailureKind } from "@/lib/ai/failures";
import { failureStatusByKind } from "@/lib/ai/http";

/**
 * Parity between the two AI routes.
 *
 * Both features answer a model failure with the same vocabulary, so the client
 * has one classification to switch on. That property is easy to break by editing
 * one route's table and forgetting the other, which is exactly what happened
 * before the tables were shared — hence this test rather than good intentions.
 */
describe("AI failure parity across routes", () => {
  const responses = [
    ["analyze", analyzeFailure],
    ["suggestions", suggestionsFailure],
  ] as const;

  it("covers every failure kind, so a new kind cannot be added to only one route", () => {
    for (const [name, failure] of responses) {
      for (const kind of aiFailureKinds) {
        const { status, body } = failure(new AiFailureError(kind, "probe"));
        expect(status, `${name} / ${kind}`).toBe(failureStatusByKind[kind]);
        expect(body.error.kind).toBe(kind);
        expect(body.error.reason).toBe(kind);
        expect(body.error.message.length).toBeGreaterThan(0);
      }
    }
  });

  it("agrees on the status and the body shape for every kind", () => {
    for (const kind of aiFailureKinds) {
      const a = analyzeFailure(new AiFailureError(kind, "probe"));
      const s = suggestionsFailure(new AiFailureError(kind, "probe"));

      expect(a.status, kind).toBe(s.status);
      expect(Object.keys(a.body.error).sort(), kind).toEqual(Object.keys(s.body.error).sort());
    }
  });

  it("carries the provider's wait through, and null when there was none", () => {
    const waiting = new AiFailureError("quota", "slow down", { retryAfterSeconds: 30 });
    expect(analyzeFailure(waiting).body.error.retryAfterSeconds).toBe(30);
    expect(suggestionsFailure(waiting).body.error.retryAfterSeconds).toBe(30);

    const noWait = new AiFailureError("provider", "routing failed");
    expect(analyzeFailure(noWait).body.error.retryAfterSeconds).toBeNull();
    expect(suggestionsFailure(noWait).body.error.retryAfterSeconds).toBeNull();
  });

  it("keeps quota and provider distinguishable, because they need different next steps", () => {
    const kinds: AiFailureKind[] = ["quota", "provider", "offline", "timeout", "config", "unknown"];
    const statuses = kinds.map((kind) => analyzeFailure(new AiFailureError(kind, "probe")).status);

    expect(statuses[0]).toBe(429);
    expect(statuses[1]).toBe(503);
    // quota must never be reported as a routing failure, nor the reverse.
    expect(statuses[0]).not.toBe(statuses[1]);
  });
});
