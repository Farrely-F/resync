"use client";

import { useId, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { SortableItem } from "@/components/editor/sortable";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * A boxed, collapsible part of the editor: basics, one resume section, the LaTeX
 * source.
 *
 * The trigger is the heading's button rather than a heading inside a button —
 * a heading may contain a button, the reverse is invalid — and it carries
 * `data-panel-open` so the chevron turns with the panel instead of needing state
 * of its own. Collapsing is the reader's control: nothing here hides a section
 * from the document, which is what the separate hide/show action does.
 *
 * A section that can be dragged is given a `sortableId`, and then the box itself
 * is the draggable element, so the shadow follows the whole section rather than
 * an inner fragment of it.
 */
export function CollapsibleSection({
  title,
  summary,
  actions,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  sortable,
  headingLevel = 3,
  className,
}: {
  title: ReactNode;
  /** Short context next to the title: an entry count, what the box holds. */
  summary?: ReactNode;
  /** Controls beside the title: the drag handle, hide/show, download. */
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state, for the sections list's expand/collapse all. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Set when this box can be dragged: then the box itself moves. */
  sortable?: { id: string; handleLabel: string };
  /** 2 for a box that stands on its own, 3 for one nested under a section heading. */
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const id = useId();
  const headingId = `${id}-heading`;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  const content = (handle: ReactNode) => (
    <Collapsible
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange === undefined ? undefined : (next) => onOpenChange(next)}
      open={open}
    >
      <div className="flex flex-wrap items-center gap-1 p-4">
        <Heading className="min-w-0 grow" id={headingId}>
          <CollapsibleTrigger className="group flex w-full min-w-0 items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-90"
            />
            <span className="min-w-0 text-sm font-semibold">{title}</span>
            {summary === undefined ? null : (
              <span className="text-xs font-normal text-muted-foreground">{summary}</span>
            )}
          </CollapsibleTrigger>
        </Heading>
        {handle}
        {actions}
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );

  const box = cn("rounded-lg border border-border/60", className);

  if (sortable !== undefined) {
    return (
      <SortableItem
        as="section"
        className={box}
        handleLabel={sortable.handleLabel}
        id={sortable.id}
        labelledBy={headingId}
      >
        {content}
      </SortableItem>
    );
  }

  return (
    <section aria-labelledby={headingId} className={box}>
      {content(null)}
    </section>
  );
}
