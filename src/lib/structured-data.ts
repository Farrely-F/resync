import { siteDescription, siteName, sourceUrl } from "@/lib/site";

/**
 * schema.org description of the app, for the landing page.
 *
 * It states only what is true of the product and checkable on the page: it is a
 * free web application, it runs in the browser, and the source is public. There
 * is deliberately no rating or review block, because there are none to report.
 */
export function webApplicationJsonLd(origin: URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: origin.href,
    description: siteDescription,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    license: "https://www.gnu.org/licenses/agpl-3.0.html",
    sameAs: [sourceUrl],
    featureList: [
      "Weighted match score between a resume and a job posting",
      "Every requirement shown beside the evidence it was checked against",
      "Suggestions applied one at a time",
      "Resume typeset as LaTeX and exported as PDF",
      "Resumes and postings stay in the browser",
    ],
  };
}

/** JSON for a `<script type="application/ld+json">`: `<` is escaped so text can never close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
