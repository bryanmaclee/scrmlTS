# scrmlTS — Session 52 (CLOSED — fat wrap, push complete)

**Date opened:** 2026-04-30 (machine-A, post-S51 close — same calendar day as S51)
**Date closed:** 2026-05-02 (session crossed midnight TWICE; long architectural session)
**Previous:** `handOffs/hand-off-53.md` (S51 close — fat wrap, 12 dispatches, +184 tests)
**Baseline entering S52:** scrmlTS at `3338377` (S51 close, pushed); 8,380 pass / 40 skip / 0 fail / 400 files. scrml-support at `2687e48` (S51 close, pushed); 0/0 with origin.
**State at S52 close:** scrmlTS at `6e2aa4c` (32 commits past S51 close, pushed); **8,491 pass / 40 skip / 0 fail / 412 files**. scrml-support at `f016dad` + 2 untracked P3 files (committed at this wrap). **Net delta from S51 close: +111 pass, 0 skip change, 0 fail change, +12 files. Zero regressions across all 5 fix-dispatch waves.**

---

## 0. The big shape of S52

**The architectural-pivot session.** Triggered by the user's S52 verbatim statement (see §7) calling out that scrml has been "drifting from the language I envisioned" — identifying PascalCase-as-discriminator as the first concession and proposing **state-as-primary unification** (markup as a subset of state with display attributes). Day 1 of multi-day architectural work.

The W6 dispatch (carry-over from S51 plan) shipped Layer 1 of F-CHANNEL-003 + F-MACHINE-001 with a §21.2 SHALL NOT against `export <markup>` — and the user immediately identified that as "basically unacceptable." That single rejection triggered the entire pivot.

**Net session outcome:**
- **Approach A (state-as-primary unification) ratified** via 6-expert debate (93/110 vs B 71.5/110)
- **Engine rename** (machine → engine) folded into P1
- **Whitespace warn-then-error** decided
- **Body grammar uniform-with-extension-points** decided
- **5 fix-dispatch waves merged** (P1, P1.E, P2, P2-wrapper, F-COMPONENT-004) — +111 tests, 0 regressions
- **4 deep-dives + 1 debate + 1 P3 design dive** completed
- **8 historical concessions catalogued** for removal across P1-P4 phases
- **Both repos pushed to origin**

### Track A — W6 dispatch (consequential, PARKED — recommended for discard)

T2-medium dispatch via scrml-dev-pipeline (worktree-isolated). Carry-over from S51's queue.

- **F-MACHINE-001 fully RESOLVED** — TAB synthesizes sibling `type-decl` for `export type X:kind = {...}`; cross-file `<machine for=ImportedType>` works. E-MACHINE-004 message corrected. SPEC §51.3.2.5 + §41.2 amendments.
- **F-CHANNEL-003 PARTIAL (Layer 1 only)** — Agent unilaterally chose to ship a SHALL NOT against `export <markup>` (E-EXPORT-001) instead of the diagnosis's recommended inline-expansion approach. The §38.4.1 carveout documents the deferral.

User reviewed and **identified the §21.2 SHALL NOT as unacceptable** — locks in the wrap-in-const concession permanently. **W6 worktree PARKED.** Branch lives at `worktree-agent-a566c25e34a40eb59` / `changes/w6` (10 commits ahead of S51 close baseline, never merged). **P3 deep-dive recommends discarding entirely** (its mechanism preserved verbatim in P3 dive §3.1; re-writing faster than cherry-pick + adapt; eliminates risk of accidental partial merge of W6's bad SPEC amendments).

### Track B — Three parallel deep-dives (DD1+DD2+DD3)

User direction: *"deep dive. start multiple if its worth it"*. PA dispatched 3 parallel scrml-deep-dive agents.

- **DD1 — State-as-Primary Architectural Unification** (master conceptual, T3) — output ~1170 lines at `scrml-support/docs/deep-dives/state-as-primary-unification-2026-04-30.md`. Recommends Approach A. Scores Approach A 51/60 vs W6-shipped C 28/60 on 12-dimension matrix. Catalogs 8 historical concessions. Convergent dev-agent signal: 3 friction reports independently reach for Approach A-shaped fixes.
- **DD2 — Parser Disambiguation Feasibility** (T2-large) — ~700 lines at `parser-disambiguation-feasibility-2026-04-30.md`. Verdict **FEASIBLE-WITH-COST**. Built on existing W2 canonical-key infrastructure already in LSP. Eliminates Approach B (name-table-at-parse breaks per-file parallelism, lexer-hack risk).
- **DD3 — Prior Art Survey** (T2-large) — **FAILED at 600s agent stall**. PA decided to skip re-launch (DD1 §7 had 14-system catalog autonomously). Progress file remains as artifact.

DD1 and DD2 agents delivered as inline messages instead of writing to disk. PA had to manually persist them. Pattern noted; future deep-dive briefs include explicit "WRITE to disk" instruction.

### Track C — DD4 (state-type body grammar)

User-floated questions about `<machine>` body restriction and engine rename. Decided: bodies should be **uniform with extension points**. PA dispatched DD4 with that as pre-decided direction.

- **DD4** — 1187 lines at `state-type-body-grammar-uniform-extensions-2026-04-30.md`. Confirmed reusability hypothesis. **Killer finding:** SPEC §54.2-§54.3 ALREADY ships the extension-point pattern. DD4 GENERALIZES existing scrml shape, not invents.
- DD4 wrote to disk correctly (followed explicit "WRITE this to disk" brief — set the pattern P3 dive followed).

### Track D — Debate (A vs B, "for shits and giggles")

User direction: *"lets debate for shits and giggles"*. debate-curator dispatched with full pipeline. 6 panelists.

**Verdict: Approach A wins 93/110 vs Approach B's 71.5/110** (extended 11-dimension rubric).

Largest spreads favoring A: Paradigm fit (+7), Idiomaticity to user vision (+5.5), Cross-file architectural cleanup (+5), Spec coherence (+4.5).
Largest spread favoring B: Compiler complexity (+3) — A is ~4x the implementation cost.

Tie-breaker: convergent dev-agent signal. Honest minority position from B camp on per-category type distinctness — informs implementation: A's `StateTypeDeclNode` must carry strong `category` discriminator. DD4's already-shipped `StateTypeRegistration` does this.

Design insight appended to `~/.claude/design-insights.md`.

### Track E — User ratification

**User (verbatim):** *"ratify yes. engine yes . other qs default. go"*

Ratified:
- Approach A (state-as-primary unification)
- Engine rename (machine → engine) — DO IT in P1 (overrode DD4's defer recommendation)
- All 7 unanswered OQs at defaults

### Track F — P1 dispatch (case-soften + whitespace warn + engine rename)

T2-large via scrml-dev-pipeline (worktree-isolated). Lowest-risk first commit per DD1 §9.1.

**Status: PARTIAL but adequate.** 8 commits, +8 tests (8380→8388), 0 regressions. Merged FF as `0334942`.

Shipped:
- SPEC §4.3, §15.6, §15.8, §15.12 case-rule softening (SHALL → MAY)
- SPEC §15.15 NEW — unified state-type registry section
- 3 new warning codes catalogued: W-CASE-001, W-WHITESPACE-001, W-DEPRECATED-001
- TAB recognizes both `<engine>` and `<machine>`; W-DEPRECATED-001 emission on `<machine>`
- 2 examples migrated to `<engine>`; SPEC §51.3.2 engine canonical
- PIPELINE Stage 3.05 NameRes design contract documented

### Track G — P1.E dispatch (NameRes + uniform opener + warning emissions)

T2-medium via scrml-dev-pipeline (worktree-isolated).

**Status: DONE.** 12 commits, +56 tests (post-pretest 8388→8444), 0 regressions. Merged FF as `1a89e84`.

Shipped:
- **NameRes Stage 3.05** at `compiler/src/name-resolver.ts` (~410 LOC, shadow mode — advisory; downstream still routes on `isComponent`)
- Uniform opener (BS accepts both `<id>` and `< id>` for all lifecycle keywords)
- W-CASE-001 + W-WHITESPACE-001 runtime emission live (NR-driven)
- Samples migrated to `<engine>`; dedicated W-DEPRECATED-001 regression tests
- SPEC §15.15 + §34 + PIPELINE Stage 3.05 flipped from "documented" to "implemented (shadow mode)"

Wart: agent renamed gauntlet stage labels in api.js (3.05/3.06 → 3.005/3.006) to avoid clash with NR. Defensible.

New finding (informational): 60 new W-WHITESPACE-001 warnings firing on `samples/compilation-tests/` — pre-existing samples use `< db>` style; deprecation warning doing its job. Migration is its own dispatch (or P4 `scrml-migrate`).

### Track H — P2 dispatch (`export <ComponentName>` direct grammar)

T2-medium-to-large via scrml-dev-pipeline (worktree-isolated). The user-visible win.

**Status: DONE on `changes/p2`.** 8 commits, +18 tests, 0 regressions. **NOT merged immediately** — semantic gap surfaced (see Track I).

Shipped (on the branch):
- SPEC §21.2 amendment — Form 1 (`export <ComponentName attrs>{body}</>`) + Form 2 (legacy `export const Name = <markup>`) both documented
- TAB recognizes `export <Identifier ...>` at top level
- MOD exportRegistry shape-equivalent for both forms
- Cross-file imports work for the new form
- Both forms coexist

**The wrapper gap:** Agent shipped Form 1 by desugaring `export <UserBadge attrs>{body}</UserBadge>` to `export const UserBadge = <UserBadge attrs>{body}</>` — body wrapped in `<UserBadge>` custom-element shell at render time. NOT byte-equivalent to Form 2. Agent documented as "deferred refinement"; PA surfaced; user chose option (a) — block merge until wrapper fixed.

### Track I — P2 wrapper fix dispatch

T1-medium follow-up via scrml-dev-pipeline. Worktree at startup merges `changes/p2` in.

**Status: DONE.** 7 new commits on top of P2's 8 (15 total ahead of P1.E), +17 tests (8462→8479), 0 regressions. Merged FF as `966a493`.

Shipped:
- TAB desugaring rewritten — body's root element absorbs outer attrs
- E-EXPORT-002 (body must be single-rooted) + E-EXPORT-003 (outer/inner attr name conflict)
- SPEC §21.2 caveat dropped — byte-equivalence is now normative
- SPEC §21.6 — new error codes catalogued
- 14 unit + 3 integration tests verify Form 1 + Form 2 byte-equivalence

**New finding (pre-existing, not P2-introduced) — F-COMPONENT-004:** `substituteProps` in CE walks markup text + attr values but NOT into logic-block bodies. Affects both Form 1 and Form 2 equally. User chose option 2 — fix now in a small dispatch.

### Track J — F-COMPONENT-004 fix

T1-medium-to-T2-small via scrml-dev-pipeline. First attempt **HALTED at startup verification** — harness gave the worktree a stale base (S51 close `3338377` instead of current main `966a493`). Agent correctly halted per startup-verification protocol; clean exit, no damage.

**Re-dispatched** with explicit stale-base recovery prelude (`git reset --hard main` + symlink check + pretest regen).

**Status: DONE.** 8 commits, +12 tests (post-recovery baseline 8479→8491), 0 regressions. Merged FF as `e95aa87`.

Shipped:
- `substituteProps` extended to walk into logic-block bodies (ExprNodes)
- Shadowing-aware: lambda parameters, local declarations (let/const/tilde/lin/@reactive/function/match-binding/loop-var/when-message-binding), template literals, nested logic blocks
- New helper `substitutePropsInExprNode(node, propMap, shadowedSet)`
- 9 unit + 3 integration tests
- Form 1 + Form 2 parity test updated from "same errors" → "same success"
- SPEC §15.10.1 NEW (normative substitution form + walked positions + shadowing rules + 3 worked examples)
- FRICTION marked RESOLVED

### Track K — Bookkeeping (mid-flight)

PA-side bookkeeping commit `6e2aa4c` while F-COMPONENT-004 ran:
- hand-off.md mid-flight pre-save (per pa.md "bloat-OK" directive)
- master-list.md S52 row at top
- docs/changelog.md S52 entry under "Recently Landed"
- scrml-support commit `f016dad` (DD1 + DD2 + DD4 + 2 progress + user-voice S52 append)

### Track L — Push complete

Both repos pushed to origin post-bookkeeping:
- scrmlTS: `3338377..6e2aa4c` (32 commits)
- scrml-support: `2687e48..f016dad` (1 commit)

### Track M — P3 deep-dive (cross-file channel + engine inline-expansion)

T3 deep-dive via scrml-deep-dive (no worktree; writes to scrml-support). **DONE** — 1029 lines at `scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` (72 KB). Agent followed DD4's pattern (wrote to disk).

**Key recommendations:**
- **Channel mechanism:** compile-time inline-expansion via CHX (CE phase 2 under UCD) — exactly W6's source pattern from `diagnosis.md` lines 138-184. No runtime changes; wire-layer-shared-by-name + per-importer @shared mirror.
- **Engine mechanism:** Two-tier. Tier 1 (P3.B necessary): TAB synthesizes `type-decl` AST node when parsing `export type X = {...}` so `<engine for=ImportedType>` works (W6 Option A pattern preserved). Tier 2 (deferred): direct `export <engine name=Name for=Type>{body}</>` — defer until adopter friction surfaces (DD4 §8.2 wrapping-component idiom suffices for current workloads).
- **CHX/EX vs unified-CE:** **UCD (unified CE category-dispatch)** — scores 51/60 vs SP 46/60. Future-extensibility decisive.
- **NameRes promotion strategy:** **Per-category in P3.A/B** — channel + engine become NR-authoritative; component stays isComponent-routed; tracked with explicit category-routing-table.
- **75 isComponent migration:** **Defer to P3-FOLLOW T2-medium dispatch** — runs 1-2 sessions after P3.B lands.
- **W6 worktree disposition:** **Discard entirely** — mechanism preserved verbatim in P3 dive §3.1; re-writing faster than cherry-pick + adapt; eliminates risk of accidental partial merge.

**Sized estimates:**
- **P3.B first** (T2-medium, ~3-5 days): TAB type-decl synthesis fix; closes F-ENGINE-001; low-risk; ~50 LOC compiler + ~75 LOC SPEC + 18 tests
- **P3.A second** (T2-large, ~5-7 days): CHX (CE phase 2) under UCD; closes F-CHANNEL-003; eliminates ~180 LOC dispatch app duplication; ~375 LOC compiler + ~260 LOC SPEC + 25 tests
- **P3-FOLLOW** (T2-medium, ~5 days): 75 isComponent migration to NR-authoritative routing

**8 OQs surfaced** in P3 dive §14. Three are gating for P3.A/P3.B implementation:
- OQ-P3-1 — UCD vs SP architectural choice (P3 recommends UCD)
- OQ-P3-3 — separate vs combined dispatches (P3 recommends separate, P3.B first)
- OQ-P3-8 — SQL-in-channel cross-file interaction with W5-FOLLOW (coordination flag)

5 minor OQs are design-internal with defaults.

---

## 1. Commits this session — scrmlTS (32 commits past S51 close, pushed)

```
6e2aa4c docs(s52): mid-flight bookkeeping — hand-off + master-list + changelog
e95aa87 fix(f-component-004): substituteProps walks logic-block bodies; shadowing-aware
f2c1db4 WIP(f-component-004): progress log update
189e323 WIP(f-component-004): SPEC §15.10.1 + FRICTION.md updates
3db16f7 WIP(f-component-004): tests — Form 1 + Form 2 parity success
852a48b WIP(f-component-004): tests — basic + member + lambda + local + template + nested
730e589 WIP(f-component-004): substitutePropsInExprNode helper + shadowing tracking
742c5f9 WIP(f-component-004): diagnosis — substituteProps gap in CE
0446ec8 WIP(f-component-004): pre-snapshot — verified P2-wrapper baseline post-recovery, branch created
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

Plus the close-wrap commit landing now (this hand-off + master-list + changelog refresh).

## 2. Commits this session — scrml-support (1 committed, 2 untracked at close — to commit at wrap)

Committed `f016dad`:
- DD1 + DD2 + DD4 deep-dives + DD3 + DD4 progress logs + user-voice S52 entry append (2,743 lines)

Untracked (committing in this wrap):
- `docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` (1029 lines)
- `docs/deep-dives/progress-p3-cross-file-inline-expansion-2026-05-02.md`

## 3. Worktrees alive at close

| Branch | Worktree | Status |
|---|---|---|
| `changes/w6` | `agent-a566c25e34a40eb59` | PARKED — recommended for discard per P3 dive |
| `changes/p1` | `agent-adb1e9fcff0438c67` | MERGED (cleanup deferred) |
| `changes/p1.e` | `agent-ab3e556bd7b2c54e7` | MERGED (cleanup deferred) |
| `changes/p2` | `agent-a8ef6c464e352adea` | MERGED via p2-wrapper (cleanup) |
| `changes/p2-wrapper` | `agent-a1a5ade61ee6b2c5e` | MERGED (cleanup) |
| `changes/f-component-004` (1st) | `agent-a62ec1989b2f7298a` | HALTED (clean exit; cleanup) |
| `changes/f-component-004` (2nd) | `agent-a2eda9e889fd5ccef` | MERGED (cleanup) |

Worktree cleanup is housekeeping — `git worktree prune` or per-worktree removal. Not blocking.

---

## 4. Test count timeline

| Checkpoint | Pass | Skip | Fail | Files | Notes |
|---|---|---|---|---|---|
| S51 close (`3338377`) | 8,380 | 40 | 0 | 400 | Baseline entering S52 |
| W6 worktree (parked) | 8,395 | 40 | 0 | 402 | Not merged |
| P1 merge (`0334942`) | 8,388 | 40 | 0 | 401 | +8 |
| P1.E merge (`1a89e84`) post-pretest | 8,444 | 40 | 0 | 405 | +56 (effective) |
| P2 worktree | 8,462 | 40 | 0 | 408 | +18 (not direct-merged; via p2-wrapper) |
| P2-wrapper merge (`966a493`) | 8,479 | 40 | 0 | 410 | +17 |
| F-COMPONENT-004 merge (`e95aa87`) | 8,491 | 40 | 0 | 412 | +12 |
| Bookkeeping commit (`6e2aa4c`) | 8,491 | 40 | 0 | 412 | (no test change) |
| **S52 close (post-wrap commit)** | **8,491** | **40** | **0** | **412** | (will be same after wrap commit lands) |

**Net delta from S51 close: +111 pass, 0 skip change, 0 fail change, +12 files. Zero regressions across all 5 fix-dispatch waves.**

(8,531 = 8491 pass + 40 skip total — sometimes reported by `bun test` "Ran X tests" vs the "8519 pass" pre-pretest count which seems to include loop iterations.)

---

## 5. Audit / project state

### S52 dispatch inventory

11 dispatches:
1. W6 — F-MACHINE-001 + F-CHANNEL-003 paired (T2-medium, PARTIAL, PARKED → P3 recommends discard)
2. DD1 — state-as-primary unification (research, T3, DONE inline-then-rescued-to-disk)
3. DD2 — parser disambiguation feasibility (research, T2-large, DONE inline-then-rescued)
4. DD3 — prior art survey (research, T2-large, FAILED at 600s stall)
5. DD4 — state-type body grammar (research, T2-large, DONE wrote-to-disk)
6. Debate — Approach A vs B (T2-large, DONE, A wins 93/110)
7. P1 — case-soften + engine rename (T2-large, PARTIAL but adequate, MERGED)
8. P1.E — NameRes + uniform opener + warning emissions (T2-medium, DONE, MERGED)
9. P2 — `export <ComponentName>` direct grammar (T2-medium-to-large, DONE on branch with semantic gap)
10. P2-wrapper — Form 1 byte-equivalent to Form 2 (T1-medium, DONE, MERGED)
11. F-COMPONENT-004 (1st HALTED + 2nd MERGED) — substituteProps logic-block walk (T1-medium-to-T2-small)
12. P3 design dive — cross-file channel + engine inline-expansion (T3 research, DONE wrote-to-disk)

### Status of original 6 S50 P0s (carry-forward + S52 progress)

| ID | S51 close | S52 status |
|---|---|---|
| F-AUTH-001 | UVB closed silent window (warn) | Same. Ergonomic completion (W7) deferred. |
| F-AUTH-002 | Layer 1 only; W5a + W5b deferred | Same. P3.A may interact with deferred W5-FOLLOW (OQ-P3-8). |
| F-COMPONENT-001 | UVB + W2 architectural; F4 caveat | F4 nested-PascalCase (F-COMPONENT-003 candidate) still open. |
| F-RI-001 | FULLY RESOLVED via W4 structural walk | Same. |
| F-CHANNEL-001 | UVB closed | Same. |
| F-COMPILE-001 | E-CG-015 + dist tree preserved | Same. |
| F-COMPILE-002 | RESOLVED | Same. |
| F-BUILD-002 | RESOLVED | Same. |
| F-SQL-001 | RESOLVED | Same. |
| F-MACHINE-001 (now F-ENGINE-001) | OPEN; W6 fix parked | Still OPEN. **P3.B closes architecturally (~3-5 days, ratification pending).** |
| F-CHANNEL-003 | OPEN; W6 only Layer 1 (parked) | Still OPEN. **P3.A closes architecturally (~5-7 days, ratification pending).** |

### Newly-surfaced findings during S52

| ID | Status | Source dispatch |
|---|---|---|
| **F-COMPONENT-004** (P1) | **RESOLVED** — `substituteProps` walks logic-block bodies; shadowing-aware. SPEC §15.10.1 normative. | Surfaced by P2-wrapper; fixed in F-COMPONENT-004 dispatch |
| **8 historical concessions catalogued** (DD1 §3) | Approach A removes all 8 over P1-P4 phases. C1+C3 partially addressed in P1+P1.E (case rule softened, uniform opener). C2+C6+C7+C8 P2/P3/P4 territory. C4+C5 long-term. | DD1 |
| **75 isComponent references** to migrate | Deferred to P3-FOLLOW dispatch | DD2 + P3 dive |

### Decisions made during S52 (load-bearing)

- **Approach A** ratified (state-as-primary, full unification across markup-shaped state-types)
- **Engine rename** (machine → engine) — landing in P1, NOT deferred (overrode DD4 default)
- **Whitespace-after-`<` direction:** warn-then-error (W- in P1, E- in P3); migrate via `scrml-migrate` (P4)
- **Body grammar direction:** uniform with extension points (DD4 designed)
- **All 7 DD1+DD4 OQs at defaults** (lowercase warn on HTML collision; export-const transitional sugar kept; per-importer channel store identity; §52 authority preserved as attribute; F-AUTH-002 modifier+attribute both; formResult default-rendering deferred to T3)
- **W6 disposition:** parked (P3 dive recommends discard at P3.B start)
- **P3 mechanism (recommended; ratification pending):**
  - Channel: compile-time inline-expansion via CHX (CE phase 2 under UCD)
  - Engine Tier 1: TAB synthesizes type-decl for `export type X = {...}` (W6 Option A pattern preserved)
  - UCD over SP (51/60 vs 46/60)
  - Per-category NR promotion (channel + engine become NR-authoritative)
  - 75 isComponent migration deferred to P3-FOLLOW
  - P3.B first (T2-medium), P3.A second (T2-large)

---

## 6. ⚠️ Things the next PA needs to NOT screw up

1. **P3 deep-dive is on disk; ratification pending.** Read `scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` §14 for the 8 OQs. 3 are gating (OQ-P3-1 UCD vs SP, OQ-P3-3 separate vs combined dispatches, OQ-P3-8 SQL coordination). Surface these to user before P3.B implementation begins.

2. **`changes/w6` is parked, P3 dive recommends discard.** Disposition still NOT executed. The branch contains:
   - F-MACHINE-001 fix (TAB synthesizes sibling type-decl) — preserved as P3.B Tier 1's source pattern
   - §21.2 SHALL NOT against `export <markup>` — **WRONG DIRECTION; must NOT be merged.**
   - §38.4.1 channel per-page carveout with W6b deferral — also wrong direction
   - **Recommended action at S53 open:** discard `changes/w6` entirely after surfacing to user. P3.B re-implements the F-MACHINE-001 fix architecturally.

3. **NameRes is in SHADOW MODE.** Stage 3.05 walks AST and stamps `resolvedKind` + `resolvedCategory` — but downstream stages (CE, MOD, TS, codegen) STILL route on `isComponent`. The 75 `isComponent` references DO NOT migrate yet. P3-FOLLOW addresses this.

4. **60 new W-WHITESPACE-001 warnings firing on samples/** — pre-existing samples use `< db>` style. Not a bug. Migration is its own dispatch (or P4 `scrml-migrate`).

5. **Wart in api.js stage label rename.** P1.E agent renamed gauntlet check stage labels (3.05/3.06 → 3.005/3.006) to avoid clash with NR's Stage 3.05. Cosmetic.

6. **Multi-session phase plan ahead:**
   - **P3.B** (T2-medium, ~3-5 days, recommended first): TAB type-decl synthesis for `export type X`. Closes F-ENGINE-001 architecturally. Supersedes W6 tactical fix.
   - **P3.A** (T2-large, ~5-7 days): CHX (CE phase 2) under UCD. Closes F-CHANNEL-003. Eliminates ~180 LOC dispatch app duplication.
   - **P3-FOLLOW** (T2-medium, ~5 days): 75 isComponent migration to NR-authoritative routing.
   - **P4** (T1-small, ~2-3 days): `scrml-migrate` CLI command — rewrites `export const Name = <markup>` → `export <Name>...</>`, strips `< db>` whitespace, etc.
   - **Internal compiler rename** `machineName→engineName` (~350 refs) — pure mechanical. T2-small.
   - **SPEC §51 keyword sweep** — paperwork dispatch. T1-small.

7. **OQ-P3-8 SQL-in-channel cross-file interaction with W5-FOLLOW** — coordination flag. P3.A's channel cross-file expansion may interact with the deferred W5a (pure-fn library auto-emit) + W5b (cross-file `?{}` resolve) work. Surface to user before P3.A starts.

8. **Authorization scope discipline.** S52's pattern: explicit per-action greenlights ("go", "fine to merge", "ratify yes", "2 fix go", "park w6", "go your reco", "1,2,3, next part go", "we can wrap this one. do it fat"). **Does NOT carry into S53.** Re-confirm before any merge / push / cross-repo write / dispatch.

9. **`--no-verify` policy STILL OPEN.** No violations in S52 (clean across all 5 fix dispatches). The question of formalizing TDD red commits / `WIP:` prefix exemption is unresolved.

10. **Tutorial Pass 3-5 + 5 unpublished article drafts STILL pending** — multi-session carry-forward.

11. **Master inbox stale messages STILL OPEN** (S26 giti, S43 reconciliation, S49 + S51 push-needs). Plus an S52 push-complete notice will be filed at this wrap. Master's queue.

12. **Worktree cleanup deferred** — 6 worktrees alive at close (W6 parked + 5 merged + 1 halted-clean). `git worktree prune` + per-worktree removal as housekeeping.

---

## 7. Open questions to surface immediately at S53 open

- **W6 disposition** — P3 dive recommends discard. Execute discard at S53 open?
- **P3 OQ ratification** — read `scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` §14. Decide UCD vs SP, separate vs combined dispatches, SQL-coordination scope for P3.A.
- **First move on S53?** Plausible candidates:
  - P3.B (engine TAB type-decl synthesis — recommended first per P3 dive)
  - P3.A (channel CHX/UCD)
  - F-COMPONENT-003 (nested-PascalCase Phase-1)
  - F-PARSER-ASI sweep (30 trailing-content warnings)
  - W7-W12 carry-forward queue from S51
  - Internal compiler rename / SPEC §51 keyword sweep / E-MACHINE-* code rename (mechanical paperwork dispatches)
- **`--no-verify` policy** still unresolved.

---

## 8. User direction summary (the through-line)

Verbatim user statements (S52). All appended to `scrml-support/user-voice-scrmlTS.md` per pa.md.

### Session start
> read pa.md and start session

### W6 dispatch authorization (S51 carry-over)
> w6 go

### THE LOAD-BEARING STATEMENT — architectural pivot triggered
> I'll be honest. I have whatched the language "I'm" building drift from the language I envisioned for some time now. I believe the first conscession was that pascal naming convention to syntax decision. and it has continued, a little at a time. until now. I see something that is basically unacceptable. I am wondering about all of the syntax decisions made and wondering if there is simplification somewhere that we could pick up easily if we consider all options. I do know that I want export <ComponentName>. my original thoughts were, if the language knows <jimmy> isnt a predifined state than it looks for a user defined state. Also, I have never seemed to be able to de-conflate state and markup to "agents". Im not sure my intent of "we need a syntax for state. Markup is state. Perhaps state steals markups syntax, and markup symply becomes a subset of state. it is afterall, right, it is a state type with explicit display attributes. that doesnt mean that state HAS to have displayed attributes". dont pander to me. Is this making sense? the fact is, I will spend as meany tokens and as much time as I need to to get this right.

### Deep-dive authorization
> deep dive. start multiple if its worth it

### Machine body + engine question
> A Im thinking of changing the word to engine (instead of machine). but far beyond that, <machine> has this wird thing, it looks like state <thing> but its internal syntax rejects anything but its own kindof match syntax. this feels bolted on and unnatural. why cant a machine (engine) handle markup and other state types in it? I do understand the idea of reusability. I am not sure ( I totally could be wrong. Im not all knowing). Is any of this worth more deep-diving before we start debating and deciding?

### Body grammar + whitespace + DD4 launch (3 decisions, 1 line)
> uniform with extension points, whitespace warn then error, 2

### Debate authorization (with humor)
> lets debate for shits and giggles

### Ratification (THE big-decision turn)
> ratify yes. engine yes . other qs default. go

### W6 parking + keep going
> park w6 keep going

### Wait-then-merge for P1, fine-to-merge for P1.E
> wait to merge
> fine to merge

### P2 wrapper-gap rejection
> a

### F-COMPONENT-004 fix authorization
> 2 fix go

### Bookkeeping authorization
> go your reco

### Merge + push + dispatch P3
> 1,2,3, next part go

### Wrap directive
> we can wrap this one. do it fat

### Through-line for S52

User mode through the session:
- **Architectural pivot mode + per-action greenlights.** Single load-bearing statement at session start; subsequent decisions per-action ratifications maintaining velocity.
- **Willing to spend tokens.** "I will spend as meany tokens and as much time as I need to to get this right" — explicitly removes the cost objection.
- **Decisive on direction, conservative on cost-trade-offs.** Ratified Approach A (most expensive option) but folded engine rename into P1 (cost-saving). Block-merge on P2 wrapper gap rather than ship-and-fix.
- **Pattern recognition + meta-feedback.** "It has been one of the most consistently complained about syntax choices" (whitespace) — synthesizes prior friction without needing reminding.
- **Validation principle still load-bearing** — `export <markup>` SHALL NOT was rejected because it locked in wrap-in-const concession; user noticed within hours.

### Authorization scope (closing note)

S52's per-action authorization pattern was scoped throughout. **It does NOT carry into S53.** Per pa.md "Authorization stands for the scope specified, not beyond." Next session should re-confirm before any merge / push / cross-repo write / dispatch.

---

## 9. Tasks (state at S52 close)

| # | Subject | State |
|---|---|---|
| W6 — F-MACHINE-001 + F-CHANNEL-003 paired | T2-medium | PARKED — recommended discard (P3 dive) |
| DD1 — state-as-primary unification | T3 research | ✅ DONE — 1170+ lines |
| DD2 — parser disambiguation feasibility | T2-large research | ✅ DONE — 700+ lines, FEASIBLE-WITH-COST |
| DD3 — prior art survey | T2-large research | ❌ FAILED at 600s stall |
| DD4 — state-type body grammar | T2-large research | ✅ DONE — 1187 lines, uniform-with-extensions |
| Debate — A vs B | T2-large | ✅ DONE — A wins 93/110 |
| P1 — case-soften + engine keyword | T2-large fix | ✅ DONE (PARTIAL but adequate), MERGED `0334942` |
| P1.E — NameRes + uniform opener + warnings | T2-medium fix | ✅ DONE, MERGED `1a89e84` |
| P2 — `export <ComponentName>` direct grammar | T2-medium-to-large | ✅ DONE on branch (with semantic gap) |
| P2-wrapper — Form 1 byte-equivalent | T1-medium follow-up | ✅ DONE, MERGED `966a493` |
| F-COMPONENT-004 — substituteProps logic-block walk | T1-medium-to-T2-small | ✅ DONE, MERGED `e95aa87` |
| Bookkeeping commit | PA-side | ✅ DONE, MERGED `6e2aa4c` |
| Push to origin (both repos) | PA-side | ✅ DONE |
| P3 design dive | T3 research | ✅ DONE — 1029 lines, recommendations ready |
| **P3.B** — engine TAB type-decl synthesis | T2-medium | OPEN — recommended first; ratification pending |
| **P3.A** — channel CHX (CE phase 2) under UCD | T2-large | OPEN — second; ratification pending |
| **P3-FOLLOW** — 75 isComponent migration to NR-authoritative | T2-medium | OPEN — 1-2 sessions after P3.B |
| **P4** — `scrml-migrate` CLI | T1-small | OPEN |
| Internal compiler rename `machineName→engineName` | T2-small | OPEN — ~350 refs mechanical |
| SPEC §51 keyword sweep | T1-small | OPEN — paperwork |
| E-MACHINE-* → E-ENGINE-* code rename | T1-small | OPEN — paperwork |
| W6 worktree disposition (discard recommended) | PA-side | OPEN — execute at S53 open |
| Worktree cleanup (6 worktrees alive) | PA-side housekeeping | OPEN |
| F-COMPONENT-003 — nested-PascalCase Phase-1 limitation | T2 | OPEN — pre-S52 carry-forward |
| F-COMPILE-003 — pure-helper export emission | T2 | OPEN — pre-S52 carry-forward |
| W5a — pure-fn library auto-emit | T2-medium | OPEN — pre-S52 carry-forward |
| W5b — cross-file `?{}` resolution | T2-medium → T3 | OPEN — depends on W5a; coordinates with P3.A |
| W7 — F-AUTH-001 ergonomic completion | T3 | OPEN — pre-S52 carry-forward |
| W8 — F-LIN-001 + F-RI-001-FOLLOW paired | T2-small × 2 | OPEN — pre-S52 carry-forward |
| W9-W11 — paper cuts + diagnostic bugs + docs | T1-small × multiple | OPEN — pre-S52 carry-forward |
| F-PARSER-ASI sweep (30 warnings) | T2 batch | OPEN — pre-S52 carry-forward |
| Tutorial Pass 3-5 (~30h) | docs | NOT STARTED — pre-S52 |
| 5 unpublished article drafts | user-driven publish | PENDING — pre-S52 |
| Master inbox stale messages | bookkeeping | OPEN — master's queue |

---

## 10. needs:push state

scrmlTS commits on `main`: **pushed clean to origin at S52 close.** All 32 commits past S51 close shipped. Final state HEAD `6e2aa4c` + the wrap commit landing now (this hand-off + master-list + changelog refresh). After wrap, will be 33 commits past S51 close.

scrml-support: `f016dad` pushed clean. The wrap commit (P3 deep-dive + progress log) landing now will require another push.

**S52 close: PUSH AUTHORIZED via "do it fat"** per pa.md "wrap" definition step 7.

---

## 11. File modification inventory (forensic — at S52 close)

### scrmlTS — modified files this session (across P1+P1.E+P2+P2-wrapper+F-COMPONENT-004 merged + bookkeeping + this wrap)

**Compiler source:**
- `compiler/src/ast-builder.js` — P1 engine keyword + W-DEPRECATED; P1.E uniform opener; P2 export-decl; P2-wrapper desugaring fix
- `compiler/src/block-splitter.js` — P1.E uniform opener
- `compiler/src/api.js` — P1.E NameRes wiring (+ stage label rename wart)
- `compiler/src/name-resolver.ts` — NEW P1.E (~410 LOC)
- `compiler/src/component-expander.ts` — F-COMPONENT-004 substitutePropsInExprNode helper + shadowing tracking
- `compiler/src/gauntlet-phase1-checks.js` — P2 (small)

**Tests (12 new):**
- `compiler/tests/unit/engine-keyword.test.js` — NEW P1
- `compiler/tests/unit/p1e-uniform-opener-bs.test.js` — NEW P1.E
- `compiler/tests/unit/p1e-uniform-opener-equivalence.test.js` — NEW P1.E
- `compiler/tests/unit/p1e-name-resolver.test.js` — NEW P1.E
- `compiler/tests/unit/p1e-engine-keyword-regression.test.js` — NEW P1.E
- `compiler/tests/unit/p2-export-component-form1.test.js` — NEW P2
- `compiler/tests/integration/p2-export-component-form1-cross-file.test.js` — NEW P2
- `compiler/tests/integration/p2-export-component-form1-use-site.test.js` — NEW P2
- `compiler/tests/unit/p2-wrapper-byte-equivalence.test.js` — NEW P2-wrapper
- `compiler/tests/integration/p2-wrapper-html-equivalence.test.js` — NEW P2-wrapper
- `compiler/tests/unit/f-component-004-substituteProps-logic-block.test.js` — NEW F-COMPONENT-004
- `compiler/tests/integration/f-component-004-form1-form2-parity.test.js` — NEW F-COMPONENT-004
- `compiler/tests/self-host/ast.test.js` — P1.E AST shape parity update

**Spec / docs:**
- `compiler/SPEC.md` — §4.3, §15.6, §15.8, §15.10.1 NEW (F-COMPONENT-004), §15.12, §15.15 NEW (P1), §21.2 (P2 + P2-wrapper), §21.6, §34, §51.3.2 catalog amendments
- `compiler/SPEC-INDEX.md` — P2
- `compiler/PIPELINE.md` — Stage 3.05 documented (P1) → IMPLEMENTED (P1.E)

**Examples / samples:**
- `examples/14-mario-state-machine.scrml` — `<engine>` migration
- `examples/23-trucking-dispatch/pages/driver/hos.scrml` — `<engine>` migration
- `examples/23-trucking-dispatch/FRICTION.md` — engine keyword + F-COMPONENT-004 RESOLVED
- `samples/compilation-tests/machine-basic.scrml` → `<engine>`
- `samples/compilation-tests/machine-002-traffic-light.scrml` → `<engine>`
- `samples/rust-dev-debate-dashboard.scrml` → `<engine>`

**Diagnosis + progress dirs (NEW under `docs/changes/`):**
- `docs/changes/p1/progress.md`
- `docs/changes/p1.e/progress.md` + `pre-snapshot.md`
- `docs/changes/p2/progress.md` + `pre-snapshot.md`
- `docs/changes/p2-wrapper/progress.md`
- `docs/changes/f-component-004/progress.md` + `pre-snapshot.md`

**Wrap files (committed in this final wrap):**
- `hand-off.md` (this file — S52 CLOSED)
- `master-list.md` (S52 close row)
- `docs/changelog.md` (S52 close entry refresh)
- `handOffs/hand-off-54.md` (this file rotated; pre-saved for S53 open)

### scrml-support — committed `f016dad` + this wrap

Committed `f016dad`:
- `docs/deep-dives/state-as-primary-unification-2026-04-30.md` (DD1)
- `docs/deep-dives/parser-disambiguation-feasibility-2026-04-30.md` (DD2)
- `docs/deep-dives/state-type-body-grammar-uniform-extensions-2026-04-30.md` (DD4)
- `docs/deep-dives/progress-prior-art-unified-declaration-models-2026-04-30.md` (DD3 progress)
- `docs/deep-dives/progress-state-type-body-grammar-2026-04-30.md` (DD4 progress)
- `user-voice-scrmlTS.md` — appended S52 entry

Committed in this wrap:
- `docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` (NEW — P3 dive, 1029 lines)
- `docs/deep-dives/progress-p3-cross-file-inline-expansion-2026-05-02.md` (P3 progress)

### ~/.claude/

- `~/.claude/design-insights.md` — debate insight appended (## State-as-Primary Architectural Unification — scrml Approach A vs B)

---

## Tags
#session-52 #closed #fat-wrap #push-complete #architectural-pivot #state-as-primary-ratified #engine-rename-folded #approach-a-93-to-71-debate #4-deep-dives #1-failed-dive #1-debate #5-fix-dispatches-merged #f-component-004-resolved #p3-design-dive-done #p3.b-and-p3.a-queued #w6-recommended-discard #plus-111-tests #cross-machine-sync-clean

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — refreshed S52 close
- [docs/changelog.md](./docs/changelog.md) — S52 close entry
- `docs/changes/{p1,p1.e,p2,p2-wrapper,f-component-004}/`
- `examples/23-trucking-dispatch/FRICTION.md` — current adopter-friction inventory
- `scrml-support/docs/deep-dives/state-as-primary-unification-2026-04-30.md` — DD1
- `scrml-support/docs/deep-dives/parser-disambiguation-feasibility-2026-04-30.md` — DD2
- `scrml-support/docs/deep-dives/state-type-body-grammar-uniform-extensions-2026-04-30.md` — DD4
- `scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` — P3 design dive (8 OQs in §14)
- `scrml-support/user-voice-scrmlTS.md` — S52 entry
- `~/.claude/design-insights.md` — debate insight (## State-as-Primary)
