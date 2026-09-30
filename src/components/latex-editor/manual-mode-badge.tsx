import { PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * The marker for a resume whose document is hand-written LaTeX.
 *
 * Manual mode changes what every other surface means: the fields no longer
 * produce the document, suggestions are refused, and the exported `.tex` is not
 * the generated one. That has to be visible wherever the resume is named, or the
 * difference is only discovered by exporting the wrong file, so this badge is
 * used in the library list and in the editor.
 */
export function ManualModeBadge({ className }: { className?: string }) {
  return (
    <Badge className={className} variant="secondary">
      <PenLine aria-hidden />
      Hand-edited LaTeX
    </Badge>
  );
}
