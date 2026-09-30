import { Output, generateText, type LanguageModel } from "ai";
import type { z } from "zod";

import { createLiveModel } from "@/lib/ai/provider";
import { getEnv, type AppEnv } from "@/lib/env";

/**
 * Every structured AI call in the app goes through this seam. In mock mode the
 * caller supplies the recorded fixture for its own task, so each feature owns
 * its own recording instead of sharing one registry; a task with no fixture
 * fails loudly rather than quietly returning something made up.
 */
export const aiTasks = [
  "parse-resume",
  "extract-jd",
  "analyze-match",
  "suggest-adjustments",
  "verify-suggestions",
] as const;

export type AiTask = (typeof aiTasks)[number];

export class MissingFixtureError extends Error {
  readonly task: AiTask;

  constructor(task: AiTask) {
    super(
      `AI_MODE=mock has no recorded fixture for task "${task}". Pass one in \`fixtures\`, or run with AI_MODE=live.`,
    );
    this.name = "MissingFixtureError";
    this.task = task;
  }
}

export interface RunStructuredOptions<T> {
  task: AiTask;
  schema: z.ZodType<T>;
  instructions: string;
  prompt: string;
  /** Overridden by tests and by callers that resolved the environment already. */
  env?: AppEnv;
  /** Required in mock mode: the recording for this task. */
  fixtures?: Partial<Record<AiTask, unknown>>;
  /** Injected by tests to exercise the live branch without a network call. */
  model?: LanguageModel;
}

export async function runStructured<T>(options: RunStructuredOptions<T>): Promise<T> {
  const env = options.env ?? getEnv();

  if (env.aiMode === "mock") {
    const fixture = options.fixtures?.[options.task];
    if (fixture === undefined) {
      throw new MissingFixtureError(options.task);
    }

    // Fixtures are validated too: a stale recording must not masquerade as a valid model response.
    return options.schema.parse(fixture);
  }

  const model = options.model ?? createLiveModel(env);
  const { output } = await generateText({
    model,
    instructions: options.instructions,
    output: Output.object({ schema: options.schema }),
    prompt: options.prompt,
  });

  return output;
}
