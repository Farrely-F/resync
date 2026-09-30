import type {
  CertificateEntry,
  EducationEntry,
  LanguageEntry,
  ProjectEntry,
  SectionId,
  SkillEntry,
  WorkEntry,
} from "@/lib/resume/schema";

/**
 * What the editor needs to know about each canonical section.
 *
 * The six sections differ in their fields but not in their shape: a card with
 * text fields, an optional bullet list, and the same reorder and remove
 * controls. Describing them as data means one entry editor instead of six
 * near-copies, and the field lists can only name keys that exist on the
 * section's entry type.
 */

type TextInputType = "text" | "email" | "tel" | "url";

export interface FieldSpec {
  key: string;
  label: string;
  placeholder: string;
  multiline: boolean;
  type: TextInputType;
  /** Multiline fields span both columns of the desktop grid. */
  wide: boolean;
}

export interface BulletSpec {
  key: string;
  label: string;
  hint: string;
  addLabel: string;
  placeholder: string;
}

export interface SectionSpec {
  id: SectionId;
  addLabel: string;
  /** Blank entry for the Add button, already shaped like a schema entry. */
  blank: () => unknown;
  /** Card title, read live from the entry so a card stays identifiable. */
  title: (entry: unknown) => string;
  fields: FieldSpec[];
  bullets?: BulletSpec;
}

function field<T>(
  key: Extract<keyof T, string>,
  label: string,
  options: Partial<Pick<FieldSpec, "placeholder" | "multiline" | "type" | "wide">> = {},
): FieldSpec {
  return {
    key,
    label,
    placeholder: options.placeholder ?? "",
    multiline: options.multiline ?? false,
    type: options.type ?? "text",
    wide: options.wide ?? false,
  };
}

/** Reads a text field off an entry that the editor only knows as `unknown`. */
export function readText(entry: unknown, key: string): string {
  const value = (entry as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

/** Reads a bullet list; anything that is not an array of strings reads as empty. */
export function readList(entry: unknown, key: string): string[] {
  const value = (entry as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Returns a copy of an entry with one field replaced. */
export function withValue(entry: unknown, key: string, value: unknown): unknown {
  return { ...(entry as Record<string, unknown>), [key]: value };
}

export const sectionSpecs: Record<SectionId, SectionSpec> = {
  work: {
    id: "work",
    addLabel: "Add a role",
    blank: (): WorkEntry => ({
      name: "",
      position: null,
      url: null,
      location: null,
      startDate: null,
      endDate: null,
      highlights: [],
    }),
    title: (entry) => readText(entry, "name") || "Untitled role",
    fields: [
      field<WorkEntry>("name", "Employer", { placeholder: "Northwind Payments" }),
      field<WorkEntry>("position", "Position", { placeholder: "Senior Backend Engineer" }),
      field<WorkEntry>("location", "Location", { placeholder: "Bristol" }),
      field<WorkEntry>("startDate", "Start", { placeholder: "Mar 2021" }),
      field<WorkEntry>("endDate", "End", { placeholder: "Present" }),
      field<WorkEntry>("url", "Link", { type: "url", placeholder: "https://example.com" }),
    ],
    bullets: {
      key: "highlights",
      label: "Highlights",
      hint: "One line per achievement. Blank lines are left out of the document.",
      addLabel: "Add a highlight",
      placeholder: "Led the migration of the ledger service.",
    },
  },
  education: {
    id: "education",
    addLabel: "Add a qualification",
    blank: (): EducationEntry => ({
      institution: "",
      area: null,
      studyType: null,
      startDate: null,
      endDate: null,
      score: null,
      highlights: [],
    }),
    title: (entry) => readText(entry, "institution") || "Untitled qualification",
    fields: [
      field<EducationEntry>("institution", "Institution", { placeholder: "University of Bristol" }),
      field<EducationEntry>("studyType", "Qualification", { placeholder: "MEng" }),
      field<EducationEntry>("area", "Subject", { placeholder: "Computer Science" }),
      field<EducationEntry>("startDate", "Start", { placeholder: "2013" }),
      field<EducationEntry>("endDate", "End", { placeholder: "2017" }),
      field<EducationEntry>("score", "Result", { placeholder: "First class honours" }),
    ],
    bullets: {
      key: "highlights",
      label: "Details",
      hint: "One line per detail. Blank lines are left out of the document.",
      addLabel: "Add a detail",
      placeholder: "Dissertation on distributed consensus.",
    },
  },
  skills: {
    id: "skills",
    addLabel: "Add a skill group",
    blank: (): SkillEntry => ({ name: "", level: null, keywords: [] }),
    title: (entry) => readText(entry, "name") || "Untitled skill group",
    fields: [
      field<SkillEntry>("name", "Group", { placeholder: "Languages" }),
      field<SkillEntry>("level", "Level", { placeholder: "Expert" }),
    ],
    bullets: {
      key: "keywords",
      label: "Keywords",
      hint: "One keyword per line, listed after the group name. Blank lines are left out of the document.",
      addLabel: "Add a keyword",
      placeholder: "TypeScript",
    },
  },
  projects: {
    id: "projects",
    addLabel: "Add a project",
    blank: (): ProjectEntry => ({ name: "", description: null, url: null, highlights: [] }),
    title: (entry) => readText(entry, "name") || "Untitled project",
    fields: [
      field<ProjectEntry>("name", "Project", { placeholder: "pgqueue" }),
      field<ProjectEntry>("url", "Link", { type: "url", placeholder: "https://example.com" }),
      field<ProjectEntry>("description", "Description", {
        multiline: true,
        wide: true,
        placeholder: "A Postgres-backed job queue in Go.",
      }),
    ],
    bullets: {
      key: "highlights",
      label: "Details",
      hint: "One line per detail. Blank lines are left out of the document.",
      addLabel: "Add a detail",
      placeholder: "Handles 2k jobs per second.",
    },
  },
  certificates: {
    id: "certificates",
    addLabel: "Add a certificate",
    blank: (): CertificateEntry => ({ name: "", issuer: null, date: null, url: null }),
    title: (entry) => readText(entry, "name") || "Untitled certificate",
    fields: [
      field<CertificateEntry>("name", "Certificate", {
        placeholder: "AWS Certified Solutions Architect",
      }),
      field<CertificateEntry>("issuer", "Issuer", { placeholder: "Amazon Web Services" }),
      field<CertificateEntry>("date", "Date", { placeholder: "2022" }),
      field<CertificateEntry>("url", "Link", { type: "url", placeholder: "https://example.com" }),
    ],
  },
  languages: {
    id: "languages",
    addLabel: "Add a language",
    blank: (): LanguageEntry => ({ language: "", fluency: null }),
    title: (entry) => readText(entry, "language") || "Untitled language",
    fields: [
      field<LanguageEntry>("language", "Language", { placeholder: "English" }),
      field<LanguageEntry>("fluency", "Fluency", { placeholder: "Native" }),
    ],
  },
};
