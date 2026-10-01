import type { Metadata } from "next";

import { TourLauncher } from "@/components/tour/tour-launcher";
import { MatchWorkspace } from "@/components/match/match-workspace";
import { RecentMatches } from "@/components/match/recent-matches";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Match", "Match a stored resume against a job posting.");

export default function MatchPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="title">Match a resume to a job</h1>
        <TourLauncher />
      </div>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        Pick a resume and a stored posting, then analyse. The model reports which requirements are met and the resume
        text behind each verdict; the percentage is computed from those verdicts by weights in this app.
      </p>
      <MatchWorkspace />
      <RecentMatches />
    </div>
  );
}
