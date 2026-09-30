import { computeInputHash } from "@/lib/match/hash";
import type { MatchReport } from "@/lib/match/types";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * Whether a report still describes what is stored.
 *
 * A report's `inputHash` covers the resume content, the posting, the theme, the
 * model and the AI mode. Accepting a suggestion changes the resume, so the
 * stored report is immediately about an earlier version of it: the same
 * arithmetic, the same evidence, a different document. Re-analysing is a cache
 * miss by design and produces a new report, but until the user does that, the
 * old score must not be presented as the score of what they now have.
 *
 * So the report page recomputes the hash from the records it just read and says
 * plainly when they no longer agree.
 */

export type Freshness = "current" | "changed" | "inputs-missing";

export async function reportFreshness(input: {
  report: MatchReport;
  resume: ResumeRecord | null;
  jd: JdRecord | null;
}): Promise<Freshness> {
  if (input.resume === null || input.jd === null) {
    return "inputs-missing";
  }

  const hash = await computeInputHash({
    resume: input.resume.resume,
    jd: input.jd.structured,
    themeId: input.resume.themeId,
    model: input.report.model,
    aiMode: input.report.aiMode,
  });

  return hash === input.report.inputHash ? "current" : "changed";
}
