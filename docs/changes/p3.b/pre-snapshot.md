# Pre-Snapshot — P3.B

**Branch:** `changes/p3.b`
**Base commit:** `eb0ec1176571f0d7eb7de626520551f9c34bb5ad` (S52 close)
**Snapshot date:** 2026-05-02 09:30 UTC

## Baseline Test State

```
8491 pass
40 skip
0 fail
29494 expect() calls
Ran 8531 tests across 412 files. [15.24s]
```

This is the green baseline. P3.B introduces ~18 new tests; predicted post-fix
count is **8509 pass / 40 skip / 0 fail** (i.e. +18 net new passing tests, zero
regressions).

## Pre-fix Failure Mode (F-ENGINE-001)

Today, when a `.scrml` file uses `<engine for=ImportedType>` where `ImportedType`
comes from another file, the compile fails with `E-MACHINE-004: Machine '...'
references unknown type '...'.` even though the type IS exported from the dependency.

Mechanism (preserved verbatim from W6 diagnosis in P3 deep-dive §5.4):

> 1. `compiler/src/api.js:768-770` builds `importedTypesByFile` by walking the
>    importGraph; for each import, looks up the dependency file's `typeDecls`
>    (`depFile.typeDecls ?? depFile.ast?.typeDecls ?? []`).
> 2. `compiler/src/type-system.ts` `processFile` builds the per-file
>    `typeRegistry` from THE FILE'S OWN `typeDecls`, then merges `importedTypes`.
>    The cross-file machinery is correct.
> 3. The bug: when TAB sees `export type X:enum = {...}`, it produces ONLY an
>    `export-decl` (with `exportKind: "type"`, `raw: "type X:enum = {...}"`).
>    It does NOT emit a `type-decl` AST node alongside it. So the dependency's
>    `ast.typeDecls` is empty for that name, and `api.js:768-770` returns `[]`.
>    `importedTypes` stays empty for that name. TS falls through to E-MACHINE-004.

The architectural fix is: TAB SHALL emit BOTH `type-decl` and `export-decl`
when parsing `export type X = {...}`, mirroring how `export function helper() {}`
already produces both `function-decl` AND `export-decl`.

## Adopter Friction (FRICTION.md F-ENGINE-001)

`examples/23-trucking-dispatch/pages/driver/hos.scrml` lines 44-53 contain a
local re-declaration of `DriverStatus:enum` that duplicates `schema.scrml` line 44-49.
The adopter notes this as a workaround for F-ENGINE-001. Post-P3.B, the workaround
is removable: the file imports `DriverStatus` from `../../schema.scrml` and the
engine compiles clean.

## Files Predicted to Change

Compiler source:
- `compiler/src/ast-builder.js` — extend export path to also synthesize a
  `type-decl` AST node when `exportKind === "type"`. ~50 LOC.
- `compiler/src/types/ast.ts` — verify `TypeDeclNode` already exists; add
  `isExport` flag if helpful. ~5 LOC.
- `compiler/src/api.js` — verify cross-file path; add a P3.B comment. ~5 LOC.
- `compiler/src/type-system.ts` — no change required.

Spec:
- `compiler/SPEC.md` §51.3.2 — correct misleading "imported via 'use'" message.
- `compiler/SPEC.md` §51.16 (NEW) — Cross-File Type Resolution for `<engine for=ImportedType>`.
- `compiler/SPEC.md` §21.2 — normative addition: `export type X = {...}` produces
  both nodes.
- `compiler/PIPELINE.md` Stage 3 (TAB) — note the dual-node emission.

Tests:
- `compiler/tests/unit/p3b-tab-type-decl-synthesis.test.js` (~8)
- `compiler/tests/unit/p3b-engine-for-localtype-regression.test.js` (~5)
- `compiler/tests/integration/p3b-engine-for-importedtype-cross-file.test.js` (~3)
- `compiler/tests/unit/p3b-machine-for-importedtype-deprecated.test.js` (~2)

Adopter app:
- `examples/23-trucking-dispatch/pages/driver/hos.scrml` — remove F-ENGINE-001
  workaround; replace with import.
- `examples/23-trucking-dispatch/FRICTION.md` — mark F-ENGINE-001 RESOLVED.

## Predicted Regression Surface: ZERO

The fix is purely additive. TAB produces an extra AST node (`type-decl`) alongside
the existing `export-decl`. Downstream code that reads `typeDecls` finds a new
entry; downstream code that reads only `export-decl` is unaffected. Per P3 dive
§10.2.

## Tags

#p3.b #pre-snapshot #f-engine-001 #cross-file-type-resolution #scrmlTS

## Links

- [P3 deep-dive (design contract)](file:///home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md)
- [SPEC.md §21.2](../../../compiler/SPEC.md)
- [SPEC.md §51.3.2 (line ~18310 — misleading message)](../../../compiler/SPEC.md)
- [ast-builder.js export path (line 4326+)](../../../compiler/src/ast-builder.js)
- [api.js importedTypesByFile (line 759+)](../../../compiler/src/api.js)
- [type-system.ts processFile (line 7625+)](../../../compiler/src/type-system.ts)
- [FRICTION.md F-ENGINE-001](../../../examples/23-trucking-dispatch/FRICTION.md)
