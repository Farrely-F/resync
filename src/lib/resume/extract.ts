/**
 * Client-side text extraction.
 *
 * The original upload never leaves the browser: it is read here, reduced to
 * plain text, and only that text is sent on for structuring. Parsing the file
 * locally also means the server never needs a file-upload path.
 *
 * Everything except the two document libraries is pure, so the decision about
 * whether extracted text is usable is testable without a DOM.
 */

import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";

export type ResumeSourceKind = "pdf" | "docx" | "text";

export type ExtractionFailureReason =
  | "unsupported-type"
  | "image-only-pdf"
  | "empty-document"
  | "read-failed";

export interface ExtractionSuccess {
  ok: true;
  kind: ResumeSourceKind;
  /** Trimmed plain text; only this leaves the browser. */
  text: string;
}

export interface ExtractionFailure {
  ok: false;
  reason: ExtractionFailureReason;
  /** User-facing, plain, names the cause. */
  message: string;
}

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

/**
 * A usable document must yield at least this many non-whitespace characters.
 *
 * 40 is roughly one short line — a name, an email address and a phone number.
 * Any document with a real text layer clears this on its first line, while a
 * scanned/image-only PDF yields only stray glyphs from page furniture (page
 * numbers, watermarks), which almost always come in under ten. The gap between
 * the two is wide enough that the exact value is not load-bearing.
 */
export const MIN_EXTRACTED_TEXT_CHARS = 40;

/** The boundary decision, kept pure so both sides of it can be tested. */
export function isTextUsable(text: string, minChars: number = MIN_EXTRACTED_TEXT_CHARS): boolean {
  // Non-whitespace characters: the signal that a PDF has a text layer at all.
  return text.replace(/\s+/g, "").length >= minChars;
}

/**
 * Turns raw extracted text into a result. An image-only PDF is a distinct
 * failure because the fix is different from "the file was empty": the user must
 * supply a text-layer version, not retry the same scan.
 */
export function assessExtraction(kind: ResumeSourceKind, text: string): ExtractionResult {
  if (!isTextUsable(text)) {
    if (kind === "pdf") {
      return {
        ok: false,
        reason: "image-only-pdf",
        message:
          "This PDF contains no selectable text — it looks like a scan or an image export. Export a text-layer PDF from your editor, or paste the text instead.",
      };
    }

    return {
      ok: false,
      reason: "empty-document",
      message: "No text could be read from this document. Check the file, or paste the text instead.",
    };
  }

  return { ok: true, kind, text: text.trim() };
}

/** Maps a picked file to a source kind, or `null` when the type is not supported. */
export function sourceKindForFile(file: { name: string; type: string }): ResumeSourceKind | null {
  const name = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }

  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return "text";
  }

  return null;
}

async function extractPdfText(file: File): Promise<string> {
  // The worker keeps PDF parsing off the main thread; bundlers resolve this URL
  // to the worker chunk shipped with pdfjs-dist, so no copy in /public is needed.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim(),
      );
    }

    return pages.join("\n\n");
  } finally {
    // `destroy` lives on the loading task in pdf.js 6; it also terminates the worker.
    await loadingTask.destroy();
  }
}

async function extractDocxText(file: File): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Extracts plain text from a picked file. Never returns a near-empty success. */
export async function extractResumeFile(file: File): Promise<ExtractionResult> {
  const kind = sourceKindForFile(file);

  if (kind === null) {
    return {
      ok: false,
      reason: "unsupported-type",
      message: "Unsupported file type. Use a PDF, DOCX, TXT or Markdown file, or paste the text.",
    };
  }

  try {
    const raw =
      kind === "pdf"
        ? await extractPdfText(file)
        : kind === "docx"
          ? await extractDocxText(file)
          : await file.text();

    return assessExtraction(kind, raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return {
      ok: false,
      reason: "read-failed",
      message: `Could not read "${file.name}". ${detail}`,
    };
  }
}

/** Pasted text takes the same usability gate as an uploaded text file. */
export function extractPastedText(text: string): ExtractionResult {
  return assessExtraction("text", text);
}
