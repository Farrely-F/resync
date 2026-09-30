import type { JobHints } from "@/lib/jd/hosts";
import { deriveJdTitle, type Jd } from "@/lib/jd/schema";

const sourceLabels: Record<string, string> = {
  paste: "Pasted text",
  greenhouse: "Greenhouse",
  ashby: "Ashby",
  lever: "Lever",
  linkedin: "LinkedIn",
  generic: "Page text",
};

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex gap-2" key={`${index}-${item}`}>
            <span aria-hidden className="text-border">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface JdSummaryProps {
  structured: Jd;
  source: string;
  url: string | null;
  rawText: string;
  hints: JobHints;
  stored: boolean;
}

export function JdSummary({ structured, source, url, rawText, hints, stored }: JdSummaryProps) {
  const facts = [
    structured.company ?? hints.company,
    structured.location ?? hints.location,
    structured.seniority,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <article className="flex flex-col gap-5 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{deriveJdTitle(structured, hints.title ?? "Untitled job")}</h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-0.5">{sourceLabels[source] ?? source}</span>
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
          <span>{stored ? "Saved on this device" : "Not saved"}</span>
        </p>
        {url ? (
          <a
            className="break-all text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            {url}
          </a>
        ) : null}
      </header>

      <List items={structured.requirements} title="Requirements" />
      <List items={structured.niceToHave} title="Nice to have" />
      <List items={structured.skills} title="Skills" />
      <List items={structured.responsibilities} title="Responsibilities" />
      <List items={structured.keywords} title="Keywords" />

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Source text ({rawText.length.toLocaleString()} characters)</summary>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-background ring-1 ring-foreground/[0.08] p-3 text-xs leading-relaxed">
          {rawText}
        </pre>
      </details>
    </article>
  );
}
