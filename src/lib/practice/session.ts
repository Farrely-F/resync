import type { KeyValueStore } from "@/lib/ai/usage";
import type { Grade } from "@/lib/practice/grade";
import { practiceRubricVersion, scoreAnswer, scoreConfidence } from "@/lib/practice/rubric";

/**
 * A practice run, kept in this browser so a reload does not lose the conversation.
 *
 * The transcript stores the model's judgements and the app's own numbers side by
 * side with the rubric version that produced them, and the numbers are recomputed
 * from the judgements whenever they are shown — the same rule the match report
 * follows. One run is kept per report; starting again replaces it.
 */

export const practiceSessionsKey = "resync.practiceSessions.v1";

export interface Turn {
  id: string;
  /** Index into the interview-prep questions this turn belongs to. */
  questionIndex: number;
  /** True when this turn answers a follow-up the interviewer asked, not the prepared question. */
  followUp: boolean;
  asked: string;
  answer: string;
  grade: Grade;
  rubricVersion: number;
  at: string;
}

export interface PracticeSession {
  startedAt: string;
  turns: Turn[];
  /** The follow-up awaiting an answer for the current question, if the interviewer asked one. */
  pendingFollowUp: string | null;
  /** Index of the question being answered; equals the question count once the run is finished. */
  current: number;
  /** Questions the reader chose not to answer. */
  skipped: number[];
}

export function newSession(now: Date = new Date()): PracticeSession {
  return { startedAt: now.toISOString(), turns: [], pendingFollowUp: null, current: 0, skipped: [] };
}

function isSession(value: unknown): value is PracticeSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PracticeSession>;
  return (
    typeof candidate.startedAt === "string" &&
    Array.isArray(candidate.turns) &&
    typeof candidate.current === "number" &&
    Array.isArray(candidate.skipped) &&
    (candidate.pendingFollowUp === null || typeof candidate.pendingFollowUp === "string")
  );
}

function readAll(store: KeyValueStore): Record<string, unknown> {
  try {
    const raw = store.getItem(practiceSessionsKey);
    const parsed: unknown = raw === null ? {} : JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readSession(store: KeyValueStore | null, reportId: string): PracticeSession | null {
  if (store === null) {
    return null;
  }

  const value = readAll(store)[reportId];
  return isSession(value) ? value : null;
}

export function writeSession(store: KeyValueStore | null, reportId: string, session: PracticeSession | null): void {
  if (store === null) {
    return;
  }

  const all = readAll(store);
  if (session === null) {
    delete all[reportId];
  } else {
    all[reportId] = session;
  }

  try {
    store.setItem(practiceSessionsKey, JSON.stringify(all));
  } catch {
    // A full or blocked store costs the reader their saved run, not the run in front of them.
  }
}

/** The numbers for one turn, always derived from the stored judgements. */
export function turnScores(turn: Turn) {
  return { ...scoreAnswer(turn.grade.verdicts), ...scoreConfidence(turn.grade.delivery, turn.answer) };
}

export interface SessionSummary {
  answered: number;
  averageScore: number | null;
  averageConfidence: number | null;
  /** The dimension that earned the least, as a share of what it could have earned, across the run. */
  weakest: string | null;
}

export function summarise(session: PracticeSession): SessionSummary {
  if (session.turns.length === 0) {
    return { answered: 0, averageScore: null, averageConfidence: null, weakest: null };
  }

  const scored = session.turns.map(turnScores);
  const mean = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  const totals = new Map<string, { earned: number; possible: number }>();
  for (const entry of scored) {
    for (const row of entry.rows) {
      if (!row.counted) {
        continue;
      }
      const total = totals.get(row.dimension) ?? { earned: 0, possible: 0 };
      totals.set(row.dimension, { earned: total.earned + row.earned, possible: total.possible + row.weight });
    }
  }

  let weakest: string | null = null;
  let lowest = 1.01;
  for (const [dimension, { earned, possible }] of totals) {
    const share = earned / possible;
    if (share < lowest) {
      lowest = share;
      weakest = dimension;
    }
  }

  return {
    answered: session.turns.length,
    averageScore: mean(scored.map((entry) => entry.score)),
    averageConfidence: mean(scored.map((entry) => entry.confidence)),
    weakest,
  };
}

export { practiceRubricVersion };
