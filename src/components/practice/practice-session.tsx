"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Lightbulb, RotateCcw, SendHorizontal, SkipForward } from "lucide-react";

import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { useDocument } from "@/components/documents/use-document";
import { GradeCard } from "@/components/practice/grade-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toRequestFailure, type AiFailureError } from "@/lib/ai/failures";
import { browserUsageStore, recordModelRequest } from "@/lib/ai/usage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";
import type { MatchReport } from "@/lib/match/types";
import { maxAnswerChars } from "@/lib/practice/limits";
import { requestGrade } from "@/lib/practice/api";
import { dimensionLabels, practiceRubricVersion, scoreBand } from "@/lib/practice/rubric";
import {
  newSession,
  readSession,
  summarise,
  turnScores,
  writeSession,
  type PracticeSession,
  type Turn,
} from "@/lib/practice/session";
import { findTailoredCopy } from "@/lib/resume/tailor";
import { getStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * A mock interview, one question at a time.
 *
 * The questions are the ones the interview-prep document already holds, so the app
 * — not the model — decides what is asked and in what order; the model is only
 * asked to judge a single answer. That keeps a turn to one bounded call and keeps
 * the run readable offline from what is stored. The run is kept in this browser, so
 * a reload resumes it.
 */

interface Evidence {
  report: MatchReport;
  resume: ResumeRecord;
  jd: JdRecord;
}

type EvidenceState = { status: "loading" } | { status: "missing" } | { status: "ready"; evidence: Evidence };

function useEvidence(reportId: string): EvidenceState {
  const [state, setState] = useState<EvidenceState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storage = getStorage();
      const report = await storage.getReport(reportId);
      if (report === null) {
        return null;
      }

      const [baseline, jd, all] = await Promise.all([storage.getResume(report.resumeId), storage.getJd(report.jdId), storage.listResumes()]);
      // The tailored copy is the resume the reader will send, so it is the one being interviewed on.
      const resume = findTailoredCopy(all, report.resumeId, report.jdId) ?? baseline;

      return resume === null || jd === null ? null : { report, resume, jd };
    })()
      .then((evidence) => {
        if (!cancelled) {
          setState(evidence === null ? { status: "missing" } : { status: "ready", evidence });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "missing" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return state;
}

function InterviewerBubble({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-[92%] items-start gap-3 sm:max-w-[80%]">
      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        I
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="rounded-2xl rounded-tl-md bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) px-4 py-3 text-sm leading-relaxed text-balance">
          {children}
        </div>
      </div>
    </div>
  );
}

function CandidateBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[92%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-primary-foreground shadow-(--shadow-rest) sm:max-w-[80%]">
        {children}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3" role="status">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        I
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-card ring-1 ring-foreground/[0.07] px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-pulse"
            key={delay}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Reading your answer…</span>
      </div>
    </div>
  );
}

function bandColour(score: number): string {
  return score >= 65 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-destructive";
}

/** One segment per question: where you are, and how each answered one went. */
function Progress({ count, session }: { count: number; session: PracticeSession }) {
  const summary = summarise(session);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium">
          {session.current >= count ? "Interview finished" : `Question ${session.current + 1} of ${count}`}
        </p>
        {summary.averageScore === null ? null : (
          <p className="text-xs text-muted-foreground">
            Average answer <span className="font-medium text-foreground tabular-nums">{summary.averageScore}</span> · confidence{" "}
            <span className="font-medium text-foreground tabular-nums">{summary.averageConfidence}</span>
          </p>
        )}
      </div>
      <ol aria-label="Questions" className="flex gap-1.5">
        {Array.from({ length: count }, (_, index) => {
          const own = session.turns.filter((turn) => turn.questionIndex === index && !turn.followUp);
          const first = own[0];
          const skipped = session.skipped.includes(index);
          const state = first ? `answered, ${turnScores(first).score}` : skipped ? "skipped" : index === session.current ? "current" : "not yet asked";

          return (
            <li
              aria-label={`Question ${index + 1}: ${state}`}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors duration-500",
                first ? bandColour(turnScores(first).score) : skipped ? "bg-muted-foreground/30" : index === session.current ? "bg-primary/40" : "bg-muted",
              )}
              key={index}
            />
          );
        })}
      </ol>
    </div>
  );
}

function Summary({ session, count, reportId, onRestart }: { session: PracticeSession; count: number; reportId: string; onRestart: () => void }) {
  const summary = summarise(session);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-lift) p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-(--ease-out-expo)">
      <h2 className="text-lg font-semibold tracking-tight">How the interview went</h2>

      {summary.averageScore === null ? (
        <p className="text-sm text-muted-foreground">You skipped every question, so there is nothing to score.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Average answer</span>
              <span className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight tabular-nums">{summary.averageScore}</span>
                <span className="text-sm font-medium">{scoreBand(summary.averageScore)}</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Confidence in the wording</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{summary.averageConfidence}</span>
            </div>
          </div>

          {summary.weakest === null ? null : (
            <p className="text-sm leading-relaxed">
              Your weakest area across the run was{" "}
              <span className="font-medium">{dimensionLabels[summary.weakest as keyof typeof dimensionLabels].label.toLowerCase()}</span>
              : {dimensionLabels[summary.weakest as keyof typeof dimensionLabels].hint}
            </p>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {summary.answered} of {count} questions answered. Every number is computed in this app from the interviewer&apos;s
        judgements (rubric v{practiceRubricVersion}); none was supplied by the model, and the confidence is read from your wording only.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button className="h-11" onClick={onRestart} type="button">
          <RotateCcw aria-hidden />
          Practise again
        </Button>
        <Link className="inline-flex h-11 items-center rounded-lg px-3 text-sm underline underline-offset-4 hover:text-foreground" href={`/report/${reportId}/prepare`}>
          Back to prepare
        </Link>
      </div>
    </div>
  );
}

export function PracticeSessionView({ reportId }: { reportId: string }) {
  const evidenceState = useEvidence(reportId);
  const { status, document, error, generate } = useDocument(reportId, "interview-prep");

  // Read once on the client. The first paint is the "loading" branch either way, so the server and
  // the browser agree on it whatever is stored.
  const [saved] = useState<PracticeSession | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return readSession(window.localStorage, reportId);
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [draft, setDraft] = useState("");
  const [grading, setGrading] = useState(false);
  const [failure, setFailure] = useState<AiFailureError | null>(null);
  const [nudge, setNudge] = useState(false);

  const questions = useMemo(() => (document?.content.shape === "questions" ? document.content.questions : []), [document]);

  useEffect(() => {
    if (session === null) {
      return;
    }
    try {
      writeSession(window.localStorage, reportId, session);
    } catch {
      // Storage is unavailable: the run still works, it just will not survive a reload.
    }
  }, [session, reportId]);

  const advance = useCallback((skip: boolean) => {
    setSession((current) =>
      current === null
        ? current
        : {
            ...current,
            skipped: skip ? [...current.skipped, current.current] : current.skipped,
            pendingFollowUp: null,
            current: current.current + 1,
          },
    );
    setDraft("");
    setNudge(false);
    setFailure(null);
  }, []);

  if (evidenceState.status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading the report…</p>;
  }

  if (evidenceState.status === "missing") {
    return (
      <p className="rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4 text-sm text-muted-foreground">
        The report, resume or posting behind this interview is no longer stored in this browser, so there is nothing to practise on.{" "}
        <Link className="underline underline-offset-4 hover:text-foreground" href="/match">
          Back to match
        </Link>
      </p>
    );
  }

  const { evidence } = evidenceState;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-5">
        <h2 className="text-base font-semibold">First, the questions</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The interview is drawn from your interview prep: questions weighted to what the match found missing. They have not been written for this report yet.
        </p>
        {error === null ? null : <p className="text-sm text-destructive" role="alert">{error}</p>}
        <div>
          <Button className="h-11" disabled={status === "generating" || status === "loading"} onClick={generate} type="button">
            {status === "generating" ? "Writing the questions…" : "Write the questions"}
          </Button>
        </div>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-lift) p-5">
        <h2 className="text-lg font-semibold tracking-tight">Ready when you are</h2>
        <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
          <li>{questions.length} questions, asked one at a time, drawn from this match.</li>
          <li>Answer in a few sentences, the way you would aloud. The interviewer may ask one follow-up.</li>
          <li>Each answer is judged on five things; the scores are computed here, not by the model.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11" onClick={() => setSession(newSession())} type="button">
            Start the interview
            <ArrowRight aria-hidden />
          </Button>
          {saved === null || saved.current >= questions.length ? null : (
            <Button className="h-11" onClick={() => setSession(saved)} type="button" variant="outline">
              Continue from question {saved.current + 1}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const finished = session.current >= questions.length;
  const question = questions[session.current];
  const primary = session.turns.find((turn) => turn.questionIndex === session.current && !turn.followUp);
  const awaitingFollowUp = primary !== undefined && session.pendingFollowUp !== null;
  const roundDone = primary !== undefined && session.pendingFollowUp === null;
  const asking = awaitingFollowUp ? session.pendingFollowUp : question?.question;

  async function submit() {
    const text = draft.trim();
    if (text === "" || grading || !question || session === null) {
      return;
    }

    const isFollowUp = awaitingFollowUp;
    const asked = isFollowUp ? (session.pendingFollowUp as string) : question.question;
    const usage = browserUsageStore();

    setGrading(true);
    setFailure(null);

    try {
      const result = await requestGrade({
        resume: evidence.resume.resume,
        jd: evidence.jd.structured,
        criteria: evidence.report.criteria,
        question: { question: asked, why: question.why, how: question.how },
        answer: text,
        earlier: isFollowUp && primary ? { question: question.question, answer: primary.answer } : null,
      });

      if (usage !== null) {
        recordModelRequest(usage, new Date());
      }

      const turn: Turn = {
        id: crypto.randomUUID(),
        questionIndex: session.current,
        followUp: isFollowUp,
        asked,
        answer: text,
        grade: result.grade,
        rubricVersion: practiceRubricVersion,
        at: new Date().toISOString(),
      };

      setSession({ ...session, turns: [...session.turns, turn], pendingFollowUp: isFollowUp ? null : result.grade.followUp });
      setDraft("");
      setNudge(false);
    } catch (caught) {
      if (usage !== null) {
        recordModelRequest(usage, new Date());
      }
      // The draft stays where it is: a failed grading must never cost the reader their answer.
      setFailure(toRequestFailure(caught));
    } finally {
      setGrading(false);
    }
  }

  const history = Array.from({ length: Math.min(session.current + 1, questions.length) }, (_, index) => index);

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[32rem] flex-col gap-3">
      <Progress count={questions.length} session={session} />

      <Conversation className="min-h-0 flex-1 rounded-2xl bg-muted/30 ring-1 ring-foreground/[0.05]">
        <ConversationContent className="gap-5 p-4">
        {history.map((index) => {
          const turns = session.turns.filter((turn) => turn.questionIndex === index);

          if (session.skipped.includes(index)) {
            return (
              <p className="text-center text-xs text-muted-foreground" key={index}>
                Question {index + 1} skipped
              </p>
            );
          }

          return turns.map((turn) => (
            <div className="flex flex-col gap-3" key={turn.id}>
              <InterviewerBubble label={turn.followUp ? "Follow-up" : `Question ${index + 1}`}>{turn.asked}</InterviewerBubble>
              <CandidateBubble>{turn.answer}</CandidateBubble>
              <GradeCard turn={turn} />
            </div>
          ));
        })}

        {!finished && !roundDone && asking ? (
          <InterviewerBubble label={awaitingFollowUp ? "Follow-up" : `Question ${session.current + 1}`}>{asking}</InterviewerBubble>
        ) : null}

        {grading ? <Thinking /> : null}

        {finished ? (
          <Summary
            count={questions.length}
            onRestart={() => {
              setSession(newSession());
              setDraft("");
            }}
            reportId={reportId}
            session={session}
          />
        ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {finished ? null : roundDone ? (
        <div className="flex">
          <Button className="h-12 w-full shadow-(--shadow-float) sm:w-auto" onClick={() => advance(false)} size="lg" type="button">
            {session.current + 1 >= questions.length ? "Finish the interview" : "Next question"}
            <ArrowRight aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.08] shadow-(--shadow-float) p-3">
          {failure === null ? null : (
            <div className="flex flex-col gap-2 rounded-xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-3" role="alert">
              <p className="text-sm leading-relaxed">{failure.message}</p>
              {failure.retryAfterSeconds ? <p className="text-xs text-muted-foreground">Try again in about {failure.retryAfterSeconds} seconds.</p> : null}
            </div>
          )}

          {nudge && question ? (
            <div className="flex flex-col gap-1 rounded-xl bg-accent p-3 text-xs leading-relaxed animate-in fade-in duration-300">
              <p className="font-medium">Your own prep notes for this question</p>
              <p>{question.how}</p>
            </div>
          ) : null}

          <label className="sr-only" htmlFor="practice-answer">
            Your answer
          </label>
          <Textarea
            className="field-sizing-content max-h-64 min-h-24 resize-none leading-relaxed"
            disabled={grading}
            id="practice-answer"
            maxLength={maxAnswerChars}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={awaitingFollowUp ? "Answer the follow-up…" : "Answer as you would in the room…"}
            value={draft}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-11" disabled={grading || draft.trim() === ""} onClick={() => void submit()} type="button">
              {failure === null ? "Send answer" : "Send again"}
              <SendHorizontal aria-hidden />
            </Button>
            <Button className="h-11" disabled={grading} onClick={() => advance(!awaitingFollowUp)} type="button" variant="outline">
              <SkipForward aria-hidden />
              {awaitingFollowUp ? "Skip the follow-up" : "Skip question"}
            </Button>
            {awaitingFollowUp ? null : (
              <Button className="h-11" onClick={() => setNudge((value) => !value)} type="button" variant="ghost">
                <Lightbulb aria-hidden />
                Need a nudge?
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {draft.length}/{maxAnswerChars} · Ctrl+Enter sends
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
