# Progress: meta-fix-batch

## Change Summary
Six meta/^{} system bug fixes surfaced by gauntlet R18/R19.
Branch: changes/meta-fix-batch

## Bug Classification

| Bug | Tier | Primary File | Notes |
|-----|------|-------------|-------|
| BUG-META-1 | T2 | meta-eval.ts + codegen/index.ts | emit() output lost; needs investigation |
| BUG-META-2 | T1 | meta-checker.ts | for-of iterator in ^{} |
| BUG-META-3 | T1 | meta-checker.ts | destructuring/rest-params in ^{} |
| BUG-META-4 | T1 | meta-eval.ts | reflect(var) rewrite in for-loop body |
| BUG-META-5 | T1 | meta-eval.ts | literal \n in emit() output |
| BUG-META-6 | T1 | dependency-graph.ts | false E-DG-002 for @vars in runtime ^{} |

## Timeline

- [session-start] Analysis complete. Branch changes/meta-fix-batch created.
- [session-start] Artifact directory created. Dispatching implementation agent.

## Implementation Results (2026-04-10)

### Bugs investigated

| Bug | Status | Verdict |
|-----|--------|---------|
| BUG-META-1 | ALREADY FIXED | emit() output not lost — verified with test cases, no code change needed |
| BUG-META-2 | FIXED | for-stmt not in serializeNode switch — added case "for-stmt" |
| BUG-META-3 | ALREADY FIXED | destructuring/rest-params work — verified with test cases |
| BUG-META-4 | FIXED | extractInlineParamBindings() added to rewriteReflectCalls() |
| BUG-META-5 | ALREADY FIXED | escape sequence normalization confirmed working |
| BUG-META-6 | FIXED | reactive-decl in meta body now counted as @var consumption |

### Root causes found

- BUG-META-2: TAB parses `for (const x of y)` in logic bodies as kind "for-stmt" but serializeNode only had "for-loop". The loop body silently became empty string.
- BUG-META-4: collectMetaLocals only walks AST nodes. Inline function params (`function(typeName)`) inside bare-expr strings were invisible to it. New extractInlineParamBindings() scans the raw expression string.
- BUG-META-6: reactive-decl nodes in meta body have `name` field (not in exprFields). sweepNodeForAtRefs() only scanned exprFields. Added explicit reactive-decl handling inside the meta body walker.

### Commit
e61eeb8 — changes/meta-fix-batch

### Test counts
- Before: 5,542 pass, 2 skip, 0 fail
- After: 5,549 pass, 2 skip, 0 fail
- Added: 7 regression tests (5 in meta-eval.test.js, 2 in dependency-graph.test.js)
- New samples: meta-011, meta-012, meta-013

### Files modified
- compiler/src/meta-eval.ts
- compiler/src/dependency-graph.ts
- compiler/tests/unit/meta-eval.test.js
- compiler/tests/unit/dependency-graph.test.js
- samples/compilation-tests/meta-011-for-of-loop.scrml (new)
- samples/compilation-tests/meta-012-reflect-callback-param.scrml (new)
- samples/compilation-tests/meta-013-runtime-meta-dg002.scrml (new)
