# A1b Step B15 — engine state-child exhaustiveness + rule= typer + initial= validation — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S68. Ready to dispatch once B14 lands. PA must update §"Main HEAD" + ensure B14 specifics in primer §13.7 are landed before firing.

**Estimate:** 5-7h (per audit; SCOPE was 4-6h, audit added ~1h).

**Sequencing:** STRICT SEQUENTIAL after B14. Reads B14's `_engineMeta` annotation. Can run **PARALLEL with B16 + B17** post-B14 land (different walker territories per audits).

---

## Dispatch instructions for PA

When ready to dispatch:

1. Confirm B14 has landed (`git log --oneline -5` for `feat(a1b-b14)`).
2. Confirm primer §13.7 has B14 row + specifics block landed.
3. Update §"Main HEAD" below to current main tip post-B14.
4. Dispatch via `general-purpose` (scrml-dev-pipeline fallback per pa.md) with `isolation: "worktree"` + `model: "opus"`.
5. Pass content below `---DISPATCH---` marker as the agent prompt.
6. Fire B15 + B16 + B17 dispatches in the same message for parallel execution.

---DISPATCH---

# Dispatch: A1b Step B15 — engine state-child exhaustiveness + rule= typer + initial= validation

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule; agent unavailable in this session).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chains pretest) to confirm baseline.

**If your worktree was created from a base BEFORE current main HEAD:** rebase your branch onto local main. The harness may pick up `origin/main` rather than local `main` (S68 observation).

**Path discipline:** ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit. NEVER use main repo root paths directly.

## CRASH RECOVERY

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b15-engine-statechild-typer/progress.md` after each step. WIP commits expected. Branch name suggestion: `phase-a1b-step-b15-engine-statechild-typer`.

## CONTEXT — current main state (S68, post-B14)

- **Main HEAD:** [TO BE UPDATED — current main tip post-B14 land]
- **Phase A1b status:**
  - B1-B13 ✅ all shipped
  - **B14** ✅ shipped at [TO BE UPDATED] — engine cell registered as `StateCellRecord` with `_cellKind: "engine"` + `_engineMeta` annotation; auto-declared variable; cross-file mount via `<EngineName/>`; MOD exportRegistry engine-aware; E-COMPONENT-ENGINE-SCOPE fired at engine-decl-inside-component-body site. See primer §13.7 B14 specifics block for `_engineMeta` shape.
  - **B15 — THIS STEP**
  - B16 + B17 dispatched in parallel (different walker territories)

- **Active locks:** L1-L22. Critical for B15: M16 (auto-declared engine variable), §51.0.E (initial= lint), §51.0.F (rule= contract three target-only forms — NOT event-arrow legacy `<machine>` syntax).

## SCOPE — B15 step definition

Source of truth: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.4 row B15.

**Estimate:** 5-7h (post-audit expansion; SCOPE was 4-6h).

**Driver:** `compiler/SPEC.md` §51.0.B (declaration syntax), §51.0.E (`initial=`), §51.0.F (`rule=` three target-only forms — NOT event-arrow), §51.0.G (`.advance(.X)`), §34 catalog.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b15-rule4-audit-2026-05-07.md` (full file, ~162 lines).

The audit identified 2 substantive drifts + 1 boundary clarification. The 7-point brief expansion below incorporates them.

**Per pa.md Rule 4:** spec text is normative; SCOPE doc is derived. The audit reconciled SCOPE wording (`rule="event -> Variant"`) against §51.0.F canonical (target-only three forms). Trust the audit's reconciled brief.

**S68 spec amendment landed (`1de05ef`):** §51.0.F three target-only forms are CANONICAL for `<engine>`. The arrow form `event -> Variant` is legacy `<machine>` syntax (§51.3, deprecated). Primer §7 was corrected at S67 (`53825da`). B15 validates against §51.0.F three forms — DO NOT accept event-arrow form on `<engine>`.

## REQUIRED B15 IMPLEMENTATION (per audit §2 — 7-point brief)

### 1. `rule=` syntax per §51.0.F (NOT event-arrow legacy)

Three legal forms per §51.0.F (line 20220-20269):
- **Single-target:** `rule=.NextVariant`
- **Multi-target:** `rule=(.A | .B | .C)`
- **Wildcard:** `rule=*` (escape hatch)

`rule=` absent on a state-child: legal; means "no transitions allowed FROM this variant" (terminal state).

For each state-child with a `rule=` attribute:
- Parse the attribute value into one of the three forms.
- Single-target / multi-target: every `.Variant` must match the engine's type variants (read from B14's `_engineMeta.variants`). Mismatch fires `E-ENGINE-RULE-INVALID-VARIANT` (canonical name TBD; Phase-0 survey).
- Wildcard `*`: legal; emit info-level note `I-ENGINE-RULE-WILDCARD-USED` (optional; primer §7 doesn't require).
- Reject any event-arrow form (`event -> Variant`) on `<engine>` (legacy `<machine>` syntax only). Fire appropriate diagnostic.

### 2. `initial=` validation (B14 records, B15 enforces)

Per B14 audit §1.4: B14 records `initial=`'s presence + value on `_engineMeta.initialVariant`; B15 owns validation.

For each engine cell with `_cellKind === "engine"` AND `_engineMeta.derivedExpr === null` (non-derived):
- Read `_engineMeta.initialVariant`.
- If absent: fire `W-ENGINE-INITIAL-MISSING` (lint per §51.0.E — defaults to first variant for codegen).
- If present but not a valid variant of the engine's type: fire `E-ENGINE-INITIAL-INVALID-VARIANT` (canonical name TBD; Phase-0 survey).

If `_engineMeta.derivedExpr !== null` (derived engine): SKIP initial= validation. B16 owns derived-engine specific rejections (E-DERIVED-ENGINE-NO-INITIAL).

### 3. State-child exhaustiveness — every variant must have a state-child

For each engine cell with `_cellKind === "engine"`:
- Read engine type's variant list (from `_engineMeta.variants`).
- Walk engine state-decl's children.
- For each variant of the type: confirm a state-child with matching PascalCase name exists.
- Missing: fire `E-ENGINE-STATE-CHILD-MISSING` (canonical name TBD).
- For each state-child: confirm its tag matches a variant of the type.
- Unknown tag: fire `E-ENGINE-STATE-CHILD-INVALID-VARIANT` (canonical name TBD).

Apply uniformly across non-derived AND derived engines (per audit §1.3 edge case — derived engines also list variants).

### 4. Compile-time E-ENGINE-INVALID-TRANSITION (statically-known from-state)

Per §51.0.F line 20250-20262: when from-state is statically known (inside a state-child body), the compiler knows `@engineCell == .ThisVariant`. Assignments `@engineCell = .NewVariant` must match the from-state's `rule=` set.

Walk inside each state-child body. For each direct write to the engine variable (or `.advance(.X)` call):
- Check the target variant against the surrounding state-child's `rule=` set (from `_engineMeta`).
- If not in the set (and rule= is not `*`): fire `E-ENGINE-INVALID-TRANSITION` compile-time.

`.advance(.X)` shape: MemberCall with receiver `@engineCell`, method `advance`. Same validation as direct write.

Runtime check (dynamic from-state) is A1c codegen + runtime, NOT B15.

### 5. Boundary with B16 — derived engines

B16 owns derived-specific rejections (E-DERIVED-ENGINE-NO-RULES, E-DERIVED-ENGINE-NO-INITIAL, E-DERIVED-ENGINE-NO-WRITE, E-DERIVED-ENGINE-CIRCULAR). B15's `initial=` validation runs only on non-derived engines. B15's `rule=` validation runs uniformly (a derived engine with rule= will fire E-DERIVED-ENGINE-NO-RULES at B16 — separate path).

### 6. Reusability — B14's `_engineMeta` consumer

B15 READS B14's `_engineMeta` to perform validation. B15 does NOT extend the metadata structure. Pure validation walker over B14's pre-computed metadata.

The walker is a new SYM PASS (next available number after B13's PASS 9). Mirror the structural-recursion pattern of PASS 5/6/7/8/9. Trigger: `node.kind === "state-decl" && _cellKind === "engine"`.

### 7. Phase-0 survey gate (mandatory, ~30-60min)

Confirm:
- (a) §51.0.F-vs-primer-§7 syntax — primer §7 was corrected at S67 (`53825da`); verify primer is canonical (target-only).
- (b) §34 catalog rows for E-ENGINE-STATE-CHILD-MISSING, E-ENGINE-STATE-CHILD-INVALID-VARIANT, E-ENGINE-INITIAL-INVALID-VARIANT, E-ENGINE-RULE-INVALID-VARIANT (canonical naming; may need additions).
- (c) Compile-time E-ENGINE-INVALID-TRANSITION fire site — does B15 walk inside state-child bodies for assignments, or does that fold into another walker (e.g., B8/B11/B12 PASS 6 walker that handles E-DERIVED-VALUE-MUTATE / E-SYNTHESIZED-WRITE)?
- (d) `_engineMeta.variants` reliability — does B14 populate this from the type registry? Cross-check with B14's primer specifics block.

Survey may surface depth-of-survey-discount. Document findings in progress.md + SURVEY.md.

## OUT OF SCOPE for B15 (explicit)

- **Engine cell registration** — B14.
- **Cross-file mount validation** — B14.
- **MOD exportRegistry engine-aware** — B14.
- **E-COMPONENT-ENGINE-SCOPE engine-decl-inside-component fire-site** — B14.
- **Derived-engine specific rejections** — B16.
- **E-DERIVED-ENGINE-CIRCULAR** — B16 (via B7 reuse).
- **`.advance` on derived engines (fires E-DERIVED-ENGINE-NO-WRITE)** — B16.
- **`<onTransition>` + `effect=` validation** — B17.
- **A1c codegen** — runtime emission. B15 records / fires compile-time only.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md` §51.0 sections (canonical):
   - §51.0.B declaration syntax
   - §51.0.E `initial=` attribute (B15 validates)
   - §51.0.F `rule=` contract (THREE target-only forms)
   - §51.0.G `.advance(.X)` (B15 validates compile-time)
   - **NOTE:** Use `grep -nE "^####? +51\.0\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §13.7 — B14 row + specifics (CRITICAL — B15 consumer).

3. `compiler/src/symbol-table.ts` — find appropriate location for new walker pass after B14's.

4. `compiler/src/types/ast.ts` — `_engineMeta` shape (B14 establishes).

## TEST EXPECTATIONS

- All existing tests remain green (post-B14 baseline).
- Add B15-specific tests:
  - State-child exhaustiveness (every variant has matching PascalCase tag).
  - Missing state-child fires E-ENGINE-STATE-CHILD-MISSING.
  - Unknown state-child tag fires E-ENGINE-STATE-CHILD-INVALID-VARIANT.
  - `initial=` absent fires W-ENGINE-INITIAL-MISSING (non-derived).
  - `initial=` invalid variant fires E-ENGINE-INITIAL-INVALID-VARIANT.
  - `rule=.X` valid variant: pass; `.UnknownVariant` fires E-ENGINE-RULE-INVALID-VARIANT.
  - `rule=(.A | .B)` multi-target: each member validated.
  - `rule=*` wildcard: pass.
  - Inside `<Small rule=.Big>` body: `@marioState = .Cape` fires compile-time E-ENGINE-INVALID-TRANSITION.
  - Inside `<Small rule=.Big>` body: `.advance(.Cape)` fires compile-time E-ENGINE-INVALID-TRANSITION.
  - Derived engine: B15 skips initial= validation (B16 owns).

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b15-engine-statechild-typer/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA
5. DEFERRED_ITEMS
6. OPEN_QUESTIONS
7. PRIMER §13.7 B15 ROW DRAFT + B15 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b15-engine-statechild-typer/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (any §34 catalog rows added)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B15.
- Rule 2: Production-language fidelity, not MVP.
- Rule 3: Right answer beats easy answer 99.999% of the time.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §51.0.E + §51.0.F directly.
- No `--no-verify` on pre-commit hook unless explicitly authorized (you do NOT have authorization).

## CROSS-REFS for context

- `docs/audits/a1b-b15-rule4-audit-2026-05-07.md` — full audit (READ FIRST).
- `docs/audits/a1b-b14-rule4-audit-2026-05-07.md` — B14 audit (`_engineMeta` foundation).
- `compiler/PIPELINE.md` — Stage SYM contracts.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
