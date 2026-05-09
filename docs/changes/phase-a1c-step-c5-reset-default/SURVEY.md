# A1c Step C5 — Survey

**Date:** 2026-05-08
**Author:** general-purpose pipeline agent (worktree-a8a7d1ff4ebd6226d)
**Brief:** `docs/changes/phase-a1c-step-c5-reset-default/BRIEF.md`
**Status:** PROCEED-AS-BRIEFED — minor scope augmentation, no spec drift.

## Verdict

The brief's scope and file-locus map are accurate. Implementation effort is at the lower end of the 4-5h estimate because **C1 already shipped half the substrate**: `_scrml_default_set` runtime helper + `defaultExpr` thunk emission per cell are live. C5 is the symmetric `reset` lowering + a single `_scrml_reset` runtime helper.

## File-locus confirmation

Brief expectation vs. confirmed reality:

| Brief named | Reality | Status |
|---|---|---|
| `compiler/src/codegen/emit-logic.ts` (reset lowering) | `compiler/src/codegen/emit-expr.ts:88` already has a `case "reset-expr":` STUB emitting `reset(<target>)` (a literal call to a non-existent function — Step 9 deferral marker). C5 lowers it. | Brief locus partially correct; primary work is in `emit-expr.ts`, NOT `emit-logic.ts`. emit-logic.ts already does the C1 sidecar work; C5 needs to ALSO emit a `_scrml_init_set` thunk for cells without `defaultExpr`. |
| `compiler/src/codegen/runtime-template.js` (helpers) | `compiler/src/runtime-template.js` (note: no codegen subdir — file lives at `compiler/src/runtime-template.js`). C1 already has `_scrml_default_fns` + `_scrml_default_set`. C5 adds `_scrml_init_fns`/`_scrml_init_set` (init-thunk storage) + `_scrml_reset` + helpers. | Brief minor locus mistake (file path); easily corrected. |
| `compiler/tests/unit/c5-reset-default.test.js` (NEW) | Will create. | OK. |

## Existing infrastructure inventory

### Already shipped (do NOT duplicate)

1. **Parser:** `expression-parser.ts:1142-1196` — Step 9 (S60 `fded36a`) lifts `reset(<arg>)` bare-callee calls into `{kind:"reset-expr", target, span, diagnostic?}`. Zero/multi-arg surface E-RESET-NO-ARG via `diagnostic` field.
2. **B22 target validation:** `symbol-table.ts:5298-5390` — fires E-RESET-INVALID-TARGET for non-canonical shapes. C5 sees only legal targets (one of: `@cell` IdentExpr, `@compound` IdentExpr, `@compound.field` MemberExpr arity-N).
3. **`StateCellRecord.hasDefaultExpr`:** symbol-table.ts:469 — boolean shortcut for "this cell has a `default=`".
4. **`state-decl.defaultExpr`:** ast.ts:475 — populated by ast-builder, consumed by C1.
5. **`_scrml_default_set` helper + `_scrml_default_fns` map:** runtime-template.js:75-78 — `name → () => default-value`. Registered by C1's `_emitDefaultSidecar` (emit-logic.ts:296-328) at module-init alongside the cell.
6. **`_scrml_reactive_set` runtime helper:** runtime-template.js:199 — what `_scrml_reset` will write through.
7. **`_resolvedStateCell` IdentExpr stamp:** B3 stamps each `@x` IdentExpr with the resolved StateCellRecord (or null). Available at codegen time as a non-enumerable property on `target` for the bare-IdentExpr reset case.
8. **`lookupQualifiedStateCell`:** symbol-table.ts:6607 — resolves multi-segment `@a.b.c.d` paths through compound `_scope` chain. Need this at codegen time for compound-nav reset.
9. **Usage analyzer:** usage-analyzer.ts:354 — already sets `usage.reset = true` for any `reset-expr` and `usage.defaultExpr = true` for any `defaultExpr`. C5 leaves these as-is.

### Gap to close (C5 work)

1. **Init-thunk emission.** Per SPEC §6.8.1 line 4831 and `_scrml_default_set` rationale, when `default=` is ABSENT, `reset(@cell)` re-evaluates the **init expression** at reset time. C1 emits the cell's init via `_scrml_reactive_set("name", initValue)` — this evaluates ONCE at module-init. For reset to "re-evaluate init", we need a parallel thunk: `_scrml_init_set("name", () => <initExpr>)` registered at decl time, called by `_scrml_reset` when no `defaultExpr` is present.

   **Optimization decision:** stamp the init-thunk ONLY for cells that (a) appear in a `reset-expr` as direct target, OR (b) live in a compound that's reset as a whole. C5 takes the simpler path: stamp for **every Shape 1/2 cell that does NOT have a `defaultExpr`**. The init-thunk is small and never called unless reset fires; emitting it unconditionally avoids needing reset-target-flow analysis at codegen time. Cells with `defaultExpr` already have `_scrml_default_set` — `_scrml_reset` prefers default over init when both exist (per SPEC §6.8.2 line 4857).

   Skip cases:
   - Derived cells (`shape:"derived" + isConst:true`): RESET on derived is E-DERIVED-WRITE; never reachable. The C1 defensive path already comments this out — C5 follows suit.
   - Compound parents (`children !== undefined`): the parent value is computed by `_scrml_derived_declare` reconstruction; its "init" is the children. `reset(@compound)` walks children; the parent's own init-thunk is unused. Skip.
   - Markup-typed derived: same as derived — skip.

2. **`reset-expr` lowering in `emit-expr.ts:88`.** Replace stub `return \`reset(${emitExpr(target, ctx)})\``with three-arm dispatch:
   - `target.kind === "ident"`: `@cell` form. Inspect `_resolvedStateCell` (if set):
     - If `null` (unknown name) — fall back to encoded name, emit `_scrml_reset("name")`. Runtime defensively no-ops.
     - If record has `isCompoundParent === true` AND `declNode.children` is non-empty — emit `_scrml_reset_compound("compound")` which walks all field paths.
     - Otherwise — emit `_scrml_reset("cell")`.
   - `target.kind === "member"`: walk MemberExpr chain to `["a","b","c"]`, root must be `@`-prefixed IdentExpr (B22 already enforced shape). Emit `_scrml_reset("a.b.c")` — same single-cell helper, just with dotted path key. Compound-vs-leaf decision: if leaf is itself a compound parent (rare), recursively walk via `_scrml_reset_compound`. **For C5 simplicity, the runtime checks at runtime.**
   - Defensive: if shape doesn't match any of the above, fall back to a comment marker `/* C5: unexpected reset target shape */`.

3. **`_scrml_reset` runtime helper.** New in `runtime-template.js`:
   ```js
   const _scrml_init_fns = {};
   function _scrml_init_set(name, fn) { _scrml_init_fns[name] = fn; }
   function _scrml_reset(name) {
     // Compound-parent reset: walk every registered cell whose name starts with `${name}.`
     if (_scrml_default_fns[name] === undefined && _scrml_init_fns[name] === undefined) {
       // Treat as compound — find children by prefix
       const prefix = name + ".";
       let didReset = false;
       for (const k of Object.keys(_scrml_init_fns)) {
         if (k.startsWith(prefix) || (Object.prototype.hasOwnProperty.call(_scrml_default_fns, k) && k.startsWith(prefix))) {
           _scrml_reset(k);
           didReset = true;
         }
       }
       for (const k of Object.keys(_scrml_default_fns)) {
         if (k.startsWith(prefix)) {
           _scrml_reset(k);
           didReset = true;
         }
       }
       // No registered cell — silent no-op (runtime defensive)
       return;
     }
     // Default-expr wins over init per SPEC §6.8.2 line 4857
     const fn = _scrml_default_fns[name] || _scrml_init_fns[name];
     if (typeof fn === "function") {
       _scrml_reactive_set(name, fn());
     }
   }
   ```

   The "compound by absence-of-thunk" detection works because compound parents emit `_scrml_derived_declare`, not `_scrml_init_set`. Their children DO have init-thunks (since each compound child is itself a Shape 1/2 cell).

   **Declaration-order in compound reset:** the brief calls for declaration-order. `Object.keys` on a plain object in modern JS preserves insertion order. C1's compound-emit recursion emits children in declaration order via the `for (const child of node.children)` loop, which means `_scrml_init_set` calls land in declaration order. `Object.keys(_scrml_init_fns)` then yields them in declaration order. **Determinism: guaranteed by ECMAScript 2015+ object-key-iteration order.**

4. **Tests** (new file `c5-reset-default.test.js`):
   - §C5.1 init-thunk emission for Shape 1/2 cells (no defaultExpr)
   - §C5.2 init-thunk SKIPPED for derived/markup-typed/compound-parent
   - §C5.3 reset-expr lowering — `@cell` → `_scrml_reset("cell")`
   - §C5.4 reset-expr lowering — `@compound` → `_scrml_reset("compound")` (compound-walk handled at runtime)
   - §C5.5 reset-expr lowering — `@compound.field` → `_scrml_reset("compound.field")`
   - §C5.6 reset-expr lowering — multi-level `@a.b.c.d` → `_scrml_reset("a.b.c.d")`
   - §C5.7 runtime: cell with default= → reset evaluates default thunk (mocked)
   - §C5.8 runtime: cell without default= → reset re-evaluates init thunk
   - §C5.9 runtime: compound reset walks all children in declaration order
   - §C5.10 default= cross-cell read evaluates at reset time, not decl time (mocked re-read)
   - §C5.11 reset of unknown cell is a runtime no-op (defensive)

## Implementation plan (sequenced for incremental commits)

1. **Commit 1 — runtime helpers.** Add `_scrml_init_fns`, `_scrml_init_set`, `_scrml_reset` to `runtime-template.js` BEFORE the `§6.6 Derived reactive runtime` marker (so they live in `core` chunk, always-included alongside `_scrml_default_set`). Smoke test.

2. **Commit 2 — emit-logic init-thunk sidecar.** Add `_emitInitThunkSidecar` peer to `_emitDefaultSidecar`. Plumb into the same compound child / Shape 1/2 routing the default-sidecar uses. Skip derived/markup/compound-parent (mirrors `_emitDefaultSidecar`'s defensive E-DERIVED-WRITE skip).

3. **Commit 3 — emit-expr reset-expr lowering.** Replace stub with three-arm dispatch. Walk MemberExpr chain to dotted path. No symbol-table calls at codegen time — relies on `_resolvedStateCell` already-stamped + B22 shape-validation already done.

4. **Commit 4 — tests.** Author full test file. ~30 expects estimate.

5. **Commit 5 — final verification.** Re-run `bun run test`. Expect 9,949 + ~30 = ~9,979 / 0 fail. Reconcile expects count.

## Spec verification (pa.md Rule 4)

Reading SPEC.md offsets directly:

- **§6.8.1 line 4831:** "When `default=` is absent, calling `reset(@cell)` re-evaluates the init expression and sets the cell to the result." — Confirmed init-thunk requirement.
- **§6.8.1 line 4833:** "When `default=` is present, calling `reset(@cell)` evaluates the `default=` expression at reset time and sets the cell to that result." — Confirmed default-thunk-wins-over-init precedence.
- **§6.8.1 line 4835:** "**The `default=` attribute accepts arbitrary expressions**, including cross-cell references (e.g., `default=@otherCell` — evaluated at reset time, not at declaration time)." — Confirmed re-evaluation invariant.
- **§6.8.2 lines 4848-4853:** three target shapes — `reset(@cell)`, `reset(@compound.field)`, `reset(@compound)`. Confirmed.
- **§6.8.2 line 4863:** "`reset(@compound)` applies the rule above to every field of the compound (in declaration order)." — Confirmed declaration-order walk.
- **§6.8.2 line 4864:** multi-level via §6.3.5 — confirmed shape validity, leaf's reset rule applies.

All scope items match SPEC. No drift.

## Estimated test delta

~25-35 expect calls across §C5.1 through §C5.11. Probably 15-20 `test()` blocks. ~30 expects is a reasonable target — matches the breadth of C3 (~30 expects per its delta).

## Risk + STOP gates

- **Cross-machine sync:** I am NOT touching `runtime/validators.js`, `c6-validator-runtime-catalog.test.js`, or any validity-surface synthesis. C6 territory unaffected.
- **Engine state reset:** explicitly out of scope (C12-C15). If a `reset(@engineVar)` shape sneaks in, B22 should reject upstream; if it reaches codegen, my reset-expr lowering will emit `_scrml_reset("engineVar")` which the runtime defensively no-ops (no thunk registered for engine vars).
- **Validity-surface reset:** out of scope (C8). Synth cells (`isValid`, `errors`, `touched`, `submitted`) are NOT registered as state-decls in the AST and do not get `_scrml_init_set` calls; my `_scrml_reset` helper will not touch them. C8 will wire reset → synth-clear separately.
- **Pre-commit hook:** will run `bun test`. NOT bypassing.

## File-touched diff vs brief

| File | Brief | Actual plan |
|---|---|---|
| `compiler/src/codegen/emit-logic.ts` | YES | YES — init-thunk sidecar emission |
| `compiler/src/codegen/runtime-template.js` | YES (path slightly off: actually `compiler/src/runtime-template.js`) | YES — at correct path |
| `compiler/src/codegen/emit-expr.ts` | NOT in brief | YES — reset-expr lowering (replaces existing Step 9 stub) — minor scope augmentation |
| `compiler/tests/unit/c5-reset-default.test.js` | YES | YES |

The `emit-expr.ts` augmentation is necessary because the existing reset-expr stub emits `reset(...)` literal calls — a no-op-shaped string that compiles but never resolves to anything. Without C5's lowering, `reset(@cell)` is a no-op. This is in-spirit of brief §scope item 2 ("Codegen: lower every `reset-expr` AST node"). PA-visibility flagged here.
