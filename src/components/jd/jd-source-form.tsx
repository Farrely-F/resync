"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type JdInputMode = "paste" | "url";

const modeLabels: Record<JdInputMode, string> = {
  paste: "Paste text",
  url: "From a link",
};

const modes = Object.keys(modeLabels) as JdInputMode[];

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
      <ToggleGroup
        aria-label="Job description source"
        className="w-full rounded-full bg-muted p-1 ring-1 ring-foreground/[0.06] shadow-[inset_0_1px_2px_oklch(0.2_0.03_265/0.06)]"
        spacing={1}
        onValueChange={(value) => {
          const next = value[0];
          if (next === "paste" || next === "url") {
            onModeChange(next);
          }
        }}
        value={[mode]}
      >
        {modes.map((value) => (
          <ToggleGroupItem
            className="min-h-10 flex-1 rounded-full! text-muted-foreground transition-[background-color,color,box-shadow] duration-300 ease-(--ease-out-expo) hover:bg-transparent! hover:text-foreground aria-pressed:bg-card! aria-pressed:text-foreground aria-pressed:shadow-(--shadow-rest) aria-pressed:ring-1 aria-pressed:ring-foreground/[0.06]"
            key={value}
            value={value}
          >
            {modeLabels[value]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {mode === "paste" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="jd-text">Job description text</Label>
          <Textarea
            className="min-h-40 leading-relaxed"
            id="jd-text"
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Paste the whole posting: title, requirements, responsibilities."
            value={text}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="jd-url">Job posting link</Label>
          <Input
            className="min-h-11"
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
