import type { Metadata, Viewport } from "next";

import "./globals.css";

import { AppShell } from "@/components/app-shell";
import { MockModeNotice } from "@/components/ai/mock-mode-notice";
import { SiteFooter } from "@/components/site-footer";
import { summariseAiMode } from "@/lib/env";
import { display, geistMono, geistSans, inter } from "@/lib/fonts";
import { brand, resolveSiteUrl, siteDescription, siteKeywords, siteName, siteTitle, sourceUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: siteTitle,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: siteKeywords,
  authors: [{ name: "Farrely-F", url: sourceUrl }],
  creator: "Farrely-F",
  category: "productivity",
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } },
  // The pages that hold the reader's own records opt out individually; see `privateMetadata`.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.paper },
    { media: "(prefers-color-scheme: dark)", color: brand.ink },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={cn(
        "h-full antialiased",
        display.variable,
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        "font-sans"
      )}
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
