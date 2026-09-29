import { withSections, type Resume, type SectionId } from "@/lib/resume/schema";
import type { AtsCheck } from "@/lib/match/types";

/**
 * ATS format checks.
 *
 * These are decidable from what we hold — the generated document and the
 * canonical resume — and are deliberately not asked of the model: a parser's
 * trouble with a two-column layout or a missing email is a property of the
 * file, not a judgement call, and it must not change between two runs of the
 * same document.
 *
 * Everything here is a statement about the document we would produce, not a
 * promise about a specific vendor's parser.
 */

/** Display names for a section, matching the generated document's headings. */
const sectionLabels: Record<SectionId, string> = {
  work: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certificates",
  languages: "Languages",
};

/**
 * Roughly how much document body fits on one page at the default theme's 10pt
 * with the default margins. An estimate by construction — we cannot paginate
 * without compiling — so the check reports the measured characters and this
 * divisor rather than pretending to know the page count.
 */
export const charactersPerPage = 3_000;

/** Beyond this the posting is usually read as "lots of text" and skimmed. */
export const maxExpectedPages = 2;

export interface AtsInput {
  resume: Resume;
  /** The generated LaTeX for this resume, so the checks read the real document. */
  tex: string;
}

function countMatches(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Characters between `\begin{document}` and `\end{document}`. */
function bodyLength(tex: string): number {
  const start = tex.indexOf("\\begin{document}");
  const end = tex.indexOf("\\end{document}");
  if (start === -1 || end === -1 || end <= start) {
    return tex.length;
  }

  return tex.slice(start + "\\begin{document}".length, end).trim().length;
}

function contactCheck(resume: Resume): AtsCheck {
  const email = Boolean(resume.basics.email?.trim());
  const phone = Boolean(resume.basics.phone?.trim());

  const detail = email && phone
    ? "Email and phone are both in the header."
    : email
      ? "Email is in the header but no phone number is; a parser looking for a phone column finds nothing."
      : phone
        ? "A phone number is in the header but no email address is; most parsers key on the email."
        : "The header has neither an email address nor a phone number, so a parser has nothing to attach the document to a candidate with.";

  return { id: "contact-details", label: "Contact details", passed: email && phone, detail };
}

function sectionCheck(resume: Resume, tex: string): AtsCheck {
  const visible = withSections(resume).sections.filter((section) => section.visible).map((section) => section.id);
  // Zero entries means the generator drops the section's heading from the document.
  const empty = visible.filter((id) => resume[id].length === 0);
  const rendered = countMatches(tex, "\\resumesection{");

  const detail = empty.length === 0
    ? `All ${rendered} visible sections contain content.`
    : `${empty.length} of ${visible.length} visible sections have no entries, so the document omits their headings: ${empty
        .map((id) => sectionLabels[id])
        .join(", ")}. An unseen section shrinks the document without the reader knowing why.`;

  return { id: "section-content", label: "Section content", passed: empty.length === 0, detail };
}

function columnCheck(tex: string): AtsCheck {
  const multicol = countMatches(tex, "\\begin{multicols}");
  const minipage = countMatches(tex, "\\begin{minipage}");

  const problems = [
    multicol > 0 ? `${multicol} skill block${multicol === 1 ? "" : "s"} set in \`multicol\`` : null,
    minipage > 0 ? "a side-by-side header built from minipages" : null,
  ].filter((problem): problem is string => problem !== null);

  const detail = problems.length === 0
    ? "The document reads top to bottom in a single column, which is what a generic parser expects."
    : `The document is not single-column: ${problems.join(" and ")}. Text set side by side is commonly read out of order, or interleaved, by parsers that walk the page linearly.`;

  return { id: "single-column", label: "Single-column layout", passed: problems.length === 0, detail };
}

function lengthCheck(tex: string): AtsCheck {
  const characters = bodyLength(tex);
  const pages = Math.ceil(characters / charactersPerPage);

  const detail =
    characters === 0
      ? "The generated document body is empty: there are no sections and no header to read."
      : pages > maxExpectedPages
        ? `The document body is ${characters.toLocaleString()} characters, about ${pages} pages at ${charactersPerPage.toLocaleString()} characters per page — beyond the ${maxExpectedPages} pages a first read usually covers.`
        : `The document body is ${characters.toLocaleString()} characters, about ${pages} page${pages === 1 ? "" : "s"} at ${charactersPerPage.toLocaleString()} characters per page.`;

  return { id: "content-length", label: "Document length", passed: pages >= 1 && pages <= maxExpectedPages, detail };
}

/** All checks, in a stable order so two renders of the same document agree. */
export function runAtsChecks(input: AtsInput): AtsCheck[] {
  return [
    contactCheck(input.resume),
    sectionCheck(input.resume, input.tex),
    columnCheck(input.tex),
    lengthCheck(input.tex),
  ];
}
