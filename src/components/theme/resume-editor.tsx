"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { PreviewPanel } from "@/components/compile/preview-panel";
import { useCompileEngine } from "@/components/compile/use-compile-engine";
import { BasicsEditor } from "@/components/editor/basics-editor";
import { FieldEditConfirm } from "@/components/editor/field-edit-confirm";
import { CollapsibleSection } from "@/components/editor/collapsible-section";
import { clearDraft, draftKeyFor, preferNewerRecord, readDraft, writeDraft } from "@/components/editor/draft-journal";
import { normalizeResume } from "@/components/editor/resume-ops";
import { SectionsEditor } from "@/components/editor/sections-editor";
import { saveDebounceMs, useDebouncedSave, type SaveStatus } from "@/components/editor/use-debounced-save";
import { LatexSourceEditor } from "@/components/latex-editor/latex-source-editor";
import { ManualModeBadge } from "@/components/latex-editor/manual-mode-badge";
import { RegenerateConfirm } from "@/components/latex-editor/regenerate-confirm";
import { PageLayoutControls } from "@/components/theme/page-layout-controls";
import { TailoredNotice } from "@/components/theme/tailored-notice";
import { ThemePicker } from "@/components/theme/theme-picker";
import { TourLauncher } from "@/components/tour/tour-launcher";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { deriveResumeTitle, type Resume } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";
import { paperSizes, resolveLayout, type PageLayout } from "@/lib/layout";
import { resolveTheme, themes } from "@/lib/themes";
import { applyFieldEdit, applyHandEdit, documentSource, regenerateFromData } from "@/lib/tex/document";
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
  /** Bumped when the document is replaced rather than edited, to reset the editor's undo history. */
  const [sourceRevision, setSourceRevision] = useState(0);
  /**
   * Live preview is on by default, because watching the document change is the
   * point of having it. It is a switch rather than a hidden behaviour: compiling
   * costs CPU and battery, and a phone on a train is a good reason to stop it.
   */
  const [livePreview, setLivePreview] = useState(true);
  /**
   * A field edit that would replace a hand-edited document, held until the reader
   * answers. Nothing is written while it is set: the resume on screen is still the
   * one the LaTeX describes.
   */
  const [pendingEdit, setPendingEdit] = useState<Resume | null>(null);
  /**
   * Which editing surface is on screen. Only one is mounted at a time: the two are
   * two views of one document, and keeping both alive meant every keystroke
   * re-rendered both — including a CodeMirror view that was not even visible.
   *
   * The first choice follows the resume: a manual resume's document is its LaTeX,
   * so that is where the reader was working.
   */
  const [surface, setSurface] = useState<"fields" | "latex" | null>(null);
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

          // The record on screen is normalised, and so is the record the writer
          // stores: if the two could differ, the LaTeX shown here and the document
          // the exports panel writes would be two different documents.
          const loaded = preferNewerRecord(stored, draft, resumeId);
          if (loaded === null) {
            latest.current = null;
            setState({ status: "missing" });
          } else {
            const record: ResumeRecord = { ...loaded, resume: normalizeResume(loaded.resume) };
            latest.current = record;
            setState({ status: "ready", record });

            if (loaded !== stored || JSON.stringify(record.resume) !== JSON.stringify(loaded.resume)) {
              // Recovered from the journal, or stored before the writer normalised:
              // put it back through the normal path so storage and the screen agree
              // again without a second edit.
              void getStorage().putResume(record);
            }
          }

          clearDraft(key);
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

  /** Puts a record on screen and queues the same record for storage. */
  const writeRecord = useCallback(
    (next: ResumeRecord) => {
      // The title is derived, and the resume is normalised, so the record on screen
      // is the record in storage — not a display copy of it. The LaTeX preview, the
      // compile panel and the export all then read one document.
      const normalized: ResumeRecord = { ...next, resume: normalizeResume(next.resume) };
      const titled: ResumeRecord = { ...normalized, title: deriveResumeTitle(normalized.resume) };
      latest.current = titled;
      setState({ status: "ready", record: titled });
      save(titled);
    },
    [save],
  );

  const applyResume = useCallback(
    (next: Resume) => {
      const current = latest.current;
      if (!current) {
        return;
      }

      const outcome = applyFieldEdit(current, next, new Date().toISOString());
      if (outcome.replacesManualDocument) {
        setPendingEdit(next);
        return;
      }

      writeRecord(outcome.record);
    },
    [writeRecord],
  );

  /**
   * The reader chose the fields over their LaTeX. The document is replaced with
   * it, so the source editor's undo history goes too — it held the text that is
   * being discarded.
   */
  const confirmFieldEdit = useCallback(() => {
    const current = latest.current;
    const next = pendingEdit;
    setPendingEdit(null);

    if (current === null || next === null) {
      return;
    }

    writeRecord(applyFieldEdit(current, next, new Date().toISOString()).record);
    setSourceRevision((revision) => revision + 1);
  }, [pendingEdit, writeRecord]);

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

  const changeLayout = useCallback(
    (layout: PageLayout) => {
      const current = latest.current;
      if (!current) {
        return;
      }
      writeRecord({ ...current, layout, updatedAt: new Date().toISOString() });
    },
    [writeRecord],
  );

  /**
   * A hand edit of the source.
   *
   * `applyHandEdit` decides whether this is an edit at all: text that matches the
   * document of record is not one, so opening, scrolling or focusing the editor
   * can never flip the mode, and the first text that differs takes the resume off
   * the generated path and becomes its document. The write then goes through the
   * same debounced queue as a field edit — flushed when the tab is hidden, on
   * `pagehide` and on unmount, and reported through the save status if it fails.
   */
  const editSource = useCallback(
    (editedTex: string) => {
      const current = latest.current;
      if (current === null) {
        return;
      }

      const next = applyHandEdit(current, editedTex, new Date().toISOString());
      if (next !== null) {
        writeRecord(next);
      }
    },
    [writeRecord],
  );

  const regenerate = useCallback(() => {
    const current = latest.current;
    if (current === null) {
      return;
    }

    const next = regenerateFromData(current, new Date().toISOString());
    if (next === current) {
      return;
    }

    writeRecord(next);
    // The editor's undo history still holds the discarded hand edits, so the
    // document is replaced along with it: regenerating cannot be undone back into
    // manual mode, which needs a second edit.
    setSourceRevision((revision) => revision + 1);
  }, [writeRecord]);

  // Hooks cannot be conditional, so the engine is created before the branches
  // below. While the record is still loading the document is empty and the live
  // preview is off, which is what stops an empty document from ever compiling.
  const documentTex = useMemo(
    () => (state.status === "ready" ? documentSource(state.record).tex : ""),
    [state],
  );

  /**
   * The same text, one transition behind.
   *
   * Typing a character re-derives the document and re-renders the editor; the
   * surfaces that *show* the document — the LaTeX editor, the preview, and the
   * source check that gates the engine — do not have to keep up keystroke for
   * keystroke, and two of them are expensive: reconciling CodeMirror, and parsing
   * the whole document to validate it. Deferring them keeps the keystroke itself
   * cheap, and the document they show is the same document a moment later.
   */
  const deferredTex = useDeferredValue(documentTex);

  /**
   * The dropped-character warning describes the generated document, which is not
   * the document on screen in manual mode. Memoised because it renders the whole
   * document to find characters the engine cannot typeset, and hoisted above the
   * branches because a hook cannot live inside one.
   */
  const droppedCharacters = useMemo(() => {
    if (state.status !== "ready" || state.record.mode === "manual") {
      return [];
    }

    return renderResumeForThemeId(state.record.resume, state.record.themeId, resolveLayout(state.record.layout))
      .droppedCharacters;
  }, [state]);
  const engine = useCompileEngine({
    tex: deferredTex,
    auto: livePreview && state.status === "ready",
  });

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
        <h1 className="title">
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

  if (surface === null) {
    setSurface(record.mode === "manual" ? "latex" : "fields");
  }

  // Manual mode means the saved LaTeX is the document; editing fields would not
  // reach it, so the fields are shown read-only with the reason next to them.
  const editable = record.mode !== "manual";
  const themeName = resolveTheme(record.themeId).name;
  const layout = resolveLayout(record.layout);
  // One rule decides which text is the document, and the compile panel is handed
  // the same record so it resolves to the same text.
  const resumeDocument = documentSource(record);
  const title = deriveResumeTitle(record.resume);

  function downloadTex() {
    const url = URL.createObjectURL(new Blob([resumeDocument.tex], { type: "application/x-tex" }));
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
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="title">{title}</h1>
            {editable ? null : <ManualModeBadge />}
          </div>
          <TourLauncher />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {editable
            ? "Edit the fields and the structure; the LaTeX and the PDF follow your data. Everything stays in this browser."
            : "The LaTeX below is this resume's document; the fields and the theme no longer produce it. Everything stays in this browser."}
        </p>
      </div>

      <TailoredNotice record={record} />

      {editable ? null : (
        <Alert>
          <AlertTitle>Hand-edited LaTeX: the document is yours</AlertTitle>
          <AlertDescription>
            <p>
              This resume is in manual mode: the LaTeX below was edited by hand, so it is the document, and the fields
              no longer produce it. Editing a field is still the way back — it regenerates the document from your data,
              which replaces the LaTeX you wrote. You will be asked first, and the saved LaTeX stays untouched until you
              answer.
            </p>
            <p>
              The other way back is to regenerate now, without editing a field. Either one discards the hand-edited
              LaTeX, which this browser cannot undo, so download the .tex first if you want to keep it.
            </p>
            <RegenerateConfirm onConfirm={regenerate} />
          </AlertDescription>
        </Alert>
      )}

      <FieldEditConfirm
        onCancel={() => setPendingEdit(null)}
        onConfirm={confirmFieldEdit}
        open={pendingEdit !== null}
      />

      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saveCopy[status]}
        </p>
        {status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>The last change was not saved</AlertTitle>
            <AlertDescription>
              This browser refused to store the change, so a reload may show the previous version. Nothing was lost on
              screen; check that local storage is available and try the edit again.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/*
        The preview leads on a phone — the document is what the editor is for —
        and becomes the sticky second column on a wide screen. `min-w-0` on both
        columns is load-bearing: a fieldset's user-agent style is
        `min-width: min-content`, which would otherwise let the fields column grow
        past the page column on a narrow phone and give the document a horizontal
        scroll.
      */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="order-first min-w-0 lg:sticky lg:top-4 lg:order-2 lg:self-start" data-tour="editor-preview">
          <PreviewPanel
            engine={engine}
            live={livePreview}
            onLiveChange={setLivePreview}
            onRepair={editSource}
            source={resumeDocument.source}
            tex={deferredTex}
            themeName={themeName}
            title={title}
          />
        </div>

        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-1">
          <CollapsibleSection
            headingLevel={2}
            summary={`${themeName} · ${paperSizes.find((paper) => paper.id === layout.paper)?.name}`}
            title="Appearance"
            tourId="editor-theme"
          >
            <div className="flex flex-col gap-5">
              <ThemePicker onSelect={selectTheme} selectedId={record.themeId} themes={themes} />
              <PageLayoutControls
                layout={layout}
                manual={!editable}
                onChange={changeLayout}
                themeMargin={resolveTheme(record.themeId).margin}
              />
            </div>
          </CollapsibleSection>

          <Tabs onValueChange={(value) => setSurface(value as "fields" | "latex")} value={surface ?? "fields"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList aria-label="Editing surface" className="h-11 sm:h-9">
                <TabsTrigger className="h-9" value="fields">
                  Fields
                </TabsTrigger>
                <TabsTrigger className="h-9" value="latex">
                  LaTeX
                </TabsTrigger>
              </TabsList>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {surface === "latex"
                  ? "This text is the document while you edit it here."
                  : "Editing here regenerates the document from your data."}
              </p>
            </div>

            <TabsContent keepMounted={false} value="fields">
              <fieldset
              className="m-0 min-w-0 border-0 p-0"
              data-tour="editor-fields"
              onBlur={() => void flush()}
            >
              <legend className="sr-only">Resume fields</legend>
              <div className="flex flex-col gap-6">
                <BasicsEditor onChange={applyResume} resume={record.resume} />
                <SectionsEditor onChange={applyResume} resume={record.resume} />
              </div>
              </fieldset>
            </TabsContent>

            <TabsContent keepMounted={false} value="latex">
              <CollapsibleSection
                actions={
              <>
                {editable ? null : <ManualModeBadge />}
                <Button className="h-11" onClick={downloadTex} size="sm" variant="outline">
                  <Download aria-hidden />
                  Download .tex
                </Button>
              </>
            }
            headingLevel={2}
            summary={`${deferredTex.split("\n").length} lines, ${(deferredTex.length / 1024).toFixed(1)} kB`}
            title="LaTeX source"
            tourId="editor-latex"
          >
            <p className="text-xs leading-relaxed text-muted-foreground">
              Editing this text by hand takes the resume off the generated path: the document becomes yours, the fields
              become read-only, and nothing rewrites it until you regenerate it from your data.
            </p>

            {droppedCharacters.length > 0 ? (
              <div className="mt-3">
                <Alert variant="destructive">
                  <AlertTitle>The engine cannot typeset everything in this resume</AlertTitle>
                  <AlertDescription>
                    {droppedCharacters.length} character
                    {droppedCharacters.length === 1 ? "" : "s"} were left out:{" "}
                    <span className="font-mono">{droppedCharacters.join(" ")}</span>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="mt-3">
              <LatexSourceEditor
                label="LaTeX source"
                onChange={editSource}
                revision={sourceRevision}
                value={deferredTex}
              />
              </div>
            </CollapsibleSection>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
