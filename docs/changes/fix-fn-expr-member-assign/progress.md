# Progress: fix-fn-expr-member-assign

- [start] worktree-agent-a23c95be2a960d1d5 — clean tree at branch base
- intake source: handOffs/incoming/read/2026-04-26-1041-6nz-to-scrmlTS-bugs-m-n-o-from-playground-six.md (read from main)
- repro source: handOffs/incoming/read/2026-04-26-1041-bug-m-fn-expr-member-assign.scrml (read from main)
- repro copied to /tmp/fix-fn-expr-member-assign/bug-m.scrml
- pre-snapshot written: docs/changes/fix-fn-expr-member-assign/pre-snapshot.md
- baseline: 7774 pass / 40 skip / 132 fail (all 132 are ENOENT on samples/compilation-tests/dist/* — pre-existing, env-dependent)
- bug reproduced — `bun build` fails with `Unexpected ;` at the empty-RHS line
- root cause traced: collectExpr truncates at `function` keyword when it follows `=` (parts.length > 0, STMT_KEYWORDS guard)
- secondary defect found: AssignmentExpression branch in expression-parser.ts does not thread rawSource (Bug C analog)
- fix plan committed at 4d1056b (pre-snapshot + trace).

## Fix 1 — collectExpr / collectLiftExpr keyword-boundary exception
- patched ast-builder.js: when next tok is `function`/`fn` and lastPart is in expression-RHS context, do not break.
- recompile of bug-m.scrml shows the orphan function-decl is gone; assignment is captured as a single `assign` ExprNode with `target=member` and `value=escape-hatch{FunctionExpression, raw:""}`.
- pre-baked dist samples for browser tests built (`bash scripts/compile-test-samples.sh` is the manual pretest step in this sandbox).
- bun test compiler/tests/: 7906 pass / 40 skip / 0 fail (no regressions; matches intake baseline).
- committed at 598816e.

## Fix 2 — thread rawSource through AssignmentExpression
- patched expression-parser.ts AssignmentExpression branch: pass `rawSource` into `node.left` and `node.right` recursive calls (mirrors CallExpression Bug C fix from 2026-04-20).
- recompile of bug-m.scrml emits the expected `ws.onopen = function () { _scrml_reactive_set("opened", true); };` — exactly matching the intake's expected emit.
- bun build succeeds (sandbox-substitute for `node --check`, which is blocked).
- bun test compiler/tests/: 7906 pass / 40 skip / 0 fail.
- committed at 374b1bf.

## Regression tests
- added compiler/tests/unit/fn-expr-member-assign.test.js — 18 tests, 7 sections.
- §1 canonical, §2 with-return, §4 multi-stmt body, §5 computed member, §6 let-decl, §7 call-arg regression guard, §8 top-level function-decl regression guard.
- §3 (scrml `fn` function-expression) intentionally absent — scrml has no `fn() {...}` syntax; the Fix 1 guard handles `fn` symmetrically with `function` for forward compatibility but no test asserted today.
- bun test compiler/tests/: 7924 pass / 40 skip / 0 fail (7906 baseline + 18 new).
- committed at 399d613.

## Done.

Final repro verification:
```
$ bun run compiler/src/cli.js compile /tmp/fix-fn-expr-member-assign/bug-m.scrml
Compiled 1 file in 65.7ms

# dist/bug-m.client.js line 7:
ws.onopen = function () { _scrml_reactive_set("opened", true); };

$ bun build dist/bug-m.client.js --target=browser
Bundled 1 module in 9ms
```

Test suite: 7924 pass / 40 skip / 0 fail (7906 baseline + 18 new).
TodoMVC gauntlet (post-commit hook): PASS.
Browser validation (post-commit hook): all checks passed.
