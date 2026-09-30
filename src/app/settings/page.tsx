import type { Metadata } from "next";

import { TourLauncher } from "@/components/tour/tour-launcher";
import { SettingsWorkspace } from "@/components/exports/settings-workspace";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = privateMetadata("Settings", "What resync stores on this device, and how to export or delete it.");

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="title">Settings</h1>
          <TourLauncher />
        </div>
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
