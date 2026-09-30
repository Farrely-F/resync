import { APICallError } from "ai";
import { describe, expect, it } from "vitest";

import { AiFailureError } from "@/lib/ai/failures";
import { describeError } from "@/lib/ai/logging";
import { logValueLimit } from "@/lib/log";

/** The shape a provider rejection actually arrives in. */
function rejectedSchema(body: string): APICallError {
  return new APICallError({
    message: body,
    url: "https://api.groq.com/openai/v1/chat/completions",
    requestBodyValues: { messages: [{ role: "user", content: "the reader's resume text" }] },
    statusCode: 400,
    responseHeaders: { "content-type": "application/json" },
    responseBody: body,
    isRetryable: false,
  });
}

describe("describeError", () => {
  it("keeps the provider's own answer: status, url and body", () => {
    // This is the whole point of the module. The classified kind says "unknown";
    // the body says which schema property the provider rejected.
    const body =
      '{"error":{"message":"invalid JSON schema for response_format: /properties/skills/items/required: `required` is required to be an array including every key in properties"}}';

    const described = describeError(rejectedSchema(body)) as { errors: Record<string, unknown>[] };
    const [first] = described.errors;

    expect(first.statusCode).toBe(400);
    expect(first.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(String(first.responseBody)).toContain("/properties/skills/items/required");
    expect(first.responseHeaders).toEqual({ "content-type": "application/json" });
  });

  it("never logs the request body, because that is the prompt", () => {
    // The prompt is the reader's resume. A log file is somewhere it must not go.
    const described = JSON.stringify(describeError(rejectedSchema("nope")));

    expect(described).not.toContain("requestBodyValues");
    expect(described).not.toContain("the reader's resume text");
  });

  it("walks the cause chain, so a wrapped failure still shows the provider's words", () => {
    const inner = rejectedSchema("the provider said this");
    const outer = new AiFailureError("unknown", "outer", { cause: inner });

    const described = describeError(outer) as { chainLength: number; errors: Record<string, unknown>[] };

    expect(described.chainLength).toBe(2);
    expect(described.errors[0]).toMatchObject({ name: "AiFailureError", message: "outer" });
    expect(String(described.errors[1].responseBody)).toBe("the provider said this");
  });

  it("carries the seam's own classification alongside the provider's", () => {
    const quota = new AiFailureError("quota", "allowance used up", { retryAfterSeconds: 30 });

    const described = describeError(quota) as { errors: Record<string, unknown>[] };

    expect(described.errors[0]).toMatchObject({
      kind: "quota",
      retryable: true,
      routing: false,
      retryAfterSeconds: 30,
    });
  });

  it("bounds a huge provider body instead of writing it whole", () => {
    const huge = "x".repeat(logValueLimit * 3);

    const described = describeError(rejectedSchema(huge)) as { errors: Record<string, unknown>[] };
    const body = String(described.errors[0].responseBody);

    expect(body.length).toBeLessThan(logValueLimit + 100);
    expect(body).toContain("more characters");
  });

  it("survives a thrown non-error", () => {
    const described = describeError("just a string") as { chainLength: number; errors: Record<string, unknown>[] };

    expect(described.chainLength).toBe(1);
    expect(described.errors[0]).toEqual({ value: "just a string" });
  });
});
