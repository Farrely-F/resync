import { APICallError } from "ai";

import { AiFailureError, errorCauseChain } from "@/lib/ai/failures";
import { cut, type LogFields } from "@/lib/log";

/**
 * Turning an AI failure into log fields.
 *
 * The seam classifies a failure into one of six kinds, and that classification is
 * what the UI acts on — but it is not what a person needs at 2am. What they need
 * is the provider's own answer: the status, the URL, and the body that says which
 * schema property was rejected. So a failure logs both: the kind the code decided
 * on, and the provider's words underneath it.
 *
 * `requestBodyValues` is deliberately not copied. It holds the request the SDK
 * sent, which on these paths is the reader's resume text — and the one thing this
 * product promises about that text is that it does not travel anywhere it was not
 * asked to go, a log file included.
 */

/**
 * A provider error, identified by `APICallError.isInstance` *or* by shape.
 *
 * The class check alone is not enough: a provider package can carry its own copy
 * of `@ai-sdk/provider`, and its errors then fail an `instanceof` against this
 * one — which is how a rejection with a status, a URL and a body came out of the
 * log as a bare message. The shape check is deliberately narrow: the fields are
 * the SDK's, not a guess at some other error's.
 */
function isProviderError(error: unknown): error is APICallError {
  if (APICallError.isInstance(error)) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as Partial<APICallError>;
  return typeof candidate.url === "string" && typeof candidate.isRetryable === "boolean";
}

/** One error in a cause chain, reduced to what is safe and useful to log. */
function describeOne(error: unknown): LogFields {
  if (isProviderError(error)) {
    return {
      name: error.name,
      message: cut(error.message),
      statusCode: error.statusCode ?? null,
      url: error.url,
      isRetryable: error.isRetryable,
      responseHeaders: error.responseHeaders ?? null,
      responseBody: error.responseBody === undefined ? null : cut(error.responseBody),
      data: error.data === undefined ? null : cut(JSON.stringify(error.data)),
    };
  }

  if (error instanceof AiFailureError) {
    return {
      name: error.name,
      message: cut(error.message),
      kind: error.kind,
      retryable: error.retryable,
      routing: error.routing,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  if (error instanceof Error) {
    return { name: error.name, message: cut(error.message), stack: cut(error.stack ?? "") };
  }

  return { value: cut(String(error)) };
}

/** The whole chain, nearest first, as one field: `error: { chainLength, errors: [...] }`. */
export function describeError(error: unknown): LogFields {
  const chain = [...errorCauseChain(error)];

  if (chain.length === 0) {
    // A thrown string or number has no cause chain, and `{ errors: [] }` would be
    // a failure line with nothing in it.
    return { chainLength: 1, errors: [describeOne(error)] };
  }

  return {
    chainLength: chain.length,
    errors: chain.map(describeOne),
  };
}
