import { sectionLabels } from "@/lib/resume/library";
import { deriveResumeTitle, withSections, type Resume, type SectionId } from "@/lib/resume/schema";
import type { ResumeMode, ResumeRecord } from "@/lib/storage/types";
import { documentSource, type ResumeDocument } from "@/lib/tex/document";
import { texFileName } from "@/lib/tex/generate";

/**
 * The four exports offered for a stored resume: the generated LaTeX, a JSON
 * document holding the complete canonical resume, the resume as plain text, and
 * a PDF (which the editor's compile panel produces — a PDF needs the TeX engine,
 * and there is one compile UI, not two).
 *
 * Everything here is a pure function of the record, so what is exported can be
 * asserted in tests instead of by clicking through the page. Dates are passed in
 * rather than read from the clock for the same reason.
 */

/** The exported `.tex` and which text it is; the same shape the resolver returns. */
export type ResumeTex = ResumeDocument;

/**
 * `manual` when the record holds hand-edited LaTeX: `manualTex` is the document
 * of record in that mode and must not be regenerated from data.
 *
 * This is `documentSource` and not a second copy of the rule, so the bytes this
 * writes are the bytes the compile panel compiles.
 */
export function resumeTex(record: ResumeRecord): ResumeTex {
  return documentSource(record);
}

export interface ResumeExport {
  format: "resync.resume";
  version: 1;
  exportedAt: string;
  id: string;
  title: string;
  themeId: string;
  mode: ResumeMode;
  /** Hand-edited LaTeX, when the resume was in manual mode. */
  manualTex: string | null;
  /** The text the resume was originally extracted from. */
  sourceText: string;
  createdAt: string;
  updatedAt: string;
  /** The canonical model, complete: parsing this back yields the stored resume. */
  resume: Resume;
}

export function resumeExport(record: ResumeRecord, exportedAt: string): ResumeExport {
  return {
    format: "resync.resume",
    version: 1,
    exportedAt,
    id: record.id,
    title: deriveResumeTitle(record.resume),
    themeId: record.themeId,
    mode: record.mode,
    manualTex: record.manualTex,
    sourceText: record.plainText,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resume: record.resume,
  };
}

export function resumeExportJson(record: ResumeRecord, exportedAt: string): string {
  return `${JSON.stringify(resumeExport(record, exportedAt), null, 2)}\n`;
}

/** The slug rule lives with the generated document's name; the other exports reuse it. */
function exportFileName(title: string, extension: string): string {
  return texFileName(title).replace(/\.tex$/, `.${extension}`);
}

export function jsonFileName(title: string): string {
  return exportFileName(title, "json");
}

export function plainTextFileName(title: string): string {
  return exportFileName(title, "txt");
}

function join(parts: (string | null | undefined)[], separator: string): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);
}

function dateRange(start: string | null, end: string | null): string | null {
  return join([start, end], " -- ");
}

function bullets(highlights: string[]): string[] {
  return highlights.filter((highlight) => highlight.trim()).map((highlight) => `- ${highlight.trim()}`);
}

function heading(id: SectionId): string {
  return sectionLabels[id].toUpperCase();
}

/**
 * The resume as plain text: the same sections, in the same order, under the same
 * visibility rule as the generated LaTeX, so pasting it into a form cannot drop
 * something the document would have shown.
 */
export function resumePlainText(resume: Resume): string {
  const { name, label, email, phone, url, location, profiles } = resume.basics;
  const place = join([location?.city, location?.region, location?.country], ", ");

  const contacts = [
    email,
    phone,
    place || null,
    url,
    ...profiles.map((profile) => join([profile.network, profile.username, profile.url], " ")),
  ];

  const header = [name.trim(), label, join(contacts, " | ")].filter((line): line is string => Boolean(line));
  const blocks = [join(header, "\n"), resume.basics.summary?.trim() ?? ""];

  for (const section of withSections(resume).sections.filter((entry) => entry.visible)) {
    const body = renderSection(section.id, resume);
    if (body.length > 0) {
      blocks.push([heading(section.id), ...body].join("\n\n"));
    }
  }

  return blocks.filter((block) => block.length > 0).join("\n\n");
}

function renderSection(id: SectionId, resume: Resume): string[] {
  switch (id) {
    case "work":
      return resume.work
        .filter((entry) => entry.name.trim())
        .map((entry) =>
          [
            join([`${entry.name.trim()}${entry.position ? ` — ${entry.position}` : ""}`, dateRange(entry.startDate, entry.endDate) ? `(${dateRange(entry.startDate, entry.endDate)})` : null], " "),
            join([entry.location, entry.url], " | "),
            ...bullets(entry.highlights),
          ]
            .filter((line) => line.length > 0)
            .join("\n"),
        );

    case "education":
      return resume.education
        .filter((entry) => entry.institution.trim())
        .map((entry) => {
          const range = dateRange(entry.startDate, entry.endDate);

          return [
            join([entry.institution.trim(), join([entry.studyType, entry.area], ", ")], " — ") +
              (range ? ` (${range})` : ""),
            entry.score ?? "",
            ...bullets(entry.highlights),
          ]
            .filter((line) => line.trim().length > 0)
            .join("\n");
        });

    case "skills":
      return resume.skills
        .filter((entry) => entry.name.trim())
        .map((entry) =>
          join([join([entry.name.trim(), entry.level ? `(${entry.level})` : null], " "), join(entry.keywords, ", ")], " — "),
        );

    case "projects":
      return resume.projects
        .filter((entry) => entry.name.trim())
        .map((entry) =>
          [entry.name.trim(), entry.url, entry.description, ...bullets(entry.highlights)]
            .filter((line): line is string => Boolean(line && line.trim()))
            .join("\n"),
        );

    case "certificates":
      return resume.certificates
        .filter((entry) => entry.name.trim())
        .map((entry) =>
          [
            join([entry.name.trim(), entry.date ? `(${entry.date})` : null], " "),
            join([entry.issuer, entry.url], " | "),
          ]
            .filter((line) => line.length > 0)
            .join("\n"),
        );

    case "languages": {
      const items = resume.languages
        .filter((entry) => entry.language.trim())
        .map((entry) => join([entry.language.trim(), entry.fluency ? `(${entry.fluency})` : null], " "));

      return items.length === 0 ? [] : [items.join(", ")];
    }
  }
}
