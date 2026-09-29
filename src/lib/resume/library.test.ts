import { describe, expect, it } from "vitest";

import { buildResumeRecord, parseResumeErrorMessage, sectionCounts, sectionsWithContent } from "@/lib/resume/library";
import { emptyResume, resumeSchema, type Resume } from "@/lib/resume/schema";

function filledResume(): Resume {
  return resumeSchema.parse({
    basics: { name: "Priya Raman" },
    work: [{ name: "Northwind Payments", position: "Senior Backend Engineer" }],
    languages: [{ language: "English" }],
  });
}

describe("section summary", () => {
  it("counts only the sections that exist and keeps canonical order", () => {
    const resume = filledResume();

    expect(sectionCounts(resume).education).toBe(0);
    expect(sectionsWithContent(resume)).toEqual(["work", "languages"]);
  });

  it("reports nothing for an empty resume", () => {
    expect(sectionsWithContent(emptyResume())).toEqual([]);
  });
});

describe("buildResumeRecord", () => {
  it("derives the title and starts in structured mode with one timestamp", () => {
    const now = "2026-01-02T03:04:05.000Z";
    const record = buildResumeRecord({ resume: filledResume(), plainText: "source text", now });

    expect(record.title).toBe("Priya Raman");
    expect(record.mode).toBe("structured");
    expect(record.manualTex).toBeNull();
    expect(record.plainText).toBe("source text");
    expect(record.createdAt).toBe(now);
    expect(record.updatedAt).toBe(now);
  });

  it("gives each record its own id", () => {
    const first = buildResumeRecord({ resume: filledResume(), plainText: "a" });
    const second = buildResumeRecord({ resume: filledResume(), plainText: "b" });

    expect(first.id).not.toBe(second.id);
  });
});

describe("parseResumeErrorMessage", () => {
  it("uses the route's message when there is one", () => {
    expect(parseResumeErrorMessage({ error: { message: "text-too-short" } }, "fallback")).toBe("text-too-short");
  });

  it("falls back for an unexpected body", () => {
    expect(parseResumeErrorMessage({ resume: {} }, "fallback")).toBe("fallback");
    expect(parseResumeErrorMessage(null, "fallback")).toBe("fallback");
  });
});
