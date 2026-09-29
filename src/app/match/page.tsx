import type { Metadata } from "next";

import { MatchWorkspace } from "@/components/match/match-workspace";

export const metadata: Metadata = { title: "Match" };

export default function MatchPage() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Match a resume to a job</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Pick a resume and a stored posting, then analyse. The model reports which requirements are met and the resume
        text behind each verdict; the percentage is computed from those verdicts by weights in this app.
      </p>
      <MatchWorkspace />
    </div>
  );
}
