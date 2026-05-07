# A1b Step B17 — `<onTransition>` + `effect=` validation + residual component-vs-engine cases (Wave 4 closer) — DISPATCH BRIEF

**Status:** PRE-DRAFTED at S68. Ready to dispatch once B14 lands. PA must update §"Main HEAD" before firing.

**Estimate:** 3-5h (per audit; SCOPE was 3-4h, audit added ~1h for `effect=` validation).

**Sequencing:** STRICT SEQUENTIAL after B14. Reads B14's `_engineMeta`. Can run **PARALLEL with B15 + B16** post-B14 land (different walker territories).

---

## Dispatch instructions for PA

When ready to dispatch:

1. Confirm B14 has landed.
2. Update §"Main HEAD" below to current main tip post-B14.
3. Dispatch via `general-purpose` with `isolation: "worktree"` + `model: "opus"`.
4. Pass content below `---DISPATCH---` marker as the agent prompt.
5. Fire B15 + B16 + B17 in same message for parallel execution.

---DISPATCH---

# Dispatch: A1b Step B17 — `<onTransition>` + `effect=` validation + residual component-vs-engine (Wave 4 closer)

You are running as the substitute for `scrml-dev-pipeline` (per pa.md fallback rule; agent unavailable in this session).

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (run FIRST)

1. Run `pwd` via Bash. Save WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chains pretest) to confirm baseline.

**If your worktree was created from a base BEFORE current main HEAD:** rebase your branch onto local main.

**Path discipline:** ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit.

## CRASH RECOVERY

Commit after each meaningful change. Update `docs/changes/phase-a1b-step-b17-ontransition-component-engine/progress.md` after each step. WIP commits expected. Branch name suggestion: `phase-a1b-step-b17-ontransition-component-engine`.

## CONTEXT — current main state (S68, post-B14)

- **Main HEAD:** [TO BE UPDATED — current main tip post-B14 land]
- **Phase A1b status:**
  - B1-B13 ✅ all shipped
  - **B14** ✅ shipped at [TO BE UPDATED] — engine cell registered; `_engineMeta` annotation; cross-file mount validation; engine-decl-inside-component-body fires E-COMPONENT-ENGINE-SCOPE.
  - B15 dispatched in parallel (state-child exhaustiveness + non-derived rule= typer)
  - B16 dispatched in parallel (derived engines)
  - **B17 — THIS STEP — Wave 4 CLOSER**

- **Active locks:** L1-L22. Critical for B17: M14 (`<onTransition>`/effect= for engine cross-state effects), M20 (component-vs-engine distinction).

## SCOPE — B17 step definition

Source of truth: `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.4 row B17.

**Estimate:** 3-5h (post-audit expansion; SCOPE was 3-4h).

**Driver:** `compiler/SPEC.md` §51.0.H (effect= + onTransition syntax + attributes), §51.0.K (components-vs-engines M20), §15.13.5 (singleton-vs-multi-instance), §18.0.2 (match-vs-engine effect/onTransition boundary), §34 catalog.

## RULE-4 AUDIT — pre-dispatch findings (READ FIRST)

**MANDATORY READ:** `docs/audits/a1b-b17-rule4-audit-2026-05-07.md` (full file, ~149 lines).

The audit identified 1 substantive expansion + 1 fire-site clarification. The 8-point brief expansion below incorporates them.

**Per pa.md Rule 4:** spec text is normative. SCOPE row mentions only `<onTransition>` but §51.0.H requires validating BOTH `effect=` AND `<onTransition>`.

**S68 spec amendment context (`1de05ef`):** §51.0.M `<onTimeout>` element was added at A5-1. **B17 does NOT validate `<onTimeout>`** — that's A5-2/A5-3 territory (Phase A7 sub-step). B17 is `<onTransition>` only.

## REQUIRED B17 IMPLEMENTATION (per audit §2 — 8-point brief)

### 1. Validate BOTH `effect=` AND `<onTransition>` placement + form

SCOPE underspecifies. §51.0.H requires both:

| Form | Constraint | Error |
|---|---|---|
| `effect=` | Single-target `rule=` only; multi-target → ambiguous | `E-ENGINE-EFFECT-AMBIGUOUS` (§34) |
| `effect=` | Engine-only (forbidden in `<match>` blocks per §18.0.2) | `E-STRUCTURAL-ELEMENT-MISPLACED` |
| `<onTransition>` | Engine state-child only (forbidden in `<match>` blocks) | `E-STRUCTURAL-ELEMENT-MISPLACED` |
| `<onTransition>` | Required attribute: `to=` OR `from=` (one of) | `E-ONTRANSITION-NO-DIRECTION` (canonical name TBD; Phase 0) |
| `<onTransition>` | `to=` / `from=` must reference valid variant | `E-ONTRANSITION-INVALID-VARIANT` (canonical name TBD) |
| `<onTransition>` | `once`, `if=expr` are optional bare/expr attrs | — (no validation in B17) |

### 2. `effect=` single-target invariant

For each engine state-child with `effect=` attribute:
- Read the surrounding `rule=` form (single-target / multi-target / wildcard).
- If `rule=` is multi-target or wildcard: fire `E-ENGINE-EFFECT-AMBIGUOUS`.
- If `rule=` is single-target: ALLOWED.

### 3. `<onTransition>` placement validation

Walk markup tree. For each `<onTransition>` element:
- If parent is engine state-child: ALLOWED.
- If inside a `<match>` block-form arm: fire `E-STRUCTURAL-ELEMENT-MISPLACED` (per primer §9.6 structural-elements registry — reuse the canonical "scrml-special element used in wrong context" code; do NOT introduce new code).
- Other invalid contexts: same `E-STRUCTURAL-ELEMENT-MISPLACED`.

### 4. `<onTransition>` direction attributes

For each valid-placed `<onTransition>` element:
- Confirm at least one of `to=` or `from=` is present. Absence: fire `E-ONTRANSITION-NO-DIRECTION`.
- For each direction attribute present: validate variant against engine's variant list (read from B14's `_engineMeta.variants`). Unknown variant: fire `E-ONTRANSITION-INVALID-VARIANT`.
- Both-attributes case: §51.0.H is ambiguous. Phase-0 survey verifies; PA recommendation: forbid both (alternative directionalities). Fire appropriate diagnostic if forbidden.

### 5. `once`, `if=expr` — pass through B17

`once`: presence-only attribute (no value validation in B17).
`if=expr`: expression-typing happens later (not B17's territory).

### 6. E-COMPONENT-ENGINE-SCOPE fire-site split (per B14 audit §1.5 + B17 audit §1.2)

B14 fires E-COMPONENT-ENGINE-SCOPE for **engine-decl-inside-component-body** case (the violation is detected at engine-decl walk site).

B17 owns RESIDUAL cases:
- **Engine mount tag (`<EngineName/>`) inside component body** — Phase 0 survey verifies whether this fires E-COMPONENT-ENGINE-SCOPE or a different code. Per §51.0.K line 20428 ("an engine body MAY instantiate components"), the inverse is allowed. The forbidden direction is component instantiating engine via mount.

Phase 0 enumerates all components-vs-engines cases:
- Engine declaration inside component body: B14 fires.
- Engine mount tag (`<EngineName/>`) inside component body: B17 fires (?).
- Component declaration inside engine body: legal per §51.0.K. No fire.
- Other cases?

### 7. Reuse `E-STRUCTURAL-ELEMENT-MISPLACED`

Per primer §9.6 + §4.15 + §24.4, scrml-defined structural elements use this canonical code when used in wrong contexts. Do NOT introduce a new code for misplaced engine-special elements.

S68 amendment: `<onTimeout>` (§51.0.M) is in the same family but B17 does NOT validate it (A5-2/A5-3 territory).

### 8. Phase-0 survey gate (mandatory, ~30-60min)

Confirm:
- (a) §34 catalog rows for E-ENGINE-EFFECT-AMBIGUOUS, E-ONTRANSITION-NO-DIRECTION, E-ONTRANSITION-INVALID-VARIANT (canonical naming; may need additions).
- (b) `<onTransition>` both-direction-attributes case behavior (forbidden? both directions in one element? Phase 0 verifies, surfaces if spec-amendment recommended).
- (c) Component-vs-engine cases enumerated for B14-vs-B17 fire-site assignment (per §1.6 above).
- (d) `<onTransition>`'s parsed AST shape — is it a structural element with attributes + body, or specialized AST kind?
- (e) Walker insertion point — does B17 add a new SYM PASS, or fold into B15/B16's pass?

Survey may surface depth-of-survey-discount.

## OUT OF SCOPE for B17 (explicit)

- **Engine cell registration** — B14.
- **State-child exhaustiveness + non-derived rule= validation** — B15.
- **Compile-time E-ENGINE-INVALID-TRANSITION inside state-child bodies** — B15.
- **Derived-engine specific rejections** — B16.
- **Engine-decl-inside-component-body fire-site** — B14 (B17 owns residual cases only).
- **`<onTimeout>` validation** — A5-2/A5-3 (Phase A7 sub-step; S68 spec amendment landed but implementation deferred).
- **`if=expr` expression-typing** — downstream.
- **A1c codegen** — runtime emission. B17 fires compile-time only.

## CANONICAL FILES — read these before coding

1. `compiler/SPEC.md` §51.0 sections:
   - §51.0.H `effect=` + `<onTransition>` (PRIMARY normative — line 20298+)
   - §51.0.K components-vs-engines (M20)
   - §15.13.5 component singleton-vs-multi-instance
   - §18.0.2 match-vs-engine boundary (effect/onTransition forbidden in match)
   - §4.15 structural-elements registry (`<onTransition>` listed; B17 reuses E-STRUCTURAL-ELEMENT-MISPLACED)
   - **NOTE:** Use `grep -nE "^####? +51\.0\." compiler/SPEC.md` for current line numbers.

2. `docs/PA-SCRML-PRIMER.md` §9.6 (structural elements registry — `<onTransition>` slot); §13.7 B14 specifics (`_engineMeta` foundation).

3. `compiler/src/symbol-table.ts` — find appropriate insertion point for B17's walker pass.

4. `compiler/src/types/ast.ts` — `_engineMeta.variants` shape (B14 establishes).

## TEST EXPECTATIONS

- All existing tests remain green (post-B14 baseline).
- Add B17-specific tests:
  - `effect=` on single-target `rule=`: ALLOWED.
  - `effect=` on multi-target `rule=`: fires E-ENGINE-EFFECT-AMBIGUOUS.
  - `effect=` on wildcard `rule=*`: fires E-ENGINE-EFFECT-AMBIGUOUS.
  - `<onTransition to=.X>` valid: ALLOWED.
  - `<onTransition>` (no to/from): fires E-ONTRANSITION-NO-DIRECTION.
  - `<onTransition to=.UnknownVariant>`: fires E-ONTRANSITION-INVALID-VARIANT.
  - `<onTransition>` inside `<match>` arm: fires E-STRUCTURAL-ELEMENT-MISPLACED.
  - `<onTransition>` with both `to=` and `from=`: per Phase 0 verdict.
  - Engine mount tag inside component body: fires (per Phase 0 enumeration).
  - Component decl inside engine body: ALLOWED.

## REPORTING — when complete

Write final report block in `docs/changes/phase-a1b-step-b17-ontransition-component-engine/progress.md` with:

1. WORKTREE_PATH
2. FINAL_SHA
3. FILES_TOUCHED (full paths from repo root)
4. TEST_DELTA
5. DEFERRED_ITEMS (e.g., `<onTimeout>` for A5-2/A5-3)
6. OPEN_QUESTIONS
7. PRIMER §13.7 B17 ROW DRAFT + B17 specifics block
8. SURVEY-NOTE at `docs/changes/phase-a1b-step-b17-ontransition-component-engine/SURVEY.md`
9. SPEC-PROSE FOLLOW-UPS (any §34 catalog rows added; §51.0.H both-direction footnote if recommended)

## METHODOLOGY (carry-forward from pa.md)

- Rule 1: No marketing/article work — stay focused on B17.
- Rule 2: Production-language fidelity, not MVP.
- Rule 3: Right answer beats easy answer 99.999% of the time.
- Rule 4: Spec is normative; SCOPE/audit are derived. Verify every spec-derivative claim against §51.0.H directly.
- No `--no-verify` on pre-commit hook unless explicitly authorized.

## CROSS-REFS for context

- `docs/audits/a1b-b17-rule4-audit-2026-05-07.md` — full audit (READ FIRST).
- `docs/audits/a1b-b14-rule4-audit-2026-05-07.md` — B14 audit (E-COMPONENT-ENGINE-SCOPE fire-site clarification + `_engineMeta` foundation).
- `docs/audits/a1b-b15-rule4-audit-2026-05-07.md` — B15 audit (sibling; non-derived rule= validation).
- `docs/audits/a1b-b16-rule4-audit-2026-05-07.md` — B16 audit (sibling; derived-engine territory).

After B17 lands, **Wave 4 is functionally COMPLETE.** Wave 5 (B18-B22 cross-cutting) audited bundle ready as next dispatch wave.

You are authorized to land all work in your worktree. PA reviews file-delta and lands via `git checkout <branch> -- <files>` to main. Report when complete.
