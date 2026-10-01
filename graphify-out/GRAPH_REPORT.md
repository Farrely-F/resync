# Graph Report - resync  (2026-10-01)

## Corpus Check
- 260 files · ~146,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1536 nodes · 3877 edges · 120 communities (82 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.68)
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
- basics-editor.tsx
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
- cover-letter.ts
- texlyre-busytex
- three
- tw-animate-css
- @unified-latex/unified-latex
- zod
- postcss.config.mjs
- raw.d.ts
- inflight.ts
- collapsible-section.tsx
- failure-notice.tsx
- jd-summary.tsx
- fetchModelIdentity
- @ai-sdk/fireworks
- cn
- @codemirror/language
- @codemirror/state
- idb
- shadcn

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
- `sleep()` --indirect_call--> `resolve()`  [INFERRED]
  src/lib/ai/run.test.ts → scripts/verify-themes.mjs
- `collectEditableTargets()` --indirect_call--> `field()`  [INFERRED]
  src/lib/suggestions/targets.ts → src/components/editor/section-specs.ts
- `ToggleGroupItem()` --references--> `react`  [EXTRACTED]
  src/components/ui/toggle-group.tsx → package.json
- `RootLayout()` --calls--> `summariseAiMode()`  [EXTRACTED]
  src/app/layout.tsx → src/lib/env.ts
- `AiFailureNoticeProps` --references--> `AiFailureKind`  [EXTRACTED]
  src/components/ai/failure-notice.tsx → src/lib/ai/failures.ts

## Import Cycles
- None detected.

## Communities (120 total, 38 thin omitted)

### Community 0 - "resume/schema.ts"
Cohesion: 0.11
Nodes (22): field(), FieldSpec, SectionSpec, TextInputType, Basics, basicsSchema, CertificateEntry, certificateSchema (+14 more)

### Community 1 - "hosts.ts"
Cohesion: 0.07
Nodes (54): Body, ExtractionFailure, ExtractionFailureReason, ExtractionOutcome, ExtractionResult, ExtractionSuccess, extractJd(), ExtractOptions (+46 more)

### Community 2 - "match-workspace.tsx"
Cohesion: 0.15
Nodes (13): ResumePicker(), ResumePickerProps, AnalyzeError, jdQueryId(), MatchWorkspace(), viewHints(), viewSource(), writeJdQuery() (+5 more)

### Community 3 - "danger-zone.tsx"
Cohesion: 0.06
Nodes (38): metadata, metadata, ReportPage(), metadata, metadata, metadata, metadata, CoverLetterPanel() (+30 more)

### Community 4 - "guide-workspace.tsx"
Cohesion: 0.07
Nodes (30): metadata, MockModeNotice(), Feedback, GuideWorkspace(), linkControl, Stored, ManualModeBadge(), Alert() (+22 more)

### Community 5 - "guided-tour.tsx"
Cohesion: 0.10
Nodes (30): Active, elementFor(), GuidedTour(), TourContext, TourControl, useTour(), Box, boxOf() (+22 more)

### Community 6 - "suggestions/service.ts"
Cohesion: 0.10
Nodes (33): AiTask, AppEnv, StructureJdInput, AnalyzeMatchEvidenceInput, SuggestionsSuccess, ApplyResult, suggestionFor(), buildSuggestions() (+25 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, fake-indexeddb, devDependencies, eslint, eslint-config-next, fake-indexeddb, tailwindcss (+32 more)

### Community 8 - "exports-panel.tsx"
Cohesion: 0.19
Nodes (21): download(), ExportFeedback, ExportsPanel(), bullets(), dateRange(), exportFileName(), heading(), join() (+13 more)

### Community 9 - "Resume"
Cohesion: 0.14
Nodes (16): errorResponse(), failureMessages, failureResponse(), POST(), requestSchema, DocumentFailure, DocumentResponse, DocumentSuccess (+8 more)

### Community 10 - "documents/route.ts"
Cohesion: 0.14
Nodes (21): errorResponse(), failureMessages, failureResponse(), GET(), POST(), requestSchema, errorResponse(), failureMessages (+13 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "suggestions/service.test.ts"
Cohesion: 0.19
Nodes (12): analyzeMatchEvidence(), analyzeMatchInstructions, buildAnalyzePrompt(), CriterionEvidence, criterionEvidenceSchema, MatchEvidence, ModelCriterion, input (+4 more)

### Community 13 - "storage/types.ts"
Cohesion: 0.22
Nodes (14): Loaded, ReportInputs(), ResumeLibrary(), ResumeList(), ReportAdjustments(), TailoredNotice(), deriveJdTitle(), buildTailoredCopy() (+6 more)

### Community 14 - "validate.ts"
Cohesion: 0.12
Nodes (24): CompileEngine, applyEdits(), Edit, editsFor(), environmentNameFrom(), lineEndForInsertion(), lineStarts(), macroLength() (+16 more)

### Community 15 - "run.ts"
Cohesion: 0.15
Nodes (19): BackoffPolicy, defaultBackoffPolicy, exponentialDelayMs(), parseRetryAfter(), planRetry(), RetryPlan, withDeadline(), AiFailureError (+11 more)

### Community 16 - "targets.ts"
Cohesion: 0.15
Nodes (22): SuggestionCard(), buildSuggestionsPrompt(), suggestAdjustments(), suggestAdjustmentsInstructions, collectEditableTargets(), describeTarget(), editableFields, EditableTarget (+14 more)

### Community 17 - "AiFailureError"
Cohesion: 0.08
Nodes (32): errorResponse(), ParseResumeInput, POST(), parseResumeMock, validateParseResumeBody(), memoryStorage(), errorCauseChain(), describeError() (+24 more)

### Community 18 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 19 - "fixtures.ts"
Cohesion: 0.33
Nodes (11): DocumentRequestBody, DocumentInput, Jd, AnalyzeRequestBody, AnalyzeSuccess, MatchCriterion, Resume, SuggestionsRequestBody (+3 more)

### Community 20 - "failures.ts"
Cohesion: 0.21
Nodes (14): DocumentStatus, useDocument(), writeDocumentRecord(), WriteOutcome, AiFailureOptions, failureFromApiCall(), isAbortError(), isTransportError() (+6 more)

### Community 21 - "tex/generate.ts"
Cohesion: 0.20
Nodes (20): geometryOptions(), dateRange(), densities, Density, Escape, joinParts(), latexUrl(), orderedPackages() (+12 more)

### Community 22 - "settings-workspace.tsx"
Cohesion: 0.13
Nodes (13): accountStorage(), sizeOf(), StorageBreakdown, StoreSize, jdRecord(), SettingsWorkspace(), Stored, WorkspaceState (+5 more)

### Community 23 - "assets.ts"
Cohesion: 0.18
Nodes (13): cacheStorage(), clearEngineCache(), contentTypeForAsset(), downloadEngineAssets(), DownloadProgress, EngineAsset, EngineAssetKind, engineAssets (+5 more)

### Community 24 - "match/types.ts"
Cohesion: 0.27
Nodes (18): addEntry(), listEntries(), moveBullet(), moveEntry(), moveItem(), normalizeResume(), removeEntry(), reorderSection() (+10 more)

### Community 25 - "generate.test.ts"
Cohesion: 0.18
Nodes (14): ThemePicker(), RadioGroup(), RadioGroupItem(), renderResume(), renderResumeReport(), AllowedPackage, allowedPackages, forbiddenPackages (+6 more)

### Community 27 - "engine.ts"
Cohesion: 0.22
Nodes (15): collectLog(), CompileOutcome, CompileRequest, compileResumeTex(), createEngineTool(), createRunner(), EngineId, getRunner() (+7 more)

### Community 28 - "match/service.test.ts"
Cohesion: 0.13
Nodes (21): canonicalJson(), computeInputHash(), MatchInputIdentity, base, criterionWeights, roundScore(), RubricResult, RubricRow (+13 more)

### Community 29 - "formatBytes"
Cohesion: 0.33
Nodes (5): ConsentStore, grantConsent(), parse(), readConsent(), revokeConsent()

### Community 30 - "debounced-writer.ts"
Cohesion: 0.15
Nodes (7): createDebouncedWriter(), DebouncedWriter, systemTimers, Timers, DebouncedSave, SaveStatus, useDebouncedSave()

### Community 31 - "seo.ts"
Cohesion: 0.26
Nodes (10): addResumeFromText(), buildResumeRecord(), parseResumeErrorMessage(), ParseResumeResponse, requestParseResume(), sectionCounts(), sectionLabels, sectionsWithContent() (+2 more)

### Community 32 - "resume-editor.tsx"
Cohesion: 0.17
Nodes (19): editorTheme, latexLanguage, LatexSourceEditor, LatexSourceEditorSurface(), EditorState, ResumeEditor(), saveCopy, Tabs() (+11 more)

### Community 33 - "how-it-works.tsx"
Cohesion: 0.18
Nodes (13): HowItWorks(), neverChanges(), onClient(), onServer(), steps, useHydrated(), AddResumePreview(), EditPreview() (+5 more)

### Community 34 - "add-resume-form.tsx"
Cohesion: 0.23
Nodes (12): assessExtraction(), extractDocxText(), ExtractionFailure, ExtractionFailureReason, ExtractionResult, ExtractionSuccess, extractPastedText(), extractPdfText() (+4 more)

### Community 35 - "strict-schema.test.ts"
Cohesion: 0.13
Nodes (16): comparable(), JsonSchemaNode, modelSchemas, extractJdFixture, JdContent, jdContentSchema, jdSchema, nullableString (+8 more)

### Community 36 - "suggestions/route.ts"
Cohesion: 0.29
Nodes (7): isAiFailureKind(), failureFrom(), isDropped(), isSuggestion(), messageFrom(), requestSuggestions(), SuggestionsFailure

### Community 37 - "site.ts"
Cohesion: 0.24
Nodes (8): robots(), frequencies, priorities, sitemap(), brand, indexablePaths, privatePaths, resolveSiteUrl()

### Community 38 - "run.test.ts"
Cohesion: 0.14
Nodes (8): MissingFixtureError, crossProviderEnv, fallbackEnv, liveCall, liveEnv, mockEnv, quickPolicy, schema

### Community 39 - "button.tsx"
Cohesion: 0.29
Nodes (7): CriterionRow(), formatPoints(), formatScore(), kindLabels, ReportView(), verdictLabels, CriterionKind

### Community 40 - "registry.ts"
Cohesion: 0.15
Nodes (13): download(), Feedback, OutreachPanel(), Pending, AddResumeForm(), Label(), Textarea(), outreachFixture (+5 more)

### Community 41 - "env.ts"
Cohesion: 0.24
Nodes (12): aiModes, AiProvider, EnvError, isProvider(), itemList(), nonEmpty(), parseEnv(), parseTarget() (+4 more)

### Community 42 - "fetch-tex-assets.mjs"
Cohesion: 0.22
Nodes (9): assets, check(), checkOnly, destination, download(), existingSize(), force, problems (+1 more)

### Community 43 - "verify-themes.mjs"
Cohesion: 0.17
Nodes (9): engineImagePath, image, lines, problems, repoRoot, resolve(), resume, styFiles (+1 more)

### Community 44 - "layout.tsx"
Cohesion: 0.20
Nodes (9): display, geistMono, geistSans, inter, metadata, RootLayout(), viewport, SiteFooter() (+1 more)

### Community 45 - "interview-prep-panel.tsx"
Cohesion: 0.16
Nodes (20): jsonBytes(), ConfirmationEvent, ConfirmationState, ConfirmationStep, DeleteTarget, idleConfirmation, isConfirming(), phraseSatisfied() (+12 more)

### Community 46 - "use-compile-engine.ts"
Cohesion: 0.29
Nodes (8): CompiledPdf, gatePhase(), Phase, useCompileEngine(), engineCacheStatus, AutoPreviewInput, shouldAutoCompile(), ready

### Community 47 - "outreach-panel.tsx"
Cohesion: 0.26
Nodes (12): AtsInput, bodyLength(), columnCheck(), contactCheck(), countMatches(), lengthCheck(), runAtsChecks(), sectionCheck() (+4 more)

### Community 48 - "draft-journal.test.ts"
Cohesion: 0.16
Nodes (12): clearDraft(), draftKeyFor(), DraftStorage, preferNewerRecord(), readDraft(), record(), writeDraft(), resumeRecord() (+4 more)

### Community 49 - "storage/index.ts"
Cohesion: 0.24
Nodes (10): EngineCacheCard(), PreviewPanel, PreviewPanelSurface(), StoragePanel(), StoreRow(), Separator(), engineAssetTotalBytes, formatBytes() (+2 more)

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
Cohesion: 0.12
Nodes (22): dropReasonLabels, GeneratedUnder, kindLabels, SuggestionsPanel(), verdictLabels, ApplyRefusal, applyRefusalMessages, applySuggestion() (+14 more)

### Community 54 - "suggestions-panel.tsx"
Cohesion: 0.16
Nodes (13): react, react, JdInputMode, JdSourceForm(), JdSourceFormProps, modeLabels, modes, Input() (+5 more)

### Community 55 - "ResumeEditor"
Cohesion: 0.23
Nodes (10): PageLayoutControls(), paperItems, themeMarginMm(), Slider(), defaultLayout, isPaperSize(), marginRangeMm, PageLayout (+2 more)

### Community 56 - "dependencies"
Cohesion: 0.22
Nodes (9): ai, class-variance-authority, codemirror, dependencies, ai, class-variance-authority, codemirror, texlyre-busytex (+1 more)

### Community 57 - "layout.ts"
Cohesion: 0.23
Nodes (10): Loaded, Loaded, SuggestionCardProps, MatchReport, ResyncSchema, JdRecord, ResumeRecord, Freshness (+2 more)

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
Cohesion: 0.24
Nodes (14): errorResponse(), Intake, POST(), intakeRequestSchema, IntakeSource, isIntakeError(), JdIntakeError, JdIntakeResponse (+6 more)

### Community 64 - "hero-fallback.tsx"
Cohesion: 0.47
Nodes (4): HeroFallback(), requirements, step(), HeroVisual()

### Community 65 - "assemble.test.ts"
Cohesion: 0.21
Nodes (10): parseResumeContentFixture, parseResumeFixture, ResumeContent, resumeContentSchema, buildParseResumePrompt(), parseResumeInstructions, defaultSections, criteria (+2 more)

### Community 70 - "ai"
Cohesion: 0.26
Nodes (11): BulletList(), EntryEditor(), addBullet(), removeBullet(), setBullet(), BulletSpec, readList(), readText() (+3 more)

### Community 73 - "codemirror"
Cohesion: 0.38
Nodes (7): browserUsageStore(), KeyValueStore, localDay(), ModelRequestUsage, parseUsage(), readModelRequests(), recordModelRequest()

### Community 82 - "basics-editor.tsx"
Cohesion: 0.44
Nodes (8): BasicsEditor(), IconButton(), TextField(), addProfile(), removeProfile(), replaceProfile(), setBasics(), setLocation()

### Community 95 - "cover-letter.ts"
Cohesion: 0.20
Nodes (6): CoverLetter, coverLetterFixture, coverLetterInstructions, coverLetterSchema, coverLetterSpec, DocumentSpec

### Community 96 - "texlyre-busytex"
Cohesion: 0.27
Nodes (6): emptyJd(), createStorage(), ResyncDatabase, upgrade(), jdRecord(), storage

### Community 109 - "inflight.ts"
Cohesion: 0.29
Nodes (3): createInFlightCollapser(), InFlightCollapser, inFlightModelRequests

### Community 110 - "collapsible-section.tsx"
Cohesion: 0.53
Nodes (4): CollapsibleSection(), Collapsible(), CollapsibleContent(), CollapsibleTrigger()

### Community 111 - "failure-notice.tsx"
Cohesion: 0.40
Nodes (4): AiFailureNotice(), AiFailureNoticeProps, copyByKind, FailureCopy

### Community 112 - "jd-summary.tsx"
Cohesion: 0.40
Nodes (3): JdSummary(), JdSummaryProps, sourceLabels

### Community 113 - "fetchModelIdentity"
Cohesion: 0.50
Nodes (5): AnalyzeResponse, failureFrom(), fetchModelIdentity(), messageFrom(), requestEvidence()

## Knowledge Gaps
- **355 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `suggestions-panel.tsx`, `@base-ui/react`, `class-variance-authority`, `@codemirror/commands`, `@codemirror/legacy-modes`, `@codemirror/state`, `@codemirror/view`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable`, `linkedom`, `lucide-react`, `mammoth`, `motion`, `@mozilla/readability`, `next`, `node-html-parser`, `@openrouter/ai-sdk-provider`, `react-dom`, `@react-three/drei`, `@react-three/fiber`, `three`, `tw-animate-css`, `@unified-latex/unified-latex`, `zod`, `@ai-sdk/fireworks`, `cn`, `@codemirror/language`, `@codemirror/state`, `idb`, `shadcn`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `react` connect `suggestions-panel.tsx` to `dependencies`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resume/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11231884057971014 - nodes in this community are weakly interconnected._
- **Should `hosts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07192460317460317 - nodes in this community are weakly interconnected._
- **Should `danger-zone.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `guide-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06787330316742081 - nodes in this community are weakly interconnected._