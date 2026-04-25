# pa-shadow-db-from-any-context — Intake

**Surfaced:** S40 2026-04-24, by LSP L3 agent during SQL column completion impl.
**Status:** filed, not started.
**Priority:** low — only affects compile-time schema inference for unusual fixture shapes; current corpus uses real DB files.

## Symptom / observation

PA's `extractCreateTableStatements` only walks AST nodes with `kind: "sql"` (top-level SQL contexts in a `< db>` block). SQL statements that appear as expression-position `?{}` blocks — e.g. `@x = ?{`CREATE TABLE ...`}` or any other expression-wrapped CREATE TABLE — are wrapped by the expression parser and don't surface as top-level `kind: "sql"` AST nodes. PA can't see them, so they don't contribute to the shadow-DB schema.

## Why this matters (or doesn't)

L3 SQL column completion needs `paResult.protectAnalysis.views` populated. For test fixtures that wanted to construct a schema purely from CREATE TABLE in source (no real .db file), this gap forced the L3 tests to instead create a real Bun SQLite db via `Database` from `bun:sqlite`. That works but is more setup than necessary.

Real production code currently always uses a real .db file pointed to by `< db src="path">`. So this gap is invisible in practice.

## Suggested fix scope

Extend PA's CREATE TABLE collection to walk into expression contexts:
1. In `compiler/src/protect-analyzer.ts`, after the main `kind: "sql"` walk, also visit reactive-decl initializers, return-stmts, etc., looking for `sqlNode` fields (now structured per S40 SQL fixes) whose template starts with `CREATE TABLE`.
2. Or: at AST-builder time, normalize all CREATE TABLE statements (regardless of context) into a flat list `ast.schemaStatements: SqlNode[]` that PA consumes.

## Reference

- L3 anomaly report: `docs/changes/lsp-l3-scrml-unique-completions/anomaly-report.md`
- PA: `compiler/src/protect-analyzer.ts::extractCreateTableStatements`

## Tags
#observation #pa #shadow-db #completion #low-priority
