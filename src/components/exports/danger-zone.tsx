"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";

import { jsonBytes, type StorageBreakdown } from "@/components/exports/accounting";
import {
  clearAllPhrase,
  idleConfirmation,
  isConfirming,
  phraseSatisfied,
  step,
  type ConfirmationEvent,
  type ConfirmationState,
  type DeleteTarget,
} from "@/components/exports/confirmation";
import { describeClearAll, describeDeletion, type ClearAllFacts } from "@/components/exports/messages";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { engineAssetTotalBytes, formatBytes } from "@/lib/compile/assets";
import { deriveResumeTitle } from "@/lib/resume/schema";
import { getStorage } from "@/lib/storage";
import type { MatchReport } from "@/lib/match/types";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * Every destructive action in Settings, in one place, each behind its own prompt.
 *
 * The prompt is driven by `confirmation.ts`, so a card can only be removed by a
 * `confirm` event: dismissing a prompt, or opening another one, performs nothing
 * by construction. The wording of each prompt names the record, its measured size
 * and what else is affected — a report is not deleted by deleting its resume, and
 * a prompt that hid that would be a lie about what the button does.
 */

type RecordKindTarget = { kind: "resume" | "jd" | "report"; id: string };

const deleteActions = {
  resume: (id: string) => getStorage().deleteResume(id),
  jd: (id: string) => getStorage().deleteJd(id),
  report: (id: string) => getStorage().deleteReport(id),
};

function RecordItem({
  label,
  meta,
  message,
  confirmLabel,
  busy,
  confirming,
  onRequest,
  onCancel,
  onConfirm,
}: {
  label: string;
  meta: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  confirming: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium break-words">{label}</span>
          <span className="text-xs text-muted-foreground">{meta}</span>
        </div>
        {confirming ? null : (
          <Button className="h-11 sm:h-9" disabled={busy} onClick={onRequest} size="sm" type="button" variant="ghost">
            Delete
          </Button>
        )}
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !busy) {
            onCancel();
          }
        }}
        open={confirming}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} onClick={onCancel}>
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={onConfirm} variant="destructive">
              {busy ? "Deleting…" : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function ClearAllConfirm({
  state,
  facts,
  busy,
  onType,
  onCancel,
  onConfirm,
}: {
  state: ConfirmationState;
  facts: ClearAllFacts & { engineCacheBytes: number };
  busy: boolean;
  onType: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const allowed = phraseSatisfied(state);

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open && !busy) {
          onCancel();
        }
      }}
      open
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all user data?</AlertDialogTitle>
          <AlertDialogDescription>{describeClearAll(facts)}</AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-xs leading-relaxed text-muted-foreground">
          The TeX engine cache is a separate action and is not touched by this one; it holds up to{" "}
          {formatBytes(facts.engineCacheBytes)}. That download is repeatable, which is why it does not need the typed
          phrase.
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="clear-all-phrase">
            Type <span className="font-mono text-foreground">{clearAllPhrase}</span> to confirm
          </Label>
          <Input
            autoComplete="off"
            className="h-11 font-mono"
            id="clear-all-phrase"
            onChange={(event) => onType(event.target.value)}
            value={state.typed}
          />
        </div>

        {state.rejected ? (
          <p className="flex items-start gap-2 text-xs text-destructive" role="alert">
            <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>That does not match, so nothing was deleted.</span>
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction disabled={busy || !allowed} onClick={onConfirm} variant="destructive">
            {busy ? "Deleting…" : "Delete everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DangerZone({
  resumes,
  jds,
  reports,
  breakdown,
  onChanged,
}: {
  resumes: ResumeRecord[];
  jds: JdRecord[];
  reports: MatchReport[];
  breakdown: StorageBreakdown;
  onChanged: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState<ConfirmationState>(idleConfirmation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumeTitles: Record<string, string> = {};
  for (const record of resumes) {
    resumeTitles[record.id] = deriveResumeTitle(record.resume);
  }

  const jdTitles: Record<string, string> = {};
  for (const record of jds) {
    jdTitles[record.id] = record.title || "Untitled job";
  }

  function edit(event: ConfirmationEvent) {
    const next = step(confirmation, event);
    setConfirmation(next.state);
    if (next.effect) {
      void remove(next.effect);
    }
  }

  async function remove(target: DeleteTarget) {
    setBusy(true);
    setError(null);

    try {
      if (target.kind === "clear-all") {
        await getStorage().clearUserData();
      } else {
        await deleteActions[target.kind](target.id);
      }
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That could not be deleted from this browser.");
    } finally {
      setBusy(false);
    }
  }

  const emptyResumes = resumes.length === 0;
  const emptyJds = jds.length === 0;
  const emptyReports = reports.length === 0;

  return (
    <section aria-labelledby="danger-heading" className="flex flex-col gap-4" data-tour="settings-danger">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight" id="danger-heading">
          Delete
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each deletion below is permanent and shows what it removes before it runs. Deleting a resume or a posting
          leaves the match reports built from it in place, because those are separate records.
        </p>
      </div>

      {error ? (
        <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Resumes ({resumes.length})</h3>
        {emptyResumes ? (
          <p className="text-sm text-muted-foreground">No resumes are stored, so there is nothing to delete here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {resumes.map((record) => {
              const target: RecordKindTarget = { kind: "resume", id: record.id };
              const dependents = reports.filter((report) => report.resumeId === record.id).length;

              return (
                <RecordItem
                  busy={busy}
                  confirmLabel="Delete resume"
                  confirming={isConfirming(confirmation, target)}
                  key={record.id}
                  label={deriveResumeTitle(record.resume)}
                  message={describeDeletion("resume", deriveResumeTitle(record.resume), {
                    bytes: jsonBytes(record),
                    dependentReports: dependents,
                  })}
                  meta={`${formatBytes(jsonBytes(record))} · ${record.mode === "manual" ? "hand-edited LaTeX" : "generated LaTeX"} · updated ${record.updatedAt.slice(0, 10)}`}
                  onCancel={() => edit({ type: "cancel" })}
                  onConfirm={() => edit({ type: "confirm" })}
                  onRequest={() => edit({ type: "request", target })}
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Job descriptions ({jds.length})</h3>
        {emptyJds ? (
          <p className="text-sm text-muted-foreground">
            No job descriptions are stored, so there is nothing to delete here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jds.map((record) => {
              const target: RecordKindTarget = { kind: "jd", id: record.id };
              const title = record.title || "Untitled job";
              const dependents = reports.filter((report) => report.jdId === record.id).length;

              return (
                <RecordItem
                  busy={busy}
                  confirmLabel="Delete posting"
                  confirming={isConfirming(confirmation, target)}
                  key={record.id}
                  label={title}
                  message={describeDeletion("jd", title, { bytes: jsonBytes(record), dependentReports: dependents })}
                  meta={`${record.company ?? "No company"} · ${formatBytes(jsonBytes(record))} · updated ${record.updatedAt.slice(0, 10)}`}
                  onCancel={() => edit({ type: "cancel" })}
                  onConfirm={() => edit({ type: "confirm" })}
                  onRequest={() => edit({ type: "request", target })}
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Match reports ({reports.length})</h3>
        {emptyReports ? (
          <p className="text-sm text-muted-foreground">No match reports are stored, so there is nothing to delete here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reports.map((report) => {
              const target: RecordKindTarget = { kind: "report", id: report.id };
              const label = `Report ${report.id.slice(0, 8)}`;
              const pair = `${resumeTitles[report.resumeId] ?? "a deleted resume"} × ${
                jdTitles[report.jdId] ?? "a deleted posting"
              }`;

              return (
                <RecordItem
                  busy={busy}
                  confirmLabel="Delete report"
                  confirming={isConfirming(confirmation, target)}
                  key={report.id}
                  label={label}
                  message={describeDeletion("report", label, { bytes: jsonBytes(report), dependentReports: 0 })}
                  meta={`${pair} · score ${report.score} · ${formatBytes(jsonBytes(report))} · ${report.createdAt.slice(0, 10)}`}
                  onCancel={() => edit({ type: "cancel" })}
                  onConfirm={() => edit({ type: "confirm" })}
                  onRequest={() => edit({ type: "request", target })}
                />
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Clear all user data</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Deletes the IndexedDB database resync owns: every resume, job description and match report on this device.
            It does not touch the cached TeX engine, and it cannot be undone.
          </p>
        </div>

        {isConfirming(confirmation, { kind: "clear-all" }) ? (
          <ClearAllConfirm
            busy={busy}
            facts={{
              resumes: breakdown.resumes.count,
              jds: breakdown.jds.count,
              reports: breakdown.reports.count,
              bytes: breakdown.totalBytes,
              engineCacheBytes: engineAssetTotalBytes,
            }}
            onCancel={() => edit({ type: "cancel" })}
            onConfirm={() => edit({ type: "confirm" })}
            onType={(value) => edit({ type: "type", value })}
            state={confirmation}
          />
        ) : (
          <>
            <div>
              <Button
                className="h-11"
                disabled={busy || breakdown.totalRecords === 0}
                onClick={() => edit({ type: "request", target: { kind: "clear-all" } })}
                type="button"
                variant="destructive"
              >
                Clear all user data ({breakdown.totalRecords})
              </Button>
            </div>
            {breakdown.totalRecords === 0 ? (
              <p className="text-xs text-muted-foreground" role="status">
                Nothing is stored, so there is nothing to clear.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
