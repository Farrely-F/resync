import type { Jd } from "@/lib/jd/schema";
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

  estimate(): Promise<StorageEstimate>;
  clearUserData(): Promise<void>;
}
