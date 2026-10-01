"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";

import { describeThrown } from "@/components/system/describe-thrown";
import { StatusScreen } from "@/components/system/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The boundary around every route below the root layout: a page that throws
 * while rendering is replaced with this instead of the whole document.
 *
 * `retry` is the recovery that matters, and it is offered first — it re-fetches
 * and re-renders the segment, so a failure that was a transient fetch or a
 * stale chunk is fixed by the click. The page never guesses at a cause; it
 * reports what was thrown and nothing more.
 */
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { message, digest } = describeThrown(error);

  useEffect(() => {
    // The boundary is the only place a client render failure can be seen; the
    // server logs it separately when it originated there, under the same digest.
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      eyebrow="Something broke"
      title="This page could not be drawn"
      description="The page threw while rendering and was replaced with this. Nothing was sent anywhere, and your resumes, postings and reports are still in this browser."
      actions={
        <>
          <Button className="sheen group/cta h-11 justify-center" onClick={() => retry()} type="button">
            <RotateCw
              aria-hidden
              className="size-4 transition-transform duration-300 ease-(--ease-out-expo) group-hover/cta:rotate-180"
            />
            Try again
          </Button>
          <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")} href="/">
            Back to home
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </>
      }
      detail={
        message || digest ? (
          <div className="flex flex-col gap-1">
            {message ? <p className="break-words font-mono text-[11px] leading-relaxed">{message}</p> : null}
            {digest ? <p className="font-mono text-[11px]">Reference {digest}</p> : null}
          </div>
        ) : null
      }
    />
  );
}
