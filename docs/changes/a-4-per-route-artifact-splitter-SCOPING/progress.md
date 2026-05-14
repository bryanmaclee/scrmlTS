# A-4 SCOPING — Progress Log

Append-only crash-recovery log per global pa.md directive.

---

## 2026-05-14 — Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5

- **Phase 0 (Scope lock).** Read SPEC.md §40.9.0..§40.9.11 (L17640-17912), §47.5 (L19152-19174), §47.9 (L19261-19371). Read PIPELINE.md Stage 7.6 (L2332-2412) + Stage 8 (L2414-2495). Read Insight 29 (design-insights L1827-1925) — confirms 60-120h band for A-4 in compiler-architect decomposition. Read smart-app-splitting dive H header. A-4's slot is fully defined: consumes `ReachabilityRecord` from RS Stage 7.6; integrates into Stage 8 CG; produces per-(entry-point, role, tier) chunk artifacts that preserve §47 content-addressing.
- **Phase 1 (Research).**
  - **Project data.** Read `compiler/src/types/reachability.ts` (full; 360 LOC) — `ReachabilityRecord` + `RolePlayableSurface` + `ChunkPlan` + `ChunkContents` shapes. Read `compiler/src/reachability-solver.ts` (parts L130-330) — orchestration produces per-(EP, role) `ChunkPlan` with deltas already differenced (tier1 = tier1 − tier0). Read `compiler/src/codegen/index.ts` (parts L1-180, L700-846) — codegen orchestrator is a per-file loop emitting `{ serverJs, clientJs, html, css, ...}` per source path; `reachabilityRecord` is already threaded through `CgInput` (S89 A-2.1 pre-wire) but unused by any emitter. Read `compiler/src/api.js` L1410-1580 — output write loop is per-file `pathFor(filePath, suffix)`; `E-CG-015` is the only collision guard.
  - **Existing prefetch / route-link infrastructure search.** Grep for `prefetch`, `requestIdleCallback`, `hover-prefetch`, `<link rel`. Result: **ZERO existing prefetch machinery in compiler/src/ or runtime-template.js.** The only navigation helper is `_scrml_navigate(path)` at `runtime-template.js:1200` — `window.location.href = path`. The dispatch brief's reference to "existing link-prefetch infrastructure that A-4 reuses" is incorrect — A-4 builds this from scratch. Logged as a finding.
  - **Runtime chunks naming collision check.** `compiler/src/codegen/runtime-chunks.ts` exists but is named-subsections of `SCRML_RUNTIME` for tree-shaking (chunks like `core`, `reset`, `validators`, `derived`), NOT per-route route chunks. Different concern entirely; A-4 must NOT collide on this naming.
  - **§47 content-addressing surface.** §47.1-§47.4 encodes JS variable names (per-binding FNV-1a hashing); §47.9 covers per-source-file output paths. §47.5 amended S86 to explicitly cross-ref §40.9.8 determinism. **No existing chunk-filename or chunks.json manifest spec text** — A-4 surfaces this.
  - **Examples corpus.** `examples/23-trucking-dispatch/` has 24+ pages under `pages/dispatch/`, `pages/driver/`, `pages/customer/`, `pages/admin/`. Per-role variance is the load-bearing test case (3 roles × ~6-8 pages each).
- **Phase 2 (Sub-phase decomposition).** Decomposed into A-4.1 through A-4.7 (7 sub-phases) covering: codegen orchestrator slot, initial chunk emission, tier-1 prefetch wiring, tier-2 prefetch wiring, per-role variance, content-addressing integration, integration tests. A-4.8 (CLI debug surface) is folded into A-4.1 (rejected as standalone).
- **Phase 3 (Implementation-shape proposals).** 3 shapes catalogued: Shape A (per-file orchestrator extension), Shape B (new per-route orchestrator above per-file codegen), Shape C (inline transform / post-processing pass).
- **Phase 4 (Recommendation).** Shape B (new per-route orchestrator above per-file codegen) recommended. Rule-3 justification: aligns chunk emission with `ReachabilityRecord`'s per-(EP, role) iteration shape; cleanest §47 content-addressing integration; preserves per-file codegen as the atom-emission stage (existing emitters unchanged).
- **Phase 5 (Open questions).** 6 OQs surfaced for PA/user ratification: chunks.json manifest shape; per-role filename variance; tier-N (N≥3) policy; backwards-compat opt-in flag; per-role HTML emission shape; tier-1 prefetch runtime mechanism (idle-callback vs Bun primitive).

- **SCOPING.md written.** Single-commit deliverable per dispatch contract.

---
