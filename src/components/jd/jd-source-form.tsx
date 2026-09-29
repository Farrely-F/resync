"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type JdInputMode = "paste" | "url";

const modeLabels: Record<JdInputMode, string> = {
  paste: "Paste text",
  url: "From a link",
};

interface JdSourceFormProps {
  mode: JdInputMode;
  onModeChange: (mode: JdInputMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  busy: boolean;
  canSubmit: boolean;
}

export function JdSourceForm({
  mode,
  onModeChange,
  text,
  onTextChange,
  url,
  onUrlChange,
  onSubmit,
  busy,
  canSubmit,
}: JdSourceFormProps) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div aria-label="Job description source" className="flex gap-1 rounded-lg border border-border p-1" role="group">
        {(Object.keys(modeLabels) as JdInputMode[]).map((value) => (
          <button
            aria-pressed={mode === value}
            className={cn(
              "min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors",
              mode === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            key={value}
            onClick={() => onModeChange(value)}
            type="button"
          >
            {modeLabels[value]}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="jd-text">
            Job description text
          </label>
          <textarea
            className="min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="jd-text"
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Paste the whole posting: title, requirements, responsibilities."
            value={text}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="jd-url">
            Job posting link
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="jd-url"
            inputMode="url"
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://"
            type="url"
            value={url}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Boards on Greenhouse, Ashby, Lever and LinkedIn are read directly. Other sites are read as a normal page.
          </p>
        </div>
      )}

      <Button className="h-11 w-full sm:w-auto" disabled={busy || !canSubmit} size="lg" type="submit">
        {busy ? "Reading the posting…" : "Read job description"}
      </Button>
    </form>
  );
}
