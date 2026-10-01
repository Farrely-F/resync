# Graph Report - resync  (2026-10-01)

## Corpus Check
- 259 files · ~146,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1532 nodes · 3863 edges · 107 communities (72 shown, 35 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `22669985`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resume/schema.ts
- hosts.ts
- match-workspace.tsx
- danger-zone.tsx
- guide-workspace.tsx
- guided-tour.tsx
- suggestions/service.ts
- devDependencies
- exports-panel.tsx
- Resume
- documents/route.ts
- compilerOptions
- suggestions/service.test.ts
- storage/types.ts
- validate.ts
- run.ts
- targets.ts
- AiFailureError
- components.json
- fixtures.ts
- failures.ts
- tex/generate.ts
- settings-workspace.tsx
- assets.ts
- match/types.ts
- generate.test.ts
- MatchReport
- engine.ts
- match/service.test.ts
- formatBytes
- debounced-writer.ts
- seo.ts
- resume-editor.tsx
- how-it-works.tsx
- add-resume-form.tsx
- strict-schema.test.ts
- suggestions/route.ts
- site.ts
- run.test.ts
- button.tsx
- registry.ts
- env.ts
- fetch-tex-assets.mjs
- verify-themes.mjs
- layout.tsx
- interview-prep-panel.tsx
- use-compile-engine.ts
- outreach-panel.tsx
- draft-journal.test.ts
- storage/index.ts
- match/api.ts
- resync
- opengraph-image.tsx
- .key
- suggestions-panel.tsx
- ResumeEditor
- dependencies
- layout.ts
- escape.ts
- inflight.ts
- app/page.tsx
- capabilities.ts
- cover-letter-panel.tsx
- hero-fallback.tsx
- assemble.test.ts
- apple-icon.tsx
- FakeCacheStorage
- AGENTS.md
- ai
- @base-ui/react
- class-variance-authority
- codemirror
- @codemirror/commands
- @codemirror/legacy-modes
- @codemirror/state
- @codemirror/view
- @dnd-kit/core
- @dnd-kit/modifiers
- @dnd-kit/sortable
- eslint.config.mjs
- linkedom
- lucide-react
- mammoth
- motion
- @mozilla/readability
- next
- next.config.ts
- node-html-parser
- @openrouter/ai-sdk-provider
- react-dom
- @react-three/drei
- @react-three/fiber
- texlyre-busytex
- three
- tw-animate-css
- @unified-latex/unified-latex
- zod
- postcss.config.mjs
- raw.d.ts

## God Nodes (most connected - your core abstractions)
1. `Resume` - 47 edges
2. `ResumeRecord` - 42 edges
3. `MatchReport` - 29 edges
4. `getStorage()` - 29 edges
5. `Button()` - 28 edges
6. `Jd` - 27 edges
7. `StorageApi` - 26 edges
8. `AiFailureError` - 23 edges
9. `MatchCriterion` - 23 edges
10. `ResumeEditor()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `collectEditableTargets()` --indirect_call--> `field()`  [INFERRED]
  src/lib/suggestions/targets.ts → src/components/editor/section-specs.ts
- `ToggleGroupItem()` --references--> `react`  [EXTRACTED]
  src/components/ui/toggle-group.tsx → package.json
- `ResumePickerProps` --references--> `ResumeRecord`  [EXTRACTED]
  src/components/jd/resume-picker.tsx → src/lib/storage/types.ts
- `Row` --references--> `MatchReport`  [EXTRACTED]
  src/components/match/recent-matches.tsx → src/lib/match/types.ts
- `MatchEvidence` --references--> `MatchCriterion`  [EXTRACTED]
  src/lib/match/analyze.ts → src/lib/match/types.ts

## Import Cycles
- None detected.

## Communities (107 total, 35 thin omitted)

### Community 0 - "resume/schema.ts"
Cohesion: 0.07
Nodes (66): BasicsEditor(), CollapsibleSection(), BulletList(), EntryEditor(), IconButton(), TextField(), addBullet(), addEntry() (+58 more)

### Community 1 - "hosts.ts"
Cohesion: 0.05
Nodes (71): errorResponse(), Intake, POST(), JdSummaryProps, sourceLabels, viewSource(), intakeRequestSchema, IntakeSource (+63 more)

### Community 2 - "match-workspace.tsx"
Cohesion: 0.11
Nodes (23): ExportFeedback, JdInputMode, JdSourceForm(), JdSourceFormProps, modeLabels, modes, ResumePicker(), ResumePickerProps (+15 more)

### Community 3 - "danger-zone.tsx"
Cohesion: 0.21
Nodes (16): FieldEditConfirm(), RegenerateConfirm(), formatScore(), Pending, RecentMatches(), Row, DeleteResumeConfirm(), AlertDialog() (+8 more)

### Community 4 - "guide-workspace.tsx"
Cohesion: 0.07
Nodes (27): metadata, metadata, metadata, metadata, metadata, GuideWorkspace(), linkControl, Stored (+19 more)

### Community 5 - "guided-tour.tsx"
Cohesion: 0.11
Nodes (28): Active, elementFor(), GuidedTour(), TourContext, TourControl, Box, boxOf(), Placement (+20 more)

### Community 6 - "suggestions/service.ts"
Cohesion: 0.24
Nodes (10): suggestionVerificationFixture, generateGroundedSuggestions(), buildVerificationPrompt(), filterGrounded(), SuggestionVerdict, SuggestionVerification, criteria, ungroundedDetail() (+2 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, fake-indexeddb, devDependencies, eslint, eslint-config-next, fake-indexeddb, tailwindcss (+32 more)

### Community 8 - "exports-panel.tsx"
Cohesion: 0.20
Nodes (19): download(), ExportsPanel(), bullets(), dateRange(), exportFileName(), heading(), join(), jsonFileName() (+11 more)

### Community 9 - "Resume"
Cohesion: 0.14
Nodes (21): DocumentFailure, DocumentRequestBody, DocumentSuccess, WrittenDocument, DocumentContent, DocumentInput, DocumentKind, InterviewQuestion (+13 more)

### Community 10 - "documents/route.ts"
Cohesion: 0.12
Nodes (27): errorResponse(), failureMessages, failureResponse(), GET(), POST(), requestSchema, errorResponse(), failureMessages (+19 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "suggestions/service.test.ts"
Cohesion: 0.08
Nodes (22): extractJdFixture, analyzeMatchEvidence(), analyzeMatchInstructions, buildAnalyzePrompt(), CriterionEvidence, criterionEvidenceSchema, MatchEvidence, ModelCriterion (+14 more)

### Community 13 - "storage/types.ts"
Cohesion: 0.23
Nodes (14): JdSummary(), Loaded, ReportInputs(), ResumeLibrary(), ReportAdjustments(), TailoredNotice(), deriveJdTitle(), buildTailoredCopy() (+6 more)

### Community 14 - "validate.ts"
Cohesion: 0.13
Nodes (24): CompileEngine, applyEdits(), Edit, editsFor(), environmentNameFrom(), lineEndForInsertion(), lineStarts(), macroLength() (+16 more)

### Community 15 - "run.ts"
Cohesion: 0.13
Nodes (18): BackoffPolicy, defaultBackoffPolicy, exponentialDelayMs(), parseRetryAfter(), planRetry(), RetryPlan, withDeadline(), createInFlightCollapser() (+10 more)

### Community 16 - "targets.ts"
Cohesion: 0.12
Nodes (26): SuggestionCard(), ApplyRefusal, ApplyResult, applySuggestion(), collectEditableTargets(), describeTarget(), editableFields, EditableTarget (+18 more)

### Community 17 - "AiFailureError"
Cohesion: 0.11
Nodes (27): errorResponse(), ParseResumeInput, POST(), parseResumeMock, validateParseResumeBody(), describeError(), describeOne(), isProviderError() (+19 more)

### Community 18 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 19 - "fixtures.ts"
Cohesion: 0.20
Nodes (20): AiTask, AppEnv, Jd, StructureJdInput, AnalyzeMatchEvidenceInput, AnalyzeRequestBody, ParseResumeResponse, Resume (+12 more)

### Community 20 - "failures.ts"
Cohesion: 0.23
Nodes (11): AiFailureError, AiFailureOptions, errorCauseChain(), failureFromApiCall(), isAbortError(), isTransportError(), retryableKinds, retryAfterSecondsFrom() (+3 more)

### Community 21 - "tex/generate.ts"
Cohesion: 0.19
Nodes (22): geometryOptions(), dateRange(), densities, Density, Escape, joinParts(), latexUrl(), orderedPackages() (+14 more)

### Community 22 - "settings-workspace.tsx"
Cohesion: 0.13
Nodes (30): record(), accountStorage(), jsonBytes(), sizeOf(), StorageBreakdown, StoreSize, jdRecord(), resumeRecord() (+22 more)

### Community 23 - "assets.ts"
Cohesion: 0.19
Nodes (14): cacheStorage(), clearEngineCache(), contentTypeForAsset(), downloadEngineAssets(), EngineAsset, EngineAssetKind, engineAssets, EngineAssetSizeError (+6 more)

### Community 24 - "match/types.ts"
Cohesion: 0.31
Nodes (9): criterionWeights, roundScore(), RubricResult, RubricRow, scoreCriteria(), criterion(), verdictCredit, CriterionKind (+1 more)

### Community 25 - "generate.test.ts"
Cohesion: 0.20
Nodes (12): ThemePicker(), RadioGroup(), RadioGroupItem(), AllowedPackage, allowedPackages, forbiddenPackages, usedPackages(), accentCssColor() (+4 more)

### Community 27 - "engine.ts"
Cohesion: 0.22
Nodes (15): collectLog(), CompileOutcome, CompileRequest, compileResumeTex(), createEngineTool(), createRunner(), EngineId, getRunner() (+7 more)

### Community 28 - "match/service.test.ts"
Cohesion: 0.23
Nodes (9): analyzeMatch(), AnalyzeMatchDeps, AnalyzeMatchInput, AnalyzeMatchOutcome, criteria, deps(), fakeStorage(), UnanalysableMatchError (+1 more)

### Community 29 - "formatBytes"
Cohesion: 0.33
Nodes (5): ConsentStore, grantConsent(), parse(), readConsent(), revokeConsent()

### Community 30 - "debounced-writer.ts"
Cohesion: 0.15
Nodes (7): createDebouncedWriter(), DebouncedWriter, systemTimers, Timers, DebouncedSave, SaveStatus, useDebouncedSave()

### Community 31 - "seo.ts"
Cohesion: 0.23
Nodes (11): AddResumeForm(), ResumeList(), addResumeFromText(), buildResumeRecord(), formatUpdatedAt(), parseResumeErrorMessage(), requestParseResume(), sectionCounts() (+3 more)

### Community 32 - "resume-editor.tsx"
Cohesion: 0.12
Nodes (21): PreviewPanel, editorTheme, latexLanguage, LatexSourceEditor, LatexSourceEditorSurface(), ManualModeBadge(), EditorState, saveCopy (+13 more)

### Community 33 - "how-it-works.tsx"
Cohesion: 0.18
Nodes (13): HowItWorks(), neverChanges(), onClient(), onServer(), steps, useHydrated(), AddResumePreview(), EditPreview() (+5 more)

### Community 34 - "add-resume-form.tsx"
Cohesion: 0.23
Nodes (12): assessExtraction(), extractDocxText(), ExtractionFailure, ExtractionFailureReason, ExtractionResult, ExtractionSuccess, extractPastedText(), extractPdfText() (+4 more)

### Community 35 - "strict-schema.test.ts"
Cohesion: 0.13
Nodes (16): JsonSchemaNode, modelSchemas, JdContent, jdContentSchema, jdSchema, nullableString, buildJdPrompt(), extractJdInstructions (+8 more)

### Community 36 - "suggestions/route.ts"
Cohesion: 0.48
Nodes (6): failureFrom(), isDropped(), isSuggestion(), messageFrom(), requestSuggestions(), SuggestionsFailure

### Community 37 - "site.ts"
Cohesion: 0.24
Nodes (8): robots(), frequencies, priorities, sitemap(), brand, indexablePaths, privatePaths, resolveSiteUrl()

### Community 38 - "run.test.ts"
Cohesion: 0.17
Nodes (7): crossProviderEnv, fallbackEnv, liveCall, liveEnv, mockEnv, quickPolicy, schema

### Community 39 - "button.tsx"
Cohesion: 0.15
Nodes (14): metadata, ReportPage(), AiFailureNotice(), copyByKind, FailureCopy, CriterionRow(), formatPoints(), formatScore() (+6 more)

### Community 40 - "registry.ts"
Cohesion: 0.06
Nodes (40): metadata, CoverLetterPanel(), Feedback, download(), Feedback, InterviewPrepPanel(), Pending, download() (+32 more)

### Community 41 - "env.ts"
Cohesion: 0.26
Nodes (11): RootLayout(), aiModes, EnvError, isProvider(), itemList(), nonEmpty(), parseEnv(), parseTarget() (+3 more)

### Community 42 - "fetch-tex-assets.mjs"
Cohesion: 0.22
Nodes (9): assets, check(), checkOnly, destination, download(), existingSize(), force, problems (+1 more)

### Community 43 - "verify-themes.mjs"
Cohesion: 0.18
Nodes (7): engineImagePath, image, lines, problems, repoRoot, resume, styFiles

### Community 44 - "layout.tsx"
Cohesion: 0.20
Nodes (9): display, geistMono, geistSans, inter, metadata, viewport, MockModeNotice(), SiteFooter() (+1 more)

### Community 45 - "interview-prep-panel.tsx"
Cohesion: 0.20
Nodes (14): ConfirmationEvent, ConfirmationState, ConfirmationStep, DeleteTarget, idleConfirmation, phraseSatisfied(), requiresPhrase(), step() (+6 more)

### Community 46 - "use-compile-engine.ts"
Cohesion: 0.27
Nodes (8): CompiledPdf, gatePhase(), Phase, useCompileEngine(), DownloadProgress, AutoPreviewInput, shouldAutoCompile(), ready

### Community 47 - "outreach-panel.tsx"
Cohesion: 0.24
Nodes (11): AtsInput, bodyLength(), columnCheck(), contactCheck(), countMatches(), lengthCheck(), runAtsChecks(), sectionCheck() (+3 more)

### Community 48 - "draft-journal.test.ts"
Cohesion: 0.33
Nodes (6): clearDraft(), draftKeyFor(), DraftStorage, preferNewerRecord(), readDraft(), writeDraft()

### Community 49 - "storage/index.ts"
Cohesion: 0.28
Nodes (8): EngineCacheCard(), PreviewPanelSurface(), StoragePanel(), StoreRow(), Separator(), formatBytes(), ConsentRecord, disposeRunner()

### Community 50 - "match/api.ts"
Cohesion: 0.31
Nodes (9): ClearAllFacts, count(), DeleteKind, DeletionFacts, dependentDocuments(), describeClearAll(), describeDeletion(), descriptions (+1 more)

### Community 51 - "resync"
Cohesion: 0.20
Nodes (9): Architecture notes, Guided tours, How AI calls are wired, Licence, Logging, Requirements, resync, Running it (+1 more)

### Community 52 - "opengraph-image.tsx"
Cohesion: 0.22
Nodes (4): alt, facts, requirements, size

### Community 53 - ".key"
Cohesion: 0.09
Nodes (31): memoryStorage(), dropReasonLabels, GeneratedUnder, kindLabels, SuggestionsPanel(), verdictLabels, comparable(), browserUsageStore() (+23 more)

### Community 54 - "suggestions-panel.tsx"
Cohesion: 0.31
Nodes (7): react, react, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 55 - "ResumeEditor"
Cohesion: 0.22
Nodes (14): ResumeEditor(), defaultLayout, isPaperSize(), marginRangeMm, PaperSize, paperSizes, resolveLayout(), applyFieldEdit() (+6 more)

### Community 56 - "dependencies"
Cohesion: 0.13
Nodes (15): ai, @ai-sdk/fireworks, cn, @codemirror/language, @codemirror/state, idb, dependencies, ai (+7 more)

### Community 57 - "layout.ts"
Cohesion: 0.31
Nodes (6): isConfirming(), DangerZone(), deleteActions, RecordKindTarget, Input(), deriveResumeTitle()

### Community 58 - "escape.ts"
Cohesion: 0.33
Nodes (7): asciiEscapes, combiningAccents, escapeLatex(), fromDecomposition(), hostile, unicodeReplacements, unrepresentableCharacters()

### Community 60 - "inflight.ts"
Cohesion: 0.38
Nodes (5): AppShell(), glide, isActive(), isResumeEditor(), navItems

### Community 61 - "app/page.tsx"
Cohesion: 0.57
Nodes (4): HomePage(), metadata, serializeJsonLd(), webApplicationJsonLd()

### Community 62 - "capabilities.ts"
Cohesion: 0.38
Nodes (5): CapabilityInput, decideThree(), capable, ThreeDecision, ThreeSkipReason

### Community 63 - "cover-letter-panel.tsx"
Cohesion: 0.60
Nodes (4): canonicalJson(), computeInputHash(), MatchInputIdentity, base

### Community 64 - "hero-fallback.tsx"
Cohesion: 0.47
Nodes (4): HeroFallback(), requirements, step(), HeroVisual()

### Community 65 - "assemble.test.ts"
Cohesion: 0.20
Nodes (12): SuggestionsSuccess, suggestionFor(), buildSuggestions(), BuiltSuggestions, stableSuggestionId(), criteria, drafts, suggestAdjustmentsFixture (+4 more)

## Knowledge Gaps
- **354 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+349 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `suggestions-panel.tsx`, `ai`, `@base-ui/react`, `class-variance-authority`, `codemirror`, `@codemirror/commands`, `@codemirror/legacy-modes`, `@codemirror/state`, `@codemirror/view`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable`, `linkedom`, `lucide-react`, `mammoth`, `motion`, `@mozilla/readability`, `next`, `node-html-parser`, `@openrouter/ai-sdk-provider`, `react-dom`, `@react-three/drei`, `@react-three/fiber`, `texlyre-busytex`, `three`, `tw-animate-css`, `@unified-latex/unified-latex`, `zod`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `ToggleGroupItem()` connect `suggestions-panel.tsx` to `match-workspace.tsx`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `react` connect `suggestions-panel.tsx` to `dependencies`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _354 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resume/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06726606726606726 - nodes in this community are weakly interconnected._
- **Should `hosts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05280437756497948 - nodes in this community are weakly interconnected._
- **Should `match-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._