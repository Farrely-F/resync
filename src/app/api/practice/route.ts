import { NextResponse } from "next/server";
import { z } from "zod";

import { AiFailureError, toAiFailure, type AiFailureKind } from "@/lib/ai/failures";
import { configFailureFrom, failureStatusByKind } from "@/lib/ai/http";
import { MissingFixtureError } from "@/lib/ai/run";
import { getEnv } from "@/lib/env";
import { jdSchema } from "@/lib/jd/schema";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import type { CriterionKind, CriterionVerdict } from "@/lib/match/types";
import type { PracticeFailure } from "@/lib/practice/api";
import { maxAnswerChars } from "@/lib/practice/limits";
import { gradeAnswer } from "@/lib/practice/grade";
import { resumeSchema } from "@/lib/resume/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * Grading one interview answer.
 *
 * One answer per request: the browser owns the conversation and sends the question,
 * the answer and the evidence, and gets judgements back. Nothing is stored here.
 * Failures leave in the shared vocabulary from `lib/ai/failures.ts`, with the same
 * statuses as `/api/analyze`.
 */

const criterionKinds = ["required", "nice-to-have", "seniority", "domain", "education"] as const satisfies readonly CriterionKind[];
const criterionVerdicts = ["met", "partial", "missing"] as const satisfies readonly CriterionVerdict[];


const requestSchema = z.object({
  resume: resumeSchema,
  jd: jdSchema,
  criteria: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum(criterionKinds),
      requirement: z.string().min(1),
      verdict: z.enum(criterionVerdicts),
      evidence: z.string().nullable(),
    }),
  ),
  question: z.object({ question: z.string().min(1), why: z.string(), how: z.string() }),
  answer: z.string().trim().min(1).max(maxAnswerChars),
  earlier: z.object({ question: z.string().min(1), answer: z.string().min(1) }).nullable(),
});

const failureMessages: Record<AiFailureKind, string> = {
  quota:
    "The model provider refused the request because this key's request allowance is used up, so your answer was not graded. It was kept; send it again once the allowance resets.",
  provider:
    "No model provider would take this request, including the fallback models configured for this server. Your answer was kept; try again.",
  offline: "The model provider could not be reached from this server, so your answer was not graded.",
  timeout: "The model did not answer in time, so your answer was not graded. It was kept; try again.",
  config: "The model provider rejected this server's API key, so your answer was not graded.",
  unknown: "The answer could not be graded.",
};

export function failureResponse(error: AiFailureError): { status: number; body: PracticeFailure } {
  return {
    status: failureStatusByKind[error.kind],
    body: {
      error: {
        reason: error.kind,
        message: failureMessages[error.kind],
        kind: error.kind,
        retryAfterSeconds: error.retryAfterSeconds,
      },
    },
  };
}

function errorResponse(status: number, reason: string, message: string) {
  return NextResponse.json({ error: { reason, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid-json", "Request body must be valid JSON.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid-request",
      `Send a resume, a job description, the criteria, the question and an answer of 1 to ${maxAnswerChars} characters.`,
    );
  }

  let env;
  try {
    env = getEnv();
  } catch (error) {
    const failure = configFailureFrom(error);
    if (failure) {
      return NextResponse.json(failure.body, { status: failure.status });
    }
    throw error;
  }

  try {
    const grade = await gradeAnswer({ ...parsed.data, env });

    return NextResponse.json({ grade, model: env.model, aiMode: env.aiMode });
  } catch (error) {
    if (error instanceof MissingFixtureError) {
      return errorResponse(500, "missing-fixture", "This build has no recorded fixture for grading. Set AI_MODE=live with an API key, or run the default mock mode.");
    }

    if (isInvalidModelOutputError(error)) {
      return errorResponse(502, "invalid-model-output", "The model returned a judgement that did not match the expected shape, so nothing was graded.");
    }

    const { status, body: failure } = failureResponse(toAiFailure(error));

    return NextResponse.json(failure, { status });
  }
}
