# Progress: f-compile-001

Append-only log. Timestamps in local time.

- [start] Worktree branch `changes/f-compile-001` created off `3dab098` (S50 close).
- [start] Worktree path verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa02e8b34085db2b4`
- [start] git rev-parse confirmed worktree toplevel matches; tree clean.
- [setup] `bun install` in worktree compiler/ (no node_modules yet) — succeeded.
- [setup] `bash scripts/compile-test-samples.sh` ran cleanly (12 samples → dist/).
- [baseline] `bun test` from worktree root: **8196 pass / 40 skip / 0 fail / 8236 tests / 385 files**. Matches main checkout exactly.
- [repro] `bun run compiler/src/cli.js compile examples/23-trucking-dispatch/`: produced 17 HTML / 28 client.js / 17 server.js from 32 sources. Collision confirmed.
- [discovery] **E-CG-002 conflict.** SPEC.md line 12297 reserves E-CG-002 for "conflicting output paths" but `emit-server.ts:76` uses it for "boundary function has no generated route name". Pre-existing SPEC/impl drift. Will use **E-CG-015** instead (next-available after E-CG-014). SPEC.md line 12297 will be updated to reflect actual emit-server.ts usage, and a new entry for E-CG-015 will be added. Surfaced as scope-adjacent, not scope-expansion.
- [plan] Decomposition: (1) write pre-snapshot.md + commit; (2) implement Option A in api.js (path-relative write loop); (3) implement Option B (collision detection + E-CG-015) in api.js; (4) add 4 integration tests; (5) update SPEC.md §47 with normative output-path subsection + E-CG-015 entry; (6) update FRICTION.md F-COMPILE-001 RESOLVED; (7) verify dispatch app E2E; (8) re-run full test suite.
- [plan] dev.js / serve.js: read first to assess whether path-resolution alignment is needed for W0b coexistence; surface BEFORE touching.
- [plan] build.js: read first to confirm whether it shares the api.js write loop or has its own.
