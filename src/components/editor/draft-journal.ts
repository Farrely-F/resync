import type { ResumeRecord } from "@/lib/storage/types";

/**
 * A synchronous, last-resort copy of the record the editor is showing.
 *
 * IndexedDB is asynchronous, and a transaction started during `pagehide` does not
 * survive the navigation that follows it. That is measured, not assumed: an edit
 * made inside the debounce window and then swallowed by an immediate reload was
 * gone from storage. `localStorage` writes are synchronous and are committed
 * before the page goes away, so the unload path writes one there and the next
 * load replays it.
 *
 * Only the unload path writes, so the per-keystroke cost that the debounce exists
 * to avoid is not reintroduced, and the journal is taken (read and cleared) on
 * load, so a stale copy cannot outlive the session that wrote it.
 */

/** The slice of the Storage API the journal uses, so a test can supply its own. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function draftKeyFor(resumeId: string): string {
  return `resync:draft:${resumeId}`;
}

/** Best-effort: storage can be full or blocked, and the debounced write is the real path. */
export function writeDraft(key: string, value: unknown, storage: DraftStorage = localStorage): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do here: the failure is already visible through the save status.
  }
}

/**
 * Reads the draft without clearing it.
 *
 * Reading and clearing are deliberately separate. React runs an effect twice in
 * development (mount, cleanup, mount again) and cancels the first run's
 * continuation, so a combined read-and-clear loses the draft to the run that was
 * thrown away — measured: the recovery silently did nothing. Both runs read the
 * same value here, and only the run that survives clears it.
 */
export function readDraft(key: string, storage: DraftStorage = localStorage): ResumeRecord | null {
  let raw: string | null;

  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as ResumeRecord;
  } catch {
    return null;
  }
}

/** Called once the draft has been decided on, so it cannot outlive its session. */
export function clearDraft(key: string, storage: DraftStorage = localStorage): void {
  try {
    storage.removeItem(key);
  } catch {
    // A draft that cannot be cleared is still ignored once storage is newer than it.
  }
}

/**
 * The record to open with, given what storage holds and what the journal held.
 *
 * The draft only wins when it belongs to this resume and is strictly newer: an
 * older draft is left behind by a hide-then-edit session, and a draft for a
 * resume that storage no longer has must not bring a deleted resume back.
 */
export function preferNewerRecord(
  stored: ResumeRecord | null,
  draft: ResumeRecord | null,
  resumeId: string,
): ResumeRecord | null {
  if (draft === null || draft.id !== resumeId || stored === null) {
    return stored;
  }

  return draft.updatedAt > stored.updatedAt ? draft : stored;
}
