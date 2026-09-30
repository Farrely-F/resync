"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * The confirmation for leaving manual mode, and the only control that leaves it.
 *
 * Regenerating is the only thing in the app that throws work away: it drops the
 * LaTeX the user wrote by hand and puts the generated document back. So it goes
 * through the registry alert dialog — focus-trapped, escape-handled and announced
 * as a dialog rather than as a control that happens to be on the page — and both
 * the sentence in it and the labels on its buttons say what is about to happen to
 * the hand-edited text.
 */
export function RegenerateConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger render={<Button className="h-11" variant="outline" />}>
        <RotateCcw aria-hidden />
        Regenerate from data
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate the document from your data?</AlertDialogTitle>
          <AlertDialogDescription>
            The LaTeX you edited by hand is discarded and cannot be recovered; the document goes back to the one this
            data produces.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Keep my edits</AlertDialogCancel>
          <AlertDialogAction
            className="h-11"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
            variant="destructive"
          >
            Regenerate and discard edits
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
