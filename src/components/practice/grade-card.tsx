"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";

import { scoreBand, dimensionLabels, deliveryBase, hedgeDeduction } from "@/lib/practice/rubric";
import { turnScores, type Turn } from "@/lib/practice/session";
import type { Verdict } from "@/lib/practice/grade";
import { cn } from "@/lib/utils";

/**
 * What the interviewer made of one answer.
 *
 * The score and the confidence are computed here from the model's categorical
 * judgements and the answer's own wording, and the arithmetic is one click away —
 * the same stance as the match report. Nothing on this card is a number the model
 * supplied.
 */

const verdictStyle: Record<Verdict, { dot: string; word: string }> = {
  strong: { dot: "bg-emerald-500", word: "Strong" },
  adequate: { dot: "bg-amber-500", word: "Adequate" },
  weak: { dot: "bg-destructive", word: "Weak" },
  "not-applicable": { dot: "bg-muted-foreground/40", word: "Not applicable" },
};

function Disclosure({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl bg-background ring-1 ring-foreground/[0.07]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-3 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="size-3.5 transition-transform duration-200 group-open:rotate-90" />
        {summary}
      </summary>
      <div className="px-3 pb-3 text-xs leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

export function GradeCard({ turn }: { turn: Turn }) {
  const scores = turnScores(turn);
  const { grade } = turn;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-(--ease-out-expo)">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">Answer</span>
          <span className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{scores.score}</span>
            <span className="text-sm font-medium">{scoreBand(scores.score)}</span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">Confidence in the wording</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">{scores.confidence}</span>
        </div>
      </div>

      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {scores.rows.map((row) => (
          <li className="flex items-center gap-2 text-xs" key={row.dimension} title={dimensionLabels[row.dimension].hint}>
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", verdictStyle[row.verdict].dot)} />
            <span className="min-w-0 flex-1">{dimensionLabels[row.dimension].label}</span>
            <span className="text-muted-foreground">{verdictStyle[row.verdict].word}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed">{grade.feedback}</p>

      {grade.unsupportedClaims.length === 0 ? null : (
        <div className="flex flex-col gap-1.5 rounded-xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-3" role="note">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle aria-hidden className="size-3.5 text-destructive" />
            Not on your resume
          </p>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed">
            {grade.unsupportedClaims.map((claim) => (
              <li key={claim}>&ldquo;{claim}&rdquo;</li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">
            An interviewer can ask for the detail. Either add it to your resume if it is true, or leave it out.
          </p>
        </div>
      )}

      <Disclosure summary="A stronger answer">
        <p className="whitespace-pre-line">{grade.strongerAnswer}</p>
      </Disclosure>

      <Disclosure summary="How these numbers are made">
        <div className="flex flex-col gap-2">
          <p>
            Score = 100 × earned ÷ available = 100 × {scores.earned} ÷ {scores.possible} = {scores.score}. Each line is
            weight × credit (strong 1, adequate 0.5, weak 0); a line that did not apply is left out rather than scored zero.
          </p>
          <ul className="flex flex-col gap-0.5">
            {scores.rows.map((row) => (
              <li key={row.dimension}>
                {dimensionLabels[row.dimension].label}:{" "}
                {row.counted ? `${row.weight} × ${row.credit} = ${row.earned}` : "left out"}
              </li>
            ))}
          </ul>
          <p>
            Confidence starts at {scores.base} for wording rated &ldquo;{grade.delivery}&rdquo; (the scale is{" "}
            {Object.entries(deliveryBase)
              .map(([name, value]) => `${name} ${value}`)
              .join(", ")}
            ), minus {hedgeDeduction} for each hedge such as &ldquo;I think&rdquo; or &ldquo;maybe&rdquo; — {scores.hedges}{" "}
            found — giving {scores.confidence}. It is read from typed text only: it says nothing about voice, pace or
            presence.
          </p>
        </div>
      </Disclosure>
    </div>
  );
}
