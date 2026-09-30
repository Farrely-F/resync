import { describe, expect, it } from "vitest";

import { parseResumeFixture } from "@/lib/resume/fixtures";
import { renderResumeForThemeId } from "@/lib/tex/generate";
import { validateTex } from "@/lib/tex/validate";

const document = (body: string): string => `\\documentclass{article}\n\\begin{document}\n${body}\\end{document}\n`;

describe("validateTex", () => {
  it("passes the document the app generates from a resume", () => {
    const tex = renderResumeForThemeId(parseResumeFixture, "classic").tex;

    expect(validateTex(tex)).toEqual([]);
  });

  it("reads a percent-encoded url as text rather than as a comment", () => {
    // `latexUrl` percent-encodes, because `\url` wants ASCII: a quote becomes
    // `%22`, a space `%20`, a literal percent sign `%25`. Inside `\url` those are
    // literal percent signs — the package sets its own catcodes — but the parser
    // used here read one as the start of a comment, swallowed the argument's
    // closing brace, and refused the preview for a document that compiles.
    const tex = document("\\url{https://example.com/a%22b%20c%25d}\n");

    expect(validateTex(tex)).toEqual([]);
  });

  it("still reports a real problem after a url, on the line it is on", () => {
    // Masking the argument must not hide anything, and must not move the lines of
    // what follows it.
    const tex = document("\\url{https://example.com/a%22b}\nA {group that never ends\nlast line\n");

    const problems = validateTex(tex);

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("unbalanced-brace");
    expect(problems[0].line).toBe(4);
  });

  it("reports an opening brace that is never closed, with its line", () => {
    const problems = validateTex(document("Summary line\nA {group that never ends\nlast line\n"));

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("unbalanced-brace");
    expect(problems[0].line).toBe(4);
    expect(problems[0].message).toContain("opening brace");
    expect(problems[0].message).toContain("never closed");
  });

  it("reports a closing brace with nothing to close", () => {
    const problems = validateTex(document("ok\nstray }\n"));

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("unbalanced-brace");
    expect(problems[0].line).toBe(4);
    expect(problems[0].message).toContain("closing brace");
  });

  it("reports an environment that is never ended, naming it", () => {
    const problems = validateTex(document("\\begin{itemize}\n\\item one\n"));

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("unbalanced-environment");
    expect(problems[0].line).toBe(3);
    expect(problems[0].message).toContain("\\begin{itemize}");
    expect(problems[0].message).toContain("never ended");
  });

  it("reports an \\end with no matching \\begin", () => {
    const problems = validateTex("\\documentclass{article}\n\\end{document}\n");

    expect(problems).toHaveLength(1);
    expect(problems[0].kind).toBe("unbalanced-environment");
    expect(problems[0].line).toBe(2);
    expect(problems[0].message).toContain("\\end{document}");
    expect(problems[0].message).toContain("no matching");
  });

  it("reports both halves of a mismatched pair", () => {
    const problems = validateTex("\\begin{a}\n\\end{b}\n");

    expect(problems.map((problem) => [problem.line, problem.message])).toEqual([
      [1, "\\begin{a} starts an environment that is never ended"],
      [2, "\\end{b} has no matching \\begin"],
    ]);
  });

  it("reports several problems in source order", () => {
    const problems = validateTex(document("a } brace\n\\begin{itemize}\n\\item x\n"));

    expect(problems.map((problem) => [problem.kind, problem.line])).toEqual([
      ["unbalanced-brace", 3],
      ["unbalanced-environment", 4],
    ]);
  });

  it("does not mistake an escaped brace for an unbalanced one", () => {
    expect(validateTex(document("a \\{literal\\} brace\n"))).toEqual([]);
  });

  it("ignores braces inside a comment", () => {
    expect(validateTex(document("% { not real }\nok % }\n"))).toEqual([]);
  });

  it("ignores braces inside a verbatim environment", () => {
    expect(validateTex("\\begin{document}\n\\begin{verbatim}\n{ unbalanced\n\\end{verbatim}\n\\end{document}\n")).toEqual(
      [],
    );
  });

  it("reports a nested environment left open inside a closed one", () => {
    const problems = validateTex(document("\\begin{quote}\nquoted\n\\end{quote}\n\\begin{quote}\nstill open\n"));

    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(6);
    expect(problems[0].message).toContain("\\begin{quote}");
  });

  it("returns no problems for an empty document", () => {
    expect(validateTex("")).toEqual([]);
  });
});
