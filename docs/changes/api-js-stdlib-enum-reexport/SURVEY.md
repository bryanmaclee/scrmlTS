# api.js stdlib enum re-export gap — Survey

## Context

Phase 2 (commit `b5caf5d`) promoted `ParseError` from a legacy `tError` shadow to a
`BUILTIN_TYPES` `tEnum` to unblock parseVariant exhaustiveness. The underlying
api.js gap remained: cross-file enum imports that pass through an `index.scrml`
re-export were not seeded into the importing file's `importedTypes` map.

## Current data flow (pre-fix)

1. **TAB** (`compiler/src/ast-builder.js:5415-5441`) builds an `export-decl`
   AST node. When the export source is `{ Name1, Name2 } from './path.scrml'`,
   it sets:
   - `exportedName` = comma-joined names
   - `exportKind = "re-export"`
   - `reExportSource = './path.scrml'` (the relative source string)

2. **MOD / `buildImportGraph`** (`compiler/src/module-resolver.js:163-178`)
   splits the comma-list back into individual export entries, each carrying:
   ```js
   { name, kind: "re-export", reExportSource: <absolute path>, span }
   ```
   so the graph entry's `exports[]` knows the re-export target.

3. **`buildExportRegistry`** (`module-resolver.js:302-344`) registers the
   re-export by name in `exportRegistry`, with `kind="re-export"`. This is
   enough for `validateImports` (E-IMPORT-004) — the name IS exported by
   index.scrml — and enough for CE/NR routing of the *name*. But the
   `reExportSource` link is NOT propagated downstream.

4. **api.js `importedTypesByFile` seeder** (`compiler/src/api.js:790-827`):
   for each `imp.absSource` (e.g. `stdlib/data/index.scrml`), it reads
   `depFile.typeDecls` and runs `buildTypeRegistry`. But `index.scrml` has NO
   `typeDecls` of its own — only re-exports. So `depRegistry` is empty,
   nothing gets seeded, and the importing file's typeRegistry never sees
   `ParseError` as a `tEnum`.

## Why P2's `BUILTIN_TYPES["ParseError"]` masks the gap

Builtins are merged into every file's typeRegistry by `buildTypeRegistry` →
`type-system.ts:resolveType` (the BUILTIN_TYPES table is consulted before
falling through to importedTypes). When `ParseError` is a builtin, the
resolution succeeds even though the seeder gave nothing. Remove the
builtin grant and exhaustiveness fails.

## The minimal-shape fix

Extend the api.js seeder so when a dep file is the import target but doesn't
declare the imported name itself, follow the dep's `exports[]` re-export
chain. Specifically, for each imported name not present in the dep's
`typeDecls`, look up the dep's graph entry's `exports[]` for an entry where
`name === importedName && reExportSource !== null`. Then recurse into the
re-export target file's typeDecls. Cycle-break with a visited set keyed by
(filePath, name).

Equivalent re-export forms to handle in v0:
- `export { Name } from './x.scrml'` — single name, single hop. **Yes.**
- `export { A, B, C } from './x.scrml'` — multi-name, single hop. **Yes.**
- Multi-level chain: A re-exports from B which re-exports from C.
  **Yes**, via recursion.
- `export *` (re-export all). **Out of scope** — the TAB grammar at
  `ast-builder.js:5428` only matches `{ ... } from "..."`. Document.
- Renamed re-export `export { A as B } from '...'`. **Out of scope** —
  same regex limitation. Document.
- Circular re-exports. **Break** with a visited (filePath, name) set;
  cycles in the re-export graph are exotic and a clean termination is
  enough.

## Implementation site

The seeder lives in `compiler/src/api.js:790-827`. The fix slots right after
the current `depRegistry`/`isExported`/`isImported` filter:

For each imported name that did not get added (because the dep's own
`depRegistry` had no entry for that name), walk the dep's
`graphEntry.exports[]` looking for a re-export entry, recurse to that
target's typeDecls (lazily building a per-target `buildTypeRegistry` on
first hit and memoizing), and if found, add it to `importedTypes`.

Memoization key: `absSource → buildTypeRegistry(typeDecls)`. The function
is pure given typeDecls, so caching by file path is safe.

## Test plan

New file: `compiler/tests/unit/api-js-stdlib-enum-reexport.test.js`

Cases:
1. **Direct re-export resolves** — fixture: a/b/c.scrml chain where c declares
   `export type T:enum = { ... }`, b re-exports from c, a imports from b.
   Assert: a's `importedTypesByFile` contains `T` with `kind === "enum"` and
   the right variants. Pass `BUILTIN_TYPES` ParseError grant in place but use
   a NEW name (e.g. `LoadError`) so the test exercises the seeder path,
   not the builtin path.
2. **Multi-hop chain** — d re-exports from c re-exports from b which declares.
   Assert: d resolves.
3. **Match exhaustiveness through re-export** — fixture importing
   re-exported enum and using `!{ | ::T.A msg -> ... }` — assert
   E-TYPE-080 fires when a variant is missing (i.e. the type is an enum,
   not an unknown).
4. **Cycle breaks** — a re-exports B from b, b re-exports A from a (mutual).
   Assert: no infinite loop, run completes (clean error count regardless).
5. **Non-stdlib regression** — existing direct same-file enum import still
   works (sanity).

## Disposition of the BUILTIN_TYPES["ParseError"] grant

Per the brief: leave it. Once the seeder works, the builtin is
defensible-not-required — keeps the resolution path short and the variant
set canonical at one source. Future stdlib enum additions
(`SerializeError`, etc.) do NOT need builtin status; the seeder will reach
them via re-export chase.
