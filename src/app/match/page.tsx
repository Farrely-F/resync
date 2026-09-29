import type { Metadata } from "next";

import { MatchIntake } from "@/components/jd/match-intake";

export const metadata: Metadata = { title: "Match" };

export default function MatchPage() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Match a resume to a job</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Pick a resume, then paste a job description or its link. The posting is read into structured data and stored in
        this browser; the score and suggested edits come next.
      </p>
      <MatchIntake />
    </div>
  );
}
