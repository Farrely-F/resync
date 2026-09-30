import { coverLetterSpec } from "@/lib/documents/cover-letter";
import { interviewPrepSpec } from "@/lib/documents/interview-prep";
import { outreachSpec } from "@/lib/documents/outreach";
import type { DocumentKind, DocumentSpec } from "@/lib/documents/types";

/**
 * The documents this app writes, in the order they are offered.
 *
 * One list, so the route, the panels and the guide all read the same set: adding
 * a document kind means writing a spec and adding it here, and nothing else has
 * to know it exists.
 */
export const documentSpecs: readonly DocumentSpec[] = [coverLetterSpec, outreachSpec, interviewPrepSpec];

export function specFor(kind: DocumentKind): DocumentSpec {
  const spec = documentSpecs.find((candidate) => candidate.kind === kind);

  if (spec === undefined) {
    throw new Error(`No document spec for ${kind}`);
  }

  return spec;
}

export function isDocumentKind(value: unknown): value is DocumentKind {
  return typeof value === "string" && documentSpecs.some((spec) => spec.kind === value);
}
