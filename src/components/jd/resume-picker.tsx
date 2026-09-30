"use client";

import Link from "next/link";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <p className="rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) px-4 py-6 text-sm text-muted-foreground">
        No resumes yet. <Link className="underline underline-offset-4 hover:text-foreground" href="/resumes">Add a resume</Link>{" "}
        first, then come back to compare it with a posting.
      </p>
    );
  }

  const items = resumes.map((resume) => ({ value: resume.id, label: deriveResumeTitle(resume.resume) }));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="resume-id">Resume</Label>
      <Select
        items={items}
        onValueChange={(value) => {
          if (typeof value === "string") {
            onSelect(value);
          }
        }}
        value={selectedId}
      >
        <SelectTrigger className="min-h-11 w-full" id="resume-id">
          <SelectValue placeholder="Select a resume" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
