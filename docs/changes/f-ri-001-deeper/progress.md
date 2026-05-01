# Progress — F-RI-001 deeper (W4)

- [22:00] Started worktree dispatch. WORKTREE_ROOT verified, rebase to main `5c35618` clean. Bun install in compiler/ + root. `bun run pretest` succeeded. Baseline `bun test`: 8361p / 40s / 0f / 398 files (matches pre-baseline).
- [22:05] Branch `changes/f-ri-001-deeper` created.
- [22:10] Pre-snapshot written. Read source-of-truth: diagnosis.md, repro1-canonical.scrml, repro4.scrml, deep-dive §4.5 + §5.1 M5, route-inference.ts header + Step 5b capture-taint loop. M2 workaround in load-detail.scrml confirmed: `@errorMessage = ""` anchor + `setError()` indirection.
- Next: construct minimal multi-server-fn repro (same file context as dispatch pages) → reproduce E-RI-002 → diagnose root cause.
- [22:30] Constructed minimal multi-fn repro (`docs/changes/f-ri-001-deeper/repro-multi-fn.scrml`). Single-file compile clean — does NOT reproduce the bug. Multi-server-fn alone is insufficient.
- [22:35] Live-reverted `transition()` workaround in `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`; single-file compile clean (only pre-existing E-SYNTAX-042). Directory compile (`scrml compile examples/23-trucking-dispatch/`) FIRES E-RI-002 on `transition`. **Bug reproduced**: it's directory/cross-file context.
- [22:45] Instrumented Step 5b capture-taint with RI_DIAG=transition. Found: `transition`'s `closureCaptures` includes name `'login'` extracted from the string literal `"/login?reason=unauthorized"` via the regex `/\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g` applied to the flat `emitStringFromTree(exprNode)` output. `app.scrml` declares `server function login` — `fnNameToNodeIds` resolves the cross-file collision and propagates server-taint.
- [22:55] **Diagnosis complete.** Root cause: `collectReferencedNames` regex matches identifiers inside string literals. Fix: replace with structural `forEachIdentInExprNode` walk (already exists in expression-parser.ts, used by lin tracking). Restored route-inference.ts (instrumentation removed) + dispatch load-detail.scrml (workaround restored). Diagnosis written to `docs/changes/f-ri-001-deeper/diagnosis.md`.
- Next: write the fix in route-inference.ts.
