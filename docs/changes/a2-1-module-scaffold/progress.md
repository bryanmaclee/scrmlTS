# A-2.1 Module Scaffold — Progress

## 2026-05-13 — start
- Rebased worktree onto main at `8c608a7`.
- `bun install` + `bun run pretest` green.
- Read maps + SCOPING §5 A-2.1 + PIPELINE Stage 7.6 + §40.9 cross-refs.
- BPInput / BPOutput precedent confirmed (`compiler/src/batch-planner.ts`).
- `runBatchPlanner` insertion point identified at `api.js:1183-1189`.
- CLI flag precedent: `--emit-batch-plan` (cli.js help + compile.js parsing).

## 2026-05-13 — types committed (`99c3a65`)
- `compiler/src/types/reachability.ts` authored — PIPELINE Stage 7.6 contract verbatim + A-2.1 implementation-surface shapes (RSInput, RSOutput, RSError, ReachabilityEntryPoint, PlayableSurface, RoleClassificationEntry).
- `emptyReachabilityRecord()` factory exported for scaffold body + CompileContext default.
- Baseline pre-commit test suite: 11,179 pass / 88 skip / 1 todo / 0 fail (11,268 total). Confirmed clean before edits.

## 2026-05-13 — solver scaffold authored
- `compiler/src/reachability-solver.ts` — `runReachabilitySolver` no-op body + `serializeReachabilityRecord` minimal scaffold serializer.
- Bundles clean under `bun build`.

## 2026-05-13 — pipeline wiring
- `compiler/src/api.js`: import added; Stage 7.6 call inserted between BP (Stage 7.5) and CG (Stage 8); rsResult passed into CG input; `reachabilityRecord` + `reachabilityRecordJson` surfaced on the public return value.
- `compiler/src/codegen/index.ts`: `CgInput.reachabilityRecord` + threading into both inline CompileContext constructors (browser + library).
- `compiler/src/codegen/context.ts`: `reachabilityRecord?: ReachabilityRecord | null` added; factory defaults to `emptyReachabilityRecord()`.
- Pre-commit test suite: 11,179 pass / 88 skip / 1 todo / 0 fail (zero regressions).
- Smoke compile `examples/02-counter.scrml` — green.

## 2026-05-13 — CLI flag + smoke test
- `compiler/src/commands/compile.js`: `--emit-reachability` parsed + threaded through `runOnce`. Writes `<base>.reachability.json` (one per input file) into the configured `outputDir` after a successful compile. `writeFileSync` added to existing `node:fs` import.
- `compiler/src/cli.js`: `--emit-reachability` listed in the top-level help text.
- `compiler/tests/unit/reachability-solver-scaffold.test.js`: 6 smoke tests authored (§1 empty-input no-op + factory freshness; §2 JSON shape; §3 determinism; §4 compileScrml end-to-end surface).
- Task-spec smoke test verified: `bun run compiler/bin/scrml.js compile examples/02-counter.scrml --emit-reachability` produces `examples/dist/02-counter.reachability.json` with `{"closures":{},"diagnostics":[]}` shape.
- Pre-commit test suite: 11,185 pass / 88 skip / 1 todo / 0 fail (delta +6 from new scaffold tests).
