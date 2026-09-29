"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileWarning, Loader2, RefreshCw } from "lucide-react";

import { EngineCacheCard } from "@/components/compile/engine-cache-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  downloadEngineAssets,
  engineAssetTotalBytes,
  engineCacheStatus,
  EngineAssetsMissingError,
  formatBytes,
  type DownloadProgress,
  type EngineCacheStatus,
} from "@/lib/compile/assets";
import { grantConsent, readConsent, type ConsentRecord } from "@/lib/compile/consent";
import { compileResumeTex } from "@/lib/compile/engine";
import type { TexDiagnostics } from "@/lib/compile/errors";
import { texFileName } from "@/lib/tex/generate";

type Phase =
  | { kind: "checking" }
  | { kind: "consent" }
  | { kind: "idle" }
  | { kind: "downloading"; progress: DownloadProgress | null }
  | { kind: "compiling" }
  | { kind: "failed"; message: string; diagnostics: TexDiagnostics; log: string }
  | { kind: "assets-absent"; asset: string }
  | { kind: "download-failed"; message: string };

interface CompiledPdf {
  url: string;
  bytes: number;
  compiledAt: string;
}

/**
 * The gate is decided by two facts, not one: a download needs recorded consent,
 * and a compile needs the assets. Assets that are already cached need neither a
 * download nor consent, so a cached engine compiles without asking again.
 */
function gatePhase(consent: ConsentRecord | null, status: EngineCacheStatus): Phase {
  return consent !== null || status.complete ? { kind: "idle" } : { kind: "consent" };
}

/**
 * Compile the generated LaTeX to a PDF in the browser.
 *
 * The panel is a state machine because every state here has been a way for a
 * compiler UI to lie: a spinner with no end when the assets were never fetched,
 * a blank preview instead of the TeX error, a download that starts without being
 * asked for. So: the consent gate is explicit and states the size, the download
 * reports bytes, a failure says what TeX said and keeps the last good PDF on
 * screen, and a missing asset names the command that fixes it.
 *
 * Compilation itself runs in a Web Worker (see `src/lib/compile/engine.ts`) and
 * only from the Compile action — never on a keystroke.
 */
export function CompilePanel({ title, tex, themeName }: { title: string; tex: string; themeName: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [lastPdf, setLastPdf] = useState<CompiledPdf | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [cacheToken, setCacheToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    engineCacheStatus()
      .then((status) => {
        if (cancelled) {
          return;
        }
        const consent = readConsent();
        setConsentGranted(consent !== null);
        setPhase(gatePhase(consent, status));
      })
      .catch(() => {
        if (!cancelled) {
          setPhase({
            kind: "download-failed",
            message: "This browser refused access to its Cache Storage, so the TeX engine cannot be read or stored.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      setLastPdf((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return null;
      });
    };
  }, []);

  const compile = useCallback(async () => {
    try {
      const status = await engineCacheStatus();
      if (!status.supported) {
        setPhase({
          kind: "download-failed",
          message: "This browser does not expose Cache Storage, so the TeX engine cannot be stored on the device.",
        });
        return;
      }

      // The one rule the whole slice rests on: bytes only move with a recorded
      // decision. The button that gets here from the gate has just recorded it.
      if (!status.complete && readConsent() === null) {
        setPhase({ kind: "consent" });
        return;
      }

      if (!status.complete) {
        setPhase({ kind: "downloading", progress: null });
        const downloaded = await downloadEngineAssets((progress) => setPhase({ kind: "downloading", progress }));
        if (!downloaded.complete) {
          throw new Error(
            `Only ${formatBytes(downloaded.cachedBytes)} of ${formatBytes(engineAssetTotalBytes)} could be stored.`,
          );
        }
        setCacheToken((token) => token + 1);
      }

      setPhase({ kind: "compiling" });
      const outcome = await compileResumeTex({ tex });

      if (!outcome.ok || !outcome.pdf) {
        setPhase({
          kind: "failed",
          message: outcome.failure ?? "The engine did not produce a PDF and its log is empty.",
          diagnostics: outcome.diagnostics,
          log: outcome.log,
        });
        return;
      }

      const blob = new Blob([outcome.pdf as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setLastPdf((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous.url);
        }
        return { url, bytes: blob.size, compiledAt: new Date().toISOString() };
      });
      setPhase({ kind: "idle" });
    } catch (error) {
      if (error instanceof EngineAssetsMissingError) {
        setPhase({ kind: "assets-absent", asset: error.asset });
        return;
      }
      setPhase({
        kind: "download-failed",
        message: `The engine download failed: ${error instanceof Error ? error.message : String(error)} Nothing was stored; the download restarts from the beginning.`,
      });
    }
  }, [tex]);

  function acceptConsent() {
    grantConsent(localStorage, engineAssetTotalBytes);
    setConsentGranted(true);
    void compile();
  }

  /**
   * Re-read the gate after something outside the panel changed consent or the
   * cache: revoking consent or clearing the cache must put the size back in
   * front of the user rather than letting the next click download silently.
   */
  async function refreshGate() {
    const status = await engineCacheStatus();
    const consent = readConsent();
    setConsentGranted(consent !== null);
    setPhase(gatePhase(consent, status));
  }

  const pdfName = texFileName(title).replace(/\.tex$/, ".pdf");

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border/60 p-4" aria-labelledby="compile-heading">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium" id="compile-heading">
          PDF
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Compiling runs in a background worker on this device, with the {themeName} theme and the same generated LaTeX
          shown above. Nothing is uploaded.
        </p>
      </div>

      {phase.kind === "checking" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Checking the browser cache for the TeX engine.
        </p>
      ) : null}

      {phase.kind === "consent" ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3">
          <h3 className="text-sm font-medium">Download the TeX engine first</h3>
          <p className="text-sm leading-relaxed">
            PDF output needs a LaTeX engine stored in this browser:{" "}
            <span className="font-medium">{formatBytes(engineAssetTotalBytes)}</span>, downloaded once and reused for
            every later compile. Nothing has been downloaded yet.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            That is a real cost on a metered or mobile connection — waiting for Wi-Fi is a reasonable choice. You can
            keep editing and download the .tex instead; no download happens without this button.
          </p>
          <div>
            <Button className="h-11" onClick={acceptConsent} type="button">
              Download {formatBytes(engineAssetTotalBytes)} and compile
            </Button>
          </div>
        </div>
      ) : null}

      {phase.kind === "downloading" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm" role="status">
            {phase.progress
              ? `Downloading the TeX engine: ${formatBytes(phase.progress.loadedBytes)} of ${formatBytes(
                  phase.progress.totalBytes,
                )} (${phase.progress.asset})`
              : "Starting the TeX engine download…"}
          </p>
          <progress
            className="h-2 w-full"
            max={phase.progress?.totalBytes ?? engineAssetTotalBytes}
            value={phase.progress?.loadedBytes ?? 0}
          />
        </div>
      ) : null}

      {phase.kind === "compiling" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Compiling with XeLaTeX in a background worker. The first run builds the engine&apos;s filesystem and takes
          longer.
        </p>
      ) : null}

      {phase.kind === "assets-absent" ? (
        <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
          <h3 className="text-sm font-medium">The TeX engine files are not on this server</h3>
          <p className="text-sm leading-relaxed">
            They are gitignored and fetched at build time, so a fresh checkout does not have them. Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm run fetch:tex</code> and reload. The
            file that failed was <span className="font-mono text-xs">{phase.asset}</span>.
          </p>
        </div>
      ) : null}

      {phase.kind === "download-failed" ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
          <p className="text-sm leading-relaxed">{phase.message}</p>
          <div>
            <Button className="h-11" onClick={() => void compile()} type="button" variant="outline">
              <RefreshCw aria-hidden />
              Try the download again
            </Button>
          </div>
        </div>
      ) : null}

      {phase.kind === "failed" ? (
        <div className="flex flex-col gap-3" role="alert">
          <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-start gap-2 text-sm leading-relaxed">
              <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
              {phase.message}
            </p>
            {phase.diagnostics.errors.length > 1 ? (
              <ul className="list-disc pl-5 text-xs leading-relaxed">
                {phase.diagnostics.errors.slice(1).map((error) => (
                  <li key={error.message}>{error.message}</li>
                ))}
              </ul>
            ) : null}
            {phase.diagnostics.warnings.length > 0 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                The engine also logged {phase.diagnostics.warnings.length} warning
                {phase.diagnostics.warnings.length === 1 ? "" : "s"}; the first is{" "}
                <span className="font-mono">{phase.diagnostics.warnings[0].message}</span>.
              </p>
            ) : null}
            <details className="text-xs">
              <summary className="cursor-pointer py-1">Engine output ({phase.log.split("\n").length} lines)</summary>
              <pre className="mt-2 max-h-80 min-w-0 overflow-auto rounded border border-border/60 bg-muted p-2 leading-relaxed">
                <code>{phase.log || "(the engine printed nothing)"}</code>
              </pre>
            </details>
            <div>
              <Button className="h-11" onClick={() => void compile()} type="button" variant="outline">
                <RefreshCw aria-hidden />
                Compile again
              </Button>
            </div>
          </div>
          {lastPdf ? <p className="text-xs text-muted-foreground">The last PDF that compiled is below.</p> : null}
        </div>
      ) : null}

      {phase.kind === "idle" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-11" onClick={() => void compile()} type="button">
            Compile PDF
          </Button>
          {lastPdf ? (
            <a className={cn(buttonVariants({ variant: "outline" }), "h-11")} download={pdfName} href={lastPdf.url}>
              <Download aria-hidden />
              Download PDF
            </a>
          ) : null}
        </div>
      ) : null}

      {lastPdf ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {lastPdf.bytes.toLocaleString()} bytes, compiled {new Date(lastPdf.compiledAt).toLocaleTimeString()}.
          </p>
          <iframe
            className="h-[26rem] w-full rounded-md border border-border/60 bg-white"
            src={lastPdf.url}
            title={`Compiled PDF: ${title}`}
          />
        </div>
      ) : null}

      {phase.kind !== "checking" && phase.kind !== "consent" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {consentGranted
            ? "Engine download consented on this device."
            : "No engine download has been consented to."}
        </p>
      ) : null}

      <EngineCacheCard onCleared={() => void refreshGate()} refreshToken={cacheToken} />
    </section>
  );
}
