import { NextResponse } from "next/server";
import { z } from "zod";

import { AiFailureError, toAiFailure, type AiFailureKind } from "@/lib/ai/failures";
import { configFailureFrom, failureStatusByKind } from "@/lib/ai/http";
import { MissingFixtureError } from "@/lib/ai/run";
import type { DocumentFailure } from "@/lib/documents/api";
import { documentKinds } from "@/lib/documents/types";
import { writeDocument } from "@/lib/documents/service";
import { getEnv } from "@/lib/env";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import { jdSchema } from "@/lib/jd/schema";
import type { CriterionKind, CriterionVerdict } from "@/lib/match/types";
import { resumeSchema } from "@/lib/resume/schema";

export const dynamic = "force-dynamic";

/**
 * Writing a long document takes longer than the platform's default function
 * timeout on some plans, and a function cut off mid-answer would look exactly
 * like a provider that never replied. Declaring it keeps the seam's own budget
 * (`documentBudgetMs`) the thing that decides.
 */
export const maxDuration = 60;

/**
 * Writing a cover letter, an outreach message or interview prep from a match.
 *
 * One route for all three, because they are one pipeline with three specs: the
 * kind selects the instructions and the shape, and everything else — the seam, the
 * retries, the fallback models, the logging — is shared.
 *
 * The evidence comes from the client, because the resume, the posting and the
 * report all live in the reader's browser rather than on this server. Nothing is
 * stored here, and nothing is stored anywhere without the browser writing it.
 *
 * Failures come back in the shared vocabulary from `lib/ai/failures.ts`, with the
 * same statuses as `/api/analyze`, so a spent allowance reads as a spent allowance
 * on this page too.
 */

const criterionKinds = ["required", "nice-to-have", "seniority", "domain", "education"] as const satisfies readonly CriterionKind[];
const criterionVerdicts = ["met", "partial", "missing"] as const satisfies readonly CriterionVerdict[];

const requestSchema = z.object({
  kind: z.enum(documentKinds),
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
  summary: z.string().nullable(),
});

const failureMessages: Record<AiFailureKind, string> = {
  quota:
    "The model provider refused the request because this key's request allowance is used up, so nothing was written. The allowance is shared and resets on the provider's side.",
  provider:
    "No model provider would take this request, including the fallback models configured for this server. Nothing about the resume or posting caused it.",
  offline: "The model provider could not be reached from this server, so nothing was written.",
  timeout: "The model did not answer within the time this server allows, so nothing was written.",
  config: "The model provider rejected this server's API key, so nothing was written.",
  unknown: "The document could not be written.",
};

/** The wire answer for a classified model failure: status, reason, copy, and the wait if any. */
export function failureResponse(error: AiFailureError): { status: number; body: DocumentFailure } {
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
      "Send a JSON body with a document kind, a resume, a structured job description and the report's criteria.",
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
    const written = await writeDocument(parsed.data.kind, parsed.data, { env });

    return NextResponse.json(written);
  } catch (error) {
    if (error instanceof MissingFixtureError) {
      return errorResponse(
        500,
        "missing-fixture",
        "This build has no recorded fixture for that document. Set AI_MODE=live with an API key, or run the default mock mode.",
      );
    }

    if (isInvalidModelOutputError(error)) {
      return errorResponse(
        502,
        "invalid-model-output",
        "The model returned something that did not match the shape this document needs, so nothing was written.",
      );
    }

    const { status, body: failure } = failureResponse(toAiFailure(error));

    return NextResponse.json(failure, { status });
  }
}
