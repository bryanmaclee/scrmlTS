# AST-SHAPE-RENAME — Migration Plan

**Tier:** T2-medium (mechanical, broad surface)
**Branch:** `changes/ast-shape-rename`
**Baseline:** 8576 pass / 0 fail / 40 skip / 426 files

## Renames

**A.** AST kind literal: `"machine-decl"` → `"engine-decl"`
**B.** AST node field: `node.machineName` → `node.engineName`

## Inventory (verified via grep)

### `"machine-decl"` literal occurrences

| File | Line(s) | Context |
|---|---|---|
| `compiler/src/ast-builder.js` | 7149, 7150, 7253, 7338, 7930, 7931 | Emit site + comment + walker |
| `compiler/src/name-resolver.ts` | 340 (+341 comment) | NR consumer |
| `compiler/src/type-system.ts` | 1943, 1946, 7663 (comments only — code uses field reads) | TS consumer |
| `lsp/handlers.js` | 371, 545, 606 | LSP consumer |
| `compiler/PIPELINE.md` | 610 | Doc note (says rename is deferred) |
| `compiler/SPEC.md` | 7383, 18422 | Historical/architectural references |
| `compiler/tests/unit/p1e-uniform-opener-equivalence.test.js` | 54, 56, 57, 61, 63, 64, 68, 71, 72 | Assertions |
| `compiler/tests/unit/machine-declarations.test.js` | 6, 45, 68, 75, 76, 85, 88, 96, 99, 110, 151, 161 | Assertions + makeMachineDecl helper |
| `compiler/tests/unit/machine-parsing.test.js` | 5, 20, 27, 37, 38, 48, 49, 79, 92, 93 | Assertions + helper |
| `compiler/tests/unit/engine-keyword.test.js` | 13, 24, 25, 44, 58, 69, 70, 101, 110, 111, 115, 133, 150, 179 | Assertions + comment block re P3 rename |
| `compiler/tests/unit/p1e-engine-keyword-regression.test.js` | 50, 51, 55, 58, 59, 60 | Assertions |
| `compiler/tests/unit/p1e-name-resolver.test.js` | 36 | AST walker |
| `compiler/tests/unit/gauntlet-s28/multi-stmt-effect-body.test.js` | 32, 33 | Helper |
| `compiler/tests/unit/machine-types.test.js` | 27, 28 | Helper |
| `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js` | 30, 31 | Helper |
| `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` | 53, 54 | Helper |

### `machineName` field occurrences

| File | Line(s) | Context |
|---|---|---|
| `compiler/src/ast-builder.js` | 7339 | Emit site (`machineName: engineName`) |
| `compiler/src/name-resolver.ts` | 340 | Consumer (`anyN.machineName`) |
| `compiler/src/type-system.ts` | 1946 (comment), 1960 | Consumer (`decl.machineName`) |
| `lsp/handlers.js` | 330, 608, 612 | Consumer (`md.machineName`, `node.machineName`) |
| `lsp/workspace.js` | 513, 515 | Consumer (`md.machineName`) |
| `compiler/tests/unit/p1e-uniform-opener-equivalence.test.js` | 57, 64, 72 | Assertions |
| `compiler/tests/unit/machine-declarations.test.js` | 7, 67, 68, 88, 96, 161 | Helper + assertions |
| `compiler/tests/unit/machine-parsing.test.js` | 5, 49, 92, 93 | Assertions |
| `compiler/tests/unit/engine-keyword.test.js` | 13, 24, 25, 70, 111, 133, 150, 179 | Assertions |
| `compiler/tests/unit/p1e-engine-keyword-regression.test.js` | 51, 60 | Assertions |
| `compiler/tests/unit/p3b-engine-for-localtype-regression.test.js` | 56, 81, 109, 130, 149 | Field reads in `.find()` |
| `compiler/tests/unit/machine-types.test.js` | 27, 28 | Helper param + field write |
| `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js` | 30, 31 | Helper param + field write |
| `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` | 53, 54 | Helper param + field write |
| `compiler/tests/unit/gauntlet-s28/multi-stmt-effect-body.test.js` | 32, 33 | Helper param + field write |
| `compiler/tests/unit/machine-guards-integration.test.js` | 30, 114 | Inline AST node literals |

## Order of operations

1. Inventory + plan (this file). Commit `WIP(ast-shape-rename): inventory + migration plan`.
2. **Source emit/consume:** Update ast-builder, name-resolver, type-system, LSP. After this, tests fail because they assert on old shape.
3. **Test migration:** Update all test files (assertions + helpers).
4. **SPEC + PIPELINE:** Update doc notes referring to deferred rename.
5. **Final summary commit:** `refactor(ast-shape-rename): kind: "machine-decl" → "engine-decl" + AST field machineName → engineName; 0 regressions`.

## Out of scope

- Internal local-variable `machineName` in compiler/src — already renamed by P3-RENAME.
- `<machine>` / `<engine>` source keyword aliasing — already done in P1.
- E-MACHINE-* / E-ENGINE-* error codes — already renamed by P3-ERROR-RENAME.

## Acceptance

- `grep -rln "'machine-decl'\|\"machine-decl\"" compiler/ lsp/` returns zero matches in source/types/lsp (SPEC.md historical notes are updated; PIPELINE.md note is removed/updated).
- `grep -rno '\bmachineName\b' compiler/src/ lsp/` returns zero matches.
- `bun test` final: 8576 / 0 / 40 / 426. Zero regressions.
- Pre-commit + post-commit hooks pass at every commit.
- Worktree clean.

## Tags
`ast-shape-rename`, `engine-decl`, `engineName`, `T2-medium`, `mechanical-refactor`, `S53`

## Links
- Branch: `changes/ast-shape-rename`
- Predecessor: P3-RENAME (commit f2c1db4) — local variable rename
- Predecessor: P3-ERROR-RENAME — error code rename
- PIPELINE.md:610 — defers this rename
- SPEC.md:18422 — historical note about deferred rename
