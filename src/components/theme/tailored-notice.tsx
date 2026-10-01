"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdjustmentsList } from "@/components/suggestions/adjustments-list";
import type { ResumeChange } from "@/lib/resume/baseline-diff";
import { deriveJdTitle } from "@/lib/jd/schema";
import { isTailoredCopy, tailoredForLabel } from "@/lib/resume/tailor";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";

/**
 * Says an open resume is a tailored copy, and of what.
 *
 * A copy has the same name as its baseline, so without this the editor gives no
 * sign of which of the two is being changed. It renders nothing for a baseline.
 */
export function TailoredNotice({ record, changes }: { record: ResumeRecord; changes: readonly ResumeChange[] }) {
  const [label, setLabel] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const copy = isTailoredCopy(record);

  useEffect(() => {
    if (!copy) {
      return;
    }

    let cancelled = false;
    const storage = getStorage();

    (async () => {
      const [jd, original] = await Promise.all([
        record.forJdId === undefined ? null : storage.getJd(record.forJdId),
        record.derivedFromId === undefined
          ? null
          : storage.getResume(record.derivedFromId),
      ]);
      if (cancelled) {
        return;
      }

      const titles = new Map(
        jd === null ? [] : [[jd.id, deriveJdTitle(jd.structured, jd.title)]]
      );
      setLabel(tailoredForLabel(record, titles));
      setBaseline(
        original === null ? null : { id: original.id, title: original.title }
      );
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [copy, record.derivedFromId, record.forJdId, record]);

  if (!copy || label === null) {
    return null;
  }


  return (
    <div className="flex flex-col gap-3">
      <p
        className="rounded-xl bg-accent ring-1 ring-primary/15 p-3 text-sm leading-relaxed"
        role="status"
      >
        <span className="font-medium">{label}.</span>{" "}
        {baseline === null ? (
          "The resume it was copied from has been deleted."
        ) : (
          <>
            Changes here do not touch{" "}
            <Link
              className="underline underline-offset-4 hover:text-foreground"
              href={`/resumes/${baseline.id}/edit`}
            >
              {baseline.title}
            </Link>
            , the original.
          </>
        )}
      </p>
      {changes.length === 0 ? null : (
        <section
          aria-label="Changes from the original"
          className="flex flex-col gap-2"
        >
          <h2 className="text-sm font-semibold">Changes from the original</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Added words are highlighted and removed words are struck through.
            The same text is marked &ldquo;Changed for this job&rdquo; in the
            fields below until you edit it.
          </p>
          <AdjustmentsList adjustments={changes} />
        </section>
      )}
    </div>
  );
}
