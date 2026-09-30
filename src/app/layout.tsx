import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { MockModeNotice } from "@/components/ai/mock-mode-notice";
import { SiteFooter } from "@/components/site-footer";
import { summariseAiMode } from "@/lib/env";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "resync — match a resume to a job, then fix the gap",
    template: "%s · resync",
  },
  description:
    "Paste a job description, add your resume, and see what the match actually rests on. Runs in your browser: no account, no upload to a server.",
  applicationName: "resync",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn("h-full antialiased", geistSans.variable, geistMono.variable, inter.variable, "font-sans")}
      lang="en"
    >
      <body className="min-h-full bg-background text-foreground">
        <MockModeNotice summary={summariseAiMode()} />
        <AppShell>{children}</AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
