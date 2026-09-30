import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroVisual } from "@/components/landing/hero-visual";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FactsChecklist } from "@/components/landing/step-previews";
import { buttonVariants } from "@/components/ui/button";
import { publicMetadata } from "@/lib/seo";
import { resolveSiteUrl, siteDescription, siteTitle } from "@/lib/site";
import { serializeJsonLd, webApplicationJsonLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  ...publicMetadata({ path: "/", title: siteTitle, description: siteDescription }),
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-28 md:gap-44">
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(webApplicationJsonLd(resolveSiteUrl())) }}
        type="application/ld+json"
      />
      <section className="grid items-center gap-12 pt-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-10 md:pt-10">
        <div className="flex flex-col gap-7">
          <h1 className="display animate-[rise_0.9s_var(--ease-out-expo)_both] motion-reduce:animate-none">
            Know exactly where your resume <span className="ink">misses</span> the job.
          </h1>
          <p className="lede max-w-xl animate-[rise_0.9s_var(--ease-out-expo)_0.12s_both] text-muted-foreground motion-reduce:animate-none">
            Add a resume and a posting. The match is a weighted rubric over evidence from both, so every point is
            traceable and the number repeats on every run. Edits arrive one at a time, typeset as LaTeX.
          </p>
          <div className="flex animate-[rise_0.9s_var(--ease-out-expo)_0.24s_both] flex-col gap-3 sm:flex-row motion-reduce:animate-none">
            <Link className={cn(buttonVariants({ size: "lg" }), "sheen group/cta justify-center")} href="/match">
              Start a match
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-300 ease-(--ease-out-expo) group-hover/cta:translate-x-1"
              />
            </Link>
            <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")} href="#how">
              How it works
            </Link>
          </div>
          <div className="animate-[rise_0.9s_var(--ease-out-expo)_0.36s_both] motion-reduce:animate-none">
            <FactsChecklist />
          </div>
        </div>

        <div className="animate-[rise_1.1s_var(--ease-out-expo)_0.2s_both] motion-reduce:animate-none">
          <HeroVisual />
        </div>
      </section>

      <HowItWorks />

      <section>
        <h2 className="title reveal max-w-2xl">Two things worth knowing before you start.</h2>
        <dl className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="reveal lift rounded-3xl bg-card p-7 ring-1 ring-foreground/[0.06] md:p-9">
            <dt className="text-xl font-semibold tracking-tight">Only extracted text moves</dt>
            <dd className="mt-3 leading-relaxed text-muted-foreground">
              The file you add, the postings you paste, the score and the LaTeX stay in this browser. The plain text
              pulled out of a document is the only thing sent anywhere, and only to structure it.
            </dd>
          </div>
          <div className="reveal lift rounded-3xl bg-card p-7 ring-1 ring-foreground/[0.06] md:p-9">
            <dt className="text-xl font-semibold tracking-tight">The score is arithmetic</dt>
            <dd className="mt-3 leading-relaxed text-muted-foreground">
              Every point comes from the rubric over extracted evidence, so the same inputs give the same number and
              each line of the report can be checked by hand.
            </dd>
          </div>
        </dl>
      </section>

      <section className="reveal-slow relative isolate overflow-hidden rounded-[2.5rem] bg-foreground px-7 py-16 text-background sm:px-14 md:py-24">
        <div
          aria-hidden
          className="absolute -right-32 -top-40 -z-10 size-[34rem] rounded-full bg-primary/60 blur-[110px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -left-24 -z-10 size-[28rem] rounded-full bg-[oklch(0.7_0.17_330)]/35 blur-[110px]"
        />
        <h2 className="title max-w-2xl">Start with the resume you already have.</h2>
        <p className="lede mt-5 max-w-xl text-background/70">
          One resume and one posting is enough for the first match. No account to create, nothing to install.
        </p>
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "sheen group/cta mt-9 justify-center bg-background text-foreground shadow-(--shadow-float) hover:bg-background"
          )}
          href="/match"
        >
          Start a match
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-300 ease-(--ease-out-expo) group-hover/cta:translate-x-1"
          />
        </Link>
      </section>
    </div>
  );
}
