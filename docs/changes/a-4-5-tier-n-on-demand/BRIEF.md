# A-4.5 — `prefetch_tier_N` (N≥3) on-demand dispatch hook

**Status:** STAGED (ready to fire AFTER A-4.4 lands).
**Authored:** S91 mid-session (2026-05-14).
**Sequence:** dispatch AFTER A-4.4 commits its tier-2 hover-prefetch landing. A-4.5 is the smallest A-4 sub-phase — runtime hook only; structurally complete but no-op in v0.3 because RS emits empty `prefetchTierN: []` per OQ-A2-B Option a (S89 ratification).
**Estimated walltime:** **4-8h** per A-4 SCOPING §3.5. (Smallest of the A-4 sub-phases.)
**Dispatch agent:** `scrml-js-codegen-engineer` with `isolation: "worktree"`.

---

# What A-4.5 actually does (small surface)

Per SCOPING §3.5 quoted verbatim:

> *Emit the dispatch hook in the runtime that fetches an N≥3 chunk on actual user traversal. Per OQ-A2-B Option a (ratified S89) the RS solver currently emits `prefetchTierN: []` — no N≥3 chunks are produced. A-4.5 emits the runtime-side machinery (`_scrml_fetch_chunk(epId, role, tier)`) so it's wired and ready when RS extends to N≥3 in v0.4 or later. In v0.3.0 the dispatch never fires (empty tier-N).*

**The work is structural-scaffolding:** the runtime function exists, is callable, returns a deterministic chunk URL. RS in v0.3 never produces a tier-N chunk for it to fetch, so the function never fires at runtime. When RS extends to N≥3 in v0.4 or later, the dispatch surface is already shipped.

**Why ship this in v0.3 anyway:** OQ-A4-D ratification (S91) — ship the dispatch hook + empty chunks for forward compatibility. v0.3.0 cut path needs the runtime surface stable; future RS evolution to admit tier-N chunks shouldn't require a runtime-template.js change.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (F4 — RE-EMPHASIZED)

Your worktree path MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.

## CRITICAL: F4 LEAK PREVENTION

**F4 path-discipline leak occurred in S91 once** — a sibling dispatch wrote work to MAIN's working tree while ALSO committing to its worktree branch. PA cleaned via `git checkout HEAD --`; the agent's work landed properly when it completed.

**Defense for THIS dispatch:**

- Save `WORKTREE_ROOT` from `pwd` at startup verification.
- For EVERY Write/Edit call, the file path MUST start with `$WORKTREE_ROOT/`.
- NEVER use absolute paths starting with `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly.
- Before EACH Write/Edit, audit the absolute path begins with `$WORKTREE_ROOT/`.

## Startup verification (BEFORE any other tool call)

1. `pwd` — MUST equal worktree path AND MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under another repo: STOP and report. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — confirm tree clean.
4. `bun install`.
5. `bun run pretest`.

If ANY check fails: STOP. Report. Exit.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` first (~118 lines). Maps were refreshed S91-open; many S91 commits have advanced HEAD post-stamp.

Relevant maps:
- `primary.map.md` — project orientation
- `domain.map.md` — A-4.x status
- `dependencies.map.md` — runtime-template.js consumers

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# ANTI-PATTERNS + KICKSTARTER (mandatory pre-read)

- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

**Absolute rules** (HARD):
- `null` and `undefined` do NOT exist in scrml at any level. Both → `not`. TS impl + runtime-template.js is JS-host; JS-host null/undefined are fine there.
- For emitted runtime JS, all scrml absence is canonically JS `null` per §42.5/§42.8.
- Self-host is from-scratch rewrite; no "TS parity" load-bearing.
- try/catch is NOT in scrml's vocabulary. Runtime JS in `runtime-template.js` may use whatever the existing style uses — audit before authoring.

---

# Commit discipline — TWO-SIDED RULE (mandatory)

> After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Don't batch.
> Before reporting DONE: `git status` MUST be clean.
> NO `--no-verify` without explicit user authorization. **This brief does NOT authorize it.**

---

# Required prior reading

1. **`docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md`** — §3.5 IN FULL + §5 OQ-A4-D ratification (ship dispatch hook + empty chunks).
2. **`compiler/src/runtime-template.js`** — the JS-host runtime. Audit `_scrml_prefetch_tier1` (A-4.3 landed it) AND `_scrml_prefetch_tier2` (A-4.4 landed it) for style + naming consistency. A-4.5's `_scrml_fetch_chunk` mirrors their shape.
3. **`compiler/src/codegen/runtime-chunks.ts`** — extend the `prefetch` chunk-section (or sibling, depending on A-4.3/A-4.4 author's choice) to cover the new `_scrml_fetch_chunk` function for tree-shake elision.
4. **SPEC §40.9.7 tier-N normative** (L17790-17791).

---

# THE TASK — A-4.5 tier-N on-demand dispatch hook

## Sub-task 1 — `_scrml_fetch_chunk(epId, role, tier)` runtime function

In `compiler/src/runtime-template.js`, add a new runtime function next to `_scrml_prefetch_tier1` + `_scrml_prefetch_tier2`. Style + naming mirror those siblings.

```js
// --- scrml fetch chunk (tier-N on-demand) ---
//
// Fetch a deep-traversal chunk on actual user navigation. Called from
// the application runtime when the user crosses an interaction boundary
// that admits content beyond the prefetch-tier-2 surface (per
// SPEC §40.9.7 tier-N normative).
//
// Per OQ-A2-B Option a (S89 ratification) + OQ-A4-D (S91 ratification):
// RS in v0.3 emits prefetchTierN: [] — this function is structurally
// shipped but never fires at runtime in v0.3. When RS extends to N≥3
// in v0.4 or later, the dispatch surface is already in place.
//
// Returns the deterministic chunk URL per the manifest lookup, OR null
// if (epId, role, tier) is not registered in _SCRML_CHUNKS (the
// manifest placeholder A-4.4 emits; A-4.6 populates with real entries).
//
function _scrml_fetch_chunk(epId, role, tier) {
  var manifest = (typeof _SCRML_CHUNKS !== "undefined") ? _SCRML_CHUNKS : {};
  var entry = manifest[epId] && manifest[epId][role] && manifest[epId][role][tier];
  if (!entry) return null;
  return fetch(entry).then(function (r) { return r.text(); });
}
// --- end scrml fetch chunk ---
```

**Style choice:**
- Returns a Promise<string> via fetch().text() — same shape A-4.6's content-addressing tests can chain off.
- Returns `null` when the entry isn't registered — adopter consumer must null-check. Per scrml's absence canon (§42.5/§42.8) JS null is correct here.
- Uses `var` if the rest of the file does; match style.

LOC estimate: ~20 (per SCOPING §3.5).

## Sub-task 2 — `runtime-chunks.ts` marker extension

Extend the `prefetch` chunk-section marker (or whatever A-4.3 + A-4.4 named it) to cover `_scrml_fetch_chunk`. Either:
- Extend the existing section's bounds.
- Add a sibling marker `fetch-chunk` if the existing section's bounds don't cleanly cover it.

**Tree-shake invariant.** When NO chunks have non-empty tier-N admission AND no adopter-authored code references `_scrml_fetch_chunk`, the function MUST be elidable. (In v0.3 the latter condition holds — RS emits empty tier-N, no codegen-generated reference; the function is dead-code-eliminated.)

LOC estimate: ~3 (per SCOPING §3.5).

## Sub-task 3 — Tests

Create `compiler/tests/unit/codegen-route-splitter-tier-n.test.js` (NEW or extend prior tier-2 test file from A-4.4):

1. **Runtime function presence (synthetic invocation)**: synthesize a `_SCRML_CHUNKS` manifest with one entry; assert `_scrml_fetch_chunk(epId, role, tier)` resolves to the registered URL via fetch().
2. **Missing-entry returns null**: call with unregistered (epId, role, tier); assert returns null (not undefined, not throw).
3. **No-tier-N elision (tree-shake live)**: compile a fixture with `emitPerRoute: true` and an RS output with empty `prefetchTierN`; assert emitted runtime does NOT include `_scrml_fetch_chunk` (dead-code-eliminated).
4. **Tier-N synthetic admission (forward-compat)**: synthesize a ReachabilityRecord with non-empty `prefetchTierN`; assert tier-N chunk file is written AND `_scrml_fetch_chunk` is present in emitted runtime.
5. **Determinism**: two builds of identical source → byte-identical runtime emission.

Aim for 4-7 tests.

Optional integration test: assert that v0.3 default compile (without synthetic tier-N admission) produces zero tier-N chunk files. Confirms the "structural-but-no-op" v0.3 floor.

## Sub-task 4 (polish) — PIPELINE.md Stage 8 + maps polish

Update `compiler/PIPELINE.md` Stage 8 with A-4.5 wire-in note. ~2-3 lines.

Update `.claude/maps/domain.map.md` Task-Shape Routing + v0.3.0 Status with A-4.5 closure entry.

---

# What NOT to do

- DO NOT implement real content-addressing hashes (A-4.6's job).
- DO NOT populate `_SCRML_CHUNKS` manifest with real chunk URLs (A-4.6's job — placeholder scaffold from A-4.4 stays).
- DO NOT touch per-route HTML role-bootstrap (A-4.7's job).
- DO NOT extend RS's tier-N admission set (OQ-A2-B Option a deferred to v0.4+).
- DO NOT modify the §40.9 SPEC prose.
- DO NOT touch `compiler/src/auth-graph.ts` or `compiler/src/reachability-solver.ts` (S91 closed; READ-ONLY).

---

# Reporting

When DONE, report:

1. Sub-task 1 — `_scrml_fetch_chunk` runtime function in runtime-template.js (line numbers + section markers).
2. Sub-task 2 — runtime-chunks.ts marker extension shape.
3. Sub-task 3 — test file + test count delta + tree-shake live/dead verification.
4. Sub-task 4 — PIPELINE.md + domain.map.md edits.
5. **WORKTREE_PATH** + **FINAL_SHA**.
6. **FILES_TOUCHED** list.
7. Maps-consulted statement.
8. Deferred items.

---

# Crash recovery

Per pa.md "Crash Recovery: Incremental Commits + Progress Reports":
- Commit per sub-task. Don't batch.
- Update `docs/changes/a-4-5-tier-n-on-demand/progress.md` after each step.

---

# Authority chain

- SPEC §40.9.7 tier-N normative (L17790-17791)
- OQ-A2-B Option a ratification (S89): RS emits empty tier-N in v0.3
- OQ-A4-D ratification (S91): ship dispatch hook + empty chunks
- A-4 SCOPING §3.5
- A-4.3's `_scrml_prefetch_tier1` + A-4.4's `_scrml_prefetch_tier2` patterns (A-4.5 mirrors)

---

# Estimated effort

4-8h walltime. Smallest of the A-4 sub-phases. Use S83 commit-discipline two-sided rule; commit per sub-task; `git status` clean before terminal report.

Good luck. A-4.5 closes the runtime-side dispatch surface for the full A-4 tier ladder. After A-4.5 the only remaining A-4 work is content-addressing (A-4.6) and per-route HTML (A-4.7) — both file-disjoint with prior phases.
