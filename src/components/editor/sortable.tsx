"use client";

import { useMemo, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Drag-to-reorder primitives for the editor's lists.
 *
 * Three sensors, because one gesture cannot serve three inputs honestly:
 *
 *   - Mouse drags once the pointer has travelled a few pixels, so clicking the
 *     handle is still a click.
 *   - Touch requires a short hold first. Without it, every attempt to scroll a
 *     list that starts on a handle would drag an item instead, which on a phone
 *     is the most annoying possible failure.
 *   - Keyboard is not a fallback bolted on afterwards: `dnd-kit`'s keyboard
 *     sensor moves an item with the arrow keys and announces where it landed, so
 *     reordering stays possible without a pointer. A drag-only list would be
 *     unusable with a screen reader, which is why the arrows it replaces are not
 *     simply deleted.
 *
 * Nesting is deliberate and bounded: each list has its own context, so a bullet
 * can be reordered inside its entry, an entry inside its section, and a section
 * inside the document — but nothing can be dropped into a different list, which
 * is the one move the data model has no way to express.
 */

const dragInstructions =
  "Press space to pick the item up, use the arrow keys to move it, press space again to drop it, or escape to cancel.";

export function SortableList({
  ids,
  label,
  describe,
  onReorder,
  children,
}: {
  /** The ids in display order; each must match the id of a `SortableItem` below. */
  ids: string[];
  /** What the list is, for the spoken announcements: "the Experience entries". */
  label: string;
  /** Names one item for the announcements: "the Experience entry at Northwind". */
  describe: (id: string) => string;
  /** A drop: `from` and `to` are positions in `ids`. */
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements = useMemo<Announcements>(() => {
    const position = (id: string) => ids.indexOf(id) + 1;

    return {
      onDragStart: ({ active }) =>
        `Picked up ${describe(String(active.id))} in ${label}. ${dragInstructions}`,
      onDragOver: ({ active, over }) =>
        over === null
          ? `${describe(String(active.id))} has left ${label}.`
          : `${describe(String(active.id))} is now at position ${position(String(over.id))} of ${ids.length} in ${label}.`,
      onDragEnd: ({ active, over }) =>
        over === null
          ? `${describe(String(active.id))} was dropped outside ${label}; the order is unchanged.`
          : `${describe(String(active.id))} was dropped at position ${position(String(over.id))} of ${ids.length} in ${label}.`,
      onDragCancel: ({ active }) =>
        `Moving ${describe(String(active.id))} was cancelled; the order is unchanged.`,
    };
  }, [describe, ids, label]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) {
      return;
    }

    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) {
      return;
    }

    onReorder(from, to);
  }

  return (
    <DndContext
      accessibility={{ announcements, screenReaderInstructions: { draggable: dragInstructions } }}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * One draggable box. The handle is built here, where the sortable instance lives,
 * and handed to the caller so it can be placed anywhere inside the box.
 *
 * A render prop rather than a context: React's own lint refuses to spread values
 * that arrive through a context during render, because a context value could be a
 * ref, and the alternative would be silencing the rule on the one component whose
 * whole job is wiring up the dragging.
 */
export function SortableItem({
  id,
  handleLabel,
  as: Element = "li",
  className,
  labelledBy,
  tourId,
  children,
}: {
  id: string;
  /** What the handle moves, for its label and the spoken announcements. */
  handleLabel: string;
  as?: "li" | "div" | "section";
  className?: string;
  /**
   * Set on a sortable box that is a landmark in its own right, so that the box is
   * announced by its heading rather than by everything inside it.
   */
  labelledBy?: string;
  /** The `data-tour` id a guided tour step points at this box with. */
  tourId?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const handle = (
    <button
      {...attributes}
      {...listeners}
      // 44 px, like every other control in this editor: it has to work as a thumb
      // target, and it is the target that starts a drag. `touch-none` keeps the
      // first movement of a touch from scrolling the page out from under the drag.
      className={cn(
        "inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isDragging && "cursor-grabbing",
      )}
      ref={setActivatorNodeRef}
      type="button"
      aria-label={`Reorder ${handleLabel}`}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  );

  return (
    <Element
      aria-labelledby={labelledBy}
      data-tour={tourId}
      className={cn(
        // The item that is being dragged has to sit above its neighbours, and a
        // shadow is what says so; without it the row looks like it was removed.
        isDragging && "relative z-20 shadow-lg",
        className,
      )}
      ref={setNodeRef}
      style={{
        // Vertical lists only, so the horizontal axis is dropped rather than
        // rounded; `transition` is a CSS string dnd-kit already built.
        transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
        transition: transition ?? undefined,
      }}
    >
      {children(handle)}
    </Element>
  );
}
