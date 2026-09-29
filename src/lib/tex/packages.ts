/**
 * The compilation boundary.
 *
 * Compiles run against a bundled `scheme-basic` TeX Live (541 `.sty` files, measured).
 * A `\usepackage` for anything outside that scheme fails the whole job with
 * "File `x.sty' not found." rather than degrading, so this list is a hard
 * boundary rather than a preference. Themes declare what they need; the tests
 * assert the declarations stay inside it.
 */

export const allowedPackages = [
  "amsmath",
  "array",
  "color",
  "etoolbox",
  "expl3",
  "fancyhdr",
  "fontenc",
  "geometry",
  "graphicx",
  "hyperref",
  "multicol",
  "tabularx",
  "textcomp",
  "url",
  "xparse",
] as const;

export type AllowedPackage = (typeof allowedPackages)[number];

/** The only document class guaranteed to exist in the bundled scheme. */
export const allowedDocumentClass = "article";

/**
 * Measured as absent. Kept explicit so a failing test can name the mistake:
 * these are the packages a resume template would reach for first.
 */
export const forbiddenPackages = [
  "xcolor",
  "enumitem",
  "titlesec",
  "fontspec",
  "microtype",
  "parskip",
  "ragged2e",
  "booktabs",
  "ulem",
  "needspace",
  "fontawesome5",
  "marvosym",
] as const;

/** Every `\usepackage` in a generated document, in order of appearance. */
export function usedPackages(tex: string): string[] {
  return [...tex.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)].map((match) => match[1].trim());
}
