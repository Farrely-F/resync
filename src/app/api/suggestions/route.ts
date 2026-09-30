import { NextResponse } from "next/server";
import { z } from "zod";

import { MissingFixtureError } from "@/lib/ai/run";
import { getEnv } from "@/lib/env";
import { jdSchema } from "@/lib/jd/schema";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import type { CriterionKind, CriterionVerdict } from "@/lib/match/types";
import { resumeSchema } from "@/lib/resume/schema";
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

  const env = getEnv();

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

    return errorResponse(502, "model-error", "The adjustments could not be generated.");
  }
}
