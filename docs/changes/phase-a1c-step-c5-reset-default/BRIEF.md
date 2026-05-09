# Phase A1c — Step C5: `reset(@cell)` runtime + `default=` integration (L18, γ)

**Phase:** A1c (codegen+runtime). Wave 2 (reset + validators).
**Position:** C5 — first of Wave 2; standalone (no in-wave deps; can dispatch parallel with C6).
**Estimate:** ~4-5 h focused.
**Dispatched:** 2026-05-08 (S73).
**Authority chain:** SPEC §6.8 (`default=` attribute + `reset(@cell)` keyword) + L18 (reset(@cell) keyword + default= attribute, γ semantics — supersedes L10). SCOPE-AND-DECOMPOSITION row C5 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:213`). **Closes A1a Step 9 deferral** (parser landed S60 `fded36a`; runtime+codegen pending).

## Goal (one paragraph)

`reset(@cell)` is a LANGUAGE KEYWORD that resets a state cell back to a known starting value. **Behavior is binary** (per SPEC §6.8.2 lines 4855-4858): if the cell has a `default=` attribute, evaluate THAT expression at reset time and write the result; if the cell has no `default=`, re-evaluate the cell's ORIGINAL init expression at reset time and write the result. Both compound (`reset(@compound)` resets every field in declaration order) and multi-level compound nav (`reset(@a.b.c.d)` per §6.8.2 line 4864) are in scope. Targets that don't match canonical shapes already fire E-RESET-INVALID-TARGET at A1b (B22 walker, S69 `a294815`); C5 only handles the LEGAL case. Parser handled at S60 `fded36a` (Step 9). C5 emits the runtime helper + codegen wiring.

## What's already in place (depth-of-survey signal)

- **Parser surface:** A1a Step 9 (`fded36a`) added `reset-expr` AST node + E-RESET-NO-ARG firing. AST shape: `{ kind: "reset-expr", target: ExprNode, span }`.
- **Target validation:** A1b B22 (S69 `a294815`) walks every reset-expr and fires E-RESET-INVALID-TARGET on non-canonical targets. C5 sees only legal targets: `reset(@cell)`, `reset(@compound.field)` (multi-level), `reset(@compound)`.
- **Default-expr field:** `state-decl.defaultExpr?: ExprNode | null` exists (`compiler/src/types/ast.ts:475`). Populated by ast-builder when `default=` attribute is present.
- **Compound resolution:** `lookupQualifiedStateCell` already walks compound scopes via `_scope` annotations (B11/B12 surface) — multi-level compound-nav is resolvable.
- **C1's cell init emission:** C1 emits the cell's initial value via `_scrml_reactive_set("name", initValue)` per shape. C5 needs the parallel: a `_scrml_reset(name)` runtime helper that re-fires the same init expression (or evaluates `defaultExpr` if present).

## Scope (in / out)

**IN scope (C5):**
1. **Runtime helper:** `_scrml_reset(name)` (or equivalent) in the runtime. Takes a cell name; if the codegen has stamped a `defaultExpr` thunk for that cell, calls it; else calls the init thunk. The thunk evaluation must run AT RESET TIME, not at declaration time (per §6.8.1 line 4840).
2. **Codegen:** lower every `reset-expr` AST node into the runtime call. Three target shapes:
   - `reset(@cell)` → `_scrml_reset("cell")`
   - `reset(@compound.field)` → `_scrml_reset_field("compound", "field")` OR equivalent path-based call (multi-level → array path)
   - `reset(@compound)` → walk all fields of the compound in declaration order, reset each
3. **Default-expr stamping:** for every state-decl with `defaultExpr !== null`, emit a thunk-equivalent into the runtime so the helper can call it at reset time. For state-decls without `defaultExpr`, emit a thunk-equivalent for the init expression (or reuse the existing init thunk if there is one).
4. **`default=null` case:** SPEC §6.8.1 line 4827 (`<token default=null> = generateUUID()`) makes `null` a legal default-expression evaluation result. Emit literal `null` correctly.
5. **Cross-cell `default=` case:** SPEC §6.8.1 line 4835 (`default=@otherCell`) — the default expression is an arbitrary expression including reactive reads. Codegen wraps the default-expression in a closure that captures the read at evaluation time (compatible with C2's reactive-read machinery — reuse, don't duplicate).
6. **Tests:** Shape 1 plain cell reset (no default; with default); Shape 2 bindable reset (no default; with default; reset clears the input); Shape 3 derived cell reset is **E-DERIVED-WRITE** at A1b — verify the codegen does not produce a runtime emit for those (should never reach C5; if a derived cell reset somehow gets here, it's a defensive STOP); compound reset (single-level all-fields, declaration-order); compound-field reset (single-level scoped); multi-level compound-nav reset; cross-cell default expression evaluation at reset time (NOT decl time); `default=@otherCell` reactivity check (default re-evaluates each reset).

**OUT of scope (deferred):**
- Validity-surface reset wiring (resetting a compound also resets the auto-synth `.touched` / `.submitted` cells per L11) — the synthesis emission is **C8 Wave 3**. C5 leaves the synth cells alone; C8 will wire reset into them.
- Engine state reset (`reset(@phase)` on an engine variable) — engine codegen is **C12-C15 Wave 4**. C5 may emit a defensive guard if the cell is an engine-typed cell (`E-RESET-INVALID-TARGET` should already have fired at B22 if reset is illegal here; if not, surface as STOP-FOR-PA).
- Validators on reset (whether reset triggers re-validation) — that's a Wave 3 question.

## Spec verification (pa.md Rule 4)

I (PA) verified against SPEC.md text directly:
- **§6.8.1 lines 4837-4842:** four normative statements (default= optional; eval at reset time; absent → re-eval init; default on derived = E-DERIVED-WRITE). ✓
- **§6.8.2 lines 4844-4870:** reset is a LANGUAGE KEYWORD; three target shapes; compound semantics; multi-level compound-nav legal per §6.3.5; E-RESET-INVALID-TARGET / E-RESERVED-IDENTIFIER / E-RESET-NO-ARG codes. ✓
- **§6.3.5 (cross-ref §6.8.2 line 4864):** V5-strict access forms apply at every level of compound hierarchy → multi-level reset uses the resolved leaf's reset rule. ✓

## Dispatch protocol

S67 worktree-as-scratch landing. Agent commits incrementally; PA lands via `git checkout <branch> -- <files>` from main.

## Authorized decisions

- **File locus:** Survey-first authorized to confirm. Best candidates: `compiler/src/codegen/emit-logic.ts` (cell-emission lives here) for the codegen stamp; `compiler/src/codegen/runtime-template.js` for the helper; AND wherever `reset-expr` AST nodes get lowered into output JS today (grep for it).
- **Test file:** `compiler/tests/unit/c5-reset-default.test.js`.
- **Crash recovery:** WIP commits expected; `progress.md` append-only.

## Anti-patterns reading

Compiler TS dispatch. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` if framework idioms creep in.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-logic.ts` (likely) | reset-expr lowering + default-expr thunk stamping |
| `compiler/src/codegen/runtime-template.js` (likely) | `_scrml_reset` / `_scrml_reset_field` helpers |
| `compiler/tests/unit/c5-reset-default.test.js` (NEW) | unit tests |
| `docs/changes/phase-a1c-step-c5-reset-default/{progress,SURVEY}.md` | crash-recovery + survey |

## Definition of Done

- All §scope IN items shipped.
- 0 regressions vs baseline (9,949 / 60 / 1 / 0).
- Spec re-verified against SPEC.md.
- Hookpoints documented for C8 (validity-surface reset wiring will hook into C5's helpers).
