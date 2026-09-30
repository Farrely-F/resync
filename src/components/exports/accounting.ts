import type { DocumentRecord } from "@/lib/documents/types";
import type { MatchReport } from "@/lib/match/types";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * Storage accounting for the user's own data.
 *
 * `navigator.storage.estimate()` reports one number for the whole origin, which
 * mixes the cached TeX engine with everything else and cannot be split per store.
 * So the figure under Settings is measured here instead: each stored record is
 * serialised and counted, which makes the number explainable ("what you can see
 * is what is counted") and attributable to a store.
 *
 * What this deliberately does not count: IndexedDB's own per-record overhead and
 * the browser's bookkeeping. The caveat is stated in the UI rather than baked
 * into the number, because a guessed overhead would be a fabricated figure.
 */

/** UTF-8 byte length of a record as the browser would serialise it. */
export function jsonBytes(value: unknown): number {
  const text = JSON.stringify(value);
  return text === undefined ? 0 : new TextEncoder().encode(text).byteLength;
}

export interface StoreSize {
  count: number;
  bytes: number;
}

export interface StorageBreakdown {
  resumes: StoreSize;
  jds: StoreSize;
  reports: StoreSize;
  documents: StoreSize;
  /** Sum of the stores above, measured from the records themselves. */
  totalBytes: number;
  /** Every stored record across those stores. */
  totalRecords: number;
}

function sizeOf(records: readonly unknown[]): StoreSize {
  return { count: records.length, bytes: records.reduce<number>((sum, record) => sum + jsonBytes(record), 0) };
}

export function accountStorage(input: {
  resumes: readonly ResumeRecord[];
  jds: readonly JdRecord[];
  reports: readonly MatchReport[];
  documents: readonly DocumentRecord[];
}): StorageBreakdown {
  const resumes = sizeOf(input.resumes);
  const jds = sizeOf(input.jds);
  const reports = sizeOf(input.reports);
  const documents = sizeOf(input.documents);

  return {
    resumes,
    jds,
    reports,
    documents,
    totalBytes: resumes.bytes + jds.bytes + reports.bytes + documents.bytes,
    totalRecords: resumes.count + jds.count + reports.count + documents.count,
  };
}
