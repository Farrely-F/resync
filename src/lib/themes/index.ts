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
  /** Body face: Computer Modern roman or its sans-serif sibling. */
  font: "serif" | "sans";
  header: "centered" | "split" | "left" | "banner";
  heading:
    | "rule"
    | "accent-rule"
    | "small-caps"
    | "accent-small-caps"
    | "caps-rule"
    | "accent-caps"
    | "plain"
    | "accent-block";
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
    font: "serif",
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
    font: "serif",
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
    font: "serif",
    header: "split",
    heading: "small-caps",
    accentHeader: false,
    density: "compact",
    skills: "columns",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sans-serif, left-aligned header and teal capitalised section titles.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "color", "hyperref"],
    accent: "0.0,0.42,0.45",
    margin: "0.85in",
    font: "sans",
    header: "left",
    heading: "accent-caps",
    accentHeader: true,
    density: "regular",
    skills: "list",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Serif with centred heading and capitalised section titles over a thin black rule.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "hyperref"],
    accent: null,
    margin: "1in",
    font: "serif",
    header: "centered",
    heading: "caps-rule",
    accentHeader: false,
    density: "regular",
    skills: "list",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Sans-serif, no rules and no colour: only weight separates the sections.",
    documentClassOptions: ["10pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "hyperref"],
    accent: null,
    margin: "0.9in",
    font: "sans",
    header: "left",
    heading: "plain",
    accentHeader: false,
    density: "regular",
    skills: "list",
  },
  {
    id: "banner",
    name: "Banner",
    description: "A coloured band carries the name and contact line; sections get a matching rule.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "color", "hyperref"],
    accent: "0.10,0.38,0.27",
    margin: "0.8in",
    font: "sans",
    header: "banner",
    heading: "accent-rule",
    accentHeader: false,
    density: "regular",
    skills: "list",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Left-aligned header and section titles set in solid crimson blocks.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "color", "hyperref"],
    accent: "0.62,0.11,0.17",
    margin: "0.8in",
    font: "sans",
    header: "left",
    heading: "accent-block",
    accentHeader: true,
    density: "regular",
    skills: "list",
  },
  {
    id: "technical",
    name: "Technical",
    description: "Sans-serif, split header and two-column skills; dense and uncoloured.",
    documentClassOptions: ["10pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "multicol", "hyperref"],
    accent: null,
    margin: "0.65in",
    font: "sans",
    header: "split",
    heading: "caps-rule",
    accentHeader: false,
    density: "compact",
    skills: "columns",
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Serif with a centred plum heading and small-caps section titles.",
    documentClassOptions: ["11pt"],
    packages: ["fontenc", "textcomp", "geometry", "url", "tabularx", "color", "hyperref"],
    accent: "0.36,0.15,0.45",
    margin: "1in",
    font: "serif",
    header: "centered",
    heading: "accent-small-caps",
    accentHeader: true,
    density: "regular",
    skills: "list",
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
