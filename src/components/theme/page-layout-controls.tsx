"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { marginRangeMm, paperSizes, type PageLayout, type PaperSize } from "@/lib/layout";

const paperItems = paperSizes.map((paper) => ({ value: paper.id, label: `${paper.name} · ${paper.detail}` }));

/** Converts a theme's `0.9in` / `12mm` margin to millimetres, to seed the slider. */
export function themeMarginMm(margin: string): number {
  const value = Number.parseFloat(margin);
  if (!Number.isFinite(value)) {
    return marginRangeMm.min;
  }
  const mm = margin.endsWith("in") ? value * 25.4 : margin.endsWith("cm") ? value * 10 : value;
  return Math.min(marginRangeMm.max, Math.max(marginRangeMm.min, Math.round(mm)));
}

/**
 * Paper size and margin for the generated document.
 *
 * A margin of `null` means "whatever the theme sets", which is why the slider
 * shows the theme's value until it is moved and a reset puts that back, rather
 * than the control inventing a default of its own.
 */
export function PageLayoutControls({
  layout,
  themeMargin,
  manual,
  onChange,
}: {
  layout: PageLayout;
  themeMargin: string;
  /** A hand-edited document has its own preamble, which these controls cannot reach. */
  manual: boolean;
  onChange: (layout: PageLayout) => void;
}) {
  const shownMargin = layout.marginMm ?? themeMarginMm(themeMargin);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="resume-paper">Paper size</Label>
          <Select
            disabled={manual}
            items={paperItems}
            onValueChange={(value) => onChange({ ...layout, paper: value as PaperSize })}
            value={layout.paper}
          >
            <SelectTrigger className="w-full" id="resume-paper">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paperItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex min-h-6 items-center justify-between gap-2">
            <Label id="resume-margin-label">Margin</Label>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {shownMargin} mm{layout.marginMm === null ? " · theme" : ""}
              {layout.marginMm === null || manual ? null : (
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => onChange({ ...layout, marginMm: null })}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Reset
                </Button>
              )}
            </span>
          </div>
          <Slider
            aria-labelledby="resume-margin-label"
            className="min-h-10"
            disabled={manual}
            max={marginRangeMm.max}
            min={marginRangeMm.min}
            onValueChange={(value) => onChange({ ...layout, marginMm: Array.isArray(value) ? value[0] : value })}
            step={1}
            value={[shownMargin]}
          />
        </div>
      </div>
      {manual ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          This resume is in manual mode, so its page setup lives in the LaTeX (the <code>geometry</code> line), not
          here.
        </p>
      ) : null}
    </div>
  );
}
