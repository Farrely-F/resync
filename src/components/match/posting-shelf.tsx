"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Search, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { deriveJdTitle } from "@/lib/jd/schema";
import type { JdRecord } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

/**
 * Every way into the match's posting, laid out as one shelf.
 *
 * A saved posting and "add a new one" are the same kind of choice, so they are
 * the same kind of object: a tile you press. The dashed tile is always first, so
 * adding is never buried under a dropdown, and the tile that is open says so.
 * Only the newest few postings are shown until asked, so a long history does not
 * push the step it belongs to off the screen.
 */

/** How many tiles show at first, and how many each "show more" adds. */
const firstPage = 5;
const pageStep = 6;
/** Below this many postings a search box is more furniture than help. */
const searchFrom = 6;

function matches(record: JdRecord, query: string): boolean {
  const haystack = [
    deriveJdTitle(record.structured, record.title),
    record.company,
    record.structured.seniority,
    record.structured.location,
    ...record.structured.keywords,
    ...record.structured.skills,
  ]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "")
    .every((word) => haystack.includes(word));
}

function monogram(record: JdRecord): string {
  const source = record.company?.trim() || deriveJdTitle(record.structured, record.title);
  return source.charAt(0).toUpperCase() || "?";
}

function meta(record: JdRecord): string {
  return [record.company, record.structured.seniority, record.structured.location]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" · ");
}

const tileBase =
  "group relative flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl p-3 text-left outline-none transition-[transform,box-shadow,background-color] duration-300 ease-(--ease-out-expo) focus-visible:ring-3 focus-visible:ring-ring/50";

export function PostingShelf({
  postings,
  selectedId,
  adding,
  onSelect,
  onAdd,
  onDelete,
}: {
  postings: readonly JdRecord[];
  selectedId: string | null;
  adding: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(firstPage);

  const searchable = postings.length >= searchFrom;
  const filtered = searchable && query.trim() !== "" ? postings.filter((record) => matches(record, query)) : postings;

  // A selection past the cut would make the shelf look as if nothing is chosen, so the cut moves to include it.
  const selectedIndex = filtered.findIndex((record) => record.id === selectedId);
  const visible = Math.max(limit, selectedIndex + 1);
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  return (
    <div className="flex flex-col gap-3">
      {searchable ? (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search saved postings"
            className="min-h-11 pr-11 pl-10"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(firstPage);
            }}
            placeholder={`Search ${postings.length} saved postings by title, company, skill or place`}
            type="search"
            value={query}
          />
          {query === "" ? null : (
            <button
              aria-label="Clear the search"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setQuery("")}
              type="button"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
      ) : null}

      <ul aria-label="Job posting" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <li className="contents">
          <button
            aria-pressed={adding}
            className={cn(
              tileBase,
              adding
                ? "bg-accent ring-2 ring-primary shadow-(--shadow-lift)"
                : "border border-dashed border-foreground/25 bg-transparent hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card hover:shadow-(--shadow-lift)",
            )}
            onClick={onAdd}
            type="button"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl transition-[background-color,color,transform] duration-300 ease-(--ease-out-expo)",
                adding
                  ? "rotate-45 bg-primary text-primary-foreground"
                  : "border border-dashed border-foreground/30 text-muted-foreground group-hover:border-primary group-hover:text-primary",
              )}
            >
              <Plus className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">Add a new posting</span>
              <span className="text-xs text-muted-foreground">Paste its text or give a link</span>
            </span>
          </button>
        </li>

        {shown.map((record) => {
          const selected = !adding && record.id === selectedId;
          const details = meta(record);

          return (
            <li className="group/tile relative" key={record.id}>
              <button
                aria-pressed={selected}
                className={cn(
                  tileBase,
                  selected
                    ? "bg-card pr-12 ring-2 ring-primary shadow-(--shadow-lift)"
                    : "bg-card pr-12 ring-1 ring-foreground/[0.08] shadow-(--shadow-rest) hover:-translate-y-0.5 hover:shadow-(--shadow-lift)",
                )}
                onClick={() => onSelect(record.id)}
                type="button"
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl text-base font-semibold transition-colors duration-300",
                    selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                  )}
                >
                  {monogram(record)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-sm font-medium leading-snug text-balance">
                    {deriveJdTitle(record.structured, record.title)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {details === "" ? "" : `${details} · `}
                    Saved {new Date(record.updatedAt).toLocaleDateString()}
                  </span>
                </span>
                {selected ? (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-(--shadow-rest)"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
              <button
                aria-label={`Remove ${deriveJdTitle(record.structured, record.title)} from saved postings`}
                className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full text-destructive/70 opacity-0 transition-[opacity,background-color,color] duration-200 group-focus-within/tile:opacity-100 group-hover/tile:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:none)]:opacity-100"
                onClick={() => onDelete(record.id)}
                type="button"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {searchable && query.trim() !== "" ? (
        <p aria-live="polite" className="text-xs text-muted-foreground" role="status">
          {filtered.length === 0
            ? `No saved posting matches \u201c${query.trim()}\u201d.`
            : `${filtered.length} of ${postings.length} saved postings match.`}
        </p>
      ) : null}

      {remaining > 0 ? (
        <button
          className="flex min-h-11 items-center gap-1.5 self-start rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => setLimit(visible + pageStep)}
          type="button"
        >
          <ChevronDown aria-hidden className="size-4" />
          Show {Math.min(pageStep, remaining)} more
          <span className="font-normal">({remaining} not shown)</span>
        </button>
      ) : limit > firstPage && filtered.length > firstPage ? (
        <button
          className="flex min-h-11 items-center gap-1.5 self-start rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => setLimit(firstPage)}
          type="button"
        >
          <ChevronDown aria-hidden className="size-4 rotate-180" />
          Show fewer
        </button>
      ) : null}
    </div>
  );
}
