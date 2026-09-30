"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";

import { IconButton, MoveButtons, TextField } from "@/components/editor/fields";
import {
  readList,
  readText,
  withValue,
  type BulletSpec,
  type SectionSpec,
} from "@/components/editor/section-specs";
import { addBullet, moveBullet, removeBullet, setBullet } from "@/components/editor/resume-ops";
import { Button } from "@/components/ui/button";

/**
 * One entry of one section: its fields, and its bullet list where the schema has
 * one. The section's shape comes from its spec, so this component is the same
 * for a role, a qualification and a project.
 */
export function EntryEditor({
  spec,
  entry,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  spec: SectionSpec;
  entry: unknown;
  index: number;
  count: number;
  onChange: (entry: unknown) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const title = spec.title(entry);
  const bullets = spec.bullets;

  return (
    <li className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-center gap-1">
        <h4 className="min-w-0 grow truncate text-sm font-medium">{title}</h4>
        <MoveButtons
          count={count}
          index={index}
          label={`the ${title} entry`}
          onMove={onMove}
        />
        <IconButton label={`Remove the ${title} entry`} onClick={onRemove}>
          <Trash2 aria-hidden className="text-destructive" />
        </IconButton>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {spec.fields.map((field) => (
          <TextField
            key={field.key}
            id={`${id}-${field.key}`}
            label={field.label}
            multiline={field.multiline}
            onChange={(value) => onChange(withValue(entry, field.key, value))}
            placeholder={field.placeholder}
            type={field.type}
            value={readText(entry, field.key)}
            wide={field.wide}
          />
        ))}
      </div>

      {bullets ? (
        <BulletList
          entryTitle={title}
          onChange={(values) => onChange(withValue(entry, bullets.key, values))}
          spec={bullets}
          values={readList(entry, bullets.key)}
        />
      ) : null}
    </li>
  );
}

function BulletList({
  spec,
  values,
  entryTitle,
  onChange,
}: {
  spec: BulletSpec;
  values: string[];
  entryTitle: string;
  onChange: (values: string[]) => void;
}) {
  const lineLabel = (index: number) => `${spec.label} line ${index + 1} of the ${entryTitle} entry`;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-medium">{spec.label}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{spec.hint}</p>

      {values.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {values.map((value, index) => (
            <li className="flex flex-col gap-1 sm:flex-row sm:items-start" key={index}>
              <textarea
                aria-label={lineLabel(index)}
                className="min-h-11 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                onChange={(event) => onChange(setBullet(values, index, event.target.value))}
                placeholder={spec.placeholder}
                value={value}
              />
              <div className="flex shrink-0 items-center gap-1">
                <MoveButtons
                  count={values.length}
                  index={index}
                  label={lineLabel(index)}
                  onMove={(direction) => onChange(moveBullet(values, index, index + direction))}
                />
                <IconButton
                  label={`Remove ${lineLabel(index)}`}
                  onClick={() => onChange(removeBullet(values, index))}
                >
                  <Trash2 aria-hidden className="text-destructive" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">None yet.</p>
      )}

      <div>
        <Button
          aria-label={`${spec.addLabel} to the ${entryTitle} entry`}
          className="h-11"
          onClick={() => onChange(addBullet(values))}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden />
          {spec.addLabel}
        </Button>
      </div>
    </div>
  );
}
