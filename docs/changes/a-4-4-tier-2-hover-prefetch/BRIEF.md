# A-4.4 — `prefetch_tier_2(E, R)` emission + hover-prefetch runtime wiring

**Status:** STAGED (ready to fire AFTER A-4.3 lands).
**Authored:** S91 mid-session (2026-05-14).
**Sequence:** dispatch AFTER A-4.3 commits its tier-1 idle-prefetch landing. A-4.4 builds on top — `_scrml_prefetch_tier2` runtime function joins `_scrml_prefetch_tier1` in the `prefetch` chunk-section; tier-2 chunk emission reuses A-4.3's chunk-file-write infrastructure.
**Estimated walltime:** **10-18h** per A-4 SCOPING §3.4.
**Dispatch agent:** `scrml-js-codegen-engineer` with `isolation: "worktree"`.
**OQ ratifications carried:** OQ-A4-C filename `<route>/<RoleVariant>.<tier>.<8-char-hash>.js` + OQ-A4-F opt-in `--emit-per-route` flag during wave (default-on at v0.3.0 cut).

---

# What A-4.3 ships (read before this dispatch fires)

A-4.3 fills `ChunkOutput.payloadJs` for the **tier-1 position** + adds:
- `_scrml_prefetch_tier1(chunkUrl)` runtime function in `runtime-template.js` (uses `requestIdleCallback` + `setTimeout` Safari fallback + `<link rel="prefetch" as="script">` per OQ-A4-G ratification)
- `prefetch` chunk-section marker in `runtime-chunks.ts` for tree-shake elision
- IIFE-tail `_scrml_prefetch_tier1("<url>")` call in initial-chunk path when tier-1 admission set is non-empty
- Tree-shake invariant: zero tier-1 admissions → no runtime function emitted

A-4.4 reuses the same `prefetch` chunk-section pattern + chunk-file-write loop for the tier-2 emission.

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

ALWAYS use ABSOLUTE paths under WORKTREE_ROOT for Write/Edit.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` first (~118 lines). Maps were refreshed S91-open; multiple S91 commits have advanced HEAD post-stamp. Treat map content as starting hypothesis.

Relevant maps:
- `primary.map.md` — project orientation + S91 status
- `domain.map.md` — Task-Shape Routing; A-4.x status
- `dependencies.map.md` — codegen + runtime-template.js consumers
- `structure.map.md` — `compiler/src/codegen/` + `compiler/src/runtime-template.js`

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# ANTI-PATTERNS + KICKSTARTER (mandatory pre-read)

- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`

**Absolute rules** (HARD):
- `null` and `undefined` do NOT exist in scrml at any level. Both → `not`. TS impl + runtime-template.js is JS-host; JS-host null/undefined are fine there.
- **For emitted runtime JS, all scrml absence is canonically JS `null`** — do NOT emit literal `undefined` from codegen (W-CG-UNDEFINED-INTERPOLATION lint would fire).
- Self-host is from-scratch rewrite; no "TS parity" load-bearing.
- try/catch is NOT in scrml's vocabulary. Runtime JS in `runtime-template.js` may use whatever the existing style uses — audit before authoring.

---

# Commit discipline — TWO-SIDED RULE (mandatory)

> After EVERY edit: `git diff <file>`; `git add <file>`; commit IMMEDIATELY. Don't batch.
> Before reporting DONE: `git status` MUST be clean.
> NO `--no-verify` without explicit user authorization. **This brief does NOT authorize it.**

---

# Required prior reading

1. **`docs/changes/a-4-per-route-artifact-splitter-SCOPING/SCOPING.md`** — §3.4 (A-4.4 row) IN FULL. Read the **critical disambiguation** (cross-route hover vs intra-route deep-interaction) carefully — getting it wrong produces wasted fetches OR missing fetches.
2. **`compiler/src/codegen/route-splitter.ts`** at HEAD (post-A-4.1 + A-4.2 + A-4.3) — the orchestrator scaffold + initial-chunk + tier-1 composition + write loop you build on.
3. **`compiler/src/runtime-template.js`** — the JS-host runtime. Audit `_scrml_prefetch_tier1` (A-4.3 just landed) for the style + naming you'll mirror for tier-2.
4. **`compiler/src/codegen/runtime-chunks.ts`** — extend `prefetch` chunk-section to cover both tier-1 + tier-2 (vs. adding a new section).
5. **`compiler/src/codegen/emit-html.ts`** — A-4.4 wires `data-scrml-prefetch="<route>"` attributes onto `<a href="...">` elements during HTML emission.
6. **SPEC §40.9.7** tier-2 normative paragraph (L17789).

---

# THE TASK — A-4.4 tier-2 hover-prefetch

## Sub-task 1 — Tier-2 chunk emission (intra-route deep-interaction)

In `compiler/src/codegen/route-splitter.ts`, replace A-4.1's empty tier-2 placeholder with real composition. Reuse A-4.2's atom-emitters + A-4.3's tier-1 composition pattern:

```ts
function composeTier2Chunk(
  tier2ChunkContents: ChunkContents,
  ctx: CompileContext,
): string {
  // Reuse atom-emitters from A-4.2; canonical iteration per A-2.8.
  // Tier-2 chunk shape: same IIFE shell as initial/tier-1, admission-
  // filtered to the tier-2 delta.
}
```

**Empirical floor (per SCOPING §3.4):** at A-4.4, RS A-2.5's `prefetchTier2.componentNodeIds = new Set()` floor means intra-route deep-interaction admits NO components in v0.3. Emit anyway — the structural surface is what A-4.4 ships. Real intra-route tier-2 content awaits future RS refinement (OQ-A4-B deferred).

Tier-2 chunk filename per OQ-A4-C: `<route>/<RoleVariant>.tier2.<hash>.js` (placeholder hash retained until A-4.6).

LOC estimate for tier-2 emit: ~50 (within SCOPING §3.4's ~100 LOC total for tier-2 emit + cross-route wiring).

## Sub-task 2 — Cross-route hover-prefetch (the DOMINANT case)

This is the load-bearing piece. Per SCOPING §3.4 critical disambiguation:

> *Cross-route hover prefetch is the dominant case (corresponds to `<a>` link hovers — the trucking-dispatch nav bar use case). Intra-route deep-interaction is currently empty per RS A-2.5 floor; it remains structurally supported but admits no content in v0.3.*

When `<a href="/other-route">` in the current page is hovered or focused:
- Fetch `/other-route`'s **initial chunk** for the viewer's current role.
- The chunk URL is `<other-route>/<role>.initial.<hash>.js`, NOT a tier-2 chunk of the current page.

This is conceptually **route-level prefetch** (warm the next route's initial chunk), distinct from intra-route tier-2 (deep-interaction within the current page).

### 2.A — `_scrml_prefetch_tier2(routePath, role)` runtime function

Add to `compiler/src/runtime-template.js` next to `_scrml_prefetch_tier1` (A-4.3 landed). Style + naming mirror:

```js
// --- scrml prefetch tier-2 ---
//
// Hover-prefetch the per-route initial chunk for a cross-route link
// target. Called by the runtime hover-handler attached to <a> elements
// carrying data-scrml-prefetch="<route>" (wired by emit-html.ts).
//
// Per SPEC §40.9.7 tier-2 normative: hover-prefetch fires on link hover
// OR focus. Same <link rel="prefetch"> mechanism as tier-1 for browser
// cache friendliness.
//
// Per OQ-A4-G ratification (S91) the runtime mechanism is browser-side
// (link-tag injection); no Bun-runtime primitive available.
//
function _scrml_prefetch_tier2(routePath, role) {
  var chunkUrl = routePath + "/" + role + ".initial.<hash>.js";
  // NOTE: real chunk URL resolution depends on the chunks.json manifest
  // that A-4.6 emits. At A-4.4 the URL is best-effort — adopter sees
  // a 404 if the cross-route chunk hash hasn't been resolved yet.
  // A-4.6 will provide the manifest-lookup helper.
  var link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "script";
  link.href = chunkUrl;
  document.head.appendChild(link);
}
// --- end scrml prefetch tier-2 ---
```

**Critical note for the agent:** the `<hash>` placeholder is a problem. At A-4.4 the chunks.json manifest doesn't exist yet (A-4.6's job). Options to handle this:
1. Emit `_scrml_prefetch_tier2` that consults a runtime-side `_SCRML_CHUNKS` manifest object (which A-4.6 will populate). The function takes `(routePath, role)` and looks up the hash at runtime.
2. Codegen-time resolution: at emit-time, when generating the IIFE that attaches hover handlers, EMBED the resolved chunk URL directly. This couples A-4.4 to A-4.6's chunk-naming output.

**Choose option 1.** Future-compat: the manifest helper is the right abstraction. The agent should:
- Emit a placeholder `_SCRML_CHUNKS = {}` global at A-4.4 (real population at A-4.6).
- `_scrml_prefetch_tier2(routePath, role)` reads `_SCRML_CHUNKS[routePath]?.[role]?.initial` for the URL.
- If `_SCRML_CHUNKS` entry is missing, log a warning to console and skip the prefetch (defensive — the page still renders correctly).

### 2.B — `data-scrml-prefetch` attribute wiring in `emit-html.ts`

When emitting `<a href="/<route>">` elements during HTML emission, add `data-scrml-prefetch="/<route>"` attribute IF `/<route>` is in the project's `RouteMap.pages`. External links and unknown internal links do NOT get the attribute.

```html
<!-- adopter source: -->
<a href="/loads">Loads</a>

<!-- A-4.4 emits: -->
<a href="/loads" data-scrml-prefetch="/loads">Loads</a>
```

**Edge case — unresolved route.** If the `href` doesn't match `RouteMap.pages` (typo, external URL, fragment-only), DO NOT add `data-scrml-prefetch`. The hover handler skips these silently.

LOC estimate: ~30 (per SCOPING §3.4).

### 2.C — Hover handler attachment in initial-chunk IIFE

The initial-chunk IIFE (A-4.2's territory) is extended at the tail: AFTER the existing `_scrml_prefetch_tier1` call (when tier-1 admission is non-empty), add hover-handler attachment:

```js
// At the tail of the initial-chunk IIFE (after the tier-1 prefetch if any):
document.querySelectorAll("a[data-scrml-prefetch]").forEach(function (el) {
  var attach = function () {
    var route = el.getAttribute("data-scrml-prefetch");
    _scrml_prefetch_tier2(route, _scrml_current_role());
  };
  el.addEventListener("mouseenter", attach, { once: true, passive: true });
  el.addEventListener("focus", attach, { once: true, passive: true });
});
```

(Author + path-discipline cue: this snippet goes INTO the IIFE-tail emission code in route-splitter.ts OR emit-client.ts; verify the right anchor when authoring.)

Edge case: `_scrml_current_role()` — does it exist? Check `runtime-template.js`. If not, defer to A-4.7 (per-route HTML augmentation; role-detection bootstrap is OQ-A4-E hybrid) — at A-4.4, EMIT the hover handler but if `_scrml_current_role()` is undefined, fall back to `"_anonymous"` (matches A-2.5 Component 4's anonymous-role sentinel).

## Sub-task 3 — `runtime-chunks.ts` extend `prefetch` section

A-4.3 added the `prefetch` chunk-section marker. A-4.4 extends it to cover BOTH `_scrml_prefetch_tier1` AND `_scrml_prefetch_tier2`. Either:
- Extend the section's bounds to include the new function.
- Add a sibling marker `prefetch-tier2` if the existing marker doesn't cover it.

Authors' call — pick whichever produces cleaner tree-shake invariants. Document the choice in inline comments.

**Tree-shake invariant.** When NO chunks have non-empty tier-2 OR no `<a href>` elements get `data-scrml-prefetch` (no resolvable internal routes), BOTH `_scrml_prefetch_tier2` AND the hover-handler attachment code MUST be elidable.

LOC estimate: ~5 (per SCOPING §3.4).

## Sub-task 4 — Output write loop for tier-2 chunk files

In `compile.js`'s per-chunk output write loop:
- For each ChunkOutput at tier-2 position with non-empty payload, write to the tier-2 filename.
- Skip empty-payload tier-2 chunks (no file written).
- Update verbose log to surface tier-2 chunk count + byte total.

In v0.3 with the RS A-2.5 floor, ALL intra-route tier-2 chunks are empty (no file written for the intra-route case). The cross-route hover-prefetch fetches OTHER routes' initial chunks (not tier-2 chunks of the current route). So tier-2 chunks are mostly elided in practice.

## Sub-task 5 — Tests

Create `compiler/tests/unit/codegen-route-splitter-tier2.test.js` (NEW or extend prior tier-1 test file):

**Tier-2 chunk shape tests (sparse — most cases are empty per v0.3 floor):**
1. **Empty intra-route tier-2**: compile a fixture with the v0.3 RS A-2.5 floor; assert NO tier-2 chunk files written.
2. **Non-empty intra-route tier-2 (synthetic)**: synthesize a ReachabilityRecord with non-empty `prefetchTier2.componentNodeIds`; assert tier-2 chunk file written with admission-filtered atom set.

**Cross-route hover-prefetch tests:**
3. **`data-scrml-prefetch` on resolvable `<a href>`**: compile a fixture with `<a href="/loads">`; assert HTML output has `data-scrml-prefetch="/loads"`.
4. **No attribute on unresolvable `<a href>`**: compile with `<a href="/nonexistent">`; assert NO `data-scrml-prefetch` attribute.
5. **No attribute on external `<a href>`**: `<a href="https://example.com">` → no attribute.
6. **No attribute on fragment**: `<a href="#section">` → no attribute.
7. **Hover handler attachment**: assert initial-chunk IIFE tail contains `querySelectorAll("a[data-scrml-prefetch]")` + mouseenter/focus listeners.
8. **Runtime function presence (tree-shake live)**: compile with internal links; assert emitted runtime includes `_scrml_prefetch_tier2`.
9. **Runtime function elision (tree-shake dead)**: compile fixture with no internal links; assert emitted runtime does NOT include `_scrml_prefetch_tier2`.
10. **`_SCRML_CHUNKS` manifest scaffold**: assert placeholder `_SCRML_CHUNKS` object initialized; A-4.6 will populate.
11. **Anonymous-role fallback**: assert hover-handler falls back to `"_anonymous"` when `_scrml_current_role()` is undefined.

**§40.9.9 worked example extension:**
12. The §40.9.9 worked example has `<a href="/loads">` in the Header. Assert post-A-4.4 compile produces `data-scrml-prefetch="/loads"` on the link AND the initial-chunk IIFE attaches the hover handler. Per SPEC L17875-17877: *"the `/loads` route — referenced by the nav `<a>` — is its own entry point; its initial chunk is hover-prefetched per §40.9.7's tier-2 wiring on the link."*

13. Determinism: two builds of identical source → byte-identical tier-2 chunk + hover-handler emission.

Aim for 12-16 tests.

## Sub-task 6 (polish) — PIPELINE.md Stage 8 + maps polish

Update `compiler/PIPELINE.md` Stage 8 with A-4.4 wire-in note. ~3-5 lines.

Update `.claude/maps/domain.map.md` Task-Shape Routing + v0.3.0 Status with A-4.4 closure entry.

---

# What NOT to do

- DO NOT implement tier-N (N≥3) on-demand dispatch (A-4.5's job).
- DO NOT implement real content-addressing hashes (A-4.6's job — placeholder `"00000000"` stays).
- DO NOT populate `_SCRML_CHUNKS` manifest with real chunk URLs (A-4.6's job — A-4.4 emits the placeholder scaffold only).
- DO NOT touch per-route HTML role-bootstrap (A-4.7's job).
- DO NOT touch `compiler/src/auth-graph.ts` or `compiler/src/reachability-solver.ts` (closed S91; READ-ONLY).
- DO NOT modify the §40.9 SPEC prose.
- DO NOT extend RS's tier-2 admission set (OQ-A4-B deferred to RS follow-up).

---

# Reporting

When DONE, report:

1. Sub-task 1 — composeTier2Chunk LOC + empty-tier-2 verification.
2. Sub-task 2 — cross-route hover-prefetch: runtime function + emit-html.ts `data-scrml-prefetch` wiring + hover-handler attachment lines.
3. Sub-task 3 — runtime-chunks.ts extension shape.
4. Sub-task 4 — output write loop tier-2 handling.
5. Sub-task 5 — test file + test count delta + tree-shake live/dead verification.
6. Sub-task 6 — PIPELINE.md + domain.map.md edits.
7. **WORKTREE_PATH** + **FINAL_SHA**.
8. **FILES_TOUCHED** list.
9. Maps-consulted statement.
10. Deferred items.

---

# Crash recovery

Per pa.md "Crash Recovery: Incremental Commits + Progress Reports":
- Commit per sub-task. Don't batch.
- Update `docs/changes/a-4-4-tier-2-hover-prefetch/progress.md` after each step.

---

# Authority chain

- SPEC §40.9.7 tier-2 normative (L17789)
- SPEC §40.9.9 worked example (L17875-17877 normative tier-2 wiring on nav `<a>`)
- OQ-A4-G ratification: requestIdleCallback + Safari fallback (carries from A-4.3)
- OQ-A4-B disposition: tier-2 component-side admission refinement DEFERRED to RS follow-up (intra-route tier-2 is empty in v0.3)
- A-4 SCOPING §3.4
- A-4.3's `_scrml_prefetch_tier1` pattern (A-4.4 mirrors structurally)
- A-4.2's atom-emitters
- A-4.1's route-splitter.ts scaffold

---

# Estimated effort

10-18h walltime. Use S83 commit-discipline two-sided rule; commit per sub-task; `git status` clean before terminal report.

Good luck. Tier-2 hover-prefetch is what makes navigation feel instant in adopter apps — once it lands, hovering over a link starts the fetch before the user clicks, and the next page is already in the cache when they arrive.
