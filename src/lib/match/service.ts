import type { Jd } from "@/lib/jd/schema";
import { runAtsChecks } from "@/lib/match/ats";
import { computeInputHash } from "@/lib/match/hash";
import { scoreCriteria } from "@/lib/match/rubric";
import type { MatchReport } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import type { StorageApi } from "@/lib/storage/types";
import { renderResumeForThemeId } from "@/lib/tex/generate";

/**
 * The analysis itself, and its cache.
 *
 * Order matters: the input hash is checked *before* the model is asked
 * anything, so re-running an unchanged pair returns the stored report and
 * spends no model request at all. Everything after the evidence call is
 * arithmetic and formatting we own, which is what lets a report explain itself.
 */

/** The model returned nothing to score; there is no number to show and none is invented. */
export class UnanalysableMatchError extends Error {
  constructor() {
    super("The analysis returned no criteria, so there was nothing to score.");
    this.name = "UnanalysableMatchError";
  }
}

export interface AnalyzeMatchInput {
  resumeId: string;
  jdId: string;
  resume: Resume;
  jd: Jd;
  themeId: string | null;
  model: string;
  aiMode: "mock" | "live";
}

export interface AnalyzeMatchDeps {
  storage: Pick<StorageApi, "findReportByInputHash" | "putReport">;
  /** Performs the model call. Called only on a cache miss. */
  evidence: (input: AnalyzeMatchInput) => Promise<{ criteria: MatchReport["criteria"]; summary: string | null }>;
  now?: () => Date;
  newId?: () => string;
}

export interface AnalyzeMatchOutcome {
  report: MatchReport;
  /** True when a stored report was reused and no model request was made. */
  cached: boolean;
}

export async function analyzeMatch(input: AnalyzeMatchInput, deps: AnalyzeMatchDeps): Promise<AnalyzeMatchOutcome> {
  const inputHash = await computeInputHash(input);

  const stored = await deps.storage.findReportByInputHash(inputHash);
  if (stored) {
    return { report: stored, cached: true };
  }

  const evidence = await deps.evidence(input);
  const rubric = scoreCriteria(evidence.criteria);
  if (!rubric.analysable) {
    // Nothing is stored: a report with no criteria could only show a number the
    // evidence does not support.
    throw new UnanalysableMatchError();
  }

  const report: MatchReport = {
    id: (deps.newId ?? (() => crypto.randomUUID()))(),
    resumeId: input.resumeId,
    jdId: input.jdId,
    rubricVersion: rubric.rubricVersion,
    score: rubric.score,
    criteria: evidence.criteria,
    atsChecks: runAtsChecks({ resume: input.resume, tex: renderResumeForThemeId(input.resume, input.themeId).tex }),
    summary: evidence.summary,
    inputHash,
    model: input.model,
    aiMode: input.aiMode,
    createdAt: (deps.now ?? (() => new Date()))().toISOString(),
  };

  await deps.storage.putReport(report);

  return { report, cached: false };
}
