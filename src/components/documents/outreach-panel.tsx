"use client";

import { useState } from "react";
import { Check, CircleAlert, Copy, Download, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { useDocument } from "@/components/documents/use-document";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isDevelopment } from "@/lib/dev-only";
import { outreachSpec } from "@/lib/documents/outreach";
import { documentText } from "@/lib/documents/types";

/**
 * The outreach message, from the report it was written for.
 *
 * The subject line and the body are one textarea because they are one artifact:
 * `documentText` joins them for the clipboard and the download, so editing them
 * apart would let the two views of "the message" drift. The reader's text is a
 * field of the record, not a replacement for it, so the panel can always say
 * whether what is on screen is the model's answer or the reader's own.
 *
 * Nothing here sends anything. There is no recipient, no address book and no
 * mail client: this is a draft the reader copies or downloads and sends
 * themselves, which is the one thing the copy has to make unmissable.
 */

/** What the last action did, so the confirmation cannot be mistaken for a send. */
type Feedback =
  | { kind: "saved" }
  | { kind: "copied"; characters: number }
  | { kind: "downloaded" }
  | { kind: "copy-failed"; message: string };

/** An action that would destroy something, waiting on a second press. */
type Pending = "regenerate" | "delete" | null;

const fileName = "outreach-message.txt";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function OutreachPanel({ reportId }: { reportId: string }) {
  const { status, document, error, failureKind, reportMissing, generate, save, remove } = useDocument(
    reportId,
    "outreach",
  );
  // Null means "show the record"; a string is an edit not yet committed. The
  // record stays the source of truth, so a fresh answer, a save and a delete all
  // arrive as a new record and the box follows it without a stale frame.
  const [draft, setDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const value = draft ?? (document === null ? "" : documentText(document));

  function write() {
    setDraft(null);
    setFeedback(null);
    setPending(null);
    generate();
  }

  function commit() {
    if (document === null) {
      return;
    }

    if (value !== documentText(document)) {
      save(value);
      setFeedback({ kind: "saved" });
    }

    setDraft(null);
  }

  async function copy(text: string) {
    if (!navigator.clipboard) {
      setFeedback({
        kind: "copy-failed",
        message:
          "This browser exposes no clipboard API, so nothing was copied. Select the message and copy it yourself, or download the .txt.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: "copied", characters: text.length });
    } catch (caught) {
      setFeedback({
        kind: "copy-failed",
        message: `The browser refused the clipboard write: ${
          caught instanceof Error ? caught.message : String(caught)
        }. Nothing was copied.`,
      });
    }
  }

  function askToGenerate() {
    if (document === null) {
      write();
      return;
    }

    setPending("regenerate");
  }

  return (
    <section
      aria-labelledby="outreach-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium" id="outreach-heading">
            {outreachSpec.label}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{outreachSpec.summary}</p>
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
              {status === "generating" ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Sparkles aria-hidden />
              )}
              {status === "generating" ? "Writing…" : document === null ? "Write the message" : "Regenerate"}
            </Button>
          </div>
        )}
      </div>

      <p className="rounded-xl bg-accent ring-1 ring-primary/15 p-3 text-xs leading-relaxed text-muted-foreground">
        This is a draft. Nothing on this page sends anything — there is no recipient, no address book and no mail
        client. You copy or download the message and send it yourself from your own email.
      </p>

      {reportMissing ? (
        <p
          className="rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4 text-sm leading-relaxed"
          role="alert"
        >
          The report this message belongs to is no longer stored in this browser, so there is nothing to write from.
          Nothing was generated. Reports live in this browser only, so a link from another device or profile will not
          resolve here.
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Reading this browser&apos;s storage…</p>
      ) : null}

      {status === "empty" && document === null && !reportMissing ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing has been written for this report yet. Writing the message sends your resume, this posting and the
            report&apos;s verdicts to the configured model, and stores the answer in this browser.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The model writes a subject line and a short body, and is told to leave a placeholder for the recipient&apos;s
            name because it does not know who will read it. It is told to claim nothing the resume does not already
            say.
          </p>
        </div>
      ) : null}

      {status === "generating" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 aria-hidden className="animate-spin" />
          Writing the message from your resume, this posting and the report&apos;s verdicts. This can take a while.
        </p>
      ) : null}

      {status === "failed" ? (
        <div
          className="flex flex-col gap-3 rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4"
          data-failure-kind={failureKind ?? "unknown"}
          role="alert"
        >
          <p className="text-sm font-medium">The message was not written</p>
          <p className="text-sm leading-relaxed">{error ?? "The request failed without a message."}</p>
          {failureKind === "quota" ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              The provider&apos;s request allowance is spent. It refills on the provider&apos;s own schedule, and the
              allowance is shared with the analysis and every other document.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">Reason: {failureKind ?? "unknown"}</p>
          <div>
            <Button
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={write}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {document === null ? null : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="outreach-text">Subject and body</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The subject line comes first, then the body — together they are what copies and downloads. Edits are saved
              in this browser when you leave the box.
            </p>
          </div>

          <Textarea
            className="min-h-72"
            id="outreach-text"
            onBlur={commit}
            onChange={(event) => {
              setDraft(event.target.value);
              setFeedback(null);
            }}
            spellCheck
            value={value}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-11 sm:h-9"
              onClick={() => void copy(value)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy aria-hidden />
              Copy message
            </Button>
            <Button
              className="h-11 sm:h-9"
              onClick={() => {
                download(fileName, value);
                setFeedback({ kind: "downloaded" });
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
            {feedback === null ? <span>Nothing has been sent: the buttons above copy, save or delete.</span> : null}
            {feedback?.kind === "saved" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>Saved in this browser. This is your text now, not the model&apos;s.</span>
              </>
            ) : null}
            {feedback?.kind === "copied" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Copied {feedback.characters.toLocaleString()} characters — the subject line and the body. Paste them
                  into your own email and fill in the recipient&apos;s name.
                </span>
              </>
            ) : null}
            {feedback?.kind === "downloaded" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>Saved {fileName} to your downloads.</span>
              </>
            ) : null}
            {feedback?.kind === "copy-failed" ? (
              <>
                <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span className="text-destructive">{feedback.message}</span>
              </>
            ) : null}
          </p>

          {pending === "regenerate" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-accent ring-1 ring-primary/15 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Regenerating asks the model again and replaces this message, including any edits you have made. The
                current text is not kept.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="h-11 sm:h-9" onClick={write} size="sm" type="button" variant="outline">
                  <RefreshCw aria-hidden />
                  Replace it
                </Button>
                <Button
                  className="h-11 sm:h-9"
                  onClick={() => setPending(null)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Keep this message
                </Button>
              </div>
            </div>
          ) : null}

          {pending === "delete" ? (
            <div className="flex flex-col gap-3 rounded-xl bg-accent ring-1 ring-primary/15 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Deleting removes this message from this browser. The report and the other documents are untouched, and
                you can write the message again.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-11 sm:h-9"
                  onClick={() => {
                    setPending(null);
                    setDraft(null);
                    setFeedback(null);
                    remove();
                  }}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 aria-hidden />
                  Delete it
                </Button>
                <Button
                  className="h-11 sm:h-9"
                  onClick={() => setPending(null)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Keep it
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <p>
              {isDevelopment ? `Written by ${document.model} · mode ${document.aiMode} · ` : null}
              Saved {new Date(document.updatedAt).toLocaleString()}
            </p>
            <p>
              {document.editedText === null
                ? "The text above is the model's answer, unedited."
                : "The text above is your own edit of the model's answer."}
            </p>
            {document.aiMode === "mock" ? (
              <p>
                Mock mode: this is a recorded example that ships with the app, not one written from your documents.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
