import type { Metadata } from "next";

import { SettingsWorkspace } from "@/components/exports/settings-workspace";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="title">Settings</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Everything resync keeps is on this device, and this page is where you can see it, take it out and remove it.
          Storage is shown in two parts — the records you created, and the typesetting engine cached for offline
          compiles — because only one of them is cheap to undo.
        </p>
      </div>
      <SettingsWorkspace />
    </div>
  );
}
