/**
 * Engine assets: the manifest, the Cache Storage layer, and the download.
 *
 * The TeX engine is a WebAssembly build of TeX Live 2026. Its files are served
 * from our own origin under `/core/busytex` (fetched at build time by
 * `scripts/fetch-tex-assets.mjs`; the directory is gitignored) because the
 * engine starts its own Web Worker with `new Worker(...)` and a Worker script
 * must be same-origin. GitHub Releases, where upstream hosts them, send no CORS
 * headers.
 *
 * They are stored in the Cache Storage API rather than an HTTP cache so that a
 * compile after a page reload reads them back as blobs without touching the
 * network. There is deliberately no service worker in this app: a service worker
 * is the only thing that can silently serve a stale app shell, and a compiler
 * that runs entirely from the page does not need one. Because nothing serves
 * these URLs for us, `src/lib/compile/engine.ts` hands the cached blobs to the
 * engine through a worker shim (see `worker-shim.ts`).
 *
 * Sizes are the exact byte counts of the pinned release. The fetch script
 * asserts them at download time; `downloadEngineAssets` asserts them again on
 * the way into Cache Storage, so a truncated or substituted file fails loudly
 * instead of producing an engine that half-works.
 */

/** Same-origin path the assets are served from. Also the Cache Storage key prefix. */
export const engineBasePath = "/core/busytex";

/**
 * Versioned cache name. Changing the asset set must change this string, so a
 * browser that cached the previous engine cannot keep serving it.
 */
export const engineCacheName = "resync-tex-engine-v1";

export type EngineAssetKind = "engine" | "support" | "data";

export interface EngineAsset {
  name: string;
  bytes: number;
  kind: EngineAssetKind;
}

/** The subset `scripts/fetch-tex-assets.mjs` downloads, with its verified sizes. */
export const engineAssets: readonly EngineAsset[] = [
  { name: "busytex.wasm", bytes: 32_507_525, kind: "engine" },
  { name: "busytex.js", bytes: 271_047, kind: "engine" },
  { name: "busytex_worker.js", bytes: 3_123, kind: "engine" },
  { name: "busytex_pipeline.js", bytes: 36_266, kind: "engine" },
  { name: "busytex_biber.js", bytes: 3_688, kind: "engine" },
  { name: "texlive-basic.data", bytes: 92_785_062, kind: "data" },
  { name: "texlive-basic.js", bytes: 2_091_651, kind: "data" },
  { name: "texmf.cnf", bytes: 43_630, kind: "support" },
  { name: "dvipdfmx.cfg", bytes: 8_828, kind: "support" },
  { name: "updmap.cfg", bytes: 3_887, kind: "support" },
  { name: "versions.txt", bytes: 438, kind: "support" },
];

/** Total download cost of a first compile: 127,755,145 bytes. */
export const engineAssetTotalBytes = engineAssets.reduce((sum, asset) => sum + asset.bytes, 0);

/** The URL an asset is served from, and the key it is cached under. */
export function engineAssetUrl(name: string): string {
  return `${engineBasePath}/${name}`;
}

/**
 * Content type per extension. The engine compiles `busytex.wasm` with
 * `WebAssembly.compileStreaming`, which rejects a response that is not served as
 * `application/wasm`; we rebuild the cached response from bytes, so the type has
 * to be restated rather than inherited.
 */
export function contentTypeForAsset(name: string): string {
  if (name.endsWith(".wasm")) {
    return "application/wasm";
  }
  if (name.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (name.endsWith(".data")) {
    return "application/octet-stream";
  }
  return "text/plain; charset=utf-8";
}

export interface EngineCacheStatus {
  /** False when the browser exposes no Cache Storage (or a test runtime has none). */
  supported: boolean;
  /** Every asset is present. */
  complete: boolean;
  cachedBytes: number;
  totalBytes: number;
  missing: string[];
}

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  asset: string;
}

function cacheStorage(): CacheStorage | null {
  return typeof caches === "undefined" ? null : caches;
}

/** What is already on disk, without downloading anything. */
export async function engineCacheStatus(): Promise<EngineCacheStatus> {
  const storage = cacheStorage();
  if (!storage) {
    return {
      supported: false,
      complete: false,
      cachedBytes: 0,
      totalBytes: engineAssetTotalBytes,
      missing: engineAssets.map((asset) => asset.name),
    };
  }

  const cache = await storage.open(engineCacheName);
  const missing: string[] = [];
  let cachedBytes = 0;

  for (const asset of engineAssets) {
    const hit = await cache.match(engineAssetUrl(asset.name));
    if (hit) {
      cachedBytes += asset.bytes;
    } else {
      missing.push(asset.name);
    }
  }

  return {
    supported: true,
    complete: missing.length === 0,
    cachedBytes,
    totalBytes: engineAssetTotalBytes,
    missing,
  };
}

/** Thrown when the assets are not on this origin (a fresh clone, before `npm run fetch:tex`). */
export class EngineAssetsMissingError extends Error {
  readonly asset: string;

  constructor(asset: string, status: number) {
    super(`The TeX engine assets are not on this server: ${asset} responded ${status}.`);
    this.name = "EngineAssetsMissingError";
    this.asset = asset;
  }
}

/** Thrown when a download completes but does not match the pinned size. */
export class EngineAssetSizeError extends Error {
  constructor(name: string, expected: number, received: number) {
    super(`${name} is ${received} bytes, expected ${expected}. The served assets are not the pinned release.`);
    this.name = "EngineAssetSizeError";
  }
}

async function streamAsset(asset: EngineAsset, onProgress?: (progress: DownloadProgress) => void): Promise<Blob> {
  const response = await fetch(engineAssetUrl(asset.name));

  if (response.status === 404 || response.status === 410) {
    throw new EngineAssetsMissingError(asset.name, response.status);
  }
  if (!response.ok) {
    throw new Error(`Downloading ${asset.name} failed: HTTP ${response.status} ${response.statusText}.`);
  }

  const chunks: BlobPart[] = [];
  let loadedBytes = 0;

  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value as BlobPart);
      loadedBytes += value.byteLength;
      onProgress?.({ loadedBytes, totalBytes: asset.bytes, asset: asset.name });
    }
  } else {
    const buffer = new Uint8Array(await response.arrayBuffer());
    chunks.push(buffer);
    loadedBytes = buffer.byteLength;
    onProgress?.({ loadedBytes, totalBytes: asset.bytes, asset: asset.name });
  }

  const blob = new Blob(chunks, { type: contentTypeForAsset(asset.name) });
  if (blob.size !== asset.bytes) {
    throw new EngineAssetSizeError(asset.name, asset.bytes, blob.size);
  }
  return blob;
}

/**
 * Fetches whatever is missing into Cache Storage, reporting per-asset byte
 * progress. Assets already cached are never re-requested, which is what makes a
 * second compile free.
 */
export async function downloadEngineAssets(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<EngineCacheStatus> {
  const storage = cacheStorage();
  if (!storage) {
    throw new Error("This browser does not support Cache Storage, so the TeX engine cannot be stored locally.");
  }

  const cache = await storage.open(engineCacheName);

  for (const asset of engineAssets) {
    if (await cache.match(engineAssetUrl(asset.name))) {
      continue;
    }
    const blob = await streamAsset(asset, onProgress);
    await cache.put(engineAssetUrl(asset.name), new Response(blob, { status: 200 }));
  }

  return engineCacheStatus();
}

/** Removes every cached engine asset. The next compile downloads all of it again. */
export async function clearEngineCache(): Promise<void> {
  const storage = cacheStorage();
  if (!storage) {
    return;
  }
  await storage.delete(engineCacheName);
}

/** `127.76 MB` from 127755145 bytes. Decimal units, matching the fetch script. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1_000_000) {
    return `${(bytes / 1000).toFixed(1)} kB`;
  }
  return `${(bytes / 1e6).toFixed(2)} MB`;
}
