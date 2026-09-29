import type { Metadata } from "next";

import { SliceNotice } from "@/components/slice-notice";

export const metadata: Metadata = { title: "Edit resume" };

export default async function EditResumePage({ params }: PageProps<"/resumes/[id]/edit">) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-2 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Edit resume</h1>
      <p className="text-sm text-muted-foreground">
        Resume <span className="font-mono text-foreground">{id}</span>
      </p>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Two ways in: structured fields for everyday edits, and the generated LaTeX when you want direct control.
        Editing the LaTeX marks this resume as manual and stops it being rewritten from data.
      </p>
      <SliceNotice issue={9}>
        Structured editing, themes and the LaTeX surface land with slices S6, S8 and S9.
      </SliceNotice>
    </div>
  );
}
