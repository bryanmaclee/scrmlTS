# TASK — native parser F2a: chained `?{...}.method()` SQL form dropped in statement position

Native-parser-swap parity-closer. The clean PROCEED candidate from the F2 survey-STOP decomposition (F2 = 3 roots: F2a-chained [this] / generator-drop / match-arm F3). A `?{...}.get()/.all()/.run()` chained-SQL expr in a `server function` statement drops the SQL body → 0 `_scrml_sql` + `sql-ref nodeId:-1` → E-PA-002. Covers 4/6 F2 contexts.

change-id: `native-sql-chained-form-f2a-2026-06-04`

**SCOPE FENCE:** fix ONLY the chained-form statement-position SQL drop. Do NOT touch the two OTHER F2 roots (separate queued dispatches): (1) `server function*` generator drop (function* absent from native AST); (2) native `match action { "..." => {...} }` arm-parse gap (F3). R26 fixtures must be NON-generator, NON-match.

## Root (prior F2 survey + PA verified)
- `translate-stmt.js` ~L188-206 (M6.5.b.4): BARE `?{}` statement → live `{kind:"sql",query,chainedCalls,span}`; CHAINED form explicitly DEFERRED → falls to `makeBareExpr` → `{kind:"bare-expr",exprNode:{kind:"sql-ref",nodeId:-1}}`.
- `translate-expr.js translateSql` ~L966: emits sql-ref nodeId:-1 (unresolved); native `Sql` atom RETAINS `.raw` + span covers `?{...}` → recoverable.

## The fix
Extend the statement-level SQL promotion (translate-stmt.js, mirror the bare-form M6.5.b.4 path) to the CHAINED `?{...}.method()` form across live sqlNode-attach statement positions: return-stmt (live ast-builder ~L9803), let/const-decl init, bare-expr stmt, assign-RHS. Reconstruct `{kind:"sql",query,chainedCalls,span}` from the native Sql atom `.raw` (query) + postfix chain (chainedCalls). Mirror → codegen emit-logic `case "sql"`. Localized to translate-stmt.js (+ translate-expr helper if needed). Don't touch codegen/route-analysis. `.scrml` mirrors FEATURE-stale — `.js` only.

## PHASE 0 (light — root pre-verified)
Confirm Sql atom `.raw`+span present at each target position; chainedCalls recoverable; the live `{kind:"sql"}` node shape (read the bare-form path + an ast-builder sqlNode-attach site). PROCEED if confirmed; STOP if a position needs infra the bare-form lacks.

## TESTS
Native-path: chained `?{...}.method()` in return/let/const/bare-expr/assign → SQL emitted (no E-PA-002; `_scrml_sql` present). NON-generator, NON-match. Pre-commit subset 0-fail. Within-node 1005/0 (rebump benign only; FLAG non-benign).

## PHASE 3 — R26 (byte-compare EMIT) chained contexts (NON-gen, NON-match)
Minimal repros: server fn `return ?{}.all()`; `let r = ?{}.get()`; bare `?{}.run()`; `@x = ?{}.all()`. Per fixture: default+native compile, diff -r BYTE-IDENTICAL, `_scrml_sql` >0 == default, node --check exit 0, E-PA-002 == 0. DO NOT mark DONE without R26 byte-identical. Drift → report.

## Startup
isolation:worktree; merge 848334b0 at startup. F4/S99/S126; Bash-edit; no `--no-verify`; S83; progress.md.

# FINAL REPORT (data): WORKTREE/FINAL_SHA/BRANCH/FILES_TOUCHED/merge-confirm · Phase-0 + gate · what changed · test delta + within-node + flags · R26 verbatim per chained context · confirm generator+match NOT touched · maps feedback
