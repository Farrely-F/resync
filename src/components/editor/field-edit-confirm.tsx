"use client";

import { PenLine } from "lucide-react";

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
 * The confirmation for editing the fields of a hand-edited resume.
 *
 * A resume has two possible sources — the fields, or the LaTeX someone wrote by
 * hand — and manual mode is the statement that the document is the reader's. So a
 * field edit is exactly the moment the app would otherwise throw their text away
 * without asking: the dialog names that, and the button that does it says what it
 * costs. It is opened by a *pending* edit rather than by a trigger, because the
 * click that got here was an ordinary keystroke in an ordinary field.
 */
export function FieldEditConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit the fields instead of the LaTeX?</AlertDialogTitle>
          <AlertDialogDescription>
            This resume&apos;s document is the LaTeX you edited by hand, so changing a field regenerates the document
            from your data: your LaTeX is replaced and cannot be recovered here. Download the .tex first if you want to
            keep it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Keep the LaTeX</AlertDialogCancel>
          <AlertDialogAction className="h-11" onClick={onConfirm}>
            <PenLine aria-hidden />
            Edit the fields
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
