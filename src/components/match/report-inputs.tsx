"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, FileText } from "lucide-react";

import { deriveJdTitle } from "@/lib/jd/schema";
import type { MatchReport } from "@/lib/match/types";
import { getStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * What a report was built from: the resume and the posting, with the model and
 * the score they produced.
 *
 * The prepare page writes documents from these two inputs, so it says which they
 * are — a letter written from the wrong resume is worth catching before it is
 * sent. Either record can have been deleted since the analysis; the report keeps
 * only their ids, so that is said plainly rather than shown as an empty card.
 */

type Loaded =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "missing" }
  | { status: "ready"; report: MatchReport; resume: ResumeRecord | null; jd: JdRecord | null };

function Gone({ what }: { what: string }) {
  return <p className="text-sm text-muted-foreground">The {what} is no longer stored in this browser.</p>;
}

function InputCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-card p-4 ring-1 ring-foreground/[0.07] shadow-(--shadow-rest)">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

export function ReportInputs({ reportId }: { reportId: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storage = getStorage();
      const report = await storage.getReport(reportId);
      if (report === null) {
        return { status: "missing" } as const;
      }

      const [resume, jd] = await Promise.all([storage.getResume(report.resumeId), storage.getJd(report.jdId)]);
      return { status: "ready", report, resume, jd } as const;
    })()
      .catch(() => ({ status: "failed" }) as const)
      .then((next) => {
        if (!cancelled) {
          setLoaded(next);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (loaded.status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading the inputs…</p>;
  }

  if (loaded.status !== "ready") {
    return (
      <p className="text-sm text-muted-foreground">
        {loaded.status === "missing"
          ? "This report is not stored in this browser, so there is nothing to write from."
          : "This browser would not open its local storage, so the inputs could not be read."}
      </p>
    );
  }

  const { report, resume, jd } = loaded;
  const jdFacts = jd === null ? [] : [jd.structured.seniority, jd.structured.location].filter(Boolean);

  return (
    <section aria-label="What this is written from" className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <InputCard icon={<FileText aria-hidden />} label="Resume">
          {resume === null ? (
            <Gone what="resume" />
          ) : (
            <>
              <Link
                className="truncate text-sm font-medium underline-offset-4 hover:underline"
                href={`/resumes/${resume.id}/edit`}
              >
                {resume.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {resume.mode === "manual" ? "Hand-edited LaTeX" : "Generated from its fields"}
              </p>
            </>
          )}
        </InputCard>

        <InputCard icon={<Briefcase aria-hidden />} label="Job description">
          {jd === null ? (
            <Gone what="job description" />
          ) : (
            <>
              <Link
                className="truncate text-sm font-medium underline-offset-4 hover:underline"
                href={`/match?jd=${encodeURIComponent(jd.id)}`}
              >
                {deriveJdTitle(jd.structured, jd.title)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {jdFacts.length > 0 ? jdFacts.join(" · ") : "No seniority or location in the posting"}
              </p>
            </>
          )}
        </InputCard>
      </div>

      <p className="text-xs text-muted-foreground">
        From the match report scored {Number.isInteger(report.score) ? report.score : report.score.toFixed(1)}%, run{" "}
        {new Date(report.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} with{" "}
        <span className="font-mono">{report.model}</span> ({report.aiMode === "mock" ? "mock mode" : "live"}).
      </p>
    </section>
  );
}
