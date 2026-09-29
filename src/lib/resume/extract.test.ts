import { describe, expect, it } from "vitest";

import {
  MIN_EXTRACTED_TEXT_CHARS,
  assessExtraction,
  extractPastedText,
  isTextUsable,
  sourceKindForFile,
} from "@/lib/resume/extract";

/** A string with exactly `count` non-whitespace characters. */
function visibleChars(count: number): string {
  return "a".repeat(count);
}

describe("text usability boundary", () => {
  it("accepts text exactly at the threshold and rejects one character below it", () => {
    expect(isTextUsable(visibleChars(MIN_EXTRACTED_TEXT_CHARS))).toBe(true);
    expect(isTextUsable(visibleChars(MIN_EXTRACTED_TEXT_CHARS - 1))).toBe(false);
  });

  it("counts only non-whitespace characters, so a mostly blank page does not pass", () => {
    const padded = `${" ".repeat(500)}\n\t${visibleChars(MIN_EXTRACTED_TEXT_CHARS - 1)}\n`;
    expect(isTextUsable(padded)).toBe(false);
  });

  it("treats an empty string as unusable", () => {
    expect(isTextUsable("")).toBe(false);
  });
});

describe("assessExtraction", () => {
  it("names the image-only PDF reason instead of returning an empty success", () => {
    const result = assessExtraction("pdf", visibleChars(MIN_EXTRACTED_TEXT_CHARS - 1));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("image-only-pdf");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("passes a PDF that clears the threshold", () => {
    const result = assessExtraction("pdf", `${visibleChars(MIN_EXTRACTED_TEXT_CHARS)} and more`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.kind).toBe("pdf");
    }
  });

  it("reports a near-empty DOCX as empty rather than as a scan", () => {
    const result = assessExtraction("docx", "  \n  ");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty-document");
    }
  });

  it("trims surrounding whitespace on success", () => {
    const result = assessExtraction("text", `\n  ${visibleChars(MIN_EXTRACTED_TEXT_CHARS)}  \n`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe(visibleChars(MIN_EXTRACTED_TEXT_CHARS));
    }
  });
});

describe("sourceKindForFile", () => {
  it("maps by MIME type and by extension", () => {
    expect(sourceKindForFile({ name: "cv.pdf", type: "application/pdf" })).toBe("pdf");
    expect(sourceKindForFile({ name: "CV.PDF", type: "" })).toBe("pdf");
    expect(sourceKindForFile({ name: "cv.docx", type: "" })).toBe("docx");
    expect(sourceKindForFile({ name: "cv.md", type: "" })).toBe("text");
    expect(sourceKindForFile({ name: "notes.txt", type: "text/plain" })).toBe("text");
  });

  it("rejects a type the product cannot read", () => {
    expect(sourceKindForFile({ name: "cv.pages", type: "application/octet-stream" })).toBeNull();
  });
});

describe("extractPastedText", () => {
  it("rejects a paste that is only whitespace", () => {
    expect(extractPastedText("   \n\n  ").ok).toBe(false);
  });

  it("accepts a paste above the threshold", () => {
    expect(extractPastedText(visibleChars(MIN_EXTRACTED_TEXT_CHARS)).ok).toBe(true);
  });
});
