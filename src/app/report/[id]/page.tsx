import type { Metadata } from "next";

import { ReportView } from "@/components/match/report-view";
import { ReportAdjustments } from "@/components/suggestions/report-adjustments";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="title">Match report</h1>
        <p className="text-sm text-muted-foreground">
          Report <span className="font-mono text-foreground">{id}</span>
        </p>
      </div>
      <ReportAdjustments id={id}>
        <ReportView id={id} />
      </ReportAdjustments>
    </div>
  );
}
