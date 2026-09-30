import type { MatchCriterion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";
import type { SuggestionDraft } from "@/lib/suggestions/generate";
import { collectEditableTargets } from "@/lib/suggestions/targets";
import type { DroppedSuggestion, Suggestion } from "@/lib/suggestions/types";

/**
 * Turning the model's drafts into proposals we are willing to show.
 *
 * Everything mechanical is decided here, before the grounding call and without
 * it: the target must be a span this resume actually has, the criterion must be
 * one this report actually scored, the replacement must change something, and
 * each target may carry one proposal. That last rule is what lets the grounding
 * verifier answer by target: with two proposals for one span, a verdict could not
 * say which of them it judged.
 *
 * Each refusal is recorded with a reason, so a proposal that never reaches the
 * user is still visible to them.
 *
 * `current` is read from the resume here — the model never gets to say what the
 * user's own text is.
 */

export interface BuildSuggestionsInput {
  resume: Resume;
  /** The report's criteria, in the order the prompt numbered them. */
  criteria: readonly MatchCriterion[];
  drafts: readonly SuggestionDraft[];
}

export interface BuiltSuggestions {
  suggestions: Suggestion[];
  dropped: DroppedSuggestion[];
}

/**
 * A 64-bit FNV-1a pair over the proposal's identity.
 *
 * The id must be stable: regenerating suggestions for the same report must
 * produce the same id for the same proposal, or a rejection recorded against it
 * would be forgotten and the item would come back as new. It is deliberately
 * not a random id and deliberately not derived from the resume's surrounding
 * text, so a different part of the resume changing does not resurrect it.
 */
export function stableSuggestionId(input: { targetId: string; criterionId: string; proposed: string }): string {
  const payload = `${input.targetId}\u0000${input.criterionId}\u0000${input.proposed}`;

  const hash32 = (value: string, seed: number): number => {
    let hash = seed;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
  };

  const first = hash32(payload, 0x811c9dc5);
  const second = hash32(`${payload}\u0000${first}`, 0x9e3779b9);

  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

export function buildSuggestions(input: BuildSuggestionsInput): BuiltSuggestions {
  const targets = new Map(collectEditableTargets(input.resume).map((target) => [target.id, target]));
  const claimed = new Set<string>();
  const suggestions: Suggestion[] = [];
  const dropped: DroppedSuggestion[] = [];

  for (const draft of input.drafts) {
    const target = targets.get(draft.targetId);

    if (target === undefined) {
      dropped.push({
        reason: "unknown-target",
        targetId: draft.targetId,
        proposed: draft.proposed,
        detail: `The proposal named the target "${draft.targetId}", which is not a span of this resume.`,
      });
      continue;
    }

    const criterion = input.criteria[draft.criterionIndex - 1];

    if (criterion === undefined) {
      dropped.push({
        reason: "unknown-criterion",
        targetId: target.id,
        proposed: draft.proposed,
        detail: `The proposal cited criterion ${draft.criterionIndex}, which this report does not have.`,
      });
      continue;
    }

    if (criterion.verdict === "met") {
      dropped.push({
        reason: "already-met",
        targetId: target.id,
        proposed: draft.proposed,
        detail: `It addresses a criterion the report already scores as met: ${criterion.requirement}`,
      });
      continue;
    }

    const proposed = draft.proposed.trim();

    if (proposed === target.text.trim()) {
      dropped.push({
        reason: "no-change",
        targetId: target.id,
        proposed,
        detail: "The replacement is the same as the text already there, so it would change nothing.",
      });
      continue;
    }

    const id = stableSuggestionId({ targetId: target.id, criterionId: criterion.id, proposed });

    if (claimed.has(target.id)) {
      dropped.push({
        reason: "duplicate",
        targetId: target.id,
        proposed,
        detail: "Another proposal already rewrites this same span, and a span gets one proposal at a time.",
      });
      continue;
    }

    claimed.add(target.id);
    suggestions.push({
      id,
      targetId: target.id,
      target: target.target,
      current: target.text,
      proposed,
      rationale: draft.rationale.trim(),
      criterionId: criterion.id,
      requirement: criterion.requirement,
    });
  }

  return { suggestions, dropped };
}
