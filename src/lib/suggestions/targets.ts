import type { Resume } from "@/lib/resume/schema";
import { editableSections, type EditableSection, type SuggestionTarget } from "@/lib/suggestions/types";

/**
 * The editable surface of a resume.
 *
 * The model is never asked to name a path into the resume. We enumerate the
 * spans it may rewrite — each with an id, its current text and a readable
 * label — and it picks one of those. A target the model invents therefore
 * cannot resolve, and the text a proposal replaces is always text the user
 * already has.
 *
 * Target ids are readable paths (`work.0.highlights.1`) rather than hashes, so
 * a recording, a dropped-proposal line and a stored suggestion all say which
 * span they mean without a lookup.
 */

export type FieldKind = "scalar" | "list";

export const editableFields: Record<EditableSection, Record<string, FieldKind>> = {
  basics: { summary: "scalar", label: "scalar" },
  work: { position: "scalar", highlights: "list" },
  education: { area: "scalar", highlights: "list" },
  skills: { name: "scalar", keywords: "list" },
  projects: { description: "scalar", highlights: "list" },
  certificates: { name: "scalar", issuer: "scalar" },
  languages: { fluency: "scalar" },
};

export const sectionLabels: Record<EditableSection, string> = {
  basics: "Summary",
  work: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certificates",
  languages: "Languages",
};

/** The field that names an entry, used to label where a suggestion lands. */
const primaryField: Record<Exclude<EditableSection, "basics">, string> = {
  work: "name",
  education: "institution",
  skills: "name",
  projects: "name",
  certificates: "name",
  languages: "language",
};

const fieldLabels: Record<string, string> = {
  summary: "summary",
  label: "headline",
  position: "position",
  name: "name",
  issuer: "issuer",
  description: "description",
  area: "field of study",
  fluency: "fluency",
};

const itemLabels: Record<string, string> = { highlights: "bullet", keywords: "keyword" };

export interface EditableTarget {
  id: string;
  target: SuggestionTarget;
  /** The stored text; this is what the model is asked to rewrite. */
  text: string;
  label: string;
}

function toIndex(part: string | undefined): number | null {
  if (part === undefined || !/^\d+$/.test(part)) {
    return null;
  }

  const index = Number(part);
  return Number.isSafeInteger(index) ? index : null;
}

/** The canonical string form of a target; the inverse of `parseTargetId`. */
export function targetId(target: SuggestionTarget): string {
  const head = target.section === "basics" ? target.section : `${target.section}.${target.entryIndex}`;
  return target.itemIndex === null ? `${head}.${target.field}` : `${head}.${target.field}.${target.itemIndex}`;
}

/** Parses a target id, rejecting anything the resume model cannot hold. */
export function parseTargetId(id: string): SuggestionTarget | null {
  const parts = id.split(".");
  const section = parts[0] as EditableSection;

  if (!editableSections.includes(section)) {
    return null;
  }

  const fields = editableFields[section];

  if (section === "basics") {
    const field = parts[1];
    if (parts.length !== 2 || field === undefined || fields[field] !== "scalar") {
      return null;
    }

    return { section, entryIndex: null, field, itemIndex: null };
  }

  const entryIndex = toIndex(parts[1]);
  const field = parts[2];
  if (entryIndex === null || field === undefined) {
    return null;
  }

  if (parts.length === 3) {
    return fields[field] === "scalar" ? { section, entryIndex, field, itemIndex: null } : null;
  }

  const itemIndex = toIndex(parts[3]);
  if (parts.length === 4 && itemIndex !== null && fields[field] === "list") {
    return { section, entryIndex, field, itemIndex };
  }

  return null;
}

function entriesOf(resume: Resume, section: Exclude<EditableSection, "basics">): readonly Record<string, unknown>[] {
  return resume[section] as unknown as readonly Record<string, unknown>[];
}

function readFieldValue(resume: Resume, target: SuggestionTarget): unknown {
  const kind = editableFields[target.section]?.[target.field];

  // The registry is the one definition of what is editable: a field it does not
  // list is not a span suggestions may touch, so it reads as nothing here too.
  if (kind === undefined) {
    return undefined;
  }

  if (kind === "list" ? target.itemIndex === null : target.itemIndex !== null) {
    return undefined;
  }

  if (target.section === "basics") {
    if (target.entryIndex !== null) {
      return undefined;
    }

    return (resume.basics as unknown as Record<string, unknown>)[target.field];
  }

  const entry = target.entryIndex === null ? undefined : entriesOf(resume, target.section)[target.entryIndex];
  if (!entry) {
    return undefined;
  }

  const value = entry[target.field];
  if (target.itemIndex === null) {
    return value;
  }

  return Array.isArray(value) ? value[target.itemIndex] : undefined;
}

/** The text stored at a target, or null when the target does not resolve to a string. */
export function readTargetText(resume: Resume, target: SuggestionTarget): string | null {
  const value = readFieldValue(resume, target);
  return typeof value === "string" ? value : null;
}

function replaceAt<T>(list: readonly T[], index: number, next: T): T[] {
  return list.map((entry, position) => (position === index ? next : entry));
}

/**
 * A copy of the resume with the target's text replaced, or null when the target
 * does not resolve. Nothing is mutated: a rejected suggestion leaves the record
 * it was offered against exactly as it was.
 */
export function writeTargetText(resume: Resume, target: SuggestionTarget, text: string): Resume | null {
  const kind = editableFields[target.section]?.[target.field];
  if (kind === undefined) {
    return null;
  }

  if (kind === "list" ? target.itemIndex === null : target.itemIndex !== null) {
    return null;
  }

  if (target.section === "basics") {
    if (target.entryIndex !== null) {
      return null;
    }

    if (target.field === "summary") {
      return { ...resume, basics: { ...resume.basics, summary: text } };
    }

    if (target.field === "label") {
      return { ...resume, basics: { ...resume.basics, label: text } };
    }

    return null;
  }

  const entryIndex = target.entryIndex;
  const itemIndex = target.itemIndex;
  if (entryIndex === null) {
    return null;
  }

  switch (target.section) {
    case "work": {
      const entry = resume.work[entryIndex];
      if (!entry) {
        return null;
      }

      if (target.field === "position") {
        return { ...resume, work: replaceAt(resume.work, entryIndex, { ...entry, position: text }) };
      }

      if (target.field === "highlights" && itemIndex !== null && entry.highlights[itemIndex] !== undefined) {
        return {
          ...resume,
          work: replaceAt(resume.work, entryIndex, { ...entry, highlights: replaceAt(entry.highlights, itemIndex, text) }),
        };
      }

      return null;
    }

    case "education": {
      const entry = resume.education[entryIndex];
      if (!entry) {
        return null;
      }

      if (target.field === "area") {
        return { ...resume, education: replaceAt(resume.education, entryIndex, { ...entry, area: text }) };
      }

      if (target.field === "highlights" && itemIndex !== null && entry.highlights[itemIndex] !== undefined) {
        return {
          ...resume,
          education: replaceAt(resume.education, entryIndex, {
            ...entry,
            highlights: replaceAt(entry.highlights, itemIndex, text),
          }),
        };
      }

      return null;
    }

    case "skills": {
      const entry = resume.skills[entryIndex];
      if (!entry) {
        return null;
      }

      if (target.field === "name") {
        return { ...resume, skills: replaceAt(resume.skills, entryIndex, { ...entry, name: text }) };
      }

      if (target.field === "keywords" && itemIndex !== null && entry.keywords[itemIndex] !== undefined) {
        return {
          ...resume,
          skills: replaceAt(resume.skills, entryIndex, { ...entry, keywords: replaceAt(entry.keywords, itemIndex, text) }),
        };
      }

      return null;
    }

    case "projects": {
      const entry = resume.projects[entryIndex];
      if (!entry) {
        return null;
      }

      if (target.field === "description") {
        return { ...resume, projects: replaceAt(resume.projects, entryIndex, { ...entry, description: text }) };
      }

      if (target.field === "highlights" && itemIndex !== null && entry.highlights[itemIndex] !== undefined) {
        return {
          ...resume,
          projects: replaceAt(resume.projects, entryIndex, {
            ...entry,
            highlights: replaceAt(entry.highlights, itemIndex, text),
          }),
        };
      }

      return null;
    }

    case "certificates": {
      const entry = resume.certificates[entryIndex];
      if (!entry) {
        return null;
      }

      if (target.field === "name") {
        return { ...resume, certificates: replaceAt(resume.certificates, entryIndex, { ...entry, name: text }) };
      }

      if (target.field === "issuer") {
        return { ...resume, certificates: replaceAt(resume.certificates, entryIndex, { ...entry, issuer: text }) };
      }

      return null;
    }

    case "languages": {
      const entry = resume.languages[entryIndex];
      if (!entry || target.field !== "fluency") {
        return null;
      }

      return { ...resume, languages: replaceAt(resume.languages, entryIndex, { ...entry, fluency: text }) };
    }

    default:
      return null;
  }
}

/** Readable location, e.g. "Experience · Northwind Payments · bullet 2" or "Summary · summary". */
export function describeTarget(resume: Resume, target: SuggestionTarget): string {
  const parts = [sectionLabels[target.section]];

  if (target.section !== "basics" && target.entryIndex !== null) {
    const entry = entriesOf(resume, target.section)[target.entryIndex];
    const name = entry?.[primaryField[target.section]];
    if (typeof name === "string" && name.trim() !== "") {
      parts.push(name);
    }
  }

  if (target.itemIndex === null) {
    parts.push(fieldLabels[target.field] ?? target.field);
  } else {
    parts.push(`${itemLabels[target.field] ?? target.field} ${target.itemIndex + 1}`);
  }

  return parts.join(" · ");
}

/**
 * Every span of this resume a suggestion may rewrite, in section order. Empty
 * strings are left out: there is nothing to rewrite, and a proposal to fill one
 * in would have to invent text.
 */
export function collectEditableTargets(resume: Resume): EditableTarget[] {
  const targets: EditableTarget[] = [];

  const push = (target: SuggestionTarget) => {
    const text = readTargetText(resume, target);
    if (text === null || text.trim() === "") {
      return;
    }

    targets.push({ id: targetId(target), target, text, label: describeTarget(resume, target) });
  };

  for (const section of editableSections) {
    if (section === "basics") {
      for (const field of Object.keys(editableFields.basics)) {
        push({ section, entryIndex: null, field, itemIndex: null });
      }

      continue;
    }

    entriesOf(resume, section).forEach((entry, entryIndex) => {
      for (const [field, kind] of Object.entries(editableFields[section])) {
        if (kind === "scalar") {
          push({ section, entryIndex, field, itemIndex: null });
          continue;
        }

        const value = entry[field];
        if (Array.isArray(value)) {
          value.forEach((_, itemIndex) => push({ section, entryIndex, field, itemIndex }));
        }
      }
    });
  }

  return targets;
}
