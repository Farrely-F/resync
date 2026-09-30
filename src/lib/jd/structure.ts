import type { LanguageModel } from "ai";
import { z } from "zod";

import { runStructured, type AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { jdContentSchema } from "@/lib/jd/model-schema";
import { jdSchema, type Jd } from "@/lib/jd/schema";
import type { JobHints } from "@/lib/jd/hosts";

/**
 * Turns raw posting text into the structured JD model.
 *
 * All model access goes through `runStructured`; in mock mode this feature
 * replays its own recording, and malformed output is rejected by the schema
 * rather than reaching the UI.
 */

export const extractJdInstructions = [
  "You turn a job posting's plain text into structured data.",
  "Use only what the text states: never invent a company, title, requirement or skill.",
  "Put mandatory requirements in `requirements` and items the posting marks as optional, preferred or nice to have in `niceToHave`.",
  "Keep each list item short and concrete, and leave a list empty when the text does not cover it.",
].join(" ");

export interface StructureJdInput {
  rawText: string;
  /** Where the text came from: `paste` or a hostname family such as `linkedin`. */
  source: string;
  url?: string | null;
  hints?: Partial<JobHints>;
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

export function buildJdPrompt(input: StructureJdInput): string {
  const header = [
    `Source: ${input.source}`,
    input.url ? `URL: ${input.url}` : null,
    input.hints?.title ? `Page title: ${input.hints.title}` : null,
    input.hints?.company ? `Company: ${input.hints.company}` : null,
    input.hints?.location ? `Location: ${input.hints.location}` : null,
  ].filter((line): line is string => line !== null);

  return [...header, "", input.rawText.trim()].join("\n");
}

export async function structureJd(input: StructureJdInput): Promise<Jd> {
  const content = await runStructured({
    task: "extract-jd",
    schema: jdContentSchema,
    instructions: extractJdInstructions,
    prompt: buildJdPrompt(input),
    env: input.env,
    fixtures: input.fixtures ?? { "extract-jd": extractJdFixture },
    model: input.model,
  });

  // The model answers with content; the app's own schema is what the rest of the
  // app reads, so the two are joined here rather than assumed to be identical.
  return jdSchema.parse(content);
}

/**
 * True when the model's output failed schema validation. In mock mode that is a
 * raw `ZodError`; the live path wraps it in the AI SDK's
 * `AI_NoObjectGeneratedError`, so both shapes are recognised.
 */
export function isInvalidModelOutputError(error: unknown): boolean {
  if (error instanceof z.ZodError) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("name" in error && error.name === "AI_NoObjectGeneratedError") {
    return true;
  }

  return "cause" in error && isInvalidModelOutputError(error.cause);
}
