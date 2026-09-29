import { describe, expect, it } from "vitest";

import {
  isIntakeError,
  jdRecordFromIntake,
  maxPasteLength,
  minPasteLength,
  parseIntakeRequest,
  titleHintFromText,
  type JdIntakeSuccess,
} from "@/lib/jd/api";

describe("parseIntakeRequest", () => {
  it("accepts a URL and trims it", () => {
    expect(parseIntakeRequest({ url: "  https://example.com/jobs/1  " })).toEqual({
      kind: "url",
      url: "https://example.com/jobs/1",
    });
  });

  it("prefers the URL when both fields are present", () => {
    expect(parseIntakeRequest({ url: "https://example.com/jobs/1", text: "long enough pasted text ".repeat(5) })).toMatchObject({
      kind: "url",
    });
  });

  it("accepts pasted text at the minimum length", () => {
    const text = "a".repeat(minPasteLength);
    expect(parseIntakeRequest({ text: `  ${text}  ` })).toEqual({ kind: "text", text });
  });

  it("rejects pasted text below the minimum length", () => {
    const result = parseIntakeRequest({ text: "a".repeat(minPasteLength - 1) });
    expect(result.kind).toBe("invalid");
  });

  it("rejects pasted text above the maximum length", () => {
    const result = parseIntakeRequest({ text: "a".repeat(maxPasteLength + 1) });
    expect(result.kind).toBe("invalid");
  });

  it("rejects non-object and wrongly typed bodies", () => {
    expect(parseIntakeRequest(null).kind).toBe("invalid");
    expect(parseIntakeRequest("text").kind).toBe("invalid");
    expect(parseIntakeRequest({ url: 42 }).kind).toBe("invalid");
    expect(parseIntakeRequest({}).kind).toBe("invalid");
    expect(parseIntakeRequest({ url: "   " }).kind).toBe("invalid");
  });
});

describe("titleHintFromText", () => {
  it("uses the first non-empty line and strips a label prefix", () => {
    expect(titleHintFromText("\n\nJob Title: Senior Go Engineer\nAcme is hiring.")).toBe("Senior Go Engineer");
    expect(titleHintFromText("Senior Go Engineer\nAcme")).toBe("Senior Go Engineer");
  });

  it("skips lines that are too long to be a title", () => {
    expect(titleHintFromText(`${"x".repeat(200)}\nBackend Engineer`)).toBe("Backend Engineer");
  });

  it("returns null when there is no usable line", () => {
    expect(titleHintFromText("   \n\n")).toBeNull();
  });
});

describe("jdRecordFromIntake", () => {
  const success: JdIntakeSuccess = {
    structured: {
      title: "Senior Go Engineer",
      company: "Acme",
      seniority: null,
      location: null,
      requirements: ["Go"],
      niceToHave: [],
      skills: [],
      responsibilities: [],
      keywords: [],
    },
    source: "linkedin",
    url: "https://www.linkedin.com/jobs/view/1",
    rawText: "Senior Go Engineer at Acme",
    hints: { title: "Senior Go Engineer", company: "Acme", location: "Berlin" },
  };

  it("builds a complete record with matching timestamps", () => {
    const now = new Date("2026-09-29T10:00:00.000Z");
    const record = jdRecordFromIntake(success, now);

    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(record.title).toBe("Senior Go Engineer — Acme");
    expect(record.company).toBe("Acme");
    expect(record.sourceUrl).toBe(success.url);
    expect(record.rawText).toBe(success.rawText);
    expect(record.structured).toEqual(success.structured);
    expect(record.createdAt).toBe("2026-09-29T10:00:00.000Z");
    expect(record.updatedAt).toBe(record.createdAt);
  });

  it("falls back to the hint company and a non-empty title", () => {
    const record = jdRecordFromIntake({
      ...success,
      structured: { ...success.structured, title: "", company: null },
      hints: { title: null, company: "Globex", location: null },
    });

    expect(record.title).toBe("Untitled job");
    expect(record.company).toBe("Globex");
  });
});

describe("isIntakeError", () => {
  it("distinguishes error responses from successes", () => {
    expect(isIntakeError({ error: { reason: "blocked", message: "no", canPaste: true } })).toBe(true);
    expect(
      isIntakeError({
        structured: {
          title: "",
          company: null,
          seniority: null,
          location: null,
          requirements: [],
          niceToHave: [],
          skills: [],
          responsibilities: [],
          keywords: [],
        },
        source: "paste",
        url: null,
        rawText: "x",
        hints: { title: null, company: null, location: null },
      }),
    ).toBe(false);
  });
});
