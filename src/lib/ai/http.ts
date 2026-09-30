import type { AiFailureKind } from "@/lib/ai/failures";

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
