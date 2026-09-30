import { validateTex, type TexProblem } from "@/lib/tex/validate";

/**
 * Repairing the syntax problems `validateTex` reports.
 *
 * The problems that stop a compile are all of one kind: something that was
 * supposed to match something else and did not. That makes them repairable
 * without understanding the document — a brace is closed, a stray one removed, an
 * environment ended — and it makes the repair predictable enough to show the
 * reader before it is applied.
 *
 * Two rules shape everything here:
 *
 *   - **Nothing is repaired that was not reported.** Only the exact positions
 *     `validateTex` named are touched, so an escaped `\{`, a brace in a comment
 *     and a verbatim body are safe: the validator never reports them, and neither
 *     does this.
 *   - **A repair is a guess about intent, so it is described, not hidden.** Every
 *     change comes back as a sentence the caller can show, and the result is
 *     re-validated: what could not be fixed is reported as still broken rather
 *     than assumed away.
 *
 * A pure function of the source: no engine, no DOM, no clock.
 */

export interface TexRepair {
  /** The repaired source, identical to the input when nothing could be fixed. */
  tex: string;
  /** One sentence per change, in the order they were made. */
  fixes: string[];
  /** What is still wrong after repairing; empty means the source validates. */
  remaining: TexProblem[];
}

/** A repair that cannot make progress must stop, not spin. */
const maxPasses = 5;

interface Edit {
  /** Where in the source the edit applies, in UTF-16 units. */
  start: number;
  /** How much of the source the edit replaces. */
  length: number;
  /** What to put there instead. */
  text: string;
  description: string;
}

/** The offset of every line's first character, for turning line/column into an index. */
function lineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

/**
 * The character at a 1-based line and column, as an offset.
 *
 * The parser counts columns in characters, and a JS string counts in UTF-16
 * units, so a document with an emoji before the offending brace would otherwise
 * point one or two units past it. Columns are converted through `Array.from`,
 * which is the same unit the parser used.
 */
function offsetAt(source: string, starts: number[], line: number, column: number): number | null {
  const start = starts[line - 1];
  if (start === undefined) {
    return null;
  }

  const end = line < starts.length ? starts[line] - 1 : source.length;
  const text = source.slice(start, end);
  const before = Array.from(text).slice(0, column - 1).join("");

  return start + before.length;
}

/** The end of a line, or the start of its comment: a brace after `%` is commented out. */
function lineEndForInsertion(source: string, starts: number[], line: number): number {
  const start = starts[line - 1] ?? source.length;
  const end = line < starts.length ? starts[line] - 1 : source.length;
  const text = source.slice(start, end);
  const comment = text.search(/(^|[^\\])%/);

  if (comment === -1) {
    return end;
  }

  // Back up to the `%` itself when it was matched through the preceding character.
  const at = text[comment] === "%" ? comment : comment + 1;
  return start + at;
}

/** How far a `\begin`/`\end` extends, including its `{name}` argument when it has one. */
function macroLength(source: string, offset: number): number {
  const rest = source.slice(offset);
  const match = /^\\(begin|end)\s*\{[^}]*\}/.exec(rest);

  if (match !== null) {
    return match[0].length;
  }

  const bare = /^\\(begin|end)/.exec(rest);
  return bare === null ? 0 : bare[0].length;
}

/** The environment name from a problem's message, which is the only place it survives. */
function environmentNameFrom(problem: TexProblem): string | null {
  const match = /\{([^}]+)\}/.exec(problem.message);
  return match === null ? null : match[1];
}

function editsFor(source: string, problems: readonly TexProblem[]): Edit[] {
  const starts = lineStarts(source);
  const edits: Edit[] = [];
  /** Environments that were never ended, collected so they close in the right order. */
  const unclosed: { name: string; line: number }[] = [];

  for (const problem of problems) {
    if (problem.kind === "unreadable") {
      continue;
    }

    const offset = offsetAt(source, starts, problem.line, problem.column);
    if (offset === null) {
      continue;
    }

    if (problem.kind === "unbalanced-brace") {
      if (source[offset] === "{") {
        const at = lineEndForInsertion(source, starts, problem.line);
        edits.push({
          start: at,
          length: 0,
          text: "}",
          description: `closed the brace opened on line ${problem.line} by adding } at the end of that line`,
        });
      } else if (source[offset] === "}") {
        edits.push({
          start: offset,
          length: 1,
          text: "",
          description: `removed the stray } on line ${problem.line}, which had no opening brace`,
        });
      }
      continue;
    }

    const name = environmentNameFrom(problem);
    if (problem.message.startsWith("\\begin")) {
      // Collected rather than pushed one at a time: several inserts at the same
      // end-of-file offset would land in the order they were applied, which is the
      // reverse of the nesting that TeX needs.
      if (name !== null) {
        unclosed.push({ name, line: problem.line });
      }
      continue;
    }

    {
      const length = macroLength(source, offset);
      if (length === 0) {
        continue;
      }
      edits.push({
        start: offset,
        length,
        text: "",
        description: name === null
          ? `removed the unmatched \\end on line ${problem.line}`
          : `removed the \\end{${name}} on line ${problem.line}, which had no matching \\begin`,
      });
    }
  }

  if (unclosed.length > 0) {
    // Innermost first: the environment opened last has to be the one closed first.
    const ordered = [...unclosed].sort((a, b) => b.line - a.line);
    edits.push({
      start: source.length,
      length: 0,
      text: `\n${ordered.map((environment) => `\\end{${environment.name}}`).join("\n")}\n`,
      description:
        ordered.length === 1
          ? `ended the ${ordered[0].name} environment opened on line ${ordered[0].line} by adding \\end{${ordered[0].name}} at the end of the file`
          : `ended the environments opened on lines ${ordered.map((environment) => environment.line).join(" and ")} by adding ${ordered.map((environment) => `\\end{${environment.name}}`).join(" then ")} at the end of the file, innermost first`,
    });
  }

  return edits;
}

/** Applies every edit in one pass, working backwards so earlier offsets stay valid. */
function applyEdits(source: string, edits: readonly Edit[]): { tex: string; fixes: string[] } {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let tex = source;
  const fixes: string[] = [];

  for (const edit of ordered) {
    const before = tex.slice(0, edit.start);
    const after = tex.slice(edit.start + edit.length);
    if (tex === before + edit.text + after) {
      continue;
    }
    tex = before + edit.text + after;
    fixes.push(edit.description);
  }

  return { tex, fixes };
}

/**
 * Repairs what can be repaired and says what it did.
 *
 * One pass is not always enough — removing a stray `}` can expose a brace that
 * now has no opener — so the source is re-checked and repaired again until it
 * validates, nothing more can be done, or the passes run out.
 */
export function repairTex(source: string): TexRepair {
  let tex = source;
  const fixes: string[] = [];

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const problems = validateTex(tex).filter((problem) => problem.kind !== "unreadable");
    if (problems.length === 0) {
      break;
    }

    const edits = editsFor(tex, problems);
    if (edits.length === 0) {
      break;
    }

    const applied = applyEdits(tex, edits);
    if (applied.tex === tex) {
      break;
    }

    tex = applied.tex;
    fixes.push(...applied.fixes);
  }

  return { tex, fixes, remaining: validateTex(tex) };
}
