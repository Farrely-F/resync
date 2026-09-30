import { z } from "zod";

/**
 * The resume as the model is asked to produce it.
 *
 * This is a second schema on purpose, and the reason is a failure that took a
 * provider error to see: Groq and OpenAI's structured output modes are *strict*,
 * and strict mode rejects any object whose properties are not all listed in
 * `required`. A Zod field with `.default(...)` is exactly that — it becomes a
 * property the model may omit — so `resumeSchema`, which is authored for the app,
 * could never be sent to a strict provider. `skills[].level`, `skills[].keywords`
 * and `certificates[].{date,issuer,url}` were the properties Groq named.
 *
 * So the rules here, and `strict-schema.test.ts` enforces them:
 *
 *   - every property is required, always;
 *   - a field that can be absent from a resume is `nullable`, not optional, so the
 *     model says `null` instead of inventing a value;
 *   - no `.default(...)`, because a default is a decision the app makes, not the
 *     model.
 *
 * `sections` is absent, and that is not a detail: it is this app's presentation
 * configuration, with a vocabulary the model has no way to guess and is not asked
 * about. `parseResume` adds it afterwards.
 *
 * The tolerant `resumeSchema` next door remains the app's own contract: it is
 * what stored records and partial input are read with, and it keeps its defaults
 * so a resume saved by an older build still loads.
 */

export const resumeContentSchema = z.object({
  basics: z.object({
    name: z.string(),
    label: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    url: z.string().nullable(),
    summary: z.string().nullable(),
    location: z
      .object({
        city: z.string().nullable(),
        region: z.string().nullable(),
        country: z.string().nullable(),
      })
      .nullable(),
    profiles: z.array(
      z.object({
        network: z.string(),
        username: z.string().nullable(),
        url: z.string().nullable(),
      }),
    ),
  }),
  work: z.array(
    z.object({
      name: z.string(),
      position: z.string().nullable(),
      url: z.string().nullable(),
      location: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      highlights: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      area: z.string().nullable(),
      studyType: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      score: z.string().nullable(),
      highlights: z.array(z.string()),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.string().nullable(),
      keywords: z.array(z.string()),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      url: z.string().nullable(),
      highlights: z.array(z.string()),
    }),
  ),
  certificates: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      date: z.string().nullable(),
      url: z.string().nullable(),
    }),
  ),
  languages: z.array(
    z.object({
      language: z.string(),
      fluency: z.string().nullable(),
    }),
  ),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
