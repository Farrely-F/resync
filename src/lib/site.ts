/**
 * What the site says about itself to crawlers, link previews and the browser.
 *
 * One place, so the layout, the landing page, the sitemap, the manifest and the
 * structured data can never drift apart on the name or the description.
 */

export const siteName = "resync";

export const siteTitle = "resync — match a resume to a job, then fix the gap";

/**
 * Kept to 160 characters or fewer: search results cut the description there, and the
 * claim that matters (private, in the browser) has to be inside the cut.
 */
export const siteDescription =
  "Match your resume to a job posting. See the weighted score behind each requirement, fix gaps one suggestion at a time, export LaTeX. Private, in your browser.";

export const sourceUrl = "https://github.com/Farrely-F/resync";

export const siteKeywords = [
  "resume match",
  "resume keyword checker",
  "job description analyzer",
  "ATS resume check",
  "LaTeX resume",
  "resume tailoring",
  "private resume tool",
];

/** Brand colours as hex, because manifests and theme-color tags cannot take oklch. */
export const brand = {
  paper: "#faf9f6",
  ink: "#0f1117",
  accent: "#4a63e7",
} as const;

const localUrl = "http://localhost:3000";

/**
 * The canonical origin, from the first of these that is set:
 * NEXT_PUBLIC_SITE_URL (explicit), VERCEL_PROJECT_PRODUCTION_URL (Vercel's own
 * stable production host), then localhost so a fresh clone still builds.
 *
 * A trailing slash and a missing scheme are both repaired, because either one
 * silently produces broken absolute URLs in every tag that uses this.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): URL {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim() || env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || localUrl;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withScheme.replace(/\/+$/, ""));
  } catch {
    return new URL(localUrl);
  }
}

/** Pages worth indexing. Everything else holds the reader's own data and stays out of search. */
export const indexablePaths = ["/", "/guide"] as const;

/** Routes that render the reader's private records. They carry `noindex`; see `privateMetadata`. */
export const privatePaths = ["/resumes", "/match", "/settings", "/report"] as const;
