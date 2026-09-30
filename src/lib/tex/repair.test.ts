import { describe, expect, it } from "vitest";

import { repairTex } from "@/lib/tex/repair";
import { validateTex } from "@/lib/tex/validate";
import { renderResumeForThemeId } from "@/lib/tex/generate";
import { defaultTheme } from "@/lib/themes";
import { parseResumeFixture } from "@/lib/resume/fixtures";

const document = `\\documentclass{article}
\\begin{document}
Hello world.
\\end{document}
`;

describe("repairTex", () => {
  it("leaves a valid document untouched", () => {
    const repair = repairTex(document);

    expect(repair.tex).toBe(document);
    expect(repair.fixes).toEqual([]);
    expect(repair.remaining).toEqual([]);
  });

  it("closes a brace that was never closed, at the end of its line", () => {
    const broken = `\\documentclass{article}
\\begin{document}
\\textbf{Northwind Payments
Mentored four engineers.
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(repair.tex.split("\n")[2]).toBe("\\textbf{Northwind Payments}");
    // Everything else is exactly as it was: the repair is an insertion, not a rewrite.
    expect(repair.tex.replace("Payments}", "Payments")).toBe(broken);
    expect(repair.fixes).toEqual([
      "closed the brace opened on line 3 by adding } at the end of that line",
    ]);
  });

  it("removes a closing brace that has no opener", () => {
    const broken = `\\documentclass{article}
\\begin{document}
Mentored four engineers.}
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(repair.tex).toContain("Mentored four engineers.\n");
    expect(repair.tex).not.toContain("engineers.}");
    expect(repair.fixes[0]).toContain("removed the stray } on line 3");
  });

  it("ends an environment that was never ended", () => {
    const broken = `\\documentclass{article}
\\begin{document}
\\begin{itemize}
\\item One
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    // Both the list and the document are closed, innermost first: the last
    // environment opened has to be the first one ended.
    expect(repair.tex).toContain("\\item One\n\n\\end{itemize}\n\\end{document}\n");
    expect(repair.fixes[0]).toContain("innermost first");
  });

  it("removes an \\end whose environment was never opened", () => {
    const broken = `\\documentclass{article}
\\begin{document}
Hello.
\\end{itemize}
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(repair.tex).not.toContain("\\end{itemize}");
    expect(repair.tex).toContain("\\end{document}");
    expect(repair.fixes[0]).toContain("removed the \\end{itemize} on line 4");
  });

  it("handles several problems at once, including one on the same line", () => {
    const broken = `\\documentclass{article}
\\begin{document}
\\textbf{Alpha} and \\emph{Beta
\\begin{itemize}
\\item One
\\end{itemize}
\\end{center}
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(repair.tex.split("\n")[2]).toBe("\\textbf{Alpha} and \\emph{Beta}");
    expect(repair.tex).not.toContain("\\end{center}");
  });

  it("repairs a stray brace that only becomes visible after another repair", () => {
    // Removing the `}` that closes the group leaves the earlier `{` unmatched, so
    // the second pass has work the first pass could not see.
    const broken = `\\documentclass{article}
\\begin{document}
{a} b} c
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(validateTex(repair.tex)).toEqual([]);
  });

  it("leaves an escaped brace, a comment and a verbatim body alone", () => {
    // None of these are syntax problems, and a repair that touched them would be
    // editing prose.
    const fine = `\\documentclass{article}
\\begin{document}
A literal \\{ brace and a \\} brace.
% a comment with { and } in it
\\begin{verbatim}
{ unbalanced in verbatim
\\end{verbatim}
\\end{document}
`;

    expect(validateTex(fine)).toEqual([]);
    expect(repairTex(fine).tex).toBe(fine);
  });

  it("puts the closing brace before a comment, where it still counts", () => {
    const broken = `\\documentclass{article}
\\begin{document}
\\textbf{Alpha % the employer
\\end{document}
`;

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    // Immediately before the `%`: anything after it is commented out, so a brace
    // inserted at the end of the line would not count.
    expect(repair.tex.split("\n")[2]).toBe("\\textbf{Alpha }% the employer");
  });

  it("leaves a problem it cannot name alone, and says so", () => {
    // A bare `\begin` has no environment name to close, so there is nothing
    // correct to insert: the honest answer is to report it as still broken.
    const broken = "\\documentclass{article}\n\\begin{document}\n\\begin\n";

    const repair = repairTex(broken);

    expect(repair.remaining.some((problem) => problem.kind === "unbalanced-environment")).toBe(true);
    expect(repair.remaining.some((problem) => problem.message.includes("\\begin starts"))).toBe(true);
  });

  it("keeps every character of the original text", () => {
    // A repair inserts or deletes only what it reported, so the rest of the
    // document survives byte for byte.
    const broken = "\\documentclass{article}\n\\begin{document}\nAlpha {\nBeta }\n\\end{document}\n";

    const repair = repairTex(broken);

    expect(repair.remaining).toEqual([]);
    expect(repair.tex).toContain("Alpha {");
    expect(repair.tex).toContain("Beta }");
    expect(repair.tex).toContain("\\documentclass{article}");
  });

  it("does not touch a document the generator produced", () => {
    // The guard against the repair being destructive: a real generated resume is
    // valid, so the repair must be a no-op on it.
    const generated = renderResumeForThemeId(parseResumeFixture, defaultTheme.id);

    expect(validateTex(generated.tex)).toEqual([]);
    expect(repairTex(generated.tex).tex).toBe(generated.tex);
  });
});
