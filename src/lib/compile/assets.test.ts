import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearEngineCache,
  contentTypeForAsset,
  downloadEngineAssets,
  EngineAssetHashError,
  EngineAssetsMissingError,
  EngineAssetSizeError,
  engineAssetTotalBytes,
  engineAssetUrl,
  engineAssetSourceUrl,
  engineAssets,
  engineCacheName,
  engineCacheStatus,
  formatBytes,
} from "@/lib/compile/assets";

class FakeCache {
  readonly entries = new Map<string, Response>();

  async match(key: Request | string): Promise<Response | undefined> {
    const hit = this.entries.get(FakeCache.key(key));
    return hit ? hit.clone() : undefined;
  }

  async put(key: Request | string, response: Response): Promise<void> {
    this.entries.set(FakeCache.key(key), response);
  }

  static key(key: Request | string): string {
    const url = typeof key === "string" ? key : key.url;
    return new URL(url, "http://localhost").href;
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();

  open(name: string): Promise<FakeCache> {
    const cache = this.caches.get(name) ?? new FakeCache();
    this.caches.set(name, cache);
    return Promise.resolve(cache);
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

/** The fake server sends zeros, so answer the digest with the pinned hash of the asset of that size. */
function stubPinnedDigest() {
  return vi.spyOn(crypto.subtle, "digest").mockImplementation(async (_algorithm, data) => {
    const length = (data as ArrayBuffer).byteLength;
    const asset = engineAssets.find((candidate) => candidate.bytes === length);
    const hex = asset?.sha256 ?? "";
    return new Uint8Array(hex.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? []).buffer;
  });
}

function stubBrowser(storage: FakeCacheStorage | null) {
  const originalCaches = Reflect.get(globalThis, "caches");
  Object.defineProperty(globalThis, "caches", {
    value: storage ?? undefined,
    configurable: true,
    writable: true,
  });
  return () => {
    Object.defineProperty(globalThis, "caches", { value: originalCaches, configurable: true, writable: true });
  };
}

function servedResponse(bytes: number, type: string): Response {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": type } });
}

describe("engine asset manifest", () => {
  it("measures the pinned release at 127,755,145 bytes", () => {
    expect(engineAssetTotalBytes).toBe(127_755_145);
    expect(formatBytes(engineAssetTotalBytes)).toBe("127.76 MB");
  });

  it("names exactly the assets the fetch script downloads, at the same sizes", () => {
    const script = readFileSync(new URL("../../../scripts/fetch-tex-assets.mjs", import.meta.url), "utf8");
    const downloaded = [...script.matchAll(/\{ name: "([^"]+)", bytes: (\d+) \}/g)].map((match) => ({
      name: match[1],
      bytes: Number(match[2]),
    }));

    expect(downloaded.length).toBeGreaterThan(0);
    expect(downloaded).toEqual(engineAssets.map(({ name, bytes }) => ({ name, bytes })));
  });

  it("serves every asset from the same-origin base path", () => {
    expect(engineAssetUrl("busytex.wasm")).toBe("/core/busytex/busytex.wasm");
    expect(engineAssets.every((asset) => engineAssetUrl(asset.name).startsWith("/core/busytex/"))).toBe(true);
  });

  it("restates the content type the engine needs rather than trusting the server", () => {
    expect(contentTypeForAsset("busytex.wasm")).toBe("application/wasm");
    expect(contentTypeForAsset("busytex.js")).toContain("javascript");
    expect(contentTypeForAsset("texlive-basic.data")).toBe("application/octet-stream");
    expect(contentTypeForAsset("texmf.cnf")).toContain("text/plain");
  });
});

describe("engine asset source", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("downloads from our own origin unless a host is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TEX_ASSETS_URL", "");
    expect(engineAssetSourceUrl("busytex.wasm")).toBe("/core/busytex/busytex.wasm");
  });

  it("rejects a same-size download whose content is not the pinned release", async () => {
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const asset = engineAssets.find((candidate) => String(input).endsWith(`/${candidate.name}`));
      return asset ? servedResponse(asset.bytes, contentTypeForAsset(asset.name)) : new Response("no", { status: 404 });
    }) as typeof fetch;

    try {
      await expect(downloadEngineAssets()).rejects.toBeInstanceOf(EngineAssetHashError);
      expect((await storage.open(engineCacheName)).entries.size).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      restore();
    }
  });
  it("downloads from the configured host, but caches under the same-origin key", async () => {
    vi.stubEnv("NEXT_PUBLIC_TEX_ASSETS_URL", "https://tex.example.com/busytex/");
    expect(engineAssetSourceUrl("busytex.wasm")).toBe("https://tex.example.com/busytex/busytex.wasm");

    const digest = stubPinnedDigest();
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    const requested: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      const asset = engineAssets.find((candidate) => url.endsWith(`/${candidate.name}`));
      return asset ? servedResponse(asset.bytes, contentTypeForAsset(asset.name)) : new Response("no", { status: 404 });
    }) as typeof fetch;

    try {
      await downloadEngineAssets();
      expect(requested.every((url) => url.startsWith("https://tex.example.com/busytex/"))).toBe(true);
      expect((await storage.open(engineCacheName)).entries.has(FakeCache.key(engineAssetUrl("busytex.wasm")))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      digest.mockRestore();
      restore();
    }
  });
});

describe("engine cache", () => {
  it("reports what is missing and how much is already stored", async () => {
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    try {
      const empty = await engineCacheStatus();
      expect(empty.complete).toBe(false);
      expect(empty.cachedBytes).toBe(0);
      expect(empty.missing).toEqual(engineAssets.map((asset) => asset.name));

      await storage.open(engineCacheName).then((cache) => cache.put(engineAssetUrl("texmf.cnf"), servedResponse(43_630, "text/plain")));
      const partial = await engineCacheStatus();
      expect(partial.cachedBytes).toBe(43_630);
      expect(partial.missing).not.toContain("texmf.cnf");
    } finally {
      restore();
    }
  });

  it("reports Cache Storage as unsupported instead of claiming an empty cache", async () => {
    const restore = stubBrowser(null);
    try {
      const status = await engineCacheStatus();
      expect(status.supported).toBe(false);
      expect(status.complete).toBe(false);
    } finally {
      restore();
    }
  });

  it("downloads each asset once and serves a second compile entirely from the cache", async () => {
    const digest = stubPinnedDigest();
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    const requested: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const name = String(input).split("/").pop() ?? "";
      requested.push(name);
      const asset = engineAssets.find((candidate) => candidate.name === name);
      if (!asset) {
        return new Response("not found", { status: 404 });
      }
      return servedResponse(asset.bytes, contentTypeForAsset(asset.name));
    }) as typeof fetch;

    try {
      const first = await downloadEngineAssets();
      expect(requested).toHaveLength(engineAssets.length);
      expect(first.complete).toBe(true);
      expect(first.cachedBytes).toBe(engineAssetTotalBytes);

      // A reload drops module state but not Cache Storage: this is the second compile.
      const second = await downloadEngineAssets();
      expect(requested).toHaveLength(engineAssets.length);
      expect(second.complete).toBe(true);
      expect((await storage.open(engineCacheName)).entries.size).toBe(engineAssets.length);
    } finally {
      globalThis.fetch = originalFetch;
      digest.mockRestore();
      restore();
    }
  });

  it("fails with the asset name when the file is not on this origin", async () => {
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("missing", { status: 404 })) as typeof fetch;

    try {
      await expect(downloadEngineAssets()).rejects.toBeInstanceOf(EngineAssetsMissingError);
      await expect(downloadEngineAssets()).rejects.toThrow(/busytex\.wasm/);
    } finally {
      globalThis.fetch = originalFetch;
      restore();
    }
  });

  it("refuses a truncated download rather than caching a broken engine", async () => {
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const name = String(input).split("/").pop() ?? "";
      return servedResponse(12, contentTypeForAsset(name));
    }) as typeof fetch;

    try {
      await expect(downloadEngineAssets()).rejects.toBeInstanceOf(EngineAssetSizeError);
      expect((await storage.open(engineCacheName)).entries.size).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      restore();
    }
  });

  it("survives clearing: the next download starts from nothing", async () => {
    const storage = new FakeCacheStorage();
    const restore = stubBrowser(storage);
    try {
      await storage.open(engineCacheName).then((cache) => cache.put(engineAssetUrl("versions.txt"), servedResponse(438, "text/plain")));
      expect((await engineCacheStatus()).cachedBytes).toBe(438);

      await clearEngineCache();
      expect((await engineCacheStatus()).cachedBytes).toBe(0);
    } finally {
      restore();
    }
  });

  it("does nothing when Cache Storage is unavailable", async () => {
    const restore = stubBrowser(null);
    try {
      await expect(clearEngineCache()).resolves.toBeUndefined();
      await expect(downloadEngineAssets()).rejects.toThrow(/Cache Storage/);
    } finally {
      restore();
    }
  });
});
