import { MissingFixtureError } from "@/lib/ai/run";
import {
  parseIntakeRequest,
  titleHintFromText,
  type JdIntakeError,
  type JdIntakeSuccess,
  type IntakeSource,
} from "@/lib/jd/api";
import { extractJd } from "@/lib/jd/extract";
import type { JobHints } from "@/lib/jd/hosts";
import { isInvalidModelOutputError, structureJd } from "@/lib/jd/structure";

export const dynamic = "force-dynamic";

/**
 * JD intake endpoint.
 *
 * Accepts `{ url }` or `{ text }`. URL intake fetches the posting server-side
 * (which is where the private-address and size guards live); text intake never
 * touches the network. Both then go through the same structuring step, and the
 * response carries the raw text and origin so the client can store an auditable
 * record.
 */

function errorResponse(status: number, reason: string, message: string): Response {
  const body: JdIntakeError = { error: { reason, message, canPaste: true } };
  return Response.json(body, { status });
}

interface Intake {
  source: IntakeSource;
  url: string | null;
  rawText: string;
  hints: JobHints;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid-request", "Send a JSON body with either a url or a text field.");
  }

  const parsed = parseIntakeRequest(body);
  if (parsed.kind === "invalid") {
    return errorResponse(400, "invalid-request", parsed.message);
  }

  let intake: Intake;
  if (parsed.kind === "url") {
    const outcome = await extractJd(parsed.url);
    if (!outcome.ok) {
      return errorResponse(
        422,
        outcome.reason,
        `${outcome.message} ${outcome.canPaste ? "You can paste the posting text instead." : ""}`.trim(),
      );
    }
    intake = { source: outcome.source, url: outcome.url, rawText: outcome.rawText, hints: outcome.hints };
  } else {
    intake = {
      source: "paste",
      url: null,
      rawText: parsed.text,
      hints: { title: titleHintFromText(parsed.text), company: null, location: null },
    };
  }

  let structured;
  try {
    structured = await structureJd({
      rawText: intake.rawText,
      source: intake.source,
      url: intake.url,
      hints: intake.hints,
    });
  } catch (error) {
    if (error instanceof MissingFixtureError) {
      return errorResponse(
        500,
        "missing-fixture",
        "This build has no recorded job-description fixture. Set AI_MODE=live with an API key, or run the default mock mode.",
      );
    }
    if (isInvalidModelOutputError(error)) {
      return errorResponse(
        502,
        "invalid-model-output",
        "The model returned data that did not match the job description structure. Try again or paste the text manually.",
      );
    }
    return errorResponse(502, "model-error", "The job description could not be structured. Try again or paste the text manually.");
  }

  const response: JdIntakeSuccess = {
    structured,
    source: intake.source,
    url: intake.url,
    rawText: intake.rawText,
    hints: intake.hints,
  };

  return Response.json(response);
}
