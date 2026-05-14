# A-4.5 Progress

## 2026-05-14 — start

- F4 startup verified; pwd under worktrees/agent-a4f4e25ffbff57530.
- Worktree base was S90-close (ff9be0e); rebased onto main (7cac10c = A-4.3 landing) so the
  prefetch chunk + `_scrml_prefetch_tier1` exist as the implementation reference.
- bun install + bun run pretest both pass.
- Reading complete: BRIEF.md, SCOPING.md §3.5 + OQ-A4-D, runtime-template.js L1180-1245
  (prefetch chunk + _scrml_prefetch_tier1 implementation), runtime-chunks.ts (prefetch chunk
  marker at L129), codegen-route-splitter.test.js (test shape for §11 A-4.3 tier-1 tests).

## Plan

- Sub-task 1: append `_scrml_fetch_chunk(epId, role, tier)` inside the existing `prefetch`
  chunk section in runtime-template.js, right after `_scrml_prefetch_tier1` and before the
  next `// §22.5 meta.emit()` marker. Mirror A-4.3 doc-block style. Backticks INSIDE the
  template literal escaped with backslash per A-4.3 precedent.
- Sub-task 2: extend the `prefetch` chunk comment block in runtime-chunks.ts to document
  the new function. Marker itself unchanged — same chunk section continues to gate both.
- Sub-task 3: new test file compiler/tests/unit/codegen-route-splitter-tier-n.test.js with
  4-7 tests (presence, fetch resolution, null on missing entry, tree-shake live/dead,
  determinism).
- Sub-task 4: PIPELINE.md Stage 8 + domain.map.md updates.

## Closure log

- Sub-task 1 (commit 63e4ddc): _scrml_fetch_chunk appended to runtime-template.js inside
  the prefetch chunk bounds (offset 64597, between §40.9.7 marker at 61049 and §22.5 marker
  at 64979). 35-line addition. Pre-commit gate green (11674 pass / 0 fail).
- Sub-task 2 (commit a8d1306): runtime-chunks.ts header comment lists both functions in
  the prefetch chunk. Marker unchanged. Pre-commit gate green (11674 pass / 0 fail).
- Sub-task 3 + emit-client extension (commit e0cc034): tests file with 14 tests across 7
  describe blocks; emit-client.ts:detectRuntimeChunks gate extended to admit prefetch chunk
  on non-empty tier-N admission (forward-compat for v0.4+; never fires in v0.3). All 14
  new tests pass. Pre-commit gate green (11688 pass = +14 / 0 fail).
- Sub-task 4 (pending commit): PIPELINE.md Stage 8 wire-in note for A-4.5; domain.map.md
  Task-Shape Routing + v0.3.0 Status updates.
