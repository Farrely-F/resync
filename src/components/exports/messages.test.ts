import { describe, expect, it } from "vitest";

import { describeClearAll, describeDeletion } from "@/components/exports/messages";

describe("describeDeletion", () => {
  it("names the item, its measured size and what is lost with it", () => {
    const message = describeDeletion("resume", "Jane Doe", { bytes: 2048, dependentReports: 0, dependentDocuments: 0 });

    expect(message).toContain("Delete “Jane Doe”?");
    expect(message).toContain("1 stored resume");
    expect(message).toContain("2.0 kB");
    expect(message).toContain("parsed data and the extracted source text");
  });

  it("says that dependent reports are left behind, in the right number", () => {
    expect(describeDeletion("jd", "Acme — Engineer", { bytes: 10, dependentReports: 1, dependentDocuments: 0 })).toContain(
      "1 match report that used it stays",
    );
    expect(describeDeletion("jd", "Acme — Engineer", { bytes: 10, dependentReports: 3, dependentDocuments: 0 })).toContain(
      "3 match reports that used it stay",
    );
  });

  it("mentions no leftover reports when there are none", () => {
    const message = describeDeletion("report", "report", { bytes: 10, dependentReports: 0, dependentDocuments: 0 });

    expect(message).not.toContain("report that used it");
    expect(message).toContain("1 stored match report");
    expect(message).toContain("criteria, verdicts and formatting checks");
  });

  it("says that the documents written from a report go with it", () => {
    // A letter answers a report; leaving it behind would leave a document nothing
    // on the device can explain.
    const one = describeDeletion("report", "report", {
      bytes: 10,
      dependentReports: 0,
      dependentDocuments: 1,
    });
    const several = describeDeletion("report", "report", {
      bytes: 10,
      dependentReports: 0,
      dependentDocuments: 3,
    });

    expect(one).toContain("1 document written from it is removed with it");
    expect(several).toContain("3 documents written from it are removed with it");
    expect(describeDeletion("report", "report", { bytes: 10, dependentReports: 0, dependentDocuments: 0 })).not.toContain(
      "written from it",
    );
  });

  it("always says the deletion cannot be undone", () => {
    for (const kind of ["resume", "jd", "report"] as const) {
      expect(describeDeletion(kind, "x", { bytes: 0, dependentReports: 0, dependentDocuments: 0 })).toContain("This cannot be undone.");
    }
  });
});

describe("describeClearAll", () => {
  it("names every store and the total", () => {
    const message = describeClearAll({ resumes: 2, jds: 1, reports: 1, documents: 1, bytes: 5_000_000 });

    expect(message).toContain("5 stored records");
    expect(message).toContain("2 resumes");
    expect(message).toContain("1 job description");
    expect(message).toContain("1 match report");
    expect(message).toContain("1 written document");
    expect(message).toContain("5.00 MB");
    expect(message).toContain("This cannot be undone.");
  });

  it("uses singular nouns for a single record of each kind", () => {
    const message = describeClearAll({ resumes: 1, jds: 1, reports: 1, documents: 0, bytes: 1024 });

    expect(message).toContain("3 stored records");
    expect(message).toContain("1 resume,");
    expect(message).toContain("1 job description");
    expect(message).not.toContain("1 resumes");
  });

  it("describes an empty database as zero records rather than hiding the action", () => {
    expect(describeClearAll({ resumes: 0, jds: 0, reports: 0, documents: 0, bytes: 0 })).toContain("0 stored records");
  });
});
