import { describe, expect, it } from "vitest";

import { failureResponse, POST } from "@/app/api/analyze/route";
import { AiFailureError } from "@/lib/ai/failures";

function request(body: string) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("failureResponse", () => {
  it("maps each failure class to a status the page can act on", () => {
    const cases = [
      { kind: "quota", status: 429 },
      { kind: "provider", status: 503 },
      { kind: "offline", status: 504 },
      { kind: "timeout", status: 504 },
      { kind: "config", status: 500 },
      { kind: "unknown", status: 502 },
    ] as const;

    for (const { kind, status } of cases) {
      const { status: mapped, body } = failureResponse(new AiFailureError(kind, "detail"));

      expect(mapped).toBe(status);
      expect(body.error.reason).toBe(kind);
      expect(body.error.kind).toBe(kind);
      expect(body.error.message.length).toBeGreaterThan(0);
    }
  });

  it("carries the wait the provider asked for through to the client", () => {
    const { body } = failureResponse(new AiFailureError("quota", "detail", { retryAfterSeconds: 30 }));

    expect(body.error.retryAfterSeconds).toBe(30);
  });

  it("says nothing about a wait when there was none", () => {
    expect(failureResponse(new AiFailureError("provider", "detail")).body.error.retryAfterSeconds).toBeNull();
  });
});

describe("POST /api/analyze", () => {
  it("rejects a body that is not JSON without throwing", async () => {
    const response = await POST(request("{not json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { reason: "invalid-json", message: "Request body must be valid JSON." },
    });
  });

  it("rejects a body without a resume and posting", async () => {
    const response = await POST(request(JSON.stringify({ jd: {} })));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { reason: string } };
    expect(body.error.reason).toBe("invalid-request");
  });
});
