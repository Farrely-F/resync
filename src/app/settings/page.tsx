import type { Metadata } from "next";

import { SliceNotice } from "@/components/slice-notice";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-2 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Storage is shown in two parts: the data you created, and the typesetting engine cached for offline
        compiles. Each one is cleared separately, because only one of them is cheap to undo.
      </p>
      <SliceNotice issue={10}>
        Storage accounting, exports and the destructive-action confirmations land with slice S10.
      </SliceNotice>
    </div>
  );
}
