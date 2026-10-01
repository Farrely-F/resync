"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { accentCssColor, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Theme selection for the resume editor.
 *
 * A radio group from the registry: each chip is the label of one radio, so the
 * group is reachable by keyboard, announced as a radio group, and the selected
 * chip is marked by the radio itself (`has-checked:`) rather than by a second
 * piece of component state that could disagree with it. The chips carry only the
 * name and the accent; the selected theme's description is read out below them,
 * so ten themes take two rows instead of four.
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
  const selected = themes.find((theme) => theme.id === selectedId) ?? themes[0];

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">Theme</span>
      <RadioGroup
        aria-label="Theme"
        className="flex flex-wrap gap-2"
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
                "relative min-h-11 w-auto flex-row items-center gap-2 rounded-full bg-card px-3.5 text-sm font-medium ring-1 ring-foreground/[0.08] shadow-(--shadow-rest) transition-[box-shadow,background-color] duration-300",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring hover:shadow-(--shadow-lift) has-checked:bg-accent has-checked:ring-2 has-checked:ring-primary has-checked:shadow-(--shadow-lift)",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
              htmlFor={id}
              key={theme.id}
            >
              <RadioGroupItem className="absolute size-px! opacity-0 after:hidden" id={id} value={theme.id} />
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full border border-border bg-foreground/10"
                style={accent ? { backgroundColor: accent } : undefined}
              />
              {theme.name}
            </Label>
          );
        })}
      </RadioGroup>
      <p aria-live="polite" className="text-xs leading-relaxed text-muted-foreground">
        {selected.description}
      </p>
    </div>
  );
}
