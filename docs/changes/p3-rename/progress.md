# Progress: p3-rename

Internal compiler rename `machineName` / `MachineName` → `engineName` / `EngineName`.
Scope: internal identifiers only — NOT user-visible strings, error messages, AST kind literals,
or regex patterns matching the `<machine>` keyword.

## Inventory at startup

- Branch: `changes/p3-rename` from `9123b4d` (S53 main tip).
- 9 files in `compiler/src/`, 66 grep line-matches, 68 individual references:
  - `compiler/src/type-system.ts`: 31
  - `compiler/src/codegen/emit-machines.ts`: 13
  - `compiler/src/ast-builder.js`: 7
  - `compiler/src/codegen/emit-reactive-wiring.ts`: 6
  - `compiler/src/codegen/emit-logic.ts`: 3
  - `compiler/src/codegen/emit-machine-property-tests.ts`: 2
  - `compiler/src/codegen/emit-control-flow.ts`: 2
  - `compiler/src/codegen/scheduling.ts`: 1
  - `compiler/src/name-resolver.ts`: 1
- `PIPELINE.md`: 0 references (no update needed).
- Test baseline (after `bash scripts/compile-test-samples.sh` to populate worktree fixtures):
  8,551 / 0 / 40 / 425. Matches main repo.

## Boundary decisions (informed by reading each ref + dispatch brief)

**Per dispatch brief carve-out:** AST `kind: "machine-decl"` is out of scope. Following the
same logic, the AST FIELD name `machineName` on the `machine-decl` node (set in
`ast-builder.js:7339`) is also part of the AST shape and is read by 20+ test references
(`p1e-uniform-opener-equivalence.test.js`, `machine-declarations.test.js`, `machine-parsing.test.js`,
`engine-keyword.test.js`, `p1e-engine-keyword-regression.test.js`, `p3b-engine-for-localtype-regression.test.js`).
**The AST FIELD `machineName` is NOT renamed in this dispatch.** Local vars / parameters / Map
shapes / function names that are purely internal ARE renamed.

**Other SKIPs (user-visible strings / placeholders in docs):**
- `ast-builder.js:7239` comment showing user-visible syntax `< machine name=MachineName for=TypeName>`
- `ast-builder.js:7315` literal `"MachineName"` placeholder in E-MACHINE-020 error text
- `emit-machines.ts:12,137` JSDoc examples showing emitted-runtime-code shape (placeholder for actual machine name)
- `type-system.ts:2745,4041` JSDoc placeholders for user-typed `@var: MachineName` annotation
- `type-system.ts:7855` `<MachineName>` placeholder in E-REPLAY-001 error text
- `name-resolver.ts:340` reads `anyN.machineName` (AST field — deferred)
- `type-system.ts:1960` reads `decl.machineName` (AST field — deferred)

**Special handling (ast-builder.js:7339):** to keep AST field name stable while renaming the
local var, the shorthand `machineName,` becomes explicit `machineName: engineName,`.

## Per-file rename count (renames / total grep hits)

| File | Renames | Total | Skipped (kept) |
|---|---|---|---|
| `name-resolver.ts` | 0 | 1 | 1 (AST field read) |
| `codegen/scheduling.ts` | 1 | 1 | 0 |
| `codegen/emit-control-flow.ts` | 2 | 2 | 0 |
| `codegen/emit-machine-property-tests.ts` | 2 | 2 | 0 |
| `codegen/emit-logic.ts` | 3 | 3 | 0 |
| `codegen/emit-reactive-wiring.ts` | 6 | 6 | 0 |
| `ast-builder.js` | 6 | 7 | 1 comment + `"MachineName"` literal kept |
| `codegen/emit-machines.ts` | 11 | 13 | 2 doc-example comments |
| `type-system.ts` | 27 | 31 | 4 (1 AST field read + 3 placeholders in user-visible text) |
| **Total** | **58** | **66 lines / 68 refs** | **11 refs preserved across 10 lines** |

(58 actual identifier renames. Per-grep counts in the table track the LINE-level grep matches
of `machineName\|MachineName`. After the rename, line `ast-builder.js:7339` still reports a
single grep hit — for the AST field name `machineName` — but is now followed by the renamed
local var `engineName`, so the file as a whole shows two patterns on that line.)

## Final state — `grep -rn 'machineName\|MachineName' compiler/src/`

11 references across 10 lines. All 11 are the planned SKIPs:

```
compiler/src/name-resolver.ts:340                         AST field read — deferred
compiler/src/codegen/emit-machines.ts:12                  JSDoc example
compiler/src/codegen/emit-machines.ts:137                 JSDoc example
compiler/src/ast-builder.js:7239                          comment placeholder
compiler/src/ast-builder.js:7315                          "MachineName" literal in error msg
compiler/src/ast-builder.js:7339                          AST field name preserved
compiler/src/type-system.ts:1960                          AST field read — deferred
compiler/src/type-system.ts:2745  (×2 placeholders)       JSDoc placeholder
compiler/src/type-system.ts:4041                          comment placeholder
compiler/src/type-system.ts:7855                          <MachineName> in E-REPLAY-001 msg
```

## Tests

- `bun test` after each commit: 8,551 / 0 / 40 / 425.
- Pre-commit subset suite: 7,826 / 0 / 30 / 397.
- Post-commit gauntlet TodoMVC: PASS, browser checks PASS.
- ZERO regressions vs baseline.

## Commits on branch (5 WIP + plan + 1 final summary)

```
f0df267  WIP(p3-rename): initial plan + boundary decisions in progress.md
a63d237  WIP(p3-rename): codegen group — 14 internal refs renamed
d42d61e  WIP(p3-rename): ast-builder.js — 6 local refs renamed; AST field preserved
8ea5b0b  WIP(p3-rename): emit-machines.ts — 11 internal refs renamed
f461299  WIP(p3-rename): type-system.ts — 27 internal refs renamed
<final>  refactor(p3-rename): internal `machineName` → `engineName` (58 refs across 8 files); 0 regressions
```

(name-resolver.ts had 1 grep hit but 0 internal refs to rename, so 8 files actually modified.)

## Outcome

- 58 internal identifier renames (params, locals, function names, Map-shape fields, loop vars,
  template-literal interpolations, function-call arguments).
- 11 references preserved (1 AST field name on shorthand-expanded property, 1 AST field read
  in name-resolver.ts, 1 AST field read in type-system.ts, 8 user-visible-text placeholders).
- Zero test regressions across 8,551 tests.
- Branch is FF-mergeable on top of `9123b4d` main tip.

## Deferred for future dispatch

The AST field name `machineName` on the `machine-decl` node and its readers in
`name-resolver.ts:340` and `type-system.ts:1960` constitute the AST shape contract.
Renaming requires updating ~20 test references and is best done as a single coherent
"AST shape rename" dispatch (alongside the `kind: "machine-decl"` literal rename
mentioned in P3 dive §13.4).
