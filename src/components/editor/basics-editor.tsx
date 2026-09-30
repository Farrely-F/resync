"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CollapsibleSection } from "@/components/editor/collapsible-section";
import { IconButton, TextField } from "@/components/editor/fields";
import { addProfile, removeProfile, replaceProfile, setBasics, setLocation } from "@/components/editor/resume-ops";
import { Button } from "@/components/ui/button";
import type { Resume } from "@/lib/resume/schema";

/**
 * Basics: the header line of the document and the summary under it.
 *
 * Every field here is optional, and the copy says so once rather than on each
 * input: an empty field is left out of the document instead of leaving a blank
 * line or a stray separator behind.
 */
export function BasicsEditor({ resume, onChange }: { resume: Resume; onChange: (next: Resume) => void }) {
  const { basics } = resume;
  const id = useId();

  return (
    <CollapsibleSection
      headingLevel={2}
      summary="name and contact line"
      title={<span>Basics</span>}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        The name and contact line at the top of the document. Anything left empty is left out of the document rather
        than printed as a blank line.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TextField
          id={`${id}-name`}
          label="Name"
          onChange={(value) => onChange(setBasics(resume, { name: value }))}
          placeholder="Priya Raman"
          value={basics.name}
        />
        <TextField
          id={`${id}-label`}
          label="Label"
          onChange={(value) => onChange(setBasics(resume, { label: value }))}
          placeholder="Senior Backend Engineer"
          value={basics.label ?? ""}
        />
        <TextField
          autoComplete="email"
          id={`${id}-email`}
          inputMode="email"
          label="Email"
          onChange={(value) => onChange(setBasics(resume, { email: value }))}
          placeholder="priya.raman@example.com"
          type="email"
          value={basics.email ?? ""}
        />
        <TextField
          autoComplete="tel"
          id={`${id}-phone`}
          inputMode="tel"
          label="Phone"
          onChange={(value) => onChange(setBasics(resume, { phone: value }))}
          placeholder="+44 7700 900123"
          type="tel"
          value={basics.phone ?? ""}
        />
        <TextField
          autoComplete="url"
          id={`${id}-url`}
          inputMode="url"
          label="Website"
          onChange={(value) => onChange(setBasics(resume, { url: value }))}
          placeholder="https://example.com"
          type="url"
          value={basics.url ?? ""}
        />

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-3">
          <TextField
            autoComplete="address-level2"
            id={`${id}-city`}
            label="City"
            onChange={(value) => onChange(setLocation(resume, "city", value))}
            placeholder="Bristol"
            value={basics.location?.city ?? ""}
          />
          <TextField
            autoComplete="address-level1"
            id={`${id}-region`}
            label="Region"
            onChange={(value) => onChange(setLocation(resume, "region", value))}
            placeholder="England"
            value={basics.location?.region ?? ""}
          />
          <TextField
            autoComplete="country-name"
            id={`${id}-country`}
            label="Country"
            onChange={(value) => onChange(setLocation(resume, "country", value))}
            placeholder="United Kingdom"
            value={basics.location?.country ?? ""}
          />
        </div>

        <TextField
          id={`${id}-summary`}
          label="Summary"
          multiline
          onChange={(value) => onChange(setBasics(resume, { summary: value }))}
          placeholder="Backend engineer with nine years building payment and data platforms."
          value={basics.summary ?? ""}
          wide
        />
      </div>

      <fieldset className="mt-4 flex flex-col gap-3">
        <legend className="text-xs font-medium">Links</legend>
        <p className="text-xs leading-relaxed text-muted-foreground">
          One network per line: the handle and the address are set together on the contact line.
        </p>

        {basics.profiles.map((profile, index) => (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2 sm:flex-row sm:items-end" key={index}>
            <TextField
              id={`${id}-network-${index}`}
              label="Network"
              onChange={(value) => onChange(replaceProfile(resume, index, { network: value }))}
              placeholder="GitHub"
              value={profile.network}
            />
            <TextField
              id={`${id}-handle-${index}`}
              label="Handle"
              onChange={(value) => onChange(replaceProfile(resume, index, { username: value }))}
              placeholder="priyaraman"
              value={profile.username ?? ""}
            />
            <TextField
              id={`${id}-profile-url-${index}`}
              inputMode="url"
              label="Address"
              onChange={(value) => onChange(replaceProfile(resume, index, { url: value }))}
              placeholder="https://github.com/priyaraman"
              type="url"
              value={profile.url ?? ""}
            />
            <div className="pb-1 sm:pb-0">
              <IconButton label={`Remove link ${index + 1}`} onClick={() => onChange(removeProfile(resume, index))}>
                <Trash2 aria-hidden className="text-destructive" />
              </IconButton>
            </div>
          </div>
        ))}

        <div>
          <Button className="h-11" onClick={() => onChange(addProfile(resume))} type="button" variant="outline">
            <Plus aria-hidden />
            Add a link
          </Button>
        </div>
      </fieldset>
    </CollapsibleSection>
  );
}
