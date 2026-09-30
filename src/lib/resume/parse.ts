import { runStructured } from "@/lib/ai/run";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { resumeContentSchema } from "@/lib/resume/model-schema";
import { defaultSections, type Resume } from "@/lib/resume/schema";

/**
 * Resume structuring.
 *
 * The model receives extracted plain text only — never the uploaded file — and is
 * asked for the content of a resume with `resumeContentSchema`, which is authored
 * for the provider's strict structured output mode. Invalid output is rejected by
 * that schema, so a malformed response throws instead of being coerced into a
 * half-shaped resume.
 *
 * What comes back is content, not a stored resume: `sections` is this app's
 * presentation configuration, so it is added here rather than asked of the model.
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
  const content = await runStructured({
    task: "parse-resume",
    schema: resumeContentSchema,
    instructions: parseResumeInstructions,
    prompt: buildParseResumePrompt(text),
    fixtures: { "parse-resume": parseResumeFixture },
    requestId,
  });

  return { ...content, sections: defaultSections };
}
