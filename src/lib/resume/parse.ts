import { runStructured } from "@/lib/ai/run";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { resumeSchema, type Resume } from "@/lib/resume/schema";

/**
 * Resume structuring.
 *
 * The model receives extracted plain text only — never the uploaded file — and
 * returns the canonical model from `src/lib/resume/schema.ts`. Invalid output is
 * rejected by the schema itself: `runStructured` parses the model response with
 * `resumeSchema`, so a malformed response throws instead of being coerced into a
 * half-shaped resume.
 */
export const parseResumeInstructions = [
  "You convert the plain text of a resume into a structured JSON resume.",
  "",
  "Rules:",
  "- Extract only what the text supports. Never invent employers, dates, metrics or contact details.",
  "- Keep dates exactly as written in the source, including \"Present\" and forms like \"Mar 2021\". Do not normalise them.",
  "- Every work entry needs an employer name; drop an entry only if no employer can be identified.",
  "- Put each bullet of a role into `highlights`, one bullet per string, without the leading dash.",
  "- Use `null` for a field the resume does not contain, and an empty array for a section it does not have.",
  "- Return the JSON object described by the schema, with no commentary.",
].join("\n");

/** The prompt is a single delimited block so source text cannot be mistaken for instructions. */
export function buildParseResumePrompt(text: string): string {
  return ["Resume plain text follows between the markers.", "<<<RESUME", text.trim(), "RESUME>>>"].join("\n");
}

/**
 * `requestId` is passed through so the seam's lines join up with the route's:
 * one id per request, from the handler that received it to the model that
 * refused it.
 */
export async function parseResume(text: string, requestId?: string): Promise<Resume> {
  return runStructured({
    task: "parse-resume",
    schema: resumeSchema,
    instructions: parseResumeInstructions,
    prompt: buildParseResumePrompt(text),
    fixtures: { "parse-resume": parseResumeFixture },
    requestId,
  });
}
