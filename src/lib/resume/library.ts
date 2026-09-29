import { deriveResumeTitle, sectionIds, type Resume, type SectionId } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * Library helpers shared by the `/resumes` surface.
 *
 * The record-building and section-summary functions are pure so the list's
 * display logic can be tested without a browser; the storage and fetch calls
 * are thin, because they are the only parts that need the real environment.
 */

export const defaultThemeId = "classic";

/** Display names for the summary chips; the stored ids stay stable. */
export const sectionLabels: Record<SectionId, string> = {
  work: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certificates",
  languages: "Languages",
};

/** One count per canonical section, so callers never touch a possibly-undefined array. */
export function sectionCounts(resume: Resume): Record<SectionId, number> {
  return {
    work: resume.work.length,
    education: resume.education.length,
    skills: resume.skills.length,
    projects: resume.projects.length,
    certificates: resume.certificates.length,
    languages: resume.languages.length,
  };
}

/** Sections that actually hold content, in the canonical order. */
export function sectionsWithContent(resume: Resume): SectionId[] {
  const counts = sectionCounts(resume);
  return sectionIds.filter((id) => counts[id] > 0);
}

export function buildResumeRecord(input: { resume: Resume; plainText: string; now?: string }): ResumeRecord {
  const timestamp = input.now ?? new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: deriveResumeTitle(input.resume),
    resume: input.resume,
    plainText: input.plainText,
    themeId: defaultThemeId,
    mode: "structured",
    manualTex: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const updatedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Absolute time, not "2 days ago": the library is a record of what was stored when. */
export function formatUpdatedAt(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : updatedAtFormat.format(parsed);
}

interface ParseResumeResponse {
  resume: Resume;
}

/** Pulls a readable message out of either error shape the route can return. */
export function parseResumeErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error?: { message?: unknown } };
    if (typeof error?.message === "string" && error.message.length > 0) {
      return error.message;
    }
  }

  return fallback;
}

/** Sends extracted text to the structuring route. The file itself never goes anywhere. */
export async function requestParseResume(text: string): Promise<Resume> {
  const response = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseResumeErrorMessage(body, `Structuring failed (HTTP ${response.status}).`));
  }

  const parsed = body as ParseResumeResponse | null;
  if (parsed === null || typeof parsed !== "object" || !("resume" in parsed)) {
    throw new Error("The structuring service returned an unexpected response.");
  }

  return parsed.resume;
}

/** Parse, then store. Returns the stored record so the caller can refresh its list. */
export async function addResumeFromText(plainText: string): Promise<ResumeRecord> {
  const resume = await requestParseResume(plainText);
  const record = buildResumeRecord({ resume, plainText });
  await getStorage().putResume(record);
  return record;
}
