"use client";

import { useState } from "react";
import { Check, CircleAlert, Copy, Download, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { useDocument } from "@/components/documents/use-document";
import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/lib/dev-only";
import { interviewPrepSpec } from "@/lib/documents/interview-prep";
import { documentText, type DocumentRecord } from "@/lib/documents/types";

/**
 * The interview questions, from the report they were written for.
 *
 * There is nothing to edit here, unlike the letter and the message: the content is
 * structured, and an interview answer rewritten in a box on this page would no
 * longer be tied to the question it belongs to. So the panel offers copy, download
 * and regenerate instead of a textarea, and every action goes through
 * `documentText`, which is the same text a download produces.
 *
 * The two sentences that carry the meaning are on screen and not only in the
 * spec: these are questions the posting and the analysis make likely rather than
 * questions anyone has asked, and the guidance is drawn from what the resume
 * already says rather than invented for the occasion.
 */

/** What the last action did, so the confirmation sits with the record it belongs to. */
type Feedback =
  | { at: string; kind: "copied"; characters: number }
  | { at: string; kind: "downloaded" }
  | { at: string; kind: "copy-failed"; message: string };

/** An action that would destroy the current set, waiting on a second press. */
type Pending = "regenerate" | "delete" | null;

const fileName = "interview-prep.txt";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function QuestionEntry({ index, question, why, how }: { index: number; question: string; why: string; how: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-background ring-1 ring-foreground/[0.06] p-3">
      <p className="flex gap-2 text-sm font-medium">
        <span aria-hidden className="text-muted-foreground">
          {index + 1}.
        </span>
        <span>{question}</span>
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Why it comes up</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{why}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">How to answer</p>
        <p className="text-sm leading-relaxed">{how}</p>
      </div>
    </li>
  );
}

export function InterviewPrepPanel({ reportId }: { reportId: string }) {
  const { status, document, error, failureKind, reportMissing, generate, remove } = useDocument(
    reportId,
    "interview-prep",
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  // Feedback names the record it was produced for, so a fresh set cannot leave
  // "Copied 4,120 characters" sitting under questions it never copied.
  const current: Feedback | null =
    feedback !== null && document !== null && feedback.at === document.updatedAt ? feedback : null;

  function write() {
    setFeedback(null);
    setPending(null);
    generate();
  }

  function askToGenerate() {
    if (document === null) {
      write();
      return;
    }

    setPending("regenerate");
  }

  async function copy(record: DocumentRecord) {
    const text = documentText(record);

    if (!navigator.clipboard) {
      setFeedback({
        at: record.updatedAt,
        kind: "copy-failed",
        message:
          "This browser exposes no clipboard API, so nothing was copied. Select the questions and copy them yourself, or download the .txt.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ at: record.updatedAt, kind: "copied", characters: text.length });
    } catch (caught) {
      setFeedback({
        at: record.updatedAt,
        kind: "copy-failed",
        message: `The browser refused the clipboard write: ${
          caught instanceof Error ? caught.message : String(caught)
        }. Nothing was copied.`,
      });
    }
  }

  return (
    <section
      aria-labelledby="interview-prep-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium" id="interview-prep-heading">
            {interviewPrepSpec.label}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{interviewPrepSpec.summary}</p>
        </div>
        {status === "loading" || reportMissing ? null : (
          <div className="shrink-0">
            <Button
              className="h-11 w-full sm:h-9 sm:w-auto"
              disabled={status === "generating"}
              onClick={askToGenerate}
              type="button"
              variant={document === null ? "default" : "outline"}
            >
              {status === "generating" ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
              {status === "generating" ? "Writing…" : document === null ? "Write the questions" : "Regenerate"}
            </Button>
          </div>
        )}
      </div>

      <p className="rounded-xl bg-accent ring-1 ring-primary/15 p-3 text-xs leading-relaxed text-muted-foreground">
        These are questions the posting and the analysis make likely — not questions anyone has asked. Nothing here is
        invented: each answer is built from what your resume already shows, and where it shows nothing, the guidance
        says so.
      </p>

      {reportMissing ? (
        <p
          className="rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4 text-sm leading-relaxed"
          role="alert"
        >
          The report these questions belong to is no longer stored in this browser, so there is nothing to prepare
          from. Nothing was generated. Reports live in this browser only, so a link from another device or profile will
          not resolve here.
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Reading this browser&apos;s storage…</p>
      ) : null}

      {status === "empty" && document === null && !reportMissing ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing has been prepared for this report yet. Writing the questions sends your resume, this posting and the
            report&apos;s verdicts to the configured model, and stores the answer in this browser.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The model returns five to eight questions weighted towards what the analysis found missing or only partly
            met, plus one or two on your strongest evidence. Each one comes with why it is likely for you and how to
            answer it from the resume — it is told to claim nothing the resume does not already say.
          </p>
        </div>
      ) : null}

      {status === "generating" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 aria-hidden className="animate-spin" />
          Writing the questions from your resume, this posting and the report&apos;s verdicts. This can take a while.
        </p>
      ) : null}

      {status === "failed" ? (
        <div
          className="flex flex-col gap-3 rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4"
          data-failure-kind={failureKind ?? "unknown"}
          role="alert"
        >
          <p className="text-sm font-medium">The questions were not written</p>
          <p className="text-sm leading-relaxed">{error ?? "The request failed without a message."}</p>
          {failureKind === "quota" ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              The provider&apos;s request allowance is spent. It refills on the provider&apos;s own schedule, and the
              allowance is shared with the analysis and every other document.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">Reason: {failureKind ?? "unknown"}</p>
          <div>
            <Button className="h-11 w-full sm:h-9 sm:w-auto" onClick={write} type="button" variant="outline">
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {document === null || document.content.shape !== "questions" ? null : (
        <div className="flex flex-col gap-3">
          <ol className="flex flex-col gap-2">
            {document.content.questions.map((entry, index) => (
              <QuestionEntry
                how={entry.how}
                index={index}
                key={`${index}-${entry.question}`}
                question={entry.question}
                why={entry.why}
              />
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-11 sm:h-9"
              onClick={() => void copy(document)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy aria-hidden />
              Copy questions
            </Button>
            <Button
              className="h-11 sm:h-9"
              onClick={() => {
                download(fileName, documentText(document));
                setFeedback({ at: document.updatedAt, kind: "downloaded" });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Download aria-hidden />
              Download .txt
            </Button>
            <Button
              className="h-11 sm:h-9"
              onClick={() => setPending("delete")}
              size="sm"
              type="button"
              variant="destructive"
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground" role="status">
            {current === null ? (
              <span>
                The questions are stored in this browser. The buttons above copy, download or delete them; regenerating
                replaces the set.
              </span>
            ) : null}
            {current?.kind === "copied" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Copied {current.characters.toLocaleString()} characters — every question with its why and its how.
                  This is the same text the download writes.
                </span>
              </>
            ) : null}
            {current?.kind === "downloaded" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>Saved {fileName} to your downloads.</span>
              </>
            ) : null}
            {current?.kind === "copy-failed" ? (
              <>
                <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span className="text-destructive">{current.message}</span>
              </>
            ) : null}
          </p>

          {pending === "regenerate" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-accent ring-1 ring-primary/15 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Regenerating asks the model again and replaces this set of questions. The current set is not kept, and a
                different answer will not be the same questions in a different order.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="h-11 sm:h-9" onClick={write} size="sm" type="button" variant="outline">
                  <RefreshCw aria-hidden />
                  Replace the set
                </Button>
                <Button className="h-11 sm:h-9" onClick={() => setPending(null)} size="sm" type="button" variant="ghost">
                  Keep these questions
                </Button>
              </div>
            </div>
          ) : null}

          {pending === "delete" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-accent ring-1 ring-primary/15 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Deleting removes these questions from this browser. The report and the other documents are untouched,
                and you can write the questions again.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-11 sm:h-9"
                  onClick={() => {
                    setPending(null);
                    setFeedback(null);
                    remove();
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden />
                  Delete them
                </Button>
                <Button className="h-11 sm:h-9" onClick={() => setPending(null)} size="sm" type="button" variant="ghost">
                  Keep them
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <p>
              {isDevelopment ? `Written by ${document.model} · mode ${document.aiMode} · ` : null}
              Saved {new Date(document.updatedAt).toLocaleString()}
            </p>
            {document.aiMode === "mock" ? (
              <p>Mock mode: this is a recorded example that ships with the app, not one written from your documents.</p>
            ) : isDevelopment ? (
              <p>Live mode: these questions were written from your documents on this request.</p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
