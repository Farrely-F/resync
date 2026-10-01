import { describe, expect, it } from "vitest";

import { defaultLayout, geometryOptions, resolveLayout } from "@/lib/layout";
import { emptyResume } from "@/lib/resume/schema";
import { themes } from "@/lib/themes";
import { renderResume } from "@/lib/tex/generate";
import { allowedPackages, usedPackages } from "@/lib/tex/packages";
import { validateTex } from "@/lib/tex/validate";

describe("layout", () => {
  it("falls back to letter paper and the theme margin for an old record", () => {
    expect(resolveLayout(undefined)).toEqual(defaultLayout);
    expect(resolveLayout({ paper: "nope" as never, marginMm: Number.NaN })).toEqual(defaultLayout);
  });

  it("clamps a stored margin into range", () => {
    expect(resolveLayout({ paper: "a4", marginMm: 500 })).toEqual({ paper: "a4", marginMm: 40 });
    expect(resolveLayout({ paper: "a4", marginMm: 1 }).marginMm).toBe(8);
  });

  it("writes paper and margin into geometry", () => {
    expect(geometryOptions({ paper: "a4", marginMm: null }, "0.9in")).toBe("a4paper,margin=0.9in");
    expect(geometryOptions({ paper: "legal", marginMm: 20 }, "0.9in")).toBe("legalpaper,margin=20mm");
  });

  it.each(themes.map((theme) => [theme.id, theme] as const))("renders a valid document for %s", (_id, theme) => {
    const resume = emptyResume();
    resume.basics.name = "Ada";
    resume.basics.email = "ada@example.com";
    const tex = renderResume(resume, theme, { paper: "a4", marginMm: 15 });

    expect(tex).toContain("\\usepackage[T1]{fontenc}");
    expect(tex).toContain("a4paper,margin=15mm");
    expect(validateTex(tex)).toEqual([]);
    for (const name of usedPackages(tex)) {
      expect(allowedPackages as readonly string[]).toContain(name);
    }
    // \color and \colorbox only exist when the theme loads color.sty.
    if (/\\color|\\colorbox|\\definecolor/.test(tex)) {
      expect(usedPackages(tex)).toContain("color");
    }
  });
});
