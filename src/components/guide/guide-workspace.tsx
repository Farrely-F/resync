"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  guideStepIds,
  markStepDone,
  readMarks,
  stepStates,
  unmarkStep,
  type GuideFacts,
  type GuideStepId,
  type GuideStepState,
} from "@/lib/guide/progress";
import { samplePostingText } from "@/lib/guide/sample-posting";
import { parseResumeFixtureSourceText } from "@/lib/resume/fixtures";
import { addResumeFromText } from "@/lib/resume/library";
import { getStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * The guide, as the flow itself.
 *
 * Every step is either done because the browser holds the record it asks about
 * or because the reader says they read it — there is no third way, and no step
 * claims to be finished on the reader's behalf. Steps 2 and 3 are only ever
 * decided by stored records: the guide can see a resume and a posting, so a mark
 * would be a claim it could check and be wrong about. The remaining steps are
 * about reading, which nothing here can observe, so the reader marks them.
 *
 * The counts come from the same store the rest of the app writes to, so adding a
 * resume on `/resumes` ticks step 2 here as well.
 */

interface Stored {
  resumes: number;
  postings: number;
  reports: number;
  latestReportId: string | null;
}

function StepCard({
  index,
  title,
  state,
  children,
}: {
  index: number;
  title: string;
  state: GuideStepState;
  children: ReactNode;
}) {
  const label = state.source === "stored" ? "Done" : state.source === "marked" ? "Marked done" : "Not done";

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">{index}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant={state.done ? "default" : "outline"}>{label}</Badge>
      </div>
      {children}
    </li>
  );
}

/** A link that is a control: full height on a phone, the usual size above it. */
const linkControl = cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9");

export function GuideWorkspace() {
  const [stored, setStored] = useState<Stored | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [marked, setMarked] = useState<GuideStepId[]>([]);
  const [marksSaved, setMarksSaved] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const refresh = useCallback(async () => {
    const storage = getStorage();
    const [resumes, postings, reports] = await Promise.all([
      storage.listResumes(),
      storage.listJds(),
      storage.listReports(),
    ]);

    setStored({
      resumes: resumes.length,
      postings: postings.length,
      reports: reports.length,
      latestReportId: reports[0]?.id ?? null,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
        if (!cancelled) {
          // Read after the first await, like the counts above: the marks are
          // local state being adopted, not a value this render depends on.
          setMarked(readMarks());
          setStorageError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStorageError(error instanceof Error ? error.message : "unknown");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  /**
   * The mark is kept in state whether or not the browser accepted the write, so
   * the reader is not left clicking a button that appears to do nothing; the
   * note above the list says when the record will not survive a reload.
   */
  function toggleDone(id: GuideStepId) {
    const isDone = marked.includes(id);
    const persisted = isDone ? unmarkStep(id) : markStepDone(id);

    setMarked(
      isDone
        ? marked.filter((step) => step !== id)
        : guideStepIds.filter((step) => step === id || marked.includes(step)),
    );
    setMarksSaved((previous) => previous && persisted.includes(id) === !isDone);
  }

  function markButton(id: GuideStepId, state: GuideStepState) {
    return (
      <Button
        className="h-11 sm:h-9"
        onClick={() => toggleDone(id)}
        type="button"
        variant={state.done ? "outline" : "default"}
      >
        {state.done ? "Mark as not done" : "Mark this step done"}
      </Button>
    );
  }

  async function addSampleResume() {
    setAdding(true);
    setAddResult(null);
    try {
      const record = await addResumeFromText(parseResumeFixtureSourceText);
      setAddResult({ ok: true, message: `Added “${record.title}” to this browser.` });
      await refresh();
    } catch (error) {
      setAddResult({
        ok: false,
        message: error instanceof Error ? error.message : "Adding the sample resume failed.",
      });
    } finally {
      setAdding(false);
    }
  }

  async function copyPosting() {
    try {
      await navigator.clipboard.writeText(samplePostingText);
      setCopyState("copied");
    } catch {
      // A page served over plain HTTP has no clipboard API, and a denied
      // permission looks the same here: either way the text is on screen to copy.
      setCopyState("failed");
    }
  }

  const facts: GuideFacts = { resumes: stored?.resumes ?? 0, postings: stored?.postings ?? 0 };
  const states = stepStates(facts, marked);
  const stateOf = (id: GuideStepId) => states.find((state) => state.id === id) ?? { id, done: false, source: null };
  const done = states.filter((state) => state.done).length;

  const resumeCount = storageError !== null ? "unknown" : stored === null ? "reading…" : String(stored.resumes);
  const postingCount = storageError !== null ? "unknown" : stored === null ? "reading…" : String(stored.postings);
  const reportCount = storageError !== null ? "unknown" : stored === null ? "reading…" : String(stored.reports);
  const latestReportId = stored?.latestReportId ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4">
        <p className="text-sm">
          {done} of {guideStepIds.length} steps done.
        </p>
        <Progress aria-label="Guide progress" max={guideStepIds.length} value={done} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Progress is kept in this browser only, under its own key. Steps 2 and 3 finish when the resume or the posting
          is stored, not when they are marked.
        </p>
        {marksSaved ? null : (
          <p className="text-xs leading-relaxed text-muted-foreground" role="status">
            This browser is not keeping a record of the marks — they will be gone after a reload.
          </p>
        )}
      </section>

      {storageError === null ? null : (
        <p
          className="rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4 text-sm leading-relaxed"
          role="alert"
        >
          This browser would not open its local storage, so the guide cannot see what is stored ({storageError}). The
          steps that depend on a stored record will stay unfinished until it can.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        <StepCard index={1} state={stateOf("intro")} title="What this is">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Everything this app keeps — the resumes and postings you add, the reports, and the documents written from
            them — is stored in this browser. No account is created and nothing is uploaded. When a model is called,
            only the extracted text and the structured data go to the provider this app is configured with; the
            original file is read here and never leaves the device.
          </p>
          <div className="flex flex-wrap gap-2">{markButton("intro", stateOf("intro"))}</div>
        </StepCard>

        <StepCard index={2} state={stateOf("resume")} title="Add a resume">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add the sample resume — Priya Raman, a backend engineer — through the same path a real upload takes: the
            text goes to the structuring route, and the result is stored in this browser like any resume you add
            yourself. In mock mode the structuring answer comes from a recorded sample, so nothing is sent anywhere.
            You can delete it from the library afterwards.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-11 sm:h-9" disabled={adding} onClick={addSampleResume} type="button">
              {adding ? "Adding…" : "Add the sample resume"}
            </Button>
            {stored !== null && stored.resumes > 0 ? (
              <Link className={linkControl} href="/resumes">
                Open the library
              </Link>
            ) : null}
          </div>
          {addResult === null ? null : (
            <p
              className={cn("text-xs leading-relaxed", addResult.ok ? "text-muted-foreground" : "text-destructive")}
              role={addResult.ok ? "status" : "alert"}
            >
              {addResult.message}
              {addResult.ok ? "" : " The resume was not stored."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Resumes stored in this browser: {resumeCount}</p>
          <p className="text-xs text-muted-foreground">
            {stateOf("resume").done
              ? "Done: a resume is stored in this browser."
              : "This step is done when a resume is stored here; there is nothing to mark."}
          </p>
        </StepCard>

        <StepCard index={3} state={stateOf("posting")} title="Read a job posting">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A posting is read the same way: paste its text on Match, or give a URL and let the app fetch the page. It is
            stored, so a second resume can be matched against it without reading it twice. The sample below is the
            posting the recorded demo data was written for, so matching it against the sample resume gives a coherent
            report.
          </p>
          <div className="max-h-72 overflow-y-auto rounded-xl bg-background ring-1 ring-foreground/[0.06] px-3 py-2">
            <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
              {samplePostingText}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-11 sm:h-9" onClick={copyPosting} type="button" variant="outline">
              Copy the sample posting
            </Button>
            <Link className={linkControl} href="/match">
              Open Match to paste it
            </Link>
          </div>
          {copyState === "idle" ? null : (
            <p className="text-xs leading-relaxed text-muted-foreground" role="status">
              {copyState === "copied"
                ? "Copied. Paste it into the posting field on Match."
                : "This browser would not copy for you — select the text above and copy it by hand."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Postings stored in this browser: {postingCount}</p>
          <p className="text-xs text-muted-foreground">
            {stateOf("posting").done
              ? "Done: a posting is stored in this browser."
              : "This step is done when a posting is stored here; there is nothing to mark."}
          </p>
        </StepCard>

        <StepCard index={4} state={stateOf("match")} title="Match the two">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick the resume and the posting on Match and analyse. The model answers one question per requirement — met,
            partly met or missing — and quotes the resume text behind each verdict. This app then computes the
            percentage from those answers with its own weighted rubric; no score is asked of the model, so the same
            evidence always gives the same number.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link className={linkControl} href="/match">
              Open Match
            </Link>
            {markButton("match", stateOf("match"))}
          </div>
        </StepCard>

        <StepCard index={5} state={stateOf("report")} title="Read the report">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The report lists every requirement with its verdict and the evidence from your resume that supports it, and
            then shows the arithmetic: score = 100 × earned ÷ available, with the weight and credit of each criterion
            written out. Read the missing list first — those are the gaps the next step answers.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {latestReportId === null ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {reportCount === "unknown"
                  ? "The guide cannot read this browser's storage, so it cannot say whether a report is stored."
                  : "No report is stored yet. Analysing a pair on Match creates one."}
              </p>
            ) : (
              <Link className={linkControl} href={`/report/${latestReportId}`}>
                Open the most recent report
              </Link>
            )}
            {markButton("report", stateOf("report"))}
          </div>
          <p className="text-xs text-muted-foreground">Reports stored in this browser: {reportCount}</p>
        </StepCard>

        <StepCard index={6} state={stateOf("prepare")} title="Prepare">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A report has a Prepare page: a cover letter, an outreach message and interview prep. All three are written
            from the same evidence the report was — your resume, the posting and the verdicts — so the letter and the
            message answer the gaps the report found instead of repeating the posting, and the interview prep works
            through the questions those gaps invite. Each is written on demand and stored in this browser.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link className={linkControl} href={latestReportId === null ? "/match" : `/report/${latestReportId}/prepare`}>
              {latestReportId === null ? "Open Match to create a report first" : "Open Prepare"}
            </Link>
            {markButton("prepare", stateOf("prepare"))}
          </div>
        </StepCard>
      </ol>
    </div>
  );
}
