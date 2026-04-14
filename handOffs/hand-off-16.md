# scrmlTS — Session 16 Hand-Off (end-of-session)

**Date:** 2026-04-14
**Previous:** `handOffs/hand-off-15.md`
**Baseline at start:** 6,153 pass / 14 fail
**Baseline at end:** **6,205 pass / 14 fail** (+52 tests from SQL batching work; same 14 pre-existing failures)
**Commits on main:** 11 (all pushed)

---

## What shipped this session

### Deep-dive + debate + spec amendments (SQL batching)

S15 PA left a plan in `handOffs/incoming/`. S16 enacted it:

1. **Deep-dive** (agent) — `../scrml-support/docs/deep-dives/sql-batching-2026-04-14.md` (10 design forks, 3 clusters, prior-art table)
2. **Debate** (curator voiced 5 personas in-thread) — `../scrml-support/docs/deep-dives/debate-sql-batching-2026-04-14.md` + `design-insight-sql-batching-2026-04-14.md`
3. **Reviewer** (`scrml-language-design-reviewer`) — caught hard BLOCK on F4.A implicit tx vs §19.10.4; resolved by `!`-gating + new E-BATCH-001
4. **Boundary analyst** (`scrml-server-boundary-analyst`) — confirmed no route classification changes; flagged `__mountHydrate` requirement for F9.C
5. **Spec amendments** — new §8.9 (coalescing), §8.10 (loop hoist), §8.11 (mount hydration), §19.10.5 (implicit tx), new PIPELINE Stage 7.5, new errors E-BATCH-001/002 + E-PROTECT-003 + D-BATCH-001 + W-BATCH-001. `.first()` → `.get()` (17 replacements). SPEC-INDEX regenerated. Commit `b0aeb3e`.
6. **Implementation** — 6 slices landed, pushed, all green.

### Implementation slices (all pushed to main)

| Slice | Commit | What landed |
|-------|--------|-------------|
| 1 | `77bfa7b` | `.nobatch()` compile-time marker — SQLNode.nobatch flag; ast-builder + rewrite.ts both strip it. 8 tests. |
| 2 | `ad2f59e` | `compiler/src/batch-planner.ts` scaffold + Stage 7.5 wiring + `--emit-batch-plan` CLI. 7 tests. |
| 3a | `fc30239` | Tier 1 candidate-set detection. E-BATCH-001 (composition) + W-BATCH-001 (explicit BEGIN suppression). 9 tests. |
| 3b | `8d68dc0` | Tier 1 implicit `BEGIN DEFERRED` / try / COMMIT / catch-ROLLBACK codegen around `!` handler CSRF IIFE. 6 tests. |
| 4 | `3a55e67` | Tier 2 loop-hoist detection (§8.10.1) + D-BATCH-001 near-miss diagnostic (4 reasons). 11 tests. |
| 5 | `3238af2` | Tier 2 rewrite — actual N+1 → 1 transformation. Pre-loop `keys.map` + `?N` placeholders + `.all(...keys)` + `Map<key, Row>` + per-iteration lookup. 8 tests. |
| 5b | `a0e5b3e` | E-BATCH-002 runtime guard on `SQLITE_MAX_VARIABLE_NUMBER` (32766). 2 tests. |

Also: commit `d8c07d9` README refinements (Runtime Validation + new Free HTML Validation subsection + real §47 encoding in Variable Renaming).

---

## State of the codebase

**Tier 1 and Tier 2 SQL batching are functionally end-to-end.** Both:
- Detect candidates via Batch Planner (Stage 7.5)
- Emit correct semantic-preserving JavaScript
- Thread proper diagnostics
- Honor `.nobatch()` opt-out
- Respect existing `transaction { }` + `server @var` invariants

**Manually verified emitted JS:**
```js
// Tier 1 — implicit envelope for `!` handler with 2+ SQL sites
_scrml_db.exec("BEGIN DEFERRED");
try {
  const _scrml_result = await (async () => { ... })();
  _scrml_db.exec("COMMIT");
  return new Response(...);
} catch (_scrml_batch_err) {
  _scrml_db.exec("ROLLBACK");
  throw _scrml_batch_err;
}

// Tier 2 — N+1 loop hoist
const _batch_keys_2 = (ids).map(x => x.id);
if (_batch_keys_2.length > 32766) throw Error("E-BATCH-002: ...");
const _batch_placeholders_3 = _batch_keys_2.map((_, _i) => "?" + (_i + 1)).join(", ");
const _batch_rows_4 = _batch_keys_2.length === 0 ? [] :
  _scrml_db.query("SELECT ... WHERE id IN (__SCRML_BATCH_IN__)"
                   .replace("__SCRML_BATCH_IN__", _batch_placeholders_3))
            .all(..._batch_keys_2);
const _batch_byKey_5 = new Map();
for (const _r of _batch_rows_4) _batch_byKey_5.set(_r["id"], _r);
for (const x of ids) {
  let row = (_batch_byKey_5.get(x.id) ?? null);
}
```

---

## Next priorities (ordered)

### 🔴 Priority 1 — Slice 6 (F9.C `__mountHydrate`)

**Goal:** When a page has ≥2 `server @var` declarations with initial-fetch calls, coalesce their on-mount loads into a single server round-trip.

**Current behavior (today):** Each `server @var` gets its own async IIFE that fetches independently. N `server @var` declarations = N fetches on mount.

**Target behavior (§8.11):** One synthetic `__mountHydrate` route serves all initial-load values in one response. Client does one fetch, demuxes into per-var `_scrml_reactive_set`. Tier 1 coalescing then picks up SQL reads inside the synthetic server-side handler automatically.

**Entry points — no blind searching needed:**

1. **Where per-var initial loads are emitted today:**
   - `compiler/src/codegen/emit-sync.ts` — `emitInitialLoad(varName, initExpr)` produces the async IIFE (`(async () => { _scrml_reactive_set("v", await loader()); })();`).
   - `compiler/src/codegen/emit-reactive-wiring.ts` lines 232-245 — where `serverVarDecls` is collected and the loop calls `emitInitialLoad` per var.

2. **Where `server @var` declarations are identified:**
   - `collectServerVarDecls(fileAST)` in `emit-reactive-wiring.ts` (same area). Grep shows §52 infrastructure in `compiler/src/codegen/emit-sync.ts` + `type-system.ts`.

3. **Where `server function` routes are generated (for modeling the synthetic handler):**
   - `compiler/src/codegen/emit-server.ts` generateServerJs. Look at the handlerName / routeName / export pattern around lines 643-647.
   - Route inference: `compiler/src/route-inference.ts` — `RouteSpec` with `generatedRouteName`, `boundary: "server"`.

**Suggested approach:**

1. In `emit-reactive-wiring.ts`, when `serverVarDecls.length >= 2` and each decl has a function-call `initExpr`:
   - Instead of calling `emitInitialLoad` per-var, emit one client-side IIFE that fetches `/api/__mountHydrate` once and calls `_scrml_reactive_set` for each var from the response.
2. In `emit-server.ts`, emit one synthetic server route (`__mountHydrate`) whose body runs all `initExpr` functions server-side (use `Promise.all` for parallelism) and returns an object keyed by var name.
3. The Batch Planner's existing Tier 1 coalescing (§8.9.2) will automatically coalesce any `?{}` queries inside the loaders since they share a handler.
4. Writes to `server @var` stay 1:1 (per §8.11.3) — don't touch `emitOptimisticUpdate`.

**Tests to write:**
- 2+ `server @var` on one page → one `__mountHydrate` route emitted.
- Client-side initial-load calls are replaced with the unified fetch + demux.
- Single `server @var` → no synthetic route; per-var IIFE unchanged.
- `server @var` assignments (writes) still emit their per-var sync stub.
- If any `server @var` has a literal placeholder `initExpr` (no function call), it's excluded from the bundle (W-AUTH-001 was already emitted).

**Estimated scope:** medium-large single slice. ~150-200 LOC emit-sync + emit-server changes + 6-8 tests. Could split into:
- 6a: detection + synthetic RouteSpec emission (server-side generation)
- 6b: client-side unified fetch + demux (replaces per-var IIFEs)

### 🟡 Priority 2 — Slice 5b remainder (Tier 2 polish)

Two items deferred from S16 Slice 5:

1. **E-PROTECT-003** — `rowCacheColumns` × protect overlap check. **Needs:**
   - Parse the SELECT column list from `hoist.inSqlTemplate` into a `Set<string>`.
   - Populate `hoist.rowCacheColumns` in `batch-planner.ts analyzeForLoop`.
   - In CG, cross-reference against `CgProtectAnalysis.views` for the involved table; if any protected column appears, emit E-PROTECT-003 and refuse the hoist.
   - Entry points: `compiler/src/codegen/emit-control-flow.ts emitHoistedForStmt`, `compiler/src/protect-analyzer.ts`.

2. **Post-rewrite E-LIFT-001 re-check** (§8.10.7) — The Tier 2 rewrite introduces a new sibling DGNode (the hoisted pre-loop query) inside the handler. Spec mandates re-running the lift checker on the post-rewrite DG to catch any new E-LIFT-001.
   - Entry point: `compiler/src/dependency-graph.ts` — look for the existing lift-checker pass (Phase 2 per PIPELINE Stage 7).
   - Needs a "synthetic sibling" hook that adds the hoisted query as a DGNode after Stage 7.5 completes, then re-invokes the lift-checker only on affected logic blocks.

### 🟡 Priority 3 — Benchmarks

Before promoting SQL batching in README's headline, measure real wins:

1. **Tier 1** — a `!` server handler with 2 independent queries (like the contacts example). Measure: handler latency, before/after Tier 1. Expected: single `BEGIN DEFERRED` + snapshot consistency; modest win (~20-40%) unless workload has heavy lock contention.
2. **Tier 2** — a for-loop-of-.get() with N=100 iterations. Measure: N+1 round trips vs single IN-query. Expected: 10-20× handler latency improvement on a warm-SQLite / cold-page workload.

Benchmark harness already exists at `benchmarks/fullstack-scrml/`. Pattern: `bun run` the server, curl the endpoint 100×, take median.

Once numbers confirm, upgrade README's "Full-Stack in One File" + "Why scrml" paragraphs to mention "the compiler eliminates N+1 automatically."

### ⚪ Priority 4+ — everything else (pre-beta)

Unchanged from S16 start:
- SPEC sync for `:>` + match-as-expr + Lift Approach C.
- Phase 3 legacy test fixture migration (~21 fixtures).
- Lin Approach B (discontinuous scoping).
- 14 pre-existing test failures.

---

## Working tree + push state

```
git log origin/main..HEAD    → (empty; all pushed)
git status                   → clean except local hand-off.md (this file, S17 will rotate)
```

All 11 S16 commits pushed to `origin/main`. No sibling repos touched.

---

## Staged agents (still in `.claude/agents/`)

- `debate-curator.md`
- `debate-judge.md`
- `scrml-language-design-reviewer.md`
- `scrml-server-boundary-analyst.md`

User instructed NOT to clean these up ("step 6 I mean" re: not cleaning). They stay until user asks.

---

## Hand-off to next PA (S17 start)

1. Read `pa.md`, this file, last ~10 user-voice entries (S16 section at `user-voice.md:~S16`).
2. Rotate this `hand-off.md` → `handOffs/hand-off-16.md`. Create fresh `hand-off.md` for S17.
3. Check `handOffs/incoming/` — empty at end of S16 (the one message archived to `read/`).
4. Start with P1 (Slice 6) unless user redirects. All entry points above are grep-verified; no investigation time needed.

---

## Tags
#session-16 #complete #sql-batching-tier-1 #sql-batching-tier-2 #spec-land #e-batch-001 #e-batch-002 #d-batch-001 #w-batch-001 #next-slice-6-f9c-mounthydrate

## Links
- [handOffs/hand-off-15.md](./handOffs/hand-off-15.md) — S15 end
- [handOffs/incoming/read/2026-04-14-1600-s15-plan-sql-batching-deepdive-debate.md](./handOffs/incoming/read/2026-04-14-1600-s15-plan-sql-batching-deepdive-debate.md) — the enactment plan, now archived
- [docs/changelog.md](./docs/changelog.md) — user-facing
- [master-list.md](./master-list.md) — P4 checklist with commit IDs
- [compiler/SPEC.md](./compiler/SPEC.md) §8.9 / §8.10 / §8.11 / §19.10.5
- [compiler/PIPELINE.md](./compiler/PIPELINE.md) Stage 7.5
- [../scrml-support/docs/deep-dives/sql-batching-2026-04-14.md](../scrml-support/docs/deep-dives/sql-batching-2026-04-14.md)
- [../scrml-support/docs/deep-dives/debate-sql-batching-2026-04-14.md](../scrml-support/docs/deep-dives/debate-sql-batching-2026-04-14.md)
- [../scrml-support/docs/deep-dives/design-insight-sql-batching-2026-04-14.md](../scrml-support/docs/deep-dives/design-insight-sql-batching-2026-04-14.md)
- [../scrml-support/archive/spec-drafts/spec-draft-sql-batching-2026-04-14.md](../scrml-support/archive/spec-drafts/spec-draft-sql-batching-2026-04-14.md)
