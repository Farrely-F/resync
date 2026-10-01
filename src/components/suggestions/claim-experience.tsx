"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CriterionKind, MatchCriterion } from "@/lib/match/types";
import { getStorage } from "@/lib/storage";
import type { ResumeRecord } from "@/lib/storage/types";
import { attestDestinations } from "@/lib/suggestions/attest";
import { addAttestedExperience } from "@/lib/suggestions/service";

/**
 * Where the reader says "I have done this, my resume just does not say so".
 *
 * Suggestions rewrite what the resume already contains, so they cannot help with a
 * requirement the resume is silent on. This is the other path: the reader writes the
 * line in their own words, chooses where it goes, and it is added to the tailored
 * copy only — marked as theirs, with the model nowhere in it. The report's score is
 * not touched; scoring the copy again is what counts it.
 */

const kindLabels: Record<CriterionKind, string> = {
  required: "Required",
  "nice-to-have": "Nice to have",
  seniority: "Seniority",
  domain: "Domain",
  education: "Education",
};

/** The anchor the report's "I have this" links point at. */
export function claimAnchor(criterionId: string): string {
  return `claim-${encodeURIComponent(criterionId)}`;
}

const selectClassName =
  "min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

function ClaimRow({
  criterion,
  resume,
  jdId,
  disabledReason,
  open,
  onOpen,
  onClose,
  onAdded,
}: {
  criterion: MatchCriterion;
  resume: ResumeRecord | null;
  jdId: string;
  disabledReason: string | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAdded: (copy: ResumeRecord, where: string) => void;
}) {
  const destinations = useMemo(() => (resume === null ? [] : attestDestinations(resume.resume)), [resume]);
  const [text, setText] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = destinations.find((entry) => entry.id === destinationId) ?? destinations[0] ?? null;

  async function add() {
    if (resume === null || chosen === null) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const outcome = await addAttestedExperience(
        { resumeId: resume.id, jdId, requirement: criterion.requirement, destinationId: chosen.id, text },
        { storage: getStorage() },
      );

      if (!outcome.added) {
        setError(outcome.message);
        return;
      }

      setText("");
      onAdded(outcome.record, chosen.label);
    } catch {
      setError("This browser would not store the change, so nothing was added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className="flex scroll-mt-24 flex-col gap-2 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-3"
      id={claimAnchor(criterion.id)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium">{criterion.requirement}</p>
          <p className="text-xs text-muted-foreground">
            {kindLabels[criterion.kind]} · {criterion.verdict === "missing" ? "not in the resume" : "only partly covered"}
          </p>
        </div>
        {open ? null : (
          <Button
            className="h-11 sm:h-9"
            disabled={disabledReason !== null}
            onClick={onOpen}
            title={disabledReason ?? undefined}
            type="button"
            variant="outline"
          >
            <PenLine aria-hidden />I have this
          </Button>
        )}
      </div>

      {open ? (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${claimAnchor(criterion.id)}-text`}>
              What did you do? Write it the way it should read on the resume
            </label>
            <Textarea
              className="min-h-24 leading-relaxed"
              id={`${claimAnchor(criterion.id)}-text`}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. Traded perpetuals on-chain for two years, signing transactions with my own wallet."
              value={text}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor={`${claimAnchor(criterion.id)}-where`}>
              Where it goes
            </label>
            <select
              className={selectClassName}
              id={`${claimAnchor(criterion.id)}-where`}
              onChange={(event) => setDestinationId(event.target.value)}
              value={chosen?.id ?? ""}
            >
              {destinations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Added to your tailored copy only, as written, and marked as yours. Nothing here is checked against the resume
            or reworded by a model: you are saying it is true.
          </p>

          {error === null ? null : (
            <p className="rounded-xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-2.5 text-xs leading-relaxed" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button className="h-11 flex-1 sm:flex-none" disabled={busy || chosen === null || text.trim() === ""} onClick={() => void add()} type="button">
              {busy ? "Adding…" : "Add to my tailored copy"}
            </Button>
            <Button className="h-11 flex-1 sm:flex-none" disabled={busy} onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ClaimExperience({
  criteria,
  resume,
  jdId,
  manual,
  onAdded,
}: {
  criteria: readonly MatchCriterion[];
  /** The record lines are added to: the tailored copy once there is one, else the report's resume. */
  resume: ResumeRecord | null;
  jdId: string;
  manual: boolean;
  onAdded: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [added, setAdded] = useState<{ criterionId: string; where: string; copyId: string }[]>([]);

  const uncovered = useMemo(
    () =>
      [...criteria.filter((criterion) => criterion.verdict !== "met")].sort(
        (a, b) => Number(b.verdict === "missing") - Number(a.verdict === "missing"),
      ),
    [criteria],
  );

  // The report's "I have this" links land here with the requirement in the hash.
  useEffect(() => {
    function fromHash() {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const match = uncovered.find((criterion) => decodeURIComponent(claimAnchor(criterion.id)) === hash);
      if (match) {
        setOpenId(match.id);
        requestAnimationFrame(() => document.getElementById(claimAnchor(match.id))?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    }

    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [uncovered]);

  if (uncovered.length === 0) {
    return null;
  }

  const disabledReason =
    resume === null
      ? "The resume this report was built from is no longer stored."
      : manual
        ? "This resume's LaTeX was hand-edited, so it cannot be changed from here."
        : null;

  return (
    <section aria-label="Experience the resume leaves out" className="flex flex-col gap-3" id="claim-experience">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Have you done something the resume leaves out?</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Suggestions can only reword what your resume already says. If you really have the experience a requirement asks
          for, say so in your own words and it goes into the tailored copy, marked as yours.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {uncovered.map((criterion) => {
          const done = added.filter((entry) => entry.criterionId === criterion.id);

          return (
            <Fragment key={criterion.id}>
              <ClaimRow
                criterion={criterion}
                disabledReason={disabledReason}
                jdId={jdId}
                onAdded={(copy, where) => {
                  setAdded((current) => [...current, { criterionId: criterion.id, where, copyId: copy.id }]);
                  setOpenId(null);
                  onAdded();
                }}
                onClose={() => setOpenId(null)}
                onOpen={() => setOpenId(criterion.id)}
                open={openId === criterion.id}
                resume={resume}
              />
              {done.map((entry, index) => (
                <li className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 text-xs text-muted-foreground" key={index}>
                  <Check aria-hidden className="size-3.5 text-primary" />
                  Added to {entry.where}.{" "}
                  <Link
                    className="font-medium underline underline-offset-4 hover:text-foreground"
                    href={`/match?jd=${encodeURIComponent(jdId)}&resume=${encodeURIComponent(entry.copyId)}`}
                  >
                    Score the copy to count it
                  </Link>
                </li>
              ))}
            </Fragment>
          );
        })}
      </ul>
    </section>
  );
}
