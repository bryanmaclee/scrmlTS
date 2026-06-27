# sPA ss41 → PA — re-integration: auto-await error-arm dead-handler fix (fork g) LANDED

**List:** `spa-lists/ss41-auto-await-error-arm-dead-handler.md` (single bounded structural codegen fix; the ss32 fork(g) the PA gap-filed S223).
**Branch:** `spa/ss41` — **tip `b277099b`** (fix at `619e9589`).
**Base:** **local main `a0559651`** (post-ss32 — item-1's `.catch` present, as the list required). `main...spa/ss41` = `0 2` (2 ahead, no leak).
**Date:** 2026-06-26. **Status: COMPLETE — 1/1 landed, 0 parked, 0 dropped.**

## Item

| # | Item | Status | SHA |
|---|------|--------|-----|
| 1 | g-auto-await-error-arm-dead-promise-check (MED) | **landed-on-branch** | `619e9589` |

(`b277099b` = bookkeeping: BRIEF + progress archival.)

## What landed (`619e9589`, 2 files, +179/-15: `emit-client.ts` + `request-tag-and-server-fn-reactive.test.js`)

`@cell = serverFn() !{ ::NetworkError :> … }` emitted `let result = (async()=>…)(); if(result.__scrml_error){<arm>}` — `result` captured the **IIFE Promise**, so the `!{}` arm was **dead** (never fired). Fix — **seam (A), wrap-stage relocation** in `emit-client.ts` `post-server-fn-iife-wrap`: when the wrapped `_scrml_reactive_set(name, stub(args))` is the RHS of a `let <resultVar> = …` with a trailing `if(<resultVar> && <resultVar>.__scrml_error){<arm>}`, consume that guard and re-emit the arm INSIDE the IIFE after the `await`, reusing the same `resultVar` name so the arm body relocates verbatim:
```js
(async () => {
  const r = await stub(args);
  if (r && r.__scrml_error) { /* <!{} arm, reads r as envelope> */ }
  else { _scrml_reactive_set(name, r); }
})().catch(e => _scrml_error_boundary_log(name, e));   // ss32 safety-net retained
```
Option B (emit-logic.ts) rejected: the stub is still un-mangled there + the IIFE wrap is owned by the wrap stage.

## sPA verify (independent)
- **R26 before/after** (real compiled source, executed): BEFORE → `!{}` handler dead; AFTER → arm fires on `{__scrml_error,variant,data}`; happy-else sets the cell; a non-envelope rejection still surfaces via the `.catch`.
- **No-error-arm form byte-identical** (agent stash-diff confirmed) — the plain reactive-server assignment is not regressed. Expression-position wraps unchanged.
- **S215 adversarial:** multi-arm (`if/else if/else` chain inside the IIFE + happy-else) · `::NetworkError` typed vs generic `_` wildcard · CPS-stub vs fetch-stub (the wrap is name-agnostic — `_scrml_(fetch|cps)_`) · expr-position validity · payload-binding read — all parse clean.
- Target test re-run independently 23/0; cherry-pick onto `spa/ss41` re-ran the full pre-commit gate (green) + post-commit gauntlet (Browser: all checks passed); true full `bun test compiler/tests/` **25489 pass / 0 fail**. No `.scrml` fixture → no allowlist rebaseline.

## ⚠ Three things for your re-integration

1. **Base is LOCAL main, not origin/main.** You integrated ss38 + ss32-item-1 into local main (`a0559651`) but haven't pushed — `origin/main` is still `69cee28b`. `spa/ss41` is built on `a0559651`, so **FF onto LOCAL main is clean** (`0 2`). Pushing order: ss38 + ss32 + ss41 all go up together.

2. **ss33 also modifies `emit-client.ts` — intersect at re-integration (S211).** Regions are **DISJOINT**: ss41 @ ~`1988`–`2166` (the post-server-fn-iife-wrap), ss33 @ ~`2280`. A 3-way merge of both onto main should be conflict-free (different hunks), but verify per the list's S211 mandate. `spa/ss33` @ `95be1749` is based on `69cee28b`.

3. **Stale-worktree-base near-miss (process note).** The agent's `isolation:worktree` provisioned at the **session-start commit `69cee28b`**, NOT the live `a0559651` — so ss32's `.catch` + the SURVEY were absent at boot. The agent self-corrected per S112 (FF-merged local main before working); outcome correct (fix based on `a0559651`). **My brief omitted the explicit `git merge main` startup step** — the agent caught it, but the brief should have mandated it. Reinforces `feedback_worktree_base_session_start_staleness`.

## PA actions
- **FF-merge `spa/ss41` (`b277099b`) → local main; intersect with `spa/ss33` per S211; push the batch (ss38+ss32+ss41[+ss33]).**
- **Flip the gap:** `docs/known-gaps.md` → `g-auto-await-error-arm-dead-promise-check` `status=open` → `fixed` (it's a working-tree-uncommitted M in your main checkout). The sibling `g-auto-await-read-before-resolve-race` stays NOT-A-BUG / parked, untouched.
- **The ss41 list is an untracked PA working file** in your main checkout — I marked item 1 `landed-on-branch SHA=619e9589` in it (no commit; PA-owned). Commit it with your integration.
- **flogence reply** (owed from ss32 item-1, per that list): the `!{}`-handler-fires expectation is NOW closed by this fix — the S15 residual is fully resolved (silent-drop AND dead-handler both fixed).
- **Prunable:** agent worktree `agent-a743caf0331670d92` (locked; `64539252` cherry-picked as `619e9589`) + branch `worktree-agent-a743caf0331670d92`; the ss41 sPA worktree `/home/bryan-maclee/scrmlMaster/scrml-spa-ss41` (gitignored dep symlinks I added — harmless).
