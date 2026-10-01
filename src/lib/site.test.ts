import { describe, expect, it } from "vitest";

import { indexablePaths, privatePaths, resolveSiteUrl, siteDescription } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("prefers the explicit site URL", () => {
    const url = resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://resync.example",
      VERCEL_PROJECT_PRODUCTION_URL: "resync.vercel.app",
    });
    expect(url.origin).toBe("https://resync.example");
  });

  it("falls back to Vercel's production host and adds the scheme it omits", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "resync.vercel.app" }).origin).toBe(
      "https://resync.vercel.app",
    );
  });

  it("strips a trailing slash so joined paths do not double up", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://resync.example///" }).href).toBe("https://resync.example/");
  });

  it("uses localhost when nothing is configured or the value is unusable", () => {
    expect(resolveSiteUrl({}).origin).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://" }).origin).toBe("http://localhost:3000");
  });
});

describe("site copy and paths", () => {
  it("keeps the description inside what a search result shows", () => {
    expect(siteDescription.length).toBeLessThanOrEqual(160);
  });

  it("never lists a private route as indexable", () => {
    const hidden: readonly string[] = privatePaths;
    const indexable: readonly string[] = indexablePaths;

    for (const path of indexable) {
      expect(hidden.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))).toBe(false);
    }
  });
});
