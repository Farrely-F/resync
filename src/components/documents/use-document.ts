"use client";

import { useCallback, useEffect, useState } from "react";

import { AiFailureError, isAiFailureKind, toRequestFailure, type AiFailureKind } from "@/lib/ai/failures";
import { documentWaitMs, isDocumentFailure, type DocumentResponse } from "@/lib/documents/api";
import { documentId, type DocumentKind, type DocumentRecord } from "@/lib/documents/types";
import { findTailoredCopy } from "@/lib/resume/tailor";
import { getStorage } from "@/lib/storage";

/**
 * One document, from storage or from the model.
 *
 * The report is the input and the record: the hook reads it for the resume and the
 * posting it names, sends all three to the route, and writes the answer back to
 * this browser. So a panel only has to say *what* it wants written; the evidence,
 * the failure vocabulary and the persistence are the same for every kind.
 *
 * Regenerating replaces the document rather than adding a second one — one
 * document per kind per report — which is why the record id is derived and not
 * minted. The reader's own edits are a separate field, so "the model wrote this"
 * and "I changed it" never collapse into one.
 */

export type DocumentStatus = "loading" | "empty" | "ready" | "generating" | "failed";

export interface DocumentState {
  status: DocumentStatus;
  document: DocumentRecord | null;
  /** Why the last attempt failed, in the words the route used. */
  error: string | null;
  failureKind: AiFailureKind | null;
  /** True when the report this document belongs to is no longer stored. */
  reportMissing: boolean;
  generate: () => void;
  /** Stores the reader's own text; only meaningful for a prose document. */
  save: (text: string) => void;
  remove: () => void;
}

type WriteOutcome =
  | { ok: true; record: DocumentRecord }
  | { ok: false; reason: "report-missing" }
  | { ok: false; failure: AiFailureError };

/**
 * The whole write, outside React: read the evidence the report names, ask the
 * route, store what comes back.
 *
 * It is a plain function rather than the body of a callback because none of it is
 * state — the hook's job is to put the result on screen, and keeping the two apart
 * is what lets this be read as one sequence.
 */
async function writeDocumentRecord(reportId: string, kind: DocumentKind): Promise<WriteOutcome> {
  const storage = getStorage();
  const report = await storage.getReport(reportId);

  if (report === null) {
    return { ok: false, reason: "report-missing" };
  }

  const [baselineRecord, jdRecord, allResumes] = await Promise.all([
    storage.getResume(report.resumeId),
    storage.getJd(report.jdId),
    storage.listResumes(),
  ]);
  // Written from the tailored copy when accepted adjustments made one: that is the
  // resume the reader will send. The report's evidence is still the baseline's.
  // The copy is looked up by id, not through the baseline: it outlives a deleted original.
  const resumeRecord = findTailoredCopy(allResumes, report.resumeId, report.jdId) ?? baselineRecord;

  if (resumeRecord === null || jdRecord === null) {
    return { ok: false, reason: "report-missing" };
  }

  // The first write decides when the document was created; regenerating keeps it.
  const existing = await storage.getDocument(documentId(reportId, kind));
  const now = new Date().toISOString();

  let response: Response;
  try {
    response = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        resume: resumeRecord.resume,
        jd: jdRecord.structured,
        criteria: report.criteria,
        summary: report.summary,
      }),
      signal: AbortSignal.timeout(documentWaitMs),
    });
  } catch (error) {
    return { ok: false, failure: toRequestFailure(error) };
  }

  const payload = (await response.json().catch(() => null)) as DocumentResponse | null;

  if (!response.ok || payload === null || isDocumentFailure(payload)) {
    const failure =
      payload !== null && isDocumentFailure(payload)
        ? new AiFailureError(
            isAiFailureKind(payload.error.kind) ? payload.error.kind : "unknown",
            payload.error.message,
            { retryAfterSeconds: payload.error.retryAfterSeconds ?? null },
          )
        : toRequestFailure(new Error(`The server answered ${response.status}.`));

    return { ok: false, failure };
  }

  const record: DocumentRecord = {
    id: documentId(reportId, kind),
    reportId,
    kind,
    content: payload.content,
    // A fresh answer replaces any edits: they belonged to the previous text.
    editedText: null,
    model: payload.model,
    aiMode: payload.aiMode,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.putDocument(record);

  return { ok: true, record };
}

export function useDocument(reportId: string, kind: DocumentKind): DocumentState {
  const [status, setStatus] = useState<DocumentStatus>("loading");
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failureKind, setFailureKind] = useState<AiFailureKind | null>(null);
  const [reportMissing, setReportMissing] = useState(false);
  const id = documentId(reportId, kind);

  useEffect(() => {
    let cancelled = false;

    getStorage()
      .getDocument(id)
      .then(
        (stored) => {
          if (cancelled) {
            return;
          }
          setDocument(stored);
          setStatus(stored === null ? "empty" : "ready");
        },
        () => {
          if (!cancelled) {
            setStatus("empty");
          }
        },
      );

    return () => {
      cancelled = true;
    };
  }, [id]);

  const generate = useCallback(() => {
    setStatus("generating");
    setError(null);
    setFailureKind(null);

    void writeDocumentRecord(reportId, kind).then(
      (outcome) => {
        if (outcome.ok) {
          setDocument(outcome.record);
          setStatus("ready");
          return;
        }

        if ("reason" in outcome) {
          setReportMissing(true);
          setStatus("empty");
          return;
        }

        setError(outcome.failure.message);
        setFailureKind(outcome.failure.kind);
        setStatus("failed");
      },
      (caught: unknown) => {
        // Only a storage failure reaches here: the fetch is handled inside.
        const failure = toRequestFailure(caught);
        setError(failure.message);
        setFailureKind(failure.kind);
        setStatus("failed");
      },
    );
  }, [kind, reportId]);

  const save = useCallback(
    (text: string) => {
      if (document === null) {
        return;
      }

      const next: DocumentRecord = { ...document, editedText: text, updatedAt: new Date().toISOString() };
      setDocument(next);
      void getStorage().putDocument(next);
    },
    [document],
  );

  const remove = useCallback(() => {
    setDocument(null);
    setStatus("empty");
    setError(null);
    setFailureKind(null);
    void getStorage().deleteDocument(id);
  }, [id]);

  return { status, document, error, failureKind, reportMissing, generate, save, remove };
}
