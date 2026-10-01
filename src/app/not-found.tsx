import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatusScreen } from "@/components/system/status-screen";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That address is not one of this app's pages.",
  robots: { index: false, follow: false },
};

/**
 * The 404, for both a `notFound()` call and an address that matches no route.
 *
 * The second sentence is the one worth having: this app keeps resumes and
 * reports in the browser that made them, so a link copied from another device
 * leads to a page that never existed rather than one that was lost — which is
 * exactly what a stranger would read a bare "Not Found" as.
 */
export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      eyebrow="Not found"
      title="There is nothing at this address"
      description={
        <>
          The link may be mistyped, or it may point at a resume or report from another browser. Those records never
          leave the one that made them, so an address copied from a different device leads to a page that was never
          here.
        </>
      }
      actions={
        <>
          <Link className={cn(buttonVariants({ size: "lg" }), "sheen group/cta justify-center")} href="/">
            Back to home
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-300 ease-(--ease-out-expo) group-hover/cta:translate-x-1"
            />
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")} href="/match">
            Start a match
          </Link>
        </>
      }
    />
  );
}
