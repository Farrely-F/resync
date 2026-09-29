"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompilePanel } from "@/components/compile/compile-panel";
import { ThemePicker } from "@/components/theme/theme-picker";
import { deriveResumeTitle } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";
import { resolveTheme, themes } from "@/lib/themes";
import { renderResumeForThemeId, texFileName } from "@/lib/tex/generate";

type EditorState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "unreadable" }
  | { status: "ready"; record: ResumeRecord };

/**
 * The theme surface of the resume editor.
 *
 * The record lives in IndexedDB, so the resume is loaded in the browser rather
 * than on the server. Everything rendered here is derived: picking a theme writes
 * `themeId` back to the record and regenerates the LaTeX from the canonical data.
 */
export function ResumeEditor({ resumeId }: { resumeId: string }) {
  const [state, setState] = useState<EditorState>({ status: "loading" });
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getStorage()
      .getResume(resumeId)
      .then(
        (record) => {
          if (!cancelled) {
            setState(record ? { status: "ready", record } : { status: "missing" });
          }
        },
        () => {
          if (!cancelled) {
            setState({ status: "unreadable" });
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  if (state.status === "loading") {
    return (
      <p className="py-4 text-sm text-muted-foreground" role="status">
        Loading the resume from this browser.
      </p>
    );
  }

  if (state.status !== "ready") {
    return (
      <div className="flex flex-col gap-3 py-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {state.status === "missing" ? "Resume not found" : "Local storage is unavailable"}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {state.status === "missing" ? (
            <>
              No resume with the id <span className="font-mono text-foreground">{resumeId}</span> is stored in this
              browser. It may have been deleted, or this link came from another device.
            </>
          ) : (
            <>This browser refused access to its local database, so the resume cannot be read or saved right now.</>
          )}
        </p>
        <p>
          <Link className="text-sm underline underline-offset-4 hover:text-foreground" href="/resumes">
            Back to resumes
          </Link>
        </p>
      </div>
    );
  }

  const { record } = state;
  const report = renderResumeForThemeId(record.resume, record.themeId);
  const title = deriveResumeTitle(record.resume);

  async function selectTheme(themeId: string) {
    if (record.themeId === themeId) {
      return;
    }

    const updated: ResumeRecord = { ...record, themeId, updatedAt: new Date().toISOString() };
    setState({ status: "ready", record: updated });
    setSaveError(null);

    try {
      await getStorage().putResume(updated);
    } catch {
      // Do not leave a selection on screen that a reload would silently undo.
      setState({ status: "ready", record });
      setSaveError("The theme could not be saved to this browser, so the previous choice was restored.");
    }
  }

  function downloadTex() {
    const url = URL.createObjectURL(new Blob([report.tex], { type: "application/x-tex" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = texFileName(title);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href="/resumes">
            Resumes
          </Link>{" "}
          / <span className="font-mono">{record.id}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The theme decides how the generated LaTeX sets your resume. Changing it re-renders the document below from
          your structured data; nothing is uploaded.
        </p>
      </div>

      <ThemePicker onSelect={selectTheme} selectedId={record.themeId} themes={themes} />

      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Generated LaTeX</h2>
          <Button className="h-11 sm:h-9" onClick={downloadTex} size="sm" variant="outline">
            <Download aria-hidden />
            Download .tex
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {report.tex.split("\n").length} lines, {(report.tex.length / 1024).toFixed(1)} kB, rendered with the{" "}
          {resolveTheme(record.themeId).name} theme.
          {record.mode === "manual" ? (
            <>
              {" "}
              This resume is in manual mode: the LaTeX below is generated from your data, not from the saved manual
              LaTeX.
            </>
          ) : null}
        </p>

        {report.droppedCharacters.length > 0 ? (
          <p className="text-xs leading-relaxed text-destructive">
            {report.droppedCharacters.length} character
            {report.droppedCharacters.length === 1 ? "" : "s"} could not be typeset by the bundled engine and were left
            out: <span className="font-mono">{report.droppedCharacters.join(" ")}</span>
          </p>
        ) : null}

        <pre
          aria-label="Generated LaTeX"
          className="max-h-96 min-w-0 overflow-auto rounded-lg border border-border/60 bg-muted p-3 text-xs leading-relaxed"
          tabIndex={0}
        >
          <code>{report.tex}</code>
        </pre>
      </section>

      <CompilePanel tex={report.tex} themeName={resolveTheme(record.themeId).name} title={title} />
    </div>
  );
}
