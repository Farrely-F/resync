"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { scoreCriteria, type RubricResult } from "@/lib/match/rubric";
import type { CriterionKind, MatchReport } from "@/lib/match/types";
import type { ResumeRecord, JdRecord } from "@/lib/storage/types";
import { getStorage } from "@/lib/storage";

/**
 * The report, as a page you can return to.
 *
 * Everything numeric here is recomputed from the criteria stored on the report,
 * so the arithmetic on screen is the arithmetic that produced the score — not a
 * copy that could drift, and not a number the model supplied. The model's prose
 * sits in its own block, labelled as commentary, for the same reason.
 */

const kindLabels: Record<CriterionKind, string> = {
  required: "Required",
  "nice-to-have": "Nice to have",
  seniority: "Seniority",
  domain: "Domain",
  education: "Education",
};

const verdictLabels = { met: "Met", partial: "Partly met", missing: "Missing" } as const;

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

function CriterionRow({ row }: { row: RubricResult["rows"][number] }) {
  const { criterion, weight, credit, earned, counted } = row;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <p className="text-sm font-medium">{criterion.requirement}</p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 text-foreground">{kindLabels[criterion.kind]}</span>
        <span className={criterion.verdict === "missing" ? "text-destructive" : "text-foreground"}>
          {verdictLabels[criterion.verdict]}
        </span>
        <span>
          weight {formatPoints(weight)} × credit {formatPoints(credit)} = {formatPoints(earned)} points
        </span>
        {!counted ? <span>left out of the total: an unmet optional item is not a penalty</span> : null}
      </p>
      {criterion.evidence ? (
        <blockquote className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          {criterion.evidence}
        </blockquote>
      ) : null}
    </li>
  );
}

function CheckRow({ check }: { check: MatchReport["atsChecks"][number] }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border/60 p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${check.passed ? "bg-emerald-500" : "bg-destructive"}`}
        />
        <span>{check.label}</span>
        <span className="text-xs font-normal text-muted-foreground">{check.passed ? "passes" : "fails"}</span>
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
    </li>
  );
}

interface Loaded {
  report: MatchReport | null;
  resume: ResumeRecord | null;
  jd: JdRecord | null;
  failed: string | null;
}

export function ReportView({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storage = getStorage();
      const report = await storage.getReport(id);
      if (cancelled) {
        return;
      }

      if (!report) {
        setLoaded({ report: null, resume: null, jd: null, failed: null });
        return;
      }

      const [resume, jd] = await Promise.all([storage.getResume(report.resumeId), storage.getJd(report.jdId)]);
      if (!cancelled) {
        setLoaded({ report, resume, jd, failed: null });
      }
    })().catch((error: unknown) => {
      if (!cancelled) {
        setLoaded({ report: null, resume: null, jd: null, failed: error instanceof Error ? error.message : "unknown" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loaded === null) {
    return <p className="text-sm text-muted-foreground">Loading the report…</p>;
  }

  if (loaded.failed !== null) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
        This browser would not open its local storage, so the report could not be read ({loaded.failed}).
      </p>
    );
  }

  const { report, resume, jd } = loaded;
  if (report === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          No report with id <span className="font-mono text-foreground">{id}</span> is stored in this browser. Reports
          live in this browser only, so a link from another device or profile will not resolve here.
        </p>
        <Link className="text-sm underline underline-offset-4 hover:text-foreground" href="/match">
          Back to match
        </Link>
      </div>
    );
  }

  const rubric = scoreCriteria(report.criteria);
  const missing = report.criteria.filter((criterion) => criterion.verdict === "missing");
  const drifted = rubric.score !== report.score || rubric.rubricVersion !== report.rubricVersion;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-4xl font-semibold tracking-tight">{formatScore(rubric.score)}%</p>
        <p className="text-sm text-muted-foreground">
          Computed here from {report.criteria.length} criteria by rubric v{rubric.rubricVersion}, not returned by the
          model.
        </p>
        {drifted ? (
          <p className="rounded-lg border border-border/60 p-3 text-xs leading-relaxed text-muted-foreground">
            This report was saved under rubric v{report.rubricVersion} with a score of {formatScore(report.score)}%. The
            weights have changed since, so re-scoring the stored criteria now gives {formatScore(rubric.score)}%. The
            evidence is unchanged.
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">The inputs</h2>
        {resume === null || jd === null ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm leading-relaxed text-muted-foreground">
            The inputs are gone: the{" "}
            {[resume === null ? "resume" : null, jd === null ? "job description" : null]
              .filter((part): part is string => part !== null)
              .join(" and the ")}{" "}
            this report was built from is no longer stored in this browser. Its numbers and evidence are still here, but
            the documents they refer to cannot be opened.{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href="/match">
              Analyse another pair
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link className="underline underline-offset-4 hover:text-foreground" href={`/resumes/${resume.id}/edit`}>
              {resume.title}
            </Link>{" "}
            against{" "}
            <Link className="underline underline-offset-4 hover:text-foreground" href={`/match?jd=${jd.id}`}>
              {jd.title}
            </Link>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Requirements the resume does not cover</h2>
        {missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every criterion the analysis produced is met or partly met.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm leading-relaxed">
            {missing.map((criterion) => (
              <li className="flex gap-2" key={criterion.id}>
                <span aria-hidden className="text-destructive">
                  •
                </span>
                <span>
                  {criterion.requirement}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({kindLabels[criterion.kind]}
                    {criterion.kind === "nice-to-have" ? ", optional — not counted against the score" : ""})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">How the score is made</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          score = 100 × earned ÷ available = 100 × {formatPoints(rubric.earned)} ÷ {formatPoints(rubric.possible)} ={" "}
          {formatScore(rubric.score)}%
        </p>
        <ul className="flex flex-col gap-2">
          {rubric.rows.map((row) => (
            <CriterionRow key={row.criterion.id} row={row} />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Commentary from the model</h2>
        {report.summary === null ? (
          <p className="text-sm text-muted-foreground">The model returned no commentary for this analysis.</p>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm leading-relaxed text-muted-foreground">
            {report.summary}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          This paragraph is the model&apos;s own words. It is not the score, and nothing above is derived from it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Format checks</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Decided from the generated document and the resume&apos;s structure, not by the model. They describe the
          document we would produce, not the behaviour of any one vendor&apos;s parser.
        </p>
        <ul className="flex flex-col gap-2">
          {report.atsChecks.map((check) => (
            <CheckRow check={check} key={check.id} />
          ))}
        </ul>
      </section>

      <footer className="flex flex-col gap-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <p>
          Model {report.model} · mode {report.aiMode} · rubric v{report.rubricVersion} · saved{" "}
          {new Date(report.createdAt).toLocaleString()}
        </p>
        <p className="break-all">Input hash {report.inputHash}</p>
        <p>
          Stored in this browser only.{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/match">
            Back to match
          </Link>
        </p>
      </footer>
    </article>
  );
}
