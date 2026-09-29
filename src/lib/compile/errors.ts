/**
 * Reading a TeX log.
 *
 * A failed compile returns no PDF, and the only diagnostic the user has is what
 * the engine printed. TeX writes that into its `.log` file with a stable but
 * unlovely format: `!` introduces an error, `LaTeX Warning:`/`Package X Warning:`
 * introduce warnings, and a missing `\usepackage` target is reported as
 * `File `name.sty' not found.` This module turns that into the three things the
 * panel needs: the package name to name, the errors to show, and the warnings to
 * keep. It is a pure function of the log text.
 */

export interface TexDiagnostic {
  kind: "error" | "warning";
  message: string;
}

export interface TexDiagnostics {
  errors: TexDiagnostic[];
  warnings: TexDiagnostic[];
  /** The `.sty` the document asked for and the bundled scheme does not have. */
  missingPackage: string | null;
  /** The first error, which is the one that actually stopped the run. */
  summary: string | null;
}

/** `File `enumitem.sty' not found.` — the form LaTeX uses for an absent package. */
const missingFilePattern = /File `([^']+)' not found/;

const warningPattern = /^(?:(?:LaTeX|Package|Class|Module)\s+\S*\s*Warning:.*|(?:Overfull|Underfull)\s*\\[a-z].*)$/;

/** TeX's own summary lines, which add nothing to the first `!` error. */
const noisePattern = /^(?:Here is how much of|No pages of output|Transcript written|Output written)/;

function firstLine(message: string): string {
  return message.split("\n")[0].trim();
}

/**
 * Parses a log (or any concatenation of the engine's output). Errors are
 * deduplicated and truncated to their first line: TeX repeats an error in the
 * log, stdout and stderr, and the following lines are the source excerpt and the
 * interactive prompt, which are not the message.
 */
export function parseTexLog(rawLog: string): TexDiagnostics {
  const errors: TexDiagnostic[] = [];
  const warnings: TexDiagnostic[] = [];
  const seenErrors = new Set<string>();
  const seenWarnings = new Set<string>();
  let missingPackage: string | null = null;

  for (const rawLine of rawLog.split("\n")) {
    const line = rawLine.trimEnd();

    const missing = missingFilePattern.exec(line);
    if (missing && missingPackage === null) {
      missingPackage = missing[1];
    }

    if (line.startsWith("!")) {
      const message = firstLine(line.slice(1));
      if (message.length > 0 && !seenErrors.has(message)) {
        seenErrors.add(message);
        errors.push({ kind: "error", message });
      }
      continue;
    }

    if (warningPattern.test(line) && !noisePattern.test(line)) {
      const message = firstLine(line);
      if (!seenWarnings.has(message)) {
        seenWarnings.add(message);
        warnings.push({ kind: "warning", message });
      }
    }
  }

  return {
    errors,
    warnings,
    missingPackage,
    summary: errors[0]?.message ?? null,
  };
}

/**
 * One sentence for the panel. Naming the package matters: the user cannot fix a
 * blank preview, but they can tell that the theme asked for something the
 * shipped `scheme-basic` tier does not have.
 */
export function summarizeTexFailure(diagnostics: TexDiagnostics): string {
  if (diagnostics.missingPackage) {
    const name = diagnostics.missingPackage.endsWith(".sty")
      ? diagnostics.missingPackage
      : `${diagnostics.missingPackage}.sty`;
    return `The bundled TeX engine has no ${name}. The theme asked for a package the shipped scheme-basic tier does not include, so no PDF was produced.`;
  }
  if (diagnostics.summary) {
    return `TeX stopped on an error: ${diagnostics.summary}`;
  }
  return "The engine did not produce a PDF, and its log names no error.";
}
