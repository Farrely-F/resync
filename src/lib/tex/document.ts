import { resolveLayout } from "@/lib/layout";
import type { Resume } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";
import { renderResumeForThemeId } from "@/lib/tex/generate";

/**
 * Which text is the document of record, and the two transitions that change it.
 *
 * A stored resume can hold two documents: the LaTeX generated from its canonical
 * data, and — in manual mode — the LaTeX the user wrote by hand. Everything that
 * shows, compiles or exports a document has to agree on which one that is, so
 * the rule lives here once and every surface asks this module instead of deciding
 * for itself. It was two rules before: the `.tex` export read `manualTex`, the
 * compile panel re-rendered from the data, and a hand-edited resume therefore
 * exported one document and compiled another.
 *
 * The canonical data stays the source of truth for a structured resume; manual
 * mode is the explicit statement that the hand-written text is the document until
 * the user regenerates it. Nothing here normalises or rewrites the canonical
 * resume: the writer does that on the way to storage, so the record this reads is
 * already the shape the rest of the app persists.
 */

export interface ResumeDocument {
  tex: string;
  /**
   * `manual` when the document is the hand-edited LaTeX stored with the record;
   * `generated` when it was rendered from the canonical resume.
   */
  source: "manual" | "generated";
}

/**
 * The document of record for a stored resume.
 *
 * A record in manual mode with no stored LaTeX falls back to the generated
 * document rather than compiling an empty file: the mode says "do not rewrite
 * this", not "there is nothing here".
 */
export function documentSource(record: ResumeRecord): ResumeDocument {
  if (record.mode === "manual" && record.manualTex !== null) {
    return { tex: record.manualTex, source: "manual" };
  }

  return { tex: renderResumeForThemeId(record.resume, record.themeId, resolveLayout(record.layout)).tex, source: "generated" };
}

/**
 * The record after a hand edit of the document, or `null` when the edit left the
 * document exactly as it was.
 *
 * The trigger for manual mode is a change to the text, not the act of typing in
 * the source: an editor that is opened, scrolled or focused produces no change at
 * all, and an edit that puts the text back the way it was leaves the resume
 * generated. The first change that actually differs takes the resume off the
 * generated path and makes the edited text the document of record; from then on
 * the same call just replaces that text, because the mode is already manual.
 *
 * The caller writes the returned record through the editor's existing debounced
 * writer, so "the first edit" and "the first saved edit" are the same event from
 * the user's side — and a write that fails is reported by the save status rather
 * than quietly claimed.
 */
export function applyHandEdit(record: ResumeRecord, editedTex: string, now: string): ResumeRecord | null {
  if (editedTex === documentSource(record).tex) {
    return null;
  }

  return { ...record, mode: "manual", manualTex: editedTex, updatedAt: now };
}

/**
 * Back to the generated document: the resume is structured again and the
 * hand-edited LaTeX is dropped, which is why the only caller asks for
 * confirmation first.
 *
 * A record that is already structured is returned unchanged, so the call cannot
 * be used to touch `updatedAt` without an actual change.
 */
export function regenerateFromData(record: ResumeRecord, now: string): ResumeRecord {
  if (record.mode === "structured" && record.manualTex === null) {
    return record;
  }

  return { ...record, mode: "structured", manualTex: null, updatedAt: now };
}

export interface FieldEditOutcome {
  record: ResumeRecord;
  /**
   * True when applying this edit replaces a hand-edited document, which the caller
   * has to say out loud before it happens.
   */
  replacesManualDocument: boolean;
}

/**
 * The record after an edit to the fields.
 *
 * A structured resume simply takes the new data. A manual one cannot: its
 * hand-edited LaTeX *is* its document, and rewriting the fields underneath it
 * would leave the two out of step with no way to tell which one the reader meant.
 * So a field edit is what ends manual mode — and because that discards text the
 * reader wrote, the caller must ask first, which is what the flag is for.
 *
 * This is the closest thing to two-way sync the format allows. Fields to document
 * is exact, because the generator owns the format; document to fields is not, in
 * general, because hand-written LaTeX can say things the model cannot hold. Rather
 * than pretend otherwise, the app keeps one direction exact and makes the other
 * an explicit choice.
 */
export function applyFieldEdit(record: ResumeRecord, next: Resume, now: string): FieldEditOutcome {
  if (record.mode !== "manual") {
    return { record: { ...record, resume: next, updatedAt: now }, replacesManualDocument: false };
  }

  return { record: regenerateFromData({ ...record, resume: next }, now), replacesManualDocument: true };
}
