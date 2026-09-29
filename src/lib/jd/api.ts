import { z } from "zod";

import type { JobHints } from "@/lib/jd/hosts";
import { deriveJdTitle, type Jd } from "@/lib/jd/schema";
import type { JdRecord } from "@/lib/storage/types";

/**
 * Wire contract between the `/match` intake UI and `POST /api/jd`, plus the
 * mapping from a successful response to the locally stored `JdRecord`.
 */

export type IntakeSource = "paste" | "greenhouse" | "ashby" | "lever" | "linkedin" | "generic";

export interface JdIntakeSuccess {
  structured: Jd;
  source: IntakeSource;
  url: string | null;
  rawText: string;
  hints: JobHints;
}

export interface JdIntakeError {
  error: {
    reason: string;
    message: string;
    canPaste: boolean;
  };
}

export type JdIntakeResponse = JdIntakeSuccess | JdIntakeError;

/** Pasted text this short is almost certainly not a job description. */
export const minPasteLength = 40;
/** Upper bound so one request cannot push an unbounded blob through the model. */
export const maxPasteLength = 200_000;

export type ParsedIntakeRequest =
  | { kind: "url"; url: string }
  | { kind: "text"; text: string }
  | { kind: "invalid"; message: string };

const intakeRequestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
});

export function parseIntakeRequest(body: unknown): ParsedIntakeRequest {
  const parsed = intakeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: "invalid", message: "Send a JSON body with either a url or a text field." };
  }

  const { url, text } = parsed.data;
  if (url !== undefined && url.trim() !== "") {
    return { kind: "url", url: url.trim() };
  }

  if (text !== undefined) {
    const trimmed = text.trim();
    if (trimmed.length < minPasteLength) {
      return { kind: "invalid", message: `Pasted text is too short to be a job description (minimum ${minPasteLength} characters).` };
    }
    if (trimmed.length > maxPasteLength) {
      return { kind: "invalid", message: `Pasted text is too long (maximum ${maxPasteLength} characters).` };
    }
    return { kind: "text", text: trimmed };
  }

  return { kind: "invalid", message: "Send a JSON body with either a url or a text field." };
}

/**
 * Best-effort title hint from pasted text: the first line that is not a known
 * header label. Purely a hint for the model's prompt; never authoritative.
 */
export function titleHintFromText(rawText: string): string | null {
  const lines = rawText.split("\n").map((line) => line.trim());
  for (const line of lines) {
    if (line === "") {
      continue;
    }
    const stripped = line.replace(/^(job title|title|position|role)\s*[:\-]\s*/i, "").trim();
    if (stripped !== "" && stripped.length <= 120) {
      return stripped;
    }
  }

  return null;
}

export function isIntakeError(response: JdIntakeResponse): response is JdIntakeError {
  return "error" in response;
}

export function jdRecordFromIntake(response: JdIntakeSuccess, now = new Date()): JdRecord {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: deriveJdTitle(response.structured, response.hints.title ?? "Untitled job"),
    company: response.structured.company ?? response.hints.company ?? null,
    sourceUrl: response.url,
    rawText: response.rawText,
    structured: response.structured,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
