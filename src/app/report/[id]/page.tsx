import type { Metadata } from "next";

import { ReportView } from "@/components/match/report-view";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Match report</h1>
        <p className="text-sm text-muted-foreground">
          Report <span className="font-mono text-foreground">{id}</span>
        </p>
      </div>
      <ReportView id={id} />
    </div>
  );
}
