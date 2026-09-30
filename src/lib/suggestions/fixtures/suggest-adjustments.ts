import type { SuggestionDraft } from "@/lib/suggestions/generate";

/**
 * Recorded `suggest-adjustments` output for AI_MODE=mock.
 *
 * These are proposals for `parseResumeFixture` (Priya Raman) against
 * `analyzeMatchFixture` / `extractJdFixture` (the General Motors Go posting), so
 * the mock app shows the whole path offline. Criteria are referenced by their
 * number in the analysis fixture's list, which keeps this readable and valid
 * whatever ids a report's criteria carry — the two fixtures must move together,
 * and `service.test.ts` pins the mapping so a drifted number fails loudly.
 *
 * The third proposal is the interesting one: it is exactly the failure this
 * slice exists to catch — a rewrite that reaches for the posting's missing
 * requirement by inventing an employer and a product line. It is recorded here
 * because a real model does produce these, and it must be dropped by the
 * grounding check rather than shown, or worse, applied.
 *
 * Note what is absent: the text being replaced. The client reads that from the
 * resume, so the model cannot tell the user what their own document says.
 */
export const suggestAdjustmentsFixture: { suggestions: SuggestionDraft[] } = {
  suggestions: [
    {
      targetId: "work.1.highlights.0",
      proposed:
        "Built the event-ingestion pipeline handling 400M events per day on Kafka and Flink, a high-throughput streaming workload.",
      rationale:
        "Names the throughput and the streaming nature of the pipeline, which is what the posting's optional streaming item is about.",
      criterionIndex: 6,
    },
    {
      targetId: "basics.summary",
      proposed:
        "Backend engineer with 9 years building payment and data platforms. Owns a service from design through on-call, and introduced schema contracts between producers and consumers to end a class of silent data breaks.",
      rationale:
        "Leads with end-to-end ownership and the cross-team work the posting asks for instead of leaving it inside a bullet.",
      criterionIndex: 4,
    },
    {
      targetId: "work.0.highlights.2",
      proposed: "Mentored four engineers and led the connected-vehicle infotainment platform integration for Volkswagen.",
      rationale: "Shows experience with in-vehicle infotainment systems, which the posting lists as desirable.",
      criterionIndex: 5,
    },
  ],
};
