"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, RotateCcw } from "lucide-react";

import { useTour } from "@/components/tour/guided-tour";
import { Button } from "@/components/ui/button";
import { forgetTours } from "@/lib/tour/progress";
import { tours } from "@/lib/tour/steps";

/**
 * The tours, listed.
 *
 * A tour shows itself once and then stays away, which leaves no way back to it
 * for a reader who wants a second look. This is that way back: every tour with the
 * page it belongs to, a button for the page you are on, and a reset that makes
 * them all appear again on their own.
 *
 * A tour of a page with an id in its address — the editor, a report — is named
 * rather than linked, because there is no single URL to link to.
 */
export function ToursCard() {
  const { available, start } = useTour();
  const [reset, setReset] = useState(false);

  return (
    <section
      aria-labelledby="tours-heading"
      className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/[0.07] shadow-(--shadow-rest)"
      data-tour="settings-tours"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight" id="tours-heading">
          Guided tours
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Each page explains itself the first time you open it. Nothing here is a video or a separate site: the tour
          points at the page you are already on, and says what the parts do.
        </p>
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {tours.map((tour) => (
          <li className="flex flex-wrap items-baseline gap-x-2" key={tour.id}>
            {tour.page.includes("[") ? (
              <span className="font-medium">{tour.title}</span>
            ) : (
              <Link className="font-medium underline underline-offset-4 hover:text-primary" href={tour.page}>
                {tour.title}
              </Link>
            )}
            <span className="font-mono text-xs text-muted-foreground">{tour.page}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {available === null ? null : (
          <Button className="h-11" onClick={() => start()} type="button">
            <Compass aria-hidden />
            Take this page&apos;s tour
          </Button>
        )}
        <Button
          className="h-11"
          onClick={() => {
            forgetTours();
            setReset(true);
          }}
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden />
          Show them again
        </Button>
      </div>

      {reset ? (
        <p className="text-xs leading-relaxed text-muted-foreground" role="status">
          Cleared. Each tour will show itself again the next time you open the page it describes.
        </p>
      ) : null}
    </section>
  );
}
