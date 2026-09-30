"use client";

import { Eye, EyeOff, Plus } from "lucide-react";

import { EntryEditor } from "@/components/editor/entry-editor";
import { MoveButtons } from "@/components/editor/fields";
import { sectionSpecs } from "@/components/editor/section-specs";
import {
  addEntry,
  listEntries,
  moveEntry,
  moveSection,
  removeEntry,
  replaceEntry,
  sectionOrder,
  setSectionVisible,
} from "@/components/editor/resume-ops";
import { Button } from "@/components/ui/button";
import { sectionLabels } from "@/lib/resume/library";
import type { Resume } from "@/lib/resume/schema";

/**
 * The section list: order, visibility, and the entries inside each section.
 *
 * Order and visibility live in `resume.sections`, which is exactly what the
 * generator reads, so moving a section here moves it in the document and hiding
 * one takes it out. A hidden section keeps its entries — the copy says so,
 * because "hide" that also deleted work would be a trap.
 */
export function SectionsEditor({ resume, onChange }: { resume: Resume; onChange: (next: Resume) => void }) {
  const sections = sectionOrder(resume);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold">Sections</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The document follows this list from top to bottom. Use the arrows to move a section or an entry; hiding a
          section leaves it out of the document and keeps its entries.
        </p>
      </div>

      {sections.map((section, position) => {
        const spec = sectionSpecs[section.id];
        const label = sectionLabels[section.id];
        const entries = listEntries(resume, section.id);

        return (
          <div className="rounded-lg border border-border/60 p-4" key={section.id}>
            <div className="flex flex-wrap items-center gap-1">
              <h3 className="min-w-0 grow text-sm font-semibold">
                {label}
                <span className="ml-2 font-normal text-xs text-muted-foreground">
                  {entries.length === 1 ? "1 entry" : `${entries.length} entries`}
                </span>
              </h3>
              <MoveButtons
                count={sections.length}
                index={position}
                label={`the ${label} section`}
                onMove={(direction) => onChange(moveSection(resume, section.id, direction))}
              />
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
            </div>

            {section.visible ? null : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Hidden: this section is not in the generated document. Its entries are still here.
              </p>
            )}

            {entries.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-3">
                {entries.map((entry, index) => (
                  <EntryEditor
                    count={entries.length}
                    entry={entry}
                    index={index}
                    key={index}
                    onChange={(next) => onChange(replaceEntry(resume, section.id, index, next))}
                    onMove={(direction) => onChange(moveEntry(resume, section.id, index, index + direction))}
                    onRemove={() => onChange(removeEntry(resume, section.id, index))}
                    spec={spec}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
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
          </div>
        );
      })}
    </section>
  );
}
