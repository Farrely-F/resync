import { describe, expect, it } from "vitest";

import { charactersPerPage, maxExpectedPages, runAtsChecks } from "@/lib/match/ats";
import { emptyResume, resumeSchema, type Resume } from "@/lib/resume/schema";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { renderResumeForThemeId } from "@/lib/tex/generate";

function checkFor(id: string, resume: Resume, themeId: string) {
  const { tex } = renderResumeForThemeId(resume, themeId);
  const check = runAtsChecks({ resume, tex }).find((entry) => entry.id === id);
  if (!check) {
    throw new Error(`No ATS check with id ${id}`);
  }
  return check;
}

function longResume(summaryLength: number): Resume {
  return resumeSchema.parse({
    ...parseResumeFixture,
    basics: { ...parseResumeFixture.basics, summary: "x".repeat(summaryLength) },
  });
}

describe("runAtsChecks", () => {
  it("reports stable, decidable checks in a fixed order", () => {
    const { tex } = renderResumeForThemeId(parseResumeFixture, "classic");
    const checks = runAtsChecks({ resume: parseResumeFixture, tex });

    expect(checks.map((check) => check.id)).toEqual([
      "contact-details",
      "section-content",
      "single-column",
      "content-length",
    ]);
    expect(checks).toEqual(runAtsChecks({ resume: parseResumeFixture, tex }));
    expect(checks.every((check) => check.detail.length > 0)).toBe(true);
  });

  it("passes the contact check when the header carries an email and a phone", () => {
    expect(checkFor("contact-details", parseResumeFixture, "classic").passed).toBe(true);

    const emailOnly = resumeSchema.parse({
      ...parseResumeFixture,
      basics: { ...parseResumeFixture.basics, phone: null },
    });
    const check = checkFor("contact-details", emailOnly, "classic");

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("no phone number");
  });

  it("fails the contact check when there is nothing to attach a document to", () => {
    const check = checkFor("contact-details", emptyResume(), "classic");

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("neither an email address nor a phone number");
  });

  it("names the visible sections that would render with no content", () => {
    const check = checkFor("section-content", emptyResume(), "classic");

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("Experience");
    expect(check.detail).toContain("Skills");

    const populated = checkFor("section-content", parseResumeFixture, "classic");
    expect(populated.passed).toBe(true);
    expect(populated.detail).toBe("All 6 visible sections contain content.");
  });

  it("fails only the columns check for a two-column theme, reading the generated document", () => {
    const compact = checkFor("single-column", parseResumeFixture, "compact");

    expect(compact.passed).toBe(false);
    expect(compact.detail).toContain("multicol");
    expect(compact.detail).toContain("minipage");

    const classic = checkFor("single-column", parseResumeFixture, "classic");
    expect(classic.passed).toBe(true);
  });

  it("fails the length check for a document with no body at all", () => {
    const check = checkFor("content-length", emptyResume(), "classic");

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("empty");
  });

  it("fails the length check past the readable page estimate and names the measurement", () => {
    const check = checkFor("content-length", longResume(charactersPerPage * (maxExpectedPages + 1)), "classic");

    expect(check.passed).toBe(false);
    expect(check.detail).toContain("characters per page");
    expect(check.detail).toContain(`${maxExpectedPages} pages`);
  });

  it("passes the length check for a resume that fits", () => {
    const check = checkFor("content-length", parseResumeFixture, "classic");

    expect(check.passed).toBe(true);
    expect(check.detail).toContain("about 1 page");
  });
});
