import type { AiTask } from "@/lib/ai/run";

/**
 * Recorded model responses, keyed by task, used when AI_MODE=mock.
 *
 * Populated by the slices that introduce each task (resume parsing, JD
 * extraction, match analysis, suggestion verification). An empty registry is
 * intentional: mock mode must fail with MissingFixtureError rather than invent a
 * response for a task nobody has recorded yet.
 */
export const mockFixtures: Partial<Record<AiTask, unknown>> = {};
