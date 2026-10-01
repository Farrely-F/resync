# Graph Report - resync  (2026-10-01)

## Corpus Check
- 283 files · ~150,277 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1676 nodes · 4309 edges · 113 communities (75 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.69)
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
- fetchModelIdentity
- idb
- shadcn

## God Nodes (most connected - your core abstractions)
1. `Resume` - 54 edges
2. `ResumeRecord` - 46 edges
3. `getStorage()` - 34 edges
4. `Button()` - 31 edges
5. `Jd` - 31 edges
6. `MatchReport` - 31 edges
7. `MatchCriterion` - 28 edges
8. `AiFailureError` - 27 edges
9. `StorageApi` - 26 edges
10. `JdRecord` - 24 edges

## Surprising Connections (you probably didn't know these)
- `sleep()` --indirect_call--> `resolve()`  [INFERRED]
  src/lib/ai/run.test.ts → scripts/verify-themes.mjs
- `ToggleGroupItem()` --references--> `react`  [EXTRACTED]
  src/components/ui/toggle-group.tsx → package.json
- `AiFailureNoticeProps` --references--> `AiFailureKind`  [EXTRACTED]
  src/components/ai/failure-notice.tsx → src/lib/ai/failures.ts
- `collectEditableTargets()` --indirect_call--> `field()`  [INFERRED]
  src/lib/suggestions/targets.ts → src/components/editor/section-specs.ts
- `ResumePickerProps` --references--> `ResumeRecord`  [EXTRACTED]
  src/components/jd/resume-picker.tsx → src/lib/storage/types.ts

## Import Cycles
- None detected.

## Communities (113 total, 38 thin omitted)

### Community 0 - "resume/schema.ts"
Cohesion: 0.18
Nodes (13): HowItWorks(), neverChanges(), onClient(), onServer(), steps, useHydrated(), AddResumePreview(), EditPreview() (+5 more)

### Community 1 - "hosts.ts"
Cohesion: 0.05
Nodes (70): errorResponse(), Intake, POST(), JdSummaryProps, sourceLabels, intakeRequestSchema, IntakeSource, isIntakeError() (+62 more)

### Community 2 - "match-workspace.tsx"
Cohesion: 0.13
Nodes (15): ResumePickerProps, PageLayoutControls(), paperItems, themeMarginMm(), Label(), SelectContent(), SelectItem(), SelectTrigger() (+7 more)

### Community 3 - "danger-zone.tsx"
Cohesion: 0.07
Nodes (48): AiFailureNotice(), AiFailureNoticeProps, copyByKind, FailureCopy, ConfirmationEvent, ConfirmationState, ConfirmationStep, DeleteTarget (+40 more)

### Community 4 - "guide-workspace.tsx"
Cohesion: 0.12
Nodes (18): GuideWorkspace(), linkControl, Stored, Progress(), GuideFacts, GuideProgress, GuideStepId, guideStepIds (+10 more)

### Community 5 - "guided-tour.tsx"
Cohesion: 0.06
Nodes (39): metadata, metadata, metadata, metadata, metadata, metadata, Active, elementFor() (+31 more)

### Community 6 - "suggestions/service.ts"
Cohesion: 0.27
Nodes (8): metadata, ReportAdjustments(), canonicalJson(), computeInputHash(), Freshness, reportFreshness(), jdRecord, report()

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (40): eslint, eslint-config-next, fake-indexeddb, devDependencies, eslint, eslint-config-next, fake-indexeddb, tailwindcss (+32 more)

### Community 8 - "exports-panel.tsx"
Cohesion: 0.16
Nodes (25): ReportPage(), PreviewPanelSurface(), download(), ExportFeedback, ExportsPanel(), bullets(), dateRange(), exportFileName() (+17 more)

### Community 9 - "Resume"
Cohesion: 0.31
Nodes (7): react, react, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 10 - "documents/route.ts"
Cohesion: 0.10
Nodes (39): errorResponse(), failureMessages, failureResponse(), GET(), POST(), requestSchema, errorResponse(), failureMessages (+31 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 12 - "suggestions/service.test.ts"
Cohesion: 0.16
Nodes (13): failureFrom(), PracticeFailure, PracticeSuccess, requestGrade(), buildGradePrompt(), Delivery, deliveryValues, gradeAnswer() (+5 more)

### Community 13 - "storage/types.ts"
Cohesion: 0.13
Nodes (20): Loaded, ReportInputs(), useEvidence(), ResumeList(), TailoredNotice(), useBaselineChanges(), InterviewQuestion, ProseDocument (+12 more)

### Community 14 - "validate.ts"
Cohesion: 0.12
Nodes (24): CompileEngine, applyEdits(), Edit, editsFor(), environmentNameFrom(), lineEndForInsertion(), lineStarts(), macroLength() (+16 more)

### Community 15 - "run.ts"
Cohesion: 0.15
Nodes (20): BackoffPolicy, defaultBackoffPolicy, exponentialDelayMs(), parseRetryAfter(), planRetry(), RetryPlan, withDeadline(), AiFailureError (+12 more)

### Community 16 - "targets.ts"
Cohesion: 0.19
Nodes (18): SuggestionCard(), collectEditableTargets(), describeTarget(), editableFields, EditableTarget, entriesOf(), FieldKind, fieldLabels (+10 more)

### Community 17 - "AiFailureError"
Cohesion: 0.11
Nodes (27): errorResponse(), ParseResumeInput, POST(), parseResumeMock, validateParseResumeBody(), describeError(), describeOne(), isProviderError() (+19 more)

### Community 18 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 19 - "fixtures.ts"
Cohesion: 0.17
Nodes (18): SuggestionsSuccess, BuildSuggestionsInput, BuiltSuggestions, suggestionVerificationFixture, SuggestionDraft, SuggestionsDeps, DroppedSuggestion, Suggestion (+10 more)

### Community 20 - "failures.ts"
Cohesion: 0.13
Nodes (24): CoverLetterPanel(), DocumentStatus, useDocument(), writeDocumentRecord(), WriteOutcome, AiFailureOptions, errorCauseChain(), failureFromApiCall() (+16 more)

### Community 21 - "tex/generate.ts"
Cohesion: 0.19
Nodes (21): defaultLayout, geometryOptions(), dateRange(), densities, Density, Escape, joinParts(), latexUrl() (+13 more)

### Community 22 - "settings-workspace.tsx"
Cohesion: 0.06
Nodes (51): Conversation(), ConversationContent(), ConversationContentProps, ConversationDownload(), ConversationDownloadProps, ConversationEmptyStateProps, ConversationProps, ConversationScrollButton() (+43 more)

### Community 23 - "assets.ts"
Cohesion: 0.05
Nodes (55): EngineCacheCard(), CompiledPdf, gatePhase(), Phase, useCompileEngine(), comparable(), memoryStore(), cacheStorage() (+47 more)

### Community 24 - "match/types.ts"
Cohesion: 0.05
Nodes (80): AdjustedTag(), AdjustedTexts, AdjustmentHighlightProvider(), useAdjustedSource(), BasicsEditor(), CollapsibleSection(), BulletInput(), BulletList() (+72 more)

### Community 25 - "generate.test.ts"
Cohesion: 0.18
Nodes (14): ThemePicker(), RadioGroup(), RadioGroupItem(), renderResume(), renderResumeReport(), AllowedPackage, allowedPackages, forbiddenPackages (+6 more)

### Community 27 - "engine.ts"
Cohesion: 0.40
Nodes (5): DocumentFailure, DocumentResponse, DocumentSuccess, WrittenDocument, DocumentContent

### Community 28 - "match/service.test.ts"
Cohesion: 0.20
Nodes (12): criterionWeights, roundScore(), RubricRow, scoreCriteria(), criterion(), verdictCredit, analyzeMatch(), AnalyzeMatchDeps (+4 more)

### Community 29 - "formatBytes"
Cohesion: 0.26
Nodes (10): addResumeFromText(), buildResumeRecord(), parseResumeErrorMessage(), ParseResumeResponse, requestParseResume(), sectionCounts(), sectionLabels, sectionsWithContent() (+2 more)

### Community 30 - "debounced-writer.ts"
Cohesion: 0.15
Nodes (21): FieldEditConfirm(), editorTheme, latexLanguage, LatexSourceEditor, LatexSourceEditorSurface(), RegenerateConfirm(), EditorState, ResumeEditor() (+13 more)

### Community 31 - "seo.ts"
Cohesion: 0.13
Nodes (18): ApplyRefusal, applyRefusalMessages, ApplyResult, applySuggestion(), AcceptResult, acceptSuggestion(), attestRefusalMessages, AttestResult (+10 more)

### Community 32 - "resume-editor.tsx"
Cohesion: 0.21
Nodes (8): JdInputMode, JdSourceForm(), JdSourceFormProps, modeLabels, modes, AddResumeForm(), Input(), Textarea()

### Community 33 - "how-it-works.tsx"
Cohesion: 0.20
Nodes (9): display, geistMono, geistSans, inter, metadata, viewport, MockModeNotice(), SiteFooter() (+1 more)

### Community 34 - "add-resume-form.tsx"
Cohesion: 0.23
Nodes (12): assessExtraction(), extractDocxText(), ExtractionFailure, ExtractionFailureReason, ExtractionResult, ExtractionSuccess, extractPastedText(), extractPdfText() (+4 more)

### Community 35 - "strict-schema.test.ts"
Cohesion: 0.31
Nodes (6): buildJdPrompt(), extractJdInstructions, structureJd(), baseInput, liveEnv, mockEnv

### Community 36 - "suggestions/route.ts"
Cohesion: 0.22
Nodes (4): alt, facts, requirements, size

### Community 37 - "site.ts"
Cohesion: 0.24
Nodes (8): robots(), frequencies, priorities, sitemap(), brand, indexablePaths, privatePaths, resolveSiteUrl()

### Community 38 - "run.test.ts"
Cohesion: 0.17
Nodes (7): crossProviderEnv, fallbackEnv, liveCall, liveEnv, mockEnv, quickPolicy, schema

### Community 39 - "button.tsx"
Cohesion: 0.23
Nodes (10): CriterionRow(), formatPoints(), formatScore(), kindLabels, ReportView(), verdictLabels, claimAnchor(), ClaimRow() (+2 more)

### Community 40 - "registry.ts"
Cohesion: 0.20
Nodes (10): metadata, download(), Feedback, InterviewPrepPanel(), Pending, download(), Feedback, OutreachPanel() (+2 more)

### Community 41 - "env.ts"
Cohesion: 0.24
Nodes (12): RootLayout(), aiModes, EnvError, isProvider(), itemList(), nonEmpty(), parseEnv(), parseTarget() (+4 more)

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
Cohesion: 0.29
Nodes (9): field(), AppendRefusal, appendToDestination(), AttestDestination, attestDestinations(), entriesOf(), listFields, sectionLabels (+1 more)

### Community 46 - "use-compile-engine.ts"
Cohesion: 0.28
Nodes (8): analyzeMatchEvidence(), analyzeMatchInstructions, buildAnalyzePrompt(), CriterionEvidence, criterionEvidenceSchema, MatchEvidence, ModelCriterion, withIds()

### Community 47 - "outreach-panel.tsx"
Cohesion: 0.27
Nodes (6): suggestionFor(), buildSuggestions(), stableSuggestionId(), criteria, drafts, suggestAdjustmentsFixture

### Community 49 - "storage/index.ts"
Cohesion: 0.57
Nodes (4): HomePage(), metadata, serializeJsonLd(), webApplicationJsonLd()

### Community 50 - "match/api.ts"
Cohesion: 0.38
Nodes (5): AppShell(), glide, isActive(), isResumeEditor(), navItems

### Community 51 - "resync"
Cohesion: 0.20
Nodes (9): Architecture notes, Guided tours, How AI calls are wired, Licence, Logging, Requirements, resync, Running it (+1 more)

### Community 52 - "opengraph-image.tsx"
Cohesion: 0.20
Nodes (11): clearDraft(), draftKeyFor(), DraftStorage, preferNewerRecord(), readDraft(), memoryStorage(), record(), writeDraft() (+3 more)

### Community 53 - ".key"
Cohesion: 0.17
Nodes (17): ClaimExperience(), dropReasonLabels, GeneratedUnder, kindLabels, SuggestionsPanel(), verdictLabels, browserDecisionStore(), clearDecision() (+9 more)

### Community 54 - "suggestions-panel.tsx"
Cohesion: 0.14
Nodes (10): extractJdFixture, input, liveEnv, mockEnv, analyzeMatchFixture, base, parseResumeContentFixture, parseResumeFixture (+2 more)

### Community 55 - "ResumeEditor"
Cohesion: 0.20
Nodes (23): AiTask, DocumentRequestBody, DocumentInput, AppEnv, Jd, StructureJdInput, AnalyzeMatchEvidenceInput, AnalyzeRequestBody (+15 more)

### Community 56 - "messages.ts"
Cohesion: 0.47
Nodes (4): HeroFallback(), requirements, step(), HeroVisual()

### Community 57 - "layout.ts"
Cohesion: 0.12
Nodes (20): accountStorage(), jsonBytes(), sizeOf(), StorageBreakdown, StoreSize, SettingsWorkspace(), Stored, WorkspaceState (+12 more)

### Community 58 - "escape.ts"
Cohesion: 0.33
Nodes (7): asciiEscapes, combiningAccents, escapeLatex(), fromDecomposition(), hostile, unicodeReplacements, unrepresentableCharacters()

### Community 60 - "inflight.ts"
Cohesion: 0.60
Nodes (3): ManualModeBadge(), Badge(), badgeVariants

### Community 61 - "app/page.tsx"
Cohesion: 0.23
Nodes (9): PreviewPanel, Feedback, Alert(), AlertDescription(), AlertTitle(), alertVariants, Separator(), AiModeSummary (+1 more)

### Community 62 - "capabilities.ts"
Cohesion: 0.38
Nodes (5): CapabilityInput, decideThree(), capable, ThreeDecision, ThreeSkipReason

### Community 64 - "deriveJdTitle"
Cohesion: 0.18
Nodes (16): JdSummary(), ResumePicker(), AnalyzeError, jdQueryId(), MatchWorkspace(), PostingView, viewHints(), viewSource() (+8 more)

### Community 76 - "@codemirror/state"
Cohesion: 0.22
Nodes (9): @ai-sdk/fireworks, @codemirror/language, lucide-react, @openrouter/ai-sdk-provider, dependencies, @ai-sdk/fireworks, @codemirror/language, lucide-react (+1 more)

### Community 79 - "@dnd-kit/modifiers"
Cohesion: 0.39
Nodes (5): AdjustmentsList(), AdjustmentView, DiffPart, diffWords(), words()

### Community 95 - "cover-letter.ts"
Cohesion: 0.08
Nodes (22): JsonSchemaNode, modelSchemas, CoverLetter, coverLetterFixture, coverLetterInstructions, coverLetterSchema, coverLetterSpec, interviewPrepFixture (+14 more)

### Community 96 - "texlyre-busytex"
Cohesion: 0.24
Nodes (7): jdRecord(), emptyJd(), createStorage(), ResyncDatabase, upgrade(), jdRecord(), storage

### Community 109 - "inflight.ts"
Cohesion: 0.29
Nodes (3): createInFlightCollapser(), InFlightCollapser, inFlightModelRequests

### Community 113 - "fetchModelIdentity"
Cohesion: 0.29
Nodes (10): AiMode, AiProvider, AnalyzeFailure, AnalyzeResponse, AnalyzeSuccess, failureFrom(), fetchModelIdentity(), messageFrom() (+2 more)

## Knowledge Gaps
- **384 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `@codemirror/state` to `devDependencies`, `Resume`, `draft-journal.test.ts`, `.key`, `assemble.test.ts`, `FakeCacheStorage`, `ai`, `@base-ui/react`, `class-variance-authority`, `FakeCacheStorage`, `@codemirror/commands`, `ai`, `@codemirror/view`, `@dnd-kit/core`, `@dnd-kit/sortable`, `basics-editor.tsx`, `linkedom`, `lucide-react`, `mammoth`, `motion`, `@mozilla/readability`, `next`, `@openrouter/ai-sdk-provider`, `react-dom`, `@react-three/drei`, `@react-three/fiber`, `three`, `tw-animate-css`, `@unified-latex/unified-latex`, `zod`, `collapsible-section.tsx`, `idb`, `shadcn`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `ToggleGroupItem()` connect `Resume` to `resume-editor.tsx`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `react` connect `Resume` to `@codemirror/state`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `hosts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05378151260504202 - nodes in this community are weakly interconnected._
- **Should `match-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Should `danger-zone.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07390873015873016 - nodes in this community are weakly interconnected._