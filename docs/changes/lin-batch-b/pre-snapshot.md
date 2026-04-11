# Pre-Snapshot: lin-batch-b

## Baseline
- Branch: main @ 67faf00
- Test run: bun test compiler/tests/unit/type-system.test.js → 219 pass, 0 fail
- Full unit suite: 2283 pass, 2 skip, 90 fail (90 failures are pre-existing, unrelated to lin)

## Current lin behavior (pre-change)

### Parser
- `lin` is NOT in the tokenizer KEYWORDS set
- `lin x = expr` parses as: bare-expr("lin") + tilde-decl(x) — completely wrong
- `lin-decl` and `lin-ref` AST nodes are NEVER created by the real pipeline
- `fileAST.linNodes` is never populated; `checkLinear` is never called on real ASTs

### Type system
- `checkLinear` function exists and is correct; tested via unit tests with manually-constructed AST
- Batch A landed: Lin-A1 (lift semantics), Lin-A3 (loop-body carve-out), improved DX messages
- The prohibition "lin SHALL NOT be valid as a type annotation on function parameters" is stated in SPEC.md §35.2 line 12044 but is NOT enforced in any source file

### E2E behavior
- `lin-001-basic-linear.scrml` compiles with no errors (no lin type checking happens)
- `lin-002-double-use.scrml` compiles with no errors (should produce E-LIN-002, but lin tracking is dormant)

## Pre-existing test failures (NOT regressions)
The 90 unit test failures in the full suite are pre-existing:
- inline-function-bodies.test.js: Cannot find package 'acorn' 
- css-program-scope.test.js: Unhandled error between tests
- server-function-sse.test.js: Unhandled error between tests
- Various other pre-existing failures

## Tags
#lin-batch-b #pre-snapshot

## Links
- Prior batch: e6bf1cd (lin-batch-a)
- Type system tests: compiler/tests/unit/type-system.test.js (§33-§42 = lin tests, lines ~1440-1800)
- checkLinear: compiler/src/type-system.ts lines 3582-3984
