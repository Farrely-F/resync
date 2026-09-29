import type { CriterionEvidence } from "@/lib/match/analyze";

/**
 * Recorded `analyze-match` output for AI_MODE=mock.
 *
 * The evidence below is the analysis of `parseResumeFixture` (Priya Raman)
 * against `extractJdFixture` (the General Motors Go posting), so the mock app
 * shows a coherent end-to-end result offline. It is schema-validated on read
 * like live output, and the two fixtures must move together: a stale verdict
 * about a resume that no longer says that fails loudly rather than quietly
 * scoring the wrong thing.
 *
 * Note what is absent: no score, no percentage. The numbers come from
 * `rubric.ts` and nowhere else.
 */
export const analyzeMatchFixture: CriterionEvidence = {
  criteria: [
    {
      kind: "required",
      requirement: "Strong Go (Golang) experience building backend services and middleware",
      verdict: "met",
      evidence: "Skills: Languages — Go, Python, TypeScript, SQL. Project pgqueue: a Postgres-backed job queue in Go.",
    },
    {
      kind: "required",
      requirement: "Experience designing scalable, reliable distributed systems",
      verdict: "met",
      evidence:
        "Led the migration of the ledger service from a single Postgres instance to sharded storage; built the event-ingestion pipeline handling 400M events per day on Kafka and Flink.",
    },
    {
      kind: "required",
      requirement: "Familiarity with cloud-connected platforms and vehicle or device integration",
      verdict: "missing",
      evidence: null,
    },
    {
      kind: "required",
      requirement: "Ability to own delivery end to end and collaborate across cross-functional teams",
      verdict: "partial",
      evidence:
        "Comfortable owning a service from design through on-call; introduced schema contracts between producers and consumers.",
    },
    {
      kind: "nice-to-have",
      requirement: "Experience with in-vehicle infotainment or connected vehicle systems",
      verdict: "missing",
      evidence: null,
    },
    {
      kind: "nice-to-have",
      requirement: "Exposure to high-performance networking or streaming workloads",
      verdict: "partial",
      evidence: "Event-ingestion pipeline handling 400M events per day on Kafka and Flink.",
    },
    {
      kind: "seniority",
      requirement: "Senior-level backend engineering experience",
      verdict: "met",
      evidence: "Senior Backend Engineer at Northwind Payments, Mar 2021 – Present, with nine years of backend work.",
    },
    {
      kind: "domain",
      requirement: "Automotive or connected-vehicle domain experience",
      verdict: "missing",
      evidence: null,
    },
    {
      kind: "education",
      requirement: "Degree in computer science or a related field",
      verdict: "met",
      evidence: "MEng Computer Science, University of Bristol, 2013 – 2017, first class honours.",
    },
  ],
  summary:
    "The resume covers the Go and distributed-systems requirements directly, with a Go project and a large streaming pipeline as evidence. The connected-vehicle and automotive sides of the posting are not represented, and the end-to-end ownership requirement is only partly shown. Treat this as commentary: the percentage on the report is computed from the verdicts above, not from this paragraph.",
};
