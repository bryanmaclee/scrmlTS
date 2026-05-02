# Pre-snapshot: p3-follow

**Date:** 2026-05-02
**Branch:** changes/p3-follow
**Base commit:** 00c533a7ca8c5e08198d7c7f1338d5c955a5f748 (P3.A merge, S53 main tip)
**Worktree:** /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aba4ab44f8623f76d

## Test baseline

```
8539 pass
40 skip
0 fail
29706 expect() calls
Ran 8579 tests across 424 files.
```

(One earlier run flapped to 8538/2-fail due to ECONNREFUSED on serve.test transient retry; second run confirmed 8539/0-fail. This is the authoritative baseline.)

## isComponent reference counts (grep)

- compiler/src/: 103 references across 11 files
- compiler/tests/: 154 references across 20 files

Files containing `isComponent` in `compiler/src/`:
- compiler/src/api.js
- compiler/src/ast-builder.js
- compiler/src/block-splitter.js
- compiler/src/component-expander.ts
- compiler/src/gauntlet-phase1-checks.js
- compiler/src/module-resolver.js
- compiler/src/name-resolver.ts
- compiler/src/state-type-routing.ts
- compiler/src/types/ast.ts
- compiler/src/type-system.ts
- compiler/src/validators/post-ce-invariant.ts

(Note: dispatch estimated ~75; actual is 103. Larger surface; commit cadence matters more.)

Files containing `isComponent` in `compiler/tests/`:
- compiler/tests/conformance/tab/conf-TAB-025.test.js
- compiler/tests/integration/cross-file-components.test.js
- compiler/tests/integration/p2-export-component-form1-cross-file.test.js
- compiler/tests/integration/self-host-smoke.test.js
- compiler/tests/lsp/l3-import-completions.test.js
- compiler/tests/lsp/workspace-l2.test.js
- compiler/tests/self-host/bs.test.js
- compiler/tests/unit/block-splitter.test.js
- compiler/tests/unit/component-ex05-regression.test.js
- compiler/tests/unit/component-expander.test.js
- compiler/tests/unit/component-tags.test.js
- compiler/tests/unit/cross-file-components.test.js
- compiler/tests/unit/css-scope.test.js
- compiler/tests/unit/lift-approach-c.test.js
- compiler/tests/unit/p1e-name-resolver.test.js
- compiler/tests/unit/p1e-uniform-opener-equivalence.test.js
- compiler/tests/unit/p2-export-component-form1.test.js
- compiler/tests/unit/p3a-mod-channel-registry.test.js
- compiler/tests/unit/route-inference.test.js
- compiler/tests/unit/uvb-w1-post-ce-invariant.test.js

## state-type-routing.ts disposition

- Exists at compiler/src/state-type-routing.ts (119 LOC).
- Per dive §8.4 — disposition decision: keep + repurpose (rename role from "transitional" to "category dispatch table") if it provides value for future state-type extensions, OR delete if the migration unifies everything direct.
- Will decide during Phase 3 once consumers are surveyed.
