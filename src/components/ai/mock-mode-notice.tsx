import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { AiModeSummary } from "@/lib/env";

/**
 * Discloses that the app is answering from recorded fixtures rather than from
 * the user's own documents.
 *
 * This exists because the failure it prevents is silent and badly misleading: in
 * mock mode the resume you upload and the posting you paste are replaced by
 * stored samples, so a fixture reads exactly like a successful parse. Anything
 * that renders model output sits under this notice, and it is phrased as what is
 * wrong rather than as a setting.
 */
export function MockModeNotice({ summary }: { summary: AiModeSummary }) {
  if (summary.aiMode !== "mock") {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <TriangleAlert aria-hidden />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Recorded examples, not your documents
        <Badge variant="outline">mock mode</Badge>
      </AlertTitle>
      <AlertDescription>
        {summary.explicit ? (
          <>
            <code>AI_MODE=mock</code> is set, so every parse, match and suggestion is answered from a fixture that
            ships with the app. The resume you upload is not the one you will see.
          </>
        ) : (
          <>
            No <code>OPENROUTER_API_KEY</code> is configured, so every parse, match and suggestion is answered from a
            fixture that ships with the app.
          </>
        )}{" "}
        To use your own documents, put <code>OPENROUTER_API_KEY=…</code> in <code>.env.local</code> and either remove{" "}
        <code>AI_MODE</code> or set it to <code>live</code>. The app then calls{" "}
        <code>{summary.model || "openrouter/free"}</code>, whose free allowance is shared per key (20 requests/minute,
        50/day below $10 of credits).
        {!summary.valid ? (
          <>
            {" "}
            The current configuration is also invalid, so this is the fallback behaviour until it is fixed.
          </>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
