# A1b Step B21 — Refinement-type predicates §53 basic three-zone — PROGRESS

Append-only log. Each step adds a timestamped line.

## 2026-05-08T03:39Z — STARTUP

- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1b359d790b2f64fc`
- Branch: `worktree-agent-a1b359d790b2f64fc`
- HEAD on entry: `4ac906f` — fast-forwarded to main `c8040ed` (post-B20 SHIP + B21 brief commit). Worktree was 11 commits behind main (missing B18, B19, B20, B22 SHIPs + briefs + S68 wrap).
- `bun install`: clean (114 packages installed).
- `bun run pretest`: clean (12 test samples compiled).
- Baseline `bun test compiler/tests/`: **9538 pass / 60 skip / 1 todo / 0 fail / 9599 total / 33411 expects**. Matches "9599/60/1/0 full" expected baseline.
- Brief expectations: 8851 pre-commit subset. Full suite 9538 pass; subset is filtered. Baseline OK.

Next: Phase 0 survey (mandatory GATE).

## 2026-05-08T03:55Z — PHASE 0 SURVEY COMPLETE

Wrote `SURVEY.md`. Summary: existing infrastructure is more complete than the brief implied.

**Key findings:**
- `classifyPredicateZone` + `predicateImplies` + `evaluatePredicateOnLiteral` + `checkPredicateLiteral` + `parsePredicateExpr` all robust and well-tested (compiler/tests/unit/three-zone.test.js + predicate-types.test.js cover ~50 sections).
- A1c codegen for E-CONTRACT-001-RT already wired in `compiler/src/codegen/emit-predicates.ts` + `emit-logic.ts:477,496,674,689` (boundary check emission).
- Static-zone literal-conformance fire (E-CONTRACT-001) DONE.
- E-CONTRACT-002 (unknown named shape) DONE.
- E-CONTRACT-003 (external @ref) DONE.
- Boundary-zone hook recording (`predicateCheck`) DONE for boundary case.

**Net B21 work (focused gap-fill):**
1. Annotate ALL three zones on AST (today only boundary records `predicateCheck`; static + trusted are silent). Per audit §4.2 brief #3: "Record three-zone classification on each refinement predicate".
2. Extend SourceInfo classification to detect `IdentExpr` resolving to predicated-typed binding in scope (today `classifyLiteralFromExprNode` returns only literal/arithmetic/unconstrained — `predicated` branch is unreachable from real code, only direct unit-test calls).
3. Add real-AST tests for trusted-zone propagation through let/state-decl.

**OUT OF SCOPE (per BRIEF + audit §4.2 brief #2):**
- Function-param / return-stmt / bare-expr reassignment three-zone classification → deferred (locus extension class).
- HTML attr generation, E-CONTRACT-004-WARN → A1c.
- Named-shape registry extension → open SPEC-ISSUE.

Next: implement the two work items.

## 2026-05-08T04:10Z — IMPLEMENTATION COMPLETE

Two changes to `compiler/src/type-system.ts`:

1. **New helper `upgradeSourceInfoForPredicatedIdent`** (~line 1656): when SourceInfo is `unconstrained` AND the init ExprNode is an `IdentExpr` (not bare-variant `.X`, not `~`), looks up the ident in the scope chain. If bound to a predicated-typed variable, upgrades SourceInfo to `{kind: "predicated", predType: ...}`. Conservative: leaves literal/arithmetic alone (literal is statically known; arithmetic strips constraints per T-PRED-5 regardless of operand types).

2. **Three-zone annotation completeness** at let-decl (line 3997+) and state-decl (line 4131+): records `predicateCheck = {predicate, zone, sourceKind}` for ALL three classifications (was: boundary-only). A1c codegen still gates runtime check emission on `zone === "boundary"` so this is additive + non-breaking.

Tests: full suite ran 9565/60/1/0 (was 9538/60/1/0) — **+27 new tests, 0 regressions**.

Pre-commit subset: 8841 pass / 49 skip / 1 todo / 0 fail / 8891 total (was 8814/49/1/0/8864).

## 2026-05-08T04:12Z — TESTS COMMIT

Wrote `compiler/tests/unit/refinement-three-zone-b21.test.js`: 13 describe blocks, 27 tests covering:
- §B21.1 static-zone literal pass
- §B21.2 static-zone literal fail (E-CONTRACT-001)
- §B21.3 boundary-zone unconstrained source
- §B21.4 boundary-zone arithmetic source (T-PRED-5)
- §B21.5 trusted-zone via T-PRED-4 — REAL AST PATH (B21 NEW)
- §B21.6 boundary-zone — predicate does not imply target
- §B21.7 trusted-zone — same named shape
- §B21.8 state-decl predicates (3-zone)
- §B21.9 E-CONTRACT-003 — predicate references @cell
- §B21.10 E-CONTRACT-002 — unknown named shape
- §B21.11 sourceKind metadata recorded
- §B21.12 conjunction implication via T-PRED-4
- §B21.13 SourceInfo upgrade safety (non-ident, non-predicated, dot-prefix)

Next: SHIP commit + reporting.

## 2026-05-08T04:25Z — SHIP COMPLETE

**FINAL_SHA:** `482d63c5bc8b8e5fe723030d4b389182fa5de0f2`
**WORKTREE_PATH:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1b359d790b2f64fc`
**Branch:** `worktree-agent-a1b359d790b2f64fc`

### FILES TOUCHED

- `compiler/src/type-system.ts` — modified: new helper `upgradeSourceInfoForPredicatedIdent` (~line 1656); annotation logic at let-decl (line ~3997) and state-decl (line ~4131) now records all three zones with sourceKind metadata.
- `compiler/tests/unit/refinement-three-zone-b21.test.js` — created: 13 describe blocks, 27 tests.
- `docs/PA-SCRML-PRIMER.md` — modified: added B21 row to §13.7 table + B21 specifics block after B20 specifics.
- `docs/changes/phase-a1b-step-b21-refinement-three-zone/BRIEF.md` — pre-existing (PA-drafted at S69).
- `docs/changes/phase-a1b-step-b21-refinement-three-zone/SURVEY.md` — created: Phase 0 findings.
- `docs/changes/phase-a1b-step-b21-refinement-three-zone/progress.md` — this file.

### TEST DELTA

vs baseline (S69 post-B20-SHIP, c8040ed):

| Metric | Baseline | After B21 | Delta |
|---|---|---|---|
| Full suite pass | 9538 | 9565 | **+27** |
| Full suite skip | 60 | 60 | 0 |
| Full suite todo | 1 | 1 | 0 |
| Full suite fail | 0 | 0 | 0 |
| Full suite total | 9599 | 9626 | +27 |
| Full expect calls | 33411 | 33453 | +42 |
| Pre-commit subset pass | 8814 | 8841 | **+27** |
| Pre-commit subset total | 8864 | 8891 | +27 |

### DEFERRED ITEMS

Per audit §4.2 brief #2 + ratified-scope narrowing:

- **Locus 3** — function-parameter zone classification at callsite. `function-decl` walker (line 3808) binds predicated params with their resolved type but does not classify caller-site zones. → A1c codegen.
- **Locus 4** — function-return zone classification. `return-stmt` walker (line 4806) checks scope but doesn't classify return-value predicate zones. → A1c codegen (parallels B20.b deferral).
- **Locus 5** — bare-expr reassignment to predicated state-decl. `bare-expr` walker (line 4267) tracks scope but doesn't re-classify predicates on `@cell = expr`. → A1c codegen.
- **Locus 6** — `reactive-nested-assign` (`@compound.field = expr`). Walker line 4887 lacks zone classification. → A1c codegen.
- **HTML attr generation** from named-shape predicates (§53.7) via `emit-html.ts`. Codegen utility tables already exist in `emit-predicates.ts` (`NAMED_SHAPE_HTML`). → A1c codegen.
- **E-CONTRACT-004-WARN** bind:value attribute conflict. → A1c codegen.
- **Trusted-zone elision optimization.** B21 RECORDS the marker; A1c codegen does NOT yet emit a no-check fast path that consumes it (today it just doesn't emit the runtime check when zone !== "boundary"). Future A1c optimization can treat trusted zone as a hint for elision diagnostics or fast-path codegen.
- **Full SPARK three-zone semantics** (§53.4 advanced cases beyond the basic three) — v0.3.0 candidate.
- **Named shape registry extension** via `^{}` meta blocks — open SPEC-ISSUE §53.13.1.
- **Constraint arithmetic** propagation (§53.13.2) — open SPEC-ISSUE.
- **Type-aliases for predicates** (§53.13.3) — open SPEC-ISSUE.
- **Boolean predicates** (§53.13.4) — open SPEC-ISSUE.
- **L4 predicate vocabulary unification** between §55 (state validators) and §53 (refinement predicates). Different syntactic surfaces today; unification is a v0.3.0 candidate. The B10 catalog at `validator-catalog.ts` was always a future-direction note for B21 ("Future B21 consumer"); B21 does not consume it directly because the syntactic surfaces diverge.

### OPEN QUESTIONS

1. Should `let x: number(>0) = 5` static-zone PASS produce a different `predicateCheck.zone` value (e.g., `"static-pass"` vs `"static-fail"`) so A1c can distinguish provably-correct from provably-wrong literals at codegen time? Today both produce `zone === "static"` — only the error-fire path differs. This is an A1c codegen consideration; B21 chose the simpler annotation shape that mirrors `classifyPredicateZone`'s return type.
2. The `sourceKind` field is informational. Should it be required by an interface contract or remain optional? Currently A1c codegen doesn't read it, so it's purely informational for IDE tooling / future optimizers / debug.
3. Should `upgradeSourceInfoForPredicatedIdent` also handle `MemberExpr` chains (e.g., `let x: T(P) = obj.predicatedField`)? Today only single `IdentExpr` upgrades. MemberExpr chain resolution would need cross-cell type-resolution infrastructure (compound-nav style); deferred.

### SPEC-PROSE FOLLOW-UPS

None required for B21 SHIP. §34 catalog rows 14181-14185 (E-CONTRACT-001..004-WARN) are intact. §53.4 / §53.10 / §53.11 spec text remains canonical and is not modified by B21.

### A1b CLOSER STATEMENT

After B21 lands, **A1b (resolve+type) is functionally COMPLETE — all 22/22 steps shipped**:

| Step | Status | Wave |
|---|---|---|
| B1  state-cell registration | SHIPPED | 1 |
| B2  name-collision check | SHIPPED | 1 |
| B3  @cell resolution | SHIPPED | 1 |
| B4  import bindings + pinning | SHIPPED | 1 |
| B5  cell-kind classification | SHIPPED | 2 |
| B6  render-spec validation | SHIPPED | 2 |
| B7  derived-cell cycle detection | SHIPPED | 2 |
| B8  derived-value mutation rejection | SHIPPED | 2 |
| B9  validator-arg parsing | SHIPPED | 3 |
| B10 validator type-check + cycle detection | SHIPPED | 3 |
| B11 compound-parent synth surface | SHIPPED | 3 |
| B12 per-field synth surface | SHIPPED | 3 |
| B13 inline override extraction + derived-with-validators | SHIPPED | 3 |
| B14 engine declaration registration | SHIPPED | 4 |
| B15 engine state-children + rule= validation | SHIPPED | 4 |
| B16 derived engines | SHIPPED | 4 |
| B17 components-vs-engines residual | SHIPPED | 4 |
| B18 multi-statement event-handler | SHIPPED | 5 |
| B19 channel placement + @shared rejection | SHIPPED | 5 |
| B20 bare-variant inference §14.10 | SHIPPED | 5 |
| B21 refinement-type three-zone §53 | **SHIPPED (this step)** | 5 |
| B22 reset(@cell) target shape | SHIPPED | 5 |

A1c (codegen + runtime) is the next phase.
