/**
 * How far the reader has got through the guide.
 *
 * A step is finished in one of two ways. Where the flow leaves a record behind —
 * a resume, a posting — the step is done when that record exists, and no mark can
 * say otherwise; the guide reads the same store the rest of the app writes to, so
 * adding a resume anywhere ticks the step here. Every other step is done when the
 * reader marks it, which is a claim about their own reading rather than about the
 * app.
 *
 * The marks live under a versioned key in localStorage, for the same reason
 * consent and tour progress do: a value written by an older build, or edited by
 * hand, is treated as nothing done rather than trusted. A step wrongly shown as
 * done is the failure worth avoiding — it is the one that stops the reader.
 */

export const guideStorageKey = "resync.guide-progress.v1";

const guideStorageVersion = 1;

/** The steps, in the order the flow runs. */
export type GuideStepId = "intro" | "resume" | "posting" | "match" | "report" | "prepare";

export const guideStepIds: readonly GuideStepId[] = ["intro", "resume", "posting", "match", "report", "prepare"];

/** The two methods of `localStorage` this module needs, so a test can supply its own. */
export interface GuideStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface GuideProgress {
  version: number;
  /** Step id to the ISO timestamp it was marked done at. */
  done: Partial<Record<GuideStepId, string>>;
}

/** What the browser already knows, and what decides a step without the reader. */
export interface GuideFacts {
  resumes: number;
  postings: number;
}

/** Where a step's done state came from: a stored record, the reader's mark, or nowhere. */
export type GuideStepSource = "stored" | "marked" | null;

export interface GuideStepState {
  id: GuideStepId;
  done: boolean;
  source: GuideStepSource;
}

function defaultStore(): GuideStore | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function isStepId(value: string): value is GuideStepId {
  return (guideStepIds as readonly string[]).includes(value);
}

function parse(raw: string | null): GuideProgress {
  const empty: GuideProgress = { version: guideStorageVersion, done: {} };

  if (!raw) {
    return empty;
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return empty;
  }

  if (typeof value !== "object" || value === null) {
    return empty;
  }

  const record = value as Partial<GuideProgress>;
  if (record.version !== guideStorageVersion || typeof record.done !== "object" || record.done === null) {
    return empty;
  }

  // Unknown ids are dropped rather than kept: a step id this build does not have
  // says nothing about any step it does.
  const done: Partial<Record<GuideStepId, string>> = {};
  for (const [id, at] of Object.entries(record.done)) {
    if (isStepId(id) && typeof at === "string") {
      done[id] = at;
    }
  }

  return { version: guideStorageVersion, done };
}

/** The steps the reader marked done, in the order the flow runs. */
export function readMarks(store: GuideStore | null = defaultStore()): GuideStepId[] {
  if (store === null) {
    return [];
  }

  const { done } = parse(store.getItem(guideStorageKey));
  return guideStepIds.filter((id) => typeof done[id] === "string");
}

/** Records a step as done and returns the marks that remain. */
export function markStepDone(
  id: GuideStepId,
  at: string = new Date().toISOString(),
  store: GuideStore | null = defaultStore(),
): GuideStepId[] {
  const progress = parse(store?.getItem(guideStorageKey) ?? null);
  progress.done[id] = at;
  store?.setItem(guideStorageKey, JSON.stringify(progress));
  return readMarks(store);
}

/** Takes a mark back, for a step the reader marked by mistake. */
export function unmarkStep(
  id: GuideStepId,
  store: GuideStore | null = defaultStore(),
): GuideStepId[] {
  const progress = parse(store?.getItem(guideStorageKey) ?? null);
  delete progress.done[id];
  store?.setItem(guideStorageKey, JSON.stringify(progress));
  return readMarks(store);
}

/**
 * The whole list, with each step's state resolved against what is stored.
 *
 * A stored record wins over a mark: a resume on the device is the fact the step
 * asks about, and undoing the mark could not undo it.
 */
export function stepStates(
  facts: GuideFacts,
  marked: readonly GuideStepId[],
): GuideStepState[] {
  const stored: Partial<Record<GuideStepId, boolean>> = {
    resume: facts.resumes > 0,
    posting: facts.postings > 0,
  };

  return guideStepIds.map((id) => {
    if (stored[id] === true) {
      return { id, done: true, source: "stored" as const };
    }
    if (marked.includes(id)) {
      return { id, done: true, source: "marked" as const };
    }
    return { id, done: false, source: null };
  });
}
