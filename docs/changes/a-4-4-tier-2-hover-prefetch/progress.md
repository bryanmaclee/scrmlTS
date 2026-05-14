# A-4.4 — tier-2 hover-prefetch progress

## 2026-05-14 00:00 — startup

- WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abacf6a745213d036`
- BASE_SHA after sync to A-4.3 = `7cac10c`
- `bun install` OK; `bun run pretest` OK.
- Brief read in full. Maps + prior-reading consumed.

## 2026-05-14 — A-4.4 closeout

All sub-tasks landed; pre-commit gate green throughout.

- Sub-task 1 (composeTier2Chunk + IIFE-tail hover-handler emission in composeInitialChunk) — commit `6700b72`
- Sub-task 2.A (_scrml_prefetch_tier2 + _SCRML_CHUNKS scaffold in runtime-template.js) — commit `f8e63c2`
- Sub-task 3 (extend `prefetch` runtime-chunks.ts doc to cover both tier-1 + tier-2 in same chunk) — commit `a5470b0`
- Sub-task 2.B (data-scrml-prefetch wiring in emit-html.ts + ctx.hasPrefetchableLinks flag + detectRuntimeChunks activation) — commit `aedd1a2`
- Sub-task 4 (api.js write-loop tier-2 byte-total surfacing) — commit `f70bc41`
- Sub-task 5 (tier2-hover-prefetch.test.js — 21 tests) — commit `e3ee8d4`
- Sub-task 6 (PIPELINE.md Stage 8 + domain.map.md updates) — commit `e82e41e`

Test count: 11674 → 11695 (+21). Zero regressions.

## Plan

1. Sub-task 1 — `composeTier2Chunk` in route-splitter.ts (reuses appendAtomLines + isChunkContentsEmpty).
2. Sub-task 2.A — `_scrml_prefetch_tier2` + `_SCRML_CHUNKS` scaffold + `_scrml_current_role` fallback helper in runtime-template.js.
3. Sub-task 2.B — `data-scrml-prefetch` wiring in emit-html.ts (`tag === "a"` + href resolves to a known RouteMap.pages urlPattern OR matches a page-entry-point file).
4. Sub-task 2.C — hover-handler attachment block emitted in composeInitialChunk IIFE tail when fixture contains `<a data-scrml-prefetch>` admitted nodes; tree-shake key = `prefetchTier2` runtime chunk.
5. Sub-task 3 — extend `prefetch` chunk marker (or add `prefetch-tier2`) in runtime-chunks.ts.
6. Sub-task 4 — api.js write loop tier-2 byte-total surfacing.
7. Sub-task 5 — `codegen-route-splitter-tier2.test.js` unit/integration (12-16 tests).
8. Sub-task 6 — PIPELINE.md Stage 8 + domain.map.md.
