# F-SQL-001 — Progress

- **[09:30]** Worktree startup verified. Pwd OK. Rebased onto main `e69ecac`. Status clean.
- **[09:35]** Verified prior W0a/W0b/W1/W2/W3/W3.1+W3.2 landings (validators dir, runtime/stdlib dir at compiler/runtime/stdlib, F1/F2/F3 component-expander, SPEC §47.9).
- **[09:40]** Installed compiler deps via `bun install`. Compiled test samples via `bash scripts/compile-test-samples.sh`.
- **[09:45]** Ran `bun test`: locked baseline at **8329 pass / 40 skip / 0 fail / 395 files** (second run; first showed transient 2-fail flake).
- **[09:50]** Reproduced F-SQL-001 by compiling `examples/23-trucking-dispatch/pages/customer/home.scrml` — observed `[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "AND status IN..."`. Confirmed warning origin: `compiler/src/expression-parser.ts:1182`.
- **[09:55]** Wrote isolated repro (`/tmp/sql001-trace.js`) calling `parseExpression()` directly. Confirmed root cause: the regex `/\?\{[^}]*\}/g` on lines 137 and 169 cannot handle `?{...${expr}...}` because `[^}]*` stops at the first `}` (inner interpolation's close brace). Three of four test cases fail or silently lose data.
- **[10:00]** Pre-snapshot written → `docs/changes/f-sql-001/pre-snapshot.md`. Fix shape: **(C) — both ergonomic fix (bracket-matched scanner) and hard-error E-SQL-008 for residual unparseable shapes.** (E-SQL-007 was already taken — `?{}` in non-async context — so allocated next available code E-SQL-008.)
- **[10:05]** Pre-snapshot commit landed (`bfa9767`). Diagnosis written → `docs/changes/f-sql-001/diagnosis.md`. Diagnosis commit landed (`3e7da85`).
- **[10:15]** First scanner attempt — single-pass with inTemplate/inSingle/inDouble booleans — buggy: when inTemplate=true and a `}` is seen (closing a `${}` interpolation), nothing handled it. Re-traced: even simple Case 2 broke.
- **[10:25]** Rewrote scanner with **context-mode stack** (frames: `js{depth}`, `template`, `single`, `double`). Push/pop per delimiter. `${` inside template pushes nested `js{depth=1}`. All four trace cases pass.
- **[10:30]** Parser fix commit landed (`38ed0a8`). `bun test`: 8329/0/395 still clean. Trailing-content warning count dropped from 146 to 30 occurrences (19 unique SQL-related warning shapes eliminated).
- **[10:35]** ast-builder.js patched: `safeParseExprToNode` (closure-scoped) and `safeParseExprToNodeGlobal` (module-level) detect escape-hatch nodes with `estreeType: "SqlPlaceholderError"` and push a TABError E-SQL-008. Commit landed (`50e975e`).
- **[10:45]** Integration test file written: `compiler/tests/integration/sql-001-bracket-matched.test.js` — 17 tests across 4 sections (parseExpression positive controls, parseStatements, E-SQL-008 hard-error, end-to-end compilation). All 17 pass. Commit landed (`8d80e9a`).
- **[10:50]** SPEC.md updated: §8.6 + §44.7 error tables both add E-SQL-008; §44.8 (NEW) "Parser: Bracket-Matched `?{` Scanner (F-SQL-001)" codifies scanner semantics, failure mode, S49 alignment rationale. SPEC-INDEX.md §44 line range refreshed. FRICTION.md F-SQL-001 marked RESOLVED with full context. Commit landed (`8ee4dfe`).
- **[10:55]** Final test run: 8346 pass / 40 skip / 0 fail / 396 files. Test count delta: +17 (= the new integration tests). 0 regressions. Pre-baseline 8329 → 8346 entirely accounted for by new fixtures.
