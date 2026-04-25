# Progress: fix-lift-sql-chained-call

## Plan

T2 — Standard tier. Bug fix in ast-builder.js + a tightly coupled emit-logic.ts addition.

Decomposition:
- **Step 1:** ast-builder.js — in `lift KEYWORD + BLOCK_REF` branch, when the BLOCK_REF child is a SQL
  block, build it as a `sql` node, consume the trailing `.method()` chain (replicating the
  pattern at lines 1918-1940 / 3421-3442), and wrap as `lift-expr` with the new variant
  `expr: { kind: "sql", node: <sqlNode> }`. Keep the existing markup branch intact.
- **Step 2:** emit-logic.ts — in the `case "lift-expr":` handler (line 680), when
  `liftE.kind === "sql"`, reuse the existing `case "sql":` emission logic. For server
  boundary, emit `return await sql\`...\`;` (or the `.get()` `[0] ?? null` form).
- **Step 3:** Add regression test at compiler/tests/unit/lift-sql.test.js covering
  `lift ?{`SELECT...`}.all()` and `.get()` in a server function. Verify Bun.SQL emission shape.
- **Step 4:** Recompile examples 03/07/08 and `bun --check` each.
- **Step 5:** Run full `bun test`; produce anomaly report.

## Timeline

- [Start] Worktree rebased onto main 74881ea. Pre-snapshot captured. Bug confirmed at
  examples 03/07/08 with fresh recompile. AST shape probed. Begin Step 1.

## Tags
#scrmlTS #progress #lift #sql

## Links
- [intake.md](./intake.md)
- [pre-snapshot.md](./pre-snapshot.md)
