import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The hero, drawn in CSS.
 *
 * It is the first thing rendered and the only thing shown when the WebGL gate
 * says no — no JavaScript, no WebGL context, a constrained device, a metered
 * connection or a reduced-motion preference. It tells the same story as the
 * scene (a resume page, a set of requirements, one highlighted line, a score)
 * and plays it once on load: the line is found, requirements tick in, the
 * score counts up. Reduced motion gets the finished frame.
 */

const requirements = [
  { text: "Postgres at scale", covered: true },
  { text: "Go or Rust", covered: true },
  { text: "Kubernetes", covered: false },
  { text: "On-call", covered: true },
] as const;

const step = (n: number) => ({ animationDelay: `${0.5 + n * 0.22}s` });

export function HeroFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-8">
      <div className="relative grid w-full max-w-[470px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-6">
        {/* the resume page, two sheets deep */}
        <div className="relative" style={{ ["--r" as string]: "1.5deg" }}>
          <div className="absolute -left-2 -top-2 size-full rotate-[-5deg] rounded-2xl bg-card shadow-(--shadow-rest) ring-1 ring-foreground/[0.06]" />
          <div
            className="relative animate-[bob_7s_ease-in-out_infinite] rounded-2xl bg-card p-4 shadow-(--shadow-float) ring-1 ring-foreground/[0.07] motion-reduce:animate-none"
            style={{ ["--r" as string]: "1.5deg" }}
          >
            <div className="h-2.5 w-28 rounded-full bg-foreground/80" />
            <div className="mt-4 flex flex-col gap-2">
              <div className="h-1.5 w-full rounded-full bg-foreground/[0.12]" />
              <div className="h-1.5 w-[86%] rounded-full bg-foreground/[0.12]" />
              <div className="h-1.5 w-[92%] rounded-full bg-foreground/[0.12]" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="h-1.5 w-16 rounded-full bg-foreground/[0.12]" />
              {/* the line the match rests on — a highlighter sweeps across it */}
              <div className="relative">
                <div className="h-1.5 w-full rounded-full bg-foreground/[0.12]" />
                <div
                  className="absolute inset-y-[-3px] left-[-4px] right-[-4px] origin-left animate-[sweep_0.9s_var(--ease-out-expo)_both] rounded-md bg-primary/25 ring-1 ring-primary/40 motion-reduce:animate-none"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
              <div className="h-1.5 w-[74%] rounded-full bg-foreground/[0.12]" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="h-1.5 w-[88%] rounded-full bg-foreground/[0.12]" />
              <div className="h-1.5 w-[60%] rounded-full bg-foreground/[0.12]" />
            </div>
          </div>
        </div>

        {/* the requirements, ticked off one by one */}
        <div className="flex w-[150px] flex-col gap-2 sm:w-[170px]">
          {requirements.map((row, index) => (
            <div
              className="flex animate-[rise_0.7s_var(--ease-out-expo)_both] items-center gap-2 rounded-xl bg-card/90 px-2.5 py-2 text-[11px] font-medium leading-tight shadow-(--shadow-rest) ring-1 ring-foreground/[0.07] backdrop-blur motion-reduce:animate-none"
              key={row.text}
              style={step(index)}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 animate-[pop_0.5s_var(--ease-spring)_both] place-items-center rounded-full motion-reduce:animate-none",
                  row.covered ? "bg-primary text-primary-foreground" : "bg-destructive/15 text-destructive",
                )}
                style={{ animationDelay: `${0.8 + index * 0.22}s` }}
              >
                {row.covered ? <Check aria-hidden className="size-2.5" strokeWidth={3.5} /> : <X aria-hidden className="size-2.5" strokeWidth={3.5} />}
              </span>
              <span className="truncate">{row.text}</span>
            </div>
          ))}
          <div
            className="mt-1 flex animate-[rise_0.8s_var(--ease-out-expo)_both] items-baseline justify-between rounded-2xl bg-foreground px-3 py-2 text-background shadow-(--shadow-lift) motion-reduce:animate-none"
            style={step(4)}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-60">Match</span>
            <span className="tabular text-2xl font-semibold tracking-tight">
              <span className="count-up" style={{ ["--to" as string]: 70 }} />
              <span className="text-base opacity-60">%</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
