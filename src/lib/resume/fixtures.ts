import { defaultSections, resumeSchema, type Resume } from "@/lib/resume/schema";

/**
 * Recorded fixture for `AI_MODE=mock`.
 *
 * Mock mode is the dev default and must run with zero network calls, so the
 * `parse-resume` task owns this recording. It is a plausible structuring of
 * `parseResumeFixtureSourceText` below — maintain the two together, because
 * the fixture is validated against `resumeSchema` on the way out and a drifted
 * recording fails loudly rather than silently mis-parsing.
 */
export const parseResumeFixtureSourceText = `Priya Raman
Senior Backend Engineer
priya.raman@example.com | +44 7700 900123 | Bristol, United Kingdom
linkedin.com/in/priyaraman | github.com/priyaraman

SUMMARY
Backend engineer with 9 years building payment and data platforms. Comfortable owning a service from design through on-call.

EXPERIENCE
Northwind Payments — Senior Backend Engineer
Mar 2021 - Present, Bristol
- Led the migration of the ledger service from a single Postgres instance to sharded storage, cutting p99 write latency by 60%.
- Designed an idempotency layer for card authorisations that removed duplicate-settlement incidents.
- Mentored four engineers; ran the on-call rotation for a team of eight.

Cobalt Analytics — Backend Engineer
Jul 2017 - Feb 2021, Remote
- Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.
- Introduced schema contracts between producers and consumers, ending a class of silent data breaks.

EDUCATION
University of Bristol — MEng Computer Science, 2013 - 2017
First class honours.

SKILLS
Languages: Go, Python, TypeScript, SQL
Platforms: PostgreSQL, Kafka, Redis, Kubernetes, AWS

PROJECTS
pgqueue — A Postgres-backed job queue in Go. github.com/priyaraman/pgqueue

CERTIFICATES
AWS Certified Solutions Architect - Professional, Amazon Web Services, 2022

LANGUAGES
English (Native), Tamil (Conversational), German (Intermediate)`;

export const parseResumeFixture: Resume = resumeSchema.parse({
  basics: {
    name: "Priya Raman",
    label: "Senior Backend Engineer",
    email: "priya.raman@example.com",
    phone: "+44 7700 900123",
    url: null,
    summary:
      "Backend engineer with 9 years building payment and data platforms. Comfortable owning a service from design through on-call.",
    location: { city: "Bristol", region: null, country: "United Kingdom" },
    profiles: [
      { network: "LinkedIn", username: "priyaraman", url: "https://linkedin.com/in/priyaraman" },
      { network: "GitHub", username: "priyaraman", url: "https://github.com/priyaraman" },
    ],
  },
  work: [
    {
      name: "Northwind Payments",
      position: "Senior Backend Engineer",
      url: null,
      location: "Bristol",
      startDate: "Mar 2021",
      endDate: "Present",
      highlights: [
        "Led the migration of the ledger service from a single Postgres instance to sharded storage, cutting p99 write latency by 60%.",
        "Designed an idempotency layer for card authorisations that removed duplicate-settlement incidents.",
        "Mentored four engineers; ran the on-call rotation for a team of eight.",
      ],
    },
    {
      name: "Cobalt Analytics",
      position: "Backend Engineer",
      url: null,
      location: "Remote",
      startDate: "Jul 2017",
      endDate: "Feb 2021",
      highlights: [
        "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.",
        "Introduced schema contracts between producers and consumers, ending a class of silent data breaks.",
      ],
    },
  ],
  education: [
    {
      institution: "University of Bristol",
      area: "Computer Science",
      studyType: "MEng",
      startDate: "2013",
      endDate: "2017",
      score: "First class honours",
      highlights: [],
    },
  ],
  skills: [
    { name: "Languages", level: null, keywords: ["Go", "Python", "TypeScript", "SQL"] },
    { name: "Platforms", level: null, keywords: ["PostgreSQL", "Kafka", "Redis", "Kubernetes", "AWS"] },
  ],
  projects: [
    {
      name: "pgqueue",
      description: "A Postgres-backed job queue in Go.",
      url: "https://github.com/priyaraman/pgqueue",
      highlights: [],
    },
  ],
  certificates: [
    {
      name: "AWS Certified Solutions Architect - Professional",
      issuer: "Amazon Web Services",
      date: "2022",
      url: null,
    },
  ],
  languages: [
    { language: "English", fluency: "Native" },
    { language: "Tamil", fluency: "Conversational" },
    { language: "German", fluency: "Intermediate" },
  ],
  sections: defaultSections,
});
