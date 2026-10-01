"use client";

import { useCallback, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, Plus } from "lucide-react";

import { CollapsibleSection } from "@/components/editor/collapsible-section";
import { EntryEditor } from "@/components/editor/entry-editor";
import { sectionSpecs } from "@/components/editor/section-specs";
import {
  addEntry,
  listEntries,
  moveEntry,
  removeEntry,
  replaceEntry,
  reorderSection,
  sectionOrder,
  setSectionVisible,
} from "@/components/editor/resume-ops";
import { SortableList, SortableItem } from "@/components/editor/sortable";
import { Button } from "@/components/ui/button";
import { sectionLabels } from "@/lib/resume/library";
import type { Resume, SectionId } from "@/lib/resume/schema";

/**
 * The section list: order, visibility, and the entries inside each section.
 *
 * Order and visibility live in `resume.sections`, which is exactly what the
 * generator reads, so moving a section here moves it in the document and hiding
 * one takes it out. A hidden section keeps its entries — the copy says so,
 * because "hide" that also deleted work would be a trap.
 *
 * Reordering is by dragging a handle, and each section is collapsible: eight
 * open sections on a phone is a wall of inputs, and a reader looking for the
 * education entry should not have to scroll past every project to reach it.
 */
export function SectionsEditor({ resume, onChange }: { resume: Resume; onChange: (next: Resume) => void }) {
  const sections = sectionOrder(resume);
  // Collapsing is a reading aid, not part of the resume: it is not stored with the
  // document, so opening a resume never hides a section the reader last closed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const setOpen = useCallback((id: SectionId, open: boolean) => {
    setCollapsed((current) => ({ ...current, [id]: !open }));
  }, []);

  const setAll = useCallback(
    (open: boolean) => {
      setCollapsed(Object.fromEntries(sections.map((section) => [section.id, !open])));
    },
    [sections],
  );

  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold">Sections</h2>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11 sm:h-9" onClick={() => setAll(false)} type="button" variant="outline">
              <ChevronsDownUp aria-hidden />
              Collapse all
            </Button>
            <Button className="h-11 sm:h-9" onClick={() => setAll(true)} type="button" variant="outline">
              <ChevronsUpDown aria-hidden />
              Expand all
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The document follows this list from top to bottom. Drag a handle to move a section or an entry; the arrow keys
          move a handle you have focused with the space bar. Hiding a section leaves it out of the document and keeps
          its entries.
        </p>
      </div>

      <SortableList
        describe={(id) => `the ${sectionLabels[id as SectionId] ?? "section"} section`}
        ids={sections.map((section) => section.id)}
        label="the resume sections"
        onReorder={(from, to) => onChange(reorderSection(resume, from, to))}
      >
        {sections.map((section) => {
          const spec = sectionSpecs[section.id];
          const label = sectionLabels[section.id];
          const entries = listEntries(resume, section.id);
          const open = !(collapsed[section.id] ?? false);

          return (
            <CollapsibleSection
              actions={
                <>
                  <Button
                    aria-label={section.visible ? `Hide the ${label} section` : `Show the ${label} section`}
                    aria-pressed={!section.visible}
                    className="h-11"
                    onClick={() => onChange(setSectionVisible(resume, section.id, !section.visible))}
                    type="button"
                    variant="outline"
                  >
                    {section.visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    {section.visible ? "Hide" : "Show"}
                  </Button>
                </>
              }
              key={section.id}
              onOpenChange={(next) => setOpen(section.id, next)}
              open={open}
              sortable={{ id: section.id, handleLabel: `the ${label} section` }}
              summary={entries.length === 1 ? "1 entry" : `${entries.length} entries`}
              title={label}
            >
              {section.visible ? null : (
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Hidden: this section is not in the generated document. Its entries are still here.
                </p>
              )}

              {entries.length > 0 ? (
                <SortableList
                  describe={(id) => {
                    const entry = entries[Number(id)];
                    const name = entry === undefined ? `position ${Number(id) + 1}` : spec.title(entry);
                    return `the ${name} entry of the ${label} section`;
                  }}
                  ids={entries.map((_, index) => String(index))}
                  label={`the ${label} entries`}
                  onReorder={(from, to) => onChange(moveEntry(resume, section.id, from, to))}
                >
                  <ul className="flex flex-col gap-3">
                    {entries.map((entry, index) => (
                      <SortableItem
                        className="rounded-xl bg-background ring-1 ring-foreground/[0.08] p-3"
                        handleLabel={`entry ${index + 1} of the ${label} section`}
                        id={String(index)}
                        key={index}
                      >
                        {(handle) => (
                          <EntryEditor
                            entry={entry}
                            handle={handle}
                            onChange={(next) => onChange(replaceEntry(resume, section.id, index, next))}
                            onRemove={() => onChange(removeEntry(resume, section.id, index))}
                            spec={spec}
                          />
                        )}
                      </SortableItem>
                    ))}
                  </ul>
                </SortableList>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No entries yet. An entry without a {spec.fields[0].label.toLowerCase()} is left out of the document.
                </p>
              )}

              <div className="mt-3">
                <Button
                  className="h-11"
                  onClick={() => onChange(addEntry(resume, section.id, spec.blank()))}
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden />
                  {spec.addLabel}
                </Button>
              </div>
            </CollapsibleSection>
          );
        })}
      </SortableList>
    </section>
  );
}
