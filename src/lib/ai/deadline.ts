/**
 * A wall-clock deadline for one model call.
 *
 * The provider call is raced against a timer, so a provider that never answers
 * ends the request instead of leaving it hanging. The abort signal is passed on
 * as well, so the underlying fetch is cancelled rather than left running: the
 * race alone would only stop us waiting for it.
 */
export function withDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  const controller = new AbortController();

  const { promise: expiry, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => {
    // The caller's error settles the race first; the abort then stops the fetch.
    reject(onTimeout());
    controller.abort();
  }, Math.max(0, timeoutMs));

  const started = run(controller.signal);

  // The race may already have been lost, in which case this rejection would
  // surface as an unhandled one; the caller has its own error by then.
  started.catch(() => undefined);

  return Promise.race([started, expiry]).finally(() => clearTimeout(timer));
}
