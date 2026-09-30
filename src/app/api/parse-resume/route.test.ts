import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";

import { MAX_RESUME_TEXT_CHARS, POST, validateParseResumeBody } from "@/app/api/parse-resume/route";
import { AiFailureError } from "@/lib/ai/failures";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { parseResume } from "@/lib/resume/parse";

// The route's failure path is only reachable when the seam fails, and making the
// seam fail for real would mean a network call in a unit test. The real
// implementation stays the default, so the other tests here still exercise it.
vi.mock("@/lib/resume/parse", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resume/parse")>();
  return { ...actual, parseResume: vi.fn(actual.parseResume) };
});

const parseResumeMock = vi.mocked(parseResume);

const validText = "Priya Raman\nSenior Backend Engineer\npriya.raman@example.com";

function postRequest(body: string, contentType = "application/json") {
  return new Request("http://localhost/api/parse-resume", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("validateParseResumeBody", () => {
  it("rejects bodies that are not an object with a string text field", () => {
    for (const body of [null, "text", 42, [], {}, { text: 42 }]) {
      const result = validateParseResumeBody(body);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.code).toBe("invalid-body");
      }
    }
  });

  it("rejects text below the usable threshold", () => {
    const result = validateParseResumeBody({ text: "too short" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("text-too-short");
      expect(result.status).toBe(400);
    }
  });

  it("accepts text exactly at the size limit and rejects one character more", () => {
    const atLimit = validateParseResumeBody({ text: "a".repeat(MAX_RESUME_TEXT_CHARS) });
    expect(atLimit.ok).toBe(true);

    const overLimit = validateParseResumeBody({ text: "a".repeat(MAX_RESUME_TEXT_CHARS + 1) });
    expect(overLimit.ok).toBe(false);
    if (!overLimit.ok) {
      expect(overLimit.code).toBe("text-too-long");
      expect(overLimit.status).toBe(413);
    }
  });

  it("trims the accepted text", () => {
    const result = validateParseResumeBody({ text: `  ${validText}  ` });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(validText);
    }
  });
});

describe("POST /api/parse-resume", () => {
  it("returns 400 with an error body for malformed JSON rather than throwing", async () => {
    const response = await POST(postRequest("{not json"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; message: string; requestId: string } };

    expect(body.error.code).toBe("invalid-json");
    expect(body.error.message).toBe("Request body must be valid JSON.");
    // The id is what joins a failure the user reports to the line that explains
    // it, so every error body carries one.
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the validation error shape for short text", async () => {
    const response = await POST(postRequest(JSON.stringify({ text: "hi" })));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("text-too-short");
  });

  it("structures valid text from the recorded fixture with no network call", async () => {
    const response = await POST(postRequest(JSON.stringify({ text: validText })));

    expect(response.status).toBe(200);
    const body = (await response.json()) as { resume: unknown };
    expect(body.resume).toEqual(parseResumeFixture);
  });

  it("logs a failed parse with the provider's own reason, under the id it returns", async () => {
    // The regression this guards: a provider rejection logged as "unknown" with
    // the reason discarded, which is what made this class of failure take a
    // network trace to diagnose. The status, the URL and the body are the point.
    const providerError = new APICallError({
      message: "invalid JSON schema for response_format: /properties/skills/items/required",
      url: "https://api.groq.com/openai/v1/chat/completions",
      requestBodyValues: { messages: [{ role: "user", content: validText }] },
      statusCode: 400,
      responseBody: '{"error":{"message":"/properties/skills/items/required"}}',
      isRetryable: false,
    });
    parseResumeMock.mockRejectedValueOnce(new AiFailureError("unknown", "refused", { cause: providerError }));

    let captured = "";
    const out = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
      captured += String(chunk);
      return true;
    });
    const err = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
      captured += String(chunk);
      return true;
    });

    let response: Response;
    try {
      response = await POST(postRequest(JSON.stringify({ text: validText })));
    } finally {
      out.mockRestore();
      err.mockRestore();
    }

    const body = (await response.json()) as { error: { code: string; requestId: string } };
    const lines = captured
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const failed = lines.find((line) => line.event === "route.parse-resume.failed");

    expect(response.status).toBe(502);
    expect(failed).toBeDefined();
    expect(failed).toMatchObject({ level: "error", requestId: body.error.requestId });
    const described = JSON.stringify(failed);
    expect(described).toContain("400");
    expect(described).toContain("https://api.groq.com/openai/v1/chat/completions");
    expect(described).toContain("/properties/skills/items/required");
    // The prompt is the reader's resume text; a log file is not a place for it.
    expect(described).not.toContain(validText);
  });
});
