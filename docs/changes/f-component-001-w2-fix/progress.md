# Progress — W2 (F-COMPONENT-001 architectural fix)

Append-only timeline. `[HH:MM]` UTC.

- [11:18] Worktree set up. `bun install` ran clean (224 packages). Rebase onto main (8dddd27) clean.
- [11:21] `bun run test` baseline: 8280p / 40s / 0f / 392 files — matches briefed baseline.
- [11:25] Confirmed pre-fix VP-2 fires E-COMPONENT-035 on `examples/22-multifile/app.scrml` for BOTH single-file and directory invocations. Both fail F2; single-file additionally fails F3.
- [11:27] pre-snapshot.md written. F1/F2/F3 line citations re-verified against current source.
- [11:30] **Plan:** sub-fix order per deep-dive §15.2:
  1. B4-pre — integration test scaffold (failing first; verifies pre-fix state mechanically)
  2. B1 — F1 recursion fix (hasAnyComponentRefsInLogic walks nested markup)
  3. B2-b — F2 canonical key (CE consumes importGraph; uses imp.absSource)
  4. B3 — F3 auto-gather (compileScrml gathers transitive .scrml closure; sane-limit)
  5. B3 — `--no-gather` flag plumbed through compile.js + dev.js + build.js
  6. B5 — dev.js watch-loop ripple (recompute dirsToWatch after each runOnce)
  7. B4-post — integration test cases enabled and passing
  8. B8 — existing unit-test cleanup (M17 header removed; key synthesis fixed)
  9. B6 — SPEC §15.14.4 + §15.14.5 + §21.7 + PIPELINE Stage 3.2 amendments
  10. B7 — Plan B reversal (master-list / kickstarter / FRICTION)
  11. Final summary commit
