"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/steps";

/**
 * The tour overlay: one step at a time, over a dimmed page.
 *
 * Two presentations, because one does not fit both: a popover beside the element
 * on a wide screen, and a sheet at the bottom of the screen on a phone, where a
 * tooltip next to a small target would cover the thing it is describing. The
 * spotlight is a ring with a very large shadow rather than a mask, which needs no
 * SVG and animates between steps by itself.
 *
 * The page behind is inert while this is open, so it is a modal dialog and says
 * so: focus moves in, Tab cycles within, Escape closes. Arrow keys move between
 * steps — the keys a reader would try anyway — and the step counter is in the
 * heading, so a screen reader hears where it is.
 *
 * Position is *derived* rather than stored: the rect of the target and the size
 * of the window are read during render, and a counter bumped by resize and scroll
 * is what re-reads them. That avoids the extra render an effect that measures and
 * sets state would cost — which on a tour is visible as a spotlight that lands
 * late. The popover is anchored by whichever edge fits, so its own height never
 * has to be known.
 */

const gap = 12;
const maxWidth = 380;
/** Below this much room underneath a target, the popover goes above it instead. */
const minRoomBelow = 200;
const phoneWidth = 640;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function boxOf(element: Element | null): Box | null {
  if (element === null) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

type Placement = { left: number; width: number } & ({ top: number } | { bottom: number });

/** Where the popover goes: beside the target on a wide screen, sheet on a phone. */
function placementFor(box: Box | null, width: number, height: number): Placement | null {
  if (box === null || width < phoneWidth) {
    return null;
  }

  const popoverWidth = Math.min(maxWidth, width - gap * 2);
  const left = Math.min(Math.max(gap, box.left), width - popoverWidth - gap);
  const below = box.top + box.height + gap;

  return height - below >= minRoomBelow
    ? { left, width: popoverWidth, top: below }
    : { left, width: popoverWidth, bottom: height - box.top + gap };
}

export function TourOverlay({
  step,
  index,
  count,
  target,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep;
  index: number;
  count: number;
  /** The element this step points at, already scrolled into view. */
  target: Element | null;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const last = index === count - 1;

  /**
   * The page can move under the overlay — a resize, a scroll, a section opening
   * above the target — so the viewport is held in state and re-read whenever one
   * of those happens. It is the external value the render genuinely depends on,
   * which is what makes the rect read below a *derived* read rather than a stale
   * one: every reason for it to have changed also re-renders this component.
   */
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const sync = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    const observer = new ResizeObserver(sync);
    observer.observe(document.body);
    window.addEventListener("resize", sync);
    // Capture, so a scroll inside a panel counts as well as one of the page.
    window.addEventListener("scroll", sync, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, []);

  const spotlight = boxOf(target);
  const placement = placementFor(spotlight, viewport.width, viewport.height);

  // Focus lands in the dialog, so the keyboard and the screen reader follow the
  // tour rather than staying on the page it is covering.
  useEffect(() => {
    dialog.current?.focus();
  }, [index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onBack();
        return;
      }
      if (event.key === "Tab") {
        // A dialog with three controls does not need a general trap: cycling the
        // two ends is the whole of it.
        const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusable || focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          lastFocusable.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusable) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onBack, onClose, onNext]);

  return (
    <div className="fixed inset-0 z-50">
      {/*
        The dimming is the spotlight's own shadow, so the hole and the dim can
        never disagree. The layer is inert: a stray tap does nothing, because a
        tour dismissed by one teaches nothing.
      */}
      <div
        aria-hidden
        className={cn(
          "absolute rounded-xl transition-all duration-200 ease-out motion-reduce:transition-none",
          spotlight === null ? "inset-0 bg-foreground/45" : "shadow-[0_0_0_9999px_oklch(0_0_0/0.45)] ring-2 ring-primary",
        )}
        style={
          spotlight === null
            ? undefined
            : {
                top: spotlight.top - 4,
                left: spotlight.left - 4,
                width: spotlight.width + 8,
                height: spotlight.height + 8,
              }
        }
      />

      <div
        aria-labelledby="tour-step-title"
        aria-modal="true"
        className={cn(
          "absolute flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-(--shadow-float) ring-1 ring-foreground/10",
          // The phone sheet's own anchors: kept off a positioned popover, where a
          // `bottom` here would stretch it from its `top` to the bottom of the screen.
          placement === null ? "inset-x-3 bottom-24 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[380px] sm:-translate-x-1/2 sm:-translate-y-1/2" : null,
        )}
        ref={dialog}
        role="dialog"
        style={
          placement === null
            ? undefined
            : {
                left: placement.left,
                width: placement.width,
                ...("top" in placement ? { top: placement.top } : { bottom: placement.bottom }),
              }
        }
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <p className="text-xs font-medium text-muted-foreground tabular-nums">
            {index + 1} of {count}
          </p>
          <button
            aria-label="Close the tour"
            className="ml-auto inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <h2 className="text-base font-semibold tracking-tight" id="tour-step-title">
          {step.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-1 flex items-center gap-2">
          {index > 0 ? (
            <Button className="h-11 sm:h-9" onClick={onBack} type="button" variant="outline">
              <ArrowLeft aria-hidden />
              Back
            </Button>
          ) : null}
          <Button className="h-11 sm:h-9" onClick={onNext} type="button">
            {last ? "Done" : "Next"}
            {last ? null : <ArrowRight aria-hidden />}
          </Button>
          <Button className="ml-auto h-11 sm:h-9" onClick={onClose} type="button" variant="ghost">
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
