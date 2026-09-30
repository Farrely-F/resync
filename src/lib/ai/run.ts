import { Output, generateText, type LanguageModel } from "ai";
import type { z } from "zod";

import { defaultBackoffPolicy, planRetry, type BackoffPolicy } from "@/lib/ai/backoff";
import { withDeadline } from "@/lib/ai/deadline";
import { AiFailureError, toAiFailure } from "@/lib/ai/failures";
import { inFlightModelRequests } from "@/lib/ai/inflight";
import { createModel } from "@/lib/ai/provider";
import { getEnv, type AppEnv, type ModelTarget } from "@/lib/env";

/**
 * Every structured AI call in the app goes through this seam. In mock mode the
 * caller supplies the recorded fixture for its own task, so each feature owns
 * its own recording instead of sharing one registry; a task with no fixture
 * fails loudly rather than quietly returning something made up.
 *
 * In live mode the seam is responsible for the measured behaviour of the shared
 * free-tier key: a per-minute and per-day request allowance (429), a router that
 * can fail to find a backing model (503), and latency that is sometimes a hang.
 * So one call here means: at most `maxAttempts` tries per model, a `Retry-After`
 * honoured when the provider sends one, the configured fallback models tried in
 * order when routing fails, and a wall-clock deadline over the whole thing. It
 * always ends — with a value or with an `AiFailureError` the caller can show.
 */
export const aiTasks = [
  "parse-resume",
  "extract-jd",
  "analyze-match",
  "suggest-adjustments",
  "verify-suggestions",
] as const;

export type AiTask = (typeof aiTasks)[number];

/**
 * Budget for one live call, retries and fallback models included. A provider
 * that never answers must not leave a page spinning, so exceeding this ends the
 * call with a `timeout` failure.
 */
export const defaultDeadlineMs = 30_000;

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
  /** Injected by tests that need to see which model each attempt used. */
  modelFor?: (target: ModelTarget) => LanguageModel;
  /** Overrides the default budget for the whole live call. */
  deadlineMs?: number;
  /** Overrides the retry schedule for this call. */
  backoff?: BackoffPolicy;
  /**
   * A caller's own cancellation. Passing one disables duplicate collapsing,
   * because one caller aborting must not cancel another caller's shared call.
   */
  signal?: AbortSignal;
}

/** The configured target first, then the fallbacks, each provider+model only once. */
export function orderedTargets(env: AppEnv): ModelTarget[] {
  const all: ModelTarget[] = [{ provider: env.provider, modelId: env.model }, ...env.fallbacks];
  const seen = new Set<string>();

  return all.filter((target) => {
    const key = `${target.provider}\u0000${target.modelId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function generateStructured<T>(
  model: LanguageModel,
  options: RunStructuredOptions<T>,
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
): Promise<T> {
  const { output } = await withDeadline(
    (deadlineSignal) =>
      generateText({
        model,
        instructions: options.instructions,
        output: Output.object({ schema: options.schema }),
        prompt: options.prompt,
        // The seam owns the retry schedule, so the SDK must not add its own
        // invisible one on top of it.
        maxRetries: 0,
        abortSignal: callerSignal === undefined ? deadlineSignal : AbortSignal.any([callerSignal, deadlineSignal]),
      }),
    timeoutMs,
    () => new AiFailureError("timeout", `The model did not answer within ${timeoutMs} ms.`),
  );

  return output;
}

async function callModels<T>(options: RunStructuredOptions<T>, env: AppEnv): Promise<T> {
  const policy = options.backoff ?? defaultBackoffPolicy;
  const deadlineMs = options.deadlineMs ?? defaultDeadlineMs;
  const targets = orderedTargets(env);
  const deadlineAt = Date.now() + deadlineMs;

  let failure: AiFailureError | undefined;
  // A quota answer belongs to one provider's key, not to the request. Another
  // provider is worth trying; the same provider is not, so its remaining targets
  // are skipped rather than spending requests that will be refused.
  const spentProviders = new Set<ModelTarget["provider"]>();

  for (const target of targets) {
    if (spentProviders.has(target.provider)) {
      continue;
    }

    const model = options.modelFor?.(target) ?? options.model ?? createModel(target, env.apiKeys);

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        throw new AiFailureError("timeout", `The model did not answer within ${deadlineMs} ms.`, { cause: failure });
      }

      try {
        return await generateStructured(model, options, remainingMs, options.signal);
      } catch (error) {
        failure = toAiFailure(error);

        // Anything unrecognised keeps its own error type: the routes tell an
        // unusable model answer apart from a transport failure by its shape.
        if (failure.kind === "unknown") {
          throw error;
        }

        // A deadline is the end of the path, not something to retry inside it;
        // offline and a rejected key are the same for every model in the list.
        if (failure.kind === "timeout" || failure.kind === "offline" || failure.kind === "config") {
          throw failure;
        }

        // Routing found no backing model for this one; the next model in the
        // list is the entire point of the list, so do not wait first.
        if (failure.kind === "provider" && failure.routing) {
          break;
        }

        // Quota is per provider, not per model: remember it so the other models
        // of this vendor are skipped, but keep retrying this one — a 429 is a
        // throttle, and `planRetry` is what decides whether waiting can help.
        if (failure.kind === "quota") {
          spentProviders.add(target.provider);
        }

        const retryAfterMs = failure.retryAfterSeconds === null ? null : failure.retryAfterSeconds * 1000;
        const plan = planRetry(attempt, retryAfterMs, policy);
        if (!plan.retry || plan.delayMs >= deadlineAt - Date.now()) {
          break;
        }

        await sleep(plan.delayMs);
      }
    }
  }

  throw failure ?? new AiFailureError("unknown", "The model call failed for an unknown reason.");
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

  const call = () => callModels(options, env);
  if (options.signal !== undefined) {
    return call();
  }

  // Identical concurrent requests share one model call. The collapser is
  // per-process; see `src/lib/ai/inflight.ts` for what that does and does not
  // cover.
  const key = [options.task, env.provider, env.model, options.instructions, options.prompt].join("\u0000");
  return inFlightModelRequests.run(key, call);
}
