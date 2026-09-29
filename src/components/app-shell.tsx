"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Settings, Target } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/resumes", label: "Resumes", Icon: FileText },
  { href: "/match", label: "Match", Icon: Target },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 hidden border-b border-border/60 bg-background/85 backdrop-blur md:block">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <Link className="text-sm font-semibold tracking-tight" href="/">
            resync
          </Link>
          <ul className="flex items-center gap-1 text-sm">
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <Link
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                    isActive(pathname, href) && "bg-muted text-foreground",
                  )}
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 pt-6 md:px-6 md:pb-10">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
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
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground",
                    active && "text-foreground",
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
    </div>
  );
}
