/**
 * LaTeX escaping.
 *
 * Two properties matter, and both are tested:
 *
 * 1. Text that came from a résumé is data, never markup. `\input{...}` typed into
 *    a summary field must typeset as those characters, so every LaTeX special is
 *    neutralised.
 * 2. The output is ASCII. The bundled engine is run without a UTF-8 input
 *    assumption we control, so accented Latin letters are decomposed and rebuilt
 *    from LaTeX accent commands instead of surviving as raw bytes. Characters
 *    with no representation at all (CJK, emoji) are dropped rather than passed
 *    through to break the compile; `unrepresentableCharacters` reports them so a
 *    caller can say so out loud.
 */

/**
 * The LaTeX specials. `^` and `~` become commands rather than accents: `\^{}`
 * and `\~{}` are accents, and would silently eat the following character.
 */
const asciiEscapes: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  _: "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
};

/** Characters whose meaning is close enough to transliterate, or which are symbols. */
const unicodeReplacements: Record<string, string> = {
  "\u00a0": "~",
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u201c": "``",
  "\u201d": "''",
  "\u201e": "``",
  "\u2013": "--",
  "\u2014": "---",
  "\u2015": "---",
  "\u2026": "\\ldots{}",
  "\u00b0": "\\textdegree{}",
  "\u00a9": "\\textcopyright{}",
  "\u00ae": "\\textregistered{}",
  "\u2122": "\\texttrademark{}",
  "\u20ac": "\\texteuro{}",
  "\u00a3": "\\pounds{}",
  "\u00a5": "\\textyen{}",
  "\u00a7": "\\S{}",
  "\u00b6": "\\P{}",
  "\u00b7": "\\textperiodcentered{}",
  "\u00d7": "$\\times$",
  "\u00f7": "$\\div$",
  "\u00b1": "$\\pm$",
  "\u2264": "$\\leq$",
  "\u2265": "$\\geq$",
  "\u2260": "$\\neq$",
  "\u2192": "$\\rightarrow$",
  "\u2190": "$\\leftarrow$",
  "\u00b5": "$\\mu$",
  "\u0153": "\\oe{}",
  "\u0152": "\\OE{}",
  "\u00e6": "\\ae{}",
  "\u00c6": "\\AE{}",
  "\u00f8": "\\o{}",
  "\u00d8": "\\O{}",
  "\u00df": "\\ss{}",
  "\u00e5": "\\aa{}",
  "\u00c5": "\\AA{}",
  "\u0142": "\\l{}",
  "\u0141": "\\L{}",
  "\u200b": "",
  "\u200c": "",
  "\u200d": "",
  "\u2060": "",
  "\ufeff": "",
};

/** Combining marks produced by NFD decomposition, mapped to their LaTeX accent. */
const combiningAccents: Record<string, string> = {
  "\u0300": "`",
  "\u0301": "'",
  "\u0302": "^",
  "\u0303": "~",
  "\u0304": "=",
  "\u0306": "u",
  "\u0307": ".",
  "\u0308": '"',
  "\u030a": "r",
  "\u030b": "H",
  "\u030c": "v",
  "\u0323": "d",
  "\u0327": "c",
  "\u0328": "k",
};

/**
 * Rebuilds a precomposed letter (é, ế, ñ) from LaTeX accent commands, innermost
 * mark first: `ế` decomposes to `e` + circumflex + acute, giving `\'{\^e}`.
 * Returns null when the character does not decompose onto an ASCII base.
 */
function fromDecomposition(value: string): string | null {
  const parts = [...value.normalize("NFD")];
  if (parts.length < 2) {
    return null;
  }

  const [base, ...marks] = parts;
  if (!/^[\x20-\x7e]$/.test(base)) {
    return null;
  }

  let out: string = asciiEscapes[base] ?? base;
  for (const mark of marks) {
    const accent = combiningAccents[mark];
    if (accent === undefined) {
      return null;
    }
    out = `\\${accent}{${out}}`;
  }

  return out;
}

/**
 * Escapes one string for use in LaTeX text. `onUnrepresentable` is called once
 * per dropped character, in order of appearance.
 */
export function escapeLatex(value: string, onUnrepresentable?: (character: string) => void): string {
  let out = "";

  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) < 0x80) {
      out += asciiEscapes[character] ?? character;
      continue;
    }

    const replacement = unicodeReplacements[character] ?? fromDecomposition(character);
    if (replacement === undefined || replacement === null) {
      onUnrepresentable?.(character);
      continue;
    }
    out += replacement;
  }

  return out;
}

/** Distinct characters in `value` that `escapeLatex` has to drop. */
export function unrepresentableCharacters(value: string): string[] {
  const dropped = new Set<string>();
  escapeLatex(value, (character) => dropped.add(character));
  return [...dropped];
}
