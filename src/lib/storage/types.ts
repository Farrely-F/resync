import type { DocumentRecord } from "@/lib/documents/types";
import type { Jd } from "@/lib/jd/schema";
import type { MatchReport } from "@/lib/match/types";
import type { PageLayout } from "@/lib/layout";
import type { Resume } from "@/lib/resume/schema";

/**
 * Local persistence contract.
 *
 * Every stored artifact is derived data: the canonical resume, the text it was
 * extracted from, job descriptions, and generated LaTeX. Original uploads and
 * compiled PDFs are deliberately not persisted.
 */

export type ResumeMode = "structured" | "manual";

export interface ResumeRecord {
  id: string;
  title: string;
  resume: Resume;
  /** Text extracted from the original document; the source for re-parsing. */
  plainText: string;
  themeId: string;
  /** Paper and margin. Absent on records saved before layouts existed: read it with `resolveLayout`. */
  layout?: PageLayout;
  /** `manual` means the user edited the generated LaTeX; it must not be rewritten from data. */
  mode: ResumeMode;
  /** Hand-edited LaTeX. Only meaningful when `mode` is `manual`. */
  manualTex: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JdRecord {
  id: string;
  title: string;
  company: string | null;
  sourceUrl: string | null;
  /** Text obtained by paste or extraction, kept so the structured view is auditable. */
  rawText: string;
  structured: Jd;
  createdAt: string;
  updatedAt: string;
}

export interface StorageEstimate {
  /** False when the browser exposes no quota API; sizes are then unknown, not zero. */
  supported: boolean;
  usageBytes: number;
  quotaBytes: number | null;
}

export interface StorageApi {
  listResumes(): Promise<ResumeRecord[]>;
  getResume(id: string): Promise<ResumeRecord | null>;
  putResume(record: ResumeRecord): Promise<void>;
  deleteResume(id: string): Promise<void>;

  listJds(): Promise<JdRecord[]>;
  getJd(id: string): Promise<JdRecord | null>;
  putJd(record: JdRecord): Promise<void>;
  deleteJd(id: string): Promise<void>;

  listReports(): Promise<MatchReport[]>;
  getReport(id: string): Promise<MatchReport | null>;
  putReport(report: MatchReport): Promise<void>;
  deleteReport(id: string): Promise<void>;
  /** Most recent report for an input identity, which is how repeat analyses avoid a model call. */
  findReportByInputHash(inputHash: string): Promise<MatchReport | null>;

  /** Letters, messages and interview prep written from a report, newest first. */
  listDocuments(): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  putDocument(record: DocumentRecord): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  /** Deleting a report takes the documents written from it: they cannot outlive it. */
  deleteDocumentsForReport(reportId: string): Promise<void>;

  estimate(): Promise<StorageEstimate>;
  clearUserData(): Promise<void>;
}
