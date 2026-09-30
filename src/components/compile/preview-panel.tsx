"use client";

import { Download, FileWarning, Loader2, RefreshCw, Zap } from "lucide-react";

import { EngineCacheCard } from "@/components/compile/engine-cache-card";
import { CollapsibleSection } from "@/components/editor/collapsible-section";
import type { CompileEngine } from "@/components/compile/use-compile-engine";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { engineAssetTotalBytes, formatBytes } from "@/lib/compile/assets";
import { texFileName } from "@/lib/tex/generate";

/**
 * The document as it will look: the compiled PDF, and everything the compile needs.
 *
 * This is the only place that shows a PDF, which is the point — the preview and
 * the download used to be two views of "the PDF", and one of them would have gone
 * stale first. The compile state comes from `useCompileEngine`, so the explicit
 * button, the live preview and the diagnostics are the same state machine.
 *
 * The panel is explicit about which PDF is on screen: when it is older than the
 * document, it says so rather than letting the reader trust a stale page.
 */
export function PreviewPanel({
  engine,
  tex,
  title,
  themeName,
  source,
  live,
  onLiveChange,
}: {
  engine: CompileEngine;
  /** The document as it stands, to tell a current preview from a stale one. */
  tex: string;
  title: string;
  themeName: string;
  source: "generated" | "manual";
  live: boolean;
  onLiveChange: (live: boolean) => void;
}) {
  const { phase, problems, blocked, lastPdf, compiledTex, consentGranted, engineReady } = engine;
  const stale = lastPdf !== null && compiledTex !== tex;
  const compiling = phase.kind === "compiling";
  const pdfName = texFileName(title).replace(/\.tex$/, ".pdf");

  const summary = compiling
    ? "compiling…"
    : lastPdf === null
      ? "nothing compiled yet"
      : stale
        ? "one change behind"
        : "up to date";

  return (
    <CollapsibleSection
      actions={
        <>
          <Toggle
            aria-label="Compile as the fields change"
            className="h-11 px-3"
            onPressedChange={onLiveChange}
            pressed={live}
            variant={live ? "outline" : "default"}
          >
            <Zap aria-hidden />
            Live
          </Toggle>
          {lastPdf ? (
            <a
              className={cn(buttonVariants({ variant: "outline" }), "h-11")}
              download={pdfName}
              href={lastPdf.url}
            >
              <Download aria-hidden />
              PDF
            </a>
          ) : null}
        </>
      }
      summary={summary}
      title="Preview"
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        {source === "manual"
          ? "Compiling runs in a background worker on this device, from the hand-edited LaTeX saved with this resume — the same text its .tex export writes. Nothing is uploaded."
          : `Compiling runs in a background worker on this device, with the ${themeName} theme, from the same generated LaTeX shown above. Nothing is uploaded.`}
      </p>

      {blocked ? (
        <div className="mt-3">
          <Alert variant="destructive">
            <AlertTitle>
              {problems.length === 1 ? "One problem to fix first" : `${problems.length} problems to fix first`}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 text-xs leading-relaxed">
                {problems.map((problem) => (
                  <li key={`${problem.line}-${problem.column}-${problem.kind}`}>
                    Line {problem.line}: {problem.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-relaxed">
                The TeX engine has not been started: it reads a document from the top and stops at the first of these,
                and the line it stops on is rarely the one that caused it.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {phase.kind === "checking" ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Checking the browser cache for the TeX engine.
        </p>
      ) : null}

      {phase.kind === "consent" ? (
        <div className="mt-3">
          <Alert>
            <AlertTitle>Download the TeX engine first</AlertTitle>
            <AlertDescription>
              <p>
                PDF output needs a LaTeX engine stored in this browser:{" "}
                <span className="font-medium">{formatBytes(engineAssetTotalBytes)}</span>, downloaded once and reused
                for every later compile. Nothing has been downloaded yet.
              </p>
              <p>
                That is a real cost on a metered or mobile connection — waiting for Wi-Fi is a reasonable choice. You
                can keep editing and download the .tex instead; no download happens without this button.
              </p>
              <div className="mt-3">
                <Button className="h-11" disabled={blocked} onClick={engine.acceptConsent} type="button">
                  Download {formatBytes(engineAssetTotalBytes)} and compile
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {phase.kind === "downloading" ? (
        <div className="mt-3 flex flex-col gap-2">
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

      {compiling ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Compiling with XeLaTeX in a background worker. The first run builds the engine&apos;s filesystem and takes
          longer.
        </p>
      ) : null}

      {phase.kind === "assets-absent" ? (
        <div className="mt-3">
          <Alert variant="destructive">
            <AlertTitle>The TeX engine files are not on this server</AlertTitle>
            <AlertDescription>
              They are gitignored and fetched at build time, so a fresh checkout does not have them. Run{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm run fetch:tex</code> and reload. The
              file that failed was <span className="font-mono text-xs">{phase.asset}</span>.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {phase.kind === "download-failed" ? (
        <div className="mt-3">
          <Alert variant="destructive">
            <AlertDescription>
              <p>{phase.message}</p>
              <div className="mt-3">
                <Button
                  className="h-11"
                  disabled={blocked}
                  onClick={engine.compile}
                  type="button"
                  variant="outline"
                >
                  <RefreshCw aria-hidden />
                  Try the download again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {phase.kind === "failed" ? (
        <div className="mt-3">
          <Alert variant="destructive">
            <FileWarning aria-hidden />
            <AlertTitle>{phase.message}</AlertTitle>
            <AlertDescription>
              {phase.diagnostics.errors.length > 1 ? (
                <ul className="list-disc pl-5 text-xs leading-relaxed">
                  {phase.diagnostics.errors.slice(1).map((error) => (
                    <li key={error.message}>{error.message}</li>
                  ))}
                </ul>
              ) : null}
              {phase.diagnostics.warnings.length > 0 ? (
                <p className="text-xs leading-relaxed">
                  The engine also logged {phase.diagnostics.warnings.length} warning
                  {phase.diagnostics.warnings.length === 1 ? "" : "s"}; the first is{" "}
                  <span className="font-mono">{phase.diagnostics.warnings[0].message}</span>.
                </p>
              ) : null}
              <details className="text-xs">
                <summary className="cursor-pointer py-1">
                  Engine output ({phase.log.split("\n").length} lines)
                </summary>
                <pre className="mt-2 max-h-80 min-w-0 overflow-auto rounded border border-border/60 bg-muted p-2 leading-relaxed">
                  <code>{phase.log || "(the engine printed nothing)"}</code>
                </pre>
              </details>
              <div className="mt-3">
                <Button className="h-11" disabled={blocked} onClick={engine.compile} type="button" variant="outline">
                  <RefreshCw aria-hidden />
                  Compile again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {lastPdf ? (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {lastPdf.bytes.toLocaleString()} bytes, compiled {new Date(lastPdf.compiledAt).toLocaleTimeString()}.
              {stale && !compiling
                ? live
                  ? " The preview is from before your last change."
                  : " Your last change is not in this preview: live preview is off."
                : null}
            </p>
            <iframe
              className="h-80 w-full rounded-md border border-border/60 bg-white sm:h-[28rem] lg:h-[36rem]"
              src={lastPdf.url}
              title={`Compiled PDF: ${title}`}
            />
          </div>
        </>
      ) : null}

      {phase.kind !== "checking" && phase.kind !== "consent" ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {consentGranted ? "Engine download consented on this device." : "No engine download has been consented to."}
          {engineReady
            ? live
              ? " Live preview compiles when you stop typing."
              : " Live preview is off; compile when you want to."
            : ""}
        </p>
      ) : null}

      {phase.kind === "idle" || phase.kind === "compiling" || phase.kind === "failed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button className="h-11" disabled={blocked} onClick={engine.compile} type="button" variant="outline">
            Compile PDF
          </Button>
        </div>
      ) : null}

      <div className="mt-3">
        <EngineCacheCard onCleared={engine.refreshGate} refreshToken={engine.cacheToken} />
      </div>
    </CollapsibleSection>
  );
}
