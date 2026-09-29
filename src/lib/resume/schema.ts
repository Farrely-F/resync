import { z } from "zod";

/**
 * Canonical resume model.
 *
 * The shape follows JSON Resume for the sections this product models. This
 * object is the source of truth: LaTeX, plain text and analysis output are all
 * derived from it. Fields are normalised to `null`/`[]` rather than left absent,
 * so a parsed resume is always fully shaped and templates need no undefined
 * checks.
 *
 * Dates are deliberately plain strings: resumes legitimately contain "Mar 2021",
 * "2021-03", "Present" and worse, and coercing them here would destroy data.
 */

export const sectionIds = ["work", "education", "skills", "projects", "certificates", "languages"] as const;

export type SectionId = (typeof sectionIds)[number];

const nullableString = z.string().nullable().default(null);

export const basicsSchema = z.object({
  name: z.string().default(""),
  label: nullableString,
  email: nullableString,
  phone: nullableString,
  url: nullableString,
  summary: nullableString,
  location: z
    .object({
      city: nullableString,
      region: nullableString,
      country: nullableString,
    })
    .nullable()
    .default(null),
  profiles: z
    .array(
      z.object({
        network: z.string(),
        username: nullableString,
        url: nullableString,
      }),
    )
    .default([]),
});

export const workSchema = z.object({
  name: z.string(),
  position: nullableString,
  url: nullableString,
  location: nullableString,
  startDate: nullableString,
  endDate: nullableString,
  highlights: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  institution: z.string(),
  area: nullableString,
  studyType: nullableString,
  startDate: nullableString,
  endDate: nullableString,
  score: nullableString,
  highlights: z.array(z.string()).default([]),
});

export const skillSchema = z.object({
  name: z.string(),
  level: nullableString,
  keywords: z.array(z.string()).default([]),
});

export const projectSchema = z.object({
  name: z.string(),
  description: nullableString,
  url: nullableString,
  highlights: z.array(z.string()).default([]),
});

export const certificateSchema = z.object({
  name: z.string(),
  issuer: nullableString,
  date: nullableString,
  url: nullableString,
});

export const languageSchema = z.object({
  language: z.string(),
  fluency: nullableString,
});

export const sectionConfigSchema = z.object({
  id: z.enum(sectionIds),
  visible: z.boolean().default(true),
});

export const resumeSchema = z.object({
  basics: basicsSchema,
  work: z.array(workSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillSchema).default([]),
  projects: z.array(projectSchema).default([]),
  certificates: z.array(certificateSchema).default([]),
  languages: z.array(languageSchema).default([]),
  sections: z.array(sectionConfigSchema).default([]),
});

export type Resume = z.infer<typeof resumeSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type WorkEntry = z.infer<typeof workSchema>;
export type EducationEntry = z.infer<typeof educationSchema>;
export type SkillEntry = z.infer<typeof skillSchema>;
export type ProjectEntry = z.infer<typeof projectSchema>;
export type CertificateEntry = z.infer<typeof certificateSchema>;
export type LanguageEntry = z.infer<typeof languageSchema>;
export type SectionConfig = z.infer<typeof sectionConfigSchema>;

export const defaultSections: SectionConfig[] = sectionIds.map((id) => ({ id, visible: true }));

export function emptyResume(): Resume {
  return resumeSchema.parse({ basics: {}, sections: defaultSections });
}

/** Human-readable identity for the library list; never empty. */
export function deriveResumeTitle(resume: Resume): string {
  const name = resume.basics.name.trim();
  if (name) {
    return name;
  }

  const position = resume.work.find((entry) => entry.position)?.position;
  if (position) {
    return position;
  }

  return "Untitled resume";
}

/**
 * Normalises a stored resume so records written by an older schema still load:
 * section configuration is reconciled with the sections that exist.
 */
export function withSections(resume: Resume): Resume {
  const configured = resume.sections.filter((section) => sectionIds.includes(section.id));
  const missing = sectionIds.filter((id) => !configured.some((section) => section.id === id));

  return {
    ...resume,
    sections: [...configured, ...missing.map((id) => ({ id, visible: true }))],
  };
}
