"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash } from "lucide-react";

import { ManualModeBadge } from "@/components/latex-editor/manual-mode-badge";
import { DeleteResumeConfirm } from "@/components/resume/delete-resume-confirm";
import { Button } from "@/components/ui/button";
import { formatUpdatedAt, sectionLabels, sectionsWithContent } from "@/lib/resume/library";
import { isTailoredCopy, tailoredForLabel } from "@/lib/resume/tailor";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * The stored library, newest first, with the sections each resume actually fills.
 *
 * A tailored copy is listed under the baseline it was made from, so ten matches
 * do not read as ten unrelated resumes. A copy whose baseline has been deleted is
 * still a resume the reader owns, so it is listed on its own and says so.
 */
export function ResumeList({
  records,
  jdTitles,
  onDeleted,
}: {
  records: ResumeRecord[];
  /** Posting titles by id, for the "Tailored for" label; a deleted posting has none. */
  jdTitles: ReadonlyMap<string, string>;
  onDeleted: (id: string) => Promise<void>;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <p className="rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) px-4 py-6 text-sm text-muted-foreground">
        No resumes yet.
      </p>
    );
  }

  const ids = new Set(records.map((record) => record.id));
  const copiesOf = (id: string) => records.filter((record) => record.derivedFromId === id);
  const topLevel = records.filter((record) => !isTailoredCopy(record) || !ids.has(record.derivedFromId ?? ""));

  function tailoredLabel(record: ResumeRecord, orphan: boolean): string | null {
    const label = tailoredForLabel(record, jdTitles);
    return label === null ? null : `${label}${orphan ? " · original resume deleted" : ""}`;
  }

  function row(record: ResumeRecord, options: { nested: boolean; orphan: boolean }) {
    const sections = sectionsWithContent(record.resume);
    const label = tailoredLabel(record, options.orphan);
    const copies = options.nested ? [] : copiesOf(record.id);

    return (
      <li className={options.nested ? "py-3 pl-4" : "p-4"} key={record.id}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link className="font-medium underline-offset-4 hover:underline" href={`/resumes/${record.id}/edit`}>
                {record.title}
              </Link>
              {label === null ? null : (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">{label}</span>
              )}
              {record.mode === "manual" ? <ManualModeBadge /> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Updated {formatUpdatedAt(record.updatedAt)}</p>
            {options.nested ? null : (
              <p className="mt-2 text-xs text-muted-foreground">
                {sections.length > 0
                  ? `Sections with content: ${sections.map((id) => sectionLabels[id]).join(", ")}`
                  : "No sections have content yet."}
              </p>
            )}
          </div>
          <Button
            aria-label={`Delete ${record.title}${label === null ? "" : `, ${label}`}`}
            className="size-11 shrink-0"
            disabled={busyId === record.id}
            onClick={() => setConfirmingId(record.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash aria-hidden />
          </Button>
        </div>

        {copies.length > 0 ? (
          <ul className="mt-3 divide-y divide-border/60 border-l-2 border-border/60">
            {copies.map((copy) => row(copy, { nested: true, orphan: false }))}
          </ul>
        ) : null}

        {confirmingId === record.id ? (
          <DeleteResumeConfirm
            busy={busyId === record.id}
            copies={copies.length}
            onCancel={() => setConfirmingId(null)}
            onConfirm={() => {
              setBusyId(record.id);
              void onDeleted(record.id).finally(() => {
                setBusyId(null);
                setConfirmingId(null);
              });
            }}
            title={record.title}
          />
        ) : null}
      </li>
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest)">
      {topLevel.map((record) => row(record, { nested: false, orphan: isTailoredCopy(record) }))}
    </ul>
  );
}
