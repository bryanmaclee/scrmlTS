# scrmlTS — Session 70 (CLOSE — A7 parser+typer COMPLETE · A1c kicked off · history-regex bug fixed)

**Date opened:** 2026-05-08
**Date closed:** 2026-05-08
**Previous:** `handOffs/hand-off-69.md` (S69 close — A1b CLOSER · 9 commits + push)
**This file:** rotates to `handOffs/hand-off-70.md` at S71 open
**Tests at S69 close:** 9,425 → 9,626 (full); 8,743 → ~8,870 (pre-commit subset)
**Tests at S70 close:** **9,752 / 60 / 1 / 0** (full); **9,028 pre-commit subset**. Net **+126 pass / 0 skip / 0 todo / 0 fail / 0 regressions** vs S69 close.

---

## TL;DR — what landed S70

**Phase A7 parser+typer COMPLETE.** A5-2 (parser-shape) + A5-3 (typer-walker) both shipped this session. Plus A1c kicked off (C0 foundational usage-analysis pass shipped). Plus C1 brief pre-drafted. Plus a real bug surfaced + fixed during PA-direct investigation.

**12 commits this session, all on main.** Push pending S70 close (per user directive: wrap + push + clean state both repos for cross-machine pickup).

| Commit | Topic |
|---|---|
| `0ed8028` | maps refresh (incremental, anchor S66→S69 close) |
| `b80dd9c` | SPEC-INDEX line range refresh (S58 baseline → S69 close, +1126 lines) + §34 E-VARIANT-AMBIGUOUS dual-cite §14.10/§18.0.3 (S69 Q3 follow-up) |
| `cb73f41` | A5-2 BRIEF pre-draft + S69→S70 hand-off rotation |
| `efe57ba` | A5-2 SURVEY land — PROCEED-AS-BRIEFED |
| `bdc491c` | **A5-2 SHIP** — parser support for §51.0.M-Q (+63 tests) |
| `364b44f` | A5-3 BRIEF pre-draft |
| `e3ff816` | A5-3 SURVEY land — SCOPE-AMENDMENT-SUGGESTED with 3 infrastructure-precondition deferrals |
| `a8a6bdf` | **A5-3 SHIP** — typer + symbol-table walker for §51.0.M-Q (+54 tests) |
| `a494586` | A1c C0 SURVEY land — PROCEED-AS-BRIEFED with minor scope augmentation |
| `846d1ef` | **A1c C0 SHIP** — usage-analyzer + per-app FeatureUsage bitmap (+67 tests) |
| `1b9bab1` | A1c C1 BRIEF pre-draft (ready to dispatch S71) |
| `8d0a6f2` | **fix(a5-2):** tighten history/parallel/pinned bareword regexes — `\bhistory\b` mis-matched `.Variant.history` (SPEC §51.0.N) (+3 regression tests) |

**+184 new tests this session** (63 A5-2 + 54 A5-3 + 67 C0). Plus +3 regression tests for the history-regex fix. **Net +187.**

---

## Phase A7 status — parser+typer COMPLETE

A5-1 (spec amendments §51.0.K/M/N/O/P/Q) landed S68 (`1de05ef`). This session shipped:

- **A5-2 parser support** (`bdc491c`) — extended `engine-statechild-parser.ts` + `ast-builder.js` + `symbol-table.ts` types for `<onTimeout>` + `history` + `internal:rule=` + `parallel` + nested `<engine>` + `.Variant.history` target form.
- **A5-3 typer walker** (`a8a6bdf`) — NEW SYM PASS 16 (`walkValidateEngineA5Extensions`). Fires E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE + first compile-time E-ENGINE-INVALID-TRANSITION fire-site (`<onTimeout to=>` legality). Populates EngineMetadata file-scope aggregations.

**3 deferrals on infrastructure preconditions** (acknowledged + spec-faithful):
1. `<onTimeout>` outside engine state-child (`E-STRUCTURAL-ELEMENT-MISPLACED`) — markup walker not present (same gate as B17 `<onTransition>` placement deferral).
2. `<onTimeout>` inside `<match>` block-form arm — block-form match parser not present.
3. Cascade-miss diagnostic message extension on `E-ENGINE-INVALID-TRANSITION` — direct-write compile-time fire-site doesn't exist (engine state-child bodies are raw text).

**Inner-engine recursion DEFERRED to A1c.** Record-level `parentEngine` / `innerEngines` REMAIN undefined; state-child-level `EngineStateChildEntry.innerEngines` IS read by A5-3 as composite marker (`innerEngines.length > 0`).

**Pending A7 sub-steps** (post-A5-3):
- A5-4 codegen extension (~10-15h)
- A5-5 computed-delay relaxation impl (~1.5-2.5h)
- A5-6 Item G B-shakeable timer extensions (~5-10h, optional follow-on)
- A5-7 tests + samples (~12-18h)

**Per S70 sequencing decision:** A1c codegen will emit unified engine codegen for FULL §51.0 surface (pre-S67 + S67 amendments) in one pass. A5-4 may fold into A1c's engine wave (C12-C15) rather than landing as a separate phase.

---

## Phase A1c status — kicked off; C0 SHIPPED; C1 BRIEF READY

- **C0 (foundational feature-usage analysis pass)** SHIPPED `846d1ef`. New module `compiler/src/codegen/usage-analyzer.ts` (702 LOC) + 1-line wire-in to `analyzeAll`. FeatureUsage bitmap with 14 validator predicates + 8 engine/temporal flags + 11 cross-cutting flags. Cross-file OR-merge via existing `analyzeAll.files[]`. ZERO new diagnostics, ZERO AST mutation, ZERO emission. +67 tests.
- **C1 (shape-aware cell emitter)** BRIEF pre-drafted at `1b9bab1`. Decoupled from C0 in scope (per BRIEF §3.5 — C1 doesn't read the FeatureUsage bitmap). Phase 0 SURVEY mandate baked in. Closes S61 Step 11.5 deferred Shape 3 V5-strict codegen gap. Ready to dispatch S71.

**Pending A1c sub-steps** (post-C0): C1-C23 across 6 waves (~93-131h). C0's bitmap is the substrate for C5/C6/C8/C12/C14/C16/C18.

---

## history-regex bug fix (`8d0a6f2`) — investigation chain + lessons

**Trigger:** A1c C0 SHIP report flagged "B14 PASS 10.A coverage gap on engines inside `<program>` markup" with defensive substring scan as fallback. PA chose to investigate before dispatching C1.

**Investigation findings (in order):**
1. **B14 PASS 10.A is FINE.** `_record` correctly stamped on engine-decls in all observed cases (top-level, inside `<program>`, inside `<program><div>`). The agent's framing was imprecise — engines inside `<program>` ARE registered by PASS 10.A; the substring scan in C0 was sound but didn't mask a B14 gap.

2. **Real bug surfaced via kitchen-sink probe** (composite + history + nested + onTimeout + parallel + internal:rule shape from canonical SPEC §51.0.N example): A5-3 fired `E-HISTORY-NO-INNER-ENGINE` on `<Paused rule=.Playing.history>` even though Paused has no `history` bare attribute.

3. **Root cause:** A5-2 parser regex `/\bhistory\b(?!\s*=)/` matched `history` inside `rule=.Playing.history` because `.` is treated as a word boundary by `\b`. Mis-classified `<Paused rule=.Playing.history>` as carrying the `history` bareword.

4. **Spec impact:** The bug broke the canonical SPEC §51.0.N composite-state-child example — exactly the form the spec endorses for transitioning into a history-restored composite state.

**Fix:**
- `engine-statechild-parser.ts:678` — `historyAttr` regex tightened from `/\bhistory\b(?!\s*=)/` to `/(?:^|\s)history(?=\s|>|\/|$)/` (standalone-token requirement).
- `ast-builder.js:8601,8606` — same defensive fix on `pinnedMatch` and `parallelMatch` regexes (defense-in-depth; `.X.pinned` and `.X.parallel` aren't legal SPEC structured-target forms today, but future SPEC additions could re-introduce the same shape of bug).
- `a5-2-parser-support.test.js` — +3 regression tests anchoring SPEC §51.0.N example.

**Standing list addition:**
- C0's defensive substring scan in `usage-analyzer.ts:499-511` REMAINS in place — it's now true defense-in-depth without masking actual bugs.

**Lesson (worth recording):** When an agent's SHIP report flags a "coverage gap" or "framing issue" as a surprise, PA-direct investigation can reveal whether it's (a) the agent misreading the surface, (b) the agent's defensive code masking a real bug elsewhere, or (c) a real gap. In this case it was (a)+(b) — the agent's defensive scan masked an UNRELATED real bug in A5-2's regex. The investigation chain (read code → write minimal repro → trace-isolate → fix) was ~30-45 min.

---

## Open questions to surface immediately at S71 open

1. **Push state:** S70 commits push at wrap per user directive ("commit, wrap, push. moving to other machine"). Both scrmlTS + scrml-support must be clean and pushed. **Verify post-push.**

2. **Next phase direction at S71 open:**
   - **C1 dispatch** — BRIEF ready at `1b9bab1`. C1 is shape-aware cell emitter (~4-6h). Phase 0 SURVEY + implementation. The natural sequential next step.
   - **OR re-evaluate** — A5-4 codegen (alternative to folding into A1c)? PA recommendation: stick with A1c sequential (C1 next) per S70's "A7 parser+typer first, then A1c" decision.

3. **C1 BRIEF's S61 Step 11.5 gap claim** — C1 brief asserts it closes the pre-existing Shape 3 V5-strict codegen gap from S61. If S71 wants to verify this claim before C1 dispatches, read `compiler/src/codegen/emit-logic.ts:565-700` and confirm Shape 3 V5-strict still routes through `_scrml_reactive_set` (not `_scrml_derived_declare`).

4. **Worktree branches retained** for forensic (per pa.md S67 file-delta dispatch-landing pattern):
   - `worktree-agent-ac20dd0bc553333e5` (A5-2 SURVEY)
   - `worktree-agent-a771e96db480b3eb4` (A5-2 SHIP)
   - `worktree-agent-a61fa13bc731b14bb` (A5-3 SURVEY)
   - `worktree-agent-a76eb7dfda63b614b` (A5-3 SHIP)
   - `worktree-agent-a4dbc8fa820c77d64` (A1c C0 SURVEY)
   - `worktree-agent-ad732aee7dc564ff6` (A1c C0 SHIP)
   - `worktree-agent-aa94af82283fabeeb` (KILLED — misdispatched without isolation; recovered via TaskStop) — see "S70 PA-side dispatch error" below

5. **PA-side dispatch error recovered (S70 mid-session)** — PA misdispatched a fresh `general-purpose` Agent without `isolation: "worktree"` after A5-2 SURVEY when intending to continue the existing agent via SendMessage. Caught immediately via TaskStop (before any source change leaked into main). Recovery: file-delta'd SURVEY from existing agent worktree → committed as `efe57ba` → re-dispatched implementation with proper worktree isolation. **Lesson logged:** the harness can silently shift PA's CWD into a worktree after `git checkout` operations against worktree branches; future PA should verify `pwd` after worktree operations. Also, `SendMessage` is not in this session's deferred-tool list, so continuation-via-SendMessage isn't always available — re-dispatching with self-contained brief is the canonical fallback.

---

## Things S71 PA must NOT screw up (carry-forward + S70 additions)

S69 standing list 113-121 carry forward verbatim. New S70-close additions:

122. **A7 parser+typer COMPLETE** post-`a8a6bdf`. Future references to "A7 parser+typer" treat as complete phase. A5-4 codegen + downstream (A5-5/A5-6/A5-7) remain pending. A1c may absorb A5-4 into its engine wave (C12-C15) rather than landing as a separate phase.

123. **PASS-numbering canonical post-S70:** PASS 1-15 unchanged from S69; **PASS 16** added for A5-3 (`walkValidateEngineA5Extensions`). Future passes start at 17.

124. **EngineMetadata aggregation shape canonical post-A5-3:** `internalRules: Array<{stateChildTag, rule}>` (annotated records, not bare arrays); `onTimeoutElements: Array<{stateChildTag, entry}>`; `historyAttr: boolean` (OR-reduce). Aggregation entries reuse SAME EngineRuleForm/OnTimeoutEntry objects from `stateChildren` (no deep-copy) — codegen consumers (A5-4 / A1c engine wave) can rely on object identity.

125. **B14 forward-compat semantic shift** — `engineMeta.{historyAttr, internalRules, onTimeoutElements}` were `undefined` pre-A5-3; post-A5-3 they're populated with defaults (`false`/`[]`/`[]`) for legacy arrow-rule bodies. B14 test updated to match.

126. **`<onTimeout to=>` is the FIRST compile-time E-ENGINE-INVALID-TRANSITION fire-site** (per A5-3). Statically privileged per §51.0.M line 20567 ("Validated compile-time when rule= is statically known — always true on engine state-children — the from-state IS this state-child"). Future direct-write compile-time fire-sites can mirror this pattern.

127. **`.Variant.history` validation transparency** — B15's existing variant validation reads `r.target` and validates against `engineMeta.variants` regardless of `historyForm` flag. A5-3 adds anchor tests confirming this transparency; ZERO new validation code.

128. **C0's defensive substring scan** in `usage-analyzer.ts:499-511` is sound defense-in-depth, NOT masking a real B14 gap. Keep in place.

129. **history/parallel/pinned bareword regexes are STANDALONE-TOKEN form** post-`8d0a6f2`. Pattern is `/(?:^|\s)<token>(?=\s|>|\/|$)/`. Use this pattern for ANY future bareword detection that risks mis-matching inside structured-target forms (`.X.foo`-shape).

130. **Worktree CWD shift behavior** — the harness can silently shift PA's CWD into a worktree after `git checkout` operations against worktree branches. Future PA should verify `pwd` after `git checkout <branch> -- <files>` operations, especially if the operation is followed by an Edit/Write that uses CWD-relative paths.

131. **SendMessage not always in deferred-tool list** — PA cannot rely on SendMessage being available to continue background agents. Re-dispatching with a self-contained brief that points to file-delta-landed artifacts (SURVEY.md + BRIEF.md committed to main) is the canonical recovery path.

---

## State as of S70 close

| Field | Value |
|---|---|
| scrmlTS HEAD | `8d0a6f2` (history-regex fix) — wrap commit pending |
| scrmlTS origin sync | **12 commits ahead of origin/main** — push pending at wrap |
| scrml-support HEAD | unchanged from S67 close — clean |
| scrml-support origin sync | clean (`0 0`) — 1 untracked carryover (`archive/articles-skipped/`) |
| Working tree (scrmlTS) | clean post-fix-commit |
| Working tree (scrml-support) | 1 untracked (`archive/articles-skipped/` — S67 carryover) |
| Inbox | empty (`handOffs/incoming/` has only `dist/` + `read/` subdirs) |
| Active agents | 0 (all 6 S70 dispatches completed + landed; 1 killed mid-recovery) |
| Tests | **9,752 / 60 / 1 / 0** (full) / **9,028 pre-commit subset** |
| L-locks count | L1–L22 (unchanged) |
| Phase A1b | FUNCTIONALLY COMPLETE (22/22 — carried from S69) |
| Phase A7 parser+typer | COMPLETE (A5-2 + A5-3 SHIPPED) |
| Phase A1c | KICKED OFF (C0 SHIPPED; C1 BRIEF READY) |
| Spec amendments LANDED this session | none (only the §34 cross-ref tightening + history regex fix in compiler) |
| Design-insights | unchanged this session |

### File-modification inventory — this session

**scrmlTS commits:** 12 (full roster above + wrap commit pending).

**scrml-support commits:** 0 (no design-insight or user-voice changes load-bearing this session).

**Worktree branches retained for forensic** (6 + 1 killed):
- `worktree-agent-ac20dd0bc553333e5` (A5-2 SURVEY; final SHA `c40585b`)
- `worktree-agent-a771e96db480b3eb4` (A5-2 SHIP; final SHA `3eef0d1`)
- `worktree-agent-a61fa13bc731b14bb` (A5-3 SURVEY; final SHA `f1186a7`)
- `worktree-agent-a76eb7dfda63b614b` (A5-3 SHIP; final SHA `599cf7b`)
- `worktree-agent-a4dbc8fa820c77d64` (A1c C0 SURVEY; final SHA `8f63960`)
- `worktree-agent-ad732aee7dc564ff6` (A1c C0 SHIP; final SHA `f250adf`)
- `worktree-agent-aa94af82283fabeeb` (KILLED PA-recovery — see Open Q5)

---

## Cross-references

- **S69 close ledger (rotated):** `handOffs/hand-off-69.md`
- **PA scrml expert primer:** `docs/PA-SCRML-PRIMER.md` (still S68 baseline; S70 didn't touch)
- **PA directives:** `pa.md`
- **Master-list dashboard:** `master-list.md` §0 (A7 parser+typer COMPLETE; A1c kicked off)
- **CHANGELOG:** `docs/changelog.md` (S70 entry added at top of "Recently Landed")
- **A5-2 BRIEF + SURVEY:** `docs/changes/phase-a7-step-a5-2-parser-support/`
- **A5-3 BRIEF + SURVEY:** `docs/changes/phase-a7-step-a5-3-typer-walker/`
- **A1c C0 BRIEF + SURVEY:** `docs/changes/phase-a1c-codegen/{C0-DISPATCH-BRIEF,SCOPE-AND-DECOMPOSITION,SURVEY}.md` + `docs/changes/phase-a1c-step-c0-usage-analyzer/progress.md`
- **A1c C1 BRIEF (ready to dispatch):** `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/BRIEF.md`

---

## Tags

#session-70 #close #a7-parser-typer-complete #a5-2-shipped #a5-3-shipped #a1c-c0-shipped #a1c-c1-brief-ready #history-regex-bugfix #pa-investigation-chain #cross-machine-pickup #push-pending-at-wrap #12-commits-ahead-of-origin #depth-of-survey-frequency-8 #engine-metadata-aggregation-canonical #pass-16-added
