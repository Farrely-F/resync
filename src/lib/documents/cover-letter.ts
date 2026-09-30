import { z } from "zod";

import type { DocumentInput, DocumentSpec } from "@/lib/documents/types";

/**
 * The cover letter: prose addressed to the company and the role.
 *
 * A letter has a reader who has already opened the application, so it is longer
 * than the outreach message and it has no subject line — there is nothing to
 * summarise, and a letter with a subject is an email. The report's criteria are
 * the reason this is worth writing at all: the analysis already found which
 * requirements the resume meets, partly meets and misses, so the model can spend
 * its words on the gaps instead of repeating the posting back.
 *
 * The rule is the same as every document here: only what the resume already
 * says. Where the posting asks for something the resume does not show, the model
 * is told to reach for the nearest real experience, never to claim the missing
 * one — a letter that invents a fact is worse than a letter that admits a gap.
 */

/**
 * The answer the model must give. `body` is required and has no default, because
 * a strict provider rejects any object whose properties are not all listed in
 * `required`; a letter always has a body, so nothing here needs to be `nullable`.
 */
export const coverLetterSchema = z.object({
  body: z.string().min(1),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;

const coverLetterInstructions = [
  "You write one cover letter that a candidate can send with an application for a role they have already analysed.",
  "The body must be 250 to 350 words. A letter outside that range will not be read.",
  "Address it to the named company and the named role, using the posting's own title. If no person is named, address the company's hiring team rather than guessing a name.",
  "Use only facts present in the resume: its employers, job titles, dates, technologies, numbers and education. Copy the candidate's name exactly as the resume gives it for the sign-off.",
  "Never invent an employer, a job title, a metric, a date, a technology, a certificate or an achievement the resume does not contain.",
  "The criteria below are the analysis's verdicts on what the posting asks for. Use them: for a criterion that is met or partly met, show the resume evidence that answers it; for a criterion that is missing, connect the nearest real experience the resume does show, and say plainly what has not been done rather than claiming it.",
  "Never mention the analysis, the match score, the criteria, the report, the resume as a document, or this app; the reader has seen none of it.",
  "Return only the letter: the salutation, the body and the sign-off.",
].join("\n");

export function buildCoverLetterPrompt(input: DocumentInput): string {
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
 * technology, number and date in it is in that resume; the company and the role
 * are the posting's; the one gap the posting names — in-vehicle infotainment and
 * connected-vehicle work — is admitted rather than claimed.
 */
export const coverLetterFixture: CoverLetter = {
  body: `Dear Hiring Team at General Motors,

I am applying for the Senior Software Engineer - Go (Golang) role in Warren, MI. I have spent nine years building backend services, and the work the posting describes — high-performance services, distributed systems, and owning delivery end to end — is the work I have been doing.

At Northwind Payments I am a senior backend engineer. I led the migration of the ledger service from a single Postgres instance to sharded storage, which cut p99 write latency by 60%, and I designed an idempotency layer for card authorisations that removed a class of duplicate-settlement incidents. Both were about the same thing the posting asks for: services that stay correct and fast under load, and that someone can be on call for. I also mentored four engineers and ran the on-call rotation for a team of eight, which is the end-to-end ownership and cross-functional work the role describes.

Before that, at Cobalt Analytics, I built an event-ingestion pipeline handling 400M events per day on Kafka and Flink, and introduced schema contracts between producers and consumers that ended a class of silent data breaks. That is the closest work I have to high-performance streaming and to integration between systems owned by different teams, which the posting lists as a nice to have. I have not worked on in-vehicle infotainment or connected-vehicle systems directly. The nearest thing I can point to is that pipeline work, plus running Kubernetes and AWS in production, and I would expect to learn the vehicle side quickly.

I hold an MEng in Computer Science from the University of Bristol and an AWS Certified Solutions Architect - Professional certificate, and I maintain pgqueue, a Postgres-backed job queue in Go.

I would welcome the chance to talk about how this experience would translate to the platform work at General Motors.

Sincerely,
Priya Raman`,
};

export const coverLetterSpec: DocumentSpec = {
  kind: "cover-letter",
  task: "write-cover-letter",
  label: "Cover letter",
  summary: "A one-page letter to the company about this role, written from the report's verdicts so it answers the gaps.",
  instructions: coverLetterInstructions,
  schema: coverLetterSchema,
  buildPrompt: buildCoverLetterPrompt,
  fixture: coverLetterFixture,
  toContent(parsed) {
    const letter = parsed as CoverLetter;

    // A letter has no subject line: there is nothing above the salutation.
    return { shape: "prose", subject: null, body: letter.body };
  },
};
