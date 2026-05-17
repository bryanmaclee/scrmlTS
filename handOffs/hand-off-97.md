# scrmlTS — Session 96 (CLOSE)

**Date:** 2026-05-16
**Previous:** `handOffs/hand-off-96.md` (S95 CLOSE rotated as S96 OPEN-pickup snapshot)

---

## TL;DR for S97 PA pickup

S96 was a **bug-chip marathon** chipping at the S95-catalog + newly-surfaced followups. **9 commits landed end-to-end**, all pushed, pre-push gate fully restored.

- **TodoMVC 38-fail closed** (dispatch #1) — the pre-existing `--no-verify` blocker
- **16 of 18 S95-catalog bugs closed**
- **4 of 5 newly-surfaced followups closed**
- **pa.md moved to scrml-support** as `pa-scrmlTS.md`; 24-line pointer at `scrmlTS/pa.md`
- **SPEC-at-session-start directive** added to pa.md session-start checklist (step 3 — read `compiler/SPEC-INDEX.md` in full; before any spec-implication code change, Read the relevant SPEC section directly)
- **Issue C closed** end-to-end (Option A reactive for-iterable widening, both top-level + nested-in-lift)

**Push state at close:** all 9 scrmlTS commits + 1 scrml-support commit pushed.

---

## Final state at S96 close

- **scrmlTS HEAD:** `2e102a8` (Issue C — reactive for-stmt iterable widened)
- **scrmlTS tag:** `v0.3.0` annotated on `c520369` (unchanged this session)
- **scrmlTS ahead/behind origin:** 0/0 — pushed
- **scrml-support HEAD:** `548a675` (pa-scrmlTS.md home)
- **scrml-support ahead/behind origin:** 0/0 — pushed
- **Working tree:** clean (modulo this wrap commit landing master-list + changelog + hand-off + handoff-96 rotation)
- **Worktrees:** main only (no S96 dispatch used `isolation: "worktree"` — all PA-side direct work)
- **Inbox:** empty
- **Hook config:** configuration B (pre-commit + post-commit + pre-push); pre-push gate fully restored

**Tests at HEAD `2e102a8`:** **12,892 pass / 117 skip / 1 todo / 0 fail / 657 files / 43,202 expect**.

Delta vs S95 close (12,854 / 117 / 1 / 38 / 657 / 43,146):
- **+38 pass** (the closed TodoMVC fixture)
- **0 new files** (test count + assertion updates only)
- **+56 expect**
- **38 PRE-EXISTING fails → 0** (TodoMVC fixture rewrite + test infrastructure)

---

## S96 commit ledger (9 scrmlTS + 1 scrml-support, chronological)

```
1e9df2d  fix(todomvc): canonical-reactive @filter enum + defensive runtime expose (38 browser fails closed)
d360a88  fix(lint+ri): silence S95 Bug 8 + Bug 9 false-positives + close Bug 7 component-def shape
bc18aa5  fix(parser): close S95 Bug 15 (fn-body ternary false-fire) + Bug 10 (class:NAME with hyphens+digits)
cc59982  fix(event-handlers): close S95 Bug 11+12 lift wrapping + Bug 14 spec-aligned bare-call
c921f0a  docs(s96): replace pa.md with thin pointer to scrml-support/pa-scrmlTS.md
1b8be2f  fix(codegen): match-form derived codegen — strip arm-separator comma from arm.result + close S95 Bug 6 as misclassification
5cc5ade  fix(reactive-deps): transitive walker now reads if/while/for condition fields (S96 dep-tracker miss)
cf92351  fix(type-system): close bare-variant inference miss at state-decl comparison-site
2e102a8  feat(codegen): Issue C — reactive for-stmt iterable widened from bare @ident to direct+transitive @-refs
```

Plus `scrml-support/548a675` — `pa-scrmlTS.md` canonical home for scrmlTS PA directives (companion to scrmlTS's `c921f0a` pointer stub).

Plus this wrap-CLOSE commit landing master-list + changelog + hand-off + rotation.

---

## 16 S95-catalog bugs closed (out of 18)

| # | Severity | Bug | Wave / commit |
|---|---|---|---|
| 1 | Tier 2 | Match value-return malformed JS | S95 `d5c79da` |
| 2 | Tier 2 | Variant constructor engine direct-write | S95 `a39d25a` (final) |
| 5 | Tier 2 | Component phantom DOM | S95 `645a5e1` |
| 6 | misclassified | `#{}` CSS "0-byte" was measurement artifact | S96 W4 `1b8be2f` |
| 7 | lint | W-DEAD-FUNCTION component-def shape | S96 W1 `d360a88` |
| 8 | lint | W-LINT-007 false-pos on type/props | S96 W1 `d360a88` |
| 9 | lint | W-LINT-013 false-pos on fn-body `@cell = .V` | S96 W1 `d360a88` |
| 10 | parser | `class:NAME` hyphens-with-digits in lift | S96 W2 `bc18aa5` |
| 11 | adopter friction | `${(e) => fn(e)}` arrow in lift | S96 W3 `cc59982` |
| 12 | adopter friction | `${...}` event handler in lift balancing | S96 W3 `cc59982` |
| 13 | Tier 1 | `class:NAME=(expr)` in lift literal attr | S95 `2c18b2d` |
| 14 | SPEC violation | Bare-call `fn()` auto-thread event | S96 W3 `cc59982` |
| 15 | parser | `fn`-body ternary false-fires E-FN-001 | S96 W2 `bc18aa5` |
| 16 | Tier 1 | Bare `import` at `<program>`-body top-level | S95 `34dedc3` |
| 17 | Tier 2 | Tailwind scanner descent into lift bodies | S95 `3b48e4d` |
| 18 | Tier 1 | `scrml:NAME` client import white-screen | S95 `f57d881` |

**Remaining 2 S95-catalog open:** Bug 3 (`class:NAME=fn(arg.with.dot)`) + Bug 4 (closure-capture event-handler arg) — both need real-context reproducers (synthetic repros didn't fire in S96).

---

## 4 of 5 newly-surfaced followups closed

These were filed during S96 waves (NOT in the original S95 catalog):

| Followup | Wave / commit | Outcome |
|---|---|---|
| Match-form derived trailing-comma | W4 `1b8be2f` | ✅ Closed — `splitMultiArmString` strip trailing `,` |
| Transitive dep tracker incomplete | W5 `5cc5ade` | ✅ Closed — extractReactiveDepsFromBody walks if/while/for condition fields |
| Bare-variant `==` comparison at state-decl init | W6 `cf92351` | ✅ Closed — inferBareVariantsAtComparisonSites wired at state-decl site |
| Issue C reactive for-iterable widening | W7 `2e102a8` | ✅ Closed — Option A with V5-strict @-ref predicate; top-level + nested-in-lift |
| **Chained-ternary derived codegen function-arg strip** | — | 🟡 **Still open** — concrete bug, separate dispatch |
| **Bare-assignment in attribute value parser ambiguity** | — | 🟡 **Still open** — parser-internal, separate dispatch |

---

## Structural change — pa.md moved to scrml-support

S96 mid-session user-ratified move. **scrmlTS/pa.md is now a 24-line pointer**; the authoritative PA directives live at **`scrml-support/pa-scrmlTS.md`** (commit `548a675`).

User rationale (verbatim): *"this is a set of rules (for both of us) on how we interact to build this language. But I am a firm believer in 'speaking to my audience'. pa.md is purely about a two party exchange."*

- scrmlTS is public/MIT — pa.md's two-party-exchange content was the wrong audience
- scrml-support is already the storage hub for cross-cutting PA-user content (user-voice, design-insights, deep-dives)
- The pointer stub satisfies the global `~/.claude/CLAUDE.md` "read pa.md in project root first" convention
- Naming follows `user-voice-scrmlTS.md` per-repo-suffix pattern (sibling repos `pa-scrml.md` / `pa-giti.md` / `pa-6nz.md` could land same way if migrated)
- Internal `pa.md Rule N` cross-refs across scrmlTS docs (master-list, primer, hand-off, memory) remain symbolic — rules are content-addressed not location-addressed

**For S97 PA pickup:** the pointer at `scrmlTS/pa.md` redirects to `../scrml-support/pa-scrmlTS.md` — read that file in full at session start.

---

## New PA directive added — SPEC-at-session-start (pa-scrmlTS.md step 3)

User-direct precedent: S96 Wave 3 PA chased Bugs 4 / 11 / 14 from FOLLOWUPS framing without verifying SPEC §5.2.2. User asked *"have you read the spec?"* The spec gave normative answer that resolved three bug classifications in one read (Bug 14 was a real SPEC §5.2.2 violation; Bug 4 was a non-canonical-reproducer misclassification; Bug 11 in top-level worked correctly).

**Now in pa-scrmlTS.md session-start checklist step 3:** Read `compiler/SPEC-INDEX.md` IN FULL (~288 lines; navigation map for the ~410k-token SPEC.md). Before ANY code change with spec implications (event handlers, state decls, engines, match, channels, schema, refinement types, validators, error codes), Read the relevant SPEC section IN FULL via `offset:` + `limit:` — do NOT decide from PRIMER summary or FOLLOWUPS framing. Locked tests can encode spec-divergent behavior — verify against SPEC.

Memory file: `feedback_read_spec_at_session_start.md` carries the full directive + rationale.

---

## Issue C closure — Option A reactive for-iterable (Wave 7 detail)

The deferred design question from dispatch #1 closed end-to-end. **Option A** (auto-detect reactive iterables when iterable contains `@`-prefix ref direct or transitive) chosen by user; static escape-hatch DEFERRED. V5-strict identifier semantics (§6.1.3 + E-NAME-COLLIDES-STATE) make "no @-ref = snapshot" unambiguous, so the heuristic is principled.

**4 cases in the truth table — all verified:**

| Case | Iterable shape | Verdict | Real-code precedent |
|---|---|---|---|
| 1 | `@cell` | reactive | (already worked) |
| 2 | `@cell.filter(...).sort(...)` | **reactive (new)** | `examples/25-triage-board.scrml:134` |
| 3 | `fn()` w/ transitive `@`-ref | **reactive (new)** | (was synthetic; pattern LLMs would emit) |
| 4 | `fn()` w/ no `@`-ref (server-fn) | snapshot | `examples/07-admin-dashboard.scrml:144`, `03-contact-book.scrml:101` |

**5 files changed:**
- `compiler/src/codegen/reactive-deps.ts` — new `iterableHasReactiveRefs(node, fnRegistry)` helper
- `compiler/src/codegen/emit-client.ts` — `detectRuntimeChunks` for-stmt case widened; builds fnRegistry once
- `compiler/src/codegen/emit-control-flow.ts` — `emitForStmt` top-level predicate widened; opts.fnBodyRegistry threaded
- `compiler/src/codegen/emit-logic.ts` — caller threads fnBodyRegistry to emitForStmt
- `compiler/src/codegen/emit-lift.js` — `emitForStmtWithContainer` nested-in-lift emit widened (creates wrapper inside containerEl + reconcile_list + effect_static)

**Real-code impact (`examples/25-triage-board.scrml`):** the inner task list now emits `_scrml_reconcile_list(...)` + `_scrml_effect_static(...)` for `for (let task of @tasks.filter(...).sort(...))`. Drag-drop mutations on `@tasks` now reactively re-render — this was the canonical kanban-shape footgun Option A is designed to close.

---

## SPEC §5.2.2 Bug 14 closure — Rule 4 in action

Per pa.md Rule 4 (SPEC is normative; derived planning docs are NOT), Bug 14 was a real SPEC violation hiding behind a tutorial + a locked test. Pre-S96:

> **SPEC §5.2.2 line 1128:** `onclick=fn()` SHALL wire `fn` as a click handler. The compiler MUST auto-wrap the call as `function(event) { fn(); }`. `fn` is NOT invoked at render time.

Pre-S96 impl at `emit-event-wiring.ts:479-480` + `emit-lift.js` (two paths): always emitted `function(event) { fn(event); }` — threaded event as first arg. Cited "tutorial §1.5" + a locked test `event-handler-args-e2e.test.js §4 "threads event"`. Tutorial is NOT normative. Test was locking spec-divergent behavior.

Fix at three sites (`emit-event-wiring.ts:479-480`, `emit-lift.js:497-499`, `emit-lift.js:718-721`). Updated 13 locked-test assertions across 5 test files in lockstep. Tutorial §1.5 may still need alignment (out of scope this commit).

Escape-hatch for handlers needing the event remains `onclick=${(e) => fn(e)}` per SPEC §5.2.2 line 1123.

---

## Things S97 PA must NOT screw up (carried + extended)

### pa.md Rules permanently load-bearing (now at `scrml-support/pa-scrmlTS.md`)
- Rule 1 — no marketing/article/tweet work unless user brings up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999%
- Rule 4 — SPEC is normative; derived planning docs are NOT
- Rule 5 — shoot straight; politeness for politeness sake rejected

### New S96 PA-memory rules permanently load-bearing
- `feedback_read_spec_at_session_start.md` — PA SHALL read SPEC-INDEX.md at session start; verify spec sections directly before spec-implication changes
- `feedback_declaration_form_in_reproducers.md` — PA synthetic reproducers must use V5-strict canonical shape per primer §3 (`<x> = 0` at top-level, `@x = 0` only inside `${...}`)

### S96-specific anti-patterns
- DO NOT use the pre-S96 `wc -l` heuristic for file-emptiness — `wc -c` is the right measurement (Bug 6 misclassification precedent)
- DO NOT trust FOLLOWUPS framing for compiler-behavior classification without verifying against SPEC text (Bug 14 precedent)
- DO NOT reproduce bugs with non-canonical scrml shapes (`@x = 0` at top-level for state-decl; `<x> = 0` is canonical) — produces ambiguous test conditions
- DO NOT extend the chunk-gate predicate without coordinating with the emit-site predicate at the corresponding codepath (Issue C dual-site precedent — chunk-gate fires but emit-lift didn't emit reactive shape, causing dead-code-in-runtime + non-reactive emit)

---

## Open questions to surface immediately (S97 PA pickup)

1. **Chained-ternary derived codegen function-arg strip** — concrete codegen bug surfaced Wave 4. `const <result> = @c == Mode::A ? @ts.filter(function(x){...}) : @c == Mode::B ? ... : @ts` strips the function literal args. Single ternary works; chained ternary breaks. Likely in `emitExprField` / `rewriteExprWithDerived` ternary handling. Concrete repro at `/tmp/ternary-bug.scrml` from S96 (gone after session — easy to recreate).
2. **Bare-assignment in attribute value parser ambiguity** — `onclick=@x = .V` emits broken HTML `onclick="x" V>` because the HTML-attribute tokenizer can't distinguish `attr=expr-with-equals` from `name=value attr2 attr3`. Per L19 the form IS legal scrml. Worked around in S96 by restoring helper functions + bare-call form. Real fix: attribute parser needs event-handler-attribute → expression-mode contract.
3. **S95 Bug 3 + Bug 4** — both need REAL-context reproducers. S96 synthetic repros didn't fire. Bug 3 cites `E-COMPONENT-021` suggesting component-def body context. Bug 4 may have been a non-canonical-reproducer misclassification (similar to Bug 14's framing issue).
4. **Brute-force syntax-stress harness** (user-surfaced S96 mid-session) — throw arbitrary React/Vue/Svelte/TS-shaped syntaxes at the compiler to see how it degrades. Parallel to the LLM-efficiency benchmark (which tests positive scrml generation). Three things it would surface: (a) ghost-pattern lint coverage gaps, (b) silent compile bugs (Bug 14 shape), (c) diagnostic quality. File as v0.3.x dispatch candidate.
5. **X.com archive ingestion** (user-surfaced S96 mid-session) — user requested X data archive; will follow up when ZIP arrives. PA will write parser + new `scrml-voice-author corpus-refresh source=x-archive` mode. ~1-2 hrs of work once data lands.
6. **6nz cross-repo notice** (deferred from S96) — Bug 14's revert (per SPEC §5.2.2) MAY break adopter code in 6nz that relied on the auto-threaded event. Should drop a notice to `6nz/handOffs/incoming/` per pa-scrmlTS.md cross-repo-messaging — alongside the closure narrative + suggested escape-hatch (`onclick=${(e) => fn(e)}`). Not done this session.

---

## Process wins this session

1. **All 9 commits passed pre-commit + post-commit hooks** without `--no-verify`. S95's `--no-verify` push (process violation per pa.md S88 amendment) is fully closed — every subsequent push went through the full pre-push gate cleanly.
2. **Real-code precedent investigation before design lock-in** (Issue C). User said *"look at the implementation surface first"* + *"lets look at an example in actual code not a sterile snippet"* — those redirects forced PA to investigate 3 real-code shapes that exposed a critical nuance (server-fn vs method-chain semantics) supporting Option A with a principled heuristic. Without that, naive auto-detect would have over-activated reactivity on Cases 1+2.
3. **Spec-vs-impl-vs-test reconciliation discipline** (Bug 14). The SPEC-vs-impl divergence had been locked into a test (S88 LIFT-4 fix). Rule 4 + the new SPEC-at-session-start rule caught it. PA broke the spec-divergent test in lockstep with the impl revert.
4. **Misclassification catches** (Bugs 4 + 6 + 14). Three FOLLOWUPS entries that turned out to be different shapes than described: Bug 4 was a non-canonical-reproducer artifact, Bug 6 was a `wc -l` measurement artifact, Bug 14 was a real SPEC violation hidden behind a misleading "test locks in this behavior" framing. Each catch saved hours of pursuing the wrong code.
5. **Hand-off + wrap shape settling.** User observed mid-session that the wrap process (hand-off + master-list + changelog) carries duplication with MEMORY.md + pa.md auto-loaded content. Marked as a trim opportunity for future-PA sessions; not executed this session.

---

## Process incidents (worth filing or remembering)

### File-has-not-been-read errors during bulk edits

Wave 3 had several Edit-tool errors of the form "File has not been read yet. Read it first before writing to it" — happened when the file had been previously inspected via `sed` (Bash) but not via the Read tool, so the harness's file-state tracker didn't register it. Workaround: call Read explicitly on each file before any Edit/Write. Add a small Read prelude (5-10 lines of relevant section) before each edit batch on a new file. Cost: 1-3 extra Read calls per multi-file edit batch.

### Off-mode autopilot loss after ExitPlanMode

After exiting plan mode in S96, the auto-mode flag flipped off. User signaled "lets look at issue C" but the auto-mode-off harness now expects explicit clarification at design forks. Per the post-exit-auto-mode system reminder, PA should ASK clarifying questions when approach is ambiguous rather than make assumptions. This was the right behavior — PA caught itself at the Issue C design choice (auto-detect heuristic shape) and asked the user rather than dispatching.

### Reproducer-shape canonicality (memory rule filed)

Multiple S96 reproducer attempts used non-canonical scrml shape (`@x = 0` at file/program top-level instead of canonical `<x> = 0`). This silently changed parser paths and either masked the bug under investigation OR produced confusion about what was actually broken. Now filed as `feedback_declaration_form_in_reproducers.md`. Going forward: PA defaults to V5-strict canonical form in synthetic reproducers per primer §3.

---

## Tags

#session-96 #CLOSE #bug-chip-marathon #todomvc-38-fail-closed #16-of-18-s95-catalog #4-of-5-followups-closed #pa-md-moved-to-scrml-support #spec-at-session-start-directive #issue-c-option-a-closed #rule-4-spec-wins-bug-14
