import type { Metadata } from "next";

import { siteName } from "@/lib/site";

/**
 * Metadata for a page that renders the reader's own records.
 *
 * Their resumes, postings and reports live in this browser, so the page a
 * crawler fetches is an empty shell at best; indexing it would list a screen
 * that means nothing to a stranger. `noindex` keeps it out of results while
 * `follow: false` stops crawlers from chasing the per-record links either.
 */
export function privateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * Canonical and Open Graph fields for a page that should be found.
 *
 * `openGraph` replaces the layout's object rather than merging into it, so the
 * name, type and description have to be repeated here or they silently vanish
 * from that page's link preview.
 */
export function publicMetadata(page: { path: string; title: string; description: string; ogTitle?: string }): Metadata {
  return {
    alternates: { canonical: page.path },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_US",
      url: page.path,
      title: page.ogTitle ?? page.title,
      description: page.description,
    },
  };
}
