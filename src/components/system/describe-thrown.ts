/**
 * Reads a value an error boundary caught.
 *
 * The boundary's own types call the caught value `unknown`, and that is the
 * honest type: React forwards whatever was thrown, which need not be an `Error`
 * — a rejected string, or a plain object, reaches the page too. Narrowing once
 * here is what keeps the error page from failing on the error it is there to
 * report.
 *
 * A server-rendered failure arrives as an `Error` whose message has already
 * been replaced with a generic one, carrying `digest` as the only way back to
 * the line in the server log.
 */
export function describeThrown(value: unknown): { message: string | null; digest: string | null } {
  if (!(value instanceof Error)) {
    const message = typeof value === "string" ? value.trim() : "";
    return { message: message || null, digest: null };
  }

  const digest = (value as Error & { digest?: unknown }).digest;
  return {
    message: value.message.trim() || null,
    digest: typeof digest === "string" && digest ? digest : null,
  };
}
