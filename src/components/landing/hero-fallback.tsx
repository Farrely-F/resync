import { Check, X } from "lucide-react";

/**
 * Static stand-in for the hero scene.
 *
 * It is the first thing rendered and the only thing shown when the WebGL gate
 * says no — no JavaScript, no WebGL context, a constrained device, a metered
 * connection or a reduced-motion preference. It carries the same idea as the
 * scene (a resume page, a set of requirements, one highlighted line) so the
 * hero never looks broken, only still.
 */
export function HeroFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="relative grid w-full max-w-[420px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:gap-5">
        <div className="relative">
          <div className="absolute -left-1.5 -top-1.5 size-full rotate-[-5deg] rounded-lg border border-border/60 bg-muted/40" />
          <div className="relative rotate-[1.5deg] rounded-lg border border-border/70 bg-background p-3 shadow-sm">
            <div className="h-2 w-24 rounded-full bg-foreground/70" />
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="h-1.5 w-full rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-[86%] rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-[92%] rounded-full bg-muted-foreground/25" />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="h-1.5 w-16 rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-full rounded-full bg-foreground/70" />
              <div className="h-1.5 w-[74%] rounded-full bg-muted-foreground/25" />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="h-1.5 w-[88%] rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-[60%] rounded-full bg-muted-foreground/25" />
            </div>
          </div>
        </div>

        <div className="flex w-[120px] flex-col gap-1.5 sm:w-[150px]">
          {[
            { text: "Postgres at scale", covered: true },
            { text: "Go or Rust", covered: true },
            { text: "Kubernetes", covered: false },
            { text: "On-call", covered: true },
          ].map((row) => (
            <div
              className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-[10px] leading-tight"
              key={row.text}
            >
              {row.covered ? (
                <Check aria-hidden className="size-3 shrink-0 text-foreground" />
              ) : (
                <X aria-hidden className="size-3 shrink-0 text-destructive" />
              )}
              <span className="truncate">{row.text}</span>
            </div>
          ))}
          <div className="mt-1 self-end rounded-md border border-border/70 bg-muted/40 px-2 py-1">
            <span className="text-sm font-semibold">70%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
