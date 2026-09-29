import { z } from "zod";

/**
 * Canonical job description model.
 *
 * Produced by JD intake from either pasted text or an extracted page, and
 * consumed by match analysis. Requirement lists are kept separate from skills
 * because the rubric weights them differently.
 */

const nullableString = z.string().nullable().default(null);

export const jdSchema = z.object({
  title: z.string().default(""),
  company: nullableString,
  seniority: nullableString,
  location: nullableString,
  /** Must-have requirements, as stated by the posting. */
  requirements: z.array(z.string()).default([]),
  /** Explicitly optional or "nice to have" items. */
  niceToHave: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  /** Surface terms worth checking coverage for, including tool names. */
  keywords: z.array(z.string()).default([]),
});

export type Jd = z.infer<typeof jdSchema>;

export function emptyJd(): Jd {
  return jdSchema.parse({});
}

/** Human-readable identity for lists; never empty. */
export function deriveJdTitle(jd: Jd, fallback = "Untitled job"): string {
  const title = jd.title.trim();
  if (!title) {
    return fallback;
  }

  return jd.company ? `${title} — ${jd.company}` : title;
}
