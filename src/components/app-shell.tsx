"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FileText, Settings, Target } from "lucide-react";

import { GuidedTour } from "@/components/tour/guided-tour";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/resumes", label: "Resumes", Icon: FileText },
  { href: "/match", label: "Match", Icon: Target },
  { href: "/guide", label: "Guide", Icon: Compass },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

const glide = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.7,
} as const;

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
          <rect
            fill="var(--background)"
            height="14"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.5"
            width="11"
            x="8"
            y="6.5"
          />
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

        <header className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-30 mx-auto w-full max-w-5xl px-4 md:px-6">
          <LayoutGroup id="top-nav">
            <nav className="flex h-12 items-center gap-2 rounded-full border border-white/60 bg-background/95 px-2 shadow-(--shadow-lift) ring-1 ring-foreground/[0.06] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10">
              <Wordmark />
              <ul className="ml-auto hidden items-center gap-0.5 text-sm md:flex">
                {navItems.map(({ href, label }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li className="relative" key={href}>
                      {active && (
                        <motion.span
                          className="absolute inset-0 rounded-full bg-foreground/[0.07] ring-1 ring-foreground/[0.06]"
                          layoutId="top-nav-pill"
                          transition={glide}
                        />
                      )}
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative block rounded-full px-4 py-1.5 font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground",
                          active && "text-foreground"
                        )}
                        href={href}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                className="ml-auto inline-flex h-8 items-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-[transform,opacity] duration-300 ease-(--ease-out-expo) hover:scale-[1.04] active:scale-95 md:ml-1"
                href="/match"
              >
                New match
              </Link>
            </nav>
          </LayoutGroup>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-32 pt-8 md:px-6 md:pb-16 md:pt-12">{children}</main>

        <LayoutGroup id="dock">
          <nav
            aria-label="Primary"
            className="fixed inset-x-4 bottom-3 z-30 rounded-[28px] border border-white/60 bg-background/95 shadow-(--shadow-float) ring-1 ring-foreground/[0.06] backdrop-blur-2xl backdrop-saturate-150 md:hidden dark:border-white/10"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="grid grid-cols-4 p-1.5">
              {navItems.map(({ href, label, Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li className="relative" key={href}>
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-[22px] bg-primary/12"
                        layoutId="dock-pill"
                        transition={glide}
                      />
                    )}
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
                        active && "text-primary"
                      )}
                      href={href}
                    >
                      <Icon aria-hidden className="size-5" />
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
