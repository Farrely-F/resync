#!/usr/bin/env node
/**
 * Pre-release check: does every theme render a document the bundled TeX scheme
 * can actually resolve?
 *
 * Run `npm run verify:themes` before a release. It is not wired into CI on
 * purpose: it needs the 127.76 MB engine image, which CI would have to download
 * on every run for a check that only changes when a theme or the TeX scheme does.
 *
 * What this proves
 *   - Each theme renders its LaTeX from a fixture resume through the real
 *     generator (`src/lib/tex/generate.ts`), the same code the app runs.
 *   - Every `\usepackage` and `\documentclass` the generated document names is
 *     present in the shipped `scheme-basic` image. The file list is read out of
 *     `public/core/busytex/texlive-basic.js` — the engine's own manifest of the
 *     image it will mount — rather than a hand-kept list in this repo, so a theme
 *     that reaches for `xcolor` fails here with the package named.
 *   - The emitted document is ASCII, which is the input assumption the engine is
 *     run under.
 *
 * What this does NOT prove
 *   - That TeX converts the document to a PDF. TeX only runs inside the
 *     WebAssembly engine, which needs a browser worker; nothing here runs TeX.
 *     Proving a real PDF for every theme is done in the browser smoke test, and
 *     the engine's conversion failures are handled at runtime by the compile
 *     panel (which keeps the last good PDF and shows the engine log).
 *   - That the PDF paginates well or looks right — only a human can judge that.
 */

import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = new URL("../", import.meta.url);

/** `@/x` -> `src/x`, trying the TypeScript file and a directory index. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }
    const target = new URL(`src/${specifier.slice(2)}`, repoRoot).href;
    for (const candidate of [`${target}.ts`, `${target}/index.ts`]) {
      try {
        return nextResolve(candidate, context);
      } catch {
        // Try the next shape; the last miss throws below.
      }
    }
    throw new Error(`Cannot resolve ${specifier} from ${context.parentURL}`);
  },
});

const { renderResume } = await import(new URL("src/lib/tex/generate.ts", repoRoot).href);
const { allowedDocumentClass, usedPackages } = await import(new URL("src/lib/tex/packages.ts", repoRoot).href);
const { themes } = await import(new URL("src/lib/themes/index.ts", repoRoot).href);
const { defaultSections, resumeSchema } = await import(new URL("src/lib/resume/schema.ts", repoRoot).href);

const engineImagePath = fileURLToPath(new URL("public/core/busytex/texlive-basic.js", repoRoot));

/** A resume with every modelled section filled in, including escaped characters. */
function fixtureResume() {
  return resumeSchema.parse({
    basics: {
      name: "Ada Lovelace",
      label: "Mathematician & programmer",
      email: "ada@example.com",
      phone: "+44 20 7946 0000",
      url: "https://example.com/ada?v=1&x=2",
      summary: "Wrote the first published algorithm; 100% of the notes survive typesetting.",
      location: { city: "London", region: "Greater London", country: "UK" },
      profiles: [{ network: "GitHub", username: "ada_l", url: "https://github.com/ada" }],
    },
    work: [
      {
        name: "Analytical Engines Ltd",
        position: "Lead mathematician",
        location: "London",
        startDate: "1842",
        endDate: "1843",
        highlights: ["Wrote the first algorithm", "Used under 50% of the available memory"],
      },
    ],
    education: [
      { institution: "Home tutored", studyType: "BSc", area: "Mathematics", startDate: "1832", endDate: "1840" },
    ],
    skills: [{ name: "Mathematics", level: "Expert", keywords: ["analysis", "notation"] }],
    projects: [
      {
        name: "Note G",
        description: "Bernoulli numbers 1--7",
        url: "https://example.com/note-g",
        highlights: ["Published 1843"],
      },
    ],
    certificates: [{ name: "Fellow", issuer: "Royal Society", date: "1840" }],
    languages: [{ language: "English", fluency: "Native" }],
    sections: defaultSections,
  });
}

/**
 * Reads the engine's own file manifest out of the Emscripten package script.
 * `loadPackage({...})` is called with the metadata object; the JSON is scanned
 * with a brace counter because the file also contains TeX sources with braces.
 */
function readShippedImage(path) {
  const source = readFileSync(path, "utf8");
  const marker = source.indexOf('loadPackage({"files"');
  if (marker === -1) {
    throw new Error(`No loadPackage({"files": ...}) metadata found in ${path}.`);
  }
  const start = source.indexOf("{", marker);

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error(`Could not find the end of the loadPackage metadata in ${path}.`);
  }

  const metadata = JSON.parse(source.slice(start, end));
  if (!Array.isArray(metadata.files)) {
    throw new Error(`The loadPackage metadata in ${path} has no files array.`);
  }

  return {
    remotePackageSize: metadata.remote_package_size,
    fileNames: metadata.files.map((file) => file.filename),
  };
}

const problems = [];
const lines = [];

if (!existsSync(engineImagePath)) {
  console.error(`The TeX engine image is not on disk: ${engineImagePath}`);
  console.error("It is gitignored and fetched at build time. Run: npm run fetch:tex");
  process.exit(1);
}

const image = readShippedImage(engineImagePath);
const styFiles = new Set(image.fileNames.map((name) => name.slice(name.lastIndexOf("/") + 1)));
const resume = fixtureResume();

lines.push(`Shipped scheme-basic image: ${image.fileNames.length} files, ${image.remotePackageSize} bytes`);
lines.push(`Fixture resume: ${resume.basics.name}`);
lines.push("");

for (const theme of themes) {
  const tex = renderResume(resume, theme);
  const packages = usedPackages(tex);
  const documentClass = /\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/.exec(tex)?.[1] ?? null;

  const missing = packages.filter((name) => !styFiles.has(`${name}.sty`));
  const nonAscii = [...tex].filter((character) => character.codePointAt(0) > 126);
  const structural = [
    documentClass === allowedDocumentClass ? null : `document class ${documentClass ?? "(none)"}`,
    tex.includes("\\begin{document}") ? null : "no \\begin{document}",
    tex.trimEnd().endsWith("\\end{document}") ? null : "no trailing \\end{document}",
    nonAscii.length === 0 ? null : `${nonAscii.length} non-ASCII character(s)`,
  ].filter((entry) => entry !== null);

  const failed = missing.length > 0 || structural.length > 0;
  lines.push(`${failed ? "FAIL" : "ok  "} ${theme.id.padEnd(9)} ${String(tex.length).padStart(6)} bytes, ${String(tex.split("\n").length).padStart(4)} lines, ${packages.length} packages`);

  if (failed) {
    for (const name of missing) {
      problems.push(`${theme.id}: the shipped scheme-basic image has no ${name}.sty (themes may only use packages in src/lib/tex/packages.ts)`);
    }
    for (const entry of structural) {
      problems.push(`${theme.id}: ${entry}`);
    }
  }
}

console.log(lines.join("\n"));

if (problems.length > 0) {
  console.error("\nverify:themes failed:");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error("\nNo PDF was produced or attempted. Fix the theme, then re-run.");
  process.exit(1);
}

console.log(`\nAll ${themes.length} themes resolve against the shipped scheme-basic image.`);
console.log("This check never runs TeX; the browser smoke test is what proves a real PDF.");
