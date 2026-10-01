/**
 * True under `next dev` only.
 *
 * Which provider and model answered, the AI mode, rubric versions and input hashes
 * are diagnostics for whoever runs the app. A visitor has no use for them, so the
 * UI shows them here and nowhere else. `NODE_ENV` is inlined at build time, so
 * the branches that depend on this are removed from a production bundle.
 */
export const isDevelopment = process.env.NODE_ENV === "development";
