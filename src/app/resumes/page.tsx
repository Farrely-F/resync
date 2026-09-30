import type { Metadata } from "next";

import { TourLauncher } from "@/components/tour/tour-launcher";
import { ResumeLibrary } from "@/components/resume/resume-library";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Resumes", "Your resume library. Everything here is stored in this browser.");

export default function ResumesPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="title">Resumes</h1>
          <TourLauncher />
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Every resume you add is parsed in this browser and stored here. Nothing is uploaded: only extracted text is
          sent for structuring.
        </p>
      </div>
      <ResumeLibrary />
    </div>
  );
}
