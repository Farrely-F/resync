import { describe, expect, it } from "vitest";

import { defaultTheme, accentCssColor, getTheme, resolveTheme, themes } from "@/lib/themes";
import { allowedPackages, forbiddenPackages } from "@/lib/tex/packages";

describe("themes", () => {
  it("ships ten distinct themes", () => {
    expect(themes).toHaveLength(10);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(10);
    for (const theme of themes) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      expect(theme.documentClassOptions.length).toBeGreaterThan(0);
    }
  });

  it("only names packages the bundled TeX scheme provides", () => {
    for (const theme of themes) {
      expect(theme.packages.length).toBeGreaterThan(0);
      for (const name of theme.packages) {
        expect(allowedPackages as readonly string[]).toContain(name);
        expect(forbiddenPackages as readonly string[]).not.toContain(name);
      }
    }
  });

  it("differ from each other in more than their id", () => {
    const shapes = themes.map((theme) =>
      [
        theme.font,
        theme.header,
        theme.heading,
        theme.density,
        theme.skills,
        theme.accent ?? "none",
        theme.accentHeader,
        theme.documentClassOptions.join(","),
      ].join("|"),
    );

    expect(new Set(shapes).size).toBe(themes.length);
  });

  it("resolves a stored id, falling back to the default theme", () => {
    expect(getTheme("compact")?.name).toBe("Compact");
    expect(getTheme("nope")).toBeNull();
    expect(resolveTheme("accent").id).toBe("accent");
    expect(resolveTheme("nope")).toBe(defaultTheme);
    expect(resolveTheme(undefined)).toBe(defaultTheme);
  });
});

describe("accentCssColor", () => {
  it("converts the LaTeX rgb triple to a CSS colour", () => {
    expect(accentCssColor("0.11,0.33,0.55")).toBe("rgb(28 84 140)");
    expect(accentCssColor("0,0,0")).toBe("rgb(0 0 0)");
  });

  it("returns null for a monochrome theme or a malformed triple", () => {
    expect(accentCssColor(null)).toBeNull();
    expect(accentCssColor("0.1,0.2")).toBeNull();
    expect(accentCssColor("a,b,c")).toBeNull();
  });
});
