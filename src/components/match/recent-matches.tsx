"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deriveJdTitle } from "@/lib/jd/schema";
import type { MatchReport } from "@/lib/match/types";
import { getStorage } from "@/lib/storage";

/**
 * The matches already run, newest first, each one a way back to its report.
 *
 * Reports live in this browser, so this list is the only index of them: without
 * it a report is reachable only from the link the analysis ended on. The resume
 * and posting are looked up by id and may have been deleted since, in which case
 * the row says so instead of dropping out — the report itself is still readable.
 *
 * A report can be removed one at a time or all at once. Both ask first, and both
 * take the letters, messages and interview prep written from the report with it:
 * those documents are stored against the report and cannot outlive it. The resume
 * and the posting are never touched.
 */

const preview = 5;

interface Row {
  report: MatchReport;
  resumeTitle: string | null;
  jdTitle: string | null;
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

type Pending = { kind: "one"; row: Row } | { kind: "all" };

export function RecentMatches() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storage = getStorage();
      const [reports, resumes, jds] = await Promise.all([
        storage.listReports(),
        storage.listResumes(),
        storage.listJds(),
      ]);
      const resumeTitles = new Map(resumes.map((record) => [record.id, record.title]));
      const jdTitles = new Map(jds.map((record) => [record.id, deriveJdTitle(record.structured, record.title)]));

      return [...reports]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((report) => ({
          report,
          resumeTitle: resumeTitles.get(report.resumeId) ?? null,
          jdTitle: jdTitles.get(report.jdId) ?? null,
        }));
    })()
      .catch(() => [] as Row[])
      .then((next) => {
        if (!cancelled) {
          setRows(next);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete() {
    if (pending === null || rows === null) {
      return;
    }

    const doomed = pending.kind === "all" ? rows : [pending.row];
    setBusy(true);
    setFailed(false);

    try {
      const storage = getStorage();
      for (const { report } of doomed) {
        // The documents first: a report that is gone would leave them unreachable.
        await storage.deleteDocumentsForReport(report.id);
        await storage.deleteReport(report.id);
      }
      const gone = new Set(doomed.map(({ report }) => report.id));
      setRows((current) => current?.filter(({ report }) => !gone.has(report.id)) ?? current);
      setPending(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // Nothing to list is not worth a heading: the workspace above is the first match.
  if (rows === null || rows.length === 0) {
    return null;
  }

  const visible = showAll ? rows : rows.slice(0, preview);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Recent matches</h2>
        <Button
          className="h-11 text-muted-foreground sm:h-8"
          onClick={() => setPending({ kind: "all" })}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden />
          Clear all
        </Button>
      </div>
      {failed && pending === null ? (
        <p className="text-sm text-destructive" role="alert">
          This browser would not let the match be removed. Nothing was deleted.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {visible.map(({ report, resumeTitle, jdTitle }) => (
          <li className="relative" key={report.id}>
            <Link
              className="group flex items-center gap-3 rounded-2xl bg-card p-3 pr-14 ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) transition-[box-shadow] duration-300 hover:shadow-(--shadow-lift) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              href={`/report/${report.id}`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold tabular-nums">
                {formatScore(report.score)}
                <span className="text-[10px] font-medium text-muted-foreground">%</span>
              </span>
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{jdTitle ?? "Job description deleted"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {resumeTitle ?? "Resume deleted"} ·{" "}
                  {new Date(report.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            {/* Centred by the wrapper, not a transform: the button's own hover lift would replace it. */}
            <div className="absolute inset-y-0 right-2 flex items-center">
              <Button
                aria-label={`Delete the match for ${jdTitle ?? "a deleted job description"}`}
                className="size-11 rounded-full text-muted-foreground hover:text-destructive sm:size-9"
                onClick={() => setPending({ kind: "one", row: { report, resumeTitle, jdTitle } })}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length > preview ? (
        <Button
          className="h-11 self-start sm:h-9"
          onClick={() => setShowAll((current) => !current)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
          }
        }}
        open={pending !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "all" ? `Clear all ${rows.length} matches?` : "Delete this match?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "one" ? (
                <>
                  <span className="font-medium text-foreground">{pending.row.jdTitle ?? "This match"}</span>{" "}
                  and its score, evidence, and any letter, message or interview prep written from it are removed from
                  this browser.
                </>
              ) : (
                "Every match report, and every letter, message and interview prep written from them, is removed from this browser."
              )}{" "}
              Your resumes and job descriptions are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {failed ? (
            <p className="text-sm text-destructive" role="alert">
              The browser refused the delete, so nothing was removed. Try again.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} onClick={() => setPending(null)}>
              Keep {pending?.kind === "all" ? "them" : "it"}
            </AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void confirmDelete()} variant="destructive">
              {pending?.kind === "all" ? "Clear all" : "Delete match"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
