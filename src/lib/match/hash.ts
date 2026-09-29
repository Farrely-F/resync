import type { Jd } from "@/lib/jd/schema";
import { rubricVersion } from "@/lib/match/types";
import type { Resume } from "@/lib/resume/schema";

/**
 * The identity of an analysis.
 *
 * Two analyses of the same resume, posting, rubric, theme, model and AI mode
 * are the same analysis: the same report is reused and no model request is
 * made. Everything that can change the stored report is in here — including the
 * theme, because the ATS checks are computed from the themed document, so two
 * themes are not the same input. Changing any of them is a cache miss, by
 * design; changing only the resume's key order is not.
 */

export interface MatchInputIdentity {
  resume: Resume;
  jd: Jd;
  themeId: string | null;
  model: string;
  aiMode: "mock" | "live";
}

/**
 * Equivalent JSON with object keys sorted. `JSON.stringify` preserves insertion
 * order, so two objects holding the same data built in different orders would
 * otherwise hash differently and miss the cache for no reason.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`).join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

/** SHA-256 of the canonical identity, as lowercase hex. */
export async function computeInputHash(identity: MatchInputIdentity): Promise<string> {
  const payload = canonicalJson({
    rubricVersion,
    themeId: identity.themeId,
    model: identity.model,
    aiMode: identity.aiMode,
    resume: identity.resume,
    jd: identity.jd,
  });

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
