# scrmlTS — Session 61 (OPEN — Steps 11.5 + 12 + 11.0e LANDED + 9 of 10 Curation Batches + 2 P-FUP BRIEFs queued)

**Date opened:** 2026-05-05
**Previous:** `handOffs/hand-off-60.md` (S60 close — 8 dispatch cycles, A1a 14/17 done, A1b/A1c FULLY RATIFIED, ADR ratified Option A FOLD as Step 11.5, Step 11 escalation FULLY CLOSED)

---

## 0. Session-state (LIVE)

| Item | State |
|---|---|
| **scrmlTS HEAD** | **`122c790`** (`docs(s61-curation-batch-h): deref lsp-* → scrml-support/archive/changes/`) + bookkeeping bundle pending |
| **scrml-support HEAD** | **`880bc76`** (`archive(s61-curation-batch-h): scrmlTS docs/changes/lsp-* → archive/changes/`) — clean, pushed |
| **Origin sync** | scrmlTS clean+pushed except in-progress bookkeeping bundle. scrml-support clean+pushed. |
| **Tests** | **8,886 pass / 44 skip / 0 fail / 8,930 across 439 files** (post Step 11.0e; +12 pass / +1 skip vs S60 close) |
| **Inbox** | empty |
| **Branch** | `main` |
| **Working tree (both repos)** | scrmlTS has bookkeeping bundle staged; scrml-support clean |
| **Maps state** | `.claude/maps/` last touched 2026-04-24 — S61 refresh attempted but agent's Write tool was permission-denied; findings returned as text. Item #1 (SPEC head) actioned. Item #2 (curation) **9 of 10 batches done** (J remaining). |

---

## 1. Where we are in v0.next migration

- **Phase A1a: 17/20 done.** Steps 1-12 + 11.0a/b/c/e + 11.5 all complete. Remaining: **11.0d (P-FUP-1; top-level Shape 1, ~3-6h, BRIEF)** → **11.0f (P-FUP-3 NEW; `<x> = ?{SQL}\n<y>` BLOCK_REF boundary, ~1-3h, BRIEF NEW S61)** → **13 (final commit + CHANGELOG + cleanup `scripts/step12-*.mjs`, ~0.5h)**.
- **Step 11.0e (P-FUP-2 fix) LANDED S61** as `916de65`. Universal fix — `"not"` added to `VALUE_KEYWORDS` Set; preserves Step 11.0b universality. +8 tests; 4 of 5 Step 12 reverted samples restored. **Surfaced P-FUP-3** (combined-007-crud has BLOCK_REF same-shape bug) → queued as Step 11.0f.
- **A1b SCOPE FULLY RATIFIED** at S60 close. 22 steps; ~85-120h focused work. Sequence: 11.0d/f → 13 → A1b/B1.
- **A1c SCOPE FULLY RATIFIED** at S60 close. 24 steps including new C0 feature-usage analyzer. ~96-136h. **Pre-existing Shape 3 V5-strict codegen gap deferred to A1c** (surfaced S61 Step 11.5; documented in §6.4 of A1c plan).
- **3 P-FUPs surfaced S61, 1 of 3 fixed:**
  - ⏸ **P-FUP-1 → Step 11.0d:** top-level Shape 1 NOT implemented in BS despite SPEC §6.2. 3 samples reverted.
  - ✅ **P-FUP-2 → Step 11.0e:** `<x> = not\n<y>` boundary bug — FIXED.
  - ⏸ **P-FUP-3 → Step 11.0f:** `<x> = ?{SQL}\n<y>` BLOCK_REF boundary bug. 1 sample reverted (combined-007-crud).
- **Curation pass — 9 of 10 batches done** — `docs/changes/` 103 → 41 (65 dirs dereffed). Only Batch J (misc, 12 dirs) remains.

---

## 2. S61 progress so far

1. ✅ Session-open checklist completed.
2. ✅ Test baseline 8,874 / 43 / 0 / 8,917 confirmed at open.
3. ✅ **Step 11.5 LANDED** (`a020ea1`). T2; +4 pass / +1 skip. Pre-existing Shape 3 codegen gap deferred to A1c.
4. ✅ **SPEC head broken-path cleanup** (`0a48700`).
5. ✅ **Step 12 SURVEY pre-staged** + Q1+Q2 ratified.
6. ✅ Maps refresh attempted (Write-denied; 8 non-compliance categories surfaced).
7. ✅ **Curation Batch A** EXECUTED — 12 P-series dirs dereffed.
8. ✅ **Curation Batch C** EXECUTED — 7 dispatch-app M-series dirs dereffed.
9. ✅ **Step 12 LANDED** (`7be23aa`). T2; ZERO net delta. 2 P-FUPs surfaced.
10. ✅ **P-FUP-1 + P-FUP-2 BRIEFs drafted** (Steps 11.0d + 11.0e).
11. ✅ **Curation Batch B** EXECUTED — 4 expr-ast-phase-4d dirs.
12. ✅ **Curation Batch F** EXECUTED — 2 BUG-letter dirs.
13. ✅ **Curation Batch D** EXECUTED — 11 F-series dirs.
14. ✅ **Curation Batch I** EXECUTED — 20 fix-* dirs (6 cross-refs fixed).
15. ✅ **Curation Batches E + G combined** EXECUTED — 4 dirs.
16. ✅ **Step 11.0f BRIEF drafted** (P-FUP-3 NEW, ~1-3h queued).
17. ✅ **Curation Batch H** EXECUTED — 5 LSP dirs (2 J-pile cross-refs pre-fixed).
18. ✅ **Step 11.0e LANDED** (`916de65`). T2; +8 tests; 4/5 samples restored; surfaced P-FUP-3.
19. ⏸ **Step 11.0d dispatch** — queued (~3-6h).
20. ⏸ **Step 11.0f dispatch** — queued (~1-3h).
21. ⏸ **Curation Batch J** — 12 misc dirs remaining.
22. ⏸ **Step 13** — wrap A1a after 11.0d + 11.0f.
23. ⏸ **A1b/B1 dispatch** — begins after Step 13.

---

## 3. Open questions / next-session checklist

1. **Push posture (LIVE).** 8 commits ahead of origin/main (1 SPEC cleanup + 6 Step 11.5 + 1 doc bundle). Push pending.
2. **Step 12 dispatch ready** — SURVEY ratified, BRIEF exists, scope clear. Dispatch on user signal; estimated 4-8h.
3. **Maps refresh root cause** — agent's Write-denied issue needs investigation before next maps dispatch. Defer or address standalone next session.
4. **Non-compliance items surfaced by maps agent** — 7 actionable categories beyond the SPEC cleanup already done:
   - `docs/changes/` 103 dirs — wholesale curation candidate (most are completed dispatches; pa.md "current truth only" suggests deref to scrml-support archive). User decision required for batch deref.
   - `docs/deep-dives/` (3 files) — pa.md scope says deep-dives belong in scrml-support.
   - `docs/recon/` (8 docs, 2026-04-29) — likely S48-49-era; spot-check status.
   - `docs/experiments/` (5 docs) — kickstarter-v0/v1 lineage; v2 canonical.
   - `docs/articles/*-draft-*-2026-04-25.md` — possibly superseded by `*-devto-*-2026-04-28.md` siblings.
   - `benchmarks/fullstack-react/CLAUDE.md` — pre-existing carry from S29.
   - Stale per-fix annotations across remaining maps (pre-existing carry).
5. **Carried forward from S60:**
   - **Article truthfulness audit dispositions** — 15 articles classified S59; user cross-references + decides.
   - **scrml.dev v0.2.0 announce publishing** — draft at `docs/website/v0.2.0-announce-2026-05-05.md`. User timing.
   - **`tier-ladder-promotion` article** — `published: false`; gated on A2.

---

## 4. ⚠️ Things S62 PA (and remaining S61 work) must NOT screw up

1. **PA-SCRML-PRIMER §12 depth-of-survey discount** — pattern is now 8× confirmed with three shape variants captured: zero-source (S60 Step 10), discovered-blocker escalation (S60 Step 11), high-reuse pattern (S60 Step 11.0c, S61 Step 11.5 hidden-coupling discovery). APPLY mitigations.
2. **AST kind is `state-decl`, NOT `reactive-decl`.** All A1a Steps 1-11 + 11.0a/b/c + 11.5 done at S61.
3. **`reactive-derived-decl` IS RETIRED (S61 Step 11.5).** Folded into `state-decl{shape:"derived",isConst:true,structuralForm:false}` via ADR Option A. The kind enum no longer includes `"reactive-derived-decl"`. Discriminator is now `kind === "state-decl" && shape === "derived"` everywhere. **6 self-host files still reference the old kind** — catches up at next bootstrap regen; A1b/A1c walks should NOT see the old kind in TS-compiler-emitted AST.
4. **Validator args are `string[]` for now** (Step 5 deferral). A1b B9 owns the conversion to ExprNode[].
5. **Variant C compound (Step 11.0a)**: state-decl parents have `children: [...]`; assert `shape:"plain"` AND `initExpr:null` AND no `isConst:true`. Both `</>` and `</NAME>` closers accepted at parse time (A1b enforces name-match).
6. **Newline-as-separator (Step 11.0b)**: lives in `collectExpr` ASI-NEWLINE branch L1985-2030. Universal benefit — fires for ALL ASI gaps.
7. **Typed-decl (Step 11.0c)**: state-decl carries `typeAnnotation?: string` (raw type-form text). `collectTypeAnnotation()` is the canonical type-form collector.
8. **`reset-expr` AST kind (Step 9)**: full tree walker `forEachResetExprInExprNode`.
9. **MemberCall/MemberAssignment/UnaryDelete (Step 10)**: dual-path discrimination — specialized kinds AND `bare-expr.exprNode` structural walk. B8 walker must handle BOTH.
10. **`@`-prefix discrimination (Step 10)**: `ident.name` preserves the `@` prefix verbatim. Pure string-shape inspection.
11. **Step 11.5 hidden-coupling fix at emit-logic.ts (S61)**: derived-cell emit gated on `shape === "derived" && isConst === true && structuralForm === false`. **Pre-existing Shape 3 V5-strict gap (`structuralForm:true`) deferred to A1c** — Shape 3 V5-strict still emits `_scrml_reactive_set` not `_scrml_derived_declare`. A1c step extending this gating to V5-strict is captured in `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §6.4.
12. **Step 11.5 dep-graph dedup fix (S61)**: `collectAllReactiveDecls` carries `isFoldedDerived` exclusion filter so folded-derived state-decls are walked once (by the derived collector), not twice.
13. **Path-discipline regression risk** — for cross-tree git ops, USE `git -C <abs-path>` form. Bash CWD can drift between tool calls (verified S61 — drifted into worktree mid-session).
14. **Test invariant — anti-html-fragment guard** is non-negotiable on every Shape-1/2/3 positive test.
15. **Step 12 SURVEY pre-staged + Q1 + Q2 ratified S61.** Don't re-litigate Q1 (transition-decl OUT-OF-SCOPE) or Q2 (legacy `@x = init` REWRITE to V5-strict). SURVEY at `docs/changes/phase-a1a-step-12-existing-test-deltas/SURVEY.md`.
16. **A1b SCOPE FULLY RATIFIED.** 22 steps. Don't re-litigate.
17. **A1c SCOPE FULLY RATIFIED.** 24 steps incl. C0 feature-usage analyzer. Plus §6.4 carry-forward Shape 3 codegen gap.

---

## 5. Session log (append-only as work proceeds)

### S61 open — caught up
- Read `pa.md`, `docs/PA-SCRML-PRIMER.md` in full, S60 close hand-off, user-voice tail (~last 10 contentful entries S58-S59).
- Cross-machine sync: scrmlTS clean+pushed, scrml-support clean+pushed.
- Test baseline confirmed: 8,874 / 43 / 0 / 8,917 / 439 files.
- Inbox empty; no incoming messages.
- Hand-off rotated S60 → `handOffs/hand-off-60.md`; this file is fresh S61.

### S61 progress — Step 11.5 + SPEC cleanup + Step 12 SURVEY
- **Step 11.5 dispatched** to `scrml-dev-pipeline` worktree (`isolation: "worktree"`, model: opus). Brief packed: BRIEF + ADR + AST contracts + path-discipline + survey-first mandate + 6-step WIP commit cadence.
- **Maps refresh dispatched** in parallel to `project-mapper`. Returned with Write-denied issue (system-level directive). Findings captured as text — 8 non-compliance categories surfaced.
- **Step 12 SURVEY** drafted PA-side (`docs/changes/phase-a1a-step-12-existing-test-deltas/SURVEY.md`). Q1 (transition-decl) + Q2 (legacy `@x = init`) ratified by user this session. Q1 OUT-OF-SCOPE; Q2 REWRITE Option A.
- **SPEC head cleanup** committed `0a48700` (4 broken-path lines → 1 archive pointer).
- **Step 11.5 landed** clean: 8,878 / 44 / 0 / 8,922; 6-commit chain cherry-picked onto main as `3cdf9cc..a020ea1`. Hidden coupling caught + resolved. Pre-existing Shape 3 codegen gap deferred to A1c.
- **S61 first doc bundle** committed `1e1ac10`. 8-commit batch pushed.

### S61 progress — Curation pass + Step 12 + P-FUPs
- **Curation matrix drafted** (`docs/curation/2026-05-05-changes-dir-disposition.md`). 103 docs/changes/ dirs classified into 10 batches; PA proposes per-dir disposition; user ratifies per-batch.
- **Curation Batch A (P-series, 12 dirs) RATIFIED + EXECUTED** as cross-repo cluster. scrmlTS commit `f4c0081`; scrml-support commit `df2f3d2`. Both pushed. 1 cross-ref fix in `examples/23-trucking-dispatch/FRICTION.md`.
- **Curation Batch C (dispatch-app M-series, 7 dirs) RATIFIED + EXECUTED** as cross-repo cluster. scrmlTS commit `729e57c`; scrml-support commit `9943174`. Both pushed. 2 cross-ref fixes in `examples/23-trucking-dispatch/README.md`.
- **Step 12 dispatched** to `scrml-dev-pipeline` worktree. 9-commit chain produced; 175 sample files migrated; ZERO net delta confirmed. **2 NEW parser-gap follow-ups (P-FUP-1, P-FUP-2)** surfaced. Cherry-picked onto main as `1fcb30c..7be23aa` (final commit empty marker via `--allow-empty -C 8038f8b`).
- **P-FUP BRIEFs drafted** for Step 11.0d (top-level Shape 1; ~3-6h) + Step 11.0e (`<x> = not\n<y>` boundary; ~1-3h).
- **Master-list, AST-CONTRACTS, changelog, hand-off updated** for 16/19 done + new P-FUPs + curation status.
- **`docs/changes/` count: 103 → 84.** Path discipline pattern: `git -C <abs-path>` for cross-tree ops continues to work.

---

## 6. Tags

#session-61 #step-11-5-landed #step-12-landed #step-11-0e-landed #spec-head-cleanup #q1-ratified-out-of-scope #q2-ratified-option-a #phase-a1a-17-of-20 #a020ea1 #7be23aa #916de65 #curation-9-of-10-batches-executed #curation-65-dirs-dereffed #p-fup-1-step-11-0d-queued #p-fup-3-step-11-0f-queued #zero-net-delta-step-12 #universal-fix-step-11-0e #shape-3-codegen-deferred-to-a1c
