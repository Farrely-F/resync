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
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden className="aurora" />

      {/* Global bar: full width, frosted, one hairline. Saturation is lifted so the colour behind it stays alive. */}
      <header className="sticky top-0 z-30 hidden border-b border-foreground/[0.08] bg-background/72 backdrop-blur-xl backdrop-saturate-[1.8] md:block">
        <LayoutGroup id="top-nav">
          <nav className="relative mx-auto flex h-12 max-w-5xl items-center px-6">
            <Wordmark />
            <ul className="absolute left-1/2 flex h-full -translate-x-1/2 items-stretch text-[13px]">
              {navItems.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <li className="relative" key={href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-full items-center px-4 font-medium tracking-[-0.01em] text-foreground/60 transition-colors duration-200 hover:text-foreground",
                        active && "text-foreground",
                      )}
                      href={href}
                    >
                      {label}
                    </Link>
                    {active && (
                      <motion.span
                        className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-foreground"
                        layoutId="top-nav-line"
                        transition={glide}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <Link
              className="ml-auto inline-flex h-7 items-center rounded-full bg-primary px-3.5 text-[12px] font-medium text-primary-foreground transition-[transform,background-color] duration-300 ease-(--ease-out-expo) hover:bg-[color-mix(in_oklch,var(--primary),white_10%)] active:scale-95"
              href="/match"
            >
              New match
            </Link>
          </nav>
        </LayoutGroup>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-32 pt-10 md:px-6 md:pb-16 md:pt-14">{children}</main>

      {/* Tab bar: flush to the edges like the system one, blurred, with the home indicator's space reserved. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/[0.08] bg-background/72 backdrop-blur-xl backdrop-saturate-[1.8] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-3">
          {navItems.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-[52px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-[0.01em] text-foreground/50 transition-colors duration-200",
                    active && "text-primary",
                  )}
                  href={href}
                >
                  <Icon
                    aria-hidden
                    className="size-[22px] transition-transform duration-300 ease-(--ease-out-expo) group-active:scale-90"
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
