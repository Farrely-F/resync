"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";

import { AddResumeForm } from "@/components/resume/add-resume-form";
import { ResumeList } from "@/components/resume/resume-list";
import { getStorage } from "@/lib/storage";
import { deriveJdTitle } from "@/lib/jd/schema";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * Client half of the library page.
 *
 * Records live in IndexedDB, which only exists in the browser, so the list is
 * loaded on mount and re-read from storage after every change. Storage is the
 * source of truth for ordering, so there is no second copy of that rule here.
 */
export function ResumeLibrary() {
  const [records, setRecords] = useState<ResumeRecord[] | null>(null);
  const [jdTitles, setJdTitles] = useState<ReadonlyMap<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rows, jds] = await Promise.all([getStorage().listResumes(), getStorage().listJds()]);
    setJdTitles(new Map(jds.map((jd) => [jd.id, deriveJdTitle(jd.structured, jd.title)])));
    setRecords(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getStorage().listResumes(), getStorage().listJds()])
      .then(([rows, jds]) => {
        if (!cancelled) {
          setJdTitles(new Map(jds.map((jd) => [jd.id, deriveJdTitle(jd.structured, jd.title)])));
          setRecords(rows);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not open the local library.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleted(id: string) {
    try {
      await getStorage().deleteResume(id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete this resume.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AddResumeForm onAdded={() => void refresh()} />

      {error ? (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <section className="flex flex-col gap-3" data-tour="resume-list">
        <h2 className="text-sm font-semibold tracking-tight">Your resumes</h2>
        {records === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Loading your library…
          </p>
        ) : (
          <ResumeList jdTitles={jdTitles} onDeleted={handleDeleted} records={records} />
        )}
      </section>
    </div>
  );
}
