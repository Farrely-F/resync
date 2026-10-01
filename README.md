# resync

Match a resume against a job description, see why the score is what it is, and edit the resume until the gap closes.

No accounts. Resumes, job descriptions, reports and edit history live in the browser's IndexedDB; the server is a
stateless proxy that holds the model key and fetches job descriptions.

## Requirements

- Node.js >= 22 (the AI SDK requires it)
- npm

## Running it

```bash
npm install
cp .env.example .env.local   # AI_MODE=mock works with no key at all
npm run dev
```

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## How AI calls are wired

Every structured model call goes through one seam (`src/lib/ai/run.ts`), which is either served from a fixture the
calling feature provides under `AI_MODE=mock` or sent to OpenRouter under `AI_MODE=live`. Tests and local
development never need network access or an API key.

**Provider**: `AI_PROVIDER` selects `openrouter`, `groq` or `fireworks` and `MODEL_ID` selects the model, so no variable is
shaped like one vendor. With only one provider's key present that provider is used; with both, the other one is
appended to the fallback chain automatically, which is the point of having two — when one vendor's free allowance is
spent, the next attempt goes to a different vendor. Model ids stay vendor-shaped in `MODEL_ID`; which vendor receives
them is `AI_PROVIDER`'s job, not part of the name. A fallback entry written `provider@model` targets the other
provider. `@` is the separator because ids already contain `:` (`:free` variants) and `/` (vendor prefixes).

**Which mode applies**: an explicit `AI_MODE` always wins; otherwise any non-empty provider key means `live`, because
a configured key is a request to use it; otherwise production means `live` (and fails loudly without a key);
otherwise `mock`. Whenever the app is answering from fixtures it says so in a banner on every page — mock mode
replaces your own resume and posting with stored samples, so it must never read as a successful parse.

Two consequences worth knowing before designing anything on top of it:

- `openrouter/free` is an **auto-router**: it can select a different backing model per request, so the same input
  may produce different output. Anything user-visible must not depend on model determinism — that is why the match
  score is computed by our own weighted rubric from extracted evidence rather than by the model.
- Free-tier limits are shared across everyone using the same key: OpenRouter allows 20 requests/minute and 50
  requests/day below $10 of credits (1000/day above); Groq applies per-model limits. A quota answer is treated as
  belonging to that provider's key alone, so the chain moves to a different provider rather than retrying the
  exhausted one. Analyses are cached by content hash so repeat runs cost nothing.
- Failures are typed end to end. The seam raises `AiFailureError` with one of `quota`, `provider`, `offline`, `timeout`,
  `config`; `/api/analyze` maps the kind to a status and a message; `/match` renders a notice per class with the next
  step that fits it. Retries are bounded (three attempts per model, `Retry-After` honoured when sent, capped at 8 s and
  never past the deadline), a 503 walks `OPENROUTER_FALLBACK_MODELS` in order, and a live call has a 30 s deadline, with
  a 45 s backstop in the browser. Identical concurrent requests share one model call, but only within the process that
  receives them — `src/lib/ai/inflight.ts` states what that does and does not cover.

## UI

Controls come from `src/components/ui/**`, generated from the shadcn registry — not hand-written. Add one with:

```bash
npx shadcn@4.21.0 add <component>     # e.g. select, alert-dialog, input, badge, card
```

The generated files are artefacts: use their variants and props rather than forking them, and prefer them over
bespoke markup for inputs, textareas, selects, radio groups, toggles, cards, badges and notices. Confirmations for
destructive actions use `AlertDialog`, so they trap focus and close on Escape instead of being a styled `div`.

Two placement defaults are set in the primitive on purpose, so every select behaves the same way:
`SelectContent` is popper-style (`sideOffset = 4`, `alignItemWithTrigger = false`), which anchors the list below the
trigger rather than Base UI's default of aligning the selected item over it.

## Logging

Server-side events are one JSON object per line, on stderr for `warn` and `error` and on stdout for the rest, so a
drain can index them and a person can still read them with `| jq`. `LOG_LEVEL` selects `debug`, `info` (the default),
`warn` or `error`; an unrecognised value means `info`, because a typo in a log level must not be the reason a failure
is invisible.

Two things are never written to a line, and both are load-bearing:

- **Credentials.** A key in a log line is a key that has to be rotated. Values are redacted by field name and by
  shape, so a key that arrives inside an error message or a URL goes too.
- **The prompt.** On every AI path the prompt is the reader's resume text, and the promise about that text is that it
  stays in their browser. Lines carry counts (`promptChars`), never documents — including the SDK's own
  `requestBodyValues`, which is the one field `describeError` deliberately drops.

A failure logs both halves: the kind the seam decided on (`quota`, `provider`, `offline`, `timeout`, `config`,
`unknown`) and the provider's own words underneath — status, URL, and response body. That is the difference between
`unknown` and knowing which schema property the provider rejected.

Every line for one request carries its `requestId`, which the error bodies include too, so a failure someone reports
can be matched to the line that explains it:

```bash
npm run dev | jq -c 'select(.level == "error" or .event == "route.parse-resume.failed")'
```

## Guided tours

Each page explains itself once, the first time it is opened. A tour is data, not code: `src/lib/tour/steps.ts` lists
steps that point at elements by a `data-tour` id, so the copy is reviewable on its own and the overlay knows nothing
about any particular page. A step whose element is not on the page is dropped rather than pointed at empty space, which
is what lets one tour cover a page that has several states.

The overlay is a modal dialog with a focus trap, arrow keys, and Escape; on a phone it is a sheet at the bottom with the
target scrolled above it, because a popover beside a small target would cover the thing it is describing. Finishing and
skipping both record the tour as seen (`localStorage`, `resync.tour-progress.v1` — versioned, and an unreadable value
counts as unseen, because a tour appearing twice is a smaller cost than one that never appears). Leaving a page
mid-tour does not record it, so it can be offered again. Settings lists every tour with "Show them again" to reset them.

## Architecture notes

- **Two schemas per AI task, and the reason is strict structured output.** Groq and OpenAI reject any schema whose
  object properties are not all listed in `required`, and a Zod `.default(...)` or `.optional()` produces exactly that
  — the rejection arrives as a provider error naming a path inside the generated JSON schema, which is how
  `/api/parse-resume` shipped broken. So the schemas the model is asked for (`resume/model-schema.ts`,
  `jd/model-schema.ts`, and the wire schemas in `match/analyze.ts` and `suggestions/`) require every property, use
  `nullable` where a value may be absent, and carry no defaults; the app's own schemas next door keep their defaults,
  because stored records and partial input are read with them. `ai/strict-schema.test.ts` converts every model schema
  with the SDK's own helper and fails if a property is not required, if `additionalProperties` is not false, or if a
  model schema and its app schema drift apart. The model is never asked for `sections`: that is this app's
  presentation configuration, and `parseResume` adds it.
- **Canonical data model**: JSON Resume (basics, work with bullets, education, skills, projects, certificates,
  languages). LaTeX is a rendering target, not the source of truth. Editing generated LaTeX marks that resume as
  *manual*, which stops it being rewritten from data until the user explicitly regenerates it.
- **Match reports**: the model answers per-criterion questions about the resume against the posting — met, partly
  met, missing, with the supporting resume text — and never a score. `src/lib/match/rubric.ts` turns those verdicts
  into the percentage from weights that live in one place, so the same evidence always gives the same number and the
  report can show the arithmetic. ATS format checks are derived from the generated document and the resume structure,
  not from the model.
- **The seam's deadline is shared between the models that could still answer.** One stalled provider used to spend the
  whole budget, so the call timed out and the fallback was never called — the exact failure a fallback list exists for.
  Each attempt now gets its share of what remains, and a timeout ends that attempt rather than the call; the last target
  left gets whatever is over. Documents ask for 60 s rather than the default 30, because their answers are long.
- **Report cache and quota**: a report is identified by the hash of its inputs (resume, posting, theme, rubric
  version, model, AI mode). Re-analysing an identical pair returns the stored report and makes no model request. The
  quota line on `/match` is a count of model requests this browser started today, kept in `localStorage`; it is not a
  provider-reported balance, so no remaining-quota number is shown.
- **PDF output**: real LaTeX compiled in the browser, off the main thread, from engine assets (~127 MB) fetched at
  build time and cached in Cache Storage. Nothing downloads without explicit consent.
- **Themes** may only use packages present in the bundled minimal TeX Live scheme, enforced by a compile check.
- **The editor's lists reorder by dragging a handle**, and the keyboard is an equal path rather than a fallback:
  focus a handle, press space, use the arrow keys, press space to drop. Every list — the sections, the entries inside
  one section, the lines inside one entry — is its own drag context, so an item can never be dropped into a different
  list; that move has no meaning in the data model. Touch needs a short hold before a drag starts, so a swipe that
  begins on a handle still scrolls the page.
- **A broken document offers its own repair, and never takes it silently.** The problems `validateTex` reports are
  all one thing that failed to match another — a brace, an environment — so they can be repaired without
  understanding the document: `tex/repair.ts` closes a brace at the end of its line (before a comment, where it still
  counts), removes a stray one, ends an unclosed environment at the end of the file innermost-first, and removes an
  unmatched `\end`. It touches only the exact positions the validator named, so an escaped `\{`, a comment and a
  verbatim body are safe, and it re-validates and reports what it could not fix rather than assuming it away. The
  planned change is shown before it is applied, because a repair is a guess about what the document meant: applying it
  edits the source, which in generated mode makes the document yours, and the copy says so.
- **Collapsed sections in the editor are a reading aid, so that state is never stored**: opening a resume never hides
  a section the reader closed last time. Hiding a section is a different action, and it is the one that takes the
  section out of the generated document while keeping its entries.
- **Documents written from a match are one pipeline with three specs.** A cover letter, an outreach message and
  interview prep are the same shape of work — the resume, the posting and the report's verdicts in, text out — so they
  share one route (`POST /api/documents`), one client hook and one spec per kind (`src/lib/documents/*.ts`) holding the
  instructions, the strict schema, the prompt and the recorded fixture. Adding a kind is a spec plus a line in the
  registry. The report is the input on purpose: a letter written from the posting repeats the posting, and one written
  from the report can answer the gaps the analysis found. Answers are stored in this browser (the `documents` store) and
  are deleted with the report they answer, which the confirmation says.
- **`/guide` teaches the flow by doing it.** Each step is a real action — the sample resume goes through the same parse
  path as an upload, the sample posting is copied to the clipboard — and a step is done when the underlying fact is true
  (a resume exists) rather than when a box is ticked. Steps the page cannot check say so, and the marks it does keep are
  in `localStorage`, versioned, with an unreadable value counting as nothing done.
- **The editor has two surfaces, one at a time.** The fields and the LaTeX are two views of one document; mounting both
  meant every keystroke re-rendered both, including a CodeMirror view nobody was looking at. They are tabs now, opening
  on whichever holds the document. The fields stay editable in manual mode: a field edit regenerates the document from
  the data, which replaces the hand-written LaTeX, so it asks first and names the cost. That is the honest half of
  two-way sync — fields to document is exact, document to fields is not, because hand-written LaTeX can say things the
  data model cannot hold.
- **The source check masks verbatim arguments before parsing.** `\url` sets its own catcodes, so a `%` inside it is a
  literal percent sign; the parser used here reads it as a comment, swallows the argument's closing brace and reports an
  unclosed brace. That is not hypothetical: `latexUrl` percent-encodes for `\url`, so any resume whose link contains a
  quote, a space or a literal percent was refused a preview for a document that compiles. The bodies are masked with
  filler of exactly the same length, so every other problem keeps its line and column.
- **Live preview compiles the document of record in the browser**, on a pause after typing rather than per keystroke,
  and only when the engine has already been consented to and cached — a field change can never start a 127 MB download
  or raise a consent prompt. There is one compile state behind the preview and the download, so the two cannot
  disagree; a compile in progress keeps only the newest document; and when the PDF on screen is older than the
  document, it says so instead of looking current. The Live switch turns the whole thing off.

## Licence

AGPL-3.0-or-later. This application serves AGPL-licensed code (the TeX engine), so the source is offered to every
network user — see `LICENSE`, and the source link in the site footer.
