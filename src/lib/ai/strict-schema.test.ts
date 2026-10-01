import { zodSchema } from "ai";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { coverLetterSpec } from "@/lib/documents/cover-letter";
import { interviewPrepSpec } from "@/lib/documents/interview-prep";
import { outreachSpec } from "@/lib/documents/outreach";
import { gradeSchema } from "@/lib/practice/grade";
import { jdContentSchema } from "@/lib/jd/model-schema";
import { jdSchema } from "@/lib/jd/schema";
import { criterionEvidenceSchema } from "@/lib/match/analyze";
import { resumeContentSchema } from "@/lib/resume/model-schema";
import { resumeSchema } from "@/lib/resume/schema";
import { suggestionDraftSchema } from "@/lib/suggestions/generate";
import { suggestionVerificationSchema } from "@/lib/suggestions/verify";

/**
 * The rule that a provider enforces and a developer cannot see.
 *
 * Groq and OpenAI's structured output modes are strict: every object's
 * properties must all appear in `required`, and `additionalProperties` must be
 * false. A Zod `.default(...)` or `.optional()` breaks the first rule, and the
 * rejection arrives as a provider error naming a path inside the generated JSON
 * schema — not as a failed test, and not as anything a reader of the Zod file
 * would notice. That is how `/api/parse-resume` shipped broken.
 *
 * So every schema the model is asked for is listed here and checked, and a new
 * one that is not listed is a gap someone has to notice deliberately. The check
 * converts with `zodSchema`, the same helper the SDK uses, so what is asserted is
 * what the provider would receive.
 */

const modelSchemas: Record<string, z.ZodType> = {
  "parse-resume": resumeContentSchema,
  "extract-jd": jdContentSchema,
  "analyze-match": criterionEvidenceSchema,
  "suggest-actions": suggestionDraftSchema,
  "verify-suggestions": suggestionVerificationSchema,
  // The documents read from the spec, so the schema that is checked is the one
  // the route actually sends rather than a second copy of it.
  "write-cover-letter": coverLetterSpec.schema,
  "write-outreach": outreachSpec.schema,
  "prep-interview": interviewPrepSpec.schema,
  "grade-answer": gradeSchema,
};

interface JsonSchemaNode {
  type?: string | string[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: unknown;
  items?: JsonSchemaNode;
  anyOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  [key: string]: unknown;
}

/** Every object node in the schema, at any depth, including inside combinators. */
function objectNodes(node: JsonSchemaNode, path: string, found: [string, JsonSchemaNode][] = []) {
  if (node.properties !== undefined) {
    found.push([path, node]);
  }

  for (const [key, child] of Object.entries(node.properties ?? {})) {
    objectNodes(child, `${path}.${key}`, found);
  }
  if (node.items !== undefined) {
    objectNodes(node.items, `${path}[]`, found);
  }
  for (const key of ["anyOf", "allOf", "oneOf"] as const) {
    for (const [index, child] of (node[key] ?? []).entries()) {
      objectNodes(child, `${path}|${key}[${index}]`, found);
    }
  }

  return found;
}

describe.each(Object.entries(modelSchemas))("the schema sent for %s", (_task, schema) => {
  it("lists every property of every object as required", async () => {
    const json = (await zodSchema(schema).jsonSchema) as JsonSchemaNode;
    const offenders = objectNodes(json, "")
      .map(([path, node]) => {
        const declared = Object.keys(node.properties ?? {}).sort();
        const required = [...(node.required ?? [])].sort();
        const missing = declared.filter((key) => !required.includes(key));
        return missing.length > 0 ? `${path || "(root)"}: ${missing.join(", ")}` : null;
      })
      .filter((entry): entry is string => entry !== null);

    expect(offenders).toEqual([]);
  });

  it("forbids additional properties on every object", async () => {
    const json = (await zodSchema(schema).jsonSchema) as JsonSchemaNode;
    const offenders = objectNodes(json, "")
      .filter(([, node]) => node.additionalProperties !== false)
      .map(([path]) => path || "(root)");

    expect(offenders).toEqual([]);
  });
});

/**
 * A JSON schema with the parts that legitimately differ between the two
 * authorings removed: a default and a `required` list are what make the app's
 * schema tolerant, and that is exactly what the model's must not be.
 */
function comparable(node: JsonSchemaNode): unknown {
  const ignored = new Set(["default", "required", "additionalProperties"]);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (ignored.has(key)) {
      continue;
    }
    if (key === "properties") {
      out.properties = Object.fromEntries(
        Object.entries((value ?? {}) as Record<string, JsonSchemaNode>).map(([name, child]) => [
          name,
          comparable(child),
        ]),
      );
    } else if (key === "items") {
      out.items = comparable(value as JsonSchemaNode);
    } else if (key === "anyOf" || key === "allOf" || key === "oneOf") {
      // A nullable field converts to a union with a null branch, and the app's
      // defaults sit inside those branches — so the walk has to go in there too.
      out[key] = (value as JsonSchemaNode[]).map(comparable);
    } else {
      out[key] = value;
    }
  }

  return out;
}

describe("the model's schemas and the app's", () => {
  it("describe the same resume, so the two cannot drift apart", async () => {
    // The model schema is the app schema minus `sections`, which is presentation
    // configuration the model is not asked about. Everything else must match, or
    // one of them is lying about the shape of a resume.
    const app = (await zodSchema(resumeSchema).jsonSchema) as JsonSchemaNode;
    const model = (await zodSchema(resumeContentSchema).jsonSchema) as JsonSchemaNode;

    const appWithoutSections = Object.fromEntries(
      Object.entries(app.properties ?? {}).filter(([key]) => key !== "sections"),
    );

    expect(Object.keys(appWithoutSections).sort()).toEqual(Object.keys(model.properties ?? {}).sort());

    for (const key of Object.keys(model.properties ?? {})) {
      expect(comparable(model.properties?.[key] ?? {})).toEqual(comparable(appWithoutSections[key] ?? {}));
    }
  });

  it("describe the same job description", async () => {
    const app = (await zodSchema(jdSchema).jsonSchema) as JsonSchemaNode;
    const model = (await zodSchema(jdContentSchema).jsonSchema) as JsonSchemaNode;

    expect(comparable(model)).toEqual(comparable(app));
  });
});
