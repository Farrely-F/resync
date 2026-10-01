# Graph Report - resync  (2026-10-01)

## Corpus Check
- 268 files · ~153,060 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1569 nodes · 3973 edges · 115 communities (78 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a8b0917`
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
- messages.ts
- layout.ts
- escape.ts
- inflight.ts
- app/page.tsx
- capabilities.ts
- .key
- deriveJdTitle
- assemble.test.ts
- apple-icon.tsx
- FakeCacheStorage
- AGENTS.md
- ai
- @base-ui/react
- class-variance-authority
- FakeCacheStorage
- @codemirror/commands
- ai
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
- @openrouter/ai-sdk-provider
- fetchModelIdentity
- idb
- shadcn

## God Nodes (most connected - your core abstractions)
1. `Resume` - 49 edges
2. `ResumeRecord` - 43 edges
3. `getStorage()` - 31 edges
4. `MatchReport` - 29 edges
5. `Button()` - 28 edges
6. `Jd` - 27 edges
7. `StorageApi` - 26 edges
8. `AiFailureError` - 23 edges
9. `MatchCriterion` - 23 edges
10. `ResumeEditor()` - 22 edges

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

## Communities (115 total, 37 thin omitted)

### Community 0 - "resume/schema.ts"
Cohesion: 0.13
Nodes (12): JsonSchemaNode, modelSchemas, outreachFixture, outreachInstructions, OutreachMessage, outreachMessageSchema, outreachSpec, JdContent (+4 more)

### Community 1 - "hosts.ts"
Cohesion: 0.10
Nodes (24): Body, ExtractionFailure, ExtractionFailureReason, ExtractionOutcome, ExtractionSuccess, extractJd(), ExtractOptions, fail() (+16 more)

### Community 2 - "match-workspace.tsx"
Cohesion: 0.23
Nodes (10): PageLayoutControls(), paperItems, themeMarginMm(), Slider(), defaultLayout, isPaperSize(), marginRangeMm, PageLayout (+2 more)

### Community 3 - "danger-zone.tsx"
Cohesion: 0.05
Nodes (48): metadata, HomePage(), metadata, metadata, ReportPage(), metadata, metadata, metadata (+40 more)

### Community 4 - "guide-workspace.tsx"
Cohesion: 0.11
Nodes (19): metadata, GuideWorkspace(), linkControl, Stored, Progress(), GuideFacts, GuideProgress, GuideStepId (+11 more)

### Community 5 - "guided-tour.tsx"
Cohesion: 0.10
Nodes (30): Active, elementFor(), GuidedTour(), TourContext, TourControl, useTour(), Box, boxOf() (+22 more)

### Community 6 - "suggestions/service.ts"
Cohesion: 0.15
Nodes (28): parseForPlan(), ashbyPlan(), asRecord(), asString(), BoardPlan, classifyHost(), decodeHtmlEntities(), extractAshbyJob() (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, fake-indexeddb, devDependencies, eslint, eslint-config-next, fake-indexeddb, tailwindcss (+32 more)

### Community 8 - "exports-panel.tsx"
Cohesion: 0.08
Nodes (37): download(), ExportFeedback, ExportsPanel(), bullets(), dateRange(), exportFileName(), heading(), join() (+29 more)

### Community 9 - "Resume"
Cohesion: 0.18
Nodes (12): react, react, JdInputMode, JdSourceForm(), JdSourceFormProps, modeLabels, modes, ToggleGroup() (+4 more)

### Community 10 - "documents/route.ts"
Cohesion: 0.14
Nodes (19): errorResponse(), failureMessages, failureResponse(), GET(), POST(), requestSchema, errorResponse(), failureMessages (+11 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "suggestions/service.test.ts"
Cohesion: 0.25
Nodes (13): errorResponse(), Intake, POST(), intakeRequestSchema, IntakeSource, isIntakeError(), JdIntakeError, JdIntakeSuccess (+5 more)

### Community 13 - "storage/types.ts"
Cohesion: 0.19
Nodes (14): ResumePicker(), Loaded, ReportInputs(), ResumeLibrary(), ResumeList(), TailoredNotice(), baselinesFirst(), buildTailoredCopy() (+6 more)

### Community 14 - "validate.ts"
Cohesion: 0.13
Nodes (24): CompileEngine, applyEdits(), Edit, editsFor(), environmentNameFrom(), lineEndForInsertion(), lineStarts(), macroLength() (+16 more)

### Community 15 - "run.ts"
Cohesion: 0.16
Nodes (19): BackoffPolicy, defaultBackoffPolicy, exponentialDelayMs(), parseRetryAfter(), planRetry(), RetryPlan, withDeadline(), createModel() (+11 more)

### Community 16 - "targets.ts"
Cohesion: 0.18
Nodes (19): SuggestionCard(), collectEditableTargets(), describeTarget(), editableFields, EditableTarget, entriesOf(), FieldKind, fieldLabels (+11 more)

### Community 17 - "AiFailureError"
Cohesion: 0.15
Nodes (17): describeError(), describeOne(), isProviderError(), currentLogLevel(), cut(), isLogLevel(), levelRank, logEvent() (+9 more)

### Community 18 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 19 - "fixtures.ts"
Cohesion: 0.13
Nodes (19): SuggestionsSuccess, suggestionFor(), buildSuggestions(), BuiltSuggestions, stableSuggestionId(), criteria, drafts, suggestionVerificationFixture (+11 more)

### Community 20 - "failures.ts"
Cohesion: 0.28
Nodes (10): aiFailureKinds, AiFailureOptions, errorCauseChain(), failureFromApiCall(), isAbortError(), isTransportError(), retryableKinds, retryAfterSecondsFrom() (+2 more)

### Community 21 - "tex/generate.ts"
Cohesion: 0.20
Nodes (20): geometryOptions(), dateRange(), densities, Density, Escape, joinParts(), latexUrl(), orderedPackages() (+12 more)

### Community 22 - "settings-workspace.tsx"
Cohesion: 0.14
Nodes (19): AiFailureNotice(), AiFailureNoticeProps, copyByKind, FailureCopy, AnalyzeError, jdQueryId(), MatchWorkspace(), PostingView (+11 more)

### Community 23 - "assets.ts"
Cohesion: 0.16
Nodes (16): cacheStorage(), clearEngineCache(), contentTypeForAsset(), downloadEngineAssets(), EngineAsset, EngineAssetHashError, EngineAssetKind, engineAssets (+8 more)

### Community 24 - "match/types.ts"
Cohesion: 0.06
Nodes (70): AdjustedTag(), AdjustedTexts, AdjustmentHighlightProvider(), useIsAdjusted(), BasicsEditor(), CollapsibleSection(), BulletInput(), BulletList() (+62 more)

### Community 25 - "generate.test.ts"
Cohesion: 0.18
Nodes (14): ThemePicker(), RadioGroup(), RadioGroupItem(), renderResume(), renderResumeReport(), AllowedPackage, allowedPackages, forbiddenPackages (+6 more)

### Community 26 - "MatchReport"
Cohesion: 0.11
Nodes (4): SettingsWorkspace(), DocumentRecord, StorageApi, AcceptSuggestionDeps

### Community 27 - "engine.ts"
Cohesion: 0.21
Nodes (12): errorResponse(), failureMessages, failureResponse(), POST(), requestSchema, runStructured(), DocumentFailure, writeDocument() (+4 more)

### Community 28 - "match/service.test.ts"
Cohesion: 0.08
Nodes (33): AtsInput, bodyLength(), columnCheck(), contactCheck(), countMatches(), lengthCheck(), runAtsChecks(), sectionCheck() (+25 more)

### Community 29 - "formatBytes"
Cohesion: 0.17
Nodes (18): ConfirmationEvent, ConfirmationState, ConfirmationStep, DeleteTarget, idleConfirmation, isConfirming(), phraseSatisfied(), requiresPhrase() (+10 more)

### Community 30 - "debounced-writer.ts"
Cohesion: 0.12
Nodes (20): editorTheme, latexLanguage, LatexSourceEditor, LatexSourceEditorSurface(), ManualModeBadge(), EditorState, saveCopy, Alert() (+12 more)

### Community 31 - "seo.ts"
Cohesion: 0.15
Nodes (16): ApplyRefusal, applyRefusalMessages, ApplyResult, applySuggestion(), AcceptResult, EnsureCopyResult, generateGroundedSuggestions(), generated() (+8 more)

### Community 32 - "resume-editor.tsx"
Cohesion: 0.31
Nodes (6): download(), Feedback, Pending, AddResumeForm(), Label(), Textarea()

### Community 33 - "how-it-works.tsx"
Cohesion: 0.20
Nodes (16): collectLog(), CompileOutcome, CompileRequest, compileResumeTex(), createEngineTool(), createRunner(), disposeRunner(), EngineId (+8 more)

### Community 34 - "add-resume-form.tsx"
Cohesion: 0.23
Nodes (12): assessExtraction(), extractDocxText(), ExtractionFailure, ExtractionFailureReason, ExtractionResult, ExtractionSuccess, extractPastedText(), extractPdfText() (+4 more)

### Community 35 - "strict-schema.test.ts"
Cohesion: 0.19
Nodes (9): extractJdFixture, jdSchema, nullableString, buildJdPrompt(), extractJdInstructions, structureJd(), baseInput, liveEnv (+1 more)

### Community 36 - "suggestions/route.ts"
Cohesion: 0.60
Nodes (5): failureFrom(), isDropped(), isSuggestion(), messageFrom(), requestSuggestions()

### Community 37 - "site.ts"
Cohesion: 0.07
Nodes (27): display, geistMono, geistSans, inter, metadata, RootLayout(), viewport, alt (+19 more)

### Community 38 - "run.test.ts"
Cohesion: 0.14
Nodes (8): MissingFixtureError, crossProviderEnv, fallbackEnv, liveCall, liveEnv, mockEnv, quickPolicy, schema

### Community 39 - "button.tsx"
Cohesion: 0.36
Nodes (6): CriterionRow(), formatPoints(), formatScore(), kindLabels, ReportView(), verdictLabels

### Community 40 - "registry.ts"
Cohesion: 0.22
Nodes (11): metadata, CoverLetterPanel(), Feedback, download(), Feedback, InterviewPrepPanel(), Pending, OutreachPanel() (+3 more)

### Community 41 - "env.ts"
Cohesion: 0.26
Nodes (11): aiModes, EnvError, isProvider(), itemList(), nonEmpty(), parseEnv(), parseTarget(), ProviderDefaults (+3 more)

### Community 42 - "fetch-tex-assets.mjs"
Cohesion: 0.22
Nodes (9): assets, check(), checkOnly, destination, download(), existingSize(), force, problems (+1 more)

### Community 43 - "verify-themes.mjs"
Cohesion: 0.17
Nodes (9): engineImagePath, image, lines, problems, repoRoot, resolve(), resume, styFiles (+1 more)

### Community 44 - "layout.tsx"
Cohesion: 0.15
Nodes (7): createDebouncedWriter(), DebouncedWriter, systemTimers, Timers, DebouncedSave, SaveStatus, useDebouncedSave()

### Community 45 - "interview-prep-panel.tsx"
Cohesion: 0.36
Nodes (7): DocumentStatus, writeDocumentRecord(), WriteOutcome, isAiFailureKind(), DocumentResponse, isDocumentFailure(), documentId()

### Community 46 - "use-compile-engine.ts"
Cohesion: 0.19
Nodes (12): analyzeMatchEvidence(), analyzeMatchInstructions, buildAnalyzePrompt(), CriterionEvidence, criterionEvidenceSchema, MatchEvidence, ModelCriterion, input (+4 more)

### Community 47 - "outreach-panel.tsx"
Cohesion: 0.29
Nodes (6): JdSummary(), JdSummaryProps, sourceLabels, ExtractionResult, JdSource, JobHints

### Community 49 - "storage/index.ts"
Cohesion: 0.30
Nodes (5): ConsentRecord, ConsentStore, parse(), readConsent(), revokeConsent()

### Community 50 - "match/api.ts"
Cohesion: 0.26
Nodes (9): CompiledPdf, gatePhase(), Phase, useCompileEngine(), DownloadProgress, AutoPreviewInput, shouldAutoCompile(), ready (+1 more)

### Community 51 - "resync"
Cohesion: 0.20
Nodes (9): Architecture notes, Guided tours, How AI calls are wired, Licence, Logging, Requirements, resync, Running it (+1 more)

### Community 52 - "opengraph-image.tsx"
Cohesion: 0.33
Nodes (6): clearDraft(), draftKeyFor(), DraftStorage, preferNewerRecord(), readDraft(), writeDraft()

### Community 53 - ".key"
Cohesion: 0.18
Nodes (16): dropReasonLabels, GeneratedUnder, kindLabels, SuggestionsPanel(), verdictLabels, browserDecisionStore(), clearDecision(), DecisionEntry (+8 more)

### Community 54 - "suggestions-panel.tsx"
Cohesion: 0.17
Nodes (14): errorResponse(), ParseResumeInput, POST(), parseResumeMock, validateParseResumeBody(), newRequestId(), parseResumeContentFixture, parseResumeFixture (+6 more)

### Community 55 - "ResumeEditor"
Cohesion: 0.17
Nodes (23): AiTask, DocumentRequestBody, DocumentInput, DocumentKind, AppEnv, Jd, StructureJdInput, AnalyzeMatchEvidenceInput (+15 more)

### Community 56 - "messages.ts"
Cohesion: 0.31
Nodes (9): ClearAllFacts, count(), DeleteKind, DeletionFacts, dependentDocuments(), describeClearAll(), describeDeletion(), descriptions (+1 more)

### Community 57 - "layout.ts"
Cohesion: 0.16
Nodes (17): Stored, WorkspaceState, Loaded, Loaded, ReportAdjustments(), SuggestionCardProps, MatchReport, createStorage() (+9 more)

### Community 58 - "escape.ts"
Cohesion: 0.33
Nodes (7): asciiEscapes, combiningAccents, escapeLatex(), fromDecomposition(), hostile, unicodeReplacements, unrepresentableCharacters()

### Community 60 - "inflight.ts"
Cohesion: 0.44
Nodes (8): ResumeEditor(), resolveLayout(), applyFieldEdit(), applyHandEdit(), documentSource(), FieldEditOutcome, regenerateFromData(), renderResumeForThemeId()

### Community 61 - "app/page.tsx"
Cohesion: 0.33
Nodes (7): EngineCacheCard(), PreviewPanel, PreviewPanelSurface(), StoragePanel(), StoreRow(), Separator(), formatBytes()

### Community 62 - "capabilities.ts"
Cohesion: 0.38
Nodes (5): CapabilityInput, decideThree(), capable, ThreeDecision, ThreeSkipReason

### Community 63 - ".key"
Cohesion: 0.24
Nodes (7): memoryStorage(), comparable(), memoryStore(), FakeCache, stubPinnedDigest(), memoryStore(), memoryStore()

### Community 64 - "deriveJdTitle"
Cohesion: 0.50
Nodes (6): matches(), meta(), monogram(), PostingShelf(), Input(), deriveJdTitle()

### Community 71 - "@base-ui/react"
Cohesion: 0.46
Nodes (4): useBaselineChanges(), changesAgainstBaseline(), ResumeChange, ResumeAdjustment

### Community 76 - "@codemirror/state"
Cohesion: 0.22
Nodes (9): @ai-sdk/fireworks, class-variance-authority, codemirror, dependencies, @ai-sdk/fireworks, class-variance-authority, codemirror, texlyre-busytex (+1 more)

### Community 79 - "@dnd-kit/modifiers"
Cohesion: 0.39
Nodes (5): AdjustmentsList(), AdjustmentView, DiffPart, diffWords(), words()

### Community 95 - "cover-letter.ts"
Cohesion: 0.12
Nodes (12): CoverLetter, coverLetterFixture, coverLetterInstructions, coverLetterSchema, coverLetterSpec, interviewPrepFixture, interviewPrepInstructions, interviewPrepSpec (+4 more)

### Community 96 - "texlyre-busytex"
Cohesion: 0.13
Nodes (16): record(), accountStorage(), jsonBytes(), sizeOf(), StorageBreakdown, StoreSize, jdRecord(), resumeRecord() (+8 more)

### Community 109 - "inflight.ts"
Cohesion: 0.29
Nodes (3): createInFlightCollapser(), InFlightCollapser, inFlightModelRequests

### Community 113 - "fetchModelIdentity"
Cohesion: 0.29
Nodes (10): DocumentSuccess, AiMode, AiProvider, AnalyzeResponse, AnalyzeSuccess, failureFrom(), fetchModelIdentity(), messageFrom() (+2 more)

## Knowledge Gaps
- **360 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+355 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `@codemirror/state` to `devDependencies`, `Resume`, `draft-journal.test.ts`, `assemble.test.ts`, `FakeCacheStorage`, `ai`, `class-variance-authority`, `@codemirror/commands`, `ai`, `@codemirror/view`, `@dnd-kit/core`, `@dnd-kit/sortable`, `basics-editor.tsx`, `linkedom`, `lucide-react`, `mammoth`, `motion`, `@mozilla/readability`, `next`, `node-html-parser`, `@openrouter/ai-sdk-provider`, `react-dom`, `@react-three/drei`, `@react-three/fiber`, `three`, `tw-animate-css`, `@unified-latex/unified-latex`, `zod`, `collapsible-section.tsx`, `@openrouter/ai-sdk-provider`, `idb`, `shadcn`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `react` connect `Resume` to `@codemirror/state`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _360 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `resume/schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Should `hosts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._
- **Should `danger-zone.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053613053613053616 - nodes in this community are weakly interconnected._
- **Should `guide-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10588235294117647 - nodes in this community are weakly interconnected._