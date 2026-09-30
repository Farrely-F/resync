"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Settings, Target } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/resumes", label: "Resumes", Icon: FileText },
  { href: "/match", label: "Match", Icon: Target },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

const glide = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark() {
  return (
    <Link className="group flex items-center gap-2 pl-1 pr-2 text-[15px] font-semibold tracking-tight" href="/">
      <span
        aria-hidden
        className="relative grid size-6 place-items-center rounded-[8px] bg-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_4px_10px_-2px_oklch(0.5_0.22_264/0.6)] transition-transform duration-500 ease-(--ease-spring) group-hover:rotate-[-8deg] group-hover:scale-110"
      >
        <svg className="size-3.5 text-primary-foreground" fill="none" viewBox="0 0 16 16">
          <path
            d="M3 5.5h7.5a2.5 2.5 0 0 1 0 5H5.5m0 0L7.5 8.5M5.5 10.5l2 2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      resync
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden className="aurora" />

      <header className="sticky top-3 z-30 mx-auto hidden w-full max-w-5xl px-6 md:block">
        <LayoutGroup id="top-nav">
          <nav className="flex h-12 items-center gap-2 rounded-full border border-white/60 bg-background/70 px-2 shadow-(--shadow-lift) ring-1 ring-foreground/[0.06] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10">
            <Wordmark />
            <ul className="ml-auto flex items-center gap-0.5 text-sm">
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
                        active && "text-foreground",
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
              className="ml-1 hidden h-8 items-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-[transform,opacity] duration-300 ease-(--ease-out-expo) hover:scale-[1.04] active:scale-95 lg:inline-flex"
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
          className="fixed inset-x-4 bottom-3 z-30 rounded-[28px] border border-white/60 bg-background/75 shadow-(--shadow-float) ring-1 ring-foreground/[0.06] backdrop-blur-2xl backdrop-saturate-150 md:hidden dark:border-white/10"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="grid grid-cols-3 p-1.5">
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
                      active && "text-primary",
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
  );
}
