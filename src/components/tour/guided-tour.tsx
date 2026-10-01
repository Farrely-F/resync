"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { TourOverlay } from "@/components/tour/tour-overlay";
import { hasSeenTour, markTourSeen } from "@/lib/tour/progress";
import { resolveSteps, tourById, tourForPath, type Tour, type TourStep } from "@/lib/tour/steps";

/**
 * The tour's controller: which tour this page has, when it opens, and what a step
 * points at.
 *
 * A tour appears once on its own, after the page has settled — its own effects
 * read storage and render the elements the tour points at, and a tour that opened
 * before them would point at nothing. It is then remembered as seen, whether it
 * was finished or skipped, because a tour that reappears is one that gets
 * dismissed without being read.
 *
 * Steps whose element is not on the page are dropped rather than pointed at
 * empty space, which is what lets one tour cover a page with several states.
 */

interface TourControl {
  /** Opens the current page's tour, or a named one that has an element here. */
  start: (id?: string) => void;
  /** The tour this page has, if it has one. */
  available: Tour | null;
}

const TourContext = createContext<TourControl | null>(null);

export function useTour(): TourControl {
  const value = useContext(TourContext);

  if (value === null) {
    throw new Error("useTour must be used inside GuidedTour");
  }

  return value;
}

interface Active {
  tour: Tour;
  steps: TourStep[];
  targets: (Element | null)[];
}

/** How long the page is given to render the elements a tour points at. */
const settleMs = 700;

function elementFor(target: string): Element | null {
  return document.querySelector(`[data-tour="${target}"]`);
}

export function GuidedTour({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTour = useMemo(() => tourForPath(pathname), [pathname]);
  const [active, setActive] = useState<Active | null>(null);
  const [index, setIndex] = useState(0);
  const returnFocusTo = useRef<Element | null>(null);

  const open = useCallback((tour: Tour) => {
    const steps = resolveSteps(tour.steps, (target) => elementFor(target) !== null);
    if (steps.length === 0) {
      return;
    }

    returnFocusTo.current = document.activeElement;
    setActive({ tour, steps, targets: steps.map((step) => (step.target === null ? null : elementFor(step.target))) });
    setIndex(0);
  }, []);

  /** Finishing and skipping are the same decision: do not show this one again. */
  const close = useCallback(() => {
    setActive((current) => {
      if (current !== null) {
        markTourSeen(current.tour.id);
      }
      return null;
    });

    const previous = returnFocusTo.current;
    if (previous instanceof HTMLElement && document.contains(previous)) {
      previous.focus();
    }
  }, []);

  const start = useCallback(
    (id?: string) => {
      const tour = id === undefined ? pageTour : tourById(id);
      if (tour !== null) {
        open(tour);
      }
    },
    [open, pageTour],
  );

  // Once per page, on the first visit.
  useEffect(() => {
    if (pageTour === null || hasSeenTour(pageTour.id)) {
      return;
    }

    const timer = setTimeout(() => open(pageTour), settleMs);
    return () => clearTimeout(timer);
  }, [open, pageTour]);

  // A tour belongs to the page it describes. Leaving closes it without recording
  // it as seen, so it can be offered again rather than counting as dismissed —
  // and this is done during render rather than in an effect, which is React's own
  // answer for state that has to follow a prop.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setActive(null);
  }

  // Bring each step's element into view before pointing at it.
  //
  // The position differs by presentation, which is why this is arithmetic rather
  // than `scrollIntoView`: on a wide screen the element is centred beside the
  // popover, and on a phone it goes near the top, because the sheet at the bottom
  // would otherwise cover the very thing the step is describing.
  useEffect(() => {
    if (active === null) {
      return;
    }

    const target = active.targets[index];
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const phone = window.innerWidth < 640;
    const offset = phone ? 84 : Math.max(84, (window.innerHeight - rect.height) / 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: Math.max(0, rect.top + window.scrollY - offset),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [active, index]);

  const control = useMemo<TourControl>(() => ({ start, available: pageTour }), [pageTour, start]);

  return (
    <TourContext.Provider value={control}>
      {children}
      {active === null ? null : (
        <TourOverlay
          count={active.steps.length}
          index={index}
          onBack={() => setIndex((current) => Math.max(0, current - 1))}
          onClose={close}
          onNext={() => {
            if (index + 1 >= active.steps.length) {
              close();
              return;
            }
            setIndex(index + 1);
          }}
          step={active.steps[index]}
          target={active.targets[index]}
        />
      )}
    </TourContext.Provider>
  );
}
