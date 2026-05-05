# scrmlTS — Session 61 (OPEN — Step 11.5 LANDED + SPEC head cleanup + Step 12 SURVEY pre-staged)

**Date opened:** 2026-05-05
**Previous:** `handOffs/hand-off-60.md` (S60 close — 8 dispatch cycles, A1a 14/17 done, A1b/A1c FULLY RATIFIED, ADR ratified Option A FOLD as Step 11.5, Step 11 escalation FULLY CLOSED)

---

## 0. Session-state (LIVE)

| Item | State |
|---|---|
| **scrmlTS HEAD** | **`a020ea1`** (`compile(a1a-step-11-5): fold reactive-derived-decl into state-decl`) + S61 doc bundle pending |
| **Origin sync** | **8 commits ahead of origin** at this snapshot (1 SPEC cleanup `0a48700` + 6 Step 11.5 `3cdf9cc..a020ea1` + 1 incoming doc bundle); push pending |
| **scrml-support HEAD** | `f7b935a` — clean, untouched this session |
| **Tests** | **8,878 pass / 44 skip / 0 fail / 8,922 across 439 files** (S61 baseline post Step 11.5; +4 pass / +1 skip / +5 net vs S60 close; +1 skip is deferred self-host parity test) |
| **Inbox** | empty |
| **Branch** | `main` |
| **Working tree (both repos)** | scrmlTS has S61 doc bundle staged; scrml-support clean |
| **Maps state** | `.claude/maps/` last touched 2026-04-24 — S61 refresh attempted but agent's Write tool was permission-denied; findings returned as text + actionable non-compliance items captured. Maps refresh root cause investigation deferred to next session. |

---

## 1. Where we are in v0.next migration

- **Phase A1a: 15/17 done.** Steps 1-11 + 11.0a/b/c + **11.5 (LANDED S61, `a020ea1`)** all complete. Remaining: **12 (existing-test deltas; SURVEY pre-staged + Q1+Q2 ratified S61)** → **13 (final commit + CHANGELOG, ~0.5h)**.
- **A1b SCOPE FULLY RATIFIED** at S60 close. 22 steps; ~85-120h focused work. Sequence locked: 12 → 13 → A1b/B1.
- **A1c SCOPE FULLY RATIFIED** at S60 close. 24 steps including new C0 feature-usage analyzer (Q3 Option C compile-time elision selected). ~96-136h. **Pre-existing Shape 3 V5-strict codegen gap deferred to A1c** (surfaced S61 Step 11.5; documented in §6.4 of A1c plan).
- **ADR ratified S60 + LANDED S61.** Option A FOLD landed as Step 11.5 commit `a020ea1`.

---

## 2. S61 progress so far

1. ✅ Session-open checklist completed (pa.md, PA-SCRML-PRIMER, hand-off, user-voice tail, sync hygiene).
2. ✅ Test baseline 8,874 / 43 / 0 / 8,917 confirmed at open.
3. ✅ **Step 11.5 dispatched + landed.** T2-tier; 6-commit chain on `phase-a1a-step-11-5-fold-derived`; cherry-picked clean onto main as `a020ea1`. Hidden coupling at emit-logic.ts caught + resolved. Pre-existing Shape 3 codegen gap surfaced + deferred to A1c.
4. ✅ **SPEC head broken-path cleanup** committed `0a48700`. 4 dead path refs → 1 archive pointer.
5. ✅ **Step 12 SURVEY pre-staged** (`docs/changes/phase-a1a-step-12-existing-test-deltas/SURVEY.md`) + **Q1+Q2 ratified S61.** Q1 transition-decl OUT-OF-SCOPE (P3 + A2 territory). Q2 legacy `@x = init` decl form REWRITE to V5-strict canon.
6. ✅ Maps refresh attempted (Write-denied; agent returned text findings + 8 non-compliance categories surfaced).
7. ⏸ **Step 12 dispatch** — ready to dispatch on user signal. ~4-8h estimate.
8. ⏸ **Step 13** — wrap A1a after 12.
9. ⏸ **A1b/B1 dispatch** — begins after Step 13.

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
- **Doc bundle pending commit** at this snapshot: hand-off + master-list + changelog + AST-CONTRACTS + A1c plan + SURVEY.md additions.
- **8 commits ahead of origin** at this snapshot. Push pending.

---

## 6. Tags

#session-61 #step-11-5-landed #spec-head-cleanup #step-12-survey-ratified #q1-ratified-out-of-scope #q2-ratified-option-a #phase-a1a-15-of-17 #a020ea1 #a1b-ratified #a1c-ratified #adr-option-a-folded #shape-3-codegen-deferred-to-a1c
