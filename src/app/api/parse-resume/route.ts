import { NextResponse } from "next/server";

import { MIN_EXTRACTED_TEXT_CHARS } from "@/lib/resume/extract";
import { parseResume } from "@/lib/resume/parse";

/**
 * Structuring endpoint.
 *
 * It accepts extracted plain text only — never an uploaded file — so the server
 * never becomes a file store. Input is validated up front and every failure
 * comes back as a `{ error: { code, message } }` body with a real status code,
 * so the client can show the reason instead of a generic 500.
 */

/**
 * A long resume is roughly 6,000 characters; 200,000 leaves ample room for
 * unusually verbose documents while bounding the request at ~200 KB of text and
 * keeping an accidental or hostile payload out of the model call.
 */
export const MAX_RESUME_TEXT_CHARS = 200_000;

export type ParseResumeInput =
  | { ok: true; text: string }
  | { ok: false; status: number; code: string; message: string };

export function validateParseResumeBody(body: unknown): ParseResumeInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: "invalid-body",
      message: 'Expected a JSON object with a "text" field.',
    };
  }

  const { text } = body as { text?: unknown };

  if (typeof text !== "string") {
    return { ok: false, status: 400, code: "invalid-body", message: '"text" must be a string.' };
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_EXTRACTED_TEXT_CHARS) {
    return {
      ok: false,
      status: 400,
      code: "text-too-short",
      message: `Resume text must contain at least ${MIN_EXTRACTED_TEXT_CHARS} characters.`,
    };
  }

  if (trimmed.length > MAX_RESUME_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      code: "text-too-long",
      message: `Resume text must be under ${MAX_RESUME_TEXT_CHARS} characters.`,
    };
  }

  return { ok: true, text: trimmed };
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid-json", "Request body must be valid JSON.");
  }

  const input = validateParseResumeBody(body);
  if (!input.ok) {
    return errorResponse(input.status, input.code, input.message);
  }

  try {
    const resume = await parseResume(input.text);
    return NextResponse.json({ resume });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return errorResponse(502, "parse-failed", `Could not structure the resume. ${detail}`);
  }
}
