"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Marks the text a tailored copy says differently from its original.
 *
 * A field is marked when its text is not in the original at all, not when
 * it sits at a position that differs: entries and bullets can be
 * dragged, and a marker that stayed behind on the old position would point at
 * the wrong line. Editing a marked field changes its text, which drops the mark
 * — the reader has then made it their own wording.
 */

const AdjustedTexts = createContext<ReadonlyMap<string, "suggestion" | "you">>(new Map());

export function AdjustmentHighlightProvider({
  changes,
  children,
}: {
  changes: readonly { after: string; source?: "suggestion" | "you" }[];
  children: ReactNode;
}) {
  const texts = useMemo(
    () =>
      new Map(
        changes
          .filter((entry) => entry.after !== "")
          .map((entry) => [entry.after, entry.source ?? "suggestion"] as const),
      ),
    [changes],
  );

  return <AdjustedTexts.Provider value={texts}>{children}</AdjustedTexts.Provider>;
}

/** Who wrote this text if it is a change from the original, else null. Truthy exactly when the field is marked. */
export function useAdjustedSource(value: string): "suggestion" | "you" | null {
  return useContext(AdjustedTexts).get(value) ?? null;
}

/** Applied to the control itself, so the mark does not rely on colour alone (see `AdjustedTag`). */
export const adjustedControlClassName = "border-primary/60 bg-primary/5 ring-1 ring-primary/30";

export function AdjustedTag({ className, source = "suggestion" }: { className?: string; source?: "suggestion" | "you" | null }) {
  return (
    <span className={cn("rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary", className)}>
      {source === "you" ? "Added by you" : "Changed for this job"}
    </span>
  );
}
