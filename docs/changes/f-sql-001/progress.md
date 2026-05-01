# F-SQL-001 — Progress

- **[09:30]** Worktree startup verified. Pwd OK. Rebased onto main `e69ecac`. Status clean.
- **[09:35]** Verified prior W0a/W0b/W1/W2/W3/W3.1+W3.2 landings (validators dir, runtime/stdlib dir at compiler/runtime/stdlib, F1/F2/F3 component-expander, SPEC §47.9).
- **[09:40]** Installed compiler deps via `bun install`. Compiled test samples via `bash scripts/compile-test-samples.sh`.
- **[09:45]** Ran `bun test`: locked baseline at **8329 pass / 40 skip / 0 fail / 395 files** (second run; first showed transient 2-fail flake).
- **[09:50]** Reproduced F-SQL-001 by compiling `examples/23-trucking-dispatch/pages/customer/home.scrml` — observed `[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "AND status IN..."`. Confirmed warning origin: `compiler/src/expression-parser.ts:1182`.
- **[09:55]** Wrote isolated repro (`/tmp/sql001-trace.js`) calling `parseExpression()` directly. Confirmed root cause: the regex `/\?\{[^}]*\}/g` on lines 137 and 169 cannot handle `?{...${expr}...}` because `[^}]*` stops at the first `}` (inner interpolation's close brace). Three of four test cases fail or silently lose data.
- **[10:00]** Pre-snapshot written → `docs/changes/f-sql-001/pre-snapshot.md`. Fix shape: **(C) — both ergonomic fix (bracket-matched scanner) and hard-error E-SQL-007 for residual unparseable shapes.**
