import { cn } from "@/lib/utils";
import { accentCssColor, type Theme } from "@/lib/themes";

/**
 * Theme selection for the resume editor. Native radios inside labels: the card is
 * the control, so it is keyboard-reachable and announced as a radio group without
 * any JavaScript state beyond the selection itself.
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
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="pb-1 text-sm font-medium">Theme</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map((theme) => {
          const accent = accentCssColor(theme.accent);

          return (
            <label className={cn("cursor-pointer", disabled && "cursor-not-allowed")} key={theme.id}>
              <input
                checked={theme.id === selectedId}
                className="peer sr-only"
                disabled={disabled}
                name="resume-theme"
                onChange={() => onSelect(theme.id)}
                type="radio"
                value={theme.id}
              />
              <span
                className={cn(
                  "flex min-h-11 gap-3 rounded-lg border border-border/60 p-3 transition-colors",
                  "hover:bg-muted/50 peer-checked:border-foreground peer-checked:bg-muted",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-focus-visible:outline-none",
                  disabled && "opacity-60",
                )}
              >
                <span
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0 rounded-full border border-border"
                  style={accent ? { backgroundColor: accent } : undefined}
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{theme.name}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{theme.description}</span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
