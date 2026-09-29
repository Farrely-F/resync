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

Every structured model call goes through one seam (`src/lib/ai/run.ts`), which is either served from a recorded
fixture under `AI_MODE=mock` or sent to OpenRouter under `AI_MODE=live`. Tests and local development never need
network access or an API key.

Two consequences worth knowing before designing anything on top of it:

- `openrouter/free` is an **auto-router**: it can select a different backing model per request, so the same input
  may produce different output. Anything user-visible must not depend on model determinism — that is why the match
  score is computed by our own weighted rubric from extracted evidence rather than by the model.
- Free-tier limits are shared across everyone using the same key (20 requests/minute; 50 requests/day below $10 of
  credits, 1000/day above). Analyses are cached by content hash so repeat runs cost nothing.

## Architecture notes

- **Canonical data model**: JSON Resume (basics, work with bullets, education, skills, projects, certificates,
  languages). LaTeX is a rendering target, not the source of truth. Editing generated LaTeX marks that resume as
  *manual*, which stops it being rewritten from data until the user explicitly regenerates it.
- **PDF output**: real LaTeX compiled in the browser, off the main thread, from engine assets (~127 MB) fetched at
  build time and cached in Cache Storage. Nothing downloads without explicit consent.
- **Themes** may only use packages present in the bundled minimal TeX Live scheme, enforced by a compile check.

## Licence

AGPL-3.0-or-later. This application serves AGPL-licensed code (the TeX engine), so the source is offered to every
network user — see `LICENSE`, and the source link in the site footer.
