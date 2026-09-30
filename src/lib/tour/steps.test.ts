import { describe, expect, it } from "vitest";

import { resolveSteps, tourById, tourForPath, tours, type TourStep } from "./steps";

describe("tourForPath", () => {
  it("picks the tour for the page", () => {
    expect(tourForPath("/resumes")?.id).toBe("library");
    expect(tourForPath("/match")?.id).toBe("match");
    expect(tourForPath("/settings")?.id).toBe("settings");
    expect(tourForPath("/report/abc-123")?.id).toBe("report");
  });

  it("prefers the editor over the library, because the editor is the longer path", () => {
    // `/resumes/<id>/edit` starts with `/resumes`; matching the library first
    // would offer the wrong tour on the busiest page in the app.
    expect(tourForPath("/resumes/abc-123/edit")?.id).toBe("editor");
    expect(tourForPath("/resumes/abc-123/edit/")?.id).toBe("editor");
  });

  it("has no tour for the landing page or a page it does not know", () => {
    expect(tourForPath("/")).toBeNull();
    expect(tourForPath("/resumes/abc-123")).toBeNull();
    expect(tourForPath("/nope")).toBeNull();
    // A nested edit path is not the editor: the id segment is required.
    expect(tourForPath("/resumes/edit")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(tourForPath("/resumes/")?.id).toBe("library");
    expect(tourForPath("/match/")?.id).toBe("match");
  });
});

describe("the tours", () => {
  it("have unique ids and non-empty steps", () => {
    const ids = tours.map((tour) => tour.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const tour of tours) {
      expect(tour.steps.length).toBeGreaterThan(0);
      for (const step of tour.steps) {
        expect(step.title.trim().length).toBeGreaterThan(0);
        expect(step.body.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("point at each target once per tour, so two steps never fight over an element", () => {
    for (const tour of tours) {
      const targets = tour.steps.map((step) => step.target).filter((target): target is string => target !== null);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  it("are found by their own id", () => {
    for (const tour of tours) {
      expect(tourById(tour.id)).toBe(tour);
    }
    expect(tourById("nope")).toBeNull();
  });
});

describe("resolveSteps", () => {
  const steps: TourStep[] = [
    { target: "one", title: "One", body: "…" },
    { target: null, title: "Always", body: "…" },
    { target: "missing", title: "Three", body: "…" },
  ];

  it("drops a step whose element is not on the page", () => {
    const resolved = resolveSteps(steps, (target) => target === "one");

    expect(resolved.map((step) => step.title)).toEqual(["One", "Always"]);
  });

  it("keeps a step with no target, because it is about the page", () => {
    expect(resolveSteps(steps, () => false).map((step) => step.title)).toEqual(["Always"]);
  });
});
