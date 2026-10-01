import type { AiMode } from "@/lib/env";
import type { Jd } from "@/lib/jd/schema";
import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import type { DocumentContent, DocumentKind } from "@/lib/documents/types";

/**
 * Wire contract between a document panel and `POST /api/documents`.
 *
 * The evidence travels with the request because it lives in the reader's browser,
 * not on this server: the route is handed the resume, the posting and the report's
 * criteria, and answers with the document. Nothing is stored server-side.
 */

export interface DocumentRequestBody {
  kind: DocumentKind;
  resume: Resume;
  jd: Jd;
  criteria: MatchCriterion[];
  /** The report's model commentary, when it wrote any. */
  summary: string | null;
}

export interface DocumentSuccess {
  content: DocumentContent;
  /** The provider and model that answered. */
  model: string;
  aiMode: AiMode;
}

export interface DocumentFailure {
  error: {
    reason: string;
    message: string;
    /** One of `aiFailureKinds` when the route classified the failure. */
    kind?: string;
    retryAfterSeconds?: number | null;
  };
}

export type DocumentResponse = DocumentSuccess | DocumentFailure;

export function isDocumentFailure(response: DocumentResponse): response is DocumentFailure {
  return "error" in response;
}

/**
 * The browser stops waiting after this, rather than on a server that went quiet.
 *
 * It sits above the server's own budget (`documentBudgetMs`) so the server's
 * terminal answer normally wins; this is only the backstop for when no answer
 * arrives at all.
 */
export const documentWaitMs = 75_000;
