# Progress: ast-shape-rename

- Branch created: `changes/ast-shape-rename` from `3deb87a` (S53 main tip).
- Worktree infrastructure: `bun install` (acorn missing), `bash scripts/compile-test-samples.sh` to populate dist/.
- Baseline confirmed: 8576 pass / 0 fail / 40 skip / 426 files.
- Inventory complete (see migration-plan.md):
  - `"machine-decl"` literal: 16 files (3 source, 1 LSP, 2 doc, 10 test).
  - `machineName` field: 17 files (3 source, 2 LSP, 12 test).
- Migration plan recorded. Commit `b9009c1`.

## Step 2: source-side renames (TAB / NR / TS / LSP)

Updated source emitters/consumers. Tests intermittently fail mid-step (because tests assert on old shape) but pre-commit hook gates per commit on passing tests, so source + tests are committed atomically together below.

- `compiler/src/ast-builder.js` — `kind: "engine-decl"` and `engineName: engineName` (the local already named `engineName` from P3-RENAME, now writes the new field name). Comments updated.
- `compiler/src/name-resolver.ts` — consumer reads `kind === "engine-decl"` and `anyN.engineName`.
- `compiler/src/type-system.ts` — comments + `decl.engineName` field read in `buildMachineRegistry`.
- `lsp/handlers.js` — `case "engine-decl"`, `md.engineName`, `node.engineName`, comment updated.
- `lsp/workspace.js` — `md.engineName` field read; comment updated.

Note: `ast.machineDecls` (file-level array) NOT renamed — out of scope per dispatch (only the AST node `kind` literal and the per-node field).

## Step 3: test migration

Renamed `kind: "machine-decl"` → `kind: "engine-decl"` and `.machineName` → `.engineName` across 16 test files (13 unit + 2 LSP + 1 integration):

- `compiler/tests/unit/p1e-uniform-opener-equivalence.test.js`
- `compiler/tests/unit/engine-keyword.test.js` (incl. comment block re P3 rename — the P3 rename has now landed)
- `compiler/tests/unit/machine-guards-integration.test.js`
- `compiler/tests/unit/machine-parsing.test.js`
- `compiler/tests/unit/machine-types.test.js`
- `compiler/tests/unit/p1e-name-resolver.test.js`
- `compiler/tests/unit/p1e-engine-keyword-regression.test.js`
- `compiler/tests/unit/machine-declarations.test.js`
- `compiler/tests/unit/p3b-machine-for-importedtype-deprecated.test.js`
- `compiler/tests/unit/p3b-engine-for-localtype-regression.test.js`
- `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js`
- `compiler/tests/unit/gauntlet-s28/multi-stmt-effect-body.test.js`
- `compiler/tests/unit/gauntlet-s22/derived-machines.test.js`
- `compiler/tests/lsp/document-symbols.test.js`
- `compiler/tests/lsp/analysis.test.js`
- `compiler/tests/integration/p3b-engine-for-importedtype-cross-file.test.js`

Tests after migration: 8576 / 0 / 40 / 426 — exact baseline match, zero regressions.

## Step 4: SPEC + PIPELINE doc updates

Doc references to `kind: "machine-decl"` updated:

- `compiler/PIPELINE.md` line 610 — note that AST shape rename was deferred → updated to historical note that rename happened in S53.
- `compiler/SPEC.md` line 7383 — historical "P1 / P1.E" subsection annotated to indicate the AST node was later renamed (S53).
- `compiler/SPEC.md` line 12773 — error code table reference `machine-decl path` → `engine-decl path` (the code path name in ast-builder.js).
- `compiler/SPEC.md` line 18422 — canonical AST shape note in §51.3.2 "Amended (Phase P1)" — updated from "deferred to P3" to current `kind: "engine-decl"` / `engineName` shape.
- `compiler/SPEC.md` lines 18387, 19073 — grammar productions `machine-decl ::=` and `derived-machine-decl ::=` — LEFT AS-IS. These are user-source-text grammar nonterminal labels (not AST kind strings), and the user-source keyword `<machine>` remains a deprecated alias.

## Acceptance verification

- `grep -rln "'machine-decl'\|\"machine-decl\"" compiler/src/ lsp/` → empty (zero matches).
- `grep -rno '\bmachineName\b' compiler/src/ lsp/` → empty (zero matches).
- Remaining `"machine-decl"` strings in SPEC.md/PIPELINE.md are explicit historical references describing the prior shape.
- `bun test`: 8576 pass / 0 fail / 40 skip / 426 files. Zero regressions.
