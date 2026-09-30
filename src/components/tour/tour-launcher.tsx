"use client";

import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour/guided-tour";

/**
 * "Take the tour", for the page the tour describes.
 *
 * The tour shows itself once and then stays out of the way, which is right for
 * the first visit and useless for the second, when a reader wants to be shown
 * something again. This is that second way in: it is on the page rather than in a
 * menu, because a tour of this page is the thing being asked for.
 */
export function TourLauncher({ label = "Take the tour" }: { label?: string }) {
  const { available, start } = useTour();

  if (available === null) {
    return null;
  }

  return (
    <Button className="h-11 sm:h-9" onClick={() => start()} size="sm" type="button" variant="ghost">
      <Compass aria-hidden />
      {label}
    </Button>
  );
}
