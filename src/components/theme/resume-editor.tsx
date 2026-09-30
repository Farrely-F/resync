"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { CompilePanel } from "@/components/compile/compile-panel";
import { BasicsEditor } from "@/components/editor/basics-editor";
import { clearDraft, draftKeyFor, preferNewerRecord, readDraft, writeDraft } from "@/components/editor/draft-journal";
import { normalizeResume } from "@/components/editor/resume-ops";
import { SectionsEditor } from "@/components/editor/sections-editor";
import { saveDebounceMs, useDebouncedSave, type SaveStatus } from "@/components/editor/use-debounced-save";
import { SliceNotice } from "@/components/slice-notice";
import { ThemePicker } from "@/components/theme/theme-picker";
import { Button } from "@/components/ui/button";
import { deriveResumeTitle, type Resume } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";
import { resolveTheme, themes } from "@/lib/themes";
import { renderResumeForThemeId, texFileName } from "@/lib/tex/generate";

type EditorState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "unreadable" }
  | { status: "ready"; record: ResumeRecord };

const saveCopy: Record<SaveStatus, string> = {
  idle: "Changes save to this browser as you type.",
  pending: "Saving…",
  saved: "Saved to this browser.",
  error: "The last change could not be saved.",
};

/**
 * The resume editor: fields, structure, theme, generated LaTeX and PDF.
 *
 * The record lives in IndexedDB, so the resume is loaded in the browser rather
 * than on the server. Everything below is derived: an edit writes the canonical
 * resume back through a debounced queue and re-renders the LaTeX from it, so the
 * document on screen is always the document the last edit produced.
 *
 * The queue is the reason there is no save button — see `useDebouncedSave` for
 * how the last keystroke is still written when the tab is hidden or unmounted.
 */
export function ResumeEditor({ resumeId }: { resumeId: string }) {
  const [state, setState] = useState<EditorState>({ status: "loading" });
  // The newest record, so an edit never has to read the value a render captured.
  const latest = useRef<ResumeRecord | null>(null);

  const persist = useCallback(async (record: ResumeRecord) => {
    await getStorage().putResume(record);
  }, []);

  const { save, flush, status } = useDebouncedSave(persist, { delayMs: saveDebounceMs });

  useEffect(() => {
    let cancelled = false;
    const key = draftKeyFor(resumeId);
    // Read before the record: it is only there when the last session was cut short
    // before its debounced write reached IndexedDB. It is cleared once this run has
    // decided, not while reading, so a discarded development effect cannot eat it.
    const draft = readDraft(key);

    getStorage()
      .getResume(resumeId)
      .then(
        (stored) => {
          if (cancelled) {
            return;
          }

          const record = preferNewerRecord(stored, draft, resumeId);
          latest.current = record;
          setState(record ? { status: "ready", record } : { status: "missing" });
          clearDraft(key);

          if (record !== null && record !== stored) {
            // Recovered: put it back through the normal path so storage and the
            // screen agree again without a second edit.
            void getStorage().putResume({ ...record, resume: normalizeResume(record.resume) });
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

  useEffect(() => {
    const key = draftKeyFor(resumeId);

    function stash() {
      if (latest.current) {
        writeDraft(key, latest.current);
      }
    }

    function stashWhenHidden() {
      if (document.visibilityState === "hidden") {
        stash();
      }
    }

    document.addEventListener("visibilitychange", stashWhenHidden);
    window.addEventListener("pagehide", stash);

    return () => {
      document.removeEventListener("visibilitychange", stashWhenHidden);
      window.removeEventListener("pagehide", stash);
    };
  }, [resumeId]);

  /** Puts a record on screen and queues the normalised copy for storage. */
  const writeRecord = useCallback(
    (next: ResumeRecord) => {
      // The title is derived, so it is refreshed here rather than left to whoever
      // built the record: the library list reads it, and the journal copies it.
      const titled: ResumeRecord = { ...next, title: deriveResumeTitle(next.resume) };
      latest.current = titled;
      setState({ status: "ready", record: titled });
      save({ ...titled, resume: normalizeResume(titled.resume) });
    },
    [save],
  );

  const applyResume = useCallback(
    (next: Resume) => {
      const current = latest.current;
      if (!current) {
        return;
      }
      writeRecord({ ...current, resume: next, updatedAt: new Date().toISOString() });
    },
    [writeRecord],
  );

  const selectTheme = useCallback(
    (themeId: string) => {
      const current = latest.current;
      if (!current || current.themeId === themeId) {
        return;
      }
      writeRecord({ ...current, themeId, updatedAt: new Date().toISOString() });
    },
    [writeRecord],
  );

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
  // Manual mode means the saved LaTeX is the document; editing fields would not
  // reach it, so the fields are shown read-only with the reason next to them.
  const editable = record.mode !== "manual";
  const themeName = resolveTheme(record.themeId).name;
  // Empty optional fields are normalised on the way into the generator as well as
  // on the way to storage, so the preview shows the document the data produces.
  const report = renderResumeForThemeId(normalizeResume(record.resume), record.themeId);
  const title = deriveResumeTitle(record.resume);

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
          Edit the fields and the structure; the LaTeX and the PDF follow your data. Everything stays in this browser.
        </p>
      </div>

      {editable ? null : (
        <section
          aria-labelledby="manual-mode-heading"
          className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4"
        >
          <h2 className="text-sm font-semibold" id="manual-mode-heading">
            Hand-edited LaTeX: field editing is off
          </h2>
          <p className="text-sm leading-relaxed">
            This resume is in manual mode: its document was edited as LaTeX by hand, so it is no longer generated from
            the fields below. Changing a field would not change your document and would leave the two out of step, so
            the fields are read-only here. The saved LaTeX itself is untouched.
          </p>
        </section>
      )}

      {editable ? null : (
        <SliceNotice issue={8}>
          The action that regenerates the document from these fields is not built yet.
        </SliceNotice>
      )}

      <ThemePicker onSelect={selectTheme} selectedId={record.themeId} themes={themes} />

      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saveCopy[status]}
        </p>
        {status === "error" ? (
          <p className="text-sm text-destructive" role="alert">
            This browser refused to store the change, so a reload may show the previous version. Nothing was lost on
            screen; check that local storage is available and try the edit again.
          </p>
        ) : null}
      </div>

      {/*
        `min-w-0` is load-bearing: a fieldset's user-agent style is
        `min-width: min-content`, which would let this one grow past the page
        column on a narrow phone and give the document a horizontal scroll.
      */}
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={!editable} onBlur={() => void flush()}>
        <legend className="sr-only">Resume fields</legend>
        <div className="flex flex-col gap-6">
          <BasicsEditor onChange={applyResume} resume={record.resume} />
          <SectionsEditor onChange={applyResume} resume={record.resume} />
        </div>
      </fieldset>

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
          {themeName} theme.
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

      <CompilePanel tex={report.tex} themeName={themeName} title={title} />
    </div>
  );
}
