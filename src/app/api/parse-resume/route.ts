import { NextResponse } from "next/server";

import { describeError } from "@/lib/ai/logging";
import { logEvent, newRequestId } from "@/lib/log";
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

/**
 * The id travels with the failure as well as the log line, so a report that says
 * "it failed" can be matched to the one line that says why.
 */
function errorResponse(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json({ error: { code, message, requestId } }, { status });
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logEvent("warn", "route.parse-resume.rejected", { requestId, code: "invalid-json", status: 400 });
    return errorResponse(400, "invalid-json", "Request body must be valid JSON.", requestId);
  }

  const input = validateParseResumeBody(body);
  if (!input.ok) {
    logEvent("warn", "route.parse-resume.rejected", {
      requestId,
      code: input.code,
      status: input.status,
      textChars: typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text.length : null,
    });
    return errorResponse(input.status, input.code, input.message, requestId);
  }

  logEvent("info", "route.parse-resume.started", { requestId, textChars: input.text.length });

  try {
    const resume = await parseResume(input.text, requestId);
    logEvent("info", "route.parse-resume.succeeded", {
      requestId,
      durationMs: Date.now() - startedAt,
      // Shape, not content: enough to see whether the model filled the resume in.
      entries: {
        work: resume.work.length,
        education: resume.education.length,
        skills: resume.skills.length,
        projects: resume.projects.length,
        certificates: resume.certificates.length,
        languages: resume.languages.length,
      },
    });
    return NextResponse.json({ resume });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    logEvent("error", "route.parse-resume.failed", {
      requestId,
      status: 502,
      code: "parse-failed",
      durationMs: Date.now() - startedAt,
      error: describeError(error),
    });
    return errorResponse(502, "parse-failed", `Could not structure the resume. ${detail}`, requestId);
  }
}
