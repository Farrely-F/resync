"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AiFailureNotice } from "@/components/ai/failure-notice";
import { JdSourceForm, type JdInputMode } from "@/components/jd/jd-source-form";
import { JdSummary } from "@/components/jd/jd-summary";
import { PostingShelf } from "@/components/match/posting-shelf";
import { ResumePicker } from "@/components/jd/resume-picker";
import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/lib/dev-only";
import { toRequestFailure, type AiFailureError } from "@/lib/ai/failures";
import { browserUsageStore, readModelRequests, recordModelRequest, type ModelRequestUsage } from "@/lib/ai/usage";
import { deriveJdTitle } from "@/lib/jd/schema";
import { baselinesFirst } from "@/lib/resume/tailor";
import { isIntakeError, jdRecordFromIntake, type JdIntakeResponse, type JdIntakeSuccess } from "@/lib/jd/api";
import { classifyHost, type JobHints } from "@/lib/jd/hosts";
import { fetchModelIdentity, requestEvidence, type ModelIdentity } from "@/lib/match/api";
import { analyzeMatch, UnanalysableMatchError } from "@/lib/match/service";
import { getStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";

/**
 * The match workspace: choose a resume and a stored posting, then analyse.
 *
 * Stored postings are read back from IndexedDB on mount — the record is the
 * user's work, so returning to the page must show it again rather than claiming
 * nothing was read. The chosen posting is carried in the URL (`?jd=`), which
 * makes "which posting am I looking at" survive a reload and a shared link.
 */

const jdQueryKey = "jd";
/** Preselects a resume, so a report can send the reader back to re-match a tailored copy. */
const resumeQueryKey = "resume";

/**
 * How the analyse flow ends when it does not produce a report. A transport
 * failure keeps its class so the notice can name it; an analysis that returned
 * nothing to score is a different thing and says so.
 */
type AnalyzeError =
  | { kind: "failure"; failure: AiFailureError }
  | { kind: "unanalysable"; message: string };

function viewHints(record: JdRecord): JobHints {
  return { title: record.title, company: record.company, location: record.structured.location };
}

function viewSource(record: JdRecord): string {
  if (!record.sourceUrl) {
    return "paste";
  }

  try {
    return classifyHost(new URL(record.sourceUrl).hostname);
  } catch {
    return "generic";
  }
}

function jdQueryId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(jdQueryKey);
}

/** Keeps the address bar and the visible selection in step, without a navigation. */
function writeJdQuery(id: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = id === null ? window.location.pathname : `${window.location.pathname}?${jdQueryKey}=${encodeURIComponent(id)}`;
  window.history.replaceState(null, "", url);
}

type PostingView = "saved" | "new";

function DeleteJdConfirm({ title, busy, onCancel, onConfirm }: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-3">
      <p className="text-sm">
        Delete <span className="font-medium">{title}</span>? Its structured data and saved text are removed from this
        browser, and this cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" disabled={busy} onClick={onCancel} type="button" variant="outline">
          Keep it
        </Button>
        <Button className="h-11" disabled={busy} onClick={onConfirm} type="button" variant="destructive">
          Delete posting
        </Button>
      </div>
    </div>
  );
}

/**
 * Developer diagnostics: which provider and model answer, and a local request tally.
 * Visitors have no use for either, so it renders only under `next dev`. The guided
 * tour skips a step whose target is absent, so hiding it leaves the tour intact.
 */
function QuotaPanel({ identity, usage, identityError }: {
  identity: ModelIdentity | null;
  usage: ModelRequestUsage | null;
  identityError: string | null;
}) {
  if (!isDevelopment) {
    return null;
  }

  const modeLine = identity === null
    ? identityError ?? "Reading the AI mode…"
    : identity.aiMode === "mock"
      ? `AI mode: mock — every model call is answered from a recorded fixture, so no request leaves this browser (${identity.provider}: ${identity.model}).`
      : `AI mode: live — model calls go to ${identity.provider} (model: ${identity.model}).`;

  return (
    <section
      aria-label="AI mode and requests"
      className="flex flex-col gap-1 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4"
      data-tour="match-ai"
    >
      <p className="text-sm">{modeLine}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {usage === null
          ? "Model requests today: not available — this browser will not let the page keep a local count."
          : `Model requests today: ${usage.count}. Counted locally in this browser (${usage.day}), one per analysis this page started. It is not a provider-reported figure, and no remaining-quota number is shown because the provider's own balance cannot be read from here.`}
      </p>
    </section>
  );
}

export function MatchWorkspace() {
  const router = useRouter();

  const [resumes, setResumes] = useState<ResumeRecord[] | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  const [jds, setJds] = useState<JdRecord[] | null>(null);
  const [selectedJdId, setSelectedJdId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** The posting the reader asked to remove and has not yet confirmed. */
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [identity, setIdentity] = useState<ModelIdentity | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ModelRequestUsage | null>(null);

  /** Which half of the posting step is open; null until the reader chooses, then the saved list wins when there is one. */
  const [postingView, setPostingView] = useState<PostingView | null>(null);
  /** The title of a posting just read and saved, so the reader sees it landed and was selected. */
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const [mode, setMode] = useState<JdInputMode>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [intakeError, setIntakeError] = useState<{ reason: string; message: string } | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<AnalyzeError | null>(null);

  const applyJds = useCallback((records: JdRecord[], preferredId: string | null) => {
    setJds(records);

    const next = records.find((record) => record.id === preferredId)?.id ?? records[0]?.id ?? null;
    setSelectedJdId(next);
    writeJdQuery(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const store = browserUsageStore();
    const initialUsage = store === null ? null : readModelRequests(store, new Date());

    (async () => {
      const storage = getStorage();
      const [loadedResumes, loadedJds] = await Promise.all([storage.listResumes(), storage.listJds()]);
      if (cancelled) {
        return;
      }

      setUsage(initialUsage);
      setResumes(loadedResumes);
      // The newest baseline, not the newest record: a tailored copy is updated more
      // recently than the resume it came from, and a match starts from the original.
      const requested = new URLSearchParams(window.location.search).get(resumeQueryKey);
      setSelectedResumeId(
        (current) =>
          current ??
          loadedResumes.find((record) => record.id === requested)?.id ??
          baselinesFirst(loadedResumes)[0]?.id ??
          null,
      );
      applyJds(loadedJds, jdQueryId());
    })().catch(() => {
      if (!cancelled) {
        setJds([]);
        setResumes([]);
      }
    });

    fetchModelIdentity()
      .then((value) => {
        if (!cancelled) {
          setIdentity(value);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setIdentityError(error instanceof Error ? error.message : "The AI mode could not be read.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyJds]);

  const selectedJd = jds?.find((record) => record.id === selectedJdId) ?? null;
  const pendingDelete = jds?.find((record) => record.id === pendingDeleteId) ?? null;
  const selectedResume = resumes?.find((record) => record.id === selectedResumeId) ?? null;
  const canSubmit = mode === "paste" ? text.trim().length > 0 : url.trim().length > 0;

  function selectJd(id: string) {
    setJustAdded(null);
    setSelectedJdId(id);
    setPendingDeleteId(null);
    setAnalyzeError(null);
    writeJdQuery(id);
  }

  async function runIntake() {
    setBusy(true);
    setIntakeError(null);

    try {
      const request = mode === "url" ? { url: url.trim() } : { text };
      const response = await fetch("/api/jd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as JdIntakeResponse;

      if (isIntakeError(payload)) {
        setIntakeError(payload.error);
        return;
      }

      await storeIntake(payload);
      setText("");
      setUrl("");
    } catch {
      setIntakeError({
        reason: "network-error",
        message: "The request could not be completed. Paste the posting text instead.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function storeIntake(payload: JdIntakeSuccess) {
    const store = browserUsageStore();
    if (store !== null) {
      // Reading a posting is a model request too, and it is counted where it happens.
      setUsage(recordModelRequest(store, new Date()));
    }

    try {
      const storage = getStorage();
      const record = jdRecordFromIntake(payload);
      await storage.putJd(record);
      applyJds(await storage.listJds(), record.id);
      setJustAdded(record.title);
      setPostingView("saved");
    } catch {
      setIntakeError({
        reason: "storage",
        message: "The posting was read but could not be stored in this browser, so there is nothing to match against.",
      });
    }
  }

  async function deletePendingJd() {
    if (pendingDeleteId === null) {
      return;
    }

    setDeleting(true);
    try {
      const storage = getStorage();
      await storage.deleteJd(pendingDeleteId);
      const remaining = await storage.listJds();
      setPendingDeleteId(null);
      // Removing another posting must not move the selection off the one being matched.
      applyJds(remaining, pendingDeleteId === selectedJdId ? null : selectedJdId);
    } catch {
      setIntakeError({ reason: "storage", message: "The posting could not be deleted from this browser." });
    } finally {
      setDeleting(false);
    }
  }

  async function runAnalysis() {
    if (!selectedResume || !selectedJd || identity === null) {
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const outcome = await analyzeMatch(
        {
          resumeId: selectedResume.id,
          jdId: selectedJd.id,
          resume: selectedResume.resume,
          jd: selectedJd.structured,
          themeId: selectedResume.themeId,
          model: identity.model,
          aiMode: identity.aiMode,
        },
        {
          storage: getStorage(),
          evidence: async (input) => {
            const store = browserUsageStore();
            if (store !== null) {
              setUsage(recordModelRequest(store, new Date()));
            }
            return requestEvidence({ resume: input.resume, jd: input.jd, themeId: input.themeId });
          },
        },
      );

      router.push(`/report/${outcome.report.id}`);
    } catch (error) {
      setAnalyzeError(
        error instanceof UnanalysableMatchError
          ? {
              kind: "unanalysable",
              message:
                "The analysis returned no criteria for this pair, so there was nothing to score and no report was stored.",
            }
          : { kind: "failure", failure: toRequestFailure(error) },
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const loading = resumes === null || jds === null;
  // Nothing saved means there is nothing to choose from, so the form is the only sensible view.
  const view: PostingView = jds === null || jds.length === 0 ? "new" : (postingView ?? "saved");

  return (
    <div className="flex flex-col gap-6">
      <QuotaPanel identity={identity} identityError={identityError} usage={usage} />

      <section className="flex flex-col gap-2" data-tour="match-resume">
        <h2 className="text-sm font-semibold">1. Your resume</h2>
        <ResumePicker
          jdTitles={new Map((jds ?? []).map((record) => [record.id, deriveJdTitle(record.structured, record.title)]))}
          loading={loading}
          onSelect={setSelectedResumeId}
          resumes={resumes ?? []}
          selectedId={selectedResumeId}
        />
      </section>

      <section className="flex flex-col gap-3" data-tour="match-posting">
        <h2 className="text-sm font-semibold">2. The job posting</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading saved postings…</p>
        ) : (
          <>
            <PostingShelf
              adding={view === "new"}
              onAdd={() => {
                setPostingView("new");
                setJustAdded(null);
                setPendingDeleteId(null);
              }}
              onSelect={(id) => {
                setPostingView("saved");
                setIntakeError(null);
                selectJd(id);
              }}
              onDelete={(id) => setPendingDeleteId(id)}
              postings={jds}
              selectedId={selectedJdId}
            />

            {pendingDelete ? (
              <DeleteJdConfirm
                busy={deleting}
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={deletePendingJd}
                title={pendingDelete.title}
              />
            ) : null}

            {view === "new" ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-card ring-1 ring-foreground/[0.07] shadow-(--shadow-rest) p-4 animate-in fade-in slide-in-from-top-2 duration-500 ease-(--ease-out-expo)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold">Add a new posting</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      It is read once, saved in this browser and selected for the match. Next time it is on the shelf above.
                    </p>
                  </div>
                  {jds.length > 0 ? (
                    <Button className="h-11 sm:h-9" onClick={() => setPostingView("saved")} type="button" variant="ghost">
                      Cancel
                    </Button>
                  ) : null}
                </div>
                <JdSourceForm
                  busy={busy}
                  canSubmit={canSubmit}
                  mode={mode}
                  onModeChange={(next) => {
                    setMode(next);
                    setIntakeError(null);
                  }}
                  onSubmit={runIntake}
                  onTextChange={setText}
                  onUrlChange={setUrl}
                  submitLabel="Read and save posting"
                  text={text}
                  url={url}
                />
                {intakeError ? (
                  <div className="flex flex-col gap-3 rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4" role="alert">
                    <p className="text-sm">{intakeError.message}</p>
                    <p className="text-xs text-muted-foreground">Reason: {intakeError.reason}</p>
                    {mode === "url" ? (
                      <Button className="h-11 w-full sm:w-auto" onClick={() => setMode("paste")} size="lg" variant="outline">
                        Paste the posting text instead
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {justAdded === null ? null : (
                  <p className="rounded-xl bg-accent ring-1 ring-primary/15 p-3 text-sm leading-relaxed" role="status">
                    Saved <span className="font-medium">{justAdded}</span> and selected it for the match.
                  </p>
                )}

                {selectedJd && pendingDeleteId === null ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <p className="min-w-0 text-xs text-muted-foreground">
                      Matching against <span className="font-medium text-foreground">{selectedJd.title}</span>
                    </p>
                    <Button
                      className="h-11 sm:h-9"
                      onClick={() => setPendingDeleteId(selectedJd.id)}
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 aria-hidden />
                      Delete this posting
                    </Button>
                  </div>
                ) : null}

                {selectedJd ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-500 ease-(--ease-out-expo)" key={selectedJd.id}>
                    <JdSummary
                      hints={viewHints(selectedJd)}
                      rawText={selectedJd.rawText}
                      source={viewSource(selectedJd)}
                      stored
                      structured={selectedJd.structured}
                      url={selectedJd.sourceUrl}
                    />
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3" data-tour="match-run">
        <h2 className="text-sm font-semibold">3. Match</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The model answers one question per requirement — met, partly met or missing, with the resume text behind it.
          The percentage is computed here from those answers by versioned weights, so the same evidence always gives
          the same number and the report can show the arithmetic.
        </p>
        <div>
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={analyzing || loading || identity === null || !selectedResume || !selectedJd}
            onClick={runAnalysis}
            size="lg"
            type="button"
          >
            {analyzing ? "Analysing…" : "Analyse the match"}
          </Button>
        </div>
        {!loading && !selectedResume && (resumes?.length ?? 0) > 0 ? (
          <p className="text-sm text-muted-foreground">Pick a resume to analyse against.</p>
        ) : null}
        {analyzeError === null ? null : analyzeError.kind === "unanalysable" ? (
          <p className="rounded-2xl bg-[color-mix(in_oklch,var(--card),var(--destructive)_7%)] ring-1 ring-destructive/25 p-4 text-sm" role="alert">
            {analyzeError.message}
          </p>
        ) : (
          <AiFailureNotice
            busy={analyzing}
            kind={analyzeError.failure.kind}
            message={analyzeError.failure.message}
            onRetry={runAnalysis}
            retryAfterSeconds={analyzeError.failure.retryAfterSeconds}
          />
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Analysing the same resume, posting, theme, model and mode again reuses the stored report and makes no model
          request. <Link className="underline underline-offset-4 hover:text-foreground" href="/settings">Settings</Link>{" "}
          shows what is stored in this browser.
        </p>
      </section>
    </div>
  );
}
