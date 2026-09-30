/**
 * Suggestion model.
 *
 * A suggestion is a proposed rewrite of text that is already in the resume: it
 * names the span it would replace (`target`), quotes what is there now
 * (`current`), gives the replacement (`proposed`) and says which of the
 * report's criteria it is meant to answer.
 *
 * `current` is read out of the resume by us and never quoted to us by the
 * model. The model chooses a target from the list we hand it and writes only
 * the replacement, so it cannot put words into the user's document that the
 * document does not already contain — and a proposal that invents a fact is
 * dropped by the grounding verifier in `verify.ts` before the user sees it.
 */

/** The parts of a resume a suggestion may rewrite; `basics` holds one object, not a list. */
export const editableSections = [
  "basics",
  "work",
  "education",
  "skills",
  "projects",
  "certificates",
  "languages",
] as const;

export type EditableSection = (typeof editableSections)[number];

/**
 * Where a suggestion lands. `entryIndex` indexes the section array (null for
 * `basics`); `field` names the property; `itemIndex` indexes a list property
 * such as `highlights` (null for a scalar property).
 */
export interface SuggestionTarget {
  section: EditableSection;
  entryIndex: number | null;
  field: string;
  itemIndex: number | null;
}

export interface Suggestion {
  /** Stable across regenerations of the same report; see `stableSuggestionId`. */
  id: string;
  /** The id the model copied from the target list, e.g. `work.0.highlights.1`. */
  targetId: string;
  target: SuggestionTarget;
  /** The text stored at the target when this was generated. */
  current: string;
  proposed: string;
  rationale: string;
  /** The report criterion this addresses, and its requirement text as the report states it. */
  criterionId: string;
  requirement: string;
}

/**
 * Why a proposal never reached the user.
 *
 * The last two are the grounding verifier's: `not-grounded` is a proposal it
 * judged unsupported by the resume, `no-verdict` is one it did not answer for.
 * The UI must show both, and must not treat a missing verdict as a pass.
 */
export type DropReason =
  | "unknown-target"
  | "unknown-criterion"
  | "already-met"
  | "no-change"
  | "duplicate"
  | "not-grounded"
  | "no-verdict";

/** The reasons the grounding verifier owns; the UI counts these separately from the rest. */
export const groundingDropReasons: readonly DropReason[] = ["not-grounded", "no-verdict"];

export interface DroppedSuggestion {
  reason: DropReason;
  /** The target the proposal named, when it named one we could read. */
  targetId: string | null;
  /** What was proposed, so the UI can show what was thrown away rather than hide it. */
  proposed: string;
  /** Plain explanation of the drop, shown to the user. */
  detail: string;
}

export interface GenerationOutcome {
  suggestions: Suggestion[];
  dropped: DroppedSuggestion[];
  /** How many of `dropped` the grounding verifier removed. */
  groundingDropped: number;
  /** Model requests this outcome cost: two when there was something to verify, one when there was not. */
  modelCalls: number;
}
