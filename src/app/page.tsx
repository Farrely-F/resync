import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroVisual } from "@/components/landing/hero-visual";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FactsChecklist } from "@/components/landing/step-previews";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const title = "resync — match a resume to a job, then fix the gap";
const description =
  "Add a resume and a job posting, and see what the match actually rests on. The score comes from a weighted rubric over extracted evidence, suggestions arrive one at a time, and the output is typeset LaTeX. Nothing is uploaded: your data stays in this browser.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    type: "website",
    siteName: "resync",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Resume to job, measured
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Find out what a job actually asks for, and where your resume misses it.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Add a resume and a posting. The match is computed from a weighted rubric over evidence extracted from
            both, so every point is traceable and the number repeats on every run. Edits arrive one at a time, and
            the document is typeset as LaTeX.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className={cn(buttonVariants({ size: "lg" }), "h-11 justify-center px-5")}
              href="/match"
            >
              Start a match
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 justify-center px-5")}
              href="#how"
            >
              How it works
            </Link>
          </div>
          <FactsChecklist />
        </div>

        <HeroVisual />
      </section>

      <HowItWorks />

      <section className="border-t border-border/60 pt-12">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Two things worth knowing before you start.
        </h2>
        <dl className="mt-8 grid gap-8 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium">Only extracted text moves</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The file you add, the postings you paste, the score and the LaTeX stay in this browser. The plain text
              pulled out of a document is the only thing sent anywhere, and only to structure it.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium">The score is arithmetic</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every point comes from the rubric over extracted evidence, so the same inputs give the same number and
              each line of the report can be checked by hand.
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border/70 bg-muted/30 px-5 py-8 sm:px-8">
        <h2 className="text-xl font-semibold tracking-tight text-balance">
          Start with the resume you already have.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          One resume and one posting is enough for the first match. No account to create, nothing to install.
        </p>
        <Link className={cn(buttonVariants({ size: "lg" }), "mt-5 h-11 justify-center px-5")} href="/match">
          Start a match
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>
    </div>
  );
}
