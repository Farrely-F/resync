import type { Metadata } from "next";

import { SliceNotice } from "@/components/slice-notice";

export const metadata: Metadata = { title: "Match" };

export default function MatchPage() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Match a resume to a job</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Pick a resume, then paste a job description or its link. You will get a score with its reasoning, the
        requirements you do not cover, and edits you can accept one at a time.
      </p>
      <SliceNotice issue={3}>
        Job description intake, scoring and suggestions land with slices S3, S4 and S5.
      </SliceNotice>
    </div>
  );
}
