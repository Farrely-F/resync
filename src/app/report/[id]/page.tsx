import type { Metadata } from "next";

import { SliceNotice } from "@/components/slice-notice";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-2 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Match report</h1>
      <p className="text-sm text-muted-foreground">
        Report <span className="font-mono text-foreground">{id}</span>
      </p>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        The report shows the computed percentage, which requirements are covered and which are missing, and each
        suggestion with the requirement it addresses.
      </p>
      <SliceNotice issue={4}>Scoring, caching and the report view land with slice S4.</SliceNotice>
    </div>
  );
}
