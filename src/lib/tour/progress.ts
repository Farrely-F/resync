/**
 * Which tours have been seen.
 *
 * A tour that reappears is a tour that gets dismissed without being read, so each
 * one is shown once on its own and then only when asked for. The record is a
 * versioned key in localStorage, for the same reason consent is: a value written
 * by an older build, or edited by hand, is treated as nothing seen rather than
 * trusted — the cost of a tour appearing twice is far below the cost of one that
 * never appears because a stale record said it had.
 */

export const tourStorageKey = "resync.tour-progress.v1";

const tourStorageVersion = 1;

/** The two methods of `localStorage` this module needs, so a test can supply its own. */
export interface TourStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface TourProgress {
  version: number;
  /** Tour id to the ISO timestamp it was finished or skipped at. */
  seen: Record<string, string>;
}

function defaultStore(): TourStore | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function parse(raw: string | null): TourProgress {
  const empty: TourProgress = { version: tourStorageVersion, seen: {} };

  if (!raw) {
    return empty;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TourProgress>;
    if (parsed.version !== tourStorageVersion || typeof parsed.seen !== "object" || parsed.seen === null) {
      return empty;
    }

    const seen: Record<string, string> = {};
    for (const [id, at] of Object.entries(parsed.seen)) {
      if (typeof at === "string") {
        seen[id] = at;
      }
    }
    return { version: tourStorageVersion, seen };
  } catch {
    return empty;
  }
}

export function hasSeenTour(id: string, store: TourStore | null = defaultStore()): boolean {
  if (store === null) {
    return false;
  }

  return typeof parse(store.getItem(tourStorageKey)).seen[id] === "string";
}

/**
 * Records that a tour is done — finished or skipped, which are the same thing to
 * a reader who does not want to see it again.
 */
export function markTourSeen(id: string, at = new Date().toISOString(), store: TourStore | null = defaultStore()): void {
  if (store === null) {
    return;
  }

  const progress = parse(store.getItem(tourStorageKey));
  progress.seen[id] = at;
  store.setItem(tourStorageKey, JSON.stringify(progress));
}

/** Forgets every tour, so the settings page can offer them again from scratch. */
export function forgetTours(store: TourStore | null = defaultStore()): void {
  store?.setItem(tourStorageKey, JSON.stringify({ version: tourStorageVersion, seen: {} }));
}
