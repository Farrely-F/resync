"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Form primitives for the visual editor.
 *
 * Every control is at least 44 px on its shortest side: this editor is used with
 * a thumb on a phone, and 44 px is the smallest target that still works. The
 * text controls are labelled and wired with `htmlFor`, so a screen reader hears
 * the field name rather than the placeholder.
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder = "",
  multiline = false,
  type = "text",
  inputMode,
  autoComplete,
  wide = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "email" | "tel" | "url";
  inputMode?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  /** Multiline fields span both columns of the desktop grid. */
  wide?: boolean;
}) {
  const controlClassName = cn(
    "w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm",
    multiline ? "min-h-24 py-2.5" : "h-11",
  );
  const shared = {
    className: controlClassName,
    id,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    placeholder,
    value,
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide && "sm:col-span-2")}>
      <label className="text-xs font-medium" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} />
      ) : (
        <input autoComplete={autoComplete} inputMode={inputMode} type={type} {...shared} />
      )}
    </div>
  );
}

/** A square control with an icon; the label is what it is announced as. */
export function IconButton({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      aria-label={label}
      className="size-11 shrink-0"
      disabled={disabled}
      onClick={onClick}
      size="icon"
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
}
