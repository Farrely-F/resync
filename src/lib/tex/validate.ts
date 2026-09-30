import { processLatexToAstViaUnified } from "@unified-latex/unified-latex";

/**
 * The syntax problems worth catching before the TeX engine is started.
 *
 * A compile of a hand-edited document can fail in ways the engine reports only
 * after it has built its filesystem and run: an unclosed brace swallows the rest
 * of the file, an environment that is never ended runs to the end of the input.
 * Both are visible in the source before any of that, so they are reported here,
 * with the line, and the compile panel refuses to start the engine until they are
 * fixed.
 *
 * The check reads the parse tree rather than matching text. `unified-latex` turns
 * a matched pair of braces into a group and a matched `\begin`/`\end` into an
 * environment node, so what survives the parse is exactly what did not match: a
 * brace left as a one-character string node, and an unpaired `\begin` or `\end`
 * left as a macro with no arguments. That is why this is not fooled by an escaped
 * `\{`, by a brace inside a comment, or by the body of a verbatim environment —
 * none of them are string nodes or bare macros.
 *
 * A pure function of the source: no engine, no DOM, no clock.
 */

export type TexProblemKind = "unbalanced-brace" | "unbalanced-environment" | "unreadable";

export interface TexProblem {
  kind: TexProblemKind;
  /** 1-based line of the offending character or command. */
  line: number;
  /** 1-based column within that line. */
  column: number;
  /** One sentence naming the problem, without the line number, which the caller prints in front. */
  message: string;
}

/**
 * The fields this check reads off a node, taken structurally.
 *
 * The parser's own node type is a union of a dozen shapes; naming the four fields
 * used here keeps the walk readable and makes it obvious that nothing else about
 * the document is inspected. The cast at `parse` is the one boundary where the
 * parser's type meets it.
 */
interface ParsedNode {
  type: string;
  content?: string | ParsedNode[];
  args?: { content?: ParsedNode[] }[];
  position?: { start: { line: number; column: number } };
}

const processor = processLatexToAstViaUnified();

function parse(tex: string): ParsedNode {
  return processor.runSync(processor.parse(tex)) as unknown as ParsedNode;
}

function lineOf(node: ParsedNode): number {
  return node.position?.start.line ?? 1;
}

function columnOf(node: ParsedNode): number {
  return node.position?.start.column ?? 1;
}

/** The environment name a stray `\begin`/`\end` was given, if it was given one. */
function nameIn(content: string | ParsedNode[] | undefined): string | null {
  if (!Array.isArray(content)) {
    return null;
  }

  const first = content[0];
  if (first?.type === "string" && typeof first.content === "string" && first.content.trim().length > 0) {
    return first.content.trim();
  }

  return null;
}

function environmentName(macro: ParsedNode, next: ParsedNode | undefined): string | null {
  const fromArgument = nameIn(macro.args?.[0]?.content);
  if (fromArgument !== null) {
    return fromArgument;
  }

  return next && (next.type === "group" || next.type === "argument") ? nameIn(next.content) : null;
}

function collect(nodes: string | ParsedNode[] | undefined, problems: TexProblem[]): void {
  if (!Array.isArray(nodes)) {
    return;
  }

  nodes.forEach((node, index) => {
    if (node.type === "string" && (node.content === "{" || node.content === "}")) {
      problems.push({
        kind: "unbalanced-brace",
        line: lineOf(node),
        column: columnOf(node),
        message:
          node.content === "{"
            ? "an opening brace { is never closed"
            : "a closing brace } has no matching opening brace",
      });
    }

    // A `\begin` or `\end` that the parser consumed became an environment node
    // and is not here; one that survived did not match anything.
    if (node.type === "macro" && (node.content === "begin" || node.content === "end")) {
      const name = environmentName(node, nodes[index + 1]);
      const problem = name === null ? "" : `{${name}}`;
      problems.push({
        kind: "unbalanced-environment",
        line: lineOf(node),
        column: columnOf(node),
        message:
          node.content === "begin"
            ? `\\begin${problem} starts an environment that is never ended`
            : `\\end${problem} has no matching \\begin`,
      });
    }

    collect(node.content, problems);
    for (const argument of node.args ?? []) {
      collect(argument.content, problems);
    }
  });
}

/**
 * Everything wrong with the document that can be told from its text alone, in
 * source order. An empty list means nothing obvious is broken — not that the
 * document compiles.
 */
export function validateTex(tex: string): TexProblem[] {
  let root: ParsedNode;

  try {
    root = parse(tex);
  } catch (error) {
    return [
      {
        kind: "unreadable",
        line: 1,
        column: 1,
        message: `the source could not be parsed at all (${error instanceof Error ? error.message : String(error)})`,
      },
    ];
  }

  const problems: TexProblem[] = [];
  collect(root.content, problems);

  return problems.sort((a, b) => a.line - b.line || a.column - b.column);
}
