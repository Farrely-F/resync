import type { MetadataRoute } from "next";

import { brand, siteDescription, siteName } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "resync — match a resume to a job",
    short_name: siteName,
    description: siteDescription,
    start_url: "/resumes",
    scope: "/",
    display: "standalone",
    background_color: brand.paper,
    theme_color: brand.paper,
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
