import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 py-8">
      <section className="flex max-w-2xl flex-col gap-5">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Resume to job, measured
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Find out what a job actually asks for, and where your resume misses it.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Add a resume and a job description. You get a match score with the reasoning behind it, a list of the
          requirements you do not cover, and concrete edits you choose to accept. Everything stays in this browser.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link className={cn(buttonVariants({ size: "lg" }), "justify-center")} href="/match">
            Start a match
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")}
            href="/resumes"
          >
            Your resumes
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Score with reasons",
            body: "The number comes from a weighted rubric over extracted evidence, not from a model's opinion, so it is the same on every run.",
          },
          {
            title: "Edits you approve",
            body: "Suggestions arrive with the job requirement each one addresses. Nothing changes until you accept it.",
          },
          {
            title: "LaTeX output",
            body: "The document is typeset from templates restricted to packages that genuinely parse and export cleanly.",
          },
        ].map((item) => (
          <article className="rounded-xl border border-border/60 p-5" key={item.title}>
            <h2 className="text-sm font-medium">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <p className="max-w-2xl text-sm text-muted-foreground">
        This page is the interim landing surface; the designed version is tracked in{" "}
        <Link
          className="underline underline-offset-4 hover:text-foreground"
          href="https://github.com/Farrely-F/resync/issues/11"
          rel="noreferrer"
        >
          issue #11
        </Link>
        .
      </p>
    </div>
  );
}
