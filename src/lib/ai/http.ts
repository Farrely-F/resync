import type { AiFailureKind } from "@/lib/ai/failures";
import { EnvError } from "@/lib/env";

/**
 * One wire vocabulary for a classified model failure.
 *
 * Both AI routes answer a failure with this shape and these statuses, so the
 * client has a single classification to switch on. The *copy* stays with each
 * feature because it legitimately differs (a suggestion run makes two model
 * calls, an analysis makes one); the status and the shape do not, so they live
 * here and a parity test holds both routes to them.
 */
export const failureStatusByKind: Record<AiFailureKind, number> = {
  quota: 429,
  provider: 503,
  offline: 504,
  timeout: 504,
  config: 500,
  unknown: 502,
};

/** The body of a classified failure, as both routes send it. */
export interface ClassifiedFailureBody {
  error: {
    reason: AiFailureKind;
    message: string;
    kind: AiFailureKind;
    retryAfterSeconds: number | null;
  };
}

/**
 * Turns a broken environment into the same failure shape the client already
 * renders, instead of a bare 500 with an empty body.
 *
 * This matters because the likeliest cause is a stale variable in `.env.local`
 * after a rename: the useful part is the message, and a blank response throws it
 * away exactly when it is needed.
 */
export function configFailureFrom(error: unknown): { status: number; body: ClassifiedFailureBody } | null {
  if (!(error instanceof EnvError)) {
    return null;
  }

  return {
    status: failureStatusByKind.config,
    body: {
      error: {
        reason: "config",
        message: `${error.issues.join("; ")}. Fix .env.local and restart the server; see .env.example.`,
        kind: "config",
        retryAfterSeconds: null,
      },
    },
  };
}
