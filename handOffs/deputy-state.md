# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — the small file the
deputy re-boots off when its transcript grows (cheap + lossless because the deputy does projection,
not deliberation; see `scrml-support/vpa-scrml.md` §"Re-hydration"). **Deputy-owned** (write-surface
partition); the deputy maintains it on the `deputy-maint` branch. The PA reads it but does not edit it.

---

## Deputy status

- **State:** LIVE — steady-state (S205 active). First deputy instance, booted S203. On tick 30.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c`, `7,37 * * * *`. CronDelete `39fed15c` to cancel.
- **Last-absorbed delta seq:** S205 **[10]** (`scrml/handOffs/delta-log.md` — absorbed [S199 1] … [S205 10]).
- **`deputy-maint` branch:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`, descends main (PA integrates via the pre-push merge gate). **Tip:** `git rev-parse deputy-maint`.
- **Owed maintenance:** **MAPS refresh** (compiler-src `776e978a` emit-paren fix) — **batched** (see In-flight: 2 agents about to land more compiler-src/.scrml; one project-mapper run will cover all, vs 3× in 3 ticks). Else current.

## Standing facts (durable)

- **Merge-before-push gate (RESOLVED + ratified S205 [2]):** the PA asserts `git rev-list --count deputy-maint ^main == 0` before any push (pa.md S199 addendum + wrap step 7), closing the S203/S204 strand pattern. Fired in practice (`f07f8406`, `e14462a6` pre-push merges). The deputy's maintenance now reaches origin.
- **F1 dilation REALIZED (S205 [3]):** clean-cycle re-measure — digest booted current → F1 ~8.3k (was 0 in S204); total deputy dilation ~14-15k/cycle ≈ 1.5%/1M (S204 frame-corrected band holds). Deputy net-positive.
- **Maps mechanism (RESOLVED T12, user-ruled no-consent):** dispatch `project-mapper` into the deputy-maint worktree (CWD-pinned, worktree-only brief, NO isolation) + independently verify `git -C <main> status --porcelain -- .claude/maps/` EMPTY before committing.

## Graph/dock health (§3c — per-tick standing step, S205 [10])

- **Snapshot @ tick 30 (PASS, unchanged):** flograph 428n/103e (--with-support --with-archive) · currency-sweep **0 (clean — ouroboros catch holds)** · 14 unverified · 15 dangling · 0 dup · 0 err. dock --check PASS (0 malformed/dangling/superseded · 1 unverified). dock --coverage 0/628 (0.0%) · 0 orphans. **No NEW actionable finding.**
- **route to PA (open, tooling nit):** §3 says plain `flograph --emit` but §3c checks `--with-support --with-archive` → graph.json drifts to the 190n default and the check ERRORs every tick unless the deputy emits with the matching flags (it does). Align §3 emit flags with §3c, or make `--check` corpus-aware.

## In-flight dispatches (F3 watch list — PA alive, tracking only, no `(deputy)` entries)

- **`a3a475168766ceba8`** — trucking **slice-3 each-sweep** (for/lift→each across examples/23-trucking-dispatch). @ tick 30: tip `f15b6516 "final tally + BUG-1 report; whole-app compile EXIT 0, diagnostics identical to baseline"`, worktree clean → **looks COMPLETE, awaiting PA landing**. Edits `.scrml` corpus + surfaced BUG-1 (nested-quote ternary in per-item each attr; the `776e978a` emit fix may be the close). On landing → maps refresh (corpus) owed.
- **`a634857265ed2b578`** — **g-match-alternation-value-vs-derived** gap. @ tick 30: at base + staged `progress.md` → freshly dispatched, in-flight. Likely compiler/src on landing → maps owed.

## Tick log (compressed)

- **T1** boot [S199-S203]. **T2-T5** F1 LIVE + GO-LIVE + e2e/flograph slices. **T6-T8** reboot-gap — #3 agent in-flight across a PA reboot, bridged → fresh PA re-attached + LANDED (a6405053), zero loss.
- **T9-T11** S204 [1-6] — #3 landed; flograph slices; dilation measured ~3% (frame-conflation corrected). **T12** maps REFRESHED 60d547e1→cc765a5a (user ruling). **T13** 2nd merge-before-push miss flagged. **T14** PA caught up.
- **T15** S205 [1-6] — merge-before-push gate RATIFIED + F1 realized ~8.3k + dock built. *Lesson:* re-check delta-log AFTER sync (the oracle caught an absorb-miss). **T16-25** PA idle, 10 no-op ticks.
- **T26** S205 [7-9] — corpus deref (48 superseded DDs→archive/) + flograph --with-archive + flogeance harness-validation capstone; gate fired. **T27** S205 [10] — §3c guardrail wired; first health check (all PASS); routed the emit-flag tooling nit. **T28** no-op. **T29** F3: slice-3 agent dispatched (in-flight). **T30** emit fix `776e978a` (maps owed→batched); slice-3 looks complete + g-match-alternation dispatched (2 agents watched); digest regen; §3c green.

## Currency snapshot (@ tick 30)

- **Board:** HIGH 0 · (MED shifted by the `776e978a` g-emit-string-tree-paren-drop close; PA regen'd §0) · gap-counts + recent-sessions PASS.
- **maps:** watermark `cc765a5a` — STALE/OWED (the `776e978a` emit fix) — **batched** for the in-flight agent landings.
- **digest:** current (head `100cb381`, delta-seq S205 [10]).
- **flograph/dock:** §3c health PASS (snapshot above).

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-wt> log/status` for branch tip + dirty; scan delta-log for `disp` without `land`/`find`-close. **Append a `(deputy) state` entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting** (narrow single-writer exception — observation-only). NEVER land (PA S67 file-delta). Poll git-state (no reliable task-notification — goes to the dispatching PA).

## Sync rule (each tick)

`git merge --ff-only main`; if NOT clean FF → `git rebase main` (clean on the disjoint surface; real conflict = partition breach to surface). **Re-check delta-log + state.ts oracle AFTER syncing** (a pre-sync read can miss new entries — T15 lesson). Main may move/push mid-tick.

## Operational notes (for re-hydration)

- **node_modules:** fresh worktree has NONE → symlink main's in (survives FF+rebase): `ln -s /home/bryan-maclee/scrmlMaster/scrml/node_modules ./node_modules` · `ln -s /home/bryan-maclee/scrmlMaster/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN — `cd` the worktree (or `git -C`) before worktree ops.
- **Untracked new file:** `git add` before commit; tracked modifications commit by plain pathspec. `docs/graph/` is gitignored (on-demand projection — not committed).
- **Digest cadence:** regen only when a projected source (known-gaps/delta-log/maps/version) moved — NOT every tick (source-based freshness makes a no-op stamp-bump pointless; discard it).
- **Commit gate:** pre-commit WARNS on non-main; runs ~17k subset (~75-120s); deputy commits derived-only → pass; never `--no-verify`. `git rebase` does NOT run the gate.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark `.claude/maps/primary.map.md` (`cc765a5a`).
- `docs/changelog.md` — session block. · `@generated` §0 rollup (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1).
- flograph `scripts/flograph.ts` (--emit/--check) · dock `scripts/dock.ts` (PA-built; deputy runs §3c checks) · block-lease registry (a new DD landed; not built).

## Cross-refs

- `scrml-support/vpa-scrml.md` — deputy contract (boot, partition, commit, re-hydration, §3 steady-state + §3c health). · `scrml-support/pa-scrml.md` §"S199 addendum" — PA-side (+ merge-before-push gate + wrap step 7).
- `handOffs/delta-log.md` — the live PA-state stream. · `scrml-support/docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — design (+ S204/S205 measurement addenda).
