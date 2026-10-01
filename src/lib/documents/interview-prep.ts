import { z } from "zod";

import type { DocumentInput, DocumentSpec } from "@/lib/documents/types";

/**
 * The interview: the questions this candidate is likely to be asked, and how to
 * answer each one from what the resume already says.
 *
 * This is the only document here that is not prose. A letter is read once; these
 * are worked through one at a time, so the answer is a list rather than a page and
 * every entry carries its own reasoning — why the question is likely for *this*
 * candidate, and where in the resume the answer comes from.
 *
 * The instructions carry one rule the other documents do not need: `how` may not
 * invent experience. When the analysis found nothing, the honest entry says so and
 * leaves the decision to the candidate, rather than coaching them through an
 * answer they cannot give in the room.
 */

/**
 * The answer the model must give. Every property is required and none has a
 * default, because a strict provider rejects any object whose properties are not
 * all listed in `required`; an entry with no `why` would be advice the candidate
 * cannot check, so there is nothing here that may be absent.
 *
 * The count is asked for in the instructions rather than bounded here: no other
 * model-facing schema in this app constrains an array's length, and a provider
 * that rejects the keyword would fail the whole call.
 */
export const interviewQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().min(1),
      why: z.string().min(1),
      how: z.string().min(1),
    }),
  ),
});

export type InterviewQuestions = z.infer<typeof interviewQuestionsSchema>;

const interviewPrepInstructions = [
  "You prepare one candidate for the interview for one job, using the analysis they already have.",
  "Return between 5 and 8 questions, ordered by how likely they are to come up.",
  "Weight the set towards what the analysis found missing or only partly met: those are the questions this candidate cannot answer from habit. Include one or two on the strongest evidence, where an interviewer will want the detail behind it.",
  "`question` is the question as an interviewer would ask it aloud, in one sentence. It is a question that is likely to be asked, never one that has been asked.",
  "`why` says what in the analysis, the posting or the resume makes this question likely for this candidate in particular. Name the requirement, the verdict or the evidence you are reasoning from. Generic interview advice is not an answer.",
  "`how` says how to answer from what the resume already shows: which employer, which project, which number, which trade-off. It is a plan for the answer, not the answer itself.",
  "Never invent experience, an employer, a technology, a metric or a qualification that the resume does not contain, and never suggest the candidate claim one.",
  "When the analysis found no evidence for what the question is about, `how` must say that plainly and leave the decision to the candidate: how they address a gap is theirs to choose, and it cannot be coached around.",
  "Never mention the analysis, the match score, the criteria, the report or this app. The candidate has read them; the interviewer has not, and every question must sound like the interviewer's.",
  "Return only the questions.",
].join("\n");

export function buildInterviewPrepPrompt(input: DocumentInput): string {
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
 * Raman), the fixture posting (General Motors, Go backend) and the verdicts in
 * `analyzeMatchFixture` — so the questions weight the same gaps the mock report
 * shows: no connected-vehicle or automotive evidence, and end-to-end ownership
 * only partly met. Every employer, technology and number below is in that resume,
 * and the two entries whose gap the analysis found missing say so instead of
 * coaching an answer the candidate cannot give.
 */
export const interviewPrepFixture: InterviewQuestions = {
  questions: [
    {
      question: "The posting is a Go role. Where have you shipped Go, and what did you build with it?",
      why: "The Go requirement is marked met from your skills list and the pgqueue project rather than from either job, and neither role in the resume names a language. An interviewer will want the language pinned to something that ran.",
      how: "Start with pgqueue, the Postgres-backed job queue you wrote in Go, and describe how it works and what it was for. Then say which parts of your paid work were Go and which were Python or SQL — the resume does not say, so decide before the interview and do not leave the interviewer to infer it. If Go was mostly side-project work, say that plainly.",
    },
    {
      question: "Walk us through a distributed system you designed, and the failure modes you had to handle.",
      why: "Designing scalable, reliable distributed systems is the posting's second requirement and is marked met on the ledger migration and the Kafka pipeline, so this is where your strongest evidence will be tested in detail.",
      how: "Take the ledger migration at Northwind Payments: a single Postgres instance to sharded storage, cutting p99 write latency by 60%. Expect the follow-ups — how you chose the shard key, what broke during the move, how cross-shard reads were handled — and have those ready. Then the idempotency layer for card authorisations, which removed duplicate-settlement incidents: a concrete failure mode and the fix. Every number is already in the resume; do not add new ones.",
    },
    {
      question: "You have not worked with connected vehicles. How would you come up to speed on device integration?",
      why: "Cloud-connected platforms and vehicle or device integration is the posting's own requirement, and the analysis found no evidence for it anywhere in the resume. It is the clearest gap in the match and the likeliest place an interviewer probes.",
      how: "Do not claim vehicle experience. Point at the closest thing the resume does show — the Kafka and Flink pipeline taking 400M events a day, and the sharded ledger — then talk about the questions you would ask first: what protocol the device speaks, what runs on the vehicle against what runs in the cloud, how updates are rolled out. The honest answer is that the resume has no evidence here; decide beforehand how you want to address that, and say it rather than working around it.",
    },
    {
      question: "The team cares about latency and throughput. What is the most demanding system you have run?",
      why: "In-vehicle infotainment and high-performance streaming are the posting's optional items, and the analysis found only partial evidence against them. The pipeline at Cobalt Analytics is the number an interviewer will reach for.",
      how: "Use the event-ingestion pipeline at Cobalt Analytics: 400M events per day on Kafka and Flink. Have the shape of the load ready — how it was partitioned, what backpressure looked like, what happened when a consumer fell behind. Present it as high-throughput streaming, which is what the resume supports, and do not describe it as real-time vehicle work.",
    },
    {
      question: "How have you owned a delivery end to end, and how do you work with teams outside your own?",
      why: "Owning delivery end to end and collaborating across cross-functional teams is only partly met in the analysis, and the evidence it did find — mentoring and the on-call rotation — is about a team rather than about a delivery.",
      how: "The resume gives you mentoring four engineers and running the on-call rotation for a team of eight at Northwind Payments. Pick one delivery you owned from design through on-call, describe it concretely, and say what you had to agree with another team to ship it. If that collaboration was inside engineering rather than with hardware or product teams, say so — the gap is in the kind of collaboration, not in whether you did any.",
    },
    {
      question: "Your background is payments and analytics. Why automotive?",
      why: "The analysis found no automotive or connected-vehicle domain evidence, and this posting is a vehicle platform, so the question is about your reason for moving rather than your ability to do the work.",
      how: "Answer from what the resume shows: nine years on payment and data platforms, most recently owning a ledger service, with distributed systems as the through-line. Say what in this role's engineering draws you — services at scale, on a platform where reliability is the product. Do not manufacture an interest in cars the resume does not support; the analysis is right that there is no domain evidence, and a rehearsed enthusiasm is worse than an honest reason.",
    },
    {
      question: "How do you keep a service maintainable after you have shipped it?",
      why: "The posting asks for clean, maintainable and well-tested code. The nearest evidence in the resume is the schema contracts you introduced at Cobalt Analytics and the idempotency layer at Northwind Payments, so this is the ground the interviewer will expect you to argue from.",
      how: "Describe the schema contracts between producers and consumers at Cobalt Analytics and the class of silent data breaks they ended — that before and after is what the question is asking for. Then the idempotency layer for card authorisations, and what it took to trust it. Stay with what the resume says you built; if you want to talk about how you test today, be clear that it is not something the resume records.",
    },
  ],
};

export const interviewPrepSpec: DocumentSpec = {
  kind: "interview-prep",
  task: "prep-interview",
  label: "Interview prep",
  summary:
    "The questions you are likely to be asked, weighted to what the analysis found missing, each with why it comes up and how to answer it from what your resume already says.",
  instructions: interviewPrepInstructions,
  schema: interviewQuestionsSchema,
  buildPrompt: buildInterviewPrepPrompt,
  fixture: interviewPrepFixture,
  toContent(parsed) {
    const { questions } = parsed as InterviewQuestions;

    return { shape: "questions", questions };
  },
};
