import { APICallError } from "ai";

import { parseRetryAfter } from "@/lib/ai/backoff";

/**
 * The failure vocabulary for AI-backed paths.
 *
 * Every way a model call can end badly is reduced to one kind, on the server and
 * in the browser, because the UI has to tell "the quota is spent" apart from
 * "the provider had no model" apart from "you are offline" apart from "nothing
 * answered in time" and offer a different next step for each. Kinds that are not
 * one of those four (a rejected key, an unrecognised error) still get a kind, so
 * nothing has to be guessed at the edge.
 */

export const aiFailureKinds = ["quota", "provider", "offline", "timeout", "config", "unknown"] as const;

export type AiFailureKind = (typeof aiFailureKinds)[number];

/** Where trying again can plausibly change the answer. */
const retryableKinds: Record<AiFailureKind, boolean> = {
  quota: true,
  provider: true,
  offline: true,
  timeout: true,
  config: false,
  unknown: false,
};

export function isAiFailureKind(value: unknown): value is AiFailureKind {
  return typeof value === "string" && (aiFailureKinds as readonly string[]).includes(value);
}

export interface AiFailureOptions {
  /** What the provider asked us to wait, when it said. */
  retryAfterSeconds?: number | null;
  /** True for a 503: the provider could not route the request to any backing model. */
  routing?: boolean;
  cause?: unknown;
}

export class AiFailureError extends Error {
  readonly kind: AiFailureKind;
  /** True when a retry from the user could plausibly succeed. */
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly routing: boolean;

  constructor(kind: AiFailureKind, message: string, options: AiFailureOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AiFailureError";
    this.kind = kind;
    this.retryable = retryableKinds[kind];
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.routing = options.routing ?? false;
  }
}

/**
 * The error and whatever it was caused by, nearest first. Cycles cannot loop it.
 *
 * Exported because logging needs the same walk: the useful part of a provider
 * failure is usually nested, since the SDK wraps the answer and the seam wraps
 * the SDK.
 */
export function* errorCauseChain(error: unknown): Generator<unknown> {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    yield current;
    current = "cause" in current ? current.cause : undefined;
  }
}

/** An abort. On these paths that is the deadline firing, or the caller cancelling. */
function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  return error.name === "TimeoutError" || error.name === "AbortError";
}

/**
 * A transport failure rather than an answer from the provider. Node's fetch
 * reports these as a `TypeError` ("fetch failed") with the socket error nested
 * in `cause`; a browser fetch reports "Failed to fetch".
 */
function isTransportError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  const cause = "cause" in error ? error.cause : undefined;
  const text = `${error.message} ${cause instanceof Error ? cause.message : String(cause ?? "")}`;
  return /fetch failed|failed to fetch|network|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|socket hang up/i.test(
    text,
  );
}

/** The `Retry-After` header in whole seconds, as the provider sent it. */
function retryAfterSecondsFrom(headers: Record<string, string> | undefined): number | null {
  if (headers === undefined) {
    return null;
  }

  const name = Object.keys(headers).find((header) => header.toLowerCase() === "retry-after");
  const parsed = name === undefined ? null : parseRetryAfter(headers[name]);

  return parsed === null ? null : Math.ceil(parsed / 1000);
}

function failureFromApiCall(error: APICallError): AiFailureError {
  const status = error.statusCode;
  const retryAfterSeconds = retryAfterSecondsFrom(error.responseHeaders);

  // 402 is "out of credit"; the next step is the same as for a 429: wait.
  if (status === 429 || status === 402) {
    return new AiFailureError(
      "quota",
      `The provider refused the request (HTTP ${status}): this key's request allowance is used up.`,
      { retryAfterSeconds, cause: error },
    );
  }

  if (status === 401 || status === 403) {
    return new AiFailureError("config", `The provider rejected this server's credentials (HTTP ${status}).`, {
      cause: error,
    });
  }

  if (status !== undefined && status >= 500) {
    return new AiFailureError("provider", `The provider could not serve the request (HTTP ${status}).`, {
      retryAfterSeconds,
      // 503 is the provider saying it found no backing model for this request.
      routing: status === 503,
      cause: error,
    });
  }

  return new AiFailureError("unknown", error.message, { cause: error });
}

/** Reduces a thrown provider or transport error to one failure kind. */
export function toAiFailure(error: unknown): AiFailureError {
  if (error instanceof AiFailureError) {
    return error;
  }

  for (const candidate of errorCauseChain(error)) {
    if (isAbortError(candidate)) {
      return new AiFailureError("timeout", "The model call was aborted before it answered.", { cause: error });
    }
    if (APICallError.isInstance(candidate)) {
      if (candidate.statusCode !== undefined) {
        return failureFromApiCall(candidate);
      }
      // No status means the provider never answered: the reason is further down.
      continue;
    }
    if (isTransportError(candidate)) {
      return new AiFailureError("offline", "The model provider could not be reached from this server.", {
        cause: error,
      });
    }
  }

  return new AiFailureError("unknown", error instanceof Error ? error.message : String(error), { cause: error });
}

/**
 * Classifies a failure of a request from the browser to this app's own route.
 * A route failure the server already classified passes through unchanged; a
 * fetch rejection is the browser failing to reach the server.
 */
export function toRequestFailure(error: unknown): AiFailureError {
  if (error instanceof AiFailureError) {
    return error;
  }

  for (const candidate of errorCauseChain(error)) {
    if (isAbortError(candidate)) {
      return new AiFailureError(
        "timeout",
        "The analysis was abandoned because no answer arrived within the time allowed for it.",
        { cause: error },
      );
    }
    if (isTransportError(candidate)) {
      return new AiFailureError("offline", "The request never reached the server.", { cause: error });
    }
  }

  return new AiFailureError("unknown", error instanceof Error ? error.message : String(error), { cause: error });
}
