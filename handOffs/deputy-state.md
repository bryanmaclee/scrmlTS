# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — self-driving. First deputy instance, booted S203 (2026-06-17). On tick 4. All 3 functions LIVE (F1 digest · F2 maintenance · F3 reboot-bridge/agent-monitoring).
- **Self-poke loop:** `/loop 30m` running — cron job `39fed15c`, `7,37 * * * *` (every 30 min, off the :00/:30 marks), session-only, auto-expires 7d. Cancel with CronDelete `39fed15c`. User may also poke directly between ticks.
- **Last-absorbed delta seq:** S203 **[10]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S203 10]).
- **`deputy-maint` branch:** worktree at `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (scrmlMaster sibling, OUTSIDE `.claude/worktrees/`). Base rebased onto main `3513e6f4` (tick 4). **Tip:** `git rev-parse deputy-maint` (tick-4 commits: digest regen `34418032` + this deputy-state update).
- **Owed maintenance:** none.

## In-flight dispatches (F3 watch list)

- **`abcf64f7198fe9cf3`** — e2e #3 `g-raw-interp-channel-meta-corners` (scrml-js-codegen-engineer, isolation:worktree, bg). Dispatched delta-log **[10]**; no `land` yet. **Status @ tick 4:** no agent worktree in `.claude/worktrees/`, no branch, no `progress.md` (only BRIEF.md) — no completion observed. **PA is ALIVE** (committing [10], uncommitted `seed-fixtures.js` in main) → the PA owns this landing; deputy makes NO delta-log `(deputy) state` entry (that exception is for PA-absent/reboot gaps only). Keep watching each tick; if it completes while the PA is absent, append a `(deputy) state` entry then.

## Tick log

**Tick 1 (boot, S203):** absorbed [1]…[5]; regen `@generated:recent-sessions` (caught wrap-s202 post-wrap drift); init deputy-state. PA FF-merged.

**Tick 2 (S203):** absorbed [6]+[7] (F1 digest LIVE). FF'd to `ab8b5758`; first canonical `digest.md`. PA merged.

**Tick 3 (S203):** absorbed [8] (source-based freshness) + [9] (FULL GO-LIVE: F3 + self-drive). FF'd to `ffb44a7f`; digest regen; deputy-state F3 section.

**Tick 4 (S203):** absorbed [10] (e2e-backlog opened; #3 dispatched bg agent `abcf64f7198fe9cf3`). deputy-maint had DIVERGED (PA committed [10] before integrating tick-3 → `1 2`) → **REBASED** onto main `3513e6f4` (disjoint surface, clean, 2 commits replayed). Digest regen 9→10 → `34418032`. F3: agent in-flight, PA alive → no delta-log write (see watch list).

## Currency snapshot (@ tick 4)

- **Board:** HIGH 0 · MED 14 · LOW 21 · Nominal 8.
- **maps:** watermark `60d547e1` — N commits behind HEAD but ALL docs/tooling-only (no `compiler/src`·`stdlib`·`.scrml` since the watermark), so CURRENT for compiler-source. WARN-only; PA wrap-6c sweeps it. NOT owed mid-session. (Watch: the e2e agent [10] WILL touch compiler/src — once it lands, maps become genuinely owed; flag at that tick.)
- **digest:** current (head `376f1d76`, delta-seq 10).
- **recent-sessions / gap-counts:** PASS.
- **flograph:** current (no gap-token changes since the S202 build).

## Function 3 — agent monitoring (LIVE)

Each tick: `git worktree list` + `.claude/worktrees/` for agent worktrees; scan the delta-log for `disp` without a matching `land`; read each in-flight agent's `progress.md` + branch tip. Maintain the In-flight watch list above. **Append a `(deputy) state` delta-log entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (the one narrow single-writer exception — observation-only) so the fresh PA re-attaches. NEVER land the work (substantive → PA-owned S67 file-delta). While the PA is alive, just track here.

## Sync rule (each tick)

`git merge --ff-only main`; **if it is NOT a clean FF** (deputy-maint diverged because the PA committed without integrating the deputy first), `git rebase main` — clean by construction on the disjoint surface; surface to the PA only if a rebase hits a real conflict (= a surface-partition breach). Rebasing rewrites the not-yet-merged deputy commit SHAs — harmless (no one depends on them pre-merge).

## Operational notes (for re-hydration)

- **node_modules:** a fresh worktree has NONE → the pre-commit gate can't resolve deps. Symlink main's in on (re)boot (survives FF + rebase):
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules`
  `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN after each command. Always `cd /home/bryan-maclee/scrmlMaster/scrml-deputy-maint` (or `git -C`) before worktree ops.
- **Untracked new file:** `git commit -- <path>` fails on an untracked file — `git add <path>` first. Tracked-file modifications commit by plain pathspec.
- **Commit gate:** pre-commit only WARNS on non-main branches; runs ~17k unit+integration+conformance (~80s); deputy commits are derived-only → always passes. Never `--no-verify`. `git rebase` does NOT run the gate (only `git commit` does). (Full-gate-on-derived friction raised tick 1; PA deferred a path-scoped gate-skip — run full gate until built.)

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` incremental on the session's changed source; watermark in `.claude/maps/primary.map.md` (`60d547e1`).
- `docs/changelog.md` — append/extend the current session block.
- `@generated` §0 rollup in `docs/known-gaps.md` + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1; regen per tick when a projected source moved; deputy-owned).
- flograph + dock projection — `scripts/flograph.ts`.
- block-lease registry — (not built yet).

## Cross-refs

- `scrml-support/vpa-scrml.md` — the deputy contract.
- `scrml-support/pa-scrml.md` §"S199 addendum — vPA deputy (PA side)" — the PA-side contract.
- `handOffs/delta-log.md` — the live PA-state stream.
- `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — the design.
