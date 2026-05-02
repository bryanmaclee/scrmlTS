# Diagnosis: P3.B (F-ENGINE-001 / TAB type-decl synthesis gap)

**Date:** 2026-05-02
**Reference:** P3 deep-dive `docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md` §3.1, §5.1, §5.4
**W6 source pattern:** preserved verbatim in P3 dive §3.1

## Symptom

When a `.scrml` file uses `<engine for=ImportedType>` where `ImportedType` is
exported from another file via `export type ImportedType:enum = {...}`, compilation
fails with:

```
E-MACHINE-004: Machine '<name>' references unknown type '<TypeName>'.
The 'for' clause must name an enum or struct type declared in this file
or imported via 'use'.
```

even though the dependency exports the type and the importer imports it correctly
(the same way components and functions are imported successfully today).

## Repro (verified at HEAD eb0ec11)

```js
import { splitBlocks } from "compiler/src/block-splitter.js";
import { buildAST } from "compiler/src/ast-builder.js";

const src = `\${
  export type Foo:enum = { A B C }
}`;
const tab = buildAST(splitBlocks("test.scrml", src));

// Today (broken):
//   tab.ast.typeDecls.length === 0      ← bug
//   tab.ast.exports[0].exportKind === "type"
//   tab.ast.exports[0].exportedName === "Foo"
//   tab.ast.exports[0].raw === "export type Foo : enum = { A B C }"  ← unparsed

// Compare with NON-exported:
const src2 = `\${ type Foo:enum = { A B C } }`;
const tab2 = buildAST(splitBlocks("test.scrml", src2));
//   tab2.ast.typeDecls.length === 1     ← works
//   tab2.ast.typeDecls[0].kind === "type-decl"
//   tab2.ast.typeDecls[0].name === "Foo"
//   tab2.ast.typeDecls[0].typeKind === "enum"
```

## Root Cause (mechanism preserved verbatim from W6 diagnosis in P3 dive §3.1)

> The cross-file machinery WORKS for components and functions; it fails for types
> because TAB doesn't emit the right AST node.

Trace through the pipeline:

1. **TAB** (`compiler/src/ast-builder.js`):
   - The `export` keyword path at line 4326 calls `collectExpr()` which slurps the
     entire `type X:enum = { ... }` text into `exportNode.raw` and produces ONE
     `export-decl` node with `exportKind: "type"`, `exportedName: "X"`.
   - The `type` keyword path at line 4400 (which produces `type-decl` AST nodes
     with parsed `name` + `typeKind` + `raw` body) is NEVER reached for exported types.
   - So `ast.typeDecls` for the dependency is empty for that name.

2. **MOD** (`compiler/src/module-resolver.js`): registers the export by name.
   Architecture is correct — `exportRegistry` knows `Foo` is exported.

3. **`api.js:768-770`** cross-file seeding: builds `importedTypesByFile` from
   `depFile.typeDecls ?? depFile.ast?.typeDecls ?? []`. For files where the only
   type-shaped thing is `export type X = {...}`, this returns `[]`.
   `importedTypes` for the importing file is empty.

4. **TS** (`compiler/src/type-system.ts:7641-7654`): `processFile` builds
   `typeRegistry` from same-file `typeDecls` + `importedTypes`. Imported types
   are missing → `typeRegistry` doesn't know about `Foo`.

5. **TS machine validation** (`type-system.ts:1999-2008`):
   `typeRegistry.get(govName)` returns `null` → emits `E-MACHINE-004`.

## Fix (P3 dive §5.1, §5.4)

> **The architecture is correct.** The only bug is that TAB doesn't produce
> `type-decl` AST nodes when it sees `export type X = {...}` — only `export-decl`
> with unparsed `raw`. The fix is in TAB. The TS pass + cross-file machinery
> are already correct.

**TAB amendment for `export type X = {...}`:**

When the parser sees `export type X:kind = {...}`:
1. Parse the type body (existing type-decl parser path at ast-builder.js:4396-4468).
2. Emit a synthetic `type-decl` AST node with parsed body, **as well as** the
   existing `export-decl` wrapping it.
3. Mirror how `export function helper() {...}` already produces both
   `function-decl` AND `export-decl`.

After the fix, `ast.typeDecls` contains the type-decl, `api.js:768-770`'s lookup
succeeds, `importedTypes` is populated, TS finds the type, machine validation
passes, codegen runs normally.

## Implementation Approach

The simplest implementation is to extend the EXPORT path in `ast-builder.js` (at
~4382-4390) so that when `exportKind === "type"`, the parser ALSO synthesizes a
`type-decl` AST node from the raw expression text. The `raw` already contains
exactly the body text needed (e.g. `"type Foo : enum = { A B C }"`); we re-parse
that into name + typeKind + raw-body.

Alternative: change the export path to delegate to the existing type-decl parser
path before producing the export-decl, so the type-decl is parsed naturally and
added to `nodes` first, then the export-decl wraps it. This avoids re-parsing.

We will use the second approach — peek the upcoming tokens after consuming
`export` (and any pure/server modifiers); if the next token is `type`, branch
into the existing type-decl construction logic to produce a type-decl with the
correct name/typeKind/raw, push it, then ALSO push a corresponding export-decl
(consuming the same token range conceptually, but the spans only need to be
valid for diagnostics).

The cleanest formulation that keeps the existing token consumption intact: after
the existing export-decl path completes its `collectExpr()`, if `exportKind === "type"`,
parse the saved `raw` string with a small regex/sub-parser to reconstruct the
type-decl shape (name, typeKind, body raw), and push the synthetic type-decl
before the export-decl. This avoids any re-arrangement of the existing code path.

We pick the regex/sub-parser approach (additive, minimum-risk).

## Test Strategy

**Unit (TAB shape, ~8 tests):**
- `export type X:enum = {...}` produces both type-decl and export-decl
- `export type X:struct = {...}` produces both
- `export type X:tuple = {...}` produces both
- `export type X:map = {...}` produces both
- non-exported `type X:enum = {...}` continues to produce ONLY type-decl (regression pin)
- mixed file (one exported type + one non-exported type) — both in typeDecls
- order preservation: synthetic type-decl appears before its export-decl in nodes
- empty body / malformed input — no crash, error path unchanged

**Unit (engine for=LocalType regression, ~5 tests):**
- `<engine for=LocalEnum>` (non-exported) compiles
- `<engine for=LocalStruct>` (non-exported) compiles
- `<engine for=LocalEnum>` with all 4 typeKinds — regression pin

**Integration (cross-file engine, ~3 tests):**
- `<engine for=ImportedEnum>` — schema.scrml exports + consumer imports — compiles
- `<engine for=ImportedStruct>`
- End-to-end: `pages/driver/hos.scrml` workaround removed; engine compiles clean

**Unit (deprecated-keyword cross-file, ~2 tests):**
- `<machine for=ImportedType>` — compiles + emits W-DEPRECATED-001
- `<machine for=ImportedType>` — type resolution succeeds via cross-file path

## Predicted Behaviour Changes

- TAB output for files with `export type X = {...}`: `ast.typeDecls.length`
  increases by N (where N = count of such exports). NEW.
- `api.js` `importedTypesByFile`: now populated for files importing `export type`.
  Before: empty for type imports. NEW.
- TS `typeRegistry`: includes imported types. Before: missing them. NEW.
- Machine validation for `<engine for=ImportedType>`: now succeeds. Before:
  E-MACHINE-004. NEW.
- All other code paths: unchanged.

## Predicted Regressions: ZERO

The fix is purely additive — TAB produces an extra AST node alongside the existing
one. Downstream code reading `typeDecls` finds new entries (this is the desired
change). Downstream code reading only `export-decl` is unaffected (the export-decl
shape is unchanged). Per P3 dive §10.2.

## Tags

#p3.b #diagnosis #f-engine-001 #tab-type-decl-synthesis #cross-file-type-resolution #scrmlTS

## Links

- [P3 deep-dive §3.1, §5.1, §5.4](file:///home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/p3-cross-file-inline-expansion-2026-05-02.md)
- [ast-builder.js export path (line 4326-4394)](../../../compiler/src/ast-builder.js)
- [ast-builder.js type-decl path (line 4396-4468)](../../../compiler/src/ast-builder.js)
- [api.js importedTypesByFile (line 759-803)](../../../compiler/src/api.js)
- [type-system.ts E-MACHINE-004 (line 1999-2018)](../../../compiler/src/type-system.ts)
- [SPEC.md §51.3.2 (line ~18310)](../../../compiler/SPEC.md)
- [pre-snapshot.md (sibling artifact)](./pre-snapshot.md)
