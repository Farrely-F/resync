"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { accentCssColor, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Theme selection for the resume editor.
 *
 * A radio group from the registry: the whole card is the label of one radio, so
 * the group is reachable by keyboard, announced as a radio group, and the selected
 * card is marked by the radio itself (`has-checked:`) rather than by a second
 * piece of component state that could disagree with it.
 */
export function ThemePicker({
  themes,
  selectedId,
  onSelect,
  disabled = false,
}: {
  themes: readonly Theme[];
  selectedId: string;
  onSelect: (themeId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Theme</span>
      <RadioGroup
        aria-label="Theme"
        className="grid gap-3 sm:grid-cols-3"
        disabled={disabled}
        onValueChange={(value) => onSelect(String(value))}
        value={selectedId}
      >
        {themes.map((theme) => {
          const accent = accentCssColor(theme.accent);
          const id = `resume-theme-${theme.id}`;

          return (
            <Label
              className={cn(
                "min-h-11 flex-row items-start gap-3 rounded-lg border border-border/60 p-3 leading-normal font-normal transition-colors",
                "has-checked:border-foreground has-checked:bg-muted hover:bg-muted/50",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
              htmlFor={id}
              key={theme.id}
            >
              <RadioGroupItem className="mt-0.5" id={id} value={theme.id} />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full border border-border"
                    style={accent ? { backgroundColor: accent } : undefined}
                  />
                  {theme.name}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{theme.description}</span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
