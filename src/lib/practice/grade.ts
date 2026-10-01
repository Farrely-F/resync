import type { LanguageModel } from "ai";
import { z } from "zod";

import { runStructured, type AiTask } from "@/lib/ai/run";
import type { AppEnv } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";

/**
 * The model's half of interview practice: one answer in, one set of judgements out.
 *
 * The conversation is not the model's. The app picks each question from the stored
 * interview prep and sends one answer at a time, so a turn costs one bounded call
 * and mock mode replays the same recording for each. The model returns categorical
 * verdicts and words; `rubric.ts` turns them into numbers.
 */

export const verdictValues = ["strong", "adequate", "weak", "not-applicable"] as const;
export type Verdict = (typeof verdictValues)[number];

export const deliveryValues = ["assertive", "mixed", "hedged"] as const;
export type Delivery = (typeof deliveryValues)[number];

/** Every property required and none defaulted: a strict provider rejects anything else. */
export const gradeSchema = z.object({
  verdicts: z.object({
    answered: z.enum(verdictValues),
    evidence: z.enum(verdictValues),
    grounded: z.enum(verdictValues),
    structure: z.enum(verdictValues),
    honesty: z.enum(verdictValues),
  }),
  delivery: z.enum(deliveryValues),
  /** What worked and what did not, addressed to the candidate. */
  feedback: z.string().min(1),
  /** A plan for a stronger answer built from the resume, not a script. */
  strongerAnswer: z.string().min(1),
  /** Claims in the answer that the resume does not support; empty when there are none. */
  unsupportedClaims: z.array(z.string()),
  /** One follow-up an interviewer would ask next, or null when there is nothing worth probing. */
  followUp: z.string().nullable(),
});

export type Grade = z.infer<typeof gradeSchema>;
export type GradeVerdicts = Grade["verdicts"];

export const gradeInstructions = [
  "You are an interviewer who has just heard one candidate's answer to one question for one job. You judge the answer, and you do not score it.",
  "You are given the candidate's resume, the posting, the analysis they already have, the question, a plan for answering it, and the answer.",
  "Judge each of these as `strong`, `adequate` or `weak`: `answered` (addressed what was asked), `evidence` (named a project, decision or number rather than speaking in general), `grounded` (every claim is supported by the resume), `structure` (context, action and result, in an order a listener can follow), `honesty` (said plainly where the resume has a gap and showed a way forward).",
  "Use `not-applicable` for `honesty` when the question is not about something the resume lacks. Use it for no other dimension.",
  "A claim of experience, an employer, a technology or a number that is not in the resume is not grounded: mark `grounded` as `weak`, and quote each such claim in `unsupportedClaims`. Never treat a claim as true because the candidate said it confidently.",
  "`delivery` is how the wording reads: `assertive` for direct statements, `hedged` for an answer that keeps qualifying itself, `mixed` between. You are reading typed text, so judge wording only, never voice, pace or presence.",
  "`feedback` is two to four sentences to the candidate: what worked, then the single most useful thing to change. Be specific to this answer. Do not flatter.",
  "`strongerAnswer` is a plan for a better answer, built only from the resume: which employer, which project, which number, in what order. It is not a script, and it must not invent anything the resume does not contain. If the resume has nothing to answer with, say so and tell the candidate to address the gap honestly.",
  "`followUp` is one question an interviewer would ask next to probe the weakest part of this answer, or null when the answer needs no probing.",
  "Never return a score, a percentage, a grade or a rating. Never mention the analysis, the report or this app.",
].join("\n");

export interface GradeInput {
  resume: Resume;
  jd: Jd;
  criteria: readonly MatchCriterion[];
  question: { question: string; why: string; how: string };
  answer: string;
  /** Set when the answer is to a follow-up: the question the candidate was first asked and what they said. */
  earlier?: { question: string; answer: string } | null;
}

export function buildGradePrompt(input: GradeInput): string {
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
    "ANALYSIS ALREADY DONE",
    criteria.length === 0 ? "(none)" : criteria.join("\n"),
    "",
    "PLAN THE CANDIDATE PREPARED FOR THIS QUESTION",
    input.question.how,
  ];

  if (input.earlier) {
    sections.push(
      "",
      "EARLIER IN THIS QUESTION",
      `Asked: ${input.earlier.question}`,
      `Candidate said: ${input.earlier.answer}`,
      "",
      "The answer below is to a follow-up. Judge it as the answer to the follow-up question.",
    );
  }

  sections.push("", "QUESTION", input.question.question, "", "CANDIDATE'S ANSWER", input.answer);

  return sections.join("\n");
}

/**
 * The recorded answer for `AI_MODE=mock`. One recording serves every turn, so it
 * is worded to hold for any answer: it judges by the standard rather than by the
 * content, which is also why mock-mode scores should not be read as a judgement.
 */
export const gradeFixture: Grade = {
  verdicts: { answered: "adequate", evidence: "weak", grounded: "strong", structure: "adequate", honesty: "not-applicable" },
  delivery: "mixed",
  feedback:
    "You addressed the question, and what you claimed matches your resume. The weak point is specificity: name one project, the decision you made and the result, instead of describing how you usually work.",
  strongerAnswer:
    "Open with the single strongest example on your resume for this question. Say what the situation was, what you personally decided or built, and the outcome with the number your resume already gives. Keep to facts the resume contains.",
  unsupportedClaims: [],
  followUp: "What was the hardest trade-off in that, and what did you give up?",
};

export interface GradeAnswerInput extends GradeInput {
  env?: AppEnv;
  fixtures?: Partial<Record<AiTask, unknown>>;
  model?: LanguageModel;
}

/** The `grade-answer` call. A follow-up is only ever asked once per question, whatever the model returns. */
export async function gradeAnswer(input: GradeAnswerInput): Promise<Grade> {
  const grade = await runStructured({
    task: "grade-answer",
    schema: gradeSchema,
    instructions: gradeInstructions,
    prompt: buildGradePrompt(input),
    env: input.env,
    fixtures: input.fixtures ?? { "grade-answer": gradeFixture },
    model: input.model,
  });

  return input.earlier ? { ...grade, followUp: null } : grade;
}
