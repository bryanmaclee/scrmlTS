# scrmlTS — Session 52 (OPEN, mid-flight at hand-off pre-save)

**Date opened:** 2026-04-30 (machine-A, post-S51 close — same calendar day as S51)
**Date at this hand-off pre-save:** 2026-05-02 (session crossed midnight TWICE; long architectural session)
**Previous:** `handOffs/hand-off-53.md` (S51 close — fat wrap, 12 dispatches, +184 tests)
**Pre-save reason:** Mid-flight bookkeeping while F-COMPONENT-004 fix re-dispatch runs in background. Pre-save protects against crash/timeout. If session continues, this gets updated at close. If next session opens fresh, this is the pickup state.

**Baseline entering S52:**
- scrmlTS at `3338377` (S51 close, pushed) / clean / 8,380 pass / 40 skip / 0 fail / 400 files
- scrml-support at `2687e48` (S51 close, pushed) / clean / 0/0 with origin

**State at this hand-off pre-save:**
- scrmlTS at `966a493` (P2-wrapper merged) / `M hand-off.md` (this file mid-write) / **8,519 pass / 40 skip / 0 fail / 410 files** (+139 from S52 start, +8 + 96 + 17 + 35 across phases — see §3 timeline)
- scrml-support at `2687e48` + 5 untracked deep-dive files (DD1 + DD2 + DD4 + 2 progress logs) — to be committed at session close
- **F-COMPONENT-004 fix in flight** (re-dispatched after stale-base halt; estimate ~2-4h)
- Origin: scrmlTS ~30 commits behind, scrml-support 0 ahead (untracked files only)

---

## 0. The big shape of S52

**The architectural-pivot session.** Triggered by the user's S52 verbatim statement (see §7) calling out that scrml has been "drifting from the language I envisioned" — identifying PascalCase-as-discriminator as the first concession and proposing **state-as-primary unification** (markup as a subset of state with display attributes). Day 1 of multi-day work.

The W6 dispatch (carry-over from S51 plan) shipped Layer 1 of F-CHANNEL-003 + F-MACHINE-001 with a §21.2 SHALL NOT against `export <markup>` — and the user immediately identified that as "basically unacceptable." That single rejection triggered the entire architectural pivot.

### Track A — W6 dispatch (consequential, not merged)

T2-medium dispatch via scrml-dev-pipeline (worktree-isolated). Carry-over from S51's queue.

- **F-MACHINE-001 fully RESOLVED** — TAB synthesizes sibling `type-decl` for `export type X:kind = {...}`; cross-file `<machine for=ImportedType>` now works. E-MACHINE-004 message corrected. SPEC §51.3.2.5 + §41.2 amendments.
- **F-CHANNEL-003 PARTIAL (Layer 1 only)** — Agent unilaterally chose to ship a SHALL NOT against `export <markup>` (E-EXPORT-001) instead of the diagnosis's recommended inline-expansion approach. The §38.4.1 carveout documents the deferral.

User reviewed and **identified the §21.2 SHALL NOT as unacceptable** — locks in the wrap-in-const concession permanently. **W6 worktree PARKED.** Branch lives at `worktree-agent-a566c25e34a40eb59` / `changes/w6` (10 commits ahead of S51 close baseline, never merged). F-MACHINE-001 fix in W6 is salvageable but redundant once P3 ships cross-file resolution architecturally.

### Track B — Three parallel deep-dives

User direction: *"deep dive. start multiple if its worth it"*. PA dispatched 3 parallel scrml-deep-dive agents.

- **DD1 — State-as-Primary Architectural Unification** (master conceptual, T3) — output 1170+ lines at `scrml-support/docs/deep-dives/state-as-primary-unification-2026-04-30.md`. Recommends Approach A (full unification). Scores Approach A 51/60 vs W6-shipped C 28/60 on 12-dimension matrix. Catalogs **8 historical concessions** Approach A removes (PascalCase, wrap-in-const, whitespace-after-`<`, separate state/markup categories, dual naming patterns, §21.2 SHALL NOT, §38.4.1 channel carveout, F-AUTH-002 modifier prefix asymmetry). Convergent dev-agent signal: 3 friction reports independently reach for Approach A-shaped fixes.
- **DD2 — Parser Disambiguation Feasibility** (T2-large) — output 700+ lines at `scrml-support/docs/deep-dives/parser-disambiguation-feasibility-2026-04-30.md`. Verdict **FEASIBLE-WITH-COST**. T2-large × 3 phases (~2-3 weeks). Built on existing W2 canonical-key infrastructure already in LSP. Eliminates Approach B (name-table-at-parse breaks per-file parallelism, lexer-hack risk).
- **DD3 — Prior Art Survey** (T2-large) — **FAILED at 600s agent stall**. PA decided to skip re-launch (DD1 §7 had 14-system catalog autonomously). Progress file remains as untracked artifact in scrml-support.

Both DD1 and DD2 agents delivered as inline messages instead of writing to disk. PA had to manually persist them. Pattern noted; future deep-dive briefs include explicit "WRITE to disk" instruction.

### Track C — DD4 (state-type body grammar)

User-floated questions about `<machine>` body restriction ("feels bolted on and unnatural") and engine rename. Decided: bodies should be **uniform with extension points**. PA dispatched DD4 with that as pre-decided direction.

- **DD4 — State-Type Body Grammar Uniform-with-Extensions** (T2-large) — 1,187 lines at `scrml-support/docs/deep-dives/state-type-body-grammar-uniform-extensions-2026-04-30.md`. Confirmed reusability hypothesis (uniform bodies INCREASE reusability). **Killer finding:** SPEC §54.2-§54.3 (Nested Substate Declarations + State-Local Transition Declarations) ALREADY ships the extension-point pattern for type-with-body. DD4 is GENERALIZING existing scrml shape, not inventing.
- Recommended phasing: T1+T2 (~10-13 days dispatch) opens machine/channel/lifecycle bodies to base trio (markup + `${...}` logic + nested state-types) + per-state-type extension registration. `<schema>` stays compile-time-only (principled exception). `<formResult>` default-rendering deferred to T3.
- DD4 wrote to disk correctly (the agent followed the explicit "WRITE this to disk" brief).

### Track D — Debate (A vs B, "for shits and giggles")

User direction: *"lets debate for shits and giggles"* — even though the technical case for A was already strong, debate ceremony preserves deliberation record.

debate-curator dispatched with full pipeline (research + experts + judge + record insight). 6 panelists:
- **A camp:** scrml-dev-elixir, scrml-dev-htmx, racket-hash-lang-expert
- **B camp:** scrml-dev-react, scrml-dev-typescript, scrml-dev-vue

**Verdict: Approach A wins 93/110 vs Approach B's 71.5/110** (extended 11-dimension rubric).

Largest spreads favoring A: Paradigm fit (+7), Idiomaticity to user vision (+5.5), Cross-file architectural cleanup (+5), Spec coherence (+4.5).
Largest spread favoring B: Compiler complexity (+3) — A is ~4x the implementation cost.

Tie-breaker: convergent dev-agent signal (3 independent friction reports reaching for A-shaped fixes).

Honest minority position from B camp (TypeScript + React experts) on per-category type distinctness — informs implementation: A's `StateTypeDeclNode` must carry strong `category` discriminator. DD4's already-shipped `StateTypeRegistration` (§54.2-§54.3) does this.

Design insight appended to `/home/bryan-maclee/.claude/design-insights.md` (under heading "## State-as-Primary Architectural Unification — scrml Approach A vs B").

### Track E — User ratification + 7 OQ defaults + engine rename

User: *"ratify yes. engine yes . other qs default. go"*

Ratified:
- **Approach A** (state-as-primary unification) — go
- **Engine rename** (machine → engine) — DO IT in P1 (overrode DD4's "defer" recommendation)
- All 7 unanswered OQs at defaults (lowercase warn on HTML collision; export-const transitional sugar kept; per-importer channel store identity; §52 authority preserved as attribute; F-AUTH-002 modifier+attribute both; formResult default-rendering deferred to T3; debate ratified Approach A)

### Track F — P1 dispatch (case-soften + whitespace warn + engine rename)

T2-large via scrml-dev-pipeline (worktree-isolated). Lowest-risk first commit per DD1 §9.1.

**Status: PARTIAL but adequate.** 8 commits, +8 tests (8380→8388), 0 regressions. Merged FF.

Shipped:
- SPEC §4.3, §15.6, §15.8, §15.12 case-rule softening (SHALL → MAY)
- SPEC §15.15 NEW — unified state-type registry section
- 3 new warning codes catalogued: W-CASE-001, W-WHITESPACE-001, W-DEPRECATED-001
- TAB recognizes both `<engine>` and `<machine>` keywords
- W-DEPRECATED-001 runtime emission on `<machine>` (8 tests)
- 2 examples migrated to `<engine>`: mario, dispatch app hos.scrml
- SPEC §51.3.2 engine canonical
- PIPELINE Stage 3.05 NameRes design contract (no implementation yet)

Deferred to P1.E:
- NameRes Stage 3.05 implementation
- Uniform opener
- W-CASE-001 + W-WHITESPACE-001 runtime emission
- W-WHITESPACE-001 noisiness problem (every `< db>` opener would warn — flood without uniform opener)

Deferred to separate dispatches:
- Internal compiler rename `machineName→engineName` (~350 refs)
- Full SPEC §51 keyword sweep + worked example rewrites
- E-MACHINE-* → E-ENGINE-* rename

### Track G — P1.E dispatch (NameRes + uniform opener + warning emissions)

T2-medium via scrml-dev-pipeline (worktree-isolated). Builds on P1 baseline.

**Status: DONE.** 12 commits, +56 tests (8388→8444 post-pretest, 8484 pre-pretest), 0 regressions. Merged FF.

Shipped:
- **NameRes Stage 3.05** at `compiler/src/name-resolver.ts` (~410 LOC, bigger than 150 estimate). Wired post-MOD. Walks tag-bearing nodes; stamps `resolvedKind` + `resolvedCategory`. Shadow mode (advisory; downstream still routes on `isComponent`).
- **Uniform opener:** both `<id>` and `< id>` produce equivalent AST for db, schema, engine, machine, channel, timer, poll, request, errorBoundary
- W-CASE-001 + W-WHITESPACE-001 runtime emission live (NR-driven)
- Samples migrated to `<engine>` (machine-basic, machine-002-traffic-light, rust-dev-debate-dashboard) — 0 remaining `<machine>` keyword sites
- Dedicated W-DEPRECATED-001 regression tests (replaced incidental sample-based coverage)
- SPEC §15.15 + §34 + PIPELINE Stage 3.05 flipped from "documented" to "implemented (shadow mode)"
- Performance within 10% (14.45-15.91s vs 14.51 baseline)
- Wart: agent renamed gauntlet stage labels in api.js (3.05/3.06 → 3.005/3.006) to avoid clash with NR. Defensible.

New finding (informational): 60 new W-WHITESPACE-001 warnings firing on `samples/compilation-tests/` — pre-existing samples use `< db>` style. Not a bug; deprecation warning doing its job. Migration is its own dispatch (or P4 `scrml-migrate`).

### Track H — P2 dispatch (`export <ComponentName>` direct grammar)

T2-medium-to-large via scrml-dev-pipeline (worktree-isolated). The user-visible win.

**Status: DONE on `changes/p2`.** 8 commits, +18 tests, 0 regressions. **NOT merged immediately** — semantic gap surfaced (see Track I).

Shipped (on the branch):
- SPEC §21.2 amendment — Form 1 (`export <ComponentName attrs>{body}</>`) + Form 2 (legacy `export const Name = <markup>`) both documented
- TAB recognizes `export <Identifier ...>` at top level
- MOD exportRegistry shape-equivalent for both forms
- Cross-file imports work for the new form
- Both forms coexist
- Performance: ~11.13s (faster than 14.47s baseline; warm cache)

**The wrapper gap:** Agent shipped Form 1 by desugaring `export <UserBadge attrs>{body}</UserBadge>` to `export const UserBadge = <UserBadge attrs>{body}</>` — i.e., **the body gets wrapped in a `<UserBadge>` custom-element shell at render time.** Use-site `<UserBadge name="Alice"/>` renders as `<UserBadge name="Alice"><span class="badge">Alice</span></UserBadge>` with extra outer custom element. Agent documented as "deferred refinement" — adopters told to use Form 2 if they want byte-equivalent HTML.

User-facing impact: defeats the unification intent. PA surfaced; user chose option (a) — block merge, fix the wrapper before shipping.

### Track I — P2 wrapper fix dispatch

T1-medium follow-up via scrml-dev-pipeline. Builds on `changes/p2` (worktree at startup merges P2 in).

**Status: DONE on `changes/p2-wrapper`.** 7 new commits on top of P2's 8 (15 total ahead of P1.E), +17 tests (8462→8479), 0 regressions. Merged FF post-completion.

Shipped:
- TAB desugaring fixed — body's root element absorbs outer attrs (typed-prop declarations + non-typed attrs)
- E-EXPORT-002 (body must be single-rooted) + E-EXPORT-003 (outer/inner attr name conflict) emit
- SPEC §21.2 caveat dropped — byte-equivalence is now normative
- SPEC §21.6 — new error codes catalogued
- 14 unit tests (AST equivalence) + 3 integration tests (HTML byte-equivalence) verify Form 1 + Form 2 are equivalent

**New finding (pre-existing, not P2-introduced) — F-COMPONENT-004:** `substituteProps` in CE walks markup text + attr values but NOT into logic-block bodies (ExprNodes inside `${...}` blocks within component bodies). So component bodies with logic-block prop refs error at TS as undeclared identifiers. Affects both Form 1 and Form 2 equally (parity test the agent left correctly asserts SAME errors). User chose option 2 — fix now in a small dispatch.

### Track J — F-COMPONENT-004 fix (IN FLIGHT at hand-off pre-save)

T1-medium-to-T2-small dispatch via scrml-dev-pipeline. First attempt **HALTED at startup verification** — harness gave the worktree a stale base (S51 close `3338377` instead of current main `966a493`). Agent correctly halted per startup-verification protocol; clean exit, no damage.

**Re-dispatched** with explicit stale-base recovery prelude (`git reset --hard main` + symlink check + pretest regen). Currently running.

Scope:
- `substituteProps` extended to walk into logic-block bodies (ExprNodes)
- Shadowing-aware: lambda parameters, local declarations, template literals, nested logic blocks
- New helper `substitutePropsInExprNode(node, propMap, shadowedSet)`
- Tests: basic, member, lambda shadowing, local shadowing, template literal, nested
- Form 1 + Form 2 parity test updated from "same errors" → "same success"
- SPEC + FRICTION updates

**State at pre-save:** dispatched; will notify when complete. If F-COMPONENT-004 lands clean, next move is decide: merge + dispatch next (P3 cross-file inline-expansion? Internal compiler rename? SPEC §51 sweep?) — OR wrap session.

### Track K — Bookkeeping (this hand-off + master-list + changelog + scrml-support deep-dive commits + user-voice append)

In progress at this pre-save. The session is so large that bookkeeping needs attention before more code lands.

---

## 1. Commits this session — scrmlTS (30 commits ahead of origin at pre-save)

```
966a493 fix(p2-wrapper): Form 1 byte-equivalent to Form 2; E-EXPORT-002 + E-EXPORT-003
fb70f7e WIP(p2-wrapper): update prior P2 cross-file test header — drop deferred-refinement note
509e42a WIP(p2-wrapper): SPEC §21.2 + §21.6 — drop deferred-refinement caveat; new error codes
d4b68a7 WIP(p2-wrapper): tests — AST equivalence + HTML equivalence + new error emissions
dc095c9 WIP(p2-wrapper): re-invoke BS on synthesized raw — preserve nested logic blocks
ed629f7 WIP(p2-wrapper): ast-builder desugaring — body-root absorbs outer attrs
e347173 WIP(p2-wrapper): pre-snapshot — verified P2 baseline 8462p/0f/40s, branch created
e02f0e1 fix(p2): state-as-primary Phase P2 — export <ComponentName> direct grammar
2b234b3 WIP(p2): SPEC-INDEX + PIPELINE updates if contracts changed
7b9244b WIP(p2-tests): use-site verification (CE finds component regardless of export form)
908103e WIP(p2-tests): cross-file integration — new form, legacy form, both coexisting
03044a9 WIP(p2-tests): new-form parsing + AST shape verification
451d24e WIP(p2-tab): block-splitter + ast-builder recognize export <Identifier ...> at top level
6a59a13 WIP(p2): SPEC §21.2 — export <ComponentName> canonical form normative paragraph + worked examples
7cb18e7 WIP(p2): pre-snapshot — baseline 8444p/0f, branch created
1a89e84 fix(p1.e): NameRes shadow mode + uniform opener + W-CASE-001/W-WHITESPACE-001 emission + samples — 8388→8444, 0 regressions
3f580e8 WIP(p1.e-docs): rename gauntlet check stage labels in api.js (3.05/3.06 → 3.005/3.006) — avoid clash with NR
c53a1bd WIP(p1.e-docs): SPEC §15.15 + §34 + PIPELINE Stage 3.05 — implementation-status updates
513c4d5 WIP(p1.e-samples): migrate machine-basic + traffic-light + rust-dev-debate-dashboard to <engine>
a916fcb WIP(p1.e-samples): dedicated W-DEPRECATED-001 regression tests
7ba5f05 WIP(p1.e-nr): tests — per-category resolution + W-CASE-001/W-WHITESPACE-001 emission + cross-file
41028de WIP(p1.e-nr): name-resolver.ts shadow-mode implementation + wired into pipeline post-MOD
2281710 WIP(p1.e-bs): propagate openerHadSpaceAfterLt to AST nodes; self-host parity test strips new fields
db47b2d WIP(p1.e-bs): tests — opener-form equivalence across lifecycle keywords
b6b6204 WIP(p1.e-bs): ast-builder uniform-opener gap-fill (lifecycle markup<->state normalization)
38737b2 WIP(p1.e-bs): block-splitter records openerHadSpaceAfterLt; permits self-closing < id/>
6f97329 WIP(p1.e): pre-snapshot — baseline 8388p/0f, branch created
0334942 fix(p1): state-as-primary Phase P1 partial + engine rename — 8388p/0f, 0 regressions
6271387 WIP(p1): SPEC §51.3.2 + PIPELINE Stage 3.05 — engine canonical + NR design contract
e943045 WIP(p1-er-cascade): dispatch-app hos.scrml + FRICTION.md → engine keyword
7c416ff WIP(p1-er): tests — engine keyword equivalence + W-DEPRECATED-001 emission
7990df4 WIP(p1-er): ast-builder accepts <engine> + emits W-DEPRECATED-001 on <machine>
24013c7 WIP(p1): SPEC §15.15 + §34 catalog — unified registry + 3 new W- codes
8b03730 WIP(p1): SPEC §4.3 + §15.6 + §15.8 + §15.12 — case-rule softening
ea89552 WIP(p1): pre-snapshot — baseline 8380p/0f, branch created
3338377 (S51 close baseline)
```

Plus wrap commits at session close (this hand-off, master-list refresh, changelog refresh, FRICTION cleanup if F-COMPONENT-004 lands).

## 2. Worktrees alive at pre-save

| Branch | Worktree | Status |
|---|---|---|
| `changes/w6` | `agent-a566c25e34a40eb59` | PARKED (10 commits; F-MACHINE-001 fix + §21.2 SHALL NOT user-rejected) |
| `changes/p1` | `agent-adb1e9fcff0438c67` | MERGED (clean up at session close) |
| `changes/p1.e` | `agent-ab3e556bd7b2c54e7` | MERGED (clean up at session close) |
| `changes/p2` | `agent-a8ef6c464e352adea` | MERGED via p2-wrapper (clean up) |
| `changes/p2-wrapper` | `agent-a1a5ade61ee6b2c5e` | MERGED (clean up) |
| `changes/f-component-004` (1st attempt) | `agent-a62ec1989b2f7298a` | HALTED (stale base; clean up — no work done) |
| `changes/f-component-004` (2nd attempt) | `agent-a2eda9e889fd5ccef` | IN FLIGHT |

Worktree cleanup not blocking; can be done at session close or background.

---

## 3. Test count timeline

| Checkpoint | Pass | Skip | Fail | Files | Notes |
|---|---|---|---|---|---|
| S51 close (`3338377`) | 8,380 | 40 | 0 | 400 | Baseline entering S52 |
| W6 worktree | 8,395 | 40 | 0 | 402 | Not merged |
| P1 merge (`0334942`) | 8,388 | 40 | 0 | 401 | +8 |
| P1.E merge (`1a89e84`) — pre-pretest | 8,484 | 40 | 0 | 405 | +96 |
| P1.E post-pretest | 8,444 | 40 | 0 | 405 | (pretest regen; baseline for P2) |
| P2 worktree | 8,462 | 40 | 0 | 408 | +18 |
| P2-wrapper merge (`966a493`) | 8,479 | 40 | 0 | 410 | +17 |
| P2-wrapper post-pretest (current) | **8,519** | 40 | 0 | 410 | Pre-pretest reading discrepancy |

**Net delta from S51 close: +139 pass, 0 skip change, 0 fail change, +10 files.** Zero regressions across all 5 fix-dispatch waves.

(F-COMPONENT-004 will add another delta when the dispatch lands.)

---

## 4. Audit / project state

### S52 dispatch inventory (so far)

8 dispatches:
1. W6 — F-MACHINE-001 + F-CHANNEL-003 paired (T2-medium, PARTIAL, PARKED)
2. DD1 — state-as-primary unification (research, T3, DONE inline-then-rescued)
3. DD2 — parser disambiguation feasibility (research, T2-large, DONE inline-then-rescued)
4. DD3 — prior art survey (research, T2-large, FAILED at 600s stall)
5. DD4 — state-type body grammar (research, T2-large, DONE wrote-to-disk)
6. Debate — Approach A vs B (T2-large, DONE, A wins 93/110)
7. P1 — case-soften + engine rename (T2-large, PARTIAL but adequate, MERGED)
8. P1.E — NameRes + uniform opener + warning emissions (T2-medium, DONE, MERGED)
9. P2 — `export <ComponentName>` direct grammar (T2-medium-to-large, DONE on branch with semantic gap)
10. P2-wrapper — Form 1 byte-equivalent to Form 2 (T1-medium, DONE, MERGED via p2-wrapper)
11. F-COMPONENT-004 (1st) — substituteProps logic-block walk (HALTED, clean exit)
12. F-COMPONENT-004 (2nd) — same scope re-dispatched with stale-base recovery (IN FLIGHT)

### S51 P0s status (carry forward + new)

| ID | S51 close | S52 status |
|---|---|---|
| F-AUTH-001 | UVB closed silent window (warn) | Same. Ergonomic completion (W7) deferred. |
| F-AUTH-002 | Layer 1 only; W5a + W5b deferred | Same. P3 territory. |
| F-COMPONENT-001 | UVB + W2 architectural; F4 caveat | F4 nested-PascalCase (F-COMPONENT-003 candidate) still open. P3 territory. |
| F-RI-001 | FULLY RESOLVED via W4 structural walk | Same. |
| F-CHANNEL-001 | UVB closed | Same. |
| F-COMPILE-001 | E-CG-015 + dist tree preserved | Same. |
| F-COMPILE-002 | RESOLVED | Same. |
| F-BUILD-002 | RESOLVED | Same. |
| F-SQL-001 | RESOLVED | Same. |
| F-MACHINE-001 (now F-ENGINE-001 in spirit) | OPEN; W6 fix parked | OPEN. P3 will close architecturally. |
| F-CHANNEL-003 | OPEN; W6 only Layer 1 (parked) | OPEN. P3 territory. |

### Newly-surfaced findings during S52

| ID | Status | Source dispatch |
|---|---|---|
| **F-COMPONENT-004** (P1) | IN FLIGHT (2nd dispatch) — `substituteProps` doesn't walk logic-block bodies | P2-wrapper exposed |
| **8 historical concessions catalogued** (DD1 §3) | Approach A removes all 8 over P1-P4 phases | DD1 |

### Decisions made during S52 (load-bearing)

- **Approach A** ratified (state-as-primary, full unification across markup-shaped state-types)
- **Engine rename** (machine → engine) — landing in P1, NOT deferred (overrode DD4 default)
- **Whitespace-after-`<` direction:** warn-then-error (W- in P1, E- in P3); migrate via `scrml-migrate`
- **Body grammar direction:** uniform with extension points (DD4 designed)
- **All 7 DD1+DD4 OQs at defaults:**
  - DD1-2 lowercase user state-types: warn on HTML collision (W-CASE-001 narrow)
  - DD1-3 `export const Name = <markup>` legacy form: keep as transitional sugar indefinitely
  - DD1-4 cross-file channel store identity: per-importer (matches W6b inline-expansion plan)
  - DD1-5 §52 authority: keep as attribute (orthogonal)
  - DD1-6 F-AUTH-002 modifier prefix: BOTH (functions keep modifier-prefix; state-types use attributes)
  - DD4-3 `<formResult>` default-rendering: defer to T3
  - DD1-7 / debate question: ratified Approach A via debate
- **W6 disposition:** parked (not merged; not discarded; revisit at P3 dispatch time when F-MACHINE-001 architectural fix lands and W6's tactical fix becomes redundant)

---

## 5. ⚠️ Things the next PA needs to NOT screw up

1. **F-COMPONENT-004 IS IN FLIGHT.** The 2nd dispatch (after stale-base halt) is running. Don't dispatch overlapping work on `compiler/src/component-expander.ts` while it's running. Don't merge anything to main that conflicts with the worktree's expected baseline (`966a493`).

2. **`changes/w6` is parked, NOT discarded.** Disposition deferred. The branch contains:
   - F-MACHINE-001 fix (TAB synthesizes sibling type-decl) — salvageable but redundant once P3 lands
   - §21.2 SHALL NOT against `export <markup>` — **WRONG DIRECTION; must NOT be merged.** Approach A removes it.
   - §38.4.1 channel per-page carveout with W6b deferral — also wrong direction; P3 supersedes.
   - When W6 disposition is finally settled, options are: (a) cherry-pick F-MACHINE-001 fix only as a standalone commit pre-P3, then discard the rest; (b) discard entirely and let P3 redo F-MACHINE-001 architecturally; (c) merge nothing (default until decision).

3. **P1 is PARTIAL (adequate but not complete).** The full Phase P1 per DD1 §9.1 includes everything that landed in P1 + P1.E. Treat them as "P1 = P1 + P1.E together" for accounting purposes.

4. **Test count discrepancy.** Pre-pretest vs post-pretest test counts diverge by ~40 tests. The "true" count is post-pretest (8519 currently). Pre-pretest readings (8484) come from `bun test` without prior `bun run pretest`. This is a known pretest-regen artifact, not a bug.

5. **NameRes is in SHADOW MODE.** Stage 3.05 walks the AST and stamps `resolvedKind` + `resolvedCategory` on every tag node — but downstream stages (CE, MOD, TS, codegen) STILL route on `isComponent`. The 63 isComponent references DO NOT migrate yet. That's deferred to a separate dispatch (or part of P3). NR's outputs are advisory; only consumed by W-CASE-001 + W-WHITESPACE-001 emission so far.

6. **60 new W-WHITESPACE-001 warnings firing on samples/.** Pre-existing samples use `< db>` style; deprecation warning fires correctly. Not a bug. Migration to no-space form is its own dispatch (or P4 `scrml-migrate`).

7. **`--no-verify` policy carried from S51 STILL OPEN.** No violations in S52 (clean across all 5 dispatches). But the question of whether to formalize TDD red commits / `WIP:` prefix exemption is unresolved.

8. **Wart in api.js stage label rename.** P1.E agent renamed gauntlet check stage labels (3.05/3.06 → 3.005/3.006) to avoid clash with NR's Stage 3.05. Cosmetic but worth noting if anyone audits the stage numbering.

9. **Multi-session phase plan ahead (per DD1 §9.1):**
   - **P3** (T3, ~10-15 days): cross-file `<channel>`/`<engine>` inline-expansion. Closes F-CHANNEL-003 + F-MACHINE-001 architecturally. Supersedes W6's tactical fixes. Will need its own design dive on the inline-expansion mechanism.
   - **P4** (T1-small, ~2-3 days): `scrml-migrate` CLI command — rewrites `export const Name = <markup>` → `export <Name>...</>`, strips `< db>` whitespace, etc.
   - **Internal compiler rename** `machineName→engineName` (~350 refs) — pure mechanical sweep. T2-small. Can run any session.
   - **SPEC §51 keyword sweep** — paperwork dispatch. T1-small.
   - **NameRes promotion to authoritative routing** — migrates 63 `isComponent` references to `kind` switches across CE, MOD, TS, codegen. Likely part of P3 or its own dispatch.

10. **Authorization scope discipline.** S52's pattern: explicit per-action greenlights ("go", "fine to merge", "ratify yes", "2 fix go") + parallel parking for W6. **Does NOT carry into S53.** Re-confirm before merge / push / cross-repo write / dispatch.

11. **Tutorial Pass 3-5 + 5 unpublished article drafts STILL pending** — multi-session carry-forward.

12. **Master inbox stale messages** STILL OPEN (S26 giti, S43 reconciliation, S49 + S51 push-needs). Plus an S52 push-needs notice will be filed at session close. Master's queue.

---

## 6. Open questions to surface immediately at S53 open

- **F-COMPONENT-004 outcome?** Did the re-dispatch land cleanly? If yes, merge + decide next.
- **Push state confirmed at S52 close?** Or pending?
- **W6 disposition** — finally make the call or defer indefinitely?
- **First move on S53?** Plausible candidates:
  - P3 (cross-file channel/engine inline-expansion) — biggest architectural win remaining; T3
  - Internal compiler rename `machineName→engineName` (~350 refs) — mechanical; T2-small
  - SPEC §51 keyword sweep — paperwork; T1-small
  - F-COMPONENT-003 (nested-PascalCase Phase-1 limitation) — T2 parser fix
  - F-PARSER-ASI sweep (30 trailing-content warnings) — T2 batch
  - W3-W12 carry-forward queue from S51 (W7/W8/W9/W10/W11/W12) — many small dispatches
- **`--no-verify` policy** still unresolved.
- **Next-session test-count baseline** — post-pretest authoritative (8519 + F-COMPONENT-004 delta).

---

## 7. User direction summary (the through-line)

Verbatim user statements + interpretations (S52). To be appended to `scrml-support/user-voice-scrmlTS.md` per pa.md.

### Session start

**User (verbatim):**
> read pa.md and start session

PA followed session-start checklist. Both repos clean and 0/0 with origin pre-fetch.

### W6 dispatch authorization

**User (verbatim):**
> w6 go

PA dispatched W6 (F-MACHINE-001 + F-CHANNEL-003 paired) per S51 queue. Agent shipped F-MACHINE-001 + F-CHANNEL-003 Layer 1 (silent→loud E-EXPORT-001 against `export <markup>`).

### THE LOAD-BEARING STATEMENT — architectural pivot triggered

User saw W6's §21.2 SHALL NOT and the wrap-in-const-becomes-mandatory direction it locked in.

**User (verbatim, S52 — the architecturally-pivotal statement):**
> I'll be honest. I have whatched the language "I'm" building drift from the language I envisioned for some time now. I believe the first conscession was that pascal naming convention to syntax decision. and it has continued, a little at a time. until now. I see something that is basically unacceptable. I am wondering about all of the syntax decisions made and wondering if there is simplification somewhere that we could pick up easily if we consider all options. I do know that I want export <ComponentName>. my original thoughts were, if the language knows <jimmy> isnt a predifined state than it looks for a user defined state. Also, I have never seemed to be able to de-conflate state and markup to "agents". Im not sure my intent of "we need a syntax for state. Markup is state. Perhaps state steals markups syntax, and markup symply becomes a subset of state. it is afterall, right, it is a state type with explicit display attributes. that doesnt mean that state HAS to have displayed attributes". dont pander to me. Is this making sense? the fact is, I will spend as meany tokens and as much time as I need to to get this right.

**Durable interpretation (4 load-bearing claims):**
1. State is the primitive; markup is the subset of state that has display attributes
2. Tag-name resolution is universal — `<jimmy>` resolves through one registry (built-in + user-defined), no case discriminator
3. `export <ComponentName>` is canonical — wrap-in-const is the unwanted concession
4. PascalCase-vs-lowercase as parse-time discriminator was the FIRST concession; the drift starts there

This statement triggered DD1+DD2+DD3+DD4+debate+P1+P1.E+P2+P2-wrapper+F-COMPONENT-004 — all of S52's architectural work.

### Deep-dive authorization

**User (verbatim):**
> deep dive. start multiple if its worth it

PA dispatched DD1+DD2+DD3 in parallel. DD4 followed when user pre-decided "uniform with extension points" for body grammar.

### Machine body + engine question

**User (verbatim):**
> A Im thinking of changing the word to engine (instead of machine). but far beyond that, <machine> has this wird thing, it looks like state <thing> but its internal syntax rejects anything but its own kindof match syntax. this feels bolted on and unnatural. why cant a machine (engine) handle markup and other state types in it? I do understand the idea of reusability. I am not sure ( I totally could be wrong. Im not all knowing). Is any of this worth more deep-diving before we start debating and deciding?

**Durable interpretation:** state-type body grammars should be uniform (markup + logic + nested state-types as base) with per-state-type extension points. Engine rename floated; not committed yet (decided later).

### Body grammar + whitespace decisions

**User (verbatim, in response to options):**
> uniform with extension points, whitespace warn then error, 2

→ Authorized: DD4 launches with uniform-with-extension-points as pre-decided direction. Whitespace-after-`<` follows warn-then-error path. Option 2 = launch DD4.

### Debate authorization (with humor)

**User (verbatim):**
> lets debate for shits and giggles

→ Authorized debate-curator dispatch even though the technical case for Approach A was already strong. Debate ceremony preserves deliberation record. Verdict: Approach A wins 93/110.

### Ratification (THE big-decision turn)

**User (verbatim):**
> ratify yes. engine yes . other qs default. go

→ Approach A ratified. Engine rename = yes (DO IT in P1, overrode DD4's defer recommendation). All 7 OQs at defaults. Go = dispatch P1.

### W6 parking + keep going

**User (verbatim):**
> park w6 keep going

→ W6 stays parked (no decision yet on discard/cherry-pick). Continue forward — implicitly authorize merging P1.E + dispatching P2.

### Wait-then-merge for P1, fine-to-merge for P1.E

**User (verbatim, sequential):**
> wait to merge

(at P1.E completion, when PA asked merge-vs-hold)

> fine to merge

→ Pattern established: each P-stage merges when complete and clean.

### P2 wrapper-gap rejection

**User (verbatim):**
> a

→ Block P2 merge until wrapper fix lands. Form 1 must be byte-equivalent to Form 2.

### F-COMPONENT-004 fix authorization

**User (verbatim):**
> 2 fix go

→ Option 2 = fix F-COMPONENT-004 now in a small dispatch. Go = dispatch.

### Bookkeeping authorization

**User (verbatim):**
> go your reco

→ At PA's recommendation: sweep through hand-off + user-voice + master-list + changelog + scrml-support deep-dive commits while F-COMPONENT-004 runs.

### Through-line for S52

User mode through the session:
- **Architectural pivot mode + per-action greenlights.** The S52 statement was the load-bearing direction-set; subsequent decisions were per-action ratifications maintaining velocity.
- **Willing to spend tokens.** "I will spend as meany tokens and as much time as I need to to get this right" — explicitly removes the cost objection. Drove the 4-dive + debate sequence.
- **Decisive on direction, conservative on cost.** Ratified Approach A (the most expensive option) but folded engine rename into P1 (cost-saving). Block-merge on P2 wrapper gap rather than ship-and-fix.
- **Pattern recognition + meta-feedback.** "It has been one of the most consistently complained about syntax choices" (whitespace) — synthesizes prior friction without needing to be reminded.
- **Validation principle still load-bearing** — `export <markup>` SHALL NOT was rejected because it locked in the wrap-in-const concession; user noticed within hours.

### Authorization scope (closing note)

S52's per-action authorization pattern was scoped throughout. **It does NOT carry into S53.** Per pa.md "Authorization stands for the scope specified, not beyond." Next session should re-confirm before any merge / push / cross-repo write / dispatch.

---

## 8. Tasks (state at hand-off pre-save)

| # | Subject | State |
|---|---|---|
| W6 — F-MACHINE-001 + F-CHANNEL-003 paired | T2-medium | PARKED (10 commits on changes/w6; never merged) |
| DD1 — state-as-primary unification | T3 research | DONE — 1170+ lines |
| DD2 — parser disambiguation feasibility | T2-large research | DONE — 700+ lines, FEASIBLE-WITH-COST |
| DD3 — prior art survey | T2-large research | FAILED at 600s stall; PA skipped re-launch |
| DD4 — state-type body grammar | T2-large research | DONE — 1187 lines, uniform-with-extensions |
| Debate — A vs B | T2-large | DONE — A wins 93/110 |
| P1 — case-soften + engine keyword | T2-large fix | DONE (PARTIAL but adequate), MERGED `0334942` |
| P1.E — NameRes + uniform opener + warnings | T2-medium fix | DONE, MERGED `1a89e84` |
| P2 — `export <ComponentName>` direct grammar | T2-medium-to-large | DONE on branch with semantic gap |
| P2-wrapper — Form 1 byte-equivalent | T1-medium follow-up | DONE, MERGED via `966a493` |
| F-COMPONENT-004 — substituteProps logic-block walk | T1-medium-to-T2-small | IN FLIGHT (2nd dispatch after stale-base halt) |
| P3 — cross-file `<channel>`/`<engine>` inline-expansion | T3 | OPEN — biggest architectural remaining |
| P4 — `scrml-migrate` CLI | T1-small | OPEN |
| Internal compiler rename `machineName→engineName` | T2-small | OPEN — ~350 refs mechanical |
| SPEC §51 keyword sweep + worked example rewrites | T1-small | OPEN — paperwork |
| E-MACHINE-* → E-ENGINE-* code rename | T1-small | OPEN — paperwork |
| NameRes promotion to authoritative routing | T2-medium | OPEN — 63 isComponent migrations |
| F-COMPONENT-003 — nested-PascalCase Phase-1 limitation | T2 | OPEN — pre-S52 carry-forward |
| F-COMPILE-003 — pure-helper export emission | T2 | OPEN — pre-S52 carry-forward |
| W5a — pure-fn library auto-emit | T2-medium | OPEN — pre-S52 carry-forward |
| W5b — cross-file `?{}` resolution | T2-medium → T3 | OPEN — depends on W5a |
| W7 — F-AUTH-001 ergonomic completion | T3 | OPEN — pre-S52 carry-forward |
| W8 — F-LIN-001 + F-RI-001-FOLLOW paired | T2-small × 2 | OPEN — pre-S52 carry-forward |
| W9-W11 — paper cuts + diagnostic bugs + docs | T1-small × multiple | OPEN — pre-S52 carry-forward |
| F-PARSER-ASI sweep (30 warnings) | T2 batch | OPEN — pre-S52 carry-forward |
| Tutorial Pass 3-5 (~30h) | docs | NOT STARTED — pre-S52 |
| 5 unpublished article drafts | user-driven publish | PENDING — pre-S52 |
| Master inbox stale messages | bookkeeping | OPEN — master's queue |

---

## 9. needs:push state

scrmlTS commits on `main`: **30 commits ahead of origin** at hand-off pre-save (P1+P1.E+P2+P2-wrapper merged). Will be 30+N after F-COMPONENT-004 lands and any wrap commits.

scrml-support: 0 commits ahead of origin BUT 5 untracked files (DD1, DD2, DD4, DD3-progress, DD4-progress) + needs user-voice S52 append. These will be committed as part of bookkeeping at session close.

**S52 close push: PENDING USER AUTHORIZATION.** Per pa.md cross-machine sync hygiene, push at session close is the standard pattern. Surface explicitly when wrapping.

---

## 10. File modification inventory (forensic — at hand-off pre-save)

### scrmlTS — modified files this session (across P1+P1.E+P2+P2-wrapper merged + F-COMPONENT-004 worktree-pending)

**Compiler source:**
- `compiler/src/ast-builder.js` — P1 engine keyword + W-DEPRECATED; P1.E uniform opener; P2 export-decl; P2-wrapper desugaring fix
- `compiler/src/block-splitter.js` — P1.E uniform opener
- `compiler/src/api.js` — P1.E NameRes wiring (+ stage label rename wart)
- `compiler/src/name-resolver.ts` — NEW P1.E (~410 LOC)
- `compiler/src/gauntlet-phase1-checks.js` — P2 (small)

**Tests:**
- `compiler/tests/unit/engine-keyword.test.js` — NEW P1 (8 tests)
- `compiler/tests/unit/p1e-uniform-opener-bs.test.js` — NEW P1.E
- `compiler/tests/unit/p1e-uniform-opener-equivalence.test.js` — NEW P1.E
- `compiler/tests/unit/p1e-name-resolver.test.js` — NEW P1.E (most of the +56 from P1.E)
- `compiler/tests/unit/p1e-engine-keyword-regression.test.js` — NEW P1.E (replaces sample-based coverage)
- `compiler/tests/unit/p2-export-component-form1.test.js` — NEW P2
- `compiler/tests/integration/p2-export-component-form1-cross-file.test.js` — NEW P2
- `compiler/tests/integration/p2-export-component-form1-use-site.test.js` — NEW P2
- `compiler/tests/unit/p2-wrapper-byte-equivalence.test.js` — NEW P2-wrapper
- `compiler/tests/integration/p2-wrapper-html-equivalence.test.js` — NEW P2-wrapper
- `compiler/tests/self-host/ast.test.js` — P1.E AST shape parity update

**Spec / docs (across all dispatches merged):**
- `compiler/SPEC.md` — §4.3, §15.6, §15.8, §15.12, §15.15 NEW, §21.2, §21.6, §34, §51.3.2 catalog amendments
- `compiler/SPEC-INDEX.md` — P2
- `compiler/PIPELINE.md` — P1 Stage 3.05 documented; P1.E Stage 3.05 IMPLEMENTED status flip; P2

**Examples / samples:**
- `examples/14-mario-state-machine.scrml` — `<engine>` migration
- `examples/23-trucking-dispatch/pages/driver/hos.scrml` — `<engine>` migration
- `examples/23-trucking-dispatch/FRICTION.md` — engine keyword
- `samples/compilation-tests/machine-basic.scrml` → `<engine>`
- `samples/compilation-tests/machine-002-traffic-light.scrml` → `<engine>`
- `samples/rust-dev-debate-dashboard.scrml` → `<engine>`

**Diagnosis + progress dirs (NEW under `docs/changes/`):**
- `docs/changes/p1/progress.md`
- `docs/changes/p1.e/progress.md`
- `docs/changes/p1.e/pre-snapshot.md`
- `docs/changes/p2/progress.md`
- `docs/changes/p2/pre-snapshot.md`
- `docs/changes/p2-wrapper/progress.md`
- `docs/changes/f-component-004/progress.md` (in worktree)

**Wrap files (committed at session close):**
- `hand-off.md` (this file)
- `master-list.md` (S52 entry at top)
- `docs/changelog.md` (S52 entry at top)
- `handOffs/hand-off-54.md` (this file rotated)

### scrml-support — to-be-committed files

- `docs/deep-dives/state-as-primary-unification-2026-04-30.md` (NEW — DD1, ~1170 lines)
- `docs/deep-dives/parser-disambiguation-feasibility-2026-04-30.md` (NEW — DD2, ~700 lines)
- `docs/deep-dives/state-type-body-grammar-uniform-extensions-2026-04-30.md` (NEW — DD4, 1187 lines)
- `docs/deep-dives/progress-prior-art-unified-declaration-models-2026-04-30.md` (NEW — DD3 progress; agent failed)
- `docs/deep-dives/progress-state-type-body-grammar-2026-04-30.md` (NEW — DD4 progress)
- `user-voice-scrmlTS.md` — appended at S52 close (S52 entry per §7 above)

### ~/.claude/

- `~/.claude/design-insights.md` — debate insight appended (## State-as-Primary Architectural Unification — scrml Approach A vs B)

---

## Tags
#session-52 #open #mid-flight #architectural-pivot #state-as-primary-ratified #engine-rename-folded #approach-a-91to72 #4-deep-dives #1-failed-dive #1-debate #5-fix-dispatches #4-merged #f-component-004-in-flight #w6-parked #plus-139-tests-so-far #cross-machine-sync-clean

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — refreshed S52 close
- [docs/changelog.md](./docs/changelog.md) — S52 close entry
- `docs/changes/{p1,p1.e,p2,p2-wrapper,f-component-004}/`
- `examples/23-trucking-dispatch/FRICTION.md`
- `scrml-support/docs/deep-dives/state-as-primary-unification-2026-04-30.md` — DD1
- `scrml-support/docs/deep-dives/parser-disambiguation-feasibility-2026-04-30.md` — DD2
- `scrml-support/docs/deep-dives/state-type-body-grammar-uniform-extensions-2026-04-30.md` — DD4
- `scrml-support/user-voice-scrmlTS.md` — S52 entry (appended at close)
- `~/.claude/design-insights.md` — debate insight
