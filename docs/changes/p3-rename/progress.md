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
| **Total** | **58** | **66** | **9** |

(58 actual identifier renames; some lines have 2 refs so identifier-count > line-count.)

## Plan / progress log

- [start] Branch `changes/p3-rename` created at HEAD `9123b4d`. Worktree deps installed
  (`bun install` — node_modules was missing). Test fixtures built
  (`bash scripts/compile-test-samples.sh`). Baseline confirmed 8551/0/40/425.

