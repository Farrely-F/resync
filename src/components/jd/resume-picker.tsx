"use client";

import Link from "next/link";

import { deriveResumeTitle } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/storage/types";

interface ResumePickerProps {
  resumes: ResumeRecord[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ResumePicker({ resumes, loading, selectedId, onSelect }: ResumePickerProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your resumes…</p>;
  }

  if (resumes.length === 0) {
    return (
      <p className="rounded-lg border border-border/60 px-4 py-6 text-sm text-muted-foreground">
        No resumes yet. <Link className="underline underline-offset-4 hover:text-foreground" href="/resumes">Add a resume</Link>{" "}
        first, then come back to compare it with a posting.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="resume-id">
        Resume
      </label>
      <select
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        id="resume-id"
        onChange={(event) => onSelect(event.target.value)}
        value={selectedId ?? ""}
      >
        <option disabled value="">
          Select a resume
        </option>
        {resumes.map((resume) => (
          <option key={resume.id} value={resume.id}>
            {deriveResumeTitle(resume.resume)}
          </option>
        ))}
      </select>
    </div>
  );
}
