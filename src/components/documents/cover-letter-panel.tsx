"use client";

import { useState } from "react";
import { Check, CircleAlert, Copy, Download, RefreshCw, Trash2 } from "lucide-react";

import { useDocument } from "@/components/documents/use-document";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { specFor } from "@/lib/documents/registry";
import { documentText } from "@/lib/documents/types";

/**
 * The cover letter, written on demand and stored in this browser.
 *
 * The panel never presents the letter as checked or reviewed: it is the model's
 * text, produced from the resume and the posting the report was built from, and
 * the reader is the one who sends it. Edits are saved when the field loses focus,
 * not on every keystroke — one IndexedDB write per character would be a write
 * storm for a letter that takes minutes to type.
 *
 * Regenerating replaces the stored letter, so it is gated behind a warning once
 * the reader has edited it; a fresh answer would otherwise discard their words
 * without saying so.
 */

type Feedback =
  | { kind: "copied"; characters: number }
  | { kind: "saved" }
  | { kind: "failed"; message: string };

export function CoverLetterPanel({ reportId }: { reportId: string }) {
  const spec = specFor("cover-letter");
  const { status, document: record, error, failureKind, reportMissing, generate, save, remove } = useDocument(
    reportId,
    "cover-letter",
  );

  const [draft, setDraft] = useState<string | null>(null);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // A new or regenerated document is a new text: drop the draft so the field
  // shows what was just stored rather than the previous letter. Done during
  // render rather than in an effect, which is React's own answer for state that
  // has to follow a value — an effect would render the stale letter once first.
  const [renderedAt, setRenderedAt] = useState<string | null>(record?.updatedAt ?? null);
  const storedAt = record?.updatedAt ?? null;
  if (renderedAt !== storedAt) {
    setRenderedAt(storedAt);
    setDraft(null);
    setConfirmingRegenerate(false);
  }

  const content = record === null ? null : record.content;
  const generated = content !== null && content.shape === "prose" ? content.body : "";
  const storedText = record?.editedText ?? generated;
  const value = draft ?? storedText;
  const hasEdits = draft !== null || (record !== null && record.editedText !== null);

  function handleBlur() {
    if (record === null || draft === null) {
      return;
    }
    if (draft === storedText) {
      setDraft(null);
      return;
    }
    save(draft);
    setFeedback({ kind: "saved" });
  }

  async function copy() {
    if (record === null) {
      return;
    }

    const text = documentText(record);
    if (!navigator.clipboard) {
      setFeedback({
        kind: "failed",
        message: "This browser exposes no clipboard API, so nothing was copied. Download the .txt instead.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ kind: "copied", characters: text.length });
    } catch (caught) {
      setFeedback({
        kind: "failed",
        message: `The browser refused the clipboard write: ${
          caught instanceof Error ? caught.message : String(caught)
        }. Nothing was copied.`,
      });
    }
  }

  function download() {
    if (record === null) {
      return;
    }

    const text = documentText(record);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${spec.kind}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function regenerate() {
    setFeedback(null);
    setConfirmingRegenerate(false);
    generate();
  }

  return (
    <section
      aria-labelledby="cover-letter-heading"
      className="flex flex-col gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-medium" id="cover-letter-heading">
          {spec.label}
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{spec.summary}</p>
      </header>

      {reportMissing ? (
        <p className="rounded-xl border border-dashed border-foreground/15 bg-background p-3 text-sm leading-relaxed text-muted-foreground">
          The report this letter would be written from is no longer stored in this browser, so there is nothing to write
          it from. Its resume and posting live here too, and both are gone with it.
        </p>
      ) : status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading the letter…</p>
      ) : status === "empty" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing has been written yet. Generating sends the resume, the posting and the report&apos;s verdicts to the
            configured model, which writes the letter; the answer is stored in this browser only.
          </p>
          <div>
            <Button className="h-11" onClick={regenerate} type="button">
              <RefreshCw aria-hidden />
              Write the letter
            </Button>
          </div>
        </div>
      ) : status === "generating" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Writing the letter from the resume, the posting and the report&apos;s verdicts…
        </p>
      ) : status === "failed" ? (
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>
              {failureKind === "quota" ? "The provider allowance is spent. " : null}
              {error ?? "The letter could not be written."}
            </AlertDescription>
          </Alert>
          <div>
            <Button className="h-11 sm:h-9" onClick={regenerate} size="sm" type="button" variant="outline">
              <RefreshCw aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      ) : record === null ? null : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" htmlFor="cover-letter-text">
              The letter
            </label>
            <Textarea
              className="min-h-40 leading-relaxed"
              id="cover-letter-text"
              onBlur={handleBlur}
              onChange={(event) => setDraft(event.target.value)}
              value={value}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Edits save when you leave the field. This is the model&apos;s text, not a checked or reviewed document:
              read it before you send it, and change anything it got wrong. You are responsible for what you send.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-11 sm:h-9" onClick={() => void copy()} size="sm" type="button" variant="outline">
              <Copy aria-hidden />
              Copy
            </Button>
            <Button className="h-11 sm:h-9" onClick={download} size="sm" type="button" variant="outline">
              <Download aria-hidden />
              Download .txt
            </Button>
            <Button
              className="h-11 sm:h-9"
              onClick={() => {
                if (hasEdits) {
                  setConfirmingRegenerate(true);
                  return;
                }
                regenerate();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden />
              Regenerate
            </Button>
            <Button
              className="h-11 sm:h-9"
              onClick={() => {
                setFeedback(null);
                remove();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>

          {confirmingRegenerate ? (
            <div className="flex flex-col gap-2 rounded-xl bg-background p-3 ring-1 ring-foreground/[0.08]">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Regenerating writes a new letter from the same evidence and replaces this one. Your edits are discarded;
                copying the text out first is the only way to keep them.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button className="h-11 sm:h-9" onClick={regenerate} size="sm" type="button">
                  <RefreshCw aria-hidden />
                  Replace and regenerate
                </Button>
                <Button
                  className="h-11 sm:h-9"
                  onClick={() => setConfirmingRegenerate(false)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Keep my edits
                </Button>
              </div>
            </div>
          ) : null}

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground" role="status">
            {feedback?.kind === "copied" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>Copied {feedback.characters.toLocaleString()} characters to the clipboard.</span>
              </>
            ) : null}
            {feedback?.kind === "saved" ? (
              <>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                <span>Saved your text in this browser. The generated letter is still stored separately.</span>
              </>
            ) : null}
            {feedback?.kind === "failed" ? (
              <>
                <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <span className="text-destructive">{feedback.message}</span>
              </>
            ) : null}
          </p>

          <footer className="flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <p>
              Model {record.model} · mode {record.aiMode} · written {new Date(record.updatedAt).toLocaleString()}
            </p>
            {record.aiMode === "mock" ? (
              <p>
                mode mock means this text came from a recorded answer, not a live model call; it is here so the app runs
                without a provider.
              </p>
            ) : null}
            <p>Stored in this browser only.</p>
          </footer>
        </div>
      )}
    </section>
  );
}
