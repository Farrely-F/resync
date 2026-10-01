import { diffWords } from "@/lib/suggestions/diff";

export interface AdjustmentView {
  id: string;
  targetId: string;
  label?: string;
  requirement?: string;
  before: string;
  after: string;
  at?: string;
  source?: "suggestion" | "you";
}

/**
 * Accepted adjustments as before/after diffs, newest first.
 *
 * Shown on the report beside the proposals and in the editor above the fields,
 * so the same change reads the same in both places.
 */
export function AdjustmentsList({ adjustments, limit }: { adjustments: readonly AdjustmentView[]; limit?: number }) {
  const newestFirst = [...adjustments].reverse();
  const shown = limit === undefined ? newestFirst : newestFirst.slice(0, limit);

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((entry) => (
        <li
          className="flex flex-col gap-1.5 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-3"
          key={entry.id}
        >
          <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {entry.requirement ?? entry.label ?? entry.targetId}
            {entry.source === "you" ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Added by you</span>
            ) : null}
          </p>
          <p className="rounded-lg bg-background ring-1 ring-foreground/[0.08] p-2.5 text-xs leading-relaxed break-words">
            {diffWords(entry.before, entry.after).map((part, index) =>
              part.kind === "same" ? (
                <span key={index}>{part.text}</span>
              ) : part.kind === "added" ? (
                <ins className="rounded-sm bg-primary/15 text-foreground no-underline" key={index}>
                  {part.text}
                </ins>
              ) : (
                <del className="text-muted-foreground decoration-destructive/60" key={index}>
                  {part.text}
                </del>
              ),
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {entry.label ?? entry.targetId}
            {entry.at === undefined ? "" : ` · ${new Date(entry.at).toLocaleString()}`}
          </p>
        </li>
      ))}
      {shown.length < adjustments.length ? (
        <li className="text-xs text-muted-foreground">
          {adjustments.length - shown.length} older {adjustments.length - shown.length === 1 ? "adjustment" : "adjustments"} in the
          tailored copy.
        </li>
      ) : null}
    </ul>
  );
}
