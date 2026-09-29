import { describe, expect, it } from "vitest";

import { parseTexLog, summarizeTexFailure } from "@/lib/compile/errors";

const missingPackageLog = `This is pdfTeX, Version 3.141592653
(./resume.tex
LaTeX2e <2025-11-01>
! LaTeX Error: File \`xcolor.sty' not found.

Type X to quit or <RETURN> to proceed,
or enter new name. (Default extension: sty)

Enter file name:
! Emergency stop.
<read *>
l.7 \\usepackage
               [rgb]{xcolor}
No pages of output.
Transcript written on resume.log.
`;

describe("parseTexLog", () => {
  it("names the package that the bundled scheme does not have", () => {
    const diagnostics = parseTexLog(missingPackageLog);

    expect(diagnostics.missingPackage).toBe("xcolor.sty");
    expect(diagnostics.errors.map((error) => error.message)).toEqual([
      "LaTeX Error: File `xcolor.sty' not found.",
      "Emergency stop.",
    ]);
    expect(diagnostics.summary).toBe("LaTeX Error: File `xcolor.sty' not found.");
    expect(summarizeTexFailure(diagnostics)).toContain("xcolor.sty");
    expect(summarizeTexFailure(diagnostics)).toContain("scheme-basic");
  });

  it("deduplicates an error the engine repeats in the log, stdout and stderr", () => {
    const repeated = ["! Undefined control sequence.", "! Undefined control sequence.", "l.12 \\foo"].join("\n");

    const diagnostics = parseTexLog(repeated);

    expect(diagnostics.errors).toHaveLength(1);
    expect(diagnostics.summary).toBe("Undefined control sequence.");
    expect(summarizeTexFailure(diagnostics)).toBe("TeX stopped on an error: Undefined control sequence.");
  });

  it("keeps warnings without letting them displace errors", () => {
    const diagnostics = parseTexLog(
      [
        "LaTeX Warning: Reference `x' on page 1 undefined on input line 12.",
        "Overfull \\hbox (12.0pt too wide) in paragraph at lines 42--44",
        "Package hyperref Warning: Rerun to get outlines right",
        "! LaTeX Error: Something broke.",
      ].join("\n"),
    );

    expect(diagnostics.errors.map((error) => error.message)).toEqual(["LaTeX Error: Something broke."]);
    expect(diagnostics.warnings.map((warning) => warning.message)).toEqual([
      "LaTeX Warning: Reference `x' on page 1 undefined on input line 12.",
      "Overfull \\hbox (12.0pt too wide) in paragraph at lines 42--44",
      "Package hyperref Warning: Rerun to get outlines right",
    ]);
  });

  it("does not read the transcript footer as a warning", () => {
    const diagnostics = parseTexLog("Output written on resume.pdf (1 page).\nNo pages of output.\nTranscript written on resume.log.");

    expect(diagnostics.warnings).toEqual([]);
    expect(diagnostics.errors).toEqual([]);
    expect(diagnostics.summary).toBeNull();
    expect(summarizeTexFailure(diagnostics)).toBe("The engine did not produce a PDF, and its log names no error.");
  });

  it("handles a missing package named with a path", () => {
    const diagnostics = parseTexLog("! LaTeX Error: File `foo/bar.sty' not found.");

    expect(diagnostics.missingPackage).toBe("foo/bar.sty");
    expect(summarizeTexFailure(diagnostics)).toContain("foo/bar.sty");
  });

  it("returns empty diagnostics for an empty log", () => {
    expect(parseTexLog("")).toEqual({ errors: [], warnings: [], missingPackage: null, summary: null });
  });
});
