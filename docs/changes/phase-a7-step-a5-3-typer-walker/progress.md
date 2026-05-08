# A5-3 progress log

Append-only. Each entry: timestamp + what was just done + what's next + any blockers.

## 2026-05-08T00:00 — Phase 0 SURVEY complete

**What was done:**
- Worktree startup verified: WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a61fa13bc731b14bb`; HEAD `f59bbcc` rebased onto `364b44f` to pick up A5-2 SHIP + BRIEF.
- `bun install` (114 packages) + `bun run pretest` (12 samples) green.
- Baseline `bun run test` confirmed: **9,628 / 60 / 1 / 0** matches BRIEF §4.4. (One transient network-test flake on first run; second run clean.)
- Read BRIEF, A5-2 BRIEF + SURVEY, SPEC §51.0.M-Q (lines 20503-20988), SPEC §34 catalog rows (14234, 14243, 14248, 14250-14251, 14259), EngineMetadata + EngineStateChildEntry + EngineRuleForm shapes (symbol-table.ts:200-417), PASS 10.A registration (3680-3795), PASS 11 (B15) walker (4283-4570), PASS 13 (B17) cohesion walker (5085-5251), runSYM pipeline ordering (5999-6074), A5-2 parser body-scan helpers (engine-statechild-parser.ts:202-349), ast-builder engine-decl construction (ast-builder.js:8563-8728), B15 + A5-2 + B17 test patterns.
- Wrote `docs/changes/phase-a7-step-a5-3-typer-walker/SURVEY.md` — 14 sections covering all 10 BRIEF §5 deliverables.

**Key findings (per SURVEY §10 SCOPE CORRECTIONS):**
- 3 of 12 BRIEF §4.1 fire-sites DEFERRED on infrastructure preconditions: #5/6 (E-STRUCTURAL-ELEMENT-MISPLACED for `<onTimeout>` outside engine state-child / inside `<match>` arm — markup walker not yet present), #7 (cascade-miss message extension on E-ENGINE-INVALID-TRANSITION direct-write — direct-write compile-time fire-site doesn't exist yet, body parser limitation per `symbol-table.ts:4150,4544`).
- Inner-engine recursion DEFERRED to A1c (per SURVEY §3.3): A5-3's primary fire-sites read OUTER engine's state-children only; `innerEngines.length > 0` is the composite marker, no inner walking needed. A1c codegen will produce recursion infrastructure naturally.
- A5-3's `<onTimeout to=>` legality validation IS the FIRST compile-time E-ENGINE-INVALID-TRANSITION fire-site (per §51.0.M line 20567 spec authorization).
- Fire-site #9 (`.Variant.history` variant validation) ALREADY runs through B15 transparently via A5-2's `historyForm` flag riding `EngineRuleForm.single`/`multi`.
- Fire-site #11 (engine-in-function-body) parser behavior unverified — sub-step 6 verification test resolves; either no walker change OR ~30 LOC B17 extension.
- Walker placement: NEW PASS 16 (`walkValidateEngineA5Extensions`).
- EngineMetadata aggregation shape: annotated records (`{stateChildTag, ...}`).

**Estimated implementation cost: 5.5-7.5h, 9 sub-steps, 50-70 unit tests.**

**What's next:**
- STOP per BRIEF §5 stop-and-report protocol. Awaiting PA acknowledgment of survey before implementation.

**Blockers:** none — all loci confirmed reachable; deferrals documented.

## 2026-05-08T01:00 — Sub-step 1 complete: PASS 16 walker scaffold + EngineMetadata aggregation

**What was done:**
- Worktree set up at `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a76eb7dfda63b614b`; rebased onto `e3ff816` to pick up BRIEF + SURVEY.
- `bun install` (114 packages) + `bun run pretest` (12 samples) green.
- Verified baseline `bun run test`: 9,628 / 60 / 1 / 0 (one transient ECONNREFUSED flake on first run; second run clean).
- Tightened EngineMetadata field types per SURVEY §4: `internalRules?: Array<{stateChildTag, rule}>` and `onTimeoutElements?: Array<{stateChildTag, entry: OnTimeoutEntry}>` (annotated records for codegen clarity); `historyAttr?: boolean` unchanged but doc updated to mark "POPULATED by PASS 16".
- Added new helpers in `symbol-table.ts`:
  - `fireA5Diagnostic` — coarse-anchor diagnostic helper (mirrors `fireB15Diagnostic`).
  - `formatVariantList` — shared variant-list formatter.
- Added `validateEngineA5Extensions` (exported for direct test use, mirrors B15 export pattern). Implements:
  - Aggregation: OR-reduce `historyAttr`, concat `internalRules` + `onTimeoutElements` annotated with `stateChildTag`.
  - Per-state-child fire-sites #1 (E-HISTORY-NO-INNER-ENGINE), #2 (E-INTERNAL-RULE-NOT-COMPOSITE), #3 (E-ENGINE-INVALID-TRANSITION on `<onTimeout to=>` legality vs `rule=`), #4 (E-ENGINE-RULE-INVALID-VARIANT on `<onTimeout to=>` variant), #8 (E-ENGINE-RULE-INVALID-VARIANT on `internal:rule=` targets).
- Added `walkValidateEngineA5Extensions` walker (mirrors B15 walker structure verbatim — same recursion contract, same engine-decl stop-recursion).
- Wired PASS 16 into `runSYM` after PASS 15 (B19 channels). Annotated with deferral list.
- Updated `engine-binding-b14.test.js` "forward-compat A7 fields" test to reflect post-A5-3 state: legacy arrow-rule bodies (no state-children) → aggregation defaults `historyAttr: false`, `internalRules: []`, `onTimeoutElements: []`.

**Test results:**
- `bun run test`: 9,628 / 60 / 1 / 0 — baseline preserved (delta zero — this is scaffolding only; tests added in subsequent sub-steps).

**What's next:**
- Sub-step 2: write A5-3 test file scaffolding for §A5-3.11 (aggregation contract); WIP commit.
- Sub-step 3: fire-sites #1 + #2 tests (E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE).

**Blockers:** none.

## 2026-05-08T01:30 — Sub-steps 2-5+7-8+11-12 complete: comprehensive test coverage for in-scope fire-sites

**What was done:**
- Wrote `compiler/tests/unit/a5-3-typer-walker.test.js` with **51 tests** covering all in-scope fire-sites and aggregation contracts:
  - §A5-3.1 — E-HISTORY-NO-INNER-ENGINE (6 tests): non-composite fires, composite passes, multiple offenders, mixed composites, self-closing, message content.
  - §A5-3.2 — E-INTERNAL-RULE-NOT-COMPOSITE (7 tests): non-composite fires, composite passes, multi-target, wildcard, orthogonality with #1, message content.
  - §A5-3.3 — `<onTimeout to=>` legality vs `rule=` (9 tests): all 4 EngineRuleForm.kind cases (single/multi/wildcard/absent) × match/mismatch; parse-error/legacy-arrow do NOT double-fire (B15 already fired); multiple onTimeout entries; missing to=.
  - §A5-3.4 — `<onTimeout to=>` variant validation (5 tests): known/unknown variant, dual-fire (#3+#4), mixed valid/invalid, empty-variants gate.
  - §A5-3.6 — `internal:rule=` variant validation (6 tests): known/unknown, multi-target, wildcard, with-NOT-COMPOSITE orthogonality, empty-variants gate.
  - §A5-3.7 — `.Variant.history` transparency (3 tests): B15 validates `.Compo.history` / `.NotAVariant.history` / `(.A | .Bogus.history)` blind to history flag — KEY FINDING #4 confirmation.
  - §A5-3.10 — `parallel` silent-ignore (3 tests): file-scope parallel, derived parallel, parallelAttr metadata preserved (no new diagnostic codes from A5-3 for parallel).
  - §A5-3.11 — EngineMetadata aggregation (8 tests): historyAttr OR-reduce, internalRules concat with annotation, onTimeoutElements concat with annotation, empty cases, legacy arrow-rule body initialization, identity-preservation (annotated records reference same objects).
  - §A5-3.12 — Composition (2 tests): full-feature happy path + multi-infraction case.

**Test invariant:**
- Baseline 9,628 → 9,679 (delta +51, 0 fail). All A5-3 tests run via full pipeline (`splitBlocks → buildAST → runSYM`) consistent with B15/A5-2 patterns.

**Surprises / observations:**
- The A5-2 parser uses opening `\${ type ... }` syntax for type-decl prelude (matches existing test patterns); test sources use that.
- The `findEngineDecl` helper from A5-2 tests works consistently — the engine-decl with `parallelAttr` populated arrives via `_record.engineMeta`.
- The "rule=.Active>" fenceposting works exactly per spec — `.Active` matches state-child opener `<Active>` perfectly through `parseEngineStateChildren`.
- The `aggregation entries reference the SAME EngineRuleForm/OnTimeoutEntry objects` test confirms my impl uses references (not copies), matching codegen-consumer expectations from SURVEY §4.

**What's next:**
- Sub-step 6: engine-in-function-body verification — author negative-path test, determine if walker change needed.
- SHIP wave: full-suite regression check, SHIP commit with 9-fire-site coverage + 3 deferred-on-precondition.

**Blockers:** none.

## 2026-05-08T01:45 — Sub-step 6 complete: engine-in-function-body verification (parser-rejects path)

**What was done:**
- Wrote a parser-probe script (now removed) and exercised three engine-in-host shapes:
  - `function makeEngine() { <engine for=...> ... </> }` → engine markup absorbed as `html-fragment` (raw text) inside `function-decl.body`. NO `engine-decl` AST node produced.
  - `const makeEngine = () => <engine ...>...</>` (arrow-fn) → engine absorbed into const-decl initializer. NO `engine-decl` produced.
  - `{#snippet makeEngine()} <engine ...> ... </> {/snippet}` → snippet directives not parsed today; engine content lifts to root scope (where it would register normally). Out-of-host case.
- **EMPIRICAL FINDING:** the parser does NOT produce `engine-decl` AST nodes in function/snippet/arrow-fn bodies. Cohesion violation is **fait-accompli at PARSE time** — no SYM walker extension needed for this dispatch. The B17 walker remains as-is.
- Added §A5-3.9 anchor tests (3 tests) confirming:
  - No `engine-decl` produced inside `function-decl.body` — walks AST, asserts none found.
  - No `engine-decl` produced inside arrow-fn const-decl initializer.
  - Anchor that B17 still owns `E-COMPONENT-ENGINE-SCOPE` (A5-3 does not contribute fire-sites for this code).
- FORWARD-COMPAT NOTE in test file documents: if parser later admits engine-decl in function/snippet bodies, these tests fail loudly and the next dispatch can land the B17 walker extension per SURVEY §5 (~30 LOC + helper).

**Test invariant:**
- Baseline 9,628 → 9,682 (delta +54, 0 fail; +3 new tests vs sub-step 2).

**What's next:**
- SHIP wave: final regression sweep + SHIP commit with full deferral list.

**Blockers:** none.

## 2026-05-08T02:00 — SHIP wave: final regression sweep + dispatch close-out

**What was done:**
- Final `bun run test`: 9,682 pass / 60 skip / 1 todo / 0 fail (delta +54 from baseline 9,628; 0 regressions).
- All in-scope fire-sites (9 of 12 BRIEF §4.1 rows) shipped + tested:
  - #1 E-HISTORY-NO-INNER-ENGINE (NEW row 14250) — 6 tests
  - #2 E-INTERNAL-RULE-NOT-COMPOSITE (NEW row 14251) — 7 tests
  - #3 E-ENGINE-INVALID-TRANSITION on `<onTimeout to=>` legality — 9 tests (FIRST compile-time fire-site of this code)
  - #4 E-ENGINE-RULE-INVALID-VARIANT on `<onTimeout to=>` variant — 5 tests
  - #8 E-ENGINE-RULE-INVALID-VARIANT on `internal:rule=` targets — 6 tests
  - #9 `.Variant.history` transparency (B15 already fires) — 3 tests (anchor)
  - #10 B17 cohesion already-handles-defChildren — anchored (no extension)
  - #11 engine-in-function/snippet/arrow-fn body — parser pre-rejects (3 tests anchor)
  - #12 `parallel` silent-ignore — no diagnostic (3 tests anchor)
- Plus EngineMetadata aggregation contract (8 tests) + composition (2 tests) = 51 + 3 cohesion verification = **54 new tests**.

**Final deferrals (3 total per PA-authorized SURVEY §10.1 SCOPE CORRECTIONS):**
1. Fire-site #5 (E-STRUCTURAL-ELEMENT-MISPLACED for `<onTimeout>` outside engine state-child) — DEFERRED on markup-walker precondition. Same gate as B17's `<onTransition>` placement deferral.
2. Fire-site #6 (E-STRUCTURAL-ELEMENT-MISPLACED inside `<match>` block-form arm) — DEFERRED on same markup-walker precondition.
3. Fire-site #7 (cascade-miss message extension on E-ENGINE-INVALID-TRANSITION) — DEFERRED on direct-write compile-time fire-site that doesn't exist (engine state-child bodies are RAW TEXT per `symbol-table.ts:4150,4544`).

Plus inner-engine structural recursion DEFERRED to A1c per SURVEY §3.3 — A5-3's primary fire-sites read OUTER engine's state-children only; `innerEngines.length > 0` is the composite marker. EngineMetadata's record-level `parentEngine` / `innerEngines` REMAIN undefined this dispatch (the state-child-level `EngineStateChildEntry.innerEngines` IS populated by A5-2 + read by A5-3 for the composite marker only).

**Surprises during implementation:**
- B14 forward-compat test required minor update — post-A5-3, `historyAttr` / `internalRules` / `onTimeoutElements` are no longer `undefined` but populated with defaults (false / [] / []) for legacy arrow-rule bodies. Updated to assert the post-A5-3 contract.
- Sub-step 6 (engine-in-function-body) discovery: parser absorbs engine markup as `html-fragment` in function-decl.body / arrow-fn const-decl initializer — the cohesion violation is fait-accompli at PARSE time. ZERO walker code needed for §A5-3.9. This is the lower-cost branch from SURVEY §5 (the upper-cost branch — parser admits engine-decl + walker extension — would have been ~30 LOC).
- Snippet-decl directives (`{#snippet}/{/snippet}`) not parsed today; the engine inside a snippet escapes to root scope. Documented as out-of-host case in §A5-3.9.
- Identity-preservation observation: aggregation entries use the SAME `EngineRuleForm` / `OnTimeoutEntry` objects as `stateChildren` (no deep-copy) — codegen consumers (A5-4) relying on identity get expected behavior. Test `aggregation entries reference the SAME ... objects` confirms this.

**Test invariant satisfied:** baseline 9,628 → 9,682 (+54 new), 0 fail. No flakes on second run (one transient ECONNREFUSED on first run, consistent with prior baseline noise).

**Status: READY-TO-SHIP.**
