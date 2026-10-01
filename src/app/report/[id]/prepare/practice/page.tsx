import type { Metadata } from "next";
import Link from "next/link";

import { PracticeSessionView } from "@/components/practice/practice-session";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Mock interview", "Practise the interview for a match, one question at a time, with feedback on each answer.");

/**
 * A mock interview for one match: the questions from the report's interview prep,
 * asked one at a time, each answer judged and scored. Everything stays in this browser.
 */
export default async function PracticePage({ params }: PageProps<"/report/[id]/prepare/practice">) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" href={`/report/${id}`}>
            Match report
          </Link>{" "}
          /{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href={`/report/${id}/prepare`}>
            Prepare
          </Link>
        </p>
        <h1 className="title">Mock interview</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Answer each question in your own words. You get feedback on the answer, a score computed from what the interviewer
          judged, and a read on how confident the wording sounds.
        </p>
      </div>

      <PracticeSessionView reportId={id} />
    </div>
  );
}
