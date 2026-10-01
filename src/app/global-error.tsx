"use client";

import "./globals.css";

import { useEffect } from "react";
import Link from "next/link";

import { describeThrown } from "@/components/system/describe-thrown";
import { StatusScreen } from "@/components/system/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { display, geistMono, geistSans, inter } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/**
 * The last boundary: the root layout itself failed, so this page replaces it
 * and carries its own `<html>` and `<body>`.
 *
 * Two consequences follow from that, and both are deliberate. The stylesheet
 * and the font variables are repeated here, because with no layout there is no
 * `globals.css` import and no `--font-sans` to fall back on. And the shell is a
 * bare centred column — the navigation and the footer belong to the layout this
 * page is standing in for. `next/link` is still safe: Next mounts this boundary
 * inside the router's own context, which the layout's failure does not remove.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { message, digest } = describeThrown(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      className={cn(
        "h-full font-sans antialiased",
        display.variable,
        geistSans.variable,
        geistMono.variable,
        inter.variable,
      )}
      lang="en"
    >
      <body className="min-h-full bg-background text-foreground">
        <div aria-hidden className="aurora" />
        <div className="page-enter mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-12 md:px-6">
          <StatusScreen
            code="500"
            eyebrow="Something broke"
            title="The app could not start"
            description="The shell this app is built on failed before the page could be drawn. Nothing was sent anywhere, and your resumes, postings and reports are still in this browser."
            actions={
              <>
                <Button className="sheen h-11 justify-center" onClick={() => retry()} type="button">
                  Try again
                </Button>
                <Link className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center")} href="/">
                  Back to home
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
        </div>
      </body>
    </html>
  );
}
