"use client";

import { useEffect, useMemo, useState } from "react";

import { changesAgainstBaseline, type ResumeChange } from "@/lib/resume/baseline-diff";
import { getStorage } from "@/lib/storage";
import type { Resume } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * The changes a tailored copy carries against its baseline, live as it is edited.
 * Empty for a baseline, and when the baseline has been deleted (nothing to compare to).
 */
export function useBaselineChanges(record: ResumeRecord | null): ResumeChange[] {
  const baselineId = record?.derivedFromId;
  const [baseline, setBaseline] = useState<Resume | null>(null);

  useEffect(() => {
    if (baselineId === undefined) {
      return;
    }

    let cancelled = false;
    getStorage()
      .getResume(baselineId)
      .then((original) => {
        if (!cancelled) {
          setBaseline(original?.resume ?? null);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [baselineId]);

  return useMemo(
    () =>
      record === null || baselineId === undefined || baseline === null
        ? []
        : changesAgainstBaseline(baseline, record.resume, record.adjustments),
    [baselineId, baseline, record],
  );
}
