import { z } from "zod";

import type { DocumentInput, DocumentSpec } from "@/lib/documents/types";

/**
 * The outreach message: a short email to a person at the company.
 *
 * A cover letter has a reader who has already opened the application; this has a
 * reader who has not, so it is shorter, it has a subject line because it is an
 * email, and its greeting cannot name anyone — the sender does not know who reads
 * it, so the model is told to leave a placeholder rather than guess. Everything
 * else is the same rule as every document here: only what the resume already
 * says, and never a word about the analysis that produced it.
 */

/**
 * The answer the model must give. Both properties are required and neither has a
 * default, because a strict provider rejects any object whose properties are not
 * all listed in `required`; an outreach email always has a subject, so there is
 * nothing here that needs to be `nullable`.
 */
export const outreachMessageSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type OutreachMessage = z.infer<typeof outreachMessageSchema>;

const outreachInstructions = [
  "You write one short email that a candidate can send to a person at a company — a recruiter or the hiring manager — about a role they have already analysed.",
  "The body must be roughly 90 to 150 words; anything longer will not be read.",
  "`subject` is a plain subject line naming the role and the candidate's interest. No greeting, no exclamation marks, no marketing.",
  "Open the body with a greeting that leaves a placeholder for the recipient's name, written as `[name]` — never guess, invent or imply a name, because the sender does not know who will read it.",
  "Spend one or two sentences connecting experience the resume actually shows to what the posting asks for, using the resume's own employers, technologies and numbers.",
  "Then make one clear ask: whether the role is still open, whether they would look at the candidate's application, or a short question about the process.",
  "Close with a sign-off that uses the candidate's own name exactly as the resume gives it, and nothing below it.",
  "Never invent an employer, a job title, a metric, a referral, a mutual connection, an introduction, or any other claim the resume does not contain.",
  "Never mention the analysis, the match score, the criteria, the report or this app; the reader has seen none of it.",
  "Return only the email: the subject line and the body.",
].join("\n");

export function buildOutreachPrompt(input: DocumentInput): string {
  const criteria = input.criteria.map(
    (criterion, index) =>
      `${index + 1}. [${criterion.kind}] ${criterion.requirement} — currently ${criterion.verdict}${
        criterion.evidence === null ? "" : ` (resume evidence: ${criterion.evidence})`
      }`,
  );

  const sections = [
    "RESUME (structured data)",
    JSON.stringify(input.resume, null, 2),
    "",
    "JOB POSTING (structured data)",
    JSON.stringify(input.jd, null, 2),
    "",
    "CRITERIA ALREADY SCORED (what the analysis found, and the resume evidence behind each verdict)",
    criteria.length === 0 ? "(none)" : criteria.join("\n"),
  ];

  if (input.summary !== null) {
    sections.push("", "ANALYSIS COMMENTARY", input.summary);
  }

  return sections.join("\n");
}

/**
 * The recorded answer for `AI_MODE=mock`, written for the fixture resume (Priya
 * Raman) and the fixture posting (General Motors, Go backend). Every employer,
 * technology and number in it is in that resume; the greeting is the placeholder
 * the instructions require, and the sign-off is the candidate's own name.
 */
export const outreachFixture: OutreachMessage = {
  subject: "Backend engineer interested in the Senior Software Engineer - Go role",
  body: `Hi [name],

I am writing about the Senior Software Engineer - Go role at General Motors. I have spent nine years building backend services, most recently as a senior engineer at Northwind Payments, where I led a ledger migration to sharded storage and cut p99 write latency by 60%. Before that, at Cobalt Analytics, I built an event-ingestion pipeline handling 400M events a day on Kafka, and my day-to-day languages are Go, Python and SQL.

Is the role still open, and would you be the right person to speak with about the team it sits in? I am happy to send anything else that would help.

Thanks for your time,
Priya Raman`,
};

export const outreachSpec: DocumentSpec = {
  kind: "outreach",
  task: "write-outreach",
  label: "Outreach message",
  summary: "A short email to a recruiter or hiring manager about this role, with a subject line and a greeting you fill in.",
  instructions: outreachInstructions,
  schema: outreachMessageSchema,
  buildPrompt: buildOutreachPrompt,
  fixture: outreachFixture,
  toContent(parsed) {
    const message = parsed as OutreachMessage;

    return { shape: "prose", subject: message.subject, body: message.body };
  },
};
