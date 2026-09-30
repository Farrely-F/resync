"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/**
 * The LaTeX editing surface.
 *
 * CodeMirror 6 with the legacy `stex` stream mode, which is the LaTeX mode that
 * ships for it — there is no `@codemirror/lang-latex` package. `basicSetup`
 * supplies the parts that make hand-editing bearable: line numbers, bracket
 * matching and closing, undo history, search. The whole surface is one `EditorView`
 * over a plain string, so what the parent stores and what the user sees are the
 * same text.
 *
 * Two details are mobile-first and deliberate. Line wrapping is on, so a long
 * `\entryline{...}` wraps instead of forcing a horizontal scroll on a 390 px
 * screen, and the wrapper sets a 16 px font size on small screens because iOS
 * zooms the page when a focused editor's text is smaller than that. The editor
 * scrolls inside a fixed-height box rather than growing the page, so the rest of
 * the form stays reachable.
 *
 * The parent owns the text: `value` is applied when it changes, and `onChange`
 * fires only for changes the user made. A change that arrives from outside
 * (a regenerated document, a theme change) is not added to the undo history, and
 * a `revision` bump throws the history away with the document it belonged to.
 */
function LatexSourceEditorSurface({
  label,
  onChange,
  revision,
  value,
}: {
  /** Accessible name for the editing region. */
  label: string;
  /** Called with the whole document after every user edit. */
  onChange: (tex: string) => void;
  /** Bumped by the parent to replace the document and clear its undo history. */
  revision: number;
  /** The document to show. */
  value: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const revisionRef = useRef(revision);
  const initialValue = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const createState = useCallback(
    (doc: string) =>
      EditorState.create({
        doc,
        extensions: [
          basicSetup,
          latexLanguage,
          editorTheme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": label,
            autocapitalize: "off",
            autocorrect: "off",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    [label],
  );

  useEffect(() => {
    const parent = host.current;
    if (parent === null) {
      return;
    }

    const editor = new EditorView({ parent, state: createState(initialValue.current) });
    view.current = editor;

    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [createState]);

  useEffect(() => {
    const editor = view.current;
    if (editor === null) {
      return;
    }

    if (revision !== revisionRef.current) {
      revisionRef.current = revision;
      editor.setState(createState(value));
      return;
    }

    const current = editor.state.doc.toString();
    if (current !== value) {
      editor.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        annotations: Transaction.addToHistory.of(false),
      });
    }
  }, [createState, revision, value]);

  return (
    <div
      className="h-80 min-w-0 overflow-hidden rounded-xl bg-background ring-1 ring-foreground/[0.08] text-[16px] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-[28rem] sm:text-xs"
      ref={host}
    />
  );
}

const latexLanguage = StreamLanguage.define(stex);

/**
 * The editor's colours come from the same tokens as the rest of the page, so the
 * surface follows the theme instead of CodeMirror's light defaults.
 */
const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent", color: "inherit" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono), ui-monospace, monospace",
    lineHeight: "1.6",
  },
  ".cm-content": { padding: "6px 0", caretColor: "var(--foreground)" },
  ".cm-line": { padding: "0 8px" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--muted-foreground)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--foreground) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--primary) 22%, transparent)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "color-mix(in oklab, var(--primary) 22%, transparent)",
    outline: "1px solid var(--primary)",
  },
  ".cm-nonmatchingBracket": { color: "var(--destructive)" },
  // Folding would cost a gutter column on a phone; the LaTeX here is short enough
  // that the width is worth more.
  ".cm-foldGutter": { display: "none" },
});

/**
 * Memoised: the document it shows is deferred by the parent, so while the reader
 * is typing in a field this editor's props do not change and it does not re-render.
 * Re-rendering it means reconciling a CodeMirror view, which is the single most
 * expensive thing on the page.
 */
export const LatexSourceEditor = memo(LatexSourceEditorSurface);
