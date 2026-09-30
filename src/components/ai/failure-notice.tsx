"use client";

import { Button } from "@/components/ui/button";
import type { AiFailureKind } from "@/lib/ai/failures";

/**
 * The terminal state of an AI-backed action, per failure class.
 *
 * Each class gets its own heading and its own next step, because they need
 * different things from the user: a spent allowance needs waiting, a provider
 * with no free model needs time, being offline needs a connection, and a
 * deadline needs a shorter job or another try. The diagnosis itself comes from
 * the server (`message`); nothing here is guessed at.
 */

interface FailureCopy {
  title: string;
  /** The next step for the user, given this class. */
  action: string;
  /** False when retrying cannot plausibly change anything. */
  canRetry: boolean;
}

const copyByKind: Record<AiFailureKind, FailureCopy> = {
  quota: {
    title: "The model request allowance is used up",
    action:
      "Wait for the provider's window to reopen and try again. The allowance is shared: 20 requests a minute, and 50 a day while the key's account holds under $10 of credit.",
    canRetry: true,
  },
  provider: {
    title: "No model provider would take the request",
    action:
      "The router found no free model for it, and neither did this server's fallback list. Trying again later is the only thing that can change it.",
    canRetry: true,
  },
  offline: {
    title: "This browser could not reach the server",
    action: "Check the connection and try again. Nothing was sent, and nothing was stored.",
    canRetry: true,
  },
  timeout: {
    title: "The analysis did not finish in time",
    action:
      "No answer arrived within the time allowed for one analysis, so the request was abandoned. Try again, or analyse a shorter posting.",
    canRetry: true,
  },
  config: {
    title: "The server's model credentials were rejected",
    action:
      "The provider refused this server's API key, so no analysis can run until the server's configuration is fixed. Retrying will not help.",
    canRetry: false,
  },
  unknown: {
    title: "The analysis could not be completed",
    action: "Try again. If it keeps failing, the server's model configuration needs attention.",
    canRetry: true,
  },
};

export interface AiFailureNoticeProps {
  kind: AiFailureKind;
  message: string;
  retryAfterSeconds: number | null;
  busy: boolean;
  onRetry: () => void;
}

export function AiFailureNotice({ kind, message, retryAfterSeconds, busy, onRetry }: AiFailureNoticeProps) {
  const { title, action, canRetry } = copyByKind[kind];

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
      data-failure-kind={kind}
      role="alert"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm leading-relaxed">{message}</p>
      {retryAfterSeconds === null ? null : (
        <p className="text-sm leading-relaxed">
          The provider asked for {retryAfterSeconds} second{retryAfterSeconds === 1 ? "" : "s"} before the next
          request.
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">{action}</p>
      <p className="text-xs text-muted-foreground">Reason: {kind}</p>
      {canRetry ? (
        <div>
          <Button className="h-11 w-full sm:w-auto" disabled={busy} onClick={onRetry} type="button" variant="outline">
            {busy ? "Trying again…" : "Try again"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
