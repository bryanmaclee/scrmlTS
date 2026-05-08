# A1b Step B21 — Refinement-type predicates §53 basic three-zone — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S69. Wave 5 closer (2 of 2). FINAL A1b STEP. Ready to dispatch.

**Estimate:** SCOPE 4-6h → realistic **2-5h** with HEAVY depth-of-survey-discount potential. Existing `classifyPredicateZone` infrastructure at `type-system.ts:1629` is substantial — B21 is more likely a tightening / annotation-recording extension than a net-new implementation.

**Sequencing:** SEQUENTIAL after B20. Type-system.ts territory; sequential to avoid stale-base conflicts. **After B21 lands, A1b is functionally COMPLETE (22/22 steps).**

---

## Dispatch instructions for PA

1. Confirm main HEAD matches §"Main HEAD" below; if drift, update.
2. Dispatch via `general-purpose` subagent_type with `isolation: "worktree"` + `model: "opus"`.
3. Pass content below `---DISPATCH---` marker as the agent prompt.

---DISPATCH---

# Dispatch: A1b Step B21 — Refinement-type predicates §53 basic three-zone (Wave 5 closer 2/2; A1b CLOSER)

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule for compiler TS dispatches).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `git log --oneline -5` via Bash. Confirm HEAD is `79a1a96` or later (post-B20 SHIP).
5. Run `bun install` via Bash. (Worktrees do NOT inherit `node_modules` from main.)
6. Run `bun run pretest` via Bash. (Populates `samples/compilation-tests/dist/` for browser tests.)
7. Run `bun run test` (chains pretest) to confirm baseline matches expected pre-commit subset (~8851 pass / 49 skip / 1 todo / 0 fail).

**If any step fails, STOP and report.**

## Path discipline

ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for every Write/Edit. Translate any intake-doc path that starts with `/home/bryan-maclee/scrmlMaster/scrmlTS/...` into `$WORKTREE_ROOT/...` before writing. The S58/S68/S69 path-discipline rule is load-bearing.

## CRASH RECOVERY

**Commit after each meaningful change — don't batch.** Per pa.md global directive + S69 dispatch failure precedents (B18 first try + B20 first try both hit API errors mid-implementation): WIP commits are how the next agent picks up if you crash. Recommended chunks: Phase 0 survey complete; existing-infra audit; per-zone annotation recorder; tests; SHIP.

Update `docs/changes/phase-a1b-step-b21-refinement-three-zone/progress.md` after each step. WIP commits expected.

## CONTEXT — current main state (S69, post-B20 SHIP)

- **Main HEAD:** `79a1a96` (feat(a1b-b20): SHIP — bare-variant inference §14.10 / M9).
- **Phase A1b status:** B1-B20 + B22 ✅ all shipped. **B21 — THIS STEP — Wave 5 closer (2 of 2). FINAL A1b STEP.**
- **After B21 lands:** A1b is functionally COMPLETE (all 22 steps shipped). A1c (codegen+runtime) is next phase.
- **Active locks:** L1-L22. Critical for B21: **L4** (predicate vocabulary unification — the same shared-core predicates fire in three loci: state validators §55, refinement types §53, schema §39).
- **B10 catalog at `compiler/src/validator-catalog.ts`** is the single source of truth for the 14 universal-core predicates per SPEC §55.1 (req, is some, length, pattern, min, max, gt, lt, gte, lte, eq, neq, oneOf, notIn). B21 consumes this catalog (per audit §4.2 brief #1).

## SCOPE — B21 step definition

**Source of truth:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B21.

**B21 ratified scope** (per SCOPE §"§4.5" + audit ratification): subset for A1b: static-zone literal-conformance + boundary-zone hook recording. Trusted-zone elision deferred to A1c C16 OR post-v0.2.0 optimization. Full SPARK three-zone is a v0.3.0 candidate.

**Driver:**
- `compiler/SPEC.md` §53 — refinement-type predicate subsystem (the entirety; §53.4 is the three-zone normative section).
- `compiler/SPEC.md` §53.4 (~line 23673+) — three-zone SPARK enforcement model (literal/static + predicated/trusted-or-boundary + unconstrained/boundary).
- `compiler/SPEC.md` §53.11 — error code definitions for E-CONTRACT-001..-004-WARN.
- `compiler/SPEC.md` §34 catalog rows at lines 14181-14185 (E-CONTRACT-001, -001-RT, -002, -003, -004-WARN).

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §4 (B21 audit, ~lines 122-150).

**Per pa.md Rule 4:** spec text is normative. SPEC §53.4 + §53.11 are canonical. The B10 catalog is the predicate-signature single source of truth (per L4).

**KEY PHASE-0 FINDING (PA pre-survey, S69):** `classifyPredicateZone` ALREADY EXISTS at `type-system.ts:1629` (lines 1629-1656) and is INVOKED at:
- Line 3997 (let-decl annotation)
- Line 4131 (state-decl reactive annotation)

The function classifies into "static" / "trusted" / "boundary" and at literal-source already calls `checkPredicateLiteral` which pushes E-CONTRACT-001 on static failure. Helper functions live at:
- `parsePredicateExpr` (line 718)
- `evaluatePredicateOnLiteral` (line 909)
- `formatPredicateExpr` (line 1405)
- `checkPredicateLiteral` (line 1431)
- `predicateImplies` (line 1585)

**This means B21 is HEAVILY EXTENSION, NOT NET-NEW.** Phase 0 survey must determine specifically what's missing relative to the ratified scope.

## REQUIRED B21 IMPLEMENTATION

### 1. Phase-0 survey GATE (mandatory, ~30-90min — likely shortcuts heavily)

The depth-of-survey-discount is critical here. Phase 0 confirms what's actually missing relative to the ratified scope. Hypothesized state:

| Sub-feature | Likely state | B21 work |
|---|---|---|
| **Static-zone literal-conformance check** | DONE (`checkPredicateLiteral` + `evaluatePredicateOnLiteral`) | Verify; possibly add edge-case coverage; possibly add tests |
| **Boundary-zone runtime hook RECORDING** | UNKNOWN — need survey | Likely needs annotation on AST/_record so A1c codegen knows to emit runtime check |
| **Trusted-zone elision marker** | UNKNOWN — need survey | Likely needs annotation so A1c codegen can elide |
| **Per-call-site classification** | UNKNOWN — need survey | classifyPredicateZone is called at decl sites; assignment sites + return sites + parameter sites may need extension |
| **Source-info classification** | LOOKS DONE for literal/predicated/arithmetic/unconstrained | Verify; may need extension for new RHS shapes |

Phase 0 also verifies:
- (a) **What annotation does A1c codegen need on each predicated decl/assign/return?** Read `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §A1c if available; check `code-generator.js` or successor for predicate-related TODOs / hooks.
- (b) **Six §53.4 enforcement loci:** decl, assignment, function param, function return, match arm body (rare), and any other position the spec normatively requires. Compare to current invocation sites (lines 3997 + 4131 cover decls; the others are likely net-new or partially covered).
- (c) **B10 catalog reuse path.** When B21 needs to know what predicates exist + their signatures, it consumes B10's catalog at `compiler/src/validator-catalog.ts`. Confirm the import path and reuse the existing validation infrastructure.
- (d) **E-CONTRACT-003 handling** (predicate references external state — line 14184). Per §53.10 + audit context, predicates that read `@cell` or other external state MUST emit E-CONTRACT-003. Survey confirms whether this is implemented + where.
- (e) **Existing test coverage.** Search `tests/unit/` for refinement-type / predicate / contract tests. Identify what's already exercised; B21 gap-fills.

### 2. Three-zone semantics per §53.4 + audit §4.1

| Zone | Trigger | Compile action | Runtime action |
|---|---|---|---|
| **Static** | Literal source value satisfies/fails predicate at compile time | `evaluatePredicateOnLiteral`; pass → silent; fail → fire `E-CONTRACT-001` | None |
| **Boundary** | Source is unconstrained / arithmetic / weaker-predicated | RECORD annotation on the AST node / scope record | A1c codegen emits runtime check; runtime fail → fire `E-CONTRACT-001-RT` |
| **Trusted** | Source predicate statically implies target predicate | RECORD elision marker | None — value is statically proven to satisfy target |

### 3. Annotation surface (per audit §4.2 brief #3)

B21 records three-zone classification on each refinement predicate at each enforcement locus. The annotation format depends on the existing AST/scope shape — Phase 0 determines:
- Where the annotation lives (`StateCellRecord` extension? AST node field? scope-chain entry?).
- What downstream consumer (A1c codegen) expects to read.

Per audit §4.2: "Record three-zone classification on each refinement predicate — annotation consumed by A1c codegen."

### 4. B21 fires at compile-time for static-zone violations

Per audit §4.2 brief #4: B21 fires at compile-time for static-zone violations (literal cannot satisfy predicate). Boundary + trusted are codegen-time concerns. Today, `checkPredicateLiteral` already fires E-CONTRACT-001 — B21's static-zone work is likely just gap-filling test coverage + verifying all literal-source assignment / return / param sites flow through.

### 5. E-CONTRACT-003 (predicate references external state)

§53 forbids `@cell` references inside predicate expressions (predicates are stateless). B21 enforces this at compile time. Survey verifies whether `parsePredicateExpr.hasExternalRef` is currently checked + where it fires.

## OUT OF SCOPE for B21 (explicit)

- **Trusted-zone elision** — RECORDED only; A1c emits OR post-v0.2.0 optimization. B21 just records the marker.
- **Full SPARK three-zone semantics** — beyond the basic three. v0.3.0 candidate.
- **Named shape registry (§53.13.1)** — open SPEC-ISSUE; out of scope.
- **Constraint arithmetic (§53.13.2)** — open SPEC-ISSUE; out of scope.
- **Type-alias for predicates (§53.13.3)** — open SPEC-ISSUE; out of scope.
- **Boolean predicates (§53.13.4)** — open SPEC-ISSUE; out of scope.
- **`bind:value` HTML attribute generation** (E-CONTRACT-004-WARN) — A1c codegen.
- **A1c runtime check emission** — codegen concern. B21 RECORDS; A1c EMITS.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md`:
   - §53 entirety — refinement-type subsystem.
   - §53.4 (~line 23673+) — three-zone PRIMARY normative source.
   - §53.10 — `@cell` references forbidden in predicates (E-CONTRACT-003 source).
   - §53.11 — error code definitions.
   - §34 catalog (lines 14181-14185) — E-CONTRACT-001..004-WARN.
   - **Use** `grep -nE "^####? +53\\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13 (L4 lock — predicate vocabulary unification cross-loci).

3. `compiler/src/type-system.ts`:
   - `classifyPredicateZone` at line 1629
   - `parsePredicateExpr` at line 718
   - `evaluatePredicateOnLiteral` at line 909
   - `checkPredicateLiteral` at line 1431
   - `predicateImplies` at line 1585
   - Existing call sites at lines 3997, 4131

4. `compiler/src/validator-catalog.ts` — B10 catalog (single source of truth for 14 universal-core predicates).

5. `compiler/src/types/ast.ts` — predicated-type AST shape.

## TEST EXPECTATIONS

- All existing tests remain green.
- Add B21-specific tests covering:
  - **Static zone:** literal value satisfies predicate (silent); literal value violates predicate (fires E-CONTRACT-001 with predicate text + literal value).
  - **Boundary zone:** unconstrained source → annotation recorded for A1c codegen (verify annotation present, no static error).
  - **Boundary zone arithmetic:** `let x: number(>0) = a + b` where a, b unconstrained → annotation recorded.
  - **Trusted zone:** source predicate implies target → annotation marker recorded (no runtime check needed).
  - **E-CONTRACT-003:** predicate with `@cell` reference fires.
  - **Per-locus coverage:** decl, assignment, function param (if implemented), function return (if implemented).
  - **Spec-edge cases:** disjunctive predicates, nested predicates, boolean composition.

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b21-refinement-three-zone/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA (vs S69 post-B20 baseline 9599/60/1/0 full; 8851 pre-commit subset)
5. DEFERRED_ITEMS (likely: per-locus extensions for fn param/return; trusted-zone elision; named shape registry)
6. OPEN_QUESTIONS
7. PRIMER §13.7 B21 ROW DRAFT + B21 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b21-refinement-three-zone/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (any §34 / §53 amendments)
10. **A1b CLOSER STATEMENT** — confirm A1b is functionally complete after this step (22/22).

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B21.
- Rule 2: Production-language fidelity — refinement-type predicates are core type-system. Correctness > minimal scope.
- Rule 3: Right answer beats easy answer 99.999% of the time. The B21 scope was deliberately narrowed to ratified subset (boundary-record + static-fire); don't expand without surfacing.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §53 directly. The `classifyPredicateZone` existing implementation MAY have drifted from current spec wording — survey verifies.
- No `--no-verify` on pre-commit hook unless explicitly authorized.
- **Depth-of-survey-discount opportunity:** Heavy. Existing infra likely covers more than the SCOPE row's 4-6h estimate suggests. Surface the actual gap relative to ratified scope; don't reimplement working code.

## CROSS-REFS for context

- `docs/audits/a1b-b18-b22-wave5-rule4-audit-2026-05-07.md` §4 — B21 audit (READ FIRST).
- `docs/PA-SCRML-PRIMER.md` §13 (L4 lock).
- `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.5 row B21 + ratified scope notes.
- B10 catalog landing — sets the predicate-signature single source of truth.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.

**After B21 lands, A1b is functionally complete (22/22 steps shipped).** A1c (codegen+runtime) is next phase.
