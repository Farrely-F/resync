import { NextResponse } from "next/server";
import { z } from "zod";

import { MissingFixtureError } from "@/lib/ai/run";
import { getEnv } from "@/lib/env";
import { jdSchema } from "@/lib/jd/schema";
import { isInvalidModelOutputError } from "@/lib/jd/structure";
import { analyzeMatchEvidence } from "@/lib/match/analyze";
import { resumeSchema } from "@/lib/resume/schema";

export const dynamic = "force-dynamic";

/**
 * Match analysis: evidence in, evidence out.
 *
 * The route answers two questions. `GET` says which model and mode an analysis
 * would run under, which the client needs before it can decide whether a stored
 * report already covers this input. `POST` runs the `analyze-match` task and
 * returns per-criterion evidence plus optional prose — never a score, because
 * the score is computed in `src/lib/match/rubric.ts` from these verdicts.
 *
 * Nothing is persisted here: the report is the user's data and lives in their
 * browser's IndexedDB, not on this server.
 */

const requestSchema = z.object({
  resume: resumeSchema,
  jd: jdSchema,
  themeId: z.string().nullable().default(null),
});

function errorResponse(status: number, reason: string, message: string) {
  return NextResponse.json({ error: { reason, message } }, { status });
}

export async function GET() {
  const env = getEnv();
  return NextResponse.json({ aiMode: env.aiMode, model: env.model });
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
    return errorResponse(400, "invalid-request", "Send a JSON body with a resume and a structured job description.");
  }

  const env = getEnv();

  try {
    const evidence = await analyzeMatchEvidence({ resume: parsed.data.resume, jd: parsed.data.jd, env });

    return NextResponse.json({
      criteria: evidence.criteria,
      summary: evidence.summary,
      model: env.model,
      aiMode: env.aiMode,
    });
  } catch (error) {
    if (error instanceof MissingFixtureError) {
      return errorResponse(
        500,
        "missing-fixture",
        "This build has no recorded match fixture. Set AI_MODE=live with an API key, or run the default mock mode.",
      );
    }

    if (isInvalidModelOutputError(error)) {
      return errorResponse(
        502,
        "invalid-model-output",
        "The model returned criteria that did not match the expected shape, so nothing was scored.",
      );
    }

    return errorResponse(502, "model-error", "The match analysis could not be completed.");
  }
}
