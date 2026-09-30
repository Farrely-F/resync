import { runStructured } from "@/lib/ai/run";
import { specFor } from "@/lib/documents/registry";
import type { DocumentContent, DocumentInput, DocumentKind } from "@/lib/documents/types";
import { getEnv, type AppEnv } from "@/lib/env";

/**
 * Writing one document, whatever it is.
 *
 * Every kind goes through here, so the pipeline is the same for all of them: the
 * spec supplies the instructions, the strict schema, the prompt and the recorded
 * answer, and the seam supplies the retries, the fallback models and the logging.
 * A new kind cannot accidentally skip the validation or the mock recording,
 * because there is nowhere else to put it.
 */

/**
 * How long a document may take, retries and fallback models included.
 *
 * Longer than the seam's default, because these answers are long: a cover letter
 * is three hundred words where the other tasks answer with a few fields. The
 * budget is shared between the models that could answer, so this is also the
 * point at which a stalled provider stops being waited for and the next one is
 * asked.
 */
export const documentBudgetMs = 60_000;

export interface WrittenDocument {
  content: DocumentContent;
  /** The provider and model that answered, as the report records it. */
  model: string;
  aiMode: "mock" | "live";
}

export async function writeDocument(
  kind: DocumentKind,
  input: DocumentInput,
  options: { env?: AppEnv } = {},
): Promise<WrittenDocument> {
  const spec = specFor(kind);
  const env = options.env ?? getEnv();

  const parsed = await runStructured({
    task: spec.task,
    schema: spec.schema,
    instructions: spec.instructions,
    prompt: spec.buildPrompt(input),
    env,
    deadlineMs: documentBudgetMs,
    fixtures: { [spec.task]: spec.fixture },
  });

  return {
    content: spec.toContent(parsed),
    model: `${env.provider}/${env.model}`,
    aiMode: env.aiMode,
  };
}
