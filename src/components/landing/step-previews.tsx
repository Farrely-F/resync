import { Check, CircleCheck, CircleX, FileText, Target, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The four surfaces the landing page walks through, drawn from the real
 * screens (library, match, report, editor) rather than from abstract filler.
 *
 * They all show one consistent example so the story reads as a single run:
 * the same posting, the same resume, the same 70% that the rubric lines add up
 * to, and the same Terraform gap that step four offers to close.
 */

const exampleScore = 70;

const rubricLines = [
  { label: "Must-have coverage", weight: "60%", detail: "4 of 5", contribution: "+48.0" },
  { label: "Nice-to-have coverage", weight: "25%", detail: "1 of 2", contribution: "+12.5" },
  { label: "Keyword coverage", weight: "15%", detail: "6 of 10", contribution: "+9.0" },
] as const;

const requirements = [
  { text: "Postgres at scale", evidence: "Work · Northwind Systems", covered: true },
  { text: "Go or Rust", evidence: "Work · Northwind Systems", covered: true },
  { text: "Kubernetes in production", evidence: "No evidence found", covered: false },
  { text: "On-call rotation", evidence: "Work · Northwind Systems", covered: true },
] as const;

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Example
        </span>
      </div>
      <div className="flex flex-col gap-3 p-3 sm:p-4">{children}</div>
    </div>
  );
}

function ScoreBadge({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border/70 px-3 py-2", className)}>
      <p className="text-2xl font-semibold tracking-tight">{exampleScore}%</p>
      <p className="text-[11px] text-muted-foreground">Weighted rubric</p>
    </div>
  );
}

export function AddResumePreview() {
  return (
    <PreviewFrame label="Resumes">
      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Senior backend engineer</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">resume.pdf · 2 pages · parsed here</p>
          </div>
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Structured</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {["Work 3", "Education 2", "Skills 18", "Projects 2", "Languages 3"].map((chip) => (
            <li className="rounded-md border border-border/70 px-1.5 py-0.5" key={chip}>
              {chip}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Text extracted</p>
        <pre className="mt-1.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
          {`Northwind Systems — Backend Engineer\n2021 – 2026 · Berlin\n· Ran the Postgres migration for billing`}
        </pre>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The file never leaves the device. Only the extracted text is sent on for structuring.
      </p>
    </PreviewFrame>
  );
}

export function MatchPreview() {
  return (
    <PreviewFrame label="Match">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-md border border-border/70 px-1.5 py-0.5">Senior backend engineer</span>
        <Target aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="rounded-md border border-border/70 px-1.5 py-0.5">Backend engineer · Northwind Systems</span>
      </div>

      <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/70">
        {requirements.map((requirement) => (
          <li className="flex items-start gap-2 px-3 py-2" key={requirement.text}>
            {requirement.covered ? (
              <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-foreground" />
            ) : (
              <CircleX aria-hidden className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <p className="text-xs">{requirement.text}</p>
              <p className="truncate text-[10px] text-muted-foreground">{requirement.evidence}</p>
            </div>
          </li>
        ))}
      </ul>

      <ScoreBadge />
    </PreviewFrame>
  );
}

export function ReportPreview() {
  return (
    <PreviewFrame label="Match report">
      <div className="flex items-end justify-between gap-3">
        <ScoreBadge className="flex-1" />
        <p className="text-[11px] text-muted-foreground">3 rubric lines</p>
      </div>

      <ul className="flex flex-col gap-2">
        {rubricLines.map((line) => (
          <li className="text-[11px]" key={line.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span>{line.label}</span>
              <span className="font-mono text-muted-foreground">
                {line.detail} × {line.weight} = {line.contribution}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/70"
                style={{ width: line.weight }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <X aria-hidden className="size-3.5" />
          Kubernetes in production
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Nothing in Work, Projects or Skills mentions Kubernetes. This is a must-have, so it carries the 60% line.
        </p>
      </div>
    </PreviewFrame>
  );
}

export function EditPreview() {
  return (
    <PreviewFrame label="Edit resume">
      <div className="flex gap-1 text-[11px]">
        <span className="rounded-md px-2 py-0.5 text-muted-foreground">Fields</span>
        <span className="rounded-md bg-muted px-2 py-0.5 font-medium">LaTeX</span>
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <Plus aria-hidden className="size-3.5" />
          Add Terraform to Skills
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Addresses the keyword <span className="font-mono">Terraform</span>, which the posting lists and the resume
          does not.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="rounded-md bg-primary px-2.5 py-1 text-[11px] text-primary-foreground">Accept</span>
          <span className="rounded-md border border-border/70 px-2.5 py-1 text-[11px]">Skip</span>
          <span className="text-[10px] text-muted-foreground">2 more waiting</span>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground">
          {`\\documentclass[11pt]{article}\n\\section*{Experience}\n\\entry{Backend Engineer}{Northwind Systems}\n  \\item Ran the Postgres migration for billing`}
        </pre>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText aria-hidden className="size-3.5" />
        The document is typeset from this source, so what you export is what you read.
      </p>
    </PreviewFrame>
  );
}

export function FactsChecklist() {
  return (
    <ul className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
      {["No account", "Resumes and postings stay in this browser", "Output is LaTeX"].map((fact) => (
        <li className="flex items-center gap-2" key={fact}>
          <Check aria-hidden className="size-4 shrink-0 text-foreground" />
          {fact}
        </li>
      ))}
    </ul>
  );
}
