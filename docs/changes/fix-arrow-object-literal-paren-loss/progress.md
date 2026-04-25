# Progress: fix-arrow-object-literal-paren-loss (GITI-013)

- [start] Read intake + sidecar repro. Identified target: `compiler/src/codegen/emit-expr.ts:343-364` `emitLambda`.
- [start] Verified bug location: line 360 `${asyncPrefix}(${params}) => ${emitExpr(node.body.value, ctx)}` — when `node.body.value.kind === "object"`, emit returns `{...}` unwrapped, ambiguous with block statement.
- [start] Worktree setup: `bun install` in repo root and `compiler/`. `acorn` was missing.
- [baseline] `bun run test`: 7825 pass / 40 skip / 0 fail / 27,971 expect() calls / 7,865 tests / 370 files. (1 of 2 runs had 2 transient HTTP-race fails.)
- [start] Branch created: `changes/fix-arrow-object-literal-paren-loss`.
- [start] Pre-snapshot written and committed (`d2c139b`).
- [pre-fix] Confirmed sidecar repro: `bun --check /tmp/r09/...server.js` → `Expected ";" but found ":"` at line 38.
- [fix] Modified `compiler/src/codegen/emit-expr.ts`: added `arrowBodyNeedsParens(value)` helper and wrap-in-parens in `emitLambda` arrow expression-body branch. Function-style and block-body branches untouched.
- [post-fix] Recompiled sidecar: emit changed to `(f) => ({path: ...})`, `bun --check` clean.
- [commit] Fix committed (`0bbb88c`); pre-commit hook ran tests (7825 pass, 0 fail) + post-commit gauntlet TodoMVC PASS + browser validation PASS.
- [tests] Added `compiler/tests/unit/arrow-object-literal-body.test.js`: 16 tests / 7 sections covering sidecar repro + .map + function arg + RHS assignment + array-body sanity + scalar-body sanity + Bug C regression guard. Each section includes both an emit-text assertion and an acorn module-parse assertion.
- [test-pass] First run: 9 pass / 2 fail (regex `[^)]*` rejected `(it)` paren; `new Function` rejected `export`). Fixed by tightening regex to anchor on `=>` and using acorn `parseModule` helper.
- [test-pass] Second run: 16 pass / 0 fail.
- [post-fix-baseline] Full `bun run test`: 7841 pass / 40 skip / 0 fail / 28,002 expect() calls / 7,881 tests / 371 files. Delta +16 passes, +1 file. No regressions.
- [commit] Tests committed (`5ece9c0`); pre-commit hook ran tests (7841 pass) + post-commit gauntlet PASS + browser validation PASS.
- [anomaly] Anomaly report written: 0 anomalies, CLEAR FOR MERGE.
- [done] Ready for user review.
