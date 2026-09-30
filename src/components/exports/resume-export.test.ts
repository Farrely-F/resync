import { describe, expect, it } from "vitest";

import {
  jsonFileName,
  plainTextFileName,
  resumeExport,
  resumeExportJson,
  resumePlainText,
  resumeTex,
  type ResumeExport,
} from "@/components/exports/resume-export";
import { emptyResume, resumeSchema, type Resume } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";
import { renderResumeForThemeId } from "@/lib/tex/generate";

const exportedAt = "2026-02-03T04:05:06.000Z";

function resume(overrides: Partial<Resume> = {}): Resume {
  return resumeSchema.parse({
    basics: {
      name: "Jane Doe",
      label: "Backend Engineer",
      email: "jane@example.com",
      phone: "+49 30 123456",
      url: "https://jane.example",
      summary: "Builds boring, reliable services.",
      location: { city: "Berlin", region: null, country: "Germany" },
      profiles: [{ network: "GitHub", username: "jane", url: "https://github.com/jane" }],
    },
    work: [
      {
        name: "Acme",
        position: "Senior Engineer",
        location: "Berlin",
        url: null,
        startDate: "2021-03",
        endDate: "Present",
        highlights: ["Cut p99 latency by half", "Ran the on-call rota"],
      },
    ],
    education: [
      {
        institution: "TU Berlin",
        area: "Computer Science",
        studyType: "MSc",
        startDate: "2015",
        endDate: "2017",
        score: "1.3",
        highlights: [],
      },
    ],
    skills: [{ name: "TypeScript", level: "expert", keywords: ["React", "Node"] }],
    projects: [{ name: "resync", description: "Resume tooling.", url: null, highlights: [] }],
    certificates: [{ name: "AWS Solutions Architect", issuer: "Amazon", date: "2023-04", url: null }],
    languages: [{ language: "German", fluency: "B2" }],
    ...overrides,
  });
}

function record(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "0f7d5f1e-0000-4000-8000-000000000001",
    title: "Jane Doe",
    resume: resume(),
    plainText: "Jane Doe\njane@example.com",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("resumeExport", () => {
  it("parses back as the complete canonical resume", () => {
    const stored = record();
    const parsed = JSON.parse(resumeExportJson(stored, exportedAt)) as ResumeExport;

    expect(resumeSchema.parse(parsed.resume)).toEqual(stored.resume);
    expect(parsed).toMatchObject({
      format: "resync.resume",
      version: 1,
      exportedAt,
      id: stored.id,
      title: "Jane Doe",
      themeId: "classic",
      mode: "structured",
      manualTex: null,
      sourceText: stored.plainText,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    });
  });

  it("keeps hand-edited LaTeX and the source text in the document", () => {
    const stored = record({ mode: "manual", manualTex: "\\documentclass{article}", plainText: "raw text" });
    const document = resumeExport(stored, exportedAt);

    expect(document.mode).toBe("manual");
    expect(document.manualTex).toBe("\\documentclass{article}");
    expect(document.sourceText).toBe("raw text");
  });

  it("names the exported file after the resume identifier", () => {
    expect(jsonFileName("Jane Doe")).toBe("jane-doe.json");
    expect(plainTextFileName("José Ñuñez")).toBe("jose-nunez.txt");
    expect(jsonFileName("   ")).toBe("resume.json");
  });
});

describe("resumeTex", () => {
  it("exports the generated document for a structured resume", () => {
    const stored = record();

    expect(resumeTex(stored)).toEqual({
      tex: renderResumeForThemeId(stored.resume, stored.themeId).tex,
      source: "generated",
    });
  });

  it("exports the saved manual LaTeX rather than regenerating over it", () => {
    const stored = record({ mode: "manual", manualTex: "\\documentclass{article}\nhand edited" });

    expect(resumeTex(stored)).toEqual({ tex: "\\documentclass{article}\nhand edited", source: "manual" });
  });

  it("falls back to the generated document when manual mode holds no LaTeX", () => {
    const stored = record({ mode: "manual", manualTex: null });

    expect(resumeTex(stored).source).toBe("generated");
  });
});

describe("resumePlainText", () => {
  it("renders the header, then every section in the canonical order", () => {
    const text = resumePlainText(resume());

    expect(text).toBe(
      [
        "Jane Doe",
        "Backend Engineer",
        "jane@example.com | +49 30 123456 | Berlin, Germany | https://jane.example | GitHub jane https://github.com/jane",
        "",
        "Builds boring, reliable services.",
        "",
        "EXPERIENCE",
        "",
        "Acme — Senior Engineer (2021-03 -- Present)",
        "Berlin",
        "- Cut p99 latency by half",
        "- Ran the on-call rota",
        "",
        "EDUCATION",
        "",
        "TU Berlin — MSc, Computer Science (2015 -- 2017)",
        "1.3",
        "",
        "SKILLS",
        "",
        "TypeScript (expert) — React, Node",
        "",
        "PROJECTS",
        "",
        "resync",
        "Resume tooling.",
        "",
        "CERTIFICATES",
        "",
        "AWS Solutions Architect (2023-04)",
        "Amazon",
        "",
        "LANGUAGES",
        "",
        "German (B2)",
      ].join("\n"),
    );
    expect(text).not.toMatch(/[\\{}]/);
  });

  it("leaves out a section the resume has hidden", () => {
    const hidden = resume({
      sections: emptyResume().sections.map((section) => ({
        ...section,
        visible: section.id !== "work",
      })),
    });

    const text = resumePlainText(hidden);
    expect(text).not.toContain("EXPERIENCE");
    expect(text).toContain("SKILLS");
  });

  it("leaves out sections with no content instead of printing empty headings", () => {
    const text = resumePlainText(emptyResume());

    expect(text).toBe("");
  });

  it("keeps an entry whose only content is a heading-free field", () => {
    const text = resumePlainText(
      resumeSchema.parse({ basics: { name: "Jane Doe" }, languages: [{ language: "German", fluency: null }] }),
    );

    expect(text).toBe(["Jane Doe", "", "LANGUAGES", "", "German"].join("\n"));
  });

  it("drops blank highlight lines rather than copying empty bullets", () => {
    const text = resumePlainText(
      resumeSchema.parse({
        basics: { name: "Jane" },
        work: [{ name: "Acme", highlights: ["", "  ", "did a thing"] }],
      }),
    );

    expect(text).toContain("- did a thing");
    expect(text).not.toContain("- \n");
    expect(text.split("\n").filter((line) => line.startsWith("- "))).toHaveLength(1);
  });
});
