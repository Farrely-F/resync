"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Delete confirmation for one resume.
 *
 * An AlertDialog rather than an inline step: it traps focus, closes on Escape,
 * and cannot be scrolled past, which is what a permanently destructive action
 * warrants. It names the resume and the consequence, because the button it
 * replaces is one tap away from data loss with no undo.
 */
export function DeleteResumeConfirm({
  title,
  copies = 0,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  /** Tailored copies made from this resume: they are kept, and the dialog says so. */
  copies?: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open && !busy) {
          onCancel();
        }
      }}
      open
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{title}</span> and its parsed data and saved text are
            removed from this browser.{" "}
            {copies > 0
              ? `Its ${copies === 1 ? "tailored copy is" : `${copies} tailored copies are`} kept as ${
                  copies === 1 ? "a separate resume" : "separate resumes"
                }. `
              : null}
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onCancel}>
            Keep it
          </AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm} variant="destructive">
            Delete resume
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
