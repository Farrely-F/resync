import type { z } from "zod";

import type { AiTask } from "@/lib/ai/run";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";

/**
 * Documents written from a match: the letter, the message, the interview.
 *
 * All three are the same thing mechanically — the model is given the resume, the
 * posting and the analysis, and answers in a shape this app fixes — so they share
 * one pipeline: one spec per kind, one route, one panel. What differs is the
 * instructions, the schema, and how the answer is shown.
 *
 * The analysis is part of the input on purpose. A letter written from the posting
 * alone repeats the posting; written from the report, it can answer the gaps the
 * report found, which is the only reason to have run the analysis first.
 *
 * Nothing here is a model's opinion about the candidate: the model is asked for
 * text and for questions, and it is told not to claim anything the resume does not
 * support.
 */

export const documentKinds = ["cover-letter", "outreach", "interview-prep"] as const;

export type DocumentKind = (typeof documentKinds)[number];

export interface InterviewQuestion {
  /** The question as an interviewer would ask it. */
  question: string;
  /** Why this candidate in particular will be asked it. */
  why: string;
  /** How to answer from what the resume already says. */
  how: string;
}

/** A letter or a message: a subject line where one makes sense, and a body. */
export interface ProseDocument {
  shape: "prose";
  /** Null for a document that has no subject line, such as a cover letter. */
  subject: string | null;
  body: string;
}

export interface QuestionsDocument {
  shape: "questions";
  questions: InterviewQuestion[];
}

export type DocumentContent = ProseDocument | QuestionsDocument;

export interface DocumentRecord {
  id: string;
  reportId: string;
  kind: DocumentKind;
  /** What the model produced, validated against the spec's schema. */
  content: DocumentContent;
  /**
   * The reader's own text, once they have edited a prose document. Null while the
   * generated text still stands, so "the model wrote this" and "I wrote this" are
   * never the same record.
   */
  editedText: string | null;
  /** Which model answered, and under which mode: the app records this everywhere else. */
  model: string;
  aiMode: "mock" | "live";
  createdAt: string;
  updatedAt: string;
}

/** Everything the model is given: the evidence the report was built from. */
export interface DocumentInput {
  resume: Resume;
  jd: Jd;
  criteria: readonly MatchCriterion[];
  /** The model's commentary from the report, when it wrote any. */
  summary: string | null;
}

export interface DocumentSpec {
  kind: DocumentKind;
  /** The seam's task name: what it logs, and what mock mode finds the recording by. */
  task: AiTask;
  label: string;
  /** One line for the panel and for the guide. */
  summary: string;
  /** What the model is told, before the evidence. */
  instructions: string;
  /**
   * The shape the model must answer in. Strict, like every model-facing schema in
   * this app: every property required, `nullable` where a value may be absent, no
   * defaults — see `ai/strict-schema.test.ts`, which fails if that slips.
   */
  schema: z.ZodType;
  buildPrompt(input: DocumentInput): string;
  /** The recorded answer used in mock mode; validated by `schema` on the way out. */
  fixture: unknown;
  /** Turns the validated answer into the shape the panel renders. */
  toContent(parsed: unknown): DocumentContent;
}

/** One document per kind per report: regenerating replaces it rather than piling up. */
export function documentId(reportId: string, kind: DocumentKind): string {
  return `${reportId}:${kind}`;
}

/**
 * The plain text a document copies or downloads as: the reader's text when they
 * have edited it, the generated text otherwise.
 */
export function documentText(record: DocumentRecord): string {
  if (record.editedText !== null) {
    return record.editedText;
  }

  if (record.content.shape === "questions") {
    return record.content.questions
      .map((entry, index) => `${index + 1}. ${entry.question}\nWhy it comes up: ${entry.why}\nHow to answer: ${entry.how}`)
      .join("\n\n");
  }

  return record.content.subject === null
    ? record.content.body
    : `${record.content.subject}\n\n${record.content.body}`;
}
