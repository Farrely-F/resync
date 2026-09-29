"use client";

import { Button } from "@/components/ui/button";

/**
 * Inline delete confirmation.
 *
 * It names the consequence and the specific resume, because the button it
 * replaces is one tap away from permanent data loss in a browser with no undo.
 * A local component rather than a dialog: nothing here needs to trap focus, and
 * an inline step keeps the whole action on one screen on a phone.
 */
export function DeleteResumeConfirm({
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-sm">
        Delete <span className="font-medium">{title}</span>? Its parsed data and saved text are removed from this
        browser, and this cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" disabled={busy} onClick={onCancel} type="button" variant="outline">
          Keep it
        </Button>
        <Button className="h-11" disabled={busy} onClick={onConfirm} type="button" variant="destructive">
          Delete resume
        </Button>
      </div>
    </div>
  );
}
