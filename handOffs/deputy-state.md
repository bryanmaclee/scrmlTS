# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — steady-state (S204 wrapped, push-pending). First deputy instance, booted S203. On tick 12.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c`, `7,37 * * * *`. CronDelete `39fed15c` to cancel.
- **Last-absorbed delta seq:** S204 **[8]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S204 8]).
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`. Base rebased onto main `e723de04` (the S204 wrap-finalize HEAD; tick 12). **Tip:** `git rev-parse deputy-maint` (tick-12: maps refresh `e8db1593`→rebased + recent-sessions/digest regen + this).
- **Owed maintenance:** none. **Maps NOW REFRESHED** (was the standing owed item).

## ⚠ ACTION FOR THE PA — merge deputy-maint before pushing S204 (avoidable maps-miss)

The S204 wrap (`d64d4519`) merged deputy-maint at `cc765a5a` (OLD maps `60d547e1`) and did NOT run maps-6c → **main's maps shipped STALE.** The deputy then refreshed them (watermark `60d547e1`→`cc765a5a`, the #3 `E-CONTROL-FLOW-IN-MARKUP` source change) — they're on deputy-maint, NOT in the wrap merge. **The S204 wrap is push-PENDING (not yet pushed).** So: **`git merge deputy-maint` AGAIN, then push** → origin gets the current maps + the re-regen'd recent-sessions/digest. Clean FF (disjoint: deputy touched only `.claude/maps/` + `@generated` blocks + `digest.md`; the PA's wrap touched code/spec/flograph/prose). If pushed without this merge, origin ships S204 with stale maps (same class as the S203 digest-miss). **This is the merge-before-push lesson, live.**

## Maps mechanism — RESOLVED (S204, user ruling)

User: *"refresh the maps, this does not require my consent."* Maps refresh is Function-2 maintenance, NOT a design call — the deputy just does it. **Mechanism that worked + is now the standard:** dispatch `project-mapper` (Agent tool, NO isolation — operate IN deputy-maint) with a strict worktree-only-path brief (`cd` the worktree first; absolute worktree paths; never touch/`cd`/commit in the main checkout; don't commit — leave modified for the deputy) + **independent post-dispatch verify** `git -C <main> status --porcelain -- .claude/maps/` is EMPTY (no leak) before committing. First run (tick 12): main maps verified untouched; 3 maps refreshed (primary/structure/error); committed explicit-pathspec.

## In-flight dispatches (F3 watch list)

- _(empty)_ — `af88c53a` landed (#3); `abcf64f7` closed tick 5. The tick-12 `project-mapper` was a DEPUTY-initiated maintenance dispatch (not a PA agent to monitor), completed + verified inline.

## Tick log (compressed)

T1 boot [1-5]; T2 [6-7] F1; T3 [8-9] GO-LIVE; T4 [10]; T5 [11-13]; **T6-T7 reboot-gap** (#3 in-flight bridged); **T8 gap-CLOSED**; **T9** S204 [1-3] (#3 LANDED); **T10** [4-5] flograph slices; **T11** [6] DILATION measured ~3% (not 7-10%, frame-conflation fixed); **T12** maps REFRESHED (user ruling; project-mapper into worktree, main-clean verified; watermark→cc765a5a) + absorbed [7-8] (S204 wrapped, push-pending); recent-sessions/digest regen.

## Currency snapshot (@ tick 12)

- **Board:** HIGH 0 · MED 12 · LOW 23 · Nominal 8.
- **maps:** watermark **`cc765a5a`** (REFRESHED tick 12) — CURRENT for compiler-source (no compiler-source since). On deputy-maint; NOT yet in main (see ACTION above).
- **digest:** current (head `bf7c8759`, delta-seq 8).
- **recent-sessions / gap-counts:** PASS.
- **flograph:** slices 1-3 landed (corpus-annotation + supersession/currency layer); `--mmd`/`--filter`/`--focus`.

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-wt> log/status`; scan delta-log for `disp` without `land`/`find`-close. **Append a `(deputy) state` delta-log entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (narrow single-writer exception — observation-only). NEVER land (PA S67 file-delta). Poll git-state.

## Sync rule (each tick)

`git merge --ff-only main`; if NOT clean FF → `git rebase main` (clean on the disjoint surface; a real conflict = partition breach to surface). Main may move/push mid-tick — absorb up to the HEAD seen at tick start.

## Operational notes (for re-hydration)

- **node_modules:** fresh worktree has NONE → symlink main's in (survives FF+rebase): `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` · `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN — `cd` the worktree (or `git -C`) before worktree ops.
- **Untracked new file:** `git add` before commit; tracked modifications commit by plain pathspec.
- **Maps refresh:** project-mapper into the worktree + main-clean verify (see "Maps mechanism" above).
- **Commit gate:** pre-commit WARNS on non-main; runs ~17k subset (~75-120s); deputy commits derived-only → pass; never `--no-verify`. `git rebase` does NOT run the gate.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` incremental into the worktree (mechanism resolved tick 12); watermark `.claude/maps/primary.map.md` (`cc765a5a`).
- `docs/changelog.md` — session block. · `@generated` §0 rollup (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1; per tick when a projected source moved — incl. a maps refresh, which stales the digest's maps line).
- flograph — `scripts/flograph.ts`. · block-lease registry — (not built yet).

## Cross-refs

- `scrml-support/vpa-scrml.md` — deputy contract. · `scrml-support/pa-scrml.md` §"S199 addendum" — PA-side contract.
- `handOffs/delta-log.md` — the live PA-state stream. · `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — design.
