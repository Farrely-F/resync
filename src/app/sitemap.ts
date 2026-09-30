import type { MetadataRoute } from "next";

import { indexablePaths, resolveSiteUrl } from "@/lib/site";

const priorities: Record<(typeof indexablePaths)[number], number> = { "/": 1, "/guide": 0.6 };
const frequencies: Record<(typeof indexablePaths)[number], "weekly" | "monthly"> = {
  "/": "weekly",
  "/guide": "monthly",
};

/** Only the pages that mean something to a stranger; the rest hold the reader's own records. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = resolveSiteUrl();

  return indexablePaths.map((path) => ({
    url: new URL(path, origin).href,
    changeFrequency: frequencies[path],
    priority: priorities[path],
  }));
}
