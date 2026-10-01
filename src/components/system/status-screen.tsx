import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The page shown when there is no page: a 404 for an address that is not a
 * route, and the fallback for a route that threw while rendering.
 *
 * It is presentational and router-free on purpose. `error.tsx` is a Client
 * Component and `global-error.tsx` renders without the root layout, so neither
 * can rely on a provider being above it — the links arrive as `actions`,
 * already built by the caller.
 */
export function StatusScreen({
  code,
  eyebrow,
  title,
  description,
  actions,
  detail,
  className,
}: {
  /** The number the reader would have seen anyway: `404`, `500`. */
  code: string;
  /** A few words above the heading, set in the mono face as a label. */
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  /** Small print under the buttons: the error's own words, its digest. */
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex min-h-[62vh] flex-col items-center justify-center gap-7 py-12 text-center",
        className,
      )}
    >
      {/* A pool of the accent behind the numeral, so the number reads as light rather than ink. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-[34rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <p
        aria-hidden
        className="bg-gradient-to-b from-primary/45 via-primary/15 to-transparent bg-clip-text font-display text-[clamp(5.5rem,20vw,11rem)] italic leading-[0.82] tracking-[-0.05em] text-transparent"
      >
        {code}
      </p>

      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</span>
        <h1 className="title max-w-2xl">{title}</h1>
        <p className="lede max-w-xl text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">{actions}</div>

      {detail ? <div className="max-w-xl text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}
