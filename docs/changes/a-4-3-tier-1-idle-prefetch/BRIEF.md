# A-4.3 — `prefetch_tier_1(E, R)` emission + idle-prefetch runtime wiring

**Status:** STAGED (ready to fire AFTER A-4.2 lands).
**Authored:** S91 mid-session (2026-05-14).
**Sequence:** dispatch AFTER A-4.2 commits real `payloadJs` for initial-chunk position. A-4.3 fills the tier-1 position (currently empty post-A-4.1) AND wires the idle-prefetch runtime mechanism so the client actually fetches tier-1 after first paint.
**Estimated walltime:** **10-18h** per A-4 SCOPING §3.3.
**Dispatch agent:** `scrml-js-codegen-engineer` with `isolation: "worktree"`.
**OQ-A4-G already ratified S91:** Option α/γ — `requestIdleCallback` browser-side + `setTimeout(fn, 1)` Safari fallback + reserved Bun-runtime extension point for v0.4 if Bun ships one.

---

# What A-4.2 ships (read before this dispatch fires)

A-4.2 fills `ChunkOutput.payloadJs` for the **initial-chunk position only** via real atom composition. The tier-1 / tier-2 / tier-N positions retain empty payloads from A-4.1's scaffold. A-4.2 also extracts atom-emitters from `emit-client.ts` (additive refactor):
- `emitComponentAtom(componentNodeId, ctx) → string`
- `emitReactiveCellAtom(reactiveCellNodeId, ctx) → string`
- `emitServerFnStubAtom(serverFnNodeId, ctx) → string`
- `emitVendorUnitRef(vendorUnitName, ctx) → string`

A-4.3 reuses these atom-emitters for tier-1 composition (same shape, different admission-filtered set — the tier-1 ChunkContents delta over initial-chunk).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (F4 — RE-EMPHASIZED)

Your worktree path MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.

## CRITICAL: F4 LEAK PREVENTION

**F4 path-discipline leak occurred in S91 once** — a sibling dispatch wrote work to MAIN's working tree while ALSO committing to its worktree branch. PA cleaned via `git checkout HEAD --`; the agent's work landed properly when it completed.

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

Read `.claude/maps/primary.map.md` (~118 lines). Maps were refreshed S91-open; A-2.7 + A-2.8 + A-3.5 + A-4.1 + A-4.2 commits have advanced HEAD post-stamp. Treat map content as starting hypothesis; verify via grep/Read.

Relevant maps:
- `primary.map.md` — project orientation + S91 status
- `domain.map.md` — Task-Shape Routing; A-4.x status
- `dependencies.map.md` — codegen pipeline graph + runtime-template.js consumers
- `structure.map.md` — `compiler/src/codegen/` + `compiler/src/runtime-template.js` layout

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# ANTI-PATTERNS + KICKSTARTER (mandatory pre-read)

- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

**Absolute rules** (HARD):
- `null` and `undefined` do NOT exist in scrml. Both → `not`. TS impl + runtime-template.js is JS-host; JS-host null/undefined are fine there.
- **For emitted runtime JS, all scrml absence is canonically JS `null` per §42.5/§42.8** — do NOT emit literal `undefined` from codegen (W-CG-UNDEFINED-INTERPOLATION lint would fire).
- Self-host is from-scratch rewrite; no "TS parity" load-bearing.
- try/catch is NOT in scrml's vocabulary. The runtime function `_scrml_prefetch_tier1` is JS-host code in `runtime-template.js` so try/catch is technically legal there — but PREFER fetch's existing error-handling shapes (`.then` / `.catch` chain) consistent with the rest of `runtime-template.js`. Audit existing patterns in the file before authoring.

---

# Commit discipline — TWO-SIDED RULE (mandatory)

> After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Don't batch.
> Before reporting DONE: `git status` MUST be clean.
> NO `--no-verify` without explicit user authorization. **This brief does NOT authorize it.**

---

# Required prior reading

1. **`docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md`** — §3.3 (A-4.3 row) IN FULL + §5 OQ-A4-G ratification (Option γ — already taken). You should have read this earlier for A-4.1 / A-4.2.
2. **`compiler/src/codegen/route-splitter.ts`** at HEAD (post-A-4.1 + post-A-4.2) — the orchestrator scaffold + initial-chunk composition you build on.
3. **`compiler/src/runtime-template.js`** — the JS-host runtime that scrml programs ship with. A-4.3 adds `_scrml_prefetch_tier1(chunkUrl)`. Read the existing runtime functions for style consistency (naming, error-handling patterns, comment shape).
4. **`compiler/src/codegen/runtime-chunks.ts`** — named-subsection markers in `SCRML_RUNTIME` for tree-shaking. A-4.3 adds a new `prefetch` marker. Read existing markers for naming + tree-shake invariant.
5. **`compiler/src/codegen/emit-client.ts`** — the per-file client IIFE emitter. A-4.3 adds the IIFE-tail `_scrml_prefetch_tier1` call when the chunk has a non-empty tier-1 admission set.
6. **SPEC §40.9.7** tier-1 normative paragraph (compiler/SPEC.md L17788).

---

# THE TASK — A-4.3 prefetch_tier_1 emission + idle-prefetch runtime

## Sub-task 1 — Compose tier-1 chunk payload

In `compiler/src/codegen/route-splitter.ts`, replace A-4.1's empty tier-1 placeholder with real composition:

```ts
function composeTier1Chunk(
  tier1ChunkContents: ChunkContents,
  ctx: CompileContext,
): string {
  // Reuse atom-emitters from A-4.2's emit-client.ts extraction.
  // Iterate componentNodeIds + reactiveCellNodeIds + serverFnNodeIds +
  // vendorUnitNames canonically (stratified comparator per A-2.8).
  // Wrap in IIFE shell same shape as initial-chunk IIFE.
  // Return the chunk's payloadJs string.
}
```

The tier-1 chunk is the **delta** over initial-chunk per SPEC §40.9.7 (`prefetch_tier_1(E) := playable_surface(E, N=1) − initial_chunk(E)`). RS already computes the delta in `ChunkPlan.prefetchTier1.componentNodeIds` (etc.) — you just compose what's there.

Tier-1 chunk filename per OQ-A4-C: `<route>/<RoleVariant>.tier1.<hash>.js` (placeholder hash `"00000000"` retained until A-4.6 lands real content-addressing).

LOC estimate: ~80 (per SCOPING §3.3).

## Sub-task 2 — Add `_scrml_prefetch_tier1` runtime function

In `compiler/src/runtime-template.js`, add a new runtime function (place near existing fetch wrappers — audit the file for the right neighborhood; likely near `_scrml_fetch` and friends):

```js
// --- scrml prefetch tier-1 ---
//
// Idle-prefetch the per-(EP, role) tier-1 delta chunk. Called from the
// initial chunk's IIFE tail when a non-empty tier-1 admission set exists.
//
// Per SPEC §40.9.7: tier-1 SHALL be idle-prefetched after initial render.
// Per OQ-A4-G ratification (S91): `requestIdleCallback` browser-side +
// `setTimeout(fn, 1)` Safari fallback. The Bun-runtime primitive named
// in SPEC §40.9.7 ("or the equivalent Bun-runtime primitive") does not
// exist in Bun 1.2.x as of S91; reserved as v0.4 extension point.
//
function _scrml_prefetch_tier1(chunkUrl) {
  var schedule =
    typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : function (fn) { return setTimeout(fn, 1); };
  schedule(function () {
    // Use <link rel="prefetch"> for browser-cache friendliness; falls
    // back to fetch() if the browser doesn't honor the link.
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "script";
    link.href = chunkUrl;
    document.head.appendChild(link);
  });
}
// --- end scrml prefetch tier-1 ---
```

LOC estimate: ~40 (per SCOPING §3.3).

Style + naming: match the surrounding `_scrml_*` functions in `runtime-template.js`. Use `var` not `let`/`const` if the rest of the file does (or use whichever the existing runtime functions use; consistent with the existing style).

**Tree-shake invariant.** This function must be elidable when no chunks have non-empty tier-1 admission sets. Surround with section markers per the existing `runtime-chunks.ts` convention.

## Sub-task 3 — Add `prefetch` chunk marker in `runtime-chunks.ts`

Add a new entry to the tree-shake catalog identifying `_scrml_prefetch_tier1` as a discrete section. ~10 LOC.

This makes the function tree-shakeable when no chunks have non-empty tier-1.

## Sub-task 4 — IIFE-tail call in `emit-client.ts` initial-chunk path

A-4.2's `composeInitialChunk` produces the initial-chunk IIFE. A-4.3 augments it to, at the IIFE tail, issue an idle-prefetch call when the per-(EP, role) ChunkPlan has a non-empty tier-1 admission set:

```js
// At the tail of the initial-chunk IIFE for entry-point E, role R:
_scrml_prefetch_tier1("/<route>/<RoleVariant>.tier1.<hash>.js");
```

The chunk URL is the tier-1 chunk's emitted-filename (from the same chunks Map A-4.1 produces).

LOC estimate: ~10 (per SCOPING §3.3).

**Edge case — empty tier-1.** When `ChunkPlan.prefetchTier1.componentNodeIds.size === 0` AND `reactiveCellNodeIds.size === 0` AND `serverFnNodeIds.size === 0` AND `vendorUnitNames.size === 0`, NO tier-1 chunk file is written AND NO IIFE-tail prefetch call is emitted. The tree-shake invariant requires this — `_scrml_prefetch_tier1` is elided from `SCRML_RUNTIME` if no chunk references it.

## Sub-task 5 — Output write loop for tier-1 chunk files

In `compile.js` (the per-chunk output write loop A-4.1 added):
- For each ChunkOutput at tier-1 position with non-empty payload, write to the tier-1 filename.
- Skip empty-payload tier-1 chunks (no file written).
- Update verbose log to surface tier-1 chunk count + byte total.

## Sub-task 6 — Tests

Create `compiler/tests/unit/codegen-route-splitter-tier1.test.js` (NEW or extend A-4.1's test file):

1. **Tier-1 chunk shape**: compile a fixture with non-empty tier-1 admission; assert tier-1 file written with admission-filtered atom set; tier-1 contains the DELTA over initial-chunk (no atoms duplicated between initial and tier-1).
2. **Empty tier-1 elision**: compile a fixture with empty tier-1 admission; assert NO tier-1 file written; assert initial-chunk IIFE tail has NO `_scrml_prefetch_tier1` call.
3. **IIFE-tail prefetch call**: compile a fixture with non-empty tier-1; assert initial-chunk IIFE tail contains `_scrml_prefetch_tier1("<expected-url>")`.
4. **Runtime function presence (tree-shake live)**: compile fixture with non-empty tier-1; assert emitted runtime includes `_scrml_prefetch_tier1` function definition.
5. **Runtime function elision (tree-shake dead)**: compile fixture with all-empty tier-1; assert emitted runtime does NOT include `_scrml_prefetch_tier1`.
6. **Tier-1 filename pattern**: assert OQ-A4-C `<route>/<RoleVariant>.tier1.<hash>.js`.
7. **Determinism**: two builds of identical source → byte-identical tier-1 chunk content (foundation for A-4.6).
8. **§40.9.9 worked-example extension** (integration test): compile worked example; assert tier-1 chunks are EMPTY (per SPEC L17873-17874 `prefetch_tier_1(/) = {}`). No file written; no prefetch call.

Aim for 10-14 tests.

## Sub-task 7 (polish) — PIPELINE.md Stage 8 + maps polish

Update `compiler/PIPELINE.md` Stage 8 with A-4.3 wire-in note. ~3-5 lines.

Update `.claude/maps/domain.map.md` Task-Shape Routing + v0.3.0 Status with A-4.3 closure entry.

---

# What NOT to do

- DO NOT implement tier-2 hover-prefetch (A-4.4's job).
- DO NOT implement tier-N on-demand dispatch (A-4.5's job).
- DO NOT implement real content-addressing hashes (A-4.6's job — placeholder `"00000000"` stays).
- DO NOT touch HTML emission for per-route bootstrap (A-4.7's job).
- DO NOT touch `compiler/src/auth-graph.ts` or `compiler/src/types/auth-graph.ts` (S91 closed; READ-ONLY).
- DO NOT touch `compiler/src/reachability-solver.ts` (S91 A-2.8 closed; READ-ONLY).
- DO NOT modify the §40.9 SPEC prose.
- DO NOT explore alternate runtime mechanisms beyond OQ-A4-G ratification (Option γ is final).

# Sibling-dispatch awareness

At brief authorship, M (A-4.1) + L (03-contact-book auth E+A) were in flight; A-4.2 was staged ready-to-fire post-M. Verify HEAD state at startup (`git log --oneline -10`) — A-4.2 must land before A-4.3 can start (you build on A-4.2's `composeInitialChunk` + atom-emitters).

If A-4.2 hasn't landed yet: STOP and report. Do not start work.

---

# Reporting

When DONE, report:

1. Sub-task 1 — composeTier1Chunk LOC + tier-1 delta-over-initial verification.
2. Sub-task 2 — `_scrml_prefetch_tier1` runtime function in runtime-template.js + section markers.
3. Sub-task 3 — runtime-chunks.ts new `prefetch` marker.
4. Sub-task 4 — IIFE-tail call in emit-client.ts initial-chunk path + empty-tier-1 elision check.
5. Sub-task 5 — output write loop tier-1 handling + verbose log.
6. Sub-task 6 — test file path + test count delta + tree-shake live/dead verification.
7. Sub-task 7 — PIPELINE.md + domain.map.md edits.
8. **WORKTREE_PATH** + **FINAL_SHA**.
9. **FILES_TOUCHED** list.
10. Maps-consulted statement.
11. Deferred items.

---

# Crash recovery

Per pa.md "Crash Recovery: Incremental Commits + Progress Reports":
- Commit per sub-task. Don't batch.
- Update `docs/changes/a-4-3-tier-1-idle-prefetch/progress.md` after each step.
- WIP commits expected.

---

# Authority chain

- SPEC §40.9.7 tier-1 normative (L17788)
- SPEC §40.9.9 worked example (L17873-17874 normative `prefetch_tier_1(/) = {}`)
- OQ-A4-G ratification (S91): Option γ — requestIdleCallback + Safari fallback + v0.4 Bun extension
- A-4 SCOPING §3.3
- A-4.2's atom-emitters in `emit-client.ts` (read at HEAD before authoring)
- A-4.1's route-splitter.ts scaffold

---

# Estimated effort

10-18h walltime. Use S83 commit-discipline two-sided rule; commit per sub-task; `git status` clean before terminal report.

Good luck. Tier-1 idle prefetch is the first user-facing "perceived performance" delivery of A-4 — once it lands, adopters see real prefetching on their app's initial page load.
