import { withSections, type Resume, type SectionId } from "@/lib/resume/schema";
import { defaultLayout, geometryOptions, type PageLayout } from "@/lib/layout";
import { resolveTheme, type Theme } from "@/lib/themes";
import { escapeLatex } from "@/lib/tex/escape";
import { allowedDocumentClass } from "@/lib/tex/packages";

/**
 * Canonical resume -> LaTeX.
 *
 * The generator is a pure function of `(resume, theme)`: no storage, no network,
 * no model. Everything the document needs that is not in the resume comes from
 * the theme, and every package it emits is named by the theme, so the bundled
 * TeX scheme is checked in one place (`src/lib/tex/packages.ts`).
 */

export interface RenderResult {
  tex: string;
  /** Characters dropped because the bundled scheme cannot typeset them. */
  droppedCharacters: string[];
}

const sectionTitles: Record<SectionId, string> = {
  work: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certificates",
  languages: "Languages",
};

interface Density {
  parskip: string;
  itemsep: string;
  topsep: string;
  /** Space above a section heading. */
  sectionSpace: string;
}

const densities: Record<Theme["density"], Density> = {
  regular: { parskip: "6pt", itemsep: "2pt", topsep: "3pt", sectionSpace: "10pt" },
  compact: { parskip: "3pt", itemsep: "1pt", topsep: "2pt", sectionSpace: "6pt" },
};

/** `\url` sets its own catcodes, so it only has to be fed ASCII. */
function latexUrl(value: string): string {
  return encodeURI(value.trim());
}

/** Joins the non-empty parts of a line, so no separator is ever left dangling. */
function joinParts(parts: (string | null | undefined)[], separator = " \\textbullet\\ "): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);
}

function dateRange(start: string | null, end: string | null): string | null {
  if (start && end) {
    return `${start} -- ${end}`;
  }
  return start ?? end;
}

/** `hyperref` must be loaded after the packages it patches, so it goes last. */
function orderedPackages(theme: Theme): string[] {
  return [...theme.packages].sort((a, b) => Number(a === "hyperref") - Number(b === "hyperref"));
}

function preamble(theme: Theme, density: Density, layout: PageLayout): string[] {
  const options: Record<string, string> = {
    fontenc: "T1",
    geometry: geometryOptions(layout, theme.margin),
    hyperref: "hidelinks",
    ...theme.packageOptions,
  };

  const space = `\\par\\addvspace{${density.sectionSpace}}%`;
  const heading = {
    rule: `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\large\\bfseries #1}\\par\\nobreak
  \\vspace{2pt}\\hrule height 0.6pt\\nobreak\\vspace{4pt}}`,
    "accent-rule": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\color{accent}\\large\\bfseries #1}\\par\\nobreak
  \\vspace{2pt}{\\color{accent}\\hrule height 0.8pt}\\nobreak\\vspace{4pt}}`,
    "small-caps": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\bfseries\\scshape #1}\\par\\nobreak
  \\vspace{1pt}\\hrule height 0.4pt\\nobreak\\vspace{3pt}}`,
    "accent-small-caps": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\color{accent}\\large\\scshape #1}\\par\\nobreak
  \\vspace{1pt}{\\color{accent}\\hrule height 0.4pt}\\nobreak\\vspace{4pt}}`,
    "caps-rule": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\bfseries\\MakeUppercase{#1}}\\par\\nobreak
  \\vspace{2pt}\\hrule height 0.6pt\\nobreak\\vspace{4pt}}`,
    "accent-caps": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\color{accent}\\bfseries\\MakeUppercase{#1}}\\par\\nobreak\\vspace{4pt}}`,
    plain: `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent{\\large\\bfseries #1}\\par\\nobreak\\vspace{4pt}}`,
    "accent-block": `\\newcommand{\\resumesection}[1]{%
  ${space}
  \\noindent\\colorbox{accent}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep\\relax}{\\color{white}\\bfseries\\MakeUppercase{#1}}}\\par\\nobreak\\vspace{4pt}}`,
  }[theme.heading];

  return [
    `\\documentclass[${theme.documentClassOptions.join(",")}]{${allowedDocumentClass}}`,
    ...orderedPackages(theme).map((name) =>
      options[name] ? `\\usepackage[${options[name]}]{${name}}` : `\\usepackage{${name}}`,
    ),
    ...(theme.accent ? [`\\definecolor{accent}{rgb}{${theme.accent}}`] : []),
    ...(theme.font === "sans" ? ["\\renewcommand{\\familydefault}{\\sfdefault}"] : []),
    "\\pagestyle{empty}",
    "\\setlength{\\parindent}{0pt}",
    `\\setlength{\\parskip}{${density.parskip}}`,
    `\\setlength{\\itemsep}{${density.itemsep}}`,
    `\\setlength{\\topsep}{${density.topsep}}`,
    "\\setlength{\\parsep}{0pt}",
    "\\setlength{\\partopsep}{0pt}",
    // Long URLs in free text have no good breakpoints; better a loose line than text in the margin.
    "\\sloppy",
    "\\renewcommand{\\labelitemi}{\\textbullet}",
    // A date column that cannot wrap would otherwise push the title into it.
    "\\newcommand{\\entryline}[2]{\\par\\noindent\\begin{tabularx}{\\linewidth}{@{}Xr@{}}#1 & #2\\end{tabularx}\\par}",
    heading,
  ];
}

type Escape = (value: string) => string;

function renderHeader(resume: Resume, theme: Theme, escape: Escape): string | null {
  const { name, label, email, phone, url, location, profiles } = resume.basics;
  const place = [location?.city, location?.region, location?.country]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(escape)
    .join(", ");

  const contacts = [
    email ? escape(email) : null,
    phone ? escape(phone) : null,
    place || null,
    url ? `\\url{${latexUrl(url)}}` : null,
    ...profiles.map((profile) => {
      const handle = joinParts(
        [profile.network ? escape(profile.network) : null, profile.username ? escape(profile.username) : null],
        " ",
      );
      if (!profile.url) {
        return handle || null;
      }
      return joinParts([handle || null, `\\url{${latexUrl(profile.url)}}`], " ");
    }),
  ];
  const contactLine = joinParts(contacts);

  const accentOn = theme.accentHeader && theme.accent !== null && theme.header !== "banner";
  const accent = (tex: string) => (accentOn ? `{\\color{accent}${tex}}` : tex);

  if (!name.trim() && !label && !contactLine) {
    return null;
  }

  if (theme.header === "split") {
    const left = joinParts(
      [name.trim() ? accent(`{\\LARGE\\bfseries ${escape(name)}}`) : null, label ? `{\\large ${escape(label)}}` : null],
      "\\\\[3pt]\n",
    );

    return [
      "\\noindent",
      "\\begin{minipage}[t]{0.62\\linewidth}",
      left,
      "\\end{minipage}\\hfill",
      "\\begin{minipage}[t]{0.36\\linewidth}",
      "\\raggedleft",
      accent(contactLine),
      "\\end{minipage}",
    ].join("\n");
  }

  const lines = [
    name.trim() ? accent(`{\\LARGE\\bfseries ${escape(name)}}`) : null,
    label ? accent(`{\\large ${escape(label)}}`) : null,
    contactLine ? accent(contactLine) : null,
  ].filter((line): line is string => line !== null);

  const stacked = lines.join("\\\\[4pt]\n");

  if (theme.header === "left") {
    return ["\\begin{flushleft}", stacked, "\\end{flushleft}"].join("\n");
  }

  if (theme.header === "banner") {
    // White on the accent: the banner is the only place the text colour is overridden.
    return [
      "\\noindent\\colorbox{accent}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep\\relax}{\\color{white}%",
      stacked,
      "}}\\par",
    ].join("\n");
  }

  return ["\\begin{center}", stacked, "\\end{center}"].join("\n");
}

function renderHighlights(highlights: string[], escape: Escape): string | null {
  const items = highlights.filter((highlight) => highlight.trim()).map((highlight) => `\\item ${escape(highlight)}`);
  if (items.length === 0) {
    return null;
  }

  return ["\\begin{itemize}", ...items, "\\end{itemize}"].join("\n");
}

function renderWorkSection(resume: Resume, escape: Escape): string[] {
  return resume.work
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      const title = joinParts(
        [`\\textbf{${escape(entry.name)}}`, entry.position ? escape(entry.position) : null],
        " --- ",
      );
      const meta = joinParts(
        [entry.location ? escape(entry.location) : null, entry.url ? `\\url{${latexUrl(entry.url)}}` : null],
      );

      return [
        `\\entryline{${title}}{${escape(dateRange(entry.startDate, entry.endDate) ?? "")}}`,
        meta,
        renderHighlights(entry.highlights, escape),
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n\n");
    });
}

function renderEducationSection(resume: Resume, escape: Escape): string[] {
  return resume.education
    .filter((entry) => entry.institution.trim())
    .map((entry) => {
      const title = joinParts(
        [
          `\\textbf{${escape(entry.institution)}}`,
          joinParts([entry.studyType, entry.area], ", "),
        ],
        " --- ",
      );

      return [
        `\\entryline{${title}}{${escape(dateRange(entry.startDate, entry.endDate) ?? "")}}`,
        entry.score ? escape(entry.score) : null,
        renderHighlights(entry.highlights, escape),
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n\n");
    });
}

function renderSkillsSection(resume: Resume, theme: Theme, escape: Escape): string[] {
  const entries = resume.skills
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      const keywords = joinParts(entry.keywords.map(escape), ", ");
      const level = entry.level ? escape(entry.level) : "";

      if (theme.skills === "columns") {
        return `\\noindent\\textbf{${escape(entry.name)}}${level ? ` (${level})` : ""}${
          keywords ? ` --- ${keywords}` : ""
        }\\par`;
      }

      return [`\\entryline{\\textbf{${escape(entry.name)}}}{${level}}`, keywords || null]
        .filter((line): line is string => Boolean(line))
        .join("\n\n");
    });

  if (entries.length < 2 || theme.skills !== "columns") {
    return entries;
  }

  return [["\\begin{multicols}{2}", ...entries, "\\end{multicols}"].join("\n\n")];
}

function renderProjectsSection(resume: Resume, escape: Escape): string[] {
  return resume.projects
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      return [
        `\\entryline{\\textbf{${escape(entry.name)}}}{}`,
        entry.url ? `\\url{${latexUrl(entry.url)}}` : null,
        entry.description ? escape(entry.description) : null,
        renderHighlights(entry.highlights, escape),
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n\n");
    });
}

function renderCertificatesSection(resume: Resume, escape: Escape): string[] {
  return resume.certificates
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      const meta = joinParts([
        entry.issuer ? escape(entry.issuer) : null,
        entry.url ? `\\url{${latexUrl(entry.url)}}` : null,
      ]);

      return [`\\entryline{\\textbf{${escape(entry.name)}}}{${entry.date ? escape(entry.date) : ""}}`, meta]
        .filter((line): line is string => Boolean(line))
        .join("\n\n");
    });
}

function renderLanguagesSection(resume: Resume, escape: Escape): string[] {
  const items = resume.languages
    .filter((entry) => entry.language.trim())
    .map((entry) => `${escape(entry.language)}${entry.fluency ? ` (${escape(entry.fluency)})` : ""}`);

  return items.length === 0 ? [] : [joinParts(items)];
}

/** Body lines for one section, or an empty list when it has nothing to show. */
function renderSection(id: SectionId, resume: Resume, theme: Theme, escape: Escape): string[] {
  switch (id) {
    case "work":
      return renderWorkSection(resume, escape);
    case "education":
      return renderEducationSection(resume, escape);
    case "skills":
      return renderSkillsSection(resume, theme, escape);
    case "projects":
      return renderProjectsSection(resume, escape);
    case "certificates":
      return renderCertificatesSection(resume, escape);
    case "languages":
      return renderLanguagesSection(resume, escape);
  }
}

export function renderResumeReport(resume: Resume, theme: Theme, layout: PageLayout = defaultLayout): RenderResult {
  const dropped = new Set<string>();
  const escape: Escape = (value) => escapeLatex(value, (character) => dropped.add(character));
  const density = densities[theme.density];

  const sections = withSections(resume)
    .sections.filter((section) => section.visible)
    .flatMap((section) => {
      const body = renderSection(section.id, resume, theme, escape);
      if (body.length === 0) {
        return [];
      }
      return [[`\\resumesection{${sectionTitles[section.id]}}`, ...body].join("\n\n")];
    });

  const blocks = [renderHeader(resume, theme, escape), resume.basics.summary ? escape(resume.basics.summary) : null]
    .filter((block): block is string => Boolean(block))
    .concat(sections);

  const tex = [
    ...preamble(theme, density, layout),
    "\\begin{document}",
    "",
    blocks.join("\n\n"),
    "",
    "\\end{document}",
    "",
  ].join("\n");

  return { tex, droppedCharacters: [...dropped] };
}

/** The generated LaTeX for a resume. */
export function renderResume(resume: Resume, theme: Theme, layout: PageLayout = defaultLayout): string {
  return renderResumeReport(resume, theme, layout).tex;
}

/** Same document, selected by stored `themeId`; unknown ids fall back to the default theme. */
export function renderResumeForThemeId(
  resume: Resume,
  themeId: string | null | undefined,
  layout: PageLayout = defaultLayout,
): RenderResult {
  return renderResumeReport(resume, resolveTheme(themeId), layout);
}

/** Download name for the generated document. */
export function texFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    // Strip combining marks so "José Ñuñez" keeps its letters instead of turning into dashes.
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

  return `${slug || "resume"}.tex`;
}
