"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";

import { accountStorage } from "@/components/exports/accounting";
import { DangerZone } from "@/components/exports/danger-zone";
import { ExportsPanel } from "@/components/exports/exports-panel";
import { StoragePanel } from "@/components/exports/storage-panel";
import { getStorage } from "@/lib/storage";
import type { MatchReport } from "@/lib/match/types";
import type { JdRecord, ResumeRecord, StorageEstimate } from "@/lib/storage/types";

/**
 * Settings, as one read of everything stored plus a way to re-read it.
 *
 * Records live in IndexedDB, so all four reads happen on mount and after every
 * change. The storage figure is derived from the records this page already holds
 * rather than from a second storage API, which is what keeps the meter and the
 * delete prompts talking about the same bytes.
 */

interface Stored {
  resumes: ResumeRecord[];
  jds: JdRecord[];
  reports: MatchReport[];
  estimate: StorageEstimate;
}

type WorkspaceState =
  | { status: "loading" }
  | { status: "ready"; stored: Stored }
  | { status: "unavailable"; message: string };

export function SettingsWorkspace() {
  const [state, setState] = useState<WorkspaceState>({ status: "loading" });

  const read = useCallback(async () => {
    const storage = getStorage();
    const [resumes, jds, reports, estimate] = await Promise.all([
      storage.listResumes(),
      storage.listJds(),
      storage.listReports(),
      storage.estimate(),
    ]);

    return { resumes, jds, reports, estimate };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState({ status: "ready", stored: await read() });
    } catch (caught) {
      setState({
        status: "unavailable",
        message: caught instanceof Error ? caught.message : "Could not read this browser's local database.",
      });
    }
  }, [read]);

  useEffect(() => {
    let cancelled = false;

    read().then(
      (stored) => {
        if (!cancelled) {
          setState({ status: "ready", stored });
        }
      },
      (caught: unknown) => {
        if (!cancelled) {
          setState({
            status: "unavailable",
            message: caught instanceof Error ? caught.message : "Could not read this browser's local database.",
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [read]);

  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Reading what this browser stores.
      </p>
    );
  }

  if (state.status === "unavailable") {
    return (
      <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          This browser refused access to its local database, so nothing stored can be shown or cleared here:{" "}
          {state.message}
        </span>
      </p>
    );
  }

  const { stored } = state;

  return (
    <div className="flex flex-col gap-8">
      <ExportsPanel records={stored.resumes} />
      <StoragePanel breakdown={accountStorage(stored)} estimate={stored.estimate} onChanged={() => void refresh()} />
      <DangerZone
        breakdown={accountStorage(stored)}
        jds={stored.jds}
        onChanged={refresh}
        reports={stored.reports}
        resumes={stored.resumes}
      />
    </div>
  );
}
