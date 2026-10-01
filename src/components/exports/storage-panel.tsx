"use client";

import { EngineCacheCard } from "@/components/compile/engine-cache-card";
import type { StorageBreakdown } from "@/components/exports/accounting";
import { formatBytes } from "@/lib/compile/assets";
import type { StorageEstimate } from "@/lib/storage/types";

/**
 * What this device is holding, in two scopes that are never added together.
 *
 * The first figure is measured here, record by record, so it can be attributed to
 * a store and explained. The second is the browser's own number for the whole
 * origin, which mixes the cached TeX engine with the saved records and cannot be
 * split; it is shown as the browser reports it, including when it reports nothing
 * at all. A missing quota API says "unknown", never zero.
 */

function StoreRow({ label, size }: { label: string; size: { count: number; bytes: number } }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border/60 py-2 first:border-t-0">
      <span className="text-sm">
        {label}
        <span className="text-muted-foreground"> ({size.count})</span>
      </span>
      <span className="font-mono text-xs tabular-nums">{formatBytes(size.bytes)}</span>
    </div>
  );
}

export function StoragePanel({
  breakdown,
  estimate,
  onChanged,
}: {
  breakdown: StorageBreakdown;
  estimate: StorageEstimate;
  onChanged: () => void;
}) {
  const percent = estimate.supported && estimate.quotaBytes ? (estimate.usageBytes / estimate.quotaBytes) * 100 : null;

  return (
    <section aria-labelledby="storage-heading" className="flex flex-col gap-4" data-tour="settings-storage">
      <h2 className="text-lg font-semibold tracking-tight" id="storage-heading">
        Storage on this device
      </h2>

      <div className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Your data</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Measured here, by serialising each stored record as JSON. This is resync&apos;s own count, so it can be
            split by store and checked against the records below. It leaves out IndexedDB&apos;s per-record overhead,
            which the browser does not expose.
          </p>
        </div>

        {breakdown.totalRecords === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            Nothing is stored: no resumes, job descriptions, match reports or documents. A new resume, posting or
            analysis adds to the figures below.
          </p>
        ) : null}

        <div className="flex flex-col">
          <StoreRow label="Resumes" size={breakdown.resumes} />
          <StoreRow label="Job descriptions" size={breakdown.jds} />
          <StoreRow label="Match reports" size={breakdown.reports} />
          <StoreRow label="Letters and prep" size={breakdown.documents} />
          <div className="flex items-baseline justify-between gap-4 border-t border-border py-2">
            <span className="text-sm font-medium">
              Total<span className="text-muted-foreground"> ({breakdown.totalRecords})</span>
            </span>
            <span className="font-mono text-xs font-medium tabular-nums">{formatBytes(breakdown.totalBytes)}</span>
          </div>
        </div>
      </div>

      <EngineCacheCard onCleared={onChanged} />

      <div className="flex flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4">
        <h3 className="text-sm font-medium">Browser-reported usage for this origin</h3>
        {!estimate.supported ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            This browser exposes no storage-quota API (<code className="font-mono">navigator.storage.estimate</code>),
            so origin-wide usage and quota are unknown here — not zero. The figures above are measured by resync and
            are unaffected by this.
          </p>
        ) : (
          <>
            <p className="text-sm">
              Used: <span className="font-mono tabular-nums">{formatBytes(estimate.usageBytes)}</span>
              {estimate.quotaBytes === null ? (
                <span className="text-muted-foreground"> · quota not reported by this browser</span>
              ) : (
                <>
                  {" "}
                  of <span className="font-mono tabular-nums">{formatBytes(estimate.quotaBytes)}</span>
                  {percent === null ? null : (
                    <span className="text-muted-foreground"> ({percent < 0.1 ? "<0.1" : percent.toFixed(1)}%)</span>
                  )}
                </>
              )}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This is the browser&apos;s figure for the whole origin, so it covers the cached TeX engine as well as the
              stored records, plus the browser&apos;s own bookkeeping. It cannot be split per store, which is why the
              breakdown above is measured rather than taken from here.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
