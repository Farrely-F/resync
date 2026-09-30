import { z } from "zod";

/**
 * The job description as the model is asked to produce it.
 *
 * Strict, for the same reason as `resumeContentSchema`: a `.default(...)` in the
 * app's schema becomes a property the model may omit, and Groq and OpenAI's
 * structured output modes reject a schema whose properties are not all required.
 * A field a posting may not state is `nullable`, so the model says `null` rather
 * than inventing a company or a location.
 *
 * `jdSchema` next door stays the app's contract, defaults included, because
 * `emptyJd()` and a stored posting both need to be readable with fields missing.
 */

export const jdContentSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  seniority: z.string().nullable(),
  location: z.string().nullable(),
  /** Must-have requirements, as stated by the posting. */
  requirements: z.array(z.string()),
  /** Explicitly optional or "nice to have" items. */
  niceToHave: z.array(z.string()),
  skills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  /** Surface terms worth checking coverage for, including tool names. */
  keywords: z.array(z.string()),
});

export type JdContent = z.infer<typeof jdContentSchema>;
