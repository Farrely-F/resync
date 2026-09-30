import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteUrl();

  return {
    // The private pages are kept out of results with a `noindex` tag, not here: a crawler blocked by
    // robots.txt never reads the tag, and a blocked URL that is linked to can still be listed bare.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: new URL("/sitemap.xml", origin).href,
    host: origin.origin,
  };
}
