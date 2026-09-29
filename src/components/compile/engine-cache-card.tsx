"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  clearEngineCache,
  engineCacheStatus,
  engineAssetTotalBytes,
  formatBytes,
  type EngineCacheStatus,
} from "@/lib/compile/assets";
import { readConsent, revokeConsent, type ConsentRecord } from "@/lib/compile/consent";
import { disposeRunner } from "@/lib/compile/engine";

/**
 * What the TeX engine costs this device, and how to get rid of it.
 *
 * Cache Storage is opaque to the user and survives a reload, so the only honest
 * thing to do is show the size and offer to clear it with the re-download cost
 * stated up front. It is a standalone card rather than part of the compile panel
 * because Settings (slice S10) hosts the same control.
 *
 * `refreshToken` is the caller saying "the cache changed outside this card":
 * bump it after a download so the size is not stale.
 */
export function EngineCacheCard({ onCleared, refreshToken = 0 }: { onCleared?: () => void; refreshToken?: number }) {
  const [status, setStatus] = useState<EngineCacheStatus | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setStatus(await engineCacheStatus());
    setConsent(readConsent());
  }

  useEffect(() => {
    let cancelled = false;

    engineCacheStatus()
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
          setConsent(readConsent());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  async function clear() {
    setBusy(true);
    try {
      await clearEngineCache();
      disposeRunner();
      setConfirming(false);
      await refresh();
      onCleared?.();
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      revokeConsent();
      await clearEngineCache();
      disposeRunner();
      await refresh();
      onCleared?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border/60 p-4">
      <h2 className="text-sm font-medium">TeX engine on this device</h2>

      {status === null ? (
        <p className="text-xs text-muted-foreground" role="status">
          Checking the browser cache.
        </p>
      ) : !status.supported ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          This browser does not expose Cache Storage, so the engine cannot be stored on the device. Compiling a PDF
          is not available here.
        </p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {status.complete ? (
              <>
                Cached: <span className="font-medium text-foreground">{formatBytes(status.cachedBytes)}</span>. Later
                compiles read these files from the browser cache and download nothing. This counts the engine only;
                the storage figure under Settings also covers saved resumes.
              </>
            ) : status.cachedBytes > 0 ? (
              <>
                Incomplete: {formatBytes(status.cachedBytes)} of {formatBytes(engineAssetTotalBytes)} stored.{" "}
                {status.missing.length} file{status.missing.length === 1 ? "" : "s"} still to download.
              </>
            ) : (
              <>Nothing cached yet. The engine is {formatBytes(engineAssetTotalBytes)} and is downloaded on first use.</>
            )}
          </p>

          {consent ? (
            <p className="text-xs text-muted-foreground">
              Download agreed on {new Date(consent.grantedAt).toLocaleDateString()} for {formatBytes(consent.bytes)}.
            </p>
          ) : null}

          {confirming ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm">
                Clear the cached engine? {formatBytes(engineAssetTotalBytes)} is removed from this browser and must be
                downloaded again before the next compile.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button className="h-11" disabled={busy} onClick={() => setConfirming(false)} type="button" variant="outline">
                  Keep it
                </Button>
                <Button className="h-11" disabled={busy} onClick={() => void clear()} type="button" variant="destructive">
                  {busy ? "Clearing…" : "Clear engine cache"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                className="h-11 sm:h-9"
                disabled={busy || status.cachedBytes === 0}
                onClick={() => setConfirming(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear engine cache
              </Button>
              {consent ? (
                <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void revoke()} size="sm" type="button" variant="ghost">
                  Revoke download consent
                </Button>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}
