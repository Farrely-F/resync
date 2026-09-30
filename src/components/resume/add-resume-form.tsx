"use client";

import { useRef, useState } from "react";
import { CircleAlert, LoaderCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractPastedText, extractResumeFile } from "@/lib/resume/extract";
import { addResumeFromText } from "@/lib/resume/library";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * Two ways to add a resume: pick a file, or paste text.
 *
 * The file is read in this browser and only its extracted text is sent for
 * structuring. Failures arrive here as messages, not thrown errors, so an
 * image-only PDF tells the user what to do instead of silently producing an
 * empty resume.
 */
export function AddResumeForm({ onAdded }: { onAdded: (record: ResumeRecord) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pastedText, setPastedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveExtractedText(plainText: string, successMessage: string) {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const record = await addResumeFromText(plainText);
      onAdded(record);
      setPastedText("");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      setNotice(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this resume.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const extracted = await extractResumeFile(file);

    if (!extracted.ok) {
      setBusy(false);
      setError(extracted.message);
      return;
    }

    await saveExtractedText(extracted.text, `Added "${file.name}".`);
  }

  function handlePaste() {
    const extracted = extractPastedText(pastedText);

    if (!extracted.ok) {
      setError(extracted.message);
      return;
    }

    void saveExtractedText(extracted.text, "Added the pasted text.");
  }

  return (
    <section
      className="rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4"
      data-tour="resume-add"
    >
      <h2 className="text-sm font-semibold tracking-tight">Add a resume</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        PDF, DOCX, TXT or Markdown. The file stays in this browser; only its extracted text is structured.
      </p>

      <div className="mt-4 flex flex-col gap-2" data-tour="resume-file">
        <Label htmlFor="resume-file">Choose a file</Label>
        <input
          accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          className="block w-full cursor-pointer rounded-xl border border-input bg-card shadow-[inset_0_1px_2px_oklch(0.2_0.03_265/0.05)] p-2 text-sm transition-colors hover:border-foreground/25 file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
          disabled={busy}
          id="resume-file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
          ref={fileInput}
          type="file"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2" data-tour="resume-paste">
        <Label htmlFor="resume-text">Or paste the resume text</Label>
        <Textarea
          className="min-h-32"
          disabled={busy}
          id="resume-text"
          onChange={(event) => setPastedText(event.target.value)}
          placeholder="Paste the full text of the resume here."
          value={pastedText}
        />
        <div>
          <Button
            className="h-11"
            disabled={busy || pastedText.trim().length === 0}
            onClick={handlePaste}
            type="button"
            variant="outline"
          >
            <Upload aria-hidden />
            Structure pasted text
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="mt-4 text-sm">
        {busy ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Extracting and structuring…
          </p>
        ) : error ? (
          <p className="flex items-start gap-2 text-destructive">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : notice ? (
          <p className="text-muted-foreground">{notice}</p>
        ) : null}
      </div>
    </section>
  );
}
