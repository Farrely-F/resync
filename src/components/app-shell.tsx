"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, FileText, Settings, Target } from "lucide-react";

import { GuidedTour } from "@/components/tour/guided-tour";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/resumes", label: "Resumes", Icon: FileText },
  { href: "/match", label: "Match", Icon: Target },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

const glide = { type: "spring", stiffness: 500, damping: 38, mass: 0.7 } as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <Link aria-label="resync, home" className="group flex items-center gap-2" href="/">
      <svg aria-hidden className="mark size-[22px] overflow-visible" fill="none" viewBox="0 0 22 22">
        <rect
          className="page-back"
          height="14"
          rx="2.5"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          width="11"
          x="3"
          y="2.5"
        />
        <g className="page-front">
          <rect fill="var(--background)" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" width="11" x="8" y="6.5" />
          <path d="M10.5 10.5h6M10.5 13.5h4" stroke="var(--primary)" strokeLinecap="round" strokeWidth="1.5" />
        </g>
      </svg>
      <span className="font-display text-[26px] leading-none tracking-[-0.01em] italic">resync</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // The tour sits above the shell so its overlay covers the navigation it is
    // explaining, not just the page content.
    <GuidedTour>
      <div className="flex min-h-dvh flex-col">
        <div aria-hidden className="aurora" />

        <header className="masthead sticky top-0 z-30 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-5 md:px-6">
            <Wordmark />
            <LayoutGroup id="masthead">
              <nav aria-label="Primary" className="ml-auto hidden md:block">
                <ul className="flex items-center gap-7 text-[13px] font-medium">
                  {navItems.map(({ href, label }) => {
                    const active = isActive(pathname, href);
                    return (
                      <li className="relative" key={href}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block py-2 text-muted-foreground transition-colors duration-200 hover:text-foreground",
                            active && "text-foreground",
                          )}
                          href={href}
                        >
                          {label}
                        </Link>
                        {active && (
                          <motion.span
                            aria-hidden
                            className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-foreground"
                            layoutId="masthead-rule"
                            transition={glide}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </LayoutGroup>
            <Link
              className="group/new ml-auto flex items-center gap-1 text-[13px] font-medium text-primary md:ml-0"
              href="/match"
            >
              <span className="underline decoration-primary/0 decoration-1 underline-offset-[5px] transition-[text-decoration-color] duration-300 group-hover/new:decoration-primary">
                New match
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-3.5 transition-transform duration-300 ease-(--ease-out-expo) group-hover/new:translate-x-0.5 group-hover/new:-translate-y-0.5"
              />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-8 md:px-6 md:pb-16 md:pt-12">{children}</main>

        <LayoutGroup id="tabs">
          <nav
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="grid grid-cols-3">
              {navItems.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li className="relative" key={href}>
                    {active && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-x-6 -top-px h-[2px] rounded-full bg-foreground"
                        layoutId="tab-rule"
                        transition={glide}
                      />
                    )}
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                        active && "text-foreground",
                      )}
                      href={href}
                    >
                      <Icon aria-hidden className="size-5" strokeWidth={active ? 2.2 : 1.6} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </LayoutGroup>
      </div>
    </GuidedTour>
  );
}
