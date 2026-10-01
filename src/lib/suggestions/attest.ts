import type { Resume } from "@/lib/resume/schema";
import { sectionLabels } from "@/lib/suggestions/targets";
import type { EditableSection } from "@/lib/suggestions/types";

/**
 * Experience the reader says they have, which the resume does not yet say.
 *
 * Suggestions can only rewrite what the resume contains and a grounding check
 * drops anything it cannot find there, so they can never add a fact. A reader who
 * has done the thing is the one source that can: the text added here is theirs,
 * written by them, and is labelled as theirs wherever it is shown. The model is
 * not in this path at all.
 */

/** The places a new line can go: a list the resume already has. */
export interface AttestDestination {
  /** Stable key, e.g. `work.0.highlights`. */
  id: string;
  section: Exclude<EditableSection, "basics">;
  entryIndex: number;
  field: "highlights" | "keywords";
  /** "Experience · Northwind Payments · bullets". */
  label: string;
}

const listFields: { section: AttestDestination["section"]; field: AttestDestination["field"]; name: string }[] = [
  { section: "work", field: "highlights", name: "name" },
  { section: "projects", field: "highlights", name: "name" },
  { section: "education", field: "highlights", name: "institution" },
  { section: "skills", field: "keywords", name: "name" },
];

function entriesOf(resume: Resume, section: AttestDestination["section"]): Record<string, unknown>[] {
  return resume[section] as unknown as Record<string, unknown>[];
}

export function attestDestinations(resume: Resume): AttestDestination[] {
  return listFields.flatMap(({ section, field, name }) =>
    entriesOf(resume, section).map((entry, entryIndex) => {
      const title = entry[name];

      return {
        id: `${section}.${entryIndex}.${field}`,
        section,
        entryIndex,
        field,
        label: [sectionLabels[section], typeof title === "string" && title.trim() !== "" ? title : `entry ${entryIndex + 1}`, field === "keywords" ? "keywords" : "bullets"].join(" · "),
      };
    }),
  );
}

export type AppendRefusal = "empty" | "duplicate" | "unknown-destination";

/** The resume with `text` added to the end of the destination's list, or why not. Nothing is mutated. */
export function appendToDestination(
  resume: Resume,
  destinationId: string,
  text: string,
): { ok: true; resume: Resume } | { ok: false; reason: AppendRefusal } {
  const line = text.trim();
  if (line === "") {
    return { ok: false, reason: "empty" };
  }

  const destination = attestDestinations(resume).find((candidate) => candidate.id === destinationId);
  if (!destination) {
    return { ok: false, reason: "unknown-destination" };
  }

  const entries = entriesOf(resume, destination.section);
  const entry = entries[destination.entryIndex]!;
  const current = Array.isArray(entry[destination.field]) ? (entry[destination.field] as string[]) : [];

  // Appending is not idempotent the way replacing is: a double click would add the line twice.
  if (current.some((existing) => existing.trim().toLowerCase() === line.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }

  const next = entries.map((candidate, index) =>
    index === destination.entryIndex ? { ...candidate, [destination.field]: [...current, line] } : candidate,
  );

  return { ok: true, resume: { ...resume, [destination.section]: next } as Resume };
}
