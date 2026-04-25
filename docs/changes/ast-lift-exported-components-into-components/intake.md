# ast-lift-exported-components-into-components — Intake

**Surfaced:** S40 2026-04-24, by LSP L3 agent during component prop completion impl.
**Status:** filed, not started.
**Priority:** low — workaround in place (LSP synthesizes virtual component-def from `export.raw`); doesn't break anything.

## Symptom / observation

When a component is declared as `export const Card = <markup>`, the AST builder emits an `export-decl` whose `raw` field contains the entire definition. The component **does NOT** appear in `ast.components` (which only gets non-exported `component-def` nodes).

LSP L3 component-prop completion has to walk `ast.exports` and synthesize a virtual `component-def` by parsing `export.raw` again — duplicate work that CE already does internally.

## Why this matters (or doesn't)

- Functionally: LSP works, just with more code than necessary.
- Other consumers (TS, RI, etc.) likely also have to handle the export-decl case separately. There's an asymmetry: same logical "component definition," different AST shape based on whether it's exported.

## Suggested fix scope

In `compiler/src/ast-builder.js`, when an `export-decl` wraps a component definition, also lift it into `ast.components` (with an `isExported: true` marker, or a separate `ast.exportedComponents` map). Consumers can then unify their handling.

OR: in CE, where the export-decl is parsed for component refs anyway, push the parsed component into `ast.components` as a side effect.

## Reference

- L3 anomaly report: `docs/changes/lsp-l3-scrml-unique-completions/anomaly-report.md`
- L3 LSP-side workaround: `lsp/handlers.js::findComponentDefInAST` (walks `ast.exports`)

## Tags
#observation #ast-builder #components #export-decl #low-priority
