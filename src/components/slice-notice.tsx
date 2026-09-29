import Link from "next/link";

/**
 * Explicit marker for a surface that a later slice fills in. Every instance
 * links to the issue that removes it, so progress is visible in the product
 * rather than only in the tracker.
 */
export function SliceNotice({ issue, children }: { issue: number; children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
      {children}{" "}
      <Link
        className="underline underline-offset-4 hover:text-foreground"
        href={`https://github.com/Farrely-F/resync/issues/${issue}`}
        rel="noreferrer"
      >
        Issue #{issue}
      </Link>
    </p>
  );
}
