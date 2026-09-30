import { describe, expect, it } from "vitest";

import { privateMetadata, publicMetadata } from "@/lib/seo";

describe("privateMetadata", () => {
  it("keeps a page out of results and does not ask crawlers to follow it", () => {
    const meta = privateMetadata("Match", "Match a resume.");

    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(meta.title).toBe("Match");
  });

  it("sets no canonical, which would contradict the noindex", () => {
    expect(privateMetadata("Match", "x").alternates).toBeUndefined();
  });
});

describe("publicMetadata", () => {
  it("names the page itself as canonical and repeats the site name in the preview", () => {
    const meta = publicMetadata({ path: "/guide", title: "Guide", ogTitle: "Guide · resync", description: "d" });

    expect(meta.alternates?.canonical).toBe("/guide");
    expect(meta.openGraph).toMatchObject({ url: "/guide", siteName: "resync", title: "Guide · resync", description: "d" });
  });
});
