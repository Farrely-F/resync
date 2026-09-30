import "fake-indexeddb/auto";

import { describe, expect, it, vi } from "vitest";

import { extractJdFixture } from "@/lib/jd/fixtures/extract-jd";
import { parseEnv } from "@/lib/env";
import { analyzeMatchFixture } from "@/lib/match/fixtures/analyze";
import { analyzeMatch } from "@/lib/match/service";
import type { MatchCriterion } from "@/lib/match/types";
import { parseResumeFixture } from "@/lib/resume/fixtures";
import { createStorage } from "@/lib/storage";
import type { JdRecord, ResumeRecord } from "@/lib/storage/types";
import { readDecisions, recordDecision } from "@/lib/suggestions/decisions";
import type { GenerationOutcome } from "@/lib/suggestions/types";
import { acceptSuggestion, generateGroundedSuggestions } from "@/lib/suggestions/service";
import { applySuggestion } from "@/lib/suggestions/apply";

/**
 * The whole path, against a real (in-memory) IndexedDB: generate from the
 * recorded fixtures, accept one proposal, and check what the browser's records
 * say afterwards. The mock fixtures are the same ones the app runs on, so these
 * assertions describe the behaviour a user sees offline.
 */

const storage = createStorage({ name: "resync-suggestions-test" });
/** Built through the env parser rather than as a literal, so a field added to `AppEnv` flows through here. */
const mockEnv = parseEnv({ AI_MODE: "mock" }, "test");

/** Criteria with ids this build minted, in the order the analysis fixture lists them. */
function reportCriteria(): MatchCriterion[] {
  return analyzeMatchFixture.criteria.map((criterion, index) => ({ ...criterion, id: `criterion-${index + 1}` }));
}

function resumeRecord(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: crypto.randomUUID(),
    title: "Priya Raman",
    resume: parseResumeFixture,
    plainText: "plain text",
    themeId: "classic",
    mode: "structured",
    manualTex: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function jdRecord(): JdRecord {
  return {
    id: crypto.randomUUID(),
    title: "Senior Software Engineer - Go (Golang)",
    company: "General Motors",
    sourceUrl: null,
    rawText: "posting text",
    structured: extractJdFixture,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function generated(resume = parseResumeFixture): Promise<GenerationOutcome> {
  return generateGroundedSuggestions({
    resume,
    jd: extractJdFixture,
    criteria: reportCriteria(),
    env: mockEnv,
  });
}

describe("generateGroundedSuggestions", () => {
  it("keeps the grounded proposals and reports the fabricated one it dropped", async () => {
    const outcome = await generateGroundedSuggestions({
      resume: parseResumeFixture,
      jd: extractJdFixture,
      criteria: reportCriteria(),
      env: mockEnv,
    });

    expect(outcome.modelCalls).toBe(2);
    expect(outcome.suggestions.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.0", "basics.summary"]);
    expect(outcome.dropped).toHaveLength(1);
    expect(outcome.groundingDropped).toBe(1);
    expect(outcome.dropped[0].reason).toBe("not-grounded");
    expect(outcome.dropped[0].targetId).toBe("work.0.highlights.2");
    expect(outcome.dropped[0].detail).toContain("Volkswagen");
    // The dropped proposal still carries its text, so the page can show what was removed.
    expect(outcome.dropped[0].proposed).toContain("Volkswagen");
  });

  it("makes one model request and no grounding call when nothing was proposed", async () => {
    const verification = vi.fn(async () => ({ results: [] }));

    const outcome = await generateGroundedSuggestions(
      { resume: parseResumeFixture, jd: extractJdFixture, criteria: reportCriteria(), env: mockEnv },
      { drafts: async () => [], verification },
    );

    expect(outcome.modelCalls).toBe(1);
    expect(outcome.suggestions).toEqual([]);
    expect(outcome.groundingDropped).toBe(0);
    expect(verification).not.toHaveBeenCalled();
  });

  it("counts a drop by the verifier separately from the ones decided before it", async () => {
    const outcome = await generateGroundedSuggestions(
      { resume: parseResumeFixture, jd: extractJdFixture, criteria: reportCriteria(), env: mockEnv },
      {
        drafts: async () => [
          { targetId: "work.9.highlights.0", proposed: "Nowhere.", rationale: "Because.", criterionIndex: 1 },
          { targetId: "work.1.highlights.0", proposed: "Rewritten pipeline bullet.", rationale: "Because.", criterionIndex: 6 },
        ],
        verification: async () => ({
          results: [
            { targetId: "work.1.highlights.0", grounded: false, reason: "Invented.", unsupported: ["Nowhere"] },
          ],
        }),
      },
    );

    expect(outcome.dropped.map((drop) => drop.reason)).toEqual(["unknown-target", "not-grounded"]);
    expect(outcome.groundingDropped).toBe(1);
    expect(outcome.suggestions).toEqual([]);
  });
});

describe("accepting and rejecting against stored records", () => {
  it("accepting changes the stored resume by exactly the accepted content", async () => {
    const record = resumeRecord();
    await storage.putResume(record);
    const before = JSON.stringify(await storage.getResume(record.id));

    const { suggestions } = await generated();
    const accepted = suggestions[1];
    const outcome = await acceptSuggestion({ resumeId: record.id, suggestion: accepted }, { storage });

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) {
      return;
    }

    const stored = await storage.getResume(record.id);
    expect(stored!.resume.basics.summary).toBe(accepted.proposed);
    expect(stored!.updatedAt).not.toBe(record.updatedAt);

    // Everything except the summary is unchanged from what was stored before.
    expect({ ...stored!.resume, basics: { ...stored!.resume.basics, summary: record.resume.basics.summary } }).toEqual(record.resume);
    expect(stored!.title).toBe(record.title);
    expect(stored!.plainText).toBe(record.plainText);
    expect(stored!.manualTex).toBe(record.manualTex);
    expect(stored!.mode).toBe("structured");
    expect(before).not.toBe(JSON.stringify(stored));
  });

  it("rejecting leaves the stored record byte-identical", async () => {
    const record = resumeRecord();
    await storage.putResume(record);

    const { suggestions } = await generated();
    const rejected = suggestions[0];
    const decisions = memoryStore();

    const before = JSON.stringify(await storage.getResume(record.id));
    recordDecision(decisions, "report-1", rejected.id, "rejected", new Date("2026-03-03T00:00:00.000Z"));
    const after = JSON.stringify(await storage.getResume(record.id));

    expect(after).toBe(before);
    expect(readDecisions(decisions, "report-1")[rejected.id].decision).toBe("rejected");
  });

  it("refuses to change a hand-edited resume and says why, with the record untouched", async () => {
    const record = resumeRecord({ mode: "manual", manualTex: "\\documentclass{article}" });
    await storage.putResume(record);
    const before = JSON.stringify(await storage.getResume(record.id));

    const { suggestions } = await generated();

    for (const suggestion of suggestions) {
      const outcome = await acceptSuggestion({ resumeId: record.id, suggestion }, { storage });

      expect(outcome.applied).toBe(false);
      if (!outcome.applied) {
        expect(outcome.reason).toBe("manual-mode");
        expect(outcome.message).toContain("hand-edited");
      }
    }

    expect(JSON.stringify(await storage.getResume(record.id))).toBe(before);
  });

  it("refuses when the resume is gone, and writes nothing", async () => {
    const { suggestions } = await generated();

    const outcome = await acceptSuggestion({ resumeId: "not-a-resume", suggestion: suggestions[0] }, { storage });

    expect(outcome.applied).toBe(false);
    if (!outcome.applied) {
      expect(outcome.reason).toBe("missing-resume");
    }
  });

  it("refuses to apply the same suggestion twice, so a double click cannot double-write", async () => {
    const record = resumeRecord();
    await storage.putResume(record);

    const { suggestions } = await generated();
    const first = await acceptSuggestion({ resumeId: record.id, suggestion: suggestions[0] }, { storage });
    expect(first.applied).toBe(true);

    const storedAfterFirst = JSON.stringify(await storage.getResume(record.id));
    const second = await acceptSuggestion({ resumeId: record.id, suggestion: suggestions[0] }, { storage });

    expect(second.applied).toBe(false);
    if (!second.applied) {
      expect(second.reason).toBe("stale-target");
    }

    expect(JSON.stringify(await storage.getResume(record.id))).toBe(storedAfterFirst);
  });
});

describe("regenerating for the same report", () => {
  it("gives the same proposals the same ids, so a rejection is remembered instead of coming back", async () => {
    const record = resumeRecord();
    await storage.putResume(record);
    const decisions = memoryStore();

    const first = await generated();
    const rejected = first.suggestions[0];
    recordDecision(decisions, "report-1", rejected.id, "rejected");

    const before = JSON.stringify(await storage.getResume(record.id));
    const second = await generated();

    expect(second.suggestions.map((suggestion) => suggestion.id)).toEqual(first.suggestions.map((suggestion) => suggestion.id));
    // It is still offered, but the stored decision says the user already said no to it.
    expect(readDecisions(decisions, "report-1")[second.suggestions[0].id].decision).toBe("rejected");
    expect(JSON.stringify(await storage.getResume(record.id))).toBe(before);
  });

  it("still drops the fabricated proposal after another proposal has been accepted", async () => {
    const record = resumeRecord();
    await storage.putResume(record);

    const first = await generated();
    expect(first.suggestions.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.0", "basics.summary"]);

    const summary = first.suggestions.find((suggestion) => suggestion.targetId === "basics.summary")!;
    const applied = await acceptSuggestion({ resumeId: record.id, suggestion: summary }, { storage });
    expect(applied.applied).toBe(true);
    if (!applied.applied) {
      return;
    }

    const second = await generated(applied.record.resume);

    // The accepted rewrite is now the stored text, so there is nothing left to
    // change there; the invented employer is still invented and still dropped.
    expect(second.suggestions.map((suggestion) => suggestion.targetId)).toEqual(["work.1.highlights.0"]);
    expect(second.dropped.map((drop) => drop.reason)).toEqual(["no-change", "not-grounded"]);
    expect(second.groundingDropped).toBe(1);
    expect(second.dropped[1].targetId).toBe("work.0.highlights.2");
    expect(second.dropped[1].detail).toContain("Volkswagen");
  });
});

describe("a fresh analysis after an accepted suggestion", () => {
  it("is a new cache entry, because the resume content is now different", async () => {
    const record = resumeRecord();
    const jd = jdRecord();
    await storage.putResume(record);
    await storage.putJd(jd);

    const evidence = vi.fn(async () => ({ criteria: reportCriteria(), summary: null }));
    const before = await analyzeMatch(
      {
        resumeId: record.id,
        jdId: jd.id,
        resume: record.resume,
        jd: jd.structured,
        themeId: record.themeId,
        model: mockEnv.model,
        aiMode: mockEnv.aiMode,
      },
      { storage, evidence },
    );

    const outcome = await generateGroundedSuggestions({
      resume: record.resume,
      jd: jd.structured,
      criteria: before.report.criteria,
      env: mockEnv,
    });
    const accepted = outcome.suggestions[1];
    const applied = await acceptSuggestion({ resumeId: record.id, suggestion: accepted }, { storage });
    expect(applied.applied).toBe(true);
    if (!applied.applied) {
      return;
    }

    const after = await analyzeMatch(
      {
        resumeId: record.id,
        jdId: jd.id,
        resume: applied.record.resume,
        jd: jd.structured,
        themeId: applied.record.themeId,
        model: mockEnv.model,
        aiMode: mockEnv.aiMode,
      },
      { storage, evidence },
    );

    expect(after.cached).toBe(false);
    expect(after.report.id).not.toBe(before.report.id);
    expect(after.report.inputHash).not.toBe(before.report.inputHash);
    expect(evidence).toHaveBeenCalledTimes(2);
    expect(await storage.listReports()).toHaveLength(2);
  });
});

describe("the two apply paths", () => {
  it("applies directly from a record in hand, but refuses when the resume is not stored", async () => {
    const record = resumeRecord();
    const { suggestions } = await generated();

    const direct = applySuggestion(record, suggestions[0]);
    const stored = await acceptSuggestion({ resumeId: record.id, suggestion: suggestions[0] }, { storage });

    expect(direct.applied).toBe(true);
    expect(stored.applied).toBe(false);
    if (!stored.applied) {
      expect(stored.reason).toBe("missing-resume");
    }
  });
});
