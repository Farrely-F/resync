import { withSections, type Basics, type Resume, type SectionId } from "@/lib/resume/schema";

/**
 * Pure edits behind the visual editor.
 *
 * Every function takes a resume and returns a new one: the editor holds the
 * resume in React state and the LaTeX preview is a pure function of it, so an
 * in-place mutation would both miss the re-render and hide ordering bugs.
 * Nothing here reads storage, the DOM or the clock, which is what makes the
 * reorder, hide, bullet and empty-field rules testable in plain Node.
 */

/** Moves one item; a move off either end is a no-op rather than a wrap-around. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Entries of one section. The cast holds for every id: `Resume[id]` is always an array. */
export function listEntries(resume: Resume, id: SectionId): unknown[] {
  return resume[id] as unknown[];
}

/**
 * Writes one section's entries back.
 *
 * A runtime `SectionId` cannot be tied back to the matching array element type,
 * so this is the one cast the module needs. Every value that reaches it came out
 * of `listEntries` for the same id, so the section keeps its entry shape.
 */
function withEntries(resume: Resume, id: SectionId, entries: unknown[]): Resume {
  return { ...resume, [id]: entries } as Resume;
}

export function addEntry(resume: Resume, id: SectionId, entry: unknown): Resume {
  return withEntries(resume, id, [...listEntries(resume, id), entry]);
}

export function removeEntry(resume: Resume, id: SectionId, index: number): Resume {
  return withEntries(
    resume,
    id,
    listEntries(resume, id).filter((_, position) => position !== index),
  );
}

export function replaceEntry(resume: Resume, id: SectionId, index: number, entry: unknown): Resume {
  return withEntries(
    resume,
    id,
    listEntries(resume, id).map((current, position) => (position === index ? entry : current)),
  );
}

export function moveEntry(resume: Resume, id: SectionId, from: number, to: number): Resume {
  return withEntries(resume, id, moveItem(listEntries(resume, id), from, to));
}

/** Sections in document order, with any id an older record lacks appended. */
export function sectionOrder(resume: Resume): Resume["sections"] {
  return withSections(resume).sections;
}

export function setSectionVisible(resume: Resume, id: SectionId, visible: boolean): Resume {
  return {
    ...resume,
    sections: withSections(resume).sections.map((section) =>
      section.id === id ? { ...section, visible } : section,
    ),
  };
}

/** Moves a section one place: `direction` is -1 for up and 1 for down. */
export function moveSection(resume: Resume, id: SectionId, direction: -1 | 1): Resume {
  const sections = withSections(resume).sections;
  const from = sections.findIndex((section) => section.id === id);

  if (from === -1) {
    return resume;
  }

  return { ...resume, sections: moveItem(sections, from, from + direction) };
}

/** A new bullet, left blank for the user to type into. */
export function addBullet(values: readonly string[]): string[] {
  return [...values, ""];
}

export function setBullet(values: readonly string[], index: number, text: string): string[] {
  return values.map((value, position) => (position === index ? text : value));
}

export function removeBullet(values: readonly string[], index: number): string[] {
  return values.filter((_, position) => position !== index);
}

export function moveBullet(values: readonly string[], from: number, to: number): string[] {
  return moveItem(values, from, to);
}

export function setBasics(resume: Resume, patch: Partial<Basics>): Resume {
  return { ...resume, basics: { ...resume.basics, ...patch } };
}

export function setLocation(resume: Resume, key: "city" | "region" | "country", value: string): Resume {
  const location = resume.basics.location ?? { city: null, region: null, country: null };
  return setBasics(resume, { location: { ...location, [key]: value } });
}

export function addProfile(resume: Resume): Resume {
  return setBasics(resume, {
    profiles: [...resume.basics.profiles, { network: "", username: null, url: null }],
  });
}

export function removeProfile(resume: Resume, index: number): Resume {
  return setBasics(resume, {
    profiles: resume.basics.profiles.filter((_, position) => position !== index),
  });
}

export function replaceProfile(
  resume: Resume,
  index: number,
  patch: Partial<Resume["basics"]["profiles"][number]>,
): Resume {
  return setBasics(resume, {
    profiles: resume.basics.profiles.map((profile, position) =>
      position === index ? { ...profile, ...patch } : profile,
    ),
  });
}

/**
 * Trims every text field and turns a whitespace-only optional field into `null`.
 *
 * This runs on the way to storage and on the way into the generator, never on
 * the way back into an input: trimming live would eat the space a user is typing
 * between two words. It exists because "nothing typed" and "a space typed" must
 * not differ in the document — the generator tests a field for truthiness, and
 * `" "` is truthy, which is how an empty field would otherwise become a blank
 * paragraph in the header or a stray separator.
 */
export function normalizeResume(resume: Resume): Resume {
  const location = resume.basics.location;
  const trimmedLocation = location
    ? { city: trimmed(location.city), region: trimmed(location.region), country: trimmed(location.country) }
    : null;

  return {
    ...resume,
    basics: {
      ...resume.basics,
      name: resume.basics.name.trim(),
      label: trimmed(resume.basics.label),
      email: trimmed(resume.basics.email),
      phone: trimmed(resume.basics.phone),
      url: trimmed(resume.basics.url),
      summary: trimmed(resume.basics.summary),
      location:
        trimmedLocation && (trimmedLocation.city || trimmedLocation.region || trimmedLocation.country)
          ? trimmedLocation
          : null,
      profiles: resume.basics.profiles.map((profile) => ({
        network: profile.network.trim(),
        username: trimmed(profile.username),
        url: trimmed(profile.url),
      })),
    },
    work: resume.work.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      position: trimmed(entry.position),
      url: trimmed(entry.url),
      location: trimmed(entry.location),
      startDate: trimmed(entry.startDate),
      endDate: trimmed(entry.endDate),
      highlights: trimAll(entry.highlights),
    })),
    education: resume.education.map((entry) => ({
      ...entry,
      institution: entry.institution.trim(),
      area: trimmed(entry.area),
      studyType: trimmed(entry.studyType),
      startDate: trimmed(entry.startDate),
      endDate: trimmed(entry.endDate),
      score: trimmed(entry.score),
      highlights: trimAll(entry.highlights),
    })),
    skills: resume.skills.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      level: trimmed(entry.level),
      keywords: trimAll(entry.keywords),
    })),
    projects: resume.projects.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      description: trimmed(entry.description),
      url: trimmed(entry.url),
      highlights: trimAll(entry.highlights),
    })),
    certificates: resume.certificates.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      issuer: trimmed(entry.issuer),
      date: trimmed(entry.date),
      url: trimmed(entry.url),
    })),
    languages: resume.languages.map((entry) => ({
      ...entry,
      language: entry.language.trim(),
      fluency: trimmed(entry.fluency),
    })),
    sections: withSections(resume).sections,
  };
}

/** `null` stays `null`; whitespace-only becomes `null` too. */
function trimmed(value: string | null): string | null {
  return value === null || value.trim().length === 0 ? null : value.trim();
}

/** Bullet text is trimmed but blank bullets are kept: the user may be typing. */
function trimAll(values: readonly string[]): string[] {
  return values.map((value) => value.trim());
}
