import { deriveResumeTitle } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * Tailored copies: a resume adjusted for one posting, kept apart from the
 * baseline it came from.
 *
 * Accepting a suggestion used to rewrite the one stored resume, so tailoring for
 * one company changed the resume used for the next. A copy is made the first
 * time a suggestion is accepted for a posting, and every later one for the same
 * posting lands in that copy. The baseline is never written.
 *
 * A copy is an ordinary resume record, which is why it opens in the normal
 * editor with every theme and page setting. Two optional fields say where it
 * came from; a record without them is a baseline, so nothing stored before
 * copies existed needs a migration.
 */

export function isTailoredCopy(record: ResumeRecord): boolean {
  return record.derivedFromId !== undefined;
}

/** The copy of `baselineId` made for `jdId`, if one exists. */
export function findTailoredCopy(
  records: readonly ResumeRecord[],
  baselineId: string,
  jdId: string,
): ResumeRecord | null {
  return records.find((record) => record.derivedFromId === baselineId && record.forJdId === jdId) ?? null;
}

/** A structured copy of a baseline, in memory only: the caller decides whether it is stored. */
export function buildTailoredCopy(
  baseline: ResumeRecord,
  jdId: string,
  id: string,
  now: string,
): ResumeRecord {
  return {
    ...baseline,
    id,
    title: deriveResumeTitle(baseline.resume),
    // A copy is generated from its data; hand-edited LaTeX stays with the baseline.
    mode: "structured",
    manualTex: null,
    derivedFromId: baseline.id,
    forJdId: jdId,
    createdAt: now,
    updatedAt: now,
  };
}

/** "Tailored for Senior Engineer — Acme", or null for a baseline. The one wording every list and header uses. */
export function tailoredForLabel(record: ResumeRecord, jdTitles: ReadonlyMap<string, string>): string | null {
  if (!isTailoredCopy(record)) {
    return null;
  }

  const job = record.forJdId === undefined ? undefined : jdTitles.get(record.forJdId);
  return `Tailored for ${job ?? "a deleted job description"}`;
}

/** Baselines first, copies after: a picker should start from an original, not whatever was edited last. */
export function baselinesFirst(records: readonly ResumeRecord[]): ResumeRecord[] {
  return [...records.filter((record) => !isTailoredCopy(record)), ...records.filter(isTailoredCopy)];
}
