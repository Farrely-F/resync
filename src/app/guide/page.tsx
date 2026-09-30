import type { Metadata } from "next";

import { publicMetadata } from "@/lib/seo";
import { GuideWorkspace } from "@/components/guide/guide-workspace";

const description =
  "Walk the whole flow on a sample: add a resume, read a posting, run the match, open the report and write the documents. Each step reports what actually happened.";

export const metadata: Metadata = {
  title: "Guide",
  description,
  ...publicMetadata({ path: "/guide", title: "Guide", ogTitle: "Guide · resync", description }),
};

/**
 * The guide: the app's primary flow, walked through rather than described.
 *
 * It is a real page with real state — the sample resume it adds is a real resume
 * in this browser's library, and the steps finish when the records they ask about
 * exist. Nothing here is a simulation of the app; it is the app, in order.
 */
export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="title">Guide</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          The flow this app is built around — a resume, a posting, a match, the report, then the documents — done here
          rather than described. Each step states what it needs, and reports what actually happened.
        </p>
      </div>
      <GuideWorkspace />
    </div>
  );
}
