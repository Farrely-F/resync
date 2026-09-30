import { formatBytes } from "@/lib/compile/assets";

/**
 * The sentence shown in every destructive confirmation.
 *
 * Copy lives in a pure function so the rule from the ticket — a confirmation
 * names the consequence *and* the count — is checkable by a test rather than by
 * reading three separate dialogs. Sizes come from the same measurement the
 * storage meter uses, so a prompt and the meter can never disagree about how much
 * a record weighs.
 */

export type DeleteKind = "resume" | "jd" | "report";

const descriptions: Record<DeleteKind, { noun: string; contents: string }> = {
  resume: { noun: "stored resume", contents: "its parsed data and the extracted source text" },
  jd: { noun: "stored job description", contents: "its structured fields and the text it was read from" },
  report: { noun: "stored match report", contents: "its criteria, verdicts and formatting checks" },
};

function count(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Reports referencing the deleted record survive it; saying so is part of the consequence. */
function remainingReports(reports: number): string {
  return reports === 0
    ? ""
    : ` ${count(reports, "match report")} that used it ${reports === 1 ? "stays" : "stay"}.`;
}

export interface DeletionFacts {
  /** The record's measured size, as the storage meter counts it. */
  bytes: number;
  /** Reports that point at this record and are left behind by the deletion. */
  dependentReports: number;
}

export function describeDeletion(kind: DeleteKind, name: string, facts: DeletionFacts): string {
  const { noun, contents } = descriptions[kind];

  return `Delete “${name}”? ${count(1, noun)} (${formatBytes(facts.bytes)}) is removed from this browser, along with ${contents}. This cannot be undone.${remainingReports(facts.dependentReports)}`;
}

export interface ClearAllFacts {
  resumes: number;
  jds: number;
  reports: number;
  bytes: number;
}

/** What clearing everything destroys, in the same words the store breakdown uses. */
export function describeClearAll(facts: ClearAllFacts): string {
  const records = facts.resumes + facts.jds + facts.reports;

  return `Delete all user data? ${count(records, "stored record")} — ${count(facts.resumes, "resume")}, ${count(
    facts.jds,
    "job description",
  )} and ${count(facts.reports, "match report")}, ${formatBytes(
    facts.bytes,
  )} in total — is removed from this browser. This cannot be undone.`;
}
