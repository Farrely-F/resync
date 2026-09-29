#!/usr/bin/env node
/**
 * Fetches ONLY the subset of TeX engine assets this app needs, into a
 * gitignored public directory so they are served from our own origin.
 *
 * Why a subset: the upstream `download-assets` CLI pulls a 521.8 MB tarball
 * (all TeX Live tiers). This app uses the `scheme-basic` tier only, which
 * measures ~127.76 MB including the WASM engine.
 *
 * Why not a CDN: BusyTeX starts its engine with `new Worker(workerPath)`, and a
 * Worker must be same-origin. GitHub Releases also serve no CORS headers, so the
 * assets cannot be loaded cross-origin even for the non-worker files.
 *
 * Why not `texmfrepo.txt`: that file enables BusyTeX's on-demand package fetch
 * from the network. Omitting it keeps compilation offline-first: a package that
 * is not in the bundled tier fails loudly instead of silently reaching out.
 *
 * Usage:
 *   node scripts/fetch-tex-assets.mjs             # download what is missing
 *   node scripts/fetch-tex-assets.mjs --force     # re-download everything
 *   node scripts/fetch-tex-assets.mjs --check     # verify sizes, download nothing
 */

import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

/** Pinned build of the engine, from TeXlyre/texlyre-busytex-build. */
const releaseTag = "build_wasm_46ebb6216a5c1fe63dd1dc885831d1a8cef2dc86_31802832436_1";

const releaseBase = `https://github.com/TeXlyre/texlyre-busytex-build/releases/download/${releaseTag}`;

/** Engine, glue and the scheme-basic TeX Live image. Sizes come from the release. */
const assets = [
  { name: "busytex.wasm", bytes: 32507525 },
  { name: "busytex.js", bytes: 271047 },
  { name: "busytex_worker.js", bytes: 3123 },
  { name: "busytex_pipeline.js", bytes: 36266 },
  { name: "busytex_biber.js", bytes: 3688 },
  { name: "texlive-basic.data", bytes: 92785062 },
  { name: "texlive-basic.js", bytes: 2091651 },
  { name: "texmf.cnf", bytes: 43630 },
  { name: "dvipdfmx.cfg", bytes: 8828 },
  { name: "updmap.cfg", bytes: 3887 },
  { name: "versions.txt", bytes: 438 },
];

const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);

function formatMb(bytes) {
  return `${(bytes / 1e6).toFixed(2)} MB`;
}

async function existingSize(path) {
  try {
    return (await stat(path)).size;
  } catch {
    return null;
  }
}

async function download(asset, destination) {
  const response = await fetch(`${releaseBase}/${asset.name}`, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`${asset.name}: HTTP ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));

  const written = await existingSize(destination);
  if (written !== asset.bytes) {
    throw new Error(
      `${asset.name}: expected ${asset.bytes} bytes, wrote ${written}. ` +
        `The pinned release may have changed; update the size table deliberately.`,
    );
  }
}

async function check(asset, destination) {
  const response = await fetch(`${releaseBase}/${asset.name}`, { method: "HEAD", redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${asset.name}: HEAD HTTP ${response.status}`);
  }

  const remote = Number(response.headers.get("content-length") ?? "0");
  const local = await existingSize(destination);
  return { remote, local };
}

const destination = resolve(process.argv.find((arg) => arg.startsWith("--dest="))?.slice(7) ?? "public/core/busytex");
const force = process.argv.includes("--force");
const checkOnly = process.argv.includes("--check");

await mkdir(destination, { recursive: true });

console.log(`TeX assets -> ${destination}`);
console.log(`Pinned release: ${releaseTag}`);
console.log(`Subset total:   ${formatMb(totalBytes)} (${totalBytes} bytes)\n`);

const problems = [];

if (checkOnly) {
  for (const asset of assets) {
    const { remote, local } = await check(asset, join(destination, asset.name));
    const ok = remote === asset.bytes && (local === null || local === asset.bytes);
    console.log(`${ok ? "ok  " : "FAIL"} ${asset.name.padEnd(30)} remote=${remote} local=${local === null ? "-" : local}`);
    if (!ok) {
      problems.push(asset.name);
    }
  }
} else {
  let downloaded = 0;

  for (const asset of assets) {
    const path = join(destination, asset.name);
    const local = await existingSize(path);

    if (!force && local === asset.bytes) {
      console.log(`skip  ${asset.name.padEnd(30)} ${formatMb(asset.bytes)}`);
      continue;
    }

    process.stdout.write(`get   ${asset.name.padEnd(30)} ${formatMb(asset.bytes)} ... `);
    try {
      await download(asset, path);
      downloaded += asset.bytes;
      console.log("ok");
    } catch (error) {
      console.log("FAILED");
      problems.push(`${asset.name}: ${error.message}`);
    }
  }

  if (downloaded > 0) {
    console.log(`\nDownloaded ${formatMb(downloaded)}.`);
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} asset(s) failed:`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log(`\nAll ${assets.length} assets verified. Engine ready (${formatMb(totalBytes)}).`);
