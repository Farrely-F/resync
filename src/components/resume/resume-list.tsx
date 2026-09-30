"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash } from "lucide-react";

import { ManualModeBadge } from "@/components/latex-editor/manual-mode-badge";
import { DeleteResumeConfirm } from "@/components/resume/delete-resume-confirm";
import { Button } from "@/components/ui/button";
import { formatUpdatedAt, sectionLabels, sectionsWithContent } from "@/lib/resume/library";
import type { ResumeRecord } from "@/lib/storage/types";

/** The stored library, newest first, with the sections each resume actually fills. */
export function ResumeList({
  records,
  onDeleted,
}: {
  records: ResumeRecord[];
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

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest)">
      {records.map((record) => {
        const sections = sectionsWithContent(record.resume);

        return (
          <li className="p-4" key={record.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    href={`/resumes/${record.id}/edit`}
                  >
                    {record.title}
                  </Link>
                  {record.mode === "manual" ? <ManualModeBadge /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Updated {formatUpdatedAt(record.updatedAt)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {sections.length > 0
                    ? `Sections with content: ${sections.map((id) => sectionLabels[id]).join(", ")}`
                    : "No sections have content yet."}
                </p>
              </div>
              <Button
                aria-label={`Delete ${record.title}`}
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

            {confirmingId === record.id ? (
              <DeleteResumeConfirm
                busy={busyId === record.id}
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
      })}
    </ul>
  );
}
