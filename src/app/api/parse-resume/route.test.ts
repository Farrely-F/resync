import { describe, expect, it } from "vitest";

import { MAX_RESUME_TEXT_CHARS, POST, validateParseResumeBody } from "@/app/api/parse-resume/route";
import { parseResumeFixture } from "@/lib/resume/fixtures";

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
    expect(await response.json()).toEqual({
      error: { code: "invalid-json", message: "Request body must be valid JSON." },
    });
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
});
