"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { browserUsageStore, recordModelRequest } from "@/lib/ai/usage";
import type { CriterionKind, MatchReport } from "@/lib/match/types";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";
import { getStorage } from "@/lib/storage";
import { requestSuggestions } from "@/lib/suggestions/api";
import { applyRefusalMessages } from "@/lib/suggestions/apply";
import { browserDecisionStore, clearDecision, readDecisions, recordDecision, type DecisionMap } from "@/lib/suggestions/decisions";
import { acceptSuggestion } from "@/lib/suggestions/service";
import { describeTarget, readTargetText } from "@/lib/suggestions/targets";
import type { DropReason, DroppedSuggestion, Suggestion } from "@/lib/suggestions/types";

/**
 * The adjustments section of a report.
 *
 * Everything here is a proposal until the user clicks Accept: generating reads
 * the report's criteria and the resume and writes nothing, rejecting writes
 * nothing to the resume at all, and accepting goes through `acceptSuggestion`,
 * which refuses a hand-edited resume and a target whose text has moved on.
 *
 * The section is deliberately explicit about what the user did not see. The
 * grounding check drops proposals before they arrive here, and the count is on
 * screen — including the case where it dropped all of them.
 */

const kindLabels: Record<CriterionKind, string> = {
  required: "Required",
  "nice-to-have": "Nice to have",
  seniority: "Seniority",
  domain: "Domain",
  education: "Education",
};

const verdictLabels = { met: "met", partial: "partly met", missing: "missing" } as const;

const dropReasonLabels: Record<DropReason, string> = {
  "unknown-target": "Target is not part of the resume",
  "unknown-criterion": "Criterion is not on this report",
  "already-met": "Requirement already met",
  "no-change": "Would change nothing",
  duplicate: "Repeated proposal",
  "not-grounded": "Not supported by your resume",
  "no-verdict": "Not checked by the grounding pass",
};

interface GeneratedUnder {
  model: string;
  aiMode: string;
  modelCalls: number;
}

function DropRow({ drop }: { drop: DroppedSuggestion }) {
  return (
    <li className="flex flex-col gap-1 border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium">
        {dropReasonLabels[drop.reason]}
        {drop.targetId === null ? null : <span className="font-normal text-muted-foreground"> · {drop.targetId}</span>}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground break-words">{drop.proposed}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{drop.detail}</p>
    </li>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  report: MatchReport;
  resume: ResumeRecord | null;
  decision: "accepted" | "rejected" | undefined;
  busy: boolean;
  applyError: string | null;
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
}

function SuggestionCard({ suggestion, report, resume, decision, busy, applyError, onAccept, onReject }: SuggestionCardProps) {
  const criterion = report.criteria.find((entry) => entry.id === suggestion.criterionId);
  const manual = resume?.mode === "manual";
  const stale = resume !== null && readTargetText(resume.resume, suggestion.target) !== suggestion.current;
  const accepted = decision === "accepted";
  const blocked = manual === true ? applyRefusalMessages["manual-mode"] : stale ? applyRefusalMessages["stale-target"] : null;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <p className="text-sm font-medium">{suggestion.requirement}</p>
      <p className="text-xs text-muted-foreground">
        {criterion === undefined
          ? "This report no longer lists the criterion it referenced"
          : `${kindLabels[criterion.kind]} · ${verdictLabels[criterion.verdict]}`}
        {" · "}
        {resume === null ? suggestion.targetId : describeTarget(resume.resume, suggestion.target)}
      </p>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Now</p>
        <p className="rounded-md bg-muted/50 p-2 text-xs leading-relaxed break-words">{suggestion.current}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Proposed</p>
        <p className="rounded-md border border-border/60 p-2 text-xs leading-relaxed break-words">{suggestion.proposed}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">Why: {suggestion.rationale}</p>

      {blocked === null ? null : <p className="text-xs leading-relaxed text-muted-foreground">{blocked}</p>}

      {applyError === null ? null : (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs leading-relaxed" role="alert">
          {applyError}
        </p>
      )}

      {accepted ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Accepted and stored in your resume. The report above was computed before this change.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11 flex-1 sm:flex-none"
            disabled={busy || blocked !== null}
            onClick={() => onAccept(suggestion)}
            title={blocked ?? undefined}
            type="button"
          >
            {busy ? "Applying…" : "Accept"}
          </Button>
          <Button
            className="h-11 flex-1 sm:flex-none"
            disabled={busy}
            onClick={() => onReject(suggestion)}
            type="button"
            variant="outline"
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

export function SuggestionsPanel({
  report,
  resume,
  jd,
  onResumeChanged,
}: {
  report: MatchReport;
  resume: ResumeRecord | null;
  jd: JdRecord | null;
  onResumeChanged: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dropped, setDropped] = useState<DroppedSuggestion[]>([]);
  const [groundingDropped, setGroundingDropped] = useState(0);
  const [generatedUnder, setGeneratedUnder] = useState<GeneratedUnder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<{ id: string; message: string } | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const manual = resume?.mode === "manual";

  async function generate() {
    if (resume === null || jd === null) {
      return;
    }

    setWorking(true);
    setError(null);
    setApplyError(null);

    const usage = browserUsageStore();
    const decisionStore = browserDecisionStore();

    try {
      const result = await requestSuggestions({ resume: resume.resume, jd: jd.structured, criteria: report.criteria });

      // Two model calls when there was something to check, one when there was not;
      // counted where the request was started, like the match workspace counts its own.
      if (usage !== null) {
        for (let call = 0; call < result.modelCalls; call += 1) {
          recordModelRequest(usage, new Date());
        }
      }

      // Decisions are read here rather than on mount: this is the only moment
      // proposals appear, so a reload cannot resurrect a rejected proposal as an
      // offer the user has to refuse again.
      setDecisions(readDecisions(decisionStore, report.id));
      setSuggestions(result.suggestions);
      setDropped(result.dropped);
      setGroundingDropped(result.groundingDropped);
      setGeneratedUnder({ model: result.model, aiMode: result.aiMode, modelCalls: result.modelCalls });
      setGenerated(true);
    } catch (caught) {
      if (usage !== null) {
        recordModelRequest(usage, new Date());
      }

      setError(caught instanceof Error ? caught.message : "The adjustments could not be generated.");
    } finally {
      setWorking(false);
    }
  }

  async function accept(suggestion: Suggestion) {
    if (resume === null) {
      return;
    }

    setBusyId(suggestion.id);
    setApplyError(null);

    try {
      const outcome = await acceptSuggestion({ resumeId: resume.id, suggestion }, { storage: getStorage() });

      if (!outcome.applied) {
        setApplyError({ id: suggestion.id, message: outcome.message });
        return;
      }

      setDecisions(recordDecision(browserDecisionStore(), report.id, suggestion.id, "accepted"));
      onResumeChanged();
    } catch {
      setApplyError({ id: suggestion.id, message: "This browser would not store the change, so nothing was applied." });
    } finally {
      setBusyId(null);
    }
  }

  function reject(suggestion: Suggestion) {
    setApplyError(null);
    setDecisions(recordDecision(browserDecisionStore(), report.id, suggestion.id, "rejected"));
  }

  const rejected = suggestions.filter((suggestion) => decisions[suggestion.id]?.decision === "rejected");
  const offered = suggestions.filter((suggestion) => decisions[suggestion.id]?.decision !== "rejected");

  return (
    <section className="flex flex-col gap-3" aria-label="Suggested adjustments">
      <h2 className="text-sm font-semibold">Suggested adjustments</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Proposals that would bring this resume closer to the posting. Each one rewrites text that is already in the
        resume, and a second pass drops any proposal your own resume data does not support. Nothing is written to your
        resume until you accept it.
      </p>

      {resume === null || jd === null ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm leading-relaxed text-muted-foreground">
          The {resume === null ? "resume" : "job description"} this report was built from is no longer stored in this
          browser, so there is nothing to adjust.
        </p>
      ) : (
        <>
          {manual ? (
            <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed" role="status">
              {applyRefusalMessages["manual-mode"]}
            </p>
          ) : null}

          <div>
            <Button
              className="h-11 w-full sm:w-auto"
              disabled={working}
              onClick={generate}
              size="lg"
              type="button"
              variant={generated ? "outline" : "default"}
            >
              {working ? "Reading and checking proposals…" : generated ? "Generate again" : "Suggest adjustments"}
            </Button>
          </div>

          {error === null ? null : (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
              {error}
            </p>
          )}

          {generated ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {generatedUnder === null
                ? null
                : `Generated under AI mode ${generatedUnder.aiMode} (model ${generatedUnder.model}), ${generatedUnder.modelCalls} model ${
                    generatedUnder.modelCalls === 1 ? "request" : "requests"
                  }, counted locally in this browser. `}
              Nothing has been written to your resume.
            </p>
          ) : null}
        </>
      )}

      {generated && suggestions.length > 0 ? (
        <p className="text-sm leading-relaxed">
          {offered.length === 0
            ? "Every proposal has been rejected. They stay rejected, and generating again will not apply them."
            : `${offered.length} ${offered.length === 1 ? "proposal" : "proposals"} to review.`}{" "}
          {dropped.length === 0
            ? "Nothing was dropped."
            : `${dropped.length} ${dropped.length === 1 ? "proposal was" : "proposals were"} dropped before you saw ${
                dropped.length === 1 ? "it" : "them"
              }${groundingDropped === 0 ? "" : `, ${groundingDropped} of those by the grounding check`}.`}
        </p>
      ) : null}

      {generated && suggestions.length === 0 ? (
        <p className="rounded-lg border border-border/60 p-3 text-sm leading-relaxed">
          {dropped.length === 0
            ? "The model proposed no adjustments for this report."
            : groundingDropped === dropped.length
              ? `The grounding check rejected every proposal (${groundingDropped} of ${dropped.length}), so there is nothing to apply.`
              : `Every proposal was dropped before it reached you (${dropped.length} of ${dropped.length}), so there is nothing to apply.`}
        </p>
      ) : null}

      {offered.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {offered.map((suggestion) => (
            <SuggestionCard
              applyError={applyError?.id === suggestion.id ? applyError.message : null}
              busy={busyId === suggestion.id}
              decision={decisions[suggestion.id]?.decision}
              key={suggestion.id}
              onAccept={accept}
              onReject={reject}
              report={report}
              resume={resume}
              suggestion={suggestion}
            />
          ))}
        </ul>
      ) : null}

      {rejected.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
          <p className="text-sm">
            {rejected.length} {rejected.length === 1 ? "proposal was" : "proposals were"} rejected. Your resume is
            unchanged, and generating again will not apply {rejected.length === 1 ? "it" : "them"}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" onClick={() => setShowRejected((value) => !value)} type="button" variant="outline">
              {showRejected ? "Hide rejected proposals" : `Show ${rejected.length} rejected`}
            </Button>
          </div>
          {showRejected ? (
            <ul className="flex flex-col gap-2">
              {rejected.map((suggestion) => (
                <li className="flex flex-col gap-2 rounded-lg border border-border/60 p-3" key={suggestion.id}>
                  <p className="text-sm font-medium">{suggestion.requirement}</p>
                  <p className="text-xs leading-relaxed break-words text-muted-foreground">{suggestion.proposed}</p>
                  <div>
                    <Button
                      className="h-11"
                      onClick={() => setDecisions(clearDecision(browserDecisionStore(), report.id, suggestion.id))}
                      type="button"
                      variant="outline"
                    >
                      Put it back in the list
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {dropped.length > 0 ? (
        <details className="rounded-lg border border-border/60 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            What the checks removed ({dropped.length})
          </summary>
          <ul className="flex flex-col gap-2 pt-2">
            {dropped.map((drop, index) => (
              <DropRow drop={drop} key={`${drop.reason}-${drop.targetId ?? "none"}-${index}`} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
