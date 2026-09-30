import { NextResponse } from "next/server";
import { z } from "zod";

import { AiFailureError, toAiFailure, type AiFailureKind } from "@/lib/ai/failures";
import { configFailureFrom, failureStatusByKind } from "@/lib/ai/http";
import { MissingFixtureError } from "@/lib/ai/run";
import { getEnv } from "@/lib/env";
import { jdSchema } from "@/lib/jd/schema";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import type { CriterionKind, CriterionVerdict } from "@/lib/match/types";
import { resumeSchema } from "@/lib/resume/schema";
import type { SuggestionsFailure } from "@/lib/suggestions/api";
import { generateGroundedSuggestions } from "@/lib/suggestions/service";

export const dynamic = "force-dynamic";

/**
 * Adjustment suggestions: two model calls in, grounded proposals out.
 *
 * The route runs `suggest-adjustments` and then `verify-suggestions`, and
 * returns what survived plus what was dropped and why — the drops are part of
 * the answer, not a detail to hide. The report's criteria come from the client
 * because the report lives in the user's browser, not on this server.
 *
 * Nothing is persisted here and nothing is applied here. A suggestion only
 * reaches the resume when the user accepts it, in `apply.ts`.
 *
 * A model failure comes back in the shared vocabulary from `lib/ai/failures.ts`
 * — the same shape and the same statuses as `POST /api/analyze` — so a spent
 * allowance reads as a spent allowance on this page too, instead of as a
 * generic server error. A body this server rejected for its own reasons (bad
 * JSON, no criteria) stays a local concern with its own reason.
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
});

/**
 * Copy per failure kind. Statuses and the wire shape are shared with
 * `/api/analyze` through `src/lib/ai/http.ts`; only the wording differs, because
 * a suggestion run makes two model calls and says so.
 */
const failureMessages: Record<AiFailureKind, string> = {
  quota:
    "The model provider refused the request because this key's request allowance is used up, so no adjustments were generated. The allowance is shared and resets on the provider's side.",
  provider:
    "No model provider would take this request, including the fallback models configured for this server. Nothing about the resume or posting caused it.",
  offline: "The model provider could not be reached from this server, so no adjustments were generated.",
  timeout:
    "The model did not answer within the time this server allows for a suggestion run, so nothing was generated.",
  config: "The model provider rejected this server's API key, so no adjustments were generated.",
  unknown: "The adjustments could not be generated.",
};

/** The wire answer for a classified model failure: status, reason, copy, and the wait if any. */
export function failureResponse(error: AiFailureError): { status: number; body: SuggestionsFailure } {
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
      "Send a JSON body with a resume, a structured job description and the report's criteria.",
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
    const outcome = await generateGroundedSuggestions({ ...parsed.data, env });

    return NextResponse.json({ ...outcome, model: env.model, aiMode: env.aiMode });
  } catch (error) {
    if (error instanceof MissingFixtureError) {
      return errorResponse(
        500,
        "missing-fixture",
        "This build has no recorded suggestion fixture. Set AI_MODE=live with an API key, or run the default mock mode.",
      );
    }

    if (isInvalidModelOutputError(error)) {
      return errorResponse(
        502,
        "invalid-model-output",
        "The model returned suggestions that did not match the expected shape, so nothing was proposed.",
      );
    }

    const { status, body: failure } = failureResponse(toAiFailure(error));

    return NextResponse.json(failure, { status });
  }
}
