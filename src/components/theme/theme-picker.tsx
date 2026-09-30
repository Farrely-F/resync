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
    <div className="flex flex-col gap-3" data-tour="editor-theme">
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
                "min-h-11 flex-row items-start gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.08] shadow-(--shadow-rest) p-3.5 leading-normal font-normal transition-[box-shadow,background-color,transform] duration-300",
                "hover:shadow-(--shadow-lift) has-checked:bg-accent has-checked:ring-2 has-checked:ring-primary has-checked:shadow-(--shadow-lift)",
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
