"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";
import { AddResumePreview, EditPreview, MatchPreview, ReportPreview } from "./step-previews";

/**
 * The four steps, told as one scroll-driven sequence.
 *
 * The base layout is a plain list: each step carries its own preview, so the
 * page reads top to bottom with no JavaScript at all. Once mounted, the
 * component upgrades itself — the previews move into a sticky pane that tracks
 * which step is crossing the middle of the viewport, and the step blocks keep
 * their own preview only on small screens, where stacked cards are the honest
 * layout. The upgrade only swaps what fills the second column, so the text
 * column never changes width.
 */

const steps = [
  {
    id: "add",
    label: "Add a resume",
    body: "Drop in a PDF or DOCX, or paste the text. Parsing runs in the browser; the structured version is what every later step reads. The file itself is not uploaded.",
    caption: "The library, with one resume parsed.",
    Preview: AddResumePreview,
  },
  {
    id: "match",
    label: "Match it against a job",
    body: "Paste the posting or its link. Requirements, nice-to-haves and keywords are separated, then each one is checked against evidence in the resume, line by line.",
    caption: "The match view: every requirement beside the evidence it found.",
    Preview: MatchPreview,
  },
  {
    id: "review",
    label: "Review what you missed",
    body: "The score is a weighted rubric, not an opinion: must-haves count for more than optional items, and the report shows what each line contributed. Missing requirements say which evidence was absent.",
    caption: "The report: the rubric lines behind the number.",
    Preview: ReportPreview,
  },
  {
    id: "edit",
    label: "Edit and export",
    body: "Suggestions arrive one at a time, each naming the requirement it addresses. Accepting one writes to the structured resume. The document is typeset as LaTeX, which you can compile here or take with you.",
    caption: "The editor: one suggestion at a time, next to the LaTeX it produces.",
    Preview: EditPreview,
  },
] as const;

// Stable identities are required by useSyncExternalStore, so these live at module scope.
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False during server rendering and the first hydration pass, true afterwards.
 * The upgrade below must not run during hydration, or the markup would differ
 * from the HTML that was served.
 */
function useHydrated() {
  return useSyncExternalStore(neverChanges, onClient, onServer);
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const enhanced = useHydrated();
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!enhanced || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const index = Number((entry.target as HTMLElement).dataset.step);
          if (Number.isInteger(index)) {
            setActive(index);
          }
        }
      },
      // Only a step crossing the middle band counts, so exactly one is active.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const element of stepRefs.current) {
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [enhanced]);

  return (
    <section className="scroll-mt-20 border-t border-border/60 pt-12" id="how">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">How it works</p>
      <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        Four steps, in order, with nothing hidden in between.
      </h2>

      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
        <ol className="flex flex-col gap-12 md:gap-0">
          {steps.map((step, index) => (
            <li
              className={cn(
                "md:flex md:min-h-[62vh] md:flex-col md:justify-center",
                enhanced && "md:transition-opacity md:duration-500 motion-reduce:md:transition-none",
                enhanced && active !== index && "md:opacity-50",
              )}
              data-step={index}
              key={step.id}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
            >
              <p className="font-mono text-xs text-muted-foreground">
                Step {index + 1} of {steps.length}
              </p>
              <h3 className="mt-2 text-lg font-medium tracking-tight">{step.label}</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              <div className="mt-4 md:hidden">
                <step.Preview />
              </div>
            </li>
          ))}
        </ol>

        <div className={cn("hidden md:block", enhanced && "md:sticky md:top-20 md:self-start")}>
          {enhanced ? (
            <>
              <div className="grid">
                {steps.map((step, index) => (
                  <div
                    aria-hidden={active !== index}
                    className={cn(
                      "col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none",
                      active === index ? "opacity-100" : "pointer-events-none opacity-0",
                    )}
                    key={step.id}
                  >
                    <step.Preview />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>{steps[active]?.caption}</p>
                <p className="font-mono">
                  {active + 1}/{steps.length}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-8">
              {steps.map((step) => (
                <div key={step.id}>
                  <p className="mb-2 text-xs text-muted-foreground">{step.label}</p>
                  <step.Preview />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
