import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { aiProviders, providerDefaults, type AiModeSummary } from "@/lib/env";

/**
 * Discloses that the app is answering from recorded fixtures rather than from
 * the user's own documents.
 *
 * This exists because the failure it prevents is silent and badly misleading: in
 * mock mode the resume you upload and the posting you paste are replaced by
 * stored samples, so a fixture reads exactly like a successful parse.
 */
export function MockModeNotice({ summary }: { summary: AiModeSummary }) {
  if (summary.aiMode !== "mock") {
    return null;
  }

  const keyVariables = aiProviders.map((provider) => providerDefaults[provider].keyVariable).join(" or ");

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
            No provider key is configured, so every parse, match and suggestion is answered from a fixture that ships
            with the app.
          </>
        )}{" "}
        To use your own documents, put <code>{keyVariables}</code> in <code>.env.local</code> and either remove{" "}
        <code>AI_MODE</code> or set it to <code>live</code>. Set <code>AI_PROVIDER</code> to choose between{" "}
        {aiProviders.map((provider) => providerDefaults[provider].label).join(" and ")} and <code>MODEL_ID</code> to
        choose a model; with both keys configured, the other provider is used automatically when the first one cannot
        route the request or its allowance is spent.
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
