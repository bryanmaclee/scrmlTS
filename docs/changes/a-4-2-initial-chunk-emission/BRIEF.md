# A-4.2 — `initial_chunk(E, R)` JS payload emission

**Status:** STAGED (ready to fire AFTER A-4.1 lands).
**Authored:** S91 mid-session (2026-05-14).
**Sequence:** dispatch AFTER A-4.1 commits to main. A-4.1 opens the orchestrator slot + ChunkOutput type + iteration scaffold with empty payloads; A-4.2 fills `payloadJs` with real component / reactive cell / server-fn / vendor unit emission from the ChunkPlan admission sets.
**Estimated walltime:** **12-20h** per A-4 SCOPING §3.2.
**Dispatch agent:** `scrml-js-codegen-engineer` with `isolation: "worktree"`.

---

# What A-4.1 ships (read before this dispatch fires)

A-4.1 (S91 in flight as of brief authorship) opens:
- NEW `compiler/src/codegen/route-splitter.ts` with `emitPerRouteChunks(input)` exported.
- NEW types `ChunkKey`, `ChunkOutput`, `ChunksManifest` (in route-splitter.ts OR types/codegen.ts).
- Per-(entry-point, role, tier) iteration scaffold producing ChunkOutput with EMPTY `payloadJs: ""`.
- Opt-in flag `--emit-per-route` wired through `commands/compile.js`.
- Output write loop emitting placeholder chunk files + `chunks.json` (empty payload at A-4.1).
- Smoke tests in `compiler/tests/unit/codegen-route-splitter.test.js` (8-12 tests; iteration shape correctness only).

A-4.2's job: populate `payloadJs` with real content from the ChunkPlan admission sets.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (F4 — RE-EMPHASIZED)

Your worktree path MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.

## CRITICAL: F4 LEAK PREVENTION

**F4 path-discipline leak occurred in S91 once** — a sibling dispatch wrote work to MAIN's working tree directly while ALSO committing to its worktree branch. PA cleaned via `git checkout HEAD --` for the affected files; the agent's work landed via proper file-delta when it completed.

**Defense for THIS dispatch:**

- Save `WORKTREE_ROOT` from `pwd` at startup verification.
- For EVERY Write/Edit call, the file path MUST start with `$WORKTREE_ROOT/`.
- NEVER use absolute paths starting with `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly — those resolve to MAIN.
- If a brief / intake / hand-off references `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/foo.ts`, MENTALLY translate to `$WORKTREE_ROOT/compiler/src/foo.ts` before writing.
- Before EACH Write/Edit, audit the absolute path begins with `$WORKTREE_ROOT/`. If not, STOP. Re-derive.

## Startup verification (BEFORE any other tool call)

1. `pwd` — MUST equal worktree path AND MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under another repo: STOP and report. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — confirm tree clean.
4. `bun install`.
5. `bun run pretest`.

If ANY check fails: STOP. Report. Exit.

## Path discipline

ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit. NEVER use absolute paths under `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` first (~118 lines). Maps were refreshed S91-open at HEAD `ff9be0e`; A-2.7 + A-2.8 + A-4.1 commits have advanced HEAD post-stamp. Treat map content as starting hypothesis; verify via grep/Read.

Relevant maps for this task:
- `primary.map.md` — project orientation + S91 status (A-2 + A-3 fully closed)
- `domain.map.md` — Task-Shape Routing; A-4.1 status
- `dependencies.map.md` — codegen pipeline graph
- `structure.map.md` — `compiler/src/codegen/` directory + emit-* file layout
- `schema.map.md` — ChunkPlan / ChunkContents / NodeId / ChunkOutput shapes (post-A-4.1)

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# ANTI-PATTERNS + KICKSTARTER (mandatory pre-read)

- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

**Absolute rules** (HARD):
- `null` and `undefined` do NOT exist in scrml. Both → `not`. TS impl is JS-host; JS-host null/undefined are fine there. **But for emitted runtime JS, all scrml absence is canonically JS `null` per §42.5/§42.8** — do NOT emit literal `undefined` from codegen (W-CG-UNDEFINED-INTERPOLATION lint would fire).
- Self-host is from-scratch rewrite; no "TS parity" load-bearing.
- try/catch is NOT in scrml's vocabulary.

---

# Commit discipline — TWO-SIDED RULE (mandatory)

> After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Don't batch.
> Before reporting DONE: `git status` MUST be clean.
> NO `--no-verify` without explicit user authorization. **This brief does NOT authorize it.**

---

# Required prior reading

1. **`docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md`** — §3.2 (A-4.2 row) IN FULL + §2.3-§2.5 (codegen orchestrator + content-addressing landscape) + §4 (Shape B ratified). 695 lines total; you've likely already read it for A-4.1.
2. **`compiler/src/codegen/route-splitter.ts`** at HEAD (post-A-4.1) — the scaffold you're filling in. Read end-to-end before authoring.
3. **`compiler/src/codegen/emit-client.ts`** (~1371 LOC at HEAD) — the per-file monolithic IIFE emitter. A-4.2's BIGGEST churn: extract atom-emitters so they can be called per-component-id rather than per-file. **Additive — no semantics change.**
4. **`compiler/src/reachability-solver.ts`** — ChunkPlan + ChunkContents structure post-A-2.8 (canonical serializer landed).
5. **SPEC §40.9.7** (compiler/SPEC.md L17777+) — initial_chunk normative.
6. **SPEC §40.9.9** (L17814-17882) — worked example. A-4.2's integration test target.

---

# THE TASK — A-4.2 initial_chunk(E, R) emission

## Sub-task 1 — Extract atom-emitters from `emit-client.ts`

Current state: `emit-client.ts:generateClientJs` produces ONE monolithic IIFE per source file. The atom-emitters (component-render, reactive-cell scaffolding, server-fn fetch wrapper, vendor unit reference) are INTERLEAVED inside the IIFE generation, not factorable per-id.

A-4.2 refactor:
- Extract NEW helpers that emit individual atoms keyed by NodeId:
  - `emitComponentAtom(componentNodeId, ctx) → string` — runtime-render code for one component
  - `emitReactiveCellAtom(reactiveCellNodeId, ctx) → string` — subscription scaffolding for one cell
  - `emitServerFnStubAtom(serverFnNodeId, ctx) → string` — fetch-wrapper for one server-fn
  - `emitVendorUnitRef(vendorUnitName, ctx) → string` — vendor-unit import/inline per §41
- These helpers should be IDEMPOTENT (calling twice for the same id returns the same output; A-4.6 content-addressing depends on this).
- The existing `generateClientJs` per-file emitter calls these helpers in the same order as today — refactor is ADDITIVE, no semantics change. Existing test suite must remain green throughout.

LOC churn estimate: ~80 lines (per SCOPING §3.2 file-touch estimate).

## Sub-task 2 — Implement `composeInitialChunk` in `route-splitter.ts`

Replace A-4.1's placeholder empty-payload generator with real composition:

```ts
function composeInitialChunk(
  initialChunkContents: ChunkContents,
  ctx: CompileContext,
): string {
  // Iterate componentNodeIds canonically; call emitComponentAtom for each.
  // Iterate reactiveCellNodeIds canonically; call emitReactiveCellAtom for each.
  // Iterate serverFnNodeIds canonically; call emitServerFnStubAtom for each.
  // Iterate vendorUnitNames canonically; call emitVendorUnitRef for each.
  // Wrap in IIFE shell matching the existing single-file client.js IIFE shape.
  // Return the chunk's payloadJs string.
}
```

**Canonical iteration order:** mirror the A-2.8 stratified comparator for set members (number < string < other; codepoint compare for strings). The chunk's `payloadJs` MUST be byte-identical across runs for the same admission set (A-4.6 content-addressing depends on this).

**Chunk JS shape:** self-contained IIFE that registers components/cells with `SCRML_RUNTIME`. Same shape as current per-file `.client.js` IIFE but admission-filtered to the chunk's set. The role-detection bootstrap (OQ-A4-E hybrid) is A-4.7's territory — at A-4.2 you produce the chunk content; A-4.7 wires it to a per-route HTML.

## Sub-task 3 — Wire payload into ChunkOutput

In A-4.1's `emitPerRouteChunks`, replace the empty `payloadJs: ""` with the real `composeInitialChunk(plan.initialChunk, ctx)` result for the initial-chunk position.

Tier-1 / tier-2 / tier-N chunks REMAIN empty at A-4.2 (those land at A-4.3 / A-4.4 / A-4.5). Only the initial-chunk position gets real content this dispatch.

## Sub-task 4 — Update output write loop

In `compile.js`, the chunk-file write loop (added at A-4.1) now writes non-empty payload to disk for the initial-chunk position. Update verbose log shape to surface chunk byte-count.

## Sub-task 5 — Tests

Extend `compiler/tests/unit/codegen-route-splitter.test.js` (A-4.1's file) AND create `compiler/tests/integration/initial-chunk-emission.test.js` (NEW) covering:

**Unit (in codegen-route-splitter.test.js):**
- Initial-chunk contains components from admission set (assert presence of each componentNodeId's atom).
- Initial-chunk omits components NOT in admission set (worst-case-union admission is OPT-IN per the ChunkPlan; the chunk respects it).
- Atom-emitter idempotency (call `emitComponentAtom` twice with same id → byte-identical output).
- Canonical iteration order in chunk JS (stratified-comparator, mirror A-2.8 pattern).

**Integration (in initial-chunk-emission.test.js):**
- **§40.9.9 worked-example replay (viewer=Driver):** compile the worked example; assert initial chunk contains `{ Header (without admin link), Dashboard, button handler, @count, ProfileWidget, fetchUser stub, @user }` per SPEC L17871-17872 normative example.
- **§40.9.9 worked-example replay (viewer=Admin):** same source, viewer=Admin; assert initial chunk additionally contains the admin-link Header variant.
- **Per-role variance:** assert Driver chunk and Admin chunk differ ONLY in the admin-link admission; the Header/Dashboard atoms are byte-identical between roles where admissible.
- **Determinism:** two builds of identical source produce byte-identical chunk-content (R1 reproducibility per dive A; foundation for A-4.6 content-addressing).
- **Regression — single-file path unchanged:** compile a non-entry-point source file with `emitPerRoute: false`; assert the existing `.client.js` IIFE is byte-identical to pre-A-4.2 baseline.

Aim for 12-18 new tests.

## Sub-task 6 (polish) — PIPELINE.md Stage 8 addendum + docs

Update `compiler/PIPELINE.md` Stage 8 with A-4.2 wire-in note. ~3-5 lines max.

Update `.claude/maps/domain.map.md` Task-Shape Routing with A-4.2 closure entry.

---

# What NOT to do

- DO NOT implement tier-1 / tier-2 / tier-N emission (A-4.3 / A-4.4 / A-4.5's job).
- DO NOT implement real content-addressing hashes (A-4.6's job — placeholder `"00000000"` stays from A-4.1).
- DO NOT touch HTML emission for per-route bootstrap (A-4.7's job).
- DO NOT touch `compiler/src/auth-graph.ts` (closed S91; READ-ONLY).
- DO NOT touch `compiler/src/reachability-solver.ts` (closed S91 A-2.8; READ-ONLY).
- DO NOT modify the §40.9 SPEC prose (A-3.5 + A-2.7 + A-2.8 + S86 v0.3 Approach A pre-bake all already canonical).
- DO NOT remove or change the `--emit-per-route` opt-in flag (per OQ-A4-F ratification — opt-in during wave, default-on at v0.3.0 cut).

# Sibling-dispatch awareness

Three S91 dispatches were in flight at brief authorship — most should have landed by the time A-4.2 fires. **Verify HEAD state at startup** (`git log --oneline -10`) to confirm. If any siblings are still running:
- L (03-contact-book auth E+A fix) touches: `compiler/src/commands/generate.js` NEW + `compiler/src/cli.js` + `stdlib/auth/templates/login.scrml` NEW + `compiler/src/auth-graph.ts` + `compiler/src/types/auth-graph.ts` + SPEC.md + examples/03-contact-book.scrml + e2e/tests/03-contact-book.spec.ts + master-list.md.
- M (A-4.1 codegen orchestrator slot) is YOUR DIRECT PREDECESSOR. If still running, STOP and report — A-4.2 cannot start until A-4.1 lands.

A-4.2 is file-disjoint with L. A-4.2 builds on top of M.

---

# Reporting

When DONE, report:

1. Sub-task 1 — atom-emitter extraction line numbers in emit-client.ts + helper function names exported.
2. Sub-task 2 — composeInitialChunk LOC + canonical-iteration verification.
3. Sub-task 3 — ChunkOutput payload wire-in line numbers.
4. Sub-task 4 — compile.js verbose-log shape.
5. Sub-task 5 — test file paths + test count delta + §40.9.9 worked-example replay outcome.
6. Sub-task 6 — PIPELINE.md + domain.map.md edits.
7. **WORKTREE_PATH** + **FINAL_SHA**.
8. **FILES_TOUCHED** list.
9. Maps-consulted statement.
10. Deferred items (specifically: A-4.3 / A-4.4 / A-4.5 / A-4.6 / A-4.7 are next sub-phases).

---

# Crash recovery

Per pa.md "Crash Recovery: Incremental Commits + Progress Reports":
- Commit per sub-task. Don't batch.
- Update `docs/changes/a-4-2-initial-chunk-emission/progress.md` after each step.
- WIP commits expected.

---

# Authority chain

- SPEC §40.9.7 (initial_chunk normative)
- SPEC §40.9.9 (worked example — integration test target)
- SPEC §47.5 (content-addressing cross-ref — full integration at A-4.6, but A-4.2's chunk content must be byte-deterministic for A-4.6 to hash correctly)
- PIPELINE.md Stage 8 — codegen contract
- docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md §3.2 (A-4.2 scope row)
- A-4.1's `route-splitter.ts` (the scaffold you fill in)

---

# Estimated effort

12-20h walltime. The biggest risk is the atom-emitter extraction from `emit-client.ts` — preserve all existing per-file emit behavior during the refactor (additive change, no semantics churn). Use S83 commit-discipline two-sided rule; commit per sub-task; `git status` clean before terminal report.

Good luck. A-4.2 is the load-bearing sub-phase — initial_chunk is what an adopter actually FIRST LOADS. Everything else (prefetch tiers, content-addressing, HTML) composes on top.
