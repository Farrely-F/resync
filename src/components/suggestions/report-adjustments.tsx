"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { SuggestionsPanel } from "@/components/suggestions/suggestions-panel";
import type { MatchReport } from "@/lib/match/types";
import { getStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";
import { reportFreshness, type Freshness } from "@/lib/suggestions/freshness";

/**
 * The report page's adjustments half: the freshness notice, the report itself,
 * and the suggestions section.
 *
 * It sits above `ReportView` rather than inside it because a report's numbers do
 * not change when the resume does. Accepting a suggestion is the moment that
 * becomes true — the stored report still holds the score of the text it was
 * computed from — so the page recomputes the report's input hash from the
 * records it just read and says so, instead of leaving a stale score looking
 * current. The report's own score rendering is untouched.
 */

interface Loaded {
  report: MatchReport | null;
  resume: ResumeRecord | null;
  jd: JdRecord | null;
}

export function ReportAdjustments({ id, children }: { id: string; children: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storage = getStorage();
      const report = await storage.getReport(id);

      if (report === null) {
        if (!cancelled) {
          setLoaded({ report: null, resume: null, jd: null });
          setFreshness(null);
        }

        return;
      }

      const [resume, jd] = await Promise.all([storage.getResume(report.resumeId), storage.getJd(report.jdId)]);
      if (cancelled) {
        return;
      }

      setLoaded({ report, resume, jd });
      setFreshness(await reportFreshness({ report, resume, jd }));
    })().catch(() => {
      if (!cancelled) {
        setLoaded({ report: null, resume: null, jd: null });
        setFreshness(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return (
    <div className="flex flex-col gap-6">
      {freshness === "changed" ? (
        <p className="rounded-xl bg-accent ring-1 ring-primary/15 p-3 text-xs leading-relaxed" role="status">
          The resume or posting behind this report has changed since it was saved, so the numbers below describe the
          earlier version — they are not the score of what is stored now. Analysing the current version produces a new
          report.{" "}
          {loaded?.report === null || loaded?.report === undefined ? null : (
            <Link className="underline underline-offset-4 hover:text-foreground" href={`/match?jd=${loaded.report.jdId}`}>
              Open Match with this posting selected
            </Link>
          )}
        </p>
      ) : null}

      {children}

      {loaded?.report ? (
        <SuggestionsPanel jd={loaded.jd} onResumeChanged={reload} report={loaded.report} resume={loaded.resume} />
      ) : null}
    </div>
  );
}
