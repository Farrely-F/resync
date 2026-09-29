/**
 * Resume themes.
 *
 * A theme is data, not code: the generator in `src/lib/tex` interprets these
 * fields, so a new look never means a new renderer. Every field exists because
 * at least one theme uses it, and `packages` is the contract with the bundled
 * TeX scheme — it may only name packages from `src/lib/tex/packages.ts`.
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  /** `\documentclass` options, e.g. base font size. */
  documentClassOptions: readonly string[];
  /** Required LaTeX packages. Asserted against the bundled-scheme whitelist. */
  packages: readonly string[];
  /** Extra options appended to a package's `\usepackage[..]` call. */
  packageOptions?: Readonly<Record<string, string>>;
  /** `r,g,b` triple in 0..1 for `color.sty`; null renders monochrome. */
  accent: string | null;
  /** `geometry` margin option. */
  margin: string;
  header: "centered" | "split";
  heading: "rule" | "accent-rule" | "small-caps";
  /** Draw the name in the accent colour, where a theme has one. */
  accentHeader: boolean;
  density: "regular" | "compact";
  skills: "list" | "columns";
}

export const themes: readonly Theme[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Centred heading, black rules under each section, generous line spacing.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "hyperref"],
    accent: null,
    margin: "0.9in",
    header: "centered",
    heading: "rule",
    accentHeader: false,
    density: "regular",
    skills: "list",
  },
  {
    id: "accent",
    name: "Accent",
    description: "Same rhythm as Classic with the name, contact line and section rules in one colour.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "color", "hyperref"],
    accent: "0.11,0.33,0.55",
    margin: "0.9in",
    header: "centered",
    heading: "accent-rule",
    accentHeader: true,
    density: "regular",
    skills: "list",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Two-column header, tight spacing and wider text block: fits more on one page.",
    documentClassOptions: ["10pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "multicol", "hyperref"],
    accent: null,
    margin: "0.6in",
    header: "split",
    heading: "small-caps",
    accentHeader: false,
    density: "compact",
    skills: "columns",
  },
];

export const defaultTheme: Theme = themes[0];

export function getTheme(id: string | null | undefined): Theme | null {
  if (!id) {
    return null;
  }
  return themes.find((theme) => theme.id === id) ?? null;
}

/** The theme a stored `themeId` maps to, falling back to the default. */
export function resolveTheme(id: string | null | undefined): Theme {
  return getTheme(id) ?? defaultTheme;
}

/** CSS colour for a theme swatch, derived from the LaTeX `rgb` triple. */
export function accentCssColor(accent: string | null): string | null {
  if (!accent) {
    return null;
  }

  const channels = accent.split(",").map((channel) => Math.round(Number(channel.trim()) * 255));
  return channels.length === 3 && channels.every((channel) => Number.isFinite(channel))
    ? `rgb(${channels.join(" ")})`
    : null;
}
