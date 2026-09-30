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
