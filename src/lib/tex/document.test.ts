import { describe, expect, it } from "vitest";

import { parseResumeFixture } from "@/lib/resume/fixtures";
import type { ResumeRecord } from "@/lib/storage/types";
import { applyHandEdit, documentSource, regenerateFromData } from "@/lib/tex/document";
import { renderResumeForThemeId } from "@/lib/tex/generate";

const handWritten = "\\documentclass{article}\n\\begin{document}\nHAND WRITTEN MARKER\n\\end{document}\n";

function record(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "resume-1",
    title: "Priya Raman",
    resume: parseResumeFixture,
    plainText: "extracted text",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const generatedTex = renderResumeForThemeId(parseResumeFixture, "classic").tex;

describe("documentSource", () => {
  it("renders the canonical data for a structured resume", () => {
    expect(documentSource(record())).toEqual({ tex: generatedTex, source: "generated" });
  });

  it("returns the saved hand-edited LaTeX for a manual resume", () => {
    expect(documentSource(record({ mode: "manual", manualTex: handWritten }))).toEqual({
      tex: handWritten,
      source: "manual",
    });
  });

  it("falls back to the generated document when manual mode holds no LaTeX", () => {
    expect(documentSource(record({ mode: "manual", manualTex: null }))).toEqual({
      tex: generatedTex,
      source: "generated",
    });
  });

  it("still returns the hand-edited LaTeX when the canonical data or the theme changed", () => {
    const manual = record({ mode: "manual", manualTex: handWritten });

    expect(documentSource({ ...manual, themeId: "compact" })).toEqual({ tex: handWritten, source: "manual" });
    expect(documentSource({ ...manual, resume: { ...parseResumeFixture, basics: { ...parseResumeFixture.basics, name: "Someone Else" } } })).toEqual(
      { tex: handWritten, source: "manual" },
    );
  });
});

describe("applyHandEdit", () => {
  it("takes a structured resume off the generated path, storing the edited text", () => {
    const stored = record();
    const next = applyHandEdit(stored, handWritten, "2026-02-02T00:00:00.000Z");

    expect(next).not.toBeNull();
    expect(next).toMatchObject({
      mode: "manual",
      manualTex: handWritten,
      updatedAt: "2026-02-02T00:00:00.000Z",
      themeId: "classic",
      plainText: "extracted text",
    });
    // The record it was given is untouched; the editor holds it in React state.
    expect(stored.mode).toBe("structured");
    expect(stored.manualTex).toBeNull();
  });

  it("does nothing when the text did not change, so opening the source is not an edit", () => {
    expect(applyHandEdit(record(), generatedTex, "2026-02-02T00:00:00.000Z")).toBeNull();
    expect(
      applyHandEdit(record({ mode: "manual", manualTex: handWritten }), handWritten, "2026-02-02T00:00:00.000Z"),
    ).toBeNull();
  });

  it("replaces the stored LaTeX of an already-manual resume", () => {
    const next = applyHandEdit(
      record({ mode: "manual", manualTex: handWritten }),
      `${handWritten}% second pass\n`,
      "2026-02-02T00:00:00.000Z",
    );

    expect(next).toMatchObject({ mode: "manual", manualTex: `${handWritten}% second pass\n` });
  });

  it("keeps the resume manual when the edit is not text at all", () => {
    // Undoing the very first edit is still an edit of a manual resume: there is no
    // path back except regenerating from the data.
    const manual = record({ mode: "manual", manualTex: handWritten });
    const next = applyHandEdit(manual, "\\documentclass{article}\n", "2026-02-02T00:00:00.000Z");

    expect(next?.mode).toBe("manual");
  });
});

describe("regenerateFromData", () => {
  it("returns a manual resume to the generated document and drops the hand edits", () => {
    const next = regenerateFromData(
      record({ mode: "manual", manualTex: handWritten }),
      "2026-02-02T00:00:00.000Z",
    );

    expect(next).toMatchObject({ mode: "structured", manualTex: null, updatedAt: "2026-02-02T00:00:00.000Z" });
    expect(documentSource(next)).toEqual({ tex: generatedTex, source: "generated" });
  });

  it("leaves a structured resume exactly as it was", () => {
    const stored = record();

    expect(regenerateFromData(stored, "2026-02-02T00:00:00.000Z")).toBe(stored);
  });
});
