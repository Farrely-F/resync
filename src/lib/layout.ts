/**
 * Page layout: the paper a resume is typeset on and how far the text sits from
 * its edge.
 *
 * It belongs to the resume rather than the theme: a theme is a look, and the same
 * look is printed on A4 in one country and US Letter in another. The generator
 * reads it as `geometry` options, so it only applies to a generated document — a
 * hand-edited one carries its own preamble.
 */

export const paperSizes = [
  { id: "letter", name: "US Letter", detail: "8.5 × 11 in", option: "letterpaper" },
  { id: "a4", name: "A4", detail: "210 × 297 mm", option: "a4paper" },
  { id: "legal", name: "US Legal", detail: "8.5 × 14 in", option: "legalpaper" },
  { id: "a5", name: "A5", detail: "148 × 210 mm", option: "a5paper" },
  { id: "executive", name: "Executive", detail: "7.25 × 10.5 in", option: "executivepaper" },
] as const;

export type PaperSize = (typeof paperSizes)[number]["id"];

export interface PageLayout {
  paper: PaperSize;
  /** Margin on every side in millimetres; `null` keeps the theme's own margin. */
  marginMm: number | null;
}

export const defaultLayout: PageLayout = { paper: "letter", marginMm: null };

export const marginRangeMm = { min: 8, max: 40 } as const;

function isPaperSize(value: unknown): value is PaperSize {
  return paperSizes.some((paper) => paper.id === value);
}

/** A stored layout, or the default for a record saved before layouts existed. */
export function resolveLayout(value: Partial<PageLayout> | null | undefined): PageLayout {
  const margin = value?.marginMm;
  return {
    paper: isPaperSize(value?.paper) ? value.paper : defaultLayout.paper,
    marginMm:
      typeof margin === "number" && Number.isFinite(margin)
        ? Math.min(marginRangeMm.max, Math.max(marginRangeMm.min, Math.round(margin)))
        : null,
  };
}

/** The `geometry` option string: paper, then the margin the layout or the theme chose. */
export function geometryOptions(layout: PageLayout, themeMargin: string): string {
  const paper = paperSizes.find((entry) => entry.id === layout.paper) ?? paperSizes[0];
  return `${paper.option},margin=${layout.marginMm === null ? themeMargin : `${layout.marginMm}mm`}`;
}
