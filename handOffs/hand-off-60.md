# scrmlTS — Session 60 (CLOSED — A1a 12/17 done + A1b/A1c scope-out + ADR ratified)

**Date opened:** 2026-05-05
**Date closed:** 2026-05-05 (same day)
**Previous:** `handOffs/hand-off-59.md` (S59 close — 7/13 of A1a + program-attrs + L21 + 3 audits + dashboard rewrite)
**This file (close snapshot):** rotates to `handOffs/hand-off-60.md` at S60 close

**Baseline entering S60:** scrmlTS at `4ee360f`, 8,784 / 43 / 0 / 8,827 across 432 files. scrml-support at `f7b935a`. Both repos clean+pushed.

**State at S60 close:** scrmlTS at `<final wrap commit>` (TBD). scrml-support unchanged at `f7b935a` (no cross-repo writes this session). **Tests: 8,853 pass / 43 skip / 0 fail / 8,896 across 439 files.** Net delta: **+69 pass tests, +7 net test files, ~30+ commits scrmlTS (cherry-picks + planning + ratification + wrap).**

---

## 0. The big shape of S60 — five A1a step landings + 11.0a + planning durables

S60 was the second heavy-dispatch session in A1a's per-step decomposition. The session landed 5 dispatch cycles (Steps 6, 7, 9, 10, 11) plus the discovered-blocker sub-step 11.0a, AND produced full scope-out documents for Phase A1b (resolve+type) and Phase A1c (codegen+runtime+PIPELINE-prose), AND ratified the `reactive-derived-decl` ADR as Option A FOLD inserted as Step 11.5.

**The sequence of work:**

1. **Step 6 dispatch** — `default=` + `pinned` on state-decl. KEYWORD-vs-IDENT survey insight (default is KEYWORD, needed new branch; pinned is contextual IDENT, needed guard before validator branch). +10 tests.
2. **Plan + scope** during Step 6 wait — 7 per-step BRIEFs (Steps 7, 9, 10, 11, 12, 13) + reactive-derived-decl ADR drafted.
3. **Step 7 dispatch** — `pinned` on import items. Regex-driven parser insight (different shape from state-decl token-walker). `_splitPinned` helper + 3-edge-case disambiguation. +10 tests.
4. **ADR ratification** — Option A FOLD ratified; inserted as Step 11.5 between Steps 11 and 12. AST-CONTRACTS table + Step 11.5 BRIEF + hand-off updates committed.
5. **Step 9 dispatch** — `reset(@cell)` keyword + E-RESET-NO-ARG. Acorn-post-processing insight. SPEC §34 already had E-RESET-NO-ARG. Multi-arg/spread reused E-RESET-NO-ARG. Full tree walker added. +8 tests.
6. **A1b scope-out** drafted during Step 9 wait — 22 steps B1-B22, 5 waves, 7 ranked open Qs.
7. **Step 10 dispatch** — Mutation shape verification. **Discount #8** — zero source changes. All three shapes correct. Discrimination via `ident.name.startsWith("@")`. Two-layer lowering insight (specialized kinds + bare-expr.exprNode walk). +10 tests.
8. **A1c scope-out** drafted during Step 10 wait + refined post-Step-10 — 23 steps C1-C23, 6 waves, 8 ranked open Qs.
9. **Step 11 dispatch** — Kickstarter v2 §3 smoke. **Discovered-blocker escalation, NOT Discount.** Surfaced 3 deferred parser gaps (Step 2 progress lines 93-98 had explicitly deferred them). 16 positive cases + 7 anti-test memorials. +23 tests.
10. **A1c scope-out finalized** — Step 10 findings folded into B8 dual-path walker requirement.
11. **Steps 11.0a/b/c sub-steps inserted** in A1a decomposition. 11.0a BRIEF drafted + dispatched.
12. **11.0b + 11.0c BRIEFs drafted** during 11.0a wait.
13. **Step 11.0a dispatch return** — Variant C compound recognizer landed. +127 LOC + 14 LOC types. BRIEF touchpoint correction L2912 not L3528-3580. Both `</>`/`</NAME>` closers accepted. +8 tests.
14. **Wrap.**

---

## 1. The S60 commit ledger (all pushed)

Headline commits in chronological order (full ledger via `git log --oneline 4ee360f..HEAD`):

| SHA | Type | Description |
|---|---|---|
| `ce30247` | brief | Step 6 BRIEF — default= + pinned on state-decl |
| `c858c16` | survey | Step 6 — survey notes |
| `746df3f` | compile | Step 6 — default= + pinned scan in tryParseStructuralDecl |
| `db0deb0` | tests | Step 6 — tests + STRING/AT_IDENT collector fixes |
| `2754940` | compile | Step 6 final — default= + pinned on state-decl |
| `d7252be` | docs | Per-step briefs Steps 7,9,10,11,12,13 + reactive-derived-decl ADR |
| `3fc8aab` | survey | Step 7 — survey notes |
| `b279e6c` | compile | Step 7 — pinned bareword scan in import-item parser |
| `9c75295` | types | Step 7 — ImportSpecifier with pinned flag |
| `2935a0f` | tests | Step 7 — 10 cases for pinned on import items |
| `556de93` | compile | Step 7 final — pinned bareword on import items |
| `2e9dc88` | docs | ADR ratification — Option A FOLD; inserted as Step 11.5 |
| `b60c9f1` | survey | Step 9 — survey notes |
| `d1b6510` | types | Step 9 — add ResetExpr to ast.ts |
| `8e940e3` | compile | Step 9 — reset KEYWORD primary-expression branch |
| `d2dc02f` | compile | Step 9 — E-RESET-NO-ARG emission via tree walker + cross-file ExprNode switches |
| `e7b513d` | tests | Step 9 — 8 cases for reset(@cell) keyword |
| `fded36a` | compile | Step 9 final — reset(@cell) keyword + E-RESET-NO-ARG |
| `63137e9` | survey | Step 10 — survey notes (zero source changes; discount #8) |
| `539089a` | tests | Step 10 — 10 cases for MemberCall / MemberAssignment / UnaryDelete shapes |
| `226a2dd` | compile | Step 10 final — mutation shape verification (zero source changes) |
| `c9ea831` | docs | A1b scope + Step 10 cherry-picks |
| `6e6ef21` | survey | Step 11 — survey notes |
| `ca6186b` | survey | Step 11 — survey findings (Variant C + multi-decl divergences) |
| `0a896a6` | tests | Step 11 — kickstarter v2 §3 smoke battery (23 tests) |
| `bcca1e6` | compile | Step 11 final — kickstarter v2 §3 smoke; ZERO source; 3 deferred divergences flagged |
| `8564a0f` | docs | A1c scope + Step 11 escalation insert (11.0a/b/c) + decomposition refresh |
| `a5406f5` | survey | Step 11.0a — survey notes (touchpoint at L2912; 2 TODO memorials) |
| `e72be79` | compile | Step 11.0a — tryParseStructuralDecl compound-body branch + types + flipped memorials |
| `6d51d00` | compile | Step 11.0a final — Variant C compound recognizer |
| `<wrap>` | docs | hand-off + master-list + changelog wrap (this commit) |

---

## 2. Phase A1a 17-step status — LIVE at S60 close

| # | Step | Status | Commit |
|---|---|---|---|
| 1 | Lexer: reserve `reset` | ✅ S59 | `9cd7779` |
| 2 | Foundational `<NAME>` decl-site recognition | ✅ S59 | `d28f6f7` |
| 3 | AST kind rename `reactive-decl` → `state-decl` | ✅ S59 | `8fa26e1` |
| 4 | Parser: state-decl `shape` discriminant | ✅ S59 | `96dbe92` |
| 5 | Parser: Shape 2 `renderSpec` + bareword validators | ✅ S59 | `505531f` |
| 6 | Parser: `default=` + `pinned` on state-decl | ✅ S60 | `2754940` (+10 tests) |
| 7 | Parser: `pinned` on import items | ✅ S60 | `556de93` (+10 tests) |
| 8 | E-RESERVED-IDENTIFIER trigger | ✅ S59 | `af4a0da` |
| 9 | Expression parser: `reset(@cell)` + E-RESET-NO-ARG | ✅ S60 | `fded36a` (+8 tests; full tree walker) |
| 10 | Expression parser: mutation shape verification | ✅ S60 | `226a2dd` (+10 tests; ZERO source — Discount #8) |
| 11 | Kickstarter v2 §3 smoke + Variant C + render-by-tag | ✅ S60 | `bcca1e6` (+23 tests; surfaced 11.0a/b/c) |
| **11.0a** | **Variant C compound recognizer** | ✅ S60 | `6d51d00` (+8 tests; 2 TODO memorials flipped) |
| 11.0b | Newline-as-statement-separator | ⏸ NEXT | BRIEF drafted (~1-2h) |
| 11.0c | Typed-decl recognizer | ⏸ | BRIEF drafted (~2-3h) |
| 11.5 | FOLD `reactive-derived-decl` into `state-decl` (ADR Option A) | ⏸ | BRIEF drafted (~3-5h) |
| 12 | Existing-test deltas | ⏸ | BRIEF drafted (~4-8h) |
| 13 | Final commit + CHANGELOG | ⏸ | BRIEF drafted (~0.5h) |

**12/17 done.** Remaining estimated **~10-19h** focused work across Steps 11.0b, 11.0c, 11.5, 12, 13.

---

## 3. Tests posture S60

| Snapshot | Pass | Skip | Fail | Total | Files |
|---|---|---|---|---|---|
| S59 close (entering S60) | 8,720* | 43 | 0 | 8,763* | 432* |
| S59 close (re-baselined entering S60) | 8,784 | 43 | 0 | 8,827 | 435 |
| Post Step 6 | 8,794 | 43 | 0 | 8,837 | 435 |
| Post Step 7 | 8,804 | 43 | 0 | 8,847 | 436 |
| Post Step 9 | 8,812 | 43 | 0 | 8,855 | 437 |
| Post Step 10 | 8,822 | 43 | 0 | 8,865 | 438 |
| Post Step 11 | 8,845 | 43 | 0 | 8,888 | 439 |
| **S60 close (post Step 11.0a)** | **8,853** | **43** | **0** | **8,896** | **439** |
| **Delta vs S59 close** | **+69 pass** | **0** | **0** | **+69** | **+4 files** |

*S59 close hand-off table showed 8,720 / 8,763 / 432 in §4 but the same hand-off §8 reported 8,784 / 8,827 / 435 as the verified state-as-of-close. The discrepancy was an in-flight transition (Step 5 was landing). For S60 baseline purposes the verified §8 numbers (8,784 / 8,827 / 435) are authoritative.

**0 failures throughout.** Pre-commit subset (browser-excluded) at S60 close ~8,124 / 33 / 0.

---

## 4. ⚠️ S61 first moves

S61 PA's ready-to-go checklist:

1. **Read pa.md, PA-SCRML-PRIMER, hand-off, last ~10 user-voice contentful entries** per session-start checklist.
2. **Confirm test baseline 8,853 / 43 / 0 / 8,896 across 439 files.**
3. **Resume A1a per-step dispatches.** Next: **Step 11.0b (newline-as-statement-separator)**. Small (~1-2h). BRIEF at `docs/changes/phase-a1a-step-11-0b-newline-separator/BRIEF.md`.
4. **Step 11.0c queued after 11.0b.** Typed-decl recognizer (~2-3h). BRIEF at `docs/changes/phase-a1a-step-11-0c-typed-decl/BRIEF.md`.
5. **Step 11.5 queued after 11.0c.** FOLD reactive-derived-decl (~3-5h). BRIEF at `docs/changes/phase-a1a-step-11-5-fold-derived/BRIEF.md`.
6. **Step 12 + Step 13** wrap A1a.
7. **Then:** ratify A1b open Qs (7 ranked) and proceed to A1b dispatch via per-step pattern. A1b scope at `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`.

**Suggested S61 launch:**
- Read primer + hand-off + user-voice tail (~5-10 min).
- Confirm tests baseline.
- Discuss with user: Step 11.0b dispatch directly, or any ratification / re-scope work first.

---

## 5. Open questions to surface immediately at S61 open

1. **Push posture.** All commits pushed at S60 close including the wrap commit. scrml-support not touched this session.
2. **Article truthfulness audit dispositions** — 15 articles classified S59; user must cross-reference public state and decide. Carried forward.
3. **scrml.dev v0.2.0 announce publishing** — draft at `docs/website/v0.2.0-announce-2026-05-05.md`. User-controlled timing.
4. **`tier-ladder-promotion` article** — `published: false`; gated on A2 (engines). Carried forward.
5. **A1b ratification queue (7 ranked open Qs)** at `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §9:
   - **[BLOCKING]** Step 12 ordering before A1b begins
   - **[BLOCKING]** Step 11.5 ordering (already ratified S60; carries forward)
   - **[HIGH]** A1b dispatch granularity (per-step pattern)
   - **[HIGH]** Wave parallelism scope
   - **[MEDIUM]** Validator typer subsystem placement
   - **[MEDIUM]** Refinement-zone scope
   - **[LOW]** Step count
6. **A1c ratification queue (8 ranked open Qs)** at `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §9:
   - **[BLOCKING]** A1b completion before A1c starts
   - **[HIGH]** Wave 5 parallelism cap
   - **[HIGH]** Runtime library policy
   - **[MEDIUM]** PIPELINE prose timing
   - **[MEDIUM]** Step count
   - **[MEDIUM]** Refinement-zone scope (C16)
   - **[LOW]** Schema driver matrix
   - **[LOW]** Output-byte-shape regression budget

---

## 6. ⚠️ Things S61 PA needs to NOT screw up

1. **Read PA-SCRML-PRIMER.md FIRST** (step 2 of session-start, after pa.md). §12 has the depth-of-survey discount mitigations — APPLY them to every audit / brief / dispatch. The pattern WILL recur. **8× confirmed at S60 close.**
2. **AST kind is `state-decl`, NOT `reactive-decl`.** Step 3 renamed everywhere; legacy name preserved only in audit/inventory banners.
3. **`reactive-derived-decl` is STILL a SEPARATE kind** until Step 11.5 lands (Option A FOLD). Anything touching derived cells must handle BOTH kinds for now.
4. **Validator args are `string[]` for now**, NOT `ExprNode[]`. AST-CONTRACTS §1.1 final shape is ExprNode[]; A1b B9 owns the conversion.
5. **Variant C compound (Step 11.0a S60 NEW)**: `state-decl` parents have `children: [...]` populated; assert `shape:"plain"` AND `initExpr:null` AND no `isConst:true` (decline-on-const path).
6. **Step 11.0a closer-form policy:** parser accepts BOTH `</>` and `</NAME>` without name-match enforcement. A1b enforces name-match.
7. **`reset-expr` AST kind (Step 9)**: full tree-walker `forEachResetExprInExprNode` is the surfacing mechanism — multiple `reset()` instances in one expression all surface their diagnostics.
8. **MemberCall/MemberAssignment/UnaryDelete (Step 10)**: dual-path discrimination — specialized kinds (`reactive-array-mutation`, `reactive-nested-assign`) AND `bare-expr.exprNode` structural walk. B8 walker must handle BOTH.
9. **`@`-prefix discrimination (Step 10)**: `ident.name` preserves the `@` prefix verbatim. Discrimination is pure string-shape inspection — no parser work needed.
10. **Step 11 anti-test memorials:** 5 of 7 still memorialized (`TODO[step-11.0b]` and `TODO[step-11.0c]`). Each will flip when its sub-step lands.
11. **Path-discipline regression risk** (S60 PA-side near-miss): for cross-tree git ops, USE `git -C <abs-path>` form. Bash CWD can drift between tool calls.
12. **Test invariant strengthening — anti-html-fragment guard** is non-negotiable on every Shape-1/2/3 positive test. Continue applying.
13. **Tests now 8,853 / 43 / 0 / 8,896 / 439** baseline at S61 open. Each step adds ~6-15 tests with 0 regressions contract.
14. **A1b SCOPE-AND-DECOMPOSITION drafted** but NOT YET RATIFIED. 7 open Qs ranked. Don't dispatch B-steps until ratification.
15. **A1c SCOPE-AND-DECOMPOSITION drafted** but NOT YET RATIFIED. 8 open Qs ranked. Don't dispatch C-steps until A1b is mostly done AND C-Qs are ratified.

---

## 7. State as of close (verified)

- **scrmlTS HEAD:** `<final wrap commit>` (TBD this turn)
- **scrml-support HEAD:** `f7b935a` (unchanged this session — no cross-repo writes)
- **Tests:** 8,853 pass / 43 skip / 0 fail / 8,896 / 439 files (S61 baseline)
- **Working tree both repos:** scrmlTS will be clean post-wrap-commit; scrml-support clean
- **Inbox:** empty
- **Worktrees:** S60's worktrees still around (Step 6/7/9/10/11 + 11.0a). Auto-cleanup if no changes.
- **Primer:** `docs/PA-SCRML-PRIMER.md` not updated S60 (no methodology shifts beyond depth-of-survey discount counter, which the primer's §12 already covers as a pattern).
- **Permissions whitelist:** unchanged from S59.

---

## 8. Files written / modified S60 (forensic inventory)

### scrmlTS (this repo, ~30+ commits)

| Action | Files |
|---|---|
| EXTENDED (compiler source — Steps 6, 7, 9, 10, 11, 11.0a) | `compiler/src/ast-builder.js` (Steps 6+7+11.0a — `tryParseStructuralDecl` extension for default=/pinned/compound; `_splitPinned` for import-item; ~127 LOC for compound), `compiler/src/expression-parser.ts` (Step 9 — esTreeToExprNode CallExpression branch; tree walker), `compiler/src/codegen/emit-expr.ts` (Step 9 — conservative reset-expr pass-through), `compiler/src/types/ast.ts` (Steps 6+7+9+11.0a — defaultExpr/pinned/ImportSpecifier.pinned/ResetExpr/state-decl.children), `compiler/src/component-expander.ts` (Step 9 surfacing), `compiler/src/meta-checker.ts` (Step 9 surfacing) |
| EXTENDED (tests) | `compiler/tests/integration/parse-shapes-v0next.test.js` (Steps 6+11.0a — §S6.1-S6.10 + §S11A.1-S11A.8), `compiler/tests/integration/parse-import-pinned.test.js` (NEW Step 7), `compiler/tests/integration/parse-reset-keyword.test.js` (NEW Step 9), `compiler/tests/integration/parse-mutation-shapes.test.js` (NEW Step 10), `compiler/tests/integration/kickstarter-v2-smoke.test.js` (NEW Step 11; 2 memorials flipped Step 11.0a) |
| NEW (planning docs) | `docs/changes/phase-a1a-step-{6,7,9,10,11,11-0a,11-0b,11-0c,11-5,12,13}-*/BRIEF.md` (10 BRIEFs total; 6 dispatched + 4 queued), `docs/changes/phase-a1a-step-*/progress.md` (per-step worktree-side logs), `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` (NEW; 22 steps), `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` (NEW; 23 steps), `docs/changes/reactive-derived-decl-divergence/ADR.md` (drafted + ratified) |
| EXTENDED (planning docs) | `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` (table refreshed multiple times: Steps 6, 7, 9, 10, 11 marked DONE; 11.0a/b/c + 11.5 inserted; sequencing rationale updated) |
| UPDATED (meta) | `master-list.md` (S60 close header + tests + A1 phase row), `docs/changelog.md` (S60 entry — ~80 lines), `hand-off.md` (this rotation), `handOffs/hand-off-60.md` (close snapshot — this commit) |

### scrml-support (cross-repo — NOT touched this session)

No writes this session. user-voice-scrmlTS.md not appended (no new durable directives to capture S60 — momentum was operational, not deliberation-driven; ADR was ratified in-PA-conversation rather than via a new user-voice entry).

---

## 9. Cross-references

- **S60 outcomes embedded in:** AST-CONTRACTS-AND-DECOMPOSITION.md §3 table (Steps 6-11 + 11.0a marked DONE; 11.0b/c/.5 inserted), A1b + A1c scope-out docs, ADR Option A FOLD ratification
- **S59 outcomes ledger:** `handOffs/hand-off-59.md`
- **Implementation roadmap:** SUPERSEDED by `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md` §0 dashboard
- **PA scrml expert primer (READ FIRST):** `docs/PA-SCRML-PRIMER.md`
- **PA directives:** `pa.md`
- **Master-list dashboard (live progress):** `master-list.md` §0
- **A1b plan:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`
- **A1c plan:** `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md`
- **ADR:** `docs/changes/reactive-derived-decl-divergence/ADR.md`

---

## 10. Tags

#session-60 #closed #phase-a1a-12-of-17-done #step-6 #step-7 #step-9 #step-10 #step-11 #step-11-0a #a1b-scope-drafted #a1c-scope-drafted #adr-ratified-option-a #depth-of-survey-discount-8 #step-11-discovered-blocker

---

## 11. The seamless-transition guarantee

S61 PA, on opening, should:

1. **Read pa.md** (already done by definition — session-start step 1)
2. **Read PA-SCRML-PRIMER.md in full** (mandated step 2)
3. **Read this hand-off** (covers everything material from S60)
4. **Read last ~10 contentful user-voice entries** (S59 entries are the most recent contentful set; S60 had no new durable directives)
5. **Confirm test baseline 8,853 / 43 / 0 / 8,896 across 439 files**
6. **Surface the open questions** at the top of §5 of this hand-off — push posture (CLEAN), article dispositions, scrml.dev publishing, A1b ratification queue (7 Qs), A1c ratification queue (8 Qs)

If S61 PA finds itself searching for "where are we in A1a?" — **12/17 done. Step 11.0b is next.** Briefs are dispatch-ready for 11.0b, 11.0c, 11.5, 12, 13. A1b + A1c scope docs exist but await ratification on their open Qs.

The implementation phase is in flight. 12/17 of A1a done. A1b (22 steps, 85-120h) + A1c (23 steps, 93-131h) scoped. Phase A2-A6 + B1-B5 + C1-C3 still ahead. Multi-month migration. Steady cadence.
