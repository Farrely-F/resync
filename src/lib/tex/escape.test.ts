import { describe, expect, it } from "vitest";

import { escapeLatex, unrepresentableCharacters } from "@/lib/tex/escape";

const hostile = [
  "\\input{/etc/passwd}",
  "100% of $5 & #1_2",
  "~/.config",
  "x^2",
  "{}[]",
  "José — “naïve”, 90° · €500 · 日本語 🙂",
  "already \\escaped \\% here",
  "a\u200bb\ufeffc",
  "tab\there\nand a newline",
].join(" | ");

describe("escapeLatex", () => {
  it("neutralises every LaTeX special character", () => {
    expect(escapeLatex("\\ { } $ & # % _ ^ ~")).toBe(
      "\\textbackslash{} \\{ \\} \\$ \\& \\# \\% \\_ \\textasciicircum{} \\textasciitilde{}",
    );
  });

  it("treats existing LaTeX markup as data instead of letting it run", () => {
    const output = escapeLatex("\\input{/etc/passwd}");

    expect(output).toBe("\\textbackslash{}input\\{/etc/passwd\\}");
    expect(output).not.toContain("\\input");
  });

  it("escapes a string that already contains escapes rather than double-running them", () => {
    expect(escapeLatex("50\\% off \\& more")).toBe("50\\textbackslash{}\\% off \\textbackslash{}\\& more");
  });

  it("rebuilds accented letters from LaTeX accents", () => {
    expect(escapeLatex("café")).toBe("caf\\'{e}");
    expect(escapeLatex("Łukasz")).toBe("\\L{}ukasz");
    expect(escapeLatex("Straße")).toBe("Stra\\ss{}e");
    expect(escapeLatex("naïve")).toBe("na\\\"{i}ve");
  });

  it("stacks accents when a letter carries more than one mark", () => {
    expect(escapeLatex("ế")).toBe("\\'{\\^{e}}");
  });

  it("keeps typographic punctuation and symbols that the basic scheme can typeset", () => {
    expect(escapeLatex("“quoted”")).toBe("``quoted''");
    expect(escapeLatex("a — b – c")).toBe("a --- b -- c");
    expect(escapeLatex("€5 · 90° ± 1")).toBe("\\texteuro{}5 \\textperiodcentered{} 90\\textdegree{} $\\pm$ 1");
    expect(escapeLatex("a\u00a0b")).toBe("a~b");
  });

  it("drops invisible format characters without reporting them", () => {
    expect(escapeLatex("a\u200bb\ufeffc")).toBe("abc");
    expect(unrepresentableCharacters("a\u200bb\ufeffc")).toEqual([]);
  });

  it("drops characters the scheme cannot typeset and reports each distinct one", () => {
    expect(escapeLatex("日本語")).toBe("");
    expect(unrepresentableCharacters("日本語 🙂 日")).toEqual(["日", "本", "語", "🙂"]);
  });

  it("leaves whitespace, including tabs and newlines, alone", () => {
    expect(escapeLatex("a\tb\nc")).toBe("a\tb\nc");
  });

  it("produces ASCII only, whatever the input", () => {
    expect(escapeLatex(hostile)).toMatch(/^[\x09\x0a\x0d\x20-\x7e]*$/);
  });

  it("escapes its own output again: escaping never un-escapes", () => {
    expect(escapeLatex(escapeLatex("a&b"))).toBe("a\\textbackslash{}\\&b");
  });
});
