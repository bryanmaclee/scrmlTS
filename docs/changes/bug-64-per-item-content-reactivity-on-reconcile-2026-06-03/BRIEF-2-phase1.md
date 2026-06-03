# BRIEF-2 (PHASE 1 — IMPLEMENT) — Bug 64 + R28-1c, ratified (A) Hybrid

**Dispatched:** S158, 2026-06-03 · **Agent:** `scrml-js-codegen-engineer` (opus, isolation:worktree, bg) · **Build-on:** main HEAD `55cf3259` (S112 merge-startup REQUIRED) · **Change-id:** `bug-64-per-item-content-reactivity-on-reconcile-2026-06-03`

**Continuation of the Phase-0 survey** (agent a72bdc6e, which STOPped at the gate). PA + USER ratified **(A) Hybrid** (S158 AskUserQuestion): codegen live-keyed per-item effects + a reconcile key→item map (O(1), preserves node-reuse + Fast-path-B2). This brief implements it. SendMessage resume is unavailable in this environment → fresh dispatch carrying the full Phase-0 analysis + the ratified approach. The Phase-0 agent did NO source edits (analysis only).

---

(Verbatim `prompt:` text passed to the Agent call follows.)

---

You are IMPLEMENTING **Bug 64 + R28-1c** in the scrml compiler — per-item content reactivity in reconciled list rendering (Tier-0 `${for…lift}` + Tier-1 `<each>`). A prior agent's Phase-0 survey is complete; the approach is RATIFIED. Implement it. Change-id: `bug-64-per-item-content-reactivity-on-reconcile-2026-06-03`.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` — MUST equal WORKTREE_ROOT.
3. **S112 MERGE-STARTUP (CRITICAL).** Your base may be session-start `1a72c81c`, BEHIND main `55cf3259` (Bug 72 `3707e212` + Bug 60 `55cf3259` landed this session). **Bug 72 modified `emit-each.ts`, `emit-lift.js`, `emit-control-flow.ts` — the files you edit.** If behind: `git -C "$WORKTREE_ROOT" merge main` BEFORE any edit. Verify: `git -C "$WORKTREE_ROOT" log --oneline -3` shows `3707e212`+`55cf3259`; `grep -c emitNestedEachFromMarkup "$WORKTREE_ROOT"/compiler/src/codegen/emit-each.ts` ≥ 1.
4. `git status --short` — clean (or merge result).
5. `bun install` ; 6. `bun run pretest`. Use `bun run test` for baselines.

## Path discipline (EVERY edit — S99/S126)
- **All edits via Bash** (`perl -i`/`python3`/heredoc/`cp`) on worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools. Echo path before each write; `git diff`/`grep` after.
- **NEVER `cd` into main / outside WORKTREE_ROOT.** Use `git -C`, `bun --cwd`, worktree-absolute paths.
- **NEVER `--no-verify`.**

# MAPS
Read `.claude/maps/primary.map.md` (Task-Shape Routing → compiler-source bug fix → error/domain/structure). Maps reflect `57edc794` — STALE; your files were modified by Bug 72 after the cut. Read CURRENT post-merge source. Domain map's "Codegen Emit Map" correctly names emit-lift.js + emit-each.ts (per-item emit) + runtime-template.js (reconcile). Report a maps feedback line.

# PHASE-0 FINDINGS (from the survey — the empirically-measured ground truth)

**The asymmetry sites:** Tier-0 lift text = static `createTextNode` (emit-lift.js ~758/771/1063); Tier-0 class: = `_scrml_effect`-wrapped (~650/885). Tier-1 each text = static (emit-each.ts ~251/310/363); **Tier-1 each class: = BARE static `classList.toggle`, NOT effect-wrapped (~597).** Reconcile Fast-path-B2 (runtime-template.js ~1300-1319) bails on same-key sequences WITHOUT re-running createFn.

**Measured behavior (happy-dom):**
| Change | text (both tiers) | Tier-0 class: | Tier-1 class: |
|---|---|---|---|
| **array-replace** (`@lines = newArr`) | STALE | STALE | STALE |
| **field-mutation** (`@lines[i].f = x`) | STALE | updates (effect) | STALE (bare toggle) |

Root: per-item bindings close over the createFn's `item` param (dead after creation); B2 reuse never re-runs createFn; static text has no effect at all; Tier-1 class has no effect either.

# THE RATIFIED FIX — (A) HYBRID (codegen live-keyed effects + reconcile key→item map)

The universal keyed-list model: per-item bindings read the CURRENT item from the LIVE collection BY KEY, not a create-time snapshot. Three parts:

1. **Reconcile runtime (`runtime-template.js` `_scrml_reconcile_list`)** — build ONE `key→item` map per render pass and stash it where per-item effects can read it O(1) (e.g. a per-list registry keyed by a stable list-id, or attach the live-item resolver to the node/effect context — your call; survey the existing per-item effect plumbing `_scrml_effect` / `_scrml_prop_subscribers`). The map is rebuilt each reconcile pass from `newItems` keyed by `keyFn`. **Preserve node-reuse + Fast-path-B2** — the map build is O(n) per pass but does NOT re-create nodes; the no-change pass still bails via B2 (after refreshing the map so reused nodes' effects resolve current items).

2. **Codegen — per-item interpolated TEXT becomes a live-keyed `_scrml_effect`** in BOTH Tier-0 (`emit-lift.js`) and Tier-1 (`emit-each.ts`). The effect resolves its item via the reconcile map using the node's create-time key, reads the field, and writes `textNode.textContent`. It must re-fire correctly on: (a) array-replace [array cell changed], (b) field-mutation [item's field changed], (c) reorder [same key moves — resolves to the correct item by key, not index]. **This is the load-bearing correctness requirement — verify all three empirically.**

3. **Codegen — UNIFY the tiers + close the Tier-1-class gap:** Tier-1 `<each>` class:/attr bindings must become live-keyed `_scrml_effect`s too (matching Tier-0's effect treatment), so Tier-1 class: becomes field-reactive (closes sibling-gap #1). Both tiers end on the SAME per-item binding model (live-keyed effects reading via the reconcile map) — reuse, don't fork (mind the Bug-72 `emitNestedEachFromMarkup`/`emitEachReconcileLines` helpers you merged in).

**Correctness invariants (the model shift, ratified):** per-item content is a LIVE keyed binding (reflects current data for the node's key), NOT a create-time snapshot. Reorder resolves by key. Same-id-replace + array-replace + field-mutation all reflect new data. **Perf:** no-change reconcile keeps Fast-path-B2 (no node re-create); per-item key resolve is O(1) via the map; map build is O(n) per actual reconcile pass (acceptable — same order as the existing diff).

**You are AUTHORIZED to choose the exact stash mechanism** for the key→item map (the Phase-0 survey identified `_scrml_effect`/`_scrml_prop_subscribers` as the per-item effect plumbing). If during implementation you find the ratified hybrid cannot preserve Fast-path-B2 OR a correctness invariant fails OR the perf is worse than O(n)-per-pass, STOP and report (do not silently ship a node-re-create or O(n²) variant — those were explicitly rejected).

# TESTS (happy-dom is the load-bearing canary — runtime reconcile behavior)
`compiler/tests/browser/each-per-item-reactivity-bug64.browser.test.js` (+ a Tier-0 sibling or one file covering both): for BOTH tiers × {array-replace, field-mutation, reorder} — render, trigger, assert per-item TEXT shows new data AND class: toggle reflects new data AND a handler still fires AND reorder maps content to the right key. NEGATIVE: no-change reconcile uses the fast path (assert no node identity churn — same DOM node references after a no-op reconcile). Unit tests (`compiler/tests/unit/`) for the emit shape (live-keyed effect, both tiers).

Do NOT regress: each-reconcile suite (Bug 57/11), **TodoMVC gauntlet** (pre-push gate — the node-reuse-preservation is critical here; a `.completed` toggle must NOT re-create every `<li>`), Bug 72 nested-each-in-lift, Bug 62/65 engine-in-each/lift. Run these explicitly.

# COMMIT DISCIPLINE (S83)
- Commit per fix-unit / per test-file IMMEDIATELY via `git -C "$WORKTREE_ROOT"`. First commit message includes verbatim `pwd`. Update `progress.md` (append-only) each step. `git status` clean before DONE. Pre-commit runs `bun test {unit,integration,conformance} --bail` — **NEVER `--no-verify`**. Browser tests are NOT in the pre-commit subset — run `bun test compiler/tests/browser/<your-test>` explicitly + confirm green before DONE.

# PHASE 3 — MANDATORY EMPIRICAL R26 (S138)
Re-compile both reproducers (`$WORKTREE_ROOT/docs/changes/bug-64-per-item-content-reactivity-on-reconcile-2026-06-03/repro-bug64-tier0-array-replace.scrml` + `repro-r28-1c-tier1-field-mutation.scrml`) + run the happy-dom tests. ALL must hold:
- Tier-0 array-replace: after B-change, rendered cells show GAMMA/DELTA (not stale alpha/beta); class toggle = new data; `node --check` OK.
- Tier-1 field/array change: per-item content + class refresh.
- Reorder: content follows the key.
- No-change reconcile: same node identities (fast-path preserved) — assert in happy-dom.
- TodoMVC gauntlet still green (pre-push gate).
Paste before/after rendered text (all cases) + node --check + the no-node-churn assertion result. DO NOT mark DONE without R26 + happy-dom + TodoMVC passing.

# FINAL REPORT
WORKTREE_PATH · BASE + merge-startup result · BRANCH + FINAL_SHA · FILES_TOUCHED · FIX SUMMARY (the key→item map stash mechanism you chose; how per-item effects resolve live items by key; how you unified the tiers; tree-shake + Fast-path-B2 preservation) · TEST DELTA (N new incl. happy-dom; full-suite pass/fail/skip; TodoMVC result) · R26 EMPIRICAL (before/after all cases + no-node-churn + node --check) · MAPS feedback · SIBLING GAPS (Rule 5) · DEFERRED.
