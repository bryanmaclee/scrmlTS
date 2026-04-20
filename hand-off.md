# scrmlTS — Session 32 Wrap

**Date opened:** 2026-04-20
**Date closed:** 2026-04-20 (single-day session)
**Previous:** `handOffs/hand-off-32.md` (S31 wrap, rotated in as S32 starting brief)
**Baseline entering S32:** 7,238 pass / 10 skip / 2 fail (26,503 expects / 316 files) at `26df45d`, origin/main.
**Final at S32 close:** **7,262 pass / 49 skip / 2 fail** (26,585 expects / 321 files) at `faf4c19`, pushed to origin/main.

---

## 0. Close state

### S32 commits — 10 commits, all pushed to origin/main

| Commit | Phase | Summary |
|---|---|---|
| `1d1c49d` | — | `spec(s32): ratify Insight 21 — fate-of-fn + state/machine completeness` |
| `328b6ab` | — | `test(s32-conformance): register 31 normative statements as skipped gating tests` |
| `dd5f41d` | 1a | `impl(s32-phase-1a): rename E-FN-006 → E-STATE-COMPLETE, update diagnostic` |
| `b87e668` | 1b | `impl(s32-phase-1b): widen E-STATE-COMPLETE to function bodies (§54.6.1 universal scope)` |
| `add1c08` | 2 | `impl(s32-phase-2): add pure fn parser support + W-PURE-REDUNDANT warning` |
| `b208f82` | 3a | `impl(s32-phase-3a): tag nested state blocks with isSubstate + parentState (§54.2)` |
| `90b6b2c` | 3b | `impl(s32-phase-3b): register substates with parentState + track in parent's substates set` |
| `acc56be` | 3c | `impl(s32-phase-3c): wire substate match exhaustiveness (§54.4)` |
| `3afd842` | 3d | `impl(s32-phase-3d): resolveTypeExpr falls back to stateTypeRegistry; substate arm pattern recognized` |
| `faf4c19` | 3e | `impl(s32-phase-3e): recognize < Substate> as match arm pattern — substate match is end-to-end live` |

Push range: `26df45d..faf4c19`. User authorized pushes directly (one-time auth early in session + "go" / "roll tide" / etc. directives for continued work).

### Uncommitted at wrap

- `docs/SEO-LAUNCH.md` — still uncommitted, **10 sessions running**. Nothing touched it this session either.
- `hand-off.md` — this file (new wrap content).

### Incoming

- `handOffs/incoming/` — empty (`read/` archive only).
- Nothing cross-repo outgoing. No dependencies on master PA this session.

### Cross-repo

- scrmlTSPub retirement still pending at master since S25 (untouched).
- Design-insights ledger unchanged since insight 21 (added S31, carried through S32 implementation).

---

## 1. Session theme — "S32 ratification → implementation, Phases 1/2/3 complete"

S32 was pure implementation execution against the S31-ratified spec. Three distinct arcs:

1. **Full-fidelity fn debate re-run** — 5 live experts, debate-judge appended insight 21, user ratified Flavor A+B (Plaid state-local transitions + `pure` modifier reach-extension).
2. **Marketing pivot on the devto scratch draft** — rewrote `~/scrmlMaster/marketing/devto-state-life-cycle-scratch.md` to lead with state-local-transitions and strip all internal-methodology references; the `fn` section got a candid "I lost a night's sleep" admission in the user's voice.
3. **Implementation: 5 compiler commits across Phase 1/2/3.** Baseline-held every single phase.

No S30 pivot changes — adopter-friction-first still in force, self-host still deferred. No P3 bug work.

---

## 2. Session log

### Arc 1 — subagent-write allowlist (opening)

Session opened with the global `~/.claude/settings.json` allowlist fix from S31's arc 1 carried forward. The "RESTART PENDING" gate at the top of the entering hand-off resolved on first action; no further permission friction this session.

### Arc 2 — full-fidelity fn debate re-run

User said "start" — direct cue per the entering hand-off's "§8.2 is go, awaiting green light" note.

**Dispatch path:** debate-curator first reported it couldn't find an Agent-dispatch tool. I orchestrated the 5 experts directly from the main session with parallel dispatches:

1. `rust-typestate-progression-expert` — wrote `scrml-support/debate-fn-S32/rust-typestate-argument.md`. Self-score 5.5/10 ergonomics. Flipped insight 20's placement call.
2. `plaid-typestate-oriented-expert` — `plaid-typestate-argument.md`. Self-score 8/10. Validated + sharpened insight 20's diagnosis.
3. `koka-algebraic-effects-expert` — `koka-effects-argument.md`. Self-score 5/10 on contrived-examples; conceded Plaid wins v1.0.
4. `haskell-purity-minimalist-expert` — `haskell-minimalist-argument.md`. Self-score strong on keep-<machine>-untaxed. Argues delete-fn entirely.
5. `smalltalk-message-state-expert` — `smalltalk-messages-argument.md`. Self-score 5/10 learnability, 8-9/10 challenge-site readability.

Then `debate-judge` (model:opus) scored and appended **insight 21** to `/home/bryan/scrmlMaster/scrml-support/design-insights.md` (lines 632-760). Verdict headline:

- **Q1:** MINIMIZE `fn`. Retain E-FN-001..005, E-FN-007, E-FN-009. Retire E-FN-006 → E-STATE-COMPLETE universal.
- **Q2:** 95% complete with one narrow gap in state's neighborhood. Close with Plaid-shape state-local transitions.
- **Scorecard:** Plaid 104.5 > Haskell 103.5 (1-point tie at top) > Smalltalk 91 > Rust 83 > Koka 60.
- **Relationship to insight 20:** PARTIALLY AGREES. Core verdict converges; Haskell's delete-fn path closes to within 1 pt (insight 20 had under-weighted it); Smalltalk contributes three portable sub-insights (BOQ-fn-4, -5, -6).

User reviewed insight 21, flagged the **irony that `pure` was in their original design, deep-dive/debate killed it, and now it's back via debate** — but accepted the re-derivation. Ratified **Flavor A+B** (all four must-fix decisions chose option (a)):
1. Space-after-`<` opener syntax (`< Draft>`, not `<State Draft>`)
2. `from` not `self` in transition bodies (keeps §51.3.2 `self` untouched)
3. fn-level purity in transition bodies (forbids `Date.now()` inline; pass as parameter)
4. E-STATE-COMPLETE widens to all state literal sites (corpus grep: ~15 sites, safe)

User then asked: **"to be clear this means `<machine>` is gone, and any `<State>` definition can enact the machine pattern?"** — I clarified: `<machine>` is PRESERVED (keeps 9 of 10 jobs), just demoted from sole edge-list authoring to co-author; state-local transitions add the inline capability. User confirmed: **"Yes. its coming together."**

### Arc 3 — ratification + spec amendment drafting

User green-lit: "lets go."

**Three review cycles** before SPEC.md edits (v1 BLOCK → v2 REWORK → v2.1 REWORK → v2.2 GO). All review reports persisted at `scrml-support/amendments-S32-fn-state-machine/review-v{1,2-1,2-2}.md`.

- v1 BLOCK — 6 MUST-FIX items + 6 SHOULD-FIX. Drafter (PA) picked 4 must-fix user decisions; autonomous fixes on the rest.
- v2 REWORK — 2 blocking collisions (E-MACHINE-005 vs empty-body auto-detect; E-TYPE-006 vs E-TYPE-020 for substate exhaustiveness) + 3 minor issues.
- v2.1 REWORK — 2 residual stale E-TYPE-006 citations (missed in the Issue B fix pass).
- **v2.2 GO** — all items resolved, applied to SPEC.md at commit `1d1c49d`.

**SPEC.md delta (~640 lines):**
- §33 (pure) — modifier attachment list expanded; W-PURE-REDUNDANT added; §33.6 relationship doc added.
- §48 (fn) — opening prose rewritten; Layer 2 (E-FN-006 machinery) retired and replaced with short §54 cross-ref; §48.11 supersession updated.
- §51 (machines) — three-sites addendum at §51.1; new §51.15 subsection with cross-check, override vs aggregated-derived mode auto-detect, E-STATE-MACHINE-DIVERGENCE, three worked dispatch cases; E-MACHINE-005 narrowed to "empty body AND no state-local transitions exist."
- §54 (NEW top-level section, ~400 lines) — nested substates, state-local transitions, `from` contextual keyword, field narrowing, terminal-by-absence, 4 new error codes, 8-row interaction matrix.
- §34 (error-code index) — +6/-1.
- SPEC-INDEX.md — added §54 entry + stale-line-numbers warning.

**Prereq:** archived `compiler/SPEC.md.pre-request-patch` (12K-line grep trap from pre-S31) to `scrml-support/archive/spec-drafts/SPEC.md-pre-request-patch-2026-04-20-dereffed-during-S32.md`.

### Arc 4 — marketing file pivot

After ratification, user asked to review `~/scrmlMaster/marketing/devto-state-life-cycle-scratch.md` for accuracy against the newly-ratified spec. The file had been written by MPA before ratification and had multiple syntactic inaccuracies:

- `<State Submission>` meta-tag form (doesn't exist in scrml)
- `<Draft>` no-space openers (collides with §4.3 disambiguation)
- `self` in transition bodies instead of `from`
- `now()` called inline instead of parameter-passed
- Object-literal `{ ...self, ... }` body syntax instead of explicit `return < Target>...</>`
- Machine section conflated override vs aggregated-derived modes

Rewrote rev 2 with corrections. User then said: **"lets try leading with the state-local-transitions ... Also, pull out anything related to deep-dives or debates, I dont want the conversation to be about my agentic development methods, so we leave the refs out. the truth about fn is, I couldnt sleep thinking about weather I had forced fn into to language without proper justification."**

Rev 3 delivered:
- Feature-lead: opens with the `< Submission>` code block immediately
- Life-time/life-cycle vocabulary moved to a later beat (not the opener)
- **All methodology references stripped** — no "S32's debate," no "5-expert debate," no "insight 21," no "ratification" framing
- `fn` section rewritten in the user's voice with the honest "lost a night's sleep" admission
- Title changed to "State machines on your state, not next to it"
- Scratch notes at bottom rewritten to reflect settled state, with four alternate titles still listed

File was user-edited mid-session (added a "(Carson Gross is correct about 'locality of behavior' Issue: toBed())" note at line 106 — user signal that the cognitive-locality argument is aligned with Carson Gross's locality-of-behavior thesis; preserved per system-reminder).

### Arc 5 — implementation Phases 1/2/3

User: "cool, lets get back on track. implementation" → "phase 1" → etc.

#### Phase 1 — E-STATE-COMPLETE rename + universal scope

**Phase 1a (`dd5f41d`):** rename E-FN-006 → E-STATE-COMPLETE in `compiler/src/type-system.ts`; rewrite diagnostic text to §54.6.1 format (name the field + type, list declared fields, two-way fix hint). Update `compiler/tests/unit/fn-constraints.test.js` §9 to expect the new code; widen `getFnErrors` filter to include E-STATE-COMPLETE.

**Phase 1b (`b87e668`):** added `checkFunctionBodyStateCompleteness` — a duplicate walker for non-fn `function` bodies that runs JUST the state-completeness subset of checkFnBodyProhibitions. Gated at the dispatch site: fn gets the full check, function gets the completeness-only walk. Inverted the "not triggered for function" test.

Conformance tests CONF-S32-006a/b/007 are registered + referenced but kept skipped — the fixtures use inline-state-literal syntax (`let p = < Product> name = n </>`) which depends on Phase 3e-era parser support.

#### Phase 2 — `pure fn` parser + W-PURE-REDUNDANT (`add1c08`)

Parser had `pure function` but not `pure fn`. Added `_pureFnShorthandLookahead` in `compiler/src/ast-builder.js` mirroring the existing async-fn pattern. Sets `isPure: true` on the function-decl AST node. At the type-system dispatch, emit W-PURE-REDUNDANT (severity: warning) when `fnKind === "fn" && isPure === true`. 3 new unit tests in §12 of fn-constraints.

Note: §48.9's pre-S32 prose says "pure adds memoization permission to fn." S32 framing (§33.6) says fn ≡ pure function so pure is redundant. §48.9 text is stale in spirit but wasn't rewritten — low-priority follow-up.

#### Phase 3 — nested substate grammar (end-to-end)

**Phase 3a (`b208f82`) — AST substate metadata.** `buildBlock` gains `parentStateName` parameter; state-constructor-def and state nodes carry `{ isSubstate: true, parentState: "Outer" }` when nested. 4 unit tests in `substate-tagging.test.js`.

**Phase 3b (`90b6b2c`) — type registry parent/substates.** StateType interface gains `parentState?` and `substates?` fields. `tState` constructor + `registerStateType` gain `parentState` parameter. At registration: if parentState is set, child is added to parent's substates set. Forward-ref placeholder handles depth-first order where children register before the parent's own state-constructor-def visit completes; E-STATE-006 duplicate-guard was narrowed to exempt placeholder overwrites. `processFile` + `runTS` return type gains optional `stateTypeRegistry` for direct test inspection. 5 unit tests in `substate-registry.test.js`.

**Phase 3c (`acc56be`) — match exhaustiveness checker.** New `checkSubstateExhaustiveness` mirroring `checkEnumExhaustiveness` — iterates over substates set, supports variantName + typeName patterns. `checkExhaustiveness` dispatch gains a state+substates branch emitting E-TYPE-020 with substate-specific prose. 7 direct-checker tests in `substate-match-exhaustiveness.test.js`. E2E deferred pending type resolution.

**Phase 3d (`3afd842`) — type-annotation resolution.** `let sub: SubmissionType` and `@sub: SubmissionType` now resolve through the stateTypeRegistry (previously fell through resolveTypeExpr to asIs because state types live in a separate registry). Fallback added at let-decl and reactive-decl sites only — resolveTypeExpr signature unchanged for the other 13 callers. `parseArmPattern` gained a `< SubstateName>` branch after the `.VariantName` enum shorthand. 3 unit tests in `substate-match-e2e.test.js`.

**Phase 3e (`faf4c19`) — match-arm parser recognizes substates.** Problem: `< Draft>` at arm position parses as `html-fragment`, not `bare-expr`. Fix: teach `extractArmsFromMatchNode` to read `html-fragment.content` alongside `bare-expr.expr`; teach `splitMatchArms.looksLikeArmHeader` to recognize `< SubstateName>` as an arm boundary. Rewrote `substate-match-e2e.test.js` with 5 end-to-end tests covering missing/exhaustive/reactive-typed/wildcard cases. **All now pass end-to-end.**

**Phase 3 end-state:** user can write
```scrml
< Submission id(string)>
    < Draft body(string)></>
    < Validated body(string)></>
    < Submitted body(string)></>
</>
${ let sub: Submission = < Draft></>
   match sub {
       < Draft> => ...
       < Validated> => ...
       // < Submitted> missing → E-TYPE-020
   }
}
```
and get a real compile-time diagnostic naming the missing substate. Genuine language capability.

### Arc 6 — Phase 4 scope check + session wrap

User: "your doing good. lets hit it."

Attempted Phase 4a (parse transition-decl inside state body). **Hit a parser architecture wall:** `name(params) => < Target> { body }` fails at block-splitter with `E-CTX-003: Unclosed 'Submission'`. The `{` after `< Target>` enters nested state-body context in the block-splitter's state machine; needs to be a logic-expression context.

The fix requires coordinated edits across block-splitter (state machine), tokenizer (context entry), ast-builder (transition-decl node kind). That's compound-token lookahead across three compiler stages — real architecture work that deserves a fresh session. Reported honestly rather than forcing a half-Phase-4.

User: "sounds good. make sure everything is updated..."

---

## 3. Files changed this session — full list with purpose

| File | Commit | Purpose |
|---|---|---|
| `compiler/SPEC.md` | `1d1c49d` | S32 amendment (§33/§48/§51/§54/§34) — ~640 lines |
| `compiler/SPEC-INDEX.md` | `1d1c49d` | §54 row + stale-line-numbers warning |
| `compiler/SPEC.md.pre-request-patch` | `1d1c49d` | **deleted** — archived to scrml-support |
| `compiler/tests/conformance/s32-fn-state-machine/` (5 files) | `328b6ab` | REGISTRY.md + 4 test files, 31 statements, 39 skipped tests |
| `compiler/src/type-system.ts` | `dd5f41d` | E-FN-006 → E-STATE-COMPLETE + diagnostic text |
| `compiler/tests/unit/fn-constraints.test.js` | `dd5f41d` | §9 rename + defensive E-FN-006-absence assertion |
| `compiler/src/type-system.ts` | `b87e668` | `checkFunctionBodyStateCompleteness` added, dispatched for non-fn |
| `compiler/tests/unit/fn-constraints.test.js` | `b87e668` | "not triggered for function" test inverted |
| `compiler/tests/conformance/s32-fn-state-machine/s48-fn.test.js` | `b87e668` | diagnose() harness wired; 3 tests re-skipped with Phase-3 parser-gating notes |
| `compiler/src/ast-builder.js` | `add1c08` | `pure fn` shorthand parser + isPure on AST node |
| `compiler/src/type-system.ts` | `add1c08` | W-PURE-REDUNDANT emission |
| `compiler/tests/unit/fn-constraints.test.js` | `add1c08` | §12 new: 3 W-PURE-REDUNDANT tests |
| `compiler/src/ast-builder.js` | `b208f82` | buildBlock `parentStateName` param; substate metadata on state/state-constructor-def |
| `compiler/tests/unit/substate-tagging.test.js` | `b208f82` | 4 new AST tests |
| `compiler/src/type-system.ts` | `90b6b2c` | StateType.parentState/substates; tState/registerStateType params; forward-ref placeholder; runTS exposes stateTypeRegistry |
| `compiler/tests/unit/substate-registry.test.js` | `90b6b2c` | 5 new registry tests |
| `compiler/src/type-system.ts` | `acc56be` | checkSubstateExhaustiveness + dispatch; E-TYPE-020 substate prose |
| `compiler/tests/unit/substate-match-exhaustiveness.test.js` | `acc56be` | 7 direct-checker tests |
| `compiler/src/type-system.ts` | `3afd842` | let-decl + reactive-decl stateTypeRegistry fallback; parseArmPattern substate branch |
| `compiler/tests/unit/substate-match-e2e.test.js` | `3afd842` | 3 tests: let/reactive annotation binding, checker export |
| `compiler/src/type-system.ts` | `faf4c19` | splitMatchArms substate header; extractArmsFromMatchNode html-fragment path |
| `compiler/tests/unit/substate-match-e2e.test.js` | `faf4c19` | rewrite: 5 e2e tests now passing |
| `scrml-support/amendments-S32-fn-state-machine/` (5 files) | this wrap | v1 + v2 + v2.1 drafts + 3 review reports |
| `scrml-support/debate-fn-S32/` (5 files) | this wrap | 5 expert arguments (2,364 lines total) |
| `scrml-support/design-insights.md` | this wrap | insight 21 appended, lines 632-760 |
| `scrml-support/archive/spec-drafts/SPEC.md-pre-request-patch-2026-04-20-dereffed-during-S32.md` | this wrap | archived grep-trap |
| `../marketing/devto-state-life-cycle-scratch.md` | this wrap | full rev 3 rewrite in user's voice, methodology-refs stripped |
| `hand-off.md` | this wrap | S32 full log (this file) |
| `handOffs/hand-off-32.md` | rotated | S31 wrap preserved verbatim |
| `../scrml-support/user-voice-scrmlTS.md` | this wrap | S32 verbatim entries appended |

---

## 4. Test suite health

- **Entering S32:** 7,238 pass / 10 skip / 2 fail (26,503 expects / 316 files) at `26df45d`.
- **After 328b6ab (conformance skip):** 7,238 / 49 / 2 (26,503 / 320).
- **After dd5f41d (Phase 1a):** 7,238 / 49 / 2 (26,504 / 320) — +1 expect from E-FN-006-absence assertion.
- **After b87e668 (Phase 1b):** 7,238 / 49 / 2 (26,507 / 320) — +3.
- **After add1c08 (Phase 2):** 7,241 / 49 / 2 (26,513 / 320) — +3 tests, +6 expects.
- **After b208f82 (Phase 3a):** 7,245 / 49 / 2 (26,534 / 321) — +4 tests, +21 expects.
- **After 90b6b2c (Phase 3b):** 7,250 / 49 / 2 (26,550 / 322) — +5 tests, +16 expects.
- **After acc56be (Phase 3c):** 7,257 / 49 / 2 (26,560 / 323) — +7 tests, +10 expects.
- **After 3afd842 (Phase 3d):** 7,260 / 49 / 2 (26,572 / 324) — +3 tests, +12 expects.
- **Close after faf4c19 (Phase 3e):** **7,262 pass / 49 skip / 2 fail (26,585 expects / 321 files).**

Note: file count fluctuates because some new test files replace skipped stubs and vice versa.

**Pre-existing fails unchanged:** Bootstrap L3 perf, tab.js-path test. Neither blocks any S32 work or adopter path. **49 skipped** = 10 pre-S32 + 39 S32 conformance gating tests (the four CONF-S32-006a/b/007 stayed re-skipped with Phase 3 grammar notes; the other 35 gate Phase 4+).

**Zero regressions across ten commits.** Every phase held baseline exactly.

---

## 5. Design-insights ledger

One new insight this session's direct consumer:

- **Insight 21** (`scrml-support/design-insights.md` lines 632-760) — Full-fidelity fn debate re-run. Predecessor: insight 20 (S31 inline-mode). Relationship: PARTIALLY AGREES. Scorecard + three portable sub-insights (BOQ-fn-4 pure-as-modifier, BOQ-fn-5 terminal-by-absence, BOQ-fn-6 keyword-vs-context-anchored diagnostics). Appended without disturbing prior entries (insight 20 byte-intact at 545-628).

No new BOQs opened this session beyond what insight 21 recorded. No flip-condition triggers fired.

---

## 6. Non-compliance (carried from S30, still unaddressed)

Per prior hand-offs:

- `master-list.md` header still **9 sessions stale** (last updated S23). Needs refresh with S28/S29/S30/S31/S32 commits, F-series tracking, insight 20+21, S30 public-pivot, S32 implementation milestones.
- `docs/SEO-LAUNCH.md` uncommitted **10 sessions**. Ask once, close.
- `benchmarks/fullstack-react/CLAUDE.md` — agent-tooling inside a framework-comparison dir. Still out of place.
- **NEW:** SPEC-INDEX.md line numbers are now significantly stale (the S32 amendment added ~640 lines to SPEC.md). Regenerate: `bash scripts/update-spec-index.sh` — worth doing before Phase 4 so the next PA's section lookups match reality.
- **NEW:** §48.9 prose still says "pure adds memoization permission to fn" — stale under S32 framing (§33.6: fn ≡ pure function). Low priority; can be folded into a future SPEC-cleanup pass.

---

## 7. User memory touched this session

No new memories written. Existing memories honored:

- `feedback_agent_model` — opus for every subagent dispatch (debate-curator, 5 experts, debate-judge, design-reviewer×3, conformance-tester).
- `feedback_persist_plans` — this hand-off is the persistence; written immediately at wrap.
- `feedback_user_voice` — S32 entries being appended to user-voice-scrmlTS.md this wrap (not deferred).
- `feedback_agent_staging` — triggered once when debate-curator reported no Agent-dispatch tool; workaround was main-session orchestration (curator became a planning layer, main session dispatched experts).
- `feedback_push_protocol` — user authorized push directly multiple times ("go shorty its ya birthday" → push Phase 1a; "roll tide" → Phase 3a etc.). Documented, not a protocol drift.
- `feedback_batch_size` — Phase 3 was split across 3a/3b/3c/3d/3e precisely to keep each batch in-context. Worked well.
- `feedback_verify_compilation` — every phase verified via `bun test` before commit; zero regressions across 10 commits validates the discipline.
- `user_truck_driver` — session stayed efficient; no wasted agent dispatches or re-work loops.
- `feedback_language_cohesion` — honored throughout: the §54 amendment uses existing grammar conventions (`< X>` space-after-`<`, `self` preserved for §51 guards, E-TYPE-020 reused rather than new code).
- `project_lin_redesign` — unchanged this session; Approach B is still ratified-but-unimplemented. Not a Phase 3 dependency; will intersect with Phase 4's transition body purity.

---

## 8. Next PA priorities — ordered

### 8.1 FIRST — Phase 4: state-local transition declarations

This is the biggest remaining S32 chunk. **Start with a fresh context budget** — this phase needs careful multi-stage coordination.

#### 8.1.1 The core challenge (documented so you don't have to rediscover it)

`name(params) => < Target> { body }` at state-body position fails at the block-splitter with `E-CTX-003: Unclosed 'Submission'`. Specifically: the `{` after `< Target>` is interpreted by the block-splitter's state machine as entering a nested state-body, but the `< Target>` itself was opened and the tracker can't reconcile. Minimal reproducer:

```
< Submission id(string)>
    < Draft body(string)>
        validate(now: Date) => < Validated> {
            return < Validated> id = from.id </>
        }
    </>
    < Validated body(string)></>
</>
```

Block-splitter returns 0 blocks + 1 E-CTX-003 error. Even WITHOUT the inner `< Validated>` state-literal in the return, the empty `{ }` body still breaks the block-splitter.

#### 8.1.2 The fix, architecturally

Three possibilities, ordered by invasiveness:

1. **Targeted block-splitter rule:** recognize the compound pattern `<ident>(params) => < Target> {` as a transition-body opener. Treat the inner `{ ... }` as a logic-context block (same family as `${ ... }`). This is the minimum-invasive path but needs multi-token lookahead which the block-splitter doesn't do today.

2. **Tokenizer-level hint:** have the tokenizer mark `=> < Target> {` sequences and pass a context-switch signal to the block-splitter. More surgical but spreads the change across layers.

3. **Require `${ }` for transition bodies (syntax compromise):** deviate from spec §54.3 and require bodies to be wrapped `${ ... }` for parser unambiguity. Violates ratified grammar; NOT recommended; flagged here only for completeness.

Recommend approach 1. The block-splitter already tracks brace depth and some context transitions; adding one more pattern is bounded work.

#### 8.1.3 Phase 4 sub-phase plan (mirrors Phase 3's successful cadence)

- **4a — block-splitter transition-body recognition.** Parse the pattern; emit a transition-body block (logic-context inside). No AST integration yet.
- **4b — AST transition-decl node.** Build the node from the block with `{ name, params, targetSubstate, body }`.
- **4c — registry hook.** Attach transitions to substates in `stateTypeRegistry` (new field on StateType: `transitions?: Map<string, { targetSubstate: string, params: ... }>`).
- **4d — `from` contextual keyword.** Scope-chain bind inside transition bodies; resolve `from.field` against the pre-transition substate.
- **4e — E-STATE-TRANSITION-ILLEGAL.** At method-call sites `@sub.someName(args)`, look up `someName` on `@sub`'s narrowed substate; error if not declared.
- **4f — E-STATE-TERMINAL-MUTATION.** Field writes on a substate with zero declared transitions → error.
- **4g — fn-level purity inside transition bodies.** Apply existing `checkFnBodyProhibitions` semantics (E-FN-001..005) + E-FN-004 (non-determinism). The §33.6 rationale is preserved: replay/audit/property-tests need deterministic transitions.
- **4h — return-type narrowing.** Transition call site narrows the binding to the declared target substate.

Each of 4a-4h is its own commit. Baseline-hold discipline from S32 must continue.

#### 8.1.4 What's already in place that Phase 4 can lean on

- Substate AST metadata (isSubstate, parentState) — phase 3a.
- Substate registry linkage (parentState, substates set) — phase 3b.
- `from` arm-pattern recognizer already knows `< SubstateName>` markup shape — phase 3d's parseArmPattern extension.
- Exhaustiveness infrastructure for substate match arms — phase 3c+3e.
- stateTypeRegistry exposed via runTS/processFile return for test inspection — phase 3b.

### 8.2 SECOND — conformance test un-skipping (parallel with 4)

As Phase 4 lands each sub-phase, un-skip the corresponding gating tests in `compiler/tests/conformance/s32-fn-state-machine/`:

- `s54-substates.test.js` — 17 tests gating on Phase 3e (ready-ish now) and Phase 4 sub-phases.
- `s51-machine-cross-check.test.js` — 7 tests gating on Phase 4 + Phase 5 (machine cross-check implementation).
- `s48-fn.test.js` — 4 tests: CONF-S32-006a/b and CONF-S32-007 gate on parser support for inline-state-literal field assignments (`< T> name = n </>`). That's an overlapping parser capability with Phase 4 transition body grammar.
- `s33-pure.test.js` — 3 tests: Phase 2 already satisfies some; others gate on `pure method` / `pure transition` attachment (Phase 4-adjacent).

Each un-skip is a 2-line diff (`test.skip` → `test`) and a verification run.

### 8.3 THIRD — non-compliance cleanup (parallelizable any time)

Priority order:
1. **Regenerate SPEC-INDEX.md** — run `bash scripts/update-spec-index.sh`. Line numbers are significantly stale post-S32. Do this before Phase 4 starts so section grep-lookups match.
2. **master-list.md refresh** — 9 sessions stale. Pick a tight window (just S30-S32), don't try to backfill everything.
3. **SEO-LAUNCH.md decision** — ask the user once ("commit, revert, or archive?"), then close the loop.
4. **benchmarks/fullstack-react/CLAUDE.md** — move to repo root `.claude/` or delete.
5. **§48.9 cleanup** — fold "pure adds memoization permission" rewrite into any future SPEC-touching commit. Not urgent alone.

### 8.4 FOURTH — F8 + F9 adopter polish (from S31's deferred list)

Still open from the S30 audit:
- F8 — scaffold lacks `package.json` + `README.md`. Cheap.
- F9 — scaffold lacks inline orientation comments. Cheap.

Good side-quest between Phase 4 sub-phases if you need a context reset.

---

## 9. Agents + artifacts reference (so you don't have to grep)

### Conformance tests (31 statements, 39 tests, all skipped)

- `/home/bryan/scrmlMaster/scrmlTS/compiler/tests/conformance/s32-fn-state-machine/REGISTRY.md` — statement ledger CONF-S32-001..031.
- `s33-pure.test.js` — 3 statements (§33).
- `s48-fn.test.js` — 4 statements (§48 amendments) + wired `diagnose()` helper; 3 tests re-skipped with Phase-3 parser-gating notes.
- `s51-machine-cross-check.test.js` — 7 statements (§51.3.2 + §51.15).
- `s54-substates.test.js` — 17 statements (§54.3-§54.7).

### Debate artifacts (historical; do not modify)

- `/home/bryan/scrmlMaster/scrml-support/debate-fn-S32/` — 5 expert arguments, 2,364 lines total. Preserved for audit.
- `/home/bryan/scrmlMaster/scrml-support/amendments-S32-fn-state-machine/` — 3 draft iterations + 3 review reports + v2.2 final draft. Evidence trail for the ratification chain.

### Design insights

- `/home/bryan/scrmlMaster/scrml-support/design-insights.md` — 21 entries. Insight 21 at lines 632-760. Append new insights AFTER line 760; do not touch prior entries.

### User voice

- `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` — S32 entries appended this wrap. Format: verbatim user message + brief PA interpretation of what signal/directive it conveys.

### Live SPEC (authoritative; edits gated by scrml-language-design-reviewer)

- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` — current state-of-the-art. Post-S32 line count ~20,400.
- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC-INDEX.md` — stale line numbers (regenerate before grep-dependent work).

### Primary agents used this session

- `debate-curator` — hit a tool-limitation (no Agent dispatch). Workaround: main-session orchestration.
- `rust-typestate-progression-expert`, `plaid-typestate-oriented-expert`, `koka-algebraic-effects-expert`, `haskell-purity-minimalist-expert`, `smalltalk-message-state-expert` — all dispatched in parallel; returned clean outputs.
- `debate-judge` — scored and appended insight 21 cleanly.
- `scrml-language-design-reviewer` — 3 cycles (v1, v2, v2.1 → v2.2 GO). Essential gate.
- `scrml-language-conformance-tester` — registered 31 statements in one pass.

No primary agents need restaging for Phase 4. The 5 fn-debate experts can stay staged for potential future debates or be culled later — user call.

---

## 10. If something unexpected appears in the inbox

- Master PA messages land at `handOffs/incoming/` (empty at S32 close).
- Convention: read the message, verify referenced paths exist, move to `handOffs/incoming/read/` preserving filename, report to user.
- If the message references an S32 artifact that's since moved, the relevant path is listed in §9.

---

## 11. Summary for the next PA — one paragraph

S32 took the S31-ratified S32 spec amendment (fate-of-fn + state/machine completeness per insight 21) from paper to working compiler across 10 pushed commits. Phases 1 (E-STATE-COMPLETE rename + universal scope), 2 (pure fn + W-PURE-REDUNDANT), and 3 (nested substates end-to-end: AST metadata → registry linkage → match exhaustiveness checker → type-annotation resolution → arm pattern parser) all landed cleanly. Baseline held exactly across every phase: 7,262 pass / 49 skip / 2 fail, zero regressions across 321 test files. Users can now write `< Submission> < Draft> ... < Validated> ... </>` and get real compile-time `match` exhaustiveness diagnostics with the missing substate named. Phase 4 (state-local transition declarations — the remaining big piece) hit a parser architecture wall at the block-splitter: `name(params) => < Target> { body }` fails E-CTX-003 because `{` after `< Target>` enters nested-state context. The fix requires coordinated block-splitter/tokenizer/ast-builder changes that deserve a fresh session rather than end-of-session energy. Next PA: start Phase 4 with the 8-sub-phase plan in §8.1.3, regenerate SPEC-INDEX first (§8.3.1), then roll through 4a→4h with the same baseline-hold discipline S32 proved works. Marketing scratch draft was also rewritten rev 3 in the user's voice, feature-lead structure, methodology refs stripped per user directive.
