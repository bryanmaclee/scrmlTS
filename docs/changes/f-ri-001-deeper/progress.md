# Progress — F-RI-001 deeper (W4)

- [22:00] Started worktree dispatch. WORKTREE_ROOT verified, rebase to main `5c35618` clean. Bun install in compiler/ + root. `bun run pretest` succeeded. Baseline `bun test`: 8361p / 40s / 0f / 398 files (matches pre-baseline).
- [22:05] Branch `changes/f-ri-001-deeper` created.
- [22:10] Pre-snapshot written. Read source-of-truth: diagnosis.md, repro1-canonical.scrml, repro4.scrml, deep-dive §4.5 + §5.1 M5, route-inference.ts header + Step 5b capture-taint loop. M2 workaround in load-detail.scrml confirmed: `@errorMessage = ""` anchor + `setError()` indirection.
- Next: construct minimal multi-server-fn repro (same file context as dispatch pages) → reproduce E-RI-002 → diagnose root cause.
