import { describe, expect, it } from "vitest";

import {
  addBullet,
  addEntry,
  addProfile,
  listEntries,
  moveBullet,
  moveEntry,
  moveItem,
  reorderSection,
  normalizeResume,
  removeBullet,
  removeEntry,
  removeProfile,
  replaceEntry,
  replaceProfile,
  sectionOrder,
  setBasics,
  setBullet,
  setLocation,
  setSectionVisible,
} from "@/components/editor/resume-ops";
import { readText, sectionSpecs } from "@/components/editor/section-specs";
import { defaultSections, emptyResume, resumeSchema, sectionIds, type Resume } from "@/lib/resume/schema";
import { defaultTheme } from "@/lib/themes";
import { renderResume } from "@/lib/tex/generate";

function resume(overrides: Record<string, unknown> = {}): Resume {
  return resumeSchema.parse({ basics: { name: "Ada Lovelace" }, sections: defaultSections, ...overrides });
}

/** The body of one section of the generated document. */
function sectionBody(tex: string, heading: string): string {
  const start = tex.indexOf(`\\resumesection{${heading}}`);
  const end = tex.indexOf("\\resumesection{", start + 1);
  return tex.slice(start, end === -1 ? tex.indexOf("\\end{document}") : end);
}

describe("moveItem", () => {
  it("moves an item in both directions without touching the original array", () => {
    const items = ["a", "b", "c"];

    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(items, 2, 1)).toEqual(["a", "c", "b"]);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("is a no-op at either end rather than a wrap-around", () => {
    const items = ["a", "b", "c"];

    expect(moveItem(items, 0, -1)).toEqual(items);
    expect(moveItem(items, 2, 3)).toEqual(items);
    expect(moveItem(items, 5, 0)).toEqual(items);
    expect(moveItem(items, 1, 1)).toEqual(items);
  });
});

describe("section order and visibility", () => {
  it("follows the schema's section order out of the box", () => {
    expect(sectionOrder(emptyResume()).map((section) => section.id)).toEqual([...sectionIds]);
  });

  it("reorders a section and the document with it", () => {
    const before = resume({ work: [{ name: "Northwind" }], education: [{ institution: "Bristol" }] });
    // Education is second in the schema; dropping it on the first position is what
    // a drag reports, and the generated document has to follow the list.
    const after = reorderSection(before, 1, 0);

    expect(after.sections.map((section) => section.id).slice(0, 2)).toEqual(["education", "work"]);

    const tex = renderResume(after, defaultTheme);
    expect(tex.indexOf("\\resumesection{Education}")).toBeLessThan(tex.indexOf("\\resumesection{Experience}"));
  });

  it("moves a section down as well as up", () => {
    const before = resume({ work: [{ name: "Northwind" }] });

    expect(reorderSection(before, 0, 2).sections.map((section) => section.id).slice(0, 3)).toEqual([
      "education",
      "skills",
      "work",
    ]);
  });

  it("leaves the resume untouched for a drop at the same place or out of range", () => {
    const before = resume({ work: [{ name: "Northwind" }] });

    // Same object, not a copy: the editor writes state on every drop, so a no-op
    // must not look like an edit to anything watching for changes.
    expect(reorderSection(before, 0, 0)).toBe(before);
    expect(reorderSection(before, 0, sectionIds.length)).toBe(before);
    expect(reorderSection(before, -1, 1)).toBe(before);
    expect(reorderSection(before, 2, sectionIds.length + 5)).toBe(before);
  });

  it("takes a hidden section out of the document and puts it back", () => {
    const before = resume({ work: [{ name: "Northwind" }], skills: [{ name: "Go" }] });
    const hidden = setSectionVisible(before, "work", false);

    expect(hidden.sections.find((section) => section.id === "work")?.visible).toBe(false);
    expect(renderResume(hidden, defaultTheme)).not.toContain("\\resumesection{Experience}");
    expect(renderResume(hidden, defaultTheme)).toContain("\\resumesection{Skills}");
    expect(renderResume(setSectionVisible(hidden, "work", true), defaultTheme)).toContain(
      "\\resumesection{Experience}",
    );
  });

  it("keeps a hidden section's entries in the resume", () => {
    const before = resume({ work: [{ name: "Northwind" }] });

    expect(listEntries(setSectionVisible(before, "work", false), "work")).toHaveLength(1);
  });
});

describe("entries", () => {
  it("appends, replaces, reorders and removes one entry at a time", () => {
    const first = resume({ work: [{ name: "Northwind" }, { name: "Cobalt" }] });

    const added = addEntry(first, "work", sectionSpecs.work.blank());
    expect(listEntries(added, "work")).toHaveLength(3);

    const replaced = replaceEntry(added, "work", 1, { name: "Cobalt Analytics" });
    expect(listEntries(replaced, "work").map((entry) => readText(entry, "name"))).toEqual([
      "Northwind",
      "Cobalt Analytics",
      "",
    ]);

    const moved = moveEntry(replaced, "work", 0, 1);
    expect(listEntries(moved, "work").map((entry) => readText(entry, "name"))).toEqual([
      "Cobalt Analytics",
      "Northwind",
      "",
    ]);

    const removed = removeEntry(moved, "work", 1);
    expect(listEntries(removed, "work").map((entry) => readText(entry, "name"))).toEqual(["Cobalt Analytics", ""]);
  });

  it("puts the entries in the document in the order they are listed", () => {
    const before = resume({ work: [{ name: "Northwind" }, { name: "Cobalt" }] });
    const after = moveEntry(before, "work", 0, 1);

    const tex = renderResume(after, defaultTheme);
    expect(tex.indexOf("Cobalt")).toBeLessThan(tex.indexOf("Northwind"));
  });

  it("keeps every resume the editor builds readable by the canonical schema", () => {
    const built = sectionIds.reduce(
      (current, id) => addEntry(current, id, sectionSpecs[id].blank()),
      resume(),
    );

    expect(() => resumeSchema.parse(built)).not.toThrow();
  });
});

describe("bullets", () => {
  it("adds, edits, reorders and removes one bullet at a time", () => {
    const values = ["first", "second", "third"];

    expect(addBullet(values)).toEqual(["first", "second", "third", ""]);
    expect(setBullet(values, 1, "changed")).toEqual(["first", "changed", "third"]);
    expect(moveBullet(values, 0, 2)).toEqual(["second", "third", "first"]);
    expect(removeBullet(values, 2)).toEqual(["first", "second"]);
    expect(values).toEqual(["first", "second", "third"]);
  });

  it("reorders the highlights of a work entry through the entry itself", () => {
    const entry = { name: "Northwind", highlights: ["alpha", "beta"] };

    expect({ ...entry, highlights: moveBullet(entry.highlights, 0, 1) }).toEqual({
      name: "Northwind",
      highlights: ["beta", "alpha"],
    });
  });
});

describe("basics", () => {
  it("patches one field without disturbing the others", () => {
    const before = resume({ basics: { name: "Ada", label: "Mathematician", email: "ada@example.com" } });
    const after = setBasics(before, { label: "Analyst" });

    expect(after.basics).toMatchObject({ name: "Ada", label: "Analyst", email: "ada@example.com" });
  });

  it("creates the location object when a city is typed into an empty resume", () => {
    expect(emptyResume().basics.location).toBeNull();

    expect(setLocation(emptyResume(), "city", "Bristol").basics.location).toEqual({
      city: "Bristol",
      region: null,
      country: null,
    });
  });

  it("adds, edits and removes a link", () => {
    const added = addProfile(resume());
    expect(added.basics.profiles).toEqual([{ network: "", username: null, url: null }]);

    const edited = replaceProfile(added, 0, { network: "GitHub", username: "ada" });
    expect(edited.basics.profiles[0]).toEqual({ network: "GitHub", username: "ada", url: null });

    expect(removeProfile(edited, 0).basics.profiles).toEqual([]);
  });
});

describe("normalizeResume", () => {
  it("turns whitespace-only optional fields into null and required ones into empty text", () => {
    const messy = resume({
      basics: { name: "  Ada Lovelace  ", label: "   ", email: " ", location: { city: "", region: " ", country: "" } },
      work: [{ name: " Northwind ", position: "  ", startDate: " ", highlights: ["  alpha  ", "   "] }],
      skills: [{ name: " Go ", level: " ", keywords: ["  ", "goroutines"] }],
    });
    const clean = normalizeResume(messy);

    expect(clean.basics).toMatchObject({ name: "Ada Lovelace", label: null, email: null, location: null });
    expect(clean.work[0]).toMatchObject({ name: "Northwind", position: null, startDate: null });
    expect(clean.work[0].highlights).toEqual(["alpha", ""]);
    expect(clean.skills[0]).toMatchObject({ name: "Go", level: null, keywords: ["", "goroutines"] });
  });

  it("keeps the bullet count so a blank bullet the user just added is still there to type into", () => {
    const messy = resume({ work: [{ name: "Northwind", highlights: ["alpha", ""] }] });

    expect(normalizeResume(messy).work[0].highlights).toHaveLength(2);
  });

  it("fills in section configuration a stored record was missing", () => {
    const legacy = resumeSchema.parse({ basics: { name: "Ada" } });
    const stored = { ...legacy, sections: [{ id: "work" as const, visible: false }] };

    expect(normalizeResume(stored).sections).toEqual([
      { id: "work", visible: false },
      ...sectionIds.filter((id) => id !== "work").map((id) => ({ id, visible: true })),
    ]);
  });
});

describe("empty optional fields in the generated document", () => {
  /** Every optional field present but blank — what a partly filled card looks like. */
  function blankFields(): Resume {
    return resume({
      basics: {
        name: "Ada Lovelace",
        label: "   ",
        email: " ",
        phone: "",
        url: "",
        summary: "   ",
        location: { city: " ", region: null, country: "" },
        profiles: [{ network: " ", username: null, url: null }],
      },
      work: [{ name: "Northwind", position: " ", location: " ", startDate: " ", endDate: "", highlights: [" ", ""] }],
      education: [{ institution: " ", area: " ", highlights: [] }],
      skills: [{ name: "", level: " ", keywords: ["  "] }],
      projects: [{ name: " ", description: " " }],
      certificates: [{ name: "", issuer: " ", date: " " }],
      languages: [{ language: " ", fluency: " " }],
    });
  }

  it("leaves no empty heading for a section whose entries are blank", () => {
    const tex = renderResume(normalizeResume(blankFields()), defaultTheme);

    // Work is the one section with a named entry; the rest have nothing to show.
    expect(tex).toContain("\\resumesection{Experience}");
    for (const heading of ["Education", "Skills", "Projects", "Certificates", "Languages"]) {
      expect(tex).not.toContain(`\\resumesection{${heading}}`);
    }
    expect(tex).not.toContain("\\begin{itemize}");
  });

  it("leaves no dangling separator or blank line in the body", () => {
    const tex = renderResume(normalizeResume(blankFields()), defaultTheme);

    expect(tex).not.toContain(" --- ");
    expect(tex.split("\n").filter((line) => line.length > 0 && line.trim().length === 0)).toEqual([]);
  });

  it("would have written those artifacts without the normalisation", () => {
    // The blank label and summary are truthy strings, and the generator tests
    // exactly that: this is why the editor normalises before generating.
    const raw = renderResume(blankFields(), defaultTheme);

    expect(raw).toContain("\\[4pt]");
    expect(raw).toMatch(/\{\\large\s+\}/);
  });

  it("drops blank highlight lines from a section that also has real ones", () => {
    const withBlanks = resume({
      work: [{ name: "Northwind", highlights: ["Led the migration", "  ", ""] }],
    });

    const body = sectionBody(renderResume(normalizeResume(withBlanks), defaultTheme), "Experience");
    expect(body.match(/\\item/g)).toHaveLength(1);
    expect(body).toContain("\\item Led the migration");
  });
});
