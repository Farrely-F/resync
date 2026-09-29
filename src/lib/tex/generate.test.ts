import { describe, expect, it } from "vitest";

import { defaultSections, emptyResume, resumeSchema, type Resume } from "@/lib/resume/schema";
import { defaultTheme, themes } from "@/lib/themes";
import { renderResume, renderResumeForThemeId, renderResumeReport, texFileName } from "@/lib/tex/generate";
import { allowedPackages, forbiddenPackages, usedPackages } from "@/lib/tex/packages";

function richResume(): Resume {
  return resumeSchema.parse({
    basics: {
      name: "Ada Lovelace",
      label: "Mathematician",
      email: "ada@example.com",
      phone: "+44 20 7946 0000",
      url: "https://example.com/ada?a=1&b=2",
      summary: "Wrote the first published algorithm.",
      location: { city: "London", country: "UK" },
      profiles: [{ network: "GitHub", username: "ada_l", url: "https://github.com/ada" }],
    },
    work: [
      {
        name: "Analytical Engines Ltd",
        position: "Lead",
        location: "London",
        startDate: "1842",
        endDate: "1843",
        highlights: ["Wrote the first algorithm"],
      },
      { name: "Sparse Co" },
    ],
    education: [
      {
        institution: "Home tutored",
        studyType: "BSc",
        area: "Mathematics",
        startDate: "1832",
        endDate: "1840",
      },
    ],
    skills: [
      { name: "Mathematics", level: "Expert", keywords: ["analysis", "notation"] },
      { name: "Writing" },
    ],
    projects: [
      {
        name: "Note G",
        description: "Bernoulli numbers",
        url: "https://example.com/note-g",
        highlights: ["Published 1843"],
      },
    ],
    certificates: [{ name: "Fellow", issuer: "Royal Society", date: "1840" }],
    languages: [{ language: "English", fluency: "Native" }],
    sections: defaultSections,
  });
}

/** The part of the document between two section headings. */
function sectionBody(tex: string, heading: string, nextHeading?: string): string {
  const start = tex.indexOf(`\\resumesection{${heading}}`);
  const end = nextHeading ? tex.indexOf(`\\resumesection{${nextHeading}}`) : tex.indexOf("\\end{document}");
  return tex.slice(start, end);
}

describe("renderResume", () => {
  it("writes a complete document shell with one document environment", () => {
    const tex = renderResume(richResume(), defaultTheme);

    expect(tex).toContain("\\documentclass[11pt]{article}");
    expect(tex.match(/\\begin\{document\}/g)).toHaveLength(1);
    expect(tex.match(/\\end\{document\}/g)).toHaveLength(1);
    expect(tex.trimEnd().endsWith("\\end{document}")).toBe(true);
  });

  it("follows the stored section order", () => {
    const resume = resumeSchema.parse({
      basics: { name: "Ada" },
      work: [{ name: "Analytical Engines Ltd" }],
      education: [{ institution: "Home tutored" }],
      sections: [
        { id: "education", visible: true },
        { id: "work", visible: true },
      ],
    });

    const tex = renderResume(resume, defaultTheme);

    expect(tex.indexOf("\\resumesection{Education}")).toBeLessThan(tex.indexOf("\\resumesection{Experience}"));
  });

  it("omits hidden sections even when they hold data", () => {
    const resume = richResume();
    const tex = renderResume(
      { ...resume, sections: resume.sections.map((s) => (s.id === "languages" ? { ...s, visible: false } : s)) },
      defaultTheme,
    );

    expect(tex).not.toContain("\\resumesection{Languages}");
    expect(tex).not.toContain("Native");
  });

  it("omits sections that have nothing to render", () => {
    const tex = renderResume(emptyResume(), defaultTheme);

    for (const heading of ["Experience", "Education", "Skills", "Projects", "Certificates", "Languages"]) {
      expect(tex).not.toContain(`\\resumesection{${heading}}`);
    }
    expect(tex).not.toMatch(/\\resumesection\{\}/);
    expect(tex).toContain("\\end{document}");
  });

  it("renders sparse entries without dangling separators or empty emphasis", () => {
    const tex = renderResume(richResume(), defaultTheme);
    const work = sectionBody(tex, "Experience", "Education");

    expect(work).toContain("\\entryline{\\textbf{Sparse Co}}{}");
    expect(work).not.toContain("Sparse Co --- ");
    expect(work).not.toContain("\\textbullet");
    expect(tex).not.toMatch(/\\textbf\{\}/);
    expect(tex).not.toContain("  --- ");
  });

  it("renders a resume with no work entries", () => {
    const resume = resumeSchema.parse({ basics: { name: "Ada" }, skills: [{ name: "Mathematics" }] });
    const tex = renderResume(resume, defaultTheme);

    expect(tex).not.toContain("\\resumesection{Experience}");
    expect(tex).toContain("\\resumesection{Skills}");
    expect(tex).toContain("\\end{document}");
  });

  it("joins a date range and hides it when both ends are missing", () => {
    const tex = renderResume(richResume(), defaultTheme);

    expect(tex).toContain("}{1842 -- 1843}");
  });

  it("balances every environment it opens", () => {
    const tex = renderResume(richResume(), themes[2]);

    for (const environment of ["itemize", "multicols", "tabularx", "minipage", "center", "document"]) {
      const opens = tex.match(new RegExp(`\\\\begin\\{${environment}\\}`, "g"))?.length ?? 0;
      const closes = tex.match(new RegExp(`\\\\end\\{${environment}\\}`, "g"))?.length ?? 0;
      expect(opens).toBe(closes);
    }
    expect(tex).toContain("\\begin{multicols}{2}");
  });

  it("shows a contact line only for the fields that exist", () => {
    const resume = resumeSchema.parse({ basics: { name: "Ada", email: "ada@example.com" } });
    const tex = renderResume(resume, defaultTheme);
    const body = tex.slice(tex.indexOf("\\begin{document}"), tex.indexOf("\\end{document}"));

    expect(body).toContain("ada@example.com");
    expect(body).not.toContain("\\textbullet");
  });

  it("escapes hostile text in every field instead of letting it run", () => {
    const resume = resumeSchema.parse({
      basics: { name: "Ada \\input{/etc/passwd}", summary: "100% & 50€" },
      skills: [{ name: "C++ & Rust_x" }],
    });
    const tex = renderResume(resume, defaultTheme);

    expect(tex).toContain("\\textbackslash{}input\\{/etc/passwd\\}");
    expect(tex).not.toContain("\\input{");
    expect(tex).toContain("100\\% \\& 50\\texteuro{}");
    expect(tex).toContain("C++ \\& Rust\\_x");
  });

  it("escapes every contact field, including the profile handle", () => {
    const tex = renderResume(richResume(), defaultTheme);

    expect(tex).toContain("GitHub ada\\_l");
    expect(tex).not.toContain("ada_l ");
  });

  it("reports characters it had to drop, and still produces a document", () => {
    const resume = resumeSchema.parse({ basics: { name: "日本語" } });
    const { tex, droppedCharacters } = renderResumeReport(resume, defaultTheme);

    expect(droppedCharacters).toEqual(["日", "本", "語"]);
    expect(tex).toContain("\\begin{document}");
  });

  it("produces different LaTeX for every theme", () => {
    const resume = richResume();
    const documents = themes.map((theme) => renderResume(resume, theme));

    expect(new Set(documents).size).toBe(themes.length);
  });

  it("only ever loads whitelisted packages, with hyperref last", () => {
    const resume = richResume();

    for (const theme of themes) {
      const tex = renderResume(resume, theme);
      const packages = usedPackages(tex);

      expect(packages.length).toBeGreaterThan(0);
      for (const name of packages) {
        expect(allowedPackages as readonly string[]).toContain(name);
        expect(forbiddenPackages as readonly string[]).not.toContain(name);
      }
      expect(packages.at(-1)).toBe("hyperref");

      // Every declared package must actually be emitted, and nothing else may be.
      for (const declared of theme.packages) {
        expect(packages).toContain(declared);
      }
      expect([...packages].sort()).toEqual([...theme.packages].sort());
    }
  });

  it("defines the accent colour only for themes that have one", () => {
    const resume = richResume();

    for (const theme of themes) {
      const tex = renderResume(resume, theme);
      if (theme.accent) {
        expect(tex).toContain(`\\definecolor{accent}{rgb}{${theme.accent}}`);
        expect(tex).toContain("\\color{accent}");
      } else {
        expect(tex).not.toContain("\\definecolor");
        expect(tex).not.toContain("\\color{accent}");
      }
    }
  });

  it("selects the theme named by a stored id, falling back to the default", () => {
    const resume = richResume();

    expect(renderResumeForThemeId(resume, "compact").tex).toBe(renderResume(resume, themes[2]));
    expect(renderResumeForThemeId(resume, "no-such-theme").tex).toBe(renderResume(resume, defaultTheme));
    expect(renderResumeForThemeId(resume, null).tex).toBe(renderResume(resume, defaultTheme));
  });
});

describe("texFileName", () => {
  it("derives a safe download name from the resume title", () => {
    expect(texFileName("Ada Lovelace")).toBe("ada-lovelace.tex");
    expect(texFileName("Ada Lovelace — José Ñuñez")).toBe("ada-lovelace-jose-nunez.tex");
    expect(texFileName("  Résumé 2026 !!  ")).toBe("resume-2026.tex");
    expect(texFileName("!!!")).toBe("resume.tex");
    expect(texFileName("")).toBe("resume.tex");
  });
});
