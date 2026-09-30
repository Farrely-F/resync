"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { autoPreviewDelayMs, shouldAutoCompile } from "@/lib/compile/auto-preview";
import {
  downloadEngineAssets,
  engineAssetTotalBytes,
  engineCacheStatus,
  EngineAssetsMissingError,
  formatBytes,
  type DownloadProgress,
} from "@/lib/compile/assets";
import { grantConsent, readConsent } from "@/lib/compile/consent";
import { compileResumeTex } from "@/lib/compile/engine";
import type { TexDiagnostics } from "@/lib/compile/errors";
import { validateTex, type TexProblem } from "@/lib/tex/validate";

/**
 * The compile engine's state, shared by every surface that shows the document.
 *
 * One instance per editor, deliberately: the engine is a single Web Worker with a
 * single filesystem, and two panels each compiling the same document would
 * interleave on it. So the state lives here, above both the preview and the
 * diagnostics, and compiling is serialized on a queue that keeps only the newest
 * text — a keystroke while a compile runs replaces the pending document instead
 * of queueing a second compile of a document nobody will see.
 *
 * The panel is a state machine because every state here has been a way for a
 * compiler UI to lie: a spinner with no end when the assets were never fetched, a
 * blank preview instead of the TeX error, a download that starts without being
 * asked for. So the consent gate is explicit, the download reports bytes, a
 * failure says what TeX said and keeps the last good PDF on screen, and a missing
 * asset names the command that fixes it.
 *
 * Live preview is a caller's decision, passed in as `auto`, and it can never
 * download or ask for consent: see `shouldAutoCompile` for the whole rule.
 */

export type Phase =
  | { kind: "checking" }
  | { kind: "consent" }
  | { kind: "idle" }
  | { kind: "downloading"; progress: DownloadProgress | null }
  | { kind: "compiling" }
  | { kind: "failed"; message: string; diagnostics: TexDiagnostics; log: string }
  | { kind: "assets-absent"; asset: string }
  | { kind: "download-failed"; message: string };

export interface CompiledPdf {
  url: string;
  bytes: number;
  compiledAt: string;
}

export interface CompileEngine {
  phase: Phase;
  /** The source problems the check found; the engine is not started while any exist. */
  problems: TexProblem[];
  blocked: boolean;
  lastPdf: CompiledPdf | null;
  /** The text that produced `lastPdf`; the preview is stale while it differs from `tex`. */
  compiledTex: string | null;
  consentGranted: boolean;
  /** Consent recorded and assets cached: the engine can compile without asking anything. */
  engineReady: boolean;
  /** Bumped when the cache changes, so the cache card re-reads it. */
  cacheToken: number;
  /** Compiles the current document because someone asked. */
  compile: () => void;
  acceptConsent: () => void;
  refreshGate: () => void;
}

/**
 * The gate is decided by two facts, not one: a download needs recorded consent,
 * and a compile needs the assets. Assets that are already cached need neither a
 * download nor consent, so a cached engine compiles without asking again.
 */
function gatePhase(consent: boolean, status: { complete: boolean }): Phase {
  return consent || status.complete ? { kind: "idle" } : { kind: "consent" };
}

export function useCompileEngine({ tex, auto }: { tex: string; auto: boolean }): CompileEngine {
  const problems = useMemo(() => validateTex(tex), [tex]);
  const blocked = problems.length > 0;

  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [lastPdf, setLastPdf] = useState<CompiledPdf | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [compiledTex, setCompiledTex] = useState<string | null>(null);
  const [cacheToken, setCacheToken] = useState(0);

  /** Serializes compiles: the engine is one worker, and this is the only place it is used. */
  const draining = useRef(false);
  /** The newest document waiting to compile, or `null` when nothing is pending. */
  const queued = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    engineCacheStatus()
      .then((status) => {
        if (cancelled) {
          return;
        }
        const consent = readConsent() !== null;
        setConsentGranted(consent);
        setEngineReady(consent || status.complete);
        setPhase(gatePhase(consent, status));
      })
      .catch(() => {
        if (!cancelled) {
          setEngineReady(false);
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

  // The object URL belongs to the PDF on screen; replacing or leaving it revokes it.
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

  /** One compile of one document. Never called directly; the queue calls it. */
  const attempt = useCallback(
    async (target: string, demandDownload: boolean) => {
      try {
        const status = await engineCacheStatus();
        if (!status.supported) {
          setPhase({
            kind: "download-failed",
            message: "This browser does not expose Cache Storage, so the TeX engine cannot be stored on the device.",
          });
          return;
        }

        // The one rule the whole engine rests on: bytes only move with a recorded
        // decision. Only the explicit path gets here with consent to give.
        if (!status.complete && !demandDownload) {
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
          setEngineReady(true);
        }

        setPhase({ kind: "compiling" });
        const outcome = await compileResumeTex({ tex: target });

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
        setCompiledTex(target);
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
    },
    [],
  );

  /**
   * Queues a document and drains the queue. Only one compile runs at a time, and
   * the queue holds only the newest document, so a burst of edits costs one
   * compile rather than one per edit.
   */
  const enqueue = useCallback(
    async (target: string, demandDownload: boolean) => {
      queued.current = target;
      if (draining.current) {
        return;
      }

      draining.current = true;
      try {
        for (;;) {
          const next = queued.current;
          queued.current = null;
          if (next === null) {
            break;
          }
          await attempt(next, demandDownload);
        }
      } finally {
        draining.current = false;
      }
    },
    [attempt],
  );

  const compile = useCallback(() => {
    // The one rule the check exists for: bytes only move for a document that is at
    // least well-formed. Every entry point into compiling goes through here, so a
    // disabled button is a courtesy rather than the guarantee.
    if (blocked) {
      return;
    }

    void enqueue(tex, true);
  }, [blocked, enqueue, tex]);

  const acceptConsent = useCallback(() => {
    grantConsent(localStorage, engineAssetTotalBytes);
    setConsentGranted(true);
    // The click is the recorded decision the download needs; from here the queue
    // does what it always does.
    void enqueue(tex, true);
  }, [enqueue, tex]);

  const refreshGate = useCallback(() => {
    void engineCacheStatus().then((status) => {
      const consent = readConsent() !== null;
      setConsentGranted(consent);
      setEngineReady(consent || status.complete);
      setPhase(gatePhase(consent, status));
    });
  }, []);

  useEffect(() => {
    if (!shouldAutoCompile({ enabled: auto, engineReady, blocked, compiledTex, tex })) {
      return;
    }

    // Wait for the typing to stop: the timer restarts on every change, so a burst
    // of keystrokes schedules one compile at the end of it.
    const timer = setTimeout(() => {
      void enqueue(tex, false);
    }, autoPreviewDelayMs);

    return () => clearTimeout(timer);
  }, [auto, blocked, compiledTex, enqueue, engineReady, tex]);

  // Memoised so the value only changes when something in it does: the panel that
  // renders it can then skip a render per keystroke, which is most of what makes
  // typing in the editor cheap.
  return useMemo(
    () => ({
      phase,
      problems,
      blocked,
      lastPdf,
      compiledTex,
      consentGranted,
      engineReady,
      cacheToken,
      compile,
      acceptConsent,
      refreshGate,
    }),
    [
      acceptConsent,
      blocked,
      cacheToken,
      compile,
      compiledTex,
      consentGranted,
      engineReady,
      lastPdf,
      phase,
      problems,
      refreshGate,
    ],
  );
}
