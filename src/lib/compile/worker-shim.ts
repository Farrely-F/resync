/**
 * The worker shim that feeds the engine from Cache Storage.
 *
 * `texlyre-busytex` starts its own Web Worker (`new Worker('/core/busytex/busytex_worker.js')`)
 * and that worker fetches every engine file by URL. A plain `fetch` never
 * consults the Cache Storage API — only a service worker's fetch handler can do
 * that, and this app deliberately has none. So the bytes would otherwise be
 * pulled from the network on every compile, 127.76 MB at a time.
 *
 * The shim is the smallest thing that closes that gap without a service worker:
 * the runner is constructed while `globalThis.Worker` is temporarily replaced,
 * so the constructor receives a same-origin `blob:` worker running this script.
 * The shim
 *
 *   1. reads every `.js` engine asset out of Cache Storage as text,
 *   2. replaces `fetch` with a cache-first one that answers any `/core/busytex/`
 *      request from Cache Storage (`busytex.wasm` and `texlive-basic.data` are
 *      fetched by the engine through `fetch`),
 *   3. replaces `importScripts` with a synchronous one that evaluates the cached
 *      text — `importScripts` cannot be made asynchronous, so the sources are
 *      read before the override is installed,
 *   4. evaluates the real `busytex_worker.js` from the cache, which installs the
 *      engine's own message handler.
 *
 * Because the worker is created before the runner's `postMessage`, messages that
 * arrive during that setup are queued and replayed once the real handler exists.
 *
 * The result is that the engine observes exactly the API it expects (same URLs,
 * same MIME types, same synchronous import semantics) while every byte comes from
 * the local cache.
 */

import { engineAssetUrl, engineAssets, engineCacheName } from "@/lib/compile/assets";

/** Every engine asset that has to be available to `importScripts`. */
const scriptAssetUrls = engineAssets.filter((asset) => asset.name.endsWith(".js")).map((asset) => engineAssetUrl(asset.name));

/**
 * The shim source, as it will run inside the worker. Written as a string because
 * it has to be turned into a `blob:` URL before the runner is constructed. The
 * page origin has to be passed in: a `blob:` worker has no useful base URL, so
 * `caches.match("/core/busytex/...")` would fail to parse. It is intentionally
 * not strict mode either: `busytex.js` declares its factory with `var` inside an
 * indirect `eval`, and strict-mode `eval` would keep that binding out of the
 * worker's global scope, where `busytex_pipeline.js` looks for it.
 */
export function engineWorkerShimSource(origin: string): string {
  return `(() => {
  const ORIGIN = ${JSON.stringify(origin)};
  const CACHE_NAME = ${JSON.stringify(engineCacheName)};
  const BASE = ${JSON.stringify("/core/busytex")};
  const SCRIPT_URLS = ${JSON.stringify(scriptAssetUrls.map((url) => `${origin}${url}`))};

  const pending = [];
  let engineHandler = null;

  self.onmessage = (event) => {
    if (engineHandler) {
      engineHandler(event);
    } else {
      pending.push(event);
    }
  };

  const networkFetch = self.fetch.bind(self);
  const networkImportScripts = self.importScripts.bind(self);
  const sources = new Map();

  async function bootstrap() {
    const cache = await caches.open(CACHE_NAME);

    for (const url of SCRIPT_URLS) {
      const hit = await cache.match(url);
      if (!hit) {
        throw new Error("The TeX engine asset " + url + " is not in Cache Storage. Download the engine again.");
      }
      sources.set(new URL(url).pathname, await hit.text());
    }

    self.fetch = async (input, init) => {
      const raw = typeof input === "string" ? input : input && input.url ? input.url : String(input);
      const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
      if (path.startsWith(BASE + "/")) {
        const hit = await cache.match(ORIGIN + path);
        if (hit) {
          return hit;
        }
        throw new Error("The TeX engine asset " + path + " is not in Cache Storage. Download the engine again.");
      }
      return networkFetch(input, init);
    };

    const importScriptsFromCache = (...urls) => {
      for (const raw of urls) {
        const path = new URL(raw, ORIGIN + BASE + "/").pathname;
        const code = sources.get(path);
        if (code === undefined) {
          networkImportScripts(new URL(raw, ORIGIN + BASE + "/").href);
          continue;
        }
        // Indirect eval runs in the worker's global scope, which is what
        // importScripts does: the engine scripts publish their globals there.
        (0, eval)(code);
      }
    };

    Object.defineProperty(self, "importScripts", {
      value: importScriptsFromCache,
      writable: true,
      configurable: true,
    });

    const workerSource = sources.get(BASE + "/busytex_worker.js");
    if (workerSource === undefined) {
      throw new Error("The TeX engine worker script is missing from Cache Storage. Download the engine again.");
    }
    (0, eval)(workerSource);

    engineHandler = self.onmessage;
    self.onmessage = (event) => {
      if (engineHandler) {
        engineHandler(event);
      } else {
        pending.push(event);
      }
    };

    for (const event of pending.splice(0)) {
      engineHandler(event);
    }
  }

  bootstrap().catch((error) => {
    postMessage({
      exception: "The TeX engine worker could not start: " + (error && error.message ? error.message : String(error)),
    });
  });
})();
`;
}
