/**
 * Running the engine.
 *
 * Compilation is the only expensive thing this app does: a WebAssembly TeX Live
 * engine, 127.76 MB of assets, and a real PDF. Three rules follow from that, and
 * all of them live here:
 *
 *   - It runs in a Web Worker (`runner.initialize(true)`), never on the main
 *     thread, so typing keeps working while TeX thinks.
 *   - It runs only when asked. Nothing in this module is called by a keystroke;
 *     the panel calls `compileResumeTex` from an explicit action.
 *   - The engine is initialized once per page and reused. Re-initializing would
 *     rebuild the 92 MB filesystem image for nothing.
 *
 * The worker normally downloads its own assets. `worker-shim.ts` replaces it with
 * one that reads them from Cache Storage instead; see that file for why.
 */

import { BusyTexRunner, LuaLatex, PdfLatex, XeLatex, type CompileResult } from "texlyre-busytex";

import { engineAssetUrl, engineBasePath } from "@/lib/compile/assets";
import { parseTexLog, summarizeTexFailure, type TexDiagnostics } from "@/lib/compile/errors";
import { engineWorkerShimSource } from "@/lib/compile/worker-shim";

/** TeX engines the runner ships. XeLaTeX is the default; see `compileResumeTex`. */
export type EngineId = "pdflatex" | "xelatex" | "lualatex";

export interface CompileRequest {
  tex: string;
  engine?: EngineId;
}

export interface CompileOutcome {
  ok: boolean;
  /** The PDF bytes, or null when nothing was produced. */
  pdf: Uint8Array | null;
  /** Everything the engine printed, for the error pane. */
  log: string;
  diagnostics: TexDiagnostics;
  /** One sentence for the user when `ok` is false. */
  failure: string | null;
}

let runnerPromise: Promise<BusyTexRunner> | null = null;

function createEngineTool(runner: BusyTexRunner, engine: EngineId) {
  if (engine === "xelatex") {
    return new XeLatex(runner);
  }
  if (engine === "lualatex") {
    return new LuaLatex(runner);
  }
  return new PdfLatex(runner);
}

/**
 * The engine worker's own URL is ignored: the constructor hands it a `blob:` URL
 * of the cache-backed shim. The substitution is restored immediately, so nothing
 * outside this call ever sees a patched `Worker`.
 */
async function createRunner(): Promise<BusyTexRunner> {
  const runner = new BusyTexRunner({
    busytexBasePath: engineBasePath,
    verbose: false,
    preloadDataPackages: [engineAssetUrl("texlive-basic.js")],
  });

  const shimUrl = URL.createObjectURL(
    new Blob([engineWorkerShimSource(globalThis.location.origin)], { type: "text/javascript" }),
  );
  const browserWorker = globalThis.Worker;

  class CacheBackedWorker extends browserWorker {
    constructor() {
      super(shimUrl);
    }
  }

  globalThis.Worker = CacheBackedWorker as unknown as typeof Worker;
  try {
    await runner.initialize(true);
  } finally {
    globalThis.Worker = browserWorker;
  }

  return runner;
}

async function getRunner(): Promise<BusyTexRunner> {
  if (!runnerPromise) {
    runnerPromise = createRunner().catch((error: unknown) => {
      runnerPromise = null;
      throw error;
    });
  }
  return runnerPromise;
}

/** Stops the engine: after this the next compile initializes it again. */
export function disposeRunner(): void {
  const pending = runnerPromise;
  runnerPromise = null;
  void pending?.then(
    (runner) => runner.terminate(),
    () => undefined,
  );
}

function collectLog(result: CompileResult): string {
  const parts = [result.log, ...result.logs.flatMap((entry) => [entry.stdout, entry.stderr])];
  return parts.filter((part) => typeof part === "string" && part.trim().length > 0).join("\n");
}

function toOutcome(result: CompileResult): CompileOutcome {
  const log = collectLog(result);
  const diagnostics = parseTexLog(log);
  const pdf = result.pdf ? new Uint8Array(result.pdf) : null;
  const ok = result.success && pdf !== null && pdf.byteLength > 0;

  return {
    ok,
    pdf: ok ? pdf : null,
    log,
    diagnostics,
    failure: ok ? null : summarizeTexFailure(diagnostics),
  };
}

/**
 * Compiles one document. Must only be called from an explicit user action.
 *
 * The default engine is XeLaTeX, not pdfLaTeX, and that is a measured decision
 * rather than a preference. The generated preamble sets `[T1]{fontenc}`; the
 * shipped `scheme-basic` image's `pdftex.map` maps the T1 fonts through
 * `cm-super`, and the tier contains no cm-super file, so pdfLaTeX dies with
 * `pdfTeX error: (file cm-super-t1.enc): cannot open encoding file for reading`
 * on any document. XeLaTeX goes through xdvipdfmx, resolves the same fonts, and
 * produces a PDF whose text layer extracts correctly (verified, including
 * accented Latin). `pdflatex` stays selectable because it is correct wherever the
 * map is fixed.
 */
export async function compileResumeTex({ tex, engine = "xelatex" }: CompileRequest): Promise<CompileOutcome> {
  const runner = await getRunner();
  const tool = createEngineTool(runner, engine);

  try {
    const result = await tool.compile({ input: tex, mainTexPath: "resume.tex" });
    return toOutcome(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      pdf: null,
      log: message,
      diagnostics: parseTexLog(message),
      failure: `The engine could not finish: ${message}`,
    };
  }
}
