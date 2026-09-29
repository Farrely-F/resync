import type { Metadata } from "next";

import { SliceNotice } from "@/components/slice-notice";

export const metadata: Metadata = { title: "Resumes" };

export default function ResumesPage() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Resumes</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Every resume you add is parsed in this browser and stored here. Nothing is uploaded: only extracted text is
        sent for structuring.
      </p>
      <p className="mt-6 rounded-lg border border-border/60 px-4 py-6 text-sm text-muted-foreground">
        No resumes yet.
      </p>
      <SliceNotice issue={2}>Resume upload, parsing and the library land with slice S2.</SliceNotice>
    </div>
  );
}
