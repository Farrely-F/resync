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
import { acceptSuggestion, addAttestedExperience, ensureTailoredCopy, generateGroundedSuggestions } from "@/lib/suggestions/service";
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

  it("logs the accepted change on the tailored copy and leaves the baseline without one", async () => {
    const record = resumeRecord();
    await storage.putResume(record);

    const { suggestions } = await generated();
    const accepted = suggestions[1];
    const outcome = await acceptSuggestion({ resumeId: record.id, suggestion: accepted, jdId: "jd-1" }, { storage });

    expect(outcome.applied).toBe(true);
    const copy = (await storage.listResumes()).find((entry) => entry.derivedFromId === record.id);
    expect(copy?.adjustments).toEqual([
      {
        id: accepted.id,
        targetId: accepted.targetId,
        requirement: accepted.requirement,
        before: accepted.current,
        after: accepted.proposed,
        at: copy!.updatedAt,
      },
    ]);
    expect((await storage.getResume(record.id))!.adjustments).toBeUndefined();
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

describe("tailored copies", () => {
  it("the first accept for a posting makes a copy and leaves the baseline byte-identical", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const before = JSON.stringify(await storage.getResume(baseline.id));
    const { suggestions } = await generated();
    const jdId = crypto.randomUUID();

    const outcome = await acceptSuggestion({ resumeId: baseline.id, suggestion: suggestions[1], jdId }, { storage });

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) {
      return;
    }
    expect(outcome.created).toBe(true);
    expect(outcome.record.id).not.toBe(baseline.id);
    expect(outcome.record.derivedFromId).toBe(baseline.id);
    expect(outcome.record.forJdId).toBe(jdId);
    expect(outcome.record.resume.basics.summary).toBe(suggestions[1].proposed);
    expect(JSON.stringify(await storage.getResume(baseline.id))).toBe(before);
    expect(await storage.getResume(outcome.record.id)).not.toBeNull();
  });

  it("a second accept for the same posting lands in the same copy", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const { suggestions } = await generated();
    const jdId = crypto.randomUUID();

    const first = await acceptSuggestion({ resumeId: baseline.id, suggestion: suggestions[1], jdId }, { storage });
    const second = await acceptSuggestion({ resumeId: baseline.id, suggestion: suggestions[0], jdId }, { storage });

    expect(first.applied && second.applied).toBe(true);
    if (first.applied && second.applied) {
      expect(second.record.id).toBe(first.record.id);
      expect(second.created).toBe(false);
    }
    const copies = (await storage.listResumes()).filter((record) => record.derivedFromId === baseline.id);
    expect(copies).toHaveLength(1);
  });

  it("a different posting gets its own copy", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const { suggestions } = await generated();

    const a = await acceptSuggestion(
      { resumeId: baseline.id, suggestion: suggestions[1], jdId: crypto.randomUUID() },
      { storage },
    );
    const b = await acceptSuggestion(
      { resumeId: baseline.id, suggestion: suggestions[1], jdId: crypto.randomUUID() },
      { storage },
    );

    expect(a.applied && b.applied).toBe(true);
    if (a.applied && b.applied) {
      expect(a.record.id).not.toBe(b.record.id);
    }
  });

  it("a hand-edited baseline gets no copy", async () => {
    const baseline = resumeRecord({ mode: "manual", manualTex: "\\documentclass{article}" });
    await storage.putResume(baseline);
    const before = (await storage.listResumes()).length;
    const { suggestions } = await generated();

    const outcome = await acceptSuggestion(
      { resumeId: baseline.id, suggestion: suggestions[1], jdId: crypto.randomUUID() },
      { storage },
    );

    expect(outcome.applied).toBe(false);
    expect((await storage.listResumes()).length).toBe(before);
  });

  it("a refused accept leaves no empty copy behind", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const before = (await storage.listResumes()).length;
    const { suggestions } = await generated();
    const stale = { ...suggestions[1], current: "Text the resume does not contain." };

    const outcome = await acceptSuggestion(
      { resumeId: baseline.id, suggestion: stale, jdId: crypto.randomUUID() },
      { storage },
    );

    expect(outcome.applied).toBe(false);
    expect((await storage.listResumes()).length).toBe(before);
  });

  it("an accept against a copy applies in place rather than copying the copy", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const { suggestions } = await generated();
    const jdId = crypto.randomUUID();
    const made = await acceptSuggestion({ resumeId: baseline.id, suggestion: suggestions[1], jdId }, { storage });
    if (!made.applied) {
      throw new Error("expected a copy");
    }
    const before = (await storage.listResumes()).length;

    const again = await acceptSuggestion({ resumeId: made.record.id, suggestion: suggestions[0], jdId }, { storage });

    expect(again.applied).toBe(true);
    if (again.applied) {
      expect(again.record.id).toBe(made.record.id);
    }
    expect((await storage.listResumes()).length).toBe(before);
  });
});

describe("ensureTailoredCopy", () => {
  it("makes a copy without a suggestion, then finds it again", async () => {
    const baseline = resumeRecord();
    await storage.putResume(baseline);
    const before = JSON.stringify(await storage.getResume(baseline.id));
    const jdId = crypto.randomUUID();

    const first = await ensureTailoredCopy({ resumeId: baseline.id, jdId }, { storage });
    const second = await ensureTailoredCopy({ resumeId: baseline.id, jdId }, { storage });

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(second.record.id).toBe(first.record.id);
    }
    expect(JSON.stringify(await storage.getResume(baseline.id))).toBe(before);
  });

  it("returns a copy as it is, and refuses a hand-edited baseline", async () => {
    const manual = resumeRecord({ mode: "manual", manualTex: "x" });
    await storage.putResume(manual);
    const refused = await ensureTailoredCopy({ resumeId: manual.id, jdId: "jd" }, { storage });
    expect(refused.ok).toBe(false);

    const copy = resumeRecord({ derivedFromId: "base", forJdId: "jd" });
    await storage.putResume(copy);
    const same = await ensureTailoredCopy({ resumeId: copy.id, jdId: "jd" }, { storage });
    expect(same.ok && same.record.id === copy.id && !same.created).toBe(true);
  });
});

describe("adding experience the reader says they have", () => {
  const statement = "Traded perpetuals on-chain with my own wallet for two years.";

  it("adds the reader's line to a tailored copy, labelled as theirs, and leaves the baseline alone", async () => {
    const record = resumeRecord();
    await storage.putResume(record);
    const before = JSON.stringify(await storage.getResume(record.id));

    const outcome = await addAttestedExperience(
      { resumeId: record.id, jdId: "jd-1", requirement: "On-chain trading", destinationId: "work.0.highlights", text: `  ${statement} ` },
      { storage },
    );

    expect(outcome.added).toBe(true);
    if (!outcome.added) {
      return;
    }

    expect(outcome.created).toBe(true);
    expect(outcome.record.resume.work[0]!.highlights.at(-1)).toBe(statement);
    expect(outcome.record.adjustments).toMatchObject([{ before: "", after: statement, source: "you", requirement: "On-chain trading" }]);
    expect(JSON.stringify(await storage.getResume(record.id))).toBe(before);
  });

  it("refuses an empty line, a repeat and a missing place, storing nothing", async () => {
    const record = resumeRecord();
    await storage.putResume(record);
    const input = { resumeId: record.id, jdId: "jd-attest", requirement: "r", destinationId: "work.0.highlights" };

    const empty = await addAttestedExperience({ ...input, text: "   " }, { storage });
    const gone = await addAttestedExperience({ ...input, destinationId: "work.99.highlights", text: statement }, { storage });
    expect(empty).toMatchObject({ added: false, reason: "empty" });
    expect(gone).toMatchObject({ added: false, reason: "unknown-destination" });
    expect((await storage.listResumes()).filter((entry) => entry.forJdId === "jd-attest")).toHaveLength(0);

    const first = await addAttestedExperience({ ...input, text: statement }, { storage });
    const again = await addAttestedExperience({ ...input, text: statement }, { storage });
    expect(first.added).toBe(true);
    expect(again).toMatchObject({ added: false, reason: "duplicate" });
  });

  it("refuses a hand-edited resume", async () => {
    const record = resumeRecord({ mode: "manual", manualTex: "\\documentclass{article}" });
    await storage.putResume(record);

    const outcome = await addAttestedExperience(
      { resumeId: record.id, jdId: "jd-manual", requirement: "r", destinationId: "work.0.highlights", text: statement },
      { storage },
    );

    expect(outcome).toMatchObject({ added: false, reason: "manual-mode" });
    expect((await storage.listResumes()).filter((entry) => entry.forJdId === "jd-manual")).toHaveLength(0);
  });
});
