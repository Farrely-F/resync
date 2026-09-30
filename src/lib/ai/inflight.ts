/**
 * Collapses concurrent duplicate model requests into a single model call.
 *
 * Scope, stated plainly: the map below is module state in **one running server
 * process**. Next.js serves one process per server instance, and development
 * spawns its own, so two requests collapse only when they reach the same
 * process — this is not shared state, not a lock, and it neither survives a
 * restart nor coordinates across instances or deployments.
 *
 * Only in-flight work is collapsed: an entry is dropped the moment its promise
 * settles, so the same request made later is sent again. Avoiding repeat work
 * over time is the job of the stored-report cache (`src/lib/match/service.ts`),
 * not of this module.
 */

export interface InFlightCollapser {
  /** Returns the in-flight call for `key`, or starts `call` if there is none. */
  run<T>(key: string, call: () => Promise<T>): Promise<T>;
  /** Entries currently in flight. A test seam; nothing in the app reads it. */
  size(): number;
}

export function createInFlightCollapser(): InFlightCollapser {
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    run<T>(key: string, call: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key) as Promise<T> | undefined;
      if (existing !== undefined) {
        return existing;
      }

      const started = call();
      inFlight.set(key, started);

      const release = () => {
        if (inFlight.get(key) === started) {
          inFlight.delete(key);
        }
      };
      // A rejection must reach the caller, but it must not keep the entry alive.
      started.then(release, release);

      return started;
    },
    size: () => inFlight.size,
  };
}

/** The process-wide collapser used by the AI seam. */
export const inFlightModelRequests = createInFlightCollapser();
