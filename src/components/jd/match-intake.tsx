"use client";

import { useEffect, useState } from "react";

import { JdSourceForm, type JdInputMode } from "@/components/jd/jd-source-form";
import { JdSummary } from "@/components/jd/jd-summary";
import { ResumePicker } from "@/components/jd/resume-picker";
import { SliceNotice } from "@/components/slice-notice";
import { Button } from "@/components/ui/button";
import {
  isIntakeError,
  jdRecordFromIntake,
  type JdIntakeResponse,
  type JdIntakeSuccess,
} from "@/lib/jd/api";
import { classifyHost, type JobHints } from "@/lib/jd/hosts";
import type { Jd } from "@/lib/jd/schema";
import { getStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * JD intake workspace: pick a resume, bring in a posting by paste or link,
 * structure it, and store the result locally. Scoring is a later slice, so the
 * score area says so instead of showing a number.
 */

interface ViewModel {
  structured: Jd;
  source: string;
  url: string | null;
  rawText: string;
  hints: JobHints;
  stored: boolean;
}

function viewFromIntake(response: JdIntakeSuccess, stored: boolean): ViewModel {
  return {
    structured: response.structured,
    source: response.source,
    url: response.url,
    rawText: response.rawText,
    hints: response.hints,
    stored,
  };
}

function viewFromRecord(record: JdRecord): ViewModel {
  let source = "paste";
  if (record.sourceUrl) {
    try {
      source = classifyHost(new URL(record.sourceUrl).hostname);
    } catch {
      source = "generic";
    }
  }

  return {
    structured: record.structured,
    source,
    url: record.sourceUrl,
    rawText: record.rawText,
    hints: { title: record.title, company: record.company, location: null },
    stored: true,
  };
}

export function MatchIntake() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  const [mode, setMode] = useState<JdInputMode>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ reason: string; message: string } | null>(null);
  const [view, setView] = useState<ViewModel | null>(null);
  const [savedJds, setSavedJds] = useState<JdRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const storage = getStorage();
        const [loadedResumes, loadedJds] = await Promise.all([storage.listResumes(), storage.listJds()]);
        if (cancelled) {
          return;
        }
        setResumes(loadedResumes);
        setSelectedResumeId(loadedResumes[0]?.id ?? null);
        setSavedJds(loadedJds);
      } finally {
        if (!cancelled) {
          setResumesLoading(false);
        }
      }
    })().catch(() => {
      if (!cancelled) {
        setResumesLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = mode === "paste" ? text.trim().length > 0 : url.trim().length > 0;

  async function runIntake() {
    setBusy(true);
    setError(null);

    try {
      const request = mode === "url" ? { url: url.trim() } : { text };
      const response = await fetch("/api/jd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as JdIntakeResponse;

      if (isIntakeError(payload)) {
        setError(payload.error);
        return;
      }

      let stored = false;
      try {
        const storage = getStorage();
        await storage.putJd(jdRecordFromIntake(payload));
        stored = true;
        setSavedJds(await storage.listJds());
      } catch {
        stored = false;
      }

      setView(viewFromIntake(payload, stored));
      setText("");
      setUrl("");
    } catch {
      setError({ reason: "network-error", message: "The request could not be completed. Paste the posting text instead." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">1. Your resume</h2>
        <ResumePicker
          loading={resumesLoading}
          onSelect={setSelectedResumeId}
          resumes={resumes}
          selectedId={selectedResumeId}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">2. The job description</h2>
        <JdSourceForm
          busy={busy}
          canSubmit={canSubmit}
          mode={mode}
          onModeChange={(next) => {
            setMode(next);
            setError(null);
          }}
          onSubmit={runIntake}
          onTextChange={setText}
          onUrlChange={setUrl}
          text={text}
          url={url}
        />
      </section>

      {error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert">
          <p className="text-sm">{error.message}</p>
          <p className="text-xs text-muted-foreground">Reason: {error.reason}</p>
          <Button className="h-11 w-full sm:w-auto" onClick={() => setMode("paste")} size="lg" variant="outline">
            Paste the posting text instead
          </Button>
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">3. The structured posting</h2>
        {view ? (
          <JdSummary
            hints={view.hints}
            rawText={view.rawText}
            source={view.source}
            stored={view.stored}
            structured={view.structured}
            url={view.url}
          />
        ) : (
          <p className="rounded-lg border border-border/60 px-4 py-6 text-sm text-muted-foreground">
            Nothing read yet. Paste a posting or add its link above.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">4. Match score</h2>
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Not computed yet. Scoring the posting against the resume, the uncovered requirements and the suggested edits
          are the next slices, so this panel stays empty rather than showing a number that means nothing.
        </p>
        <SliceNotice issue={4}>Scoring and suggestion generation land with slices S4 and S5.</SliceNotice>
      </section>

      {savedJds.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Saved job descriptions</h2>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border/60">
            {savedJds.map((record) => (
              <li key={record.id}>
                <button
                  className="min-h-11 w-full px-4 py-3 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    setView(viewFromRecord(record));
                    setError(null);
                  }}
                  type="button"
                >
                  <span className="block font-medium">{record.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {record.sourceUrl ?? "Pasted text"} · {new Date(record.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
