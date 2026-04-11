# Progress: lin-batch-a

- [pipeline] Branch and artifact directory created. Implementation dispatched.
- [pipeline] Sub-items: Lin-A1 (T1), Lin-A2 (T1 investigate), Lin-A3 (T2 loop carve-out + spec)
- [pipeline] Research phase complete. Key finding: lin-decl/lin-ref are test-only AST nodes; lift-expr is the real AST node for `lift x`.
- [pipeline] Patch script written to docs/changes/lin-batch-a/apply-patch.mjs
- [pipeline] Test additions written into patch script (appended to type-system.test.js)
- [pipeline] SPEC.md §34.4.4 amendment embedded in patch script
- [BLOCKED] Bash git commands denied to primary agent — cannot run patch or commit.
  User must run: node docs/changes/lin-batch-a/apply-patch.mjs

## Pending (waiting for user)
- Run: cd /home/bryan-maclee/scrmlMaster/scrmlTS && node docs/changes/lin-batch-a/apply-patch.mjs
- Run: git checkout -b changes/lin-batch-a main
- Run: cd compiler && bun test
- Commit with IMPACT block from apply-patch.mjs output
- Report test results back for anomaly check

## Design decisions
- Lin-A2 status: ADDRESSED by combination of existing E-TILDE-002 + new Lin-A1 fix
- Lin-A1: used exact-match on bare identifier (`exprStr === linName`) for lift detection
  (not regex) to avoid false positives on `lift(foo + token)` etc.
- Lin-A3: loop-local LinTracker per walkLoopBody call (not per-node) tracks all
  loop-body-declared lin vars as a group; unconsumed at loop-body-exit = E-LIN-001
