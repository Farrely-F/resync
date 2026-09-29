import { describe, expect, it } from "vitest";

import { deriveJdTitle, jdSchema } from "@/lib/jd/schema";
import { defaultSections, deriveResumeTitle, emptyResume, resumeSchema, withSections } from "@/lib/resume/schema";

describe("resume schema", () => {
  it("normalises a sparse parse into a fully shaped resume", () => {
    const resume = resumeSchema.parse({
      basics: { name: "Ada Lovelace" },
      work: [{ name: "Analytical Engines Ltd" }],
    });

    expect(resume.basics.email).toBeNull();
    expect(resume.basics.location).toBeNull();
    expect(resume.basics.profiles).toEqual([]);
    expect(resume.work[0].highlights).toEqual([]);
    expect(resume.work[0].position).toBeNull();
    expect(resume.skills).toEqual([]);
    expect(resume.sections).toEqual([]);
  });

  it("keeps messy resume dates verbatim instead of coercing them", () => {
    const resume = resumeSchema.parse({
      basics: {},
      work: [{ name: "Acme", startDate: "Mar 2021", endDate: "Present" }],
    });

    expect(resume.work[0].startDate).toBe("Mar 2021");
    expect(resume.work[0].endDate).toBe("Present");
  });

  it("rejects a work entry without an employer, because it cannot be rendered or matched", () => {
    expect(() => resumeSchema.parse({ basics: {}, work: [{ position: "Engineer" }] })).toThrow();
  });

  it("starts empty with every section visible and in a stable order", () => {
    const resume = emptyResume();

    expect(resume.basics.name).toBe("");
    expect(resume.sections).toEqual(defaultSections);
    expect(resume.sections.map((section) => section.id)).toEqual([
      "work",
      "education",
      "skills",
      "projects",
      "certificates",
      "languages",
    ]);
  });

  it("repairs stored resumes: unknown sections dropped, missing sections restored", () => {
    const resume = withSections({
      ...emptyResume(),
      sections: [
        { id: "work", visible: false },
        { id: "skills", visible: true },
        // A section id from a newer build, or a corrupted record.
        { id: "volunteer", visible: true } as unknown as { id: "work"; visible: boolean },
      ],
    });

    expect(resume.sections.map((section) => section.id)).toEqual([
      "work",
      "skills",
      "education",
      "projects",
      "certificates",
      "languages",
    ]);
    expect(resume.sections.find((section) => section.id === "work")?.visible).toBe(false);
    expect(resume.sections.find((section) => section.id === "projects")?.visible).toBe(true);
  });

  it("derives a non-empty title from a name, then a position, then a fallback", () => {
    expect(deriveResumeTitle(resumeSchema.parse({ basics: { name: "Grace Hopper" } }))).toBe("Grace Hopper");
    expect(
      deriveResumeTitle(resumeSchema.parse({ basics: { name: "  " }, work: [{ name: "Navy", position: "Admiral" }] })),
    ).toBe("Admiral");
    expect(deriveResumeTitle(emptyResume())).toBe("Untitled resume");
  });
});

describe("job description schema", () => {
  it("defaults every list so the matcher never iterates undefined", () => {
    const jd = jdSchema.parse({ title: "Backend Engineer" });

    expect(jd.requirements).toEqual([]);
    expect(jd.niceToHave).toEqual([]);
    expect(jd.skills).toEqual([]);
    expect(jd.company).toBeNull();
  });

  it("keeps requirements and nice-to-haves distinct, because the rubric weights them differently", () => {
    const jd = jdSchema.parse({
      title: "Backend Engineer",
      requirements: ["5 years Go"],
      niceToHave: ["Kubernetes"],
    });

    expect(jd.requirements).toEqual(["5 years Go"]);
    expect(jd.niceToHave).toEqual(["Kubernetes"]);
  });

  it("derives a title that never comes back empty", () => {
    expect(deriveJdTitle(jdSchema.parse({ title: "Backend Engineer", company: "Stripe" }))).toBe(
      "Backend Engineer — Stripe",
    );
    expect(deriveJdTitle(jdSchema.parse({}))).toBe("Untitled job");
  });
});
