import type { Metadata } from "next";
import Link from "next/link";

import { CoverLetterPanel } from "@/components/documents/cover-letter-panel";
import { InterviewPrepPanel } from "@/components/documents/interview-prep-panel";
import { OutreachPanel } from "@/components/documents/outreach-panel";

export const metadata: Metadata = { title: "Prepare" };

/**
 * The documents a match leads to: a letter, a message, and the interview.
 *
 * All three are written from the same evidence — the resume, the posting and the
 * report — which is why they share a page: the analysis found what the resume does
 * not cover, and these are the things a reader does about it. Each panel writes on
 * demand, stores what it wrote in this browser, and keeps the reader's own edits
 * distinct from the model's text.
 */
export default async function PreparePage({ params }: PageProps<"/report/[id]/prepare">) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href={`/report/${id}`}>
            Match report
          </Link>{" "}
          / <span className="font-mono">{id}</span>
        </p>
        <h1 className="title">Prepare</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Everything here is written from the same evidence the report was: your resume, the posting, and the verdicts
          the analysis reached. That is the point of starting from a report — a letter can answer the gaps instead of
          repeating the posting. Each document is written on demand and stored in this browser.
        </p>
      </div>

      <CoverLetterPanel reportId={id} />
      <OutreachPanel reportId={id} />
      <InterviewPrepPanel reportId={id} />
    </div>
  );
}
