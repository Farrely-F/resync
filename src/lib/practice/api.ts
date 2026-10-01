import { AiFailureError, isAiFailureKind } from "@/lib/ai/failures";
import type { AiMode } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import { gradeSchema, type Grade } from "@/lib/practice/grade";
import type { Resume } from "@/lib/resume/schema";

/** Wire contract between the practice page and `POST /api/practice`: one answer up, one judgement back. */

export const practiceWaitMs = 50_000;

export interface PracticeRequestBody {
  resume: Resume;
  jd: Jd;
  criteria: MatchCriterion[];
  question: { question: string; why: string; how: string };
  answer: string;
  earlier: { question: string; answer: string } | null;
}

export interface PracticeSuccess {
  grade: Grade;
  model: string;
  aiMode: AiMode;
}

export interface PracticeFailure {
  error: { reason: string; message: string; kind?: string; retryAfterSeconds?: number | null };
}

function failureFrom(body: unknown, status: number): AiFailureError {
  const error = typeof body === "object" && body !== null && "error" in body ? (body as PracticeFailure).error : null;
  const message = typeof error?.message === "string" && error.message !== "" ? error.message : `Grading failed (HTTP ${status}).`;
  const kind = isAiFailureKind(error?.kind) ? error.kind : "unknown";
  const retryAfterSeconds = typeof error?.retryAfterSeconds === "number" ? error.retryAfterSeconds : null;

  return new AiFailureError(kind, message, { retryAfterSeconds });
}

export async function requestGrade(body: PracticeRequestBody): Promise<PracticeSuccess> {
  const response = await fetch("/api/practice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(practiceWaitMs),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw failureFrom(payload, response.status);
  }

  const parsed = gradeSchema.safeParse((payload as { grade?: unknown } | null)?.grade);
  if (!parsed.success) {
    throw new AiFailureError("unknown", "The practice route returned an unexpected response.");
  }

  const meta = payload as Partial<PracticeSuccess>;

  return {
    grade: parsed.data,
    model: typeof meta.model === "string" ? meta.model : "unknown",
    aiMode: meta.aiMode === "live" ? "live" : "mock",
  };
}
