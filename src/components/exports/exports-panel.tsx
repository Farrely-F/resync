"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CircleAlert, Copy, FileJson, FileText, Printer } from "lucide-react";

import { jsonBytes } from "@/components/exports/accounting";
import {
  jsonFileName,
  resumeExportJson,
  resumePlainText,
  resumeTex,
} from "@/components/exports/resume-export";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { engineAssetTotalBytes, formatBytes } from "@/lib/compile/assets";
import { deriveResumeTitle } from "@/lib/resume/schema";
import { formatUpdatedAt } from "@/lib/resume/library";
import type { ResumeRecord } from "@/lib/storage/types";
import { resolveTheme } from "@/lib/themes";
import { texFileName } from "@/lib/tex/generate";
import { cn } from "@/lib/utils";

/**
 * Exports for one stored resume.
 *
 * Everything offered here is produced from the record in this browser: no export
 * uploads anything, and none of them is a preview of a different document. The
 * PDF is the one exception in shape only — it needs the TeX engine, which lives
 * in the compile panel in the resume editor, so that is where this points. A
 * second compile UI here would mean two consent gates and two engine-cache
 * controls on one page.
 */

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Feedback carries the record it belongs to, so switching the selection cannot
 * leave "Copied 692 characters" sitting under a different resume's exports.
 */
type ExportFeedback =
  | { recordId: string; kind: "tex" }
  | { recordId: string; kind: "json" }
  | { recordId: string; kind: "copied"; characters: number }
  | { recordId: string; kind: "failed"; message: string };

export function ExportsPanel({ records }: { records: ResumeRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ExportFeedback | null>(null);

  const record = records.find((candidate) => candidate.id === selectedId) ?? records[0] ?? null;
  const recordId = record?.id ?? null;
  const current = feedback !== null && feedback.recordId === recordId ? feedback : null;

  async function copyPlainText(resume: ResumeRecord) {
    const text = resumePlainText(resume.resume);
    if (!navigator.clipboard) {
      setFeedback({
        recordId: resume.id,
        kind: "failed",
        message: "This browser exposes no clipboard API, so nothing was copied. Download the JSON or the .tex instead.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ recordId: resume.id, kind: "copied", characters: text.length });
    } catch (error) {
      setFeedback({
        recordId: resume.id,
        kind: "failed",
        message: `The browser refused the clipboard write: ${error instanceof Error ? error.message : String(error)}. Nothing was copied.`,
      });
    }
  }

  return (
    <section aria-labelledby="exports-heading" className="flex flex-col gap-4 rounded-lg border border-border/60 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium" id="exports-heading">
          Exports
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every export is generated from the stored record in this browser. Nothing is uploaded and nothing is
          reformatted on the way out: the JSON is the canonical resume, the LaTeX is the document the editor shows.
        </p>
      </div>

      {record === null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No resume is stored yet, so there is nothing to export.{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/resumes">
            Add a resume
          </Link>{" "}
          and it will appear here.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="export-resume">Resume to export</Label>
            <Select
              items={records.map((candidate) => ({
                value: candidate.id,
                label: `${deriveResumeTitle(candidate.resume)} — updated ${formatUpdatedAt(candidate.updatedAt)}`,
              }))}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setSelectedId(value);
                }
              }}
              value={record.id}
            >
              <SelectTrigger className="min-h-11 w-full" id="export-resume">
                <SelectValue placeholder="Select a resume" />
              </SelectTrigger>
              <SelectContent>
                {records.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {deriveResumeTitle(candidate.resume)} — updated {formatUpdatedAt(candidate.updatedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {formatBytes(jsonBytes(record))} stored, {resolveTheme(record.themeId).name} theme,{" "}
            {record.mode === "manual" ? "hand-edited LaTeX" : "generated LaTeX"}.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="h-11 sm:h-9"
                onClick={() => {
                  const tex = resumeTex(record);
                  download(texFileName(deriveResumeTitle(record.resume)), tex.tex, "application/x-tex");
                  setFeedback({ recordId: record.id, kind: "tex" });
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <FileText aria-hidden />
                Download .tex
              </Button>

              <Button
                className="h-11 sm:h-9"
                onClick={() => {
                  download(
                    jsonFileName(deriveResumeTitle(record.resume)),
                    resumeExportJson(record, new Date().toISOString()),
                    "application/json",
                  );
                  setFeedback({ recordId: record.id, kind: "json" });
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <FileJson aria-hidden />
                Download JSON
              </Button>

              <Button
                className="h-11 sm:h-9"
                onClick={() => void copyPlainText(record)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Copy aria-hidden />
                Copy as plain text
              </Button>
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground" role="status">
              {current?.kind === "tex" ? (
                <>
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Saved {texFileName(deriveResumeTitle(record.resume))}
                    {resumeTex(record).source === "manual"
                      ? " from the hand-edited LaTeX saved with this resume."
                      : " from the generated document."}
                  </span>
                </>
              ) : null}
              {current?.kind === "json" ? (
                <>
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Saved {jsonFileName(deriveResumeTitle(record.resume))}: the complete canonical resume, the theme
                    id, the mode, the extracted text and the timestamps.
                  </span>
                </>
              ) : null}
              {current === null ? <span>Choose an export above.</span> : null}
              {current?.kind === "copied" ? (
                <>
                  <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Copied {current.characters.toLocaleString()} characters of plain text, rendered from the structured
                    resume — not from the original upload.
                  </span>
                </>
              ) : null}
              {current?.kind === "failed" ? (
                <>
                  <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  <span className="text-destructive">{current.message}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
            <h3 className="text-xs font-medium">PDF</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              A PDF needs the bundled TeX engine, and there is one compile UI: the one in the editor, next to the same
              generated LaTeX for this resume. It compiles on this device; the engine is{" "}
              {formatBytes(engineAssetTotalBytes)} and is downloaded there on first use. If the engine cannot run here,
              the plain-text and .tex exports carry the same content.
            </p>
            <div>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}
                href={`/resumes/${record.id}/edit`}
              >
                <Printer aria-hidden />
                Open this resume to compile a PDF
              </Link>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
