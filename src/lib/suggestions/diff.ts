/**
 * A word-level diff of one span of text, for showing what an accepted
 * adjustment changed.
 *
 * Words rather than characters because the spans are sentences: a reader wants
 * to see "Led" become "Led a team of 5", not a scatter of letters.
 */

export type DiffPart = { kind: "same" | "removed" | "added"; text: string };

function words(text: string): string[] {
  return text.split(/(\s+)/).filter((part) => part !== "");
}

export function diffWords(before: string, after: string): DiffPart[] {
  const a = words(before);
  const b = words(after);

  // Longest common subsequence over the two word lists.
  const lengths: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }

  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], text: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) {
      last.text += text;
    } else {
      parts.push({ kind, text });
    }
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]!);
      i += 1;
      j += 1;
    } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      push("removed", a[i]!);
      i += 1;
    } else {
      push("added", b[j]!);
      j += 1;
    }
  }
  while (i < a.length) {
    push("removed", a[i]!);
    i += 1;
  }
  while (j < b.length) {
    push("added", b[j]!);
    j += 1;
  }

  return parts;
}
