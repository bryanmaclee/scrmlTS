# scrml — deputy state (re-hydration anchor)

**Created S203 (2026-06-17).** The vPA deputy's durable re-hydration anchor — re-boot off this file
when the transcript grows (cheap + lossless: projection, not deliberation; `scrml-support/vpa-scrml.md`
§"Re-hydration"). **Deputy-owned** (write-surface partition); maintained on the `deputy-maint` branch.

---

## Deputy status

- **State:** LIVE — steady-state. S205 WRAPPED (74d7d0e2); 3 agents deferred to F3. First deputy instance, booted S203. On tick 34.
- **Self-poke loop:** `/loop 30m` — cron job `39fed15c` (`7,37 * * * *`). CronDelete to cancel.
- **Last-absorbed delta seq:** S205 **[21]** (PA-source; the deputy appended F3 entry **[22]** itself).
- **`deputy-maint`:** worktree `/home/bryan-maclee/scrmlMaster/scrml-deputy-maint`, descends main (PA integrates via the merge-before-push gate). **Tip:** `git rev-parse deputy-maint`.
- **Owed maintenance:** none. (digest current — PA wrap-regen 74d7d0e2; recent-sessions regen'd this tick; maps current.)

## PA↔vPA protocol — ACK + HEARTBEAT (S205 [19] ratification — record each tick)

- **heartbeat:** tick **T34** · last-absorbed **[S205 21]** · deputy-maint tip = this commit (`git rev-parse deputy-maint`).
- **ACK (vpa:) [S205 10]** → re-read §3c; run flograph/dock --check + record health each tick (standing since T27).
- **ACK (vpa:) [S205 19]** → adopted the ACK+heartbeat block (this tick T34); recording each tick going forward.
- **ACK (F3 defer, wrap [21]) → DONE:** monitored the 3 deferred agents; **RESOLVED [20]'s block-splitter "CHECK status"** — appended delta-log **[22]** confirming `ab4fe40551c515110` COMPLETE @ `d67534d8`. All 3 deferred agents now confirmed done for the next-session landing.

## Standing facts (durable)

- **Merge-before-push gate (RATIFIED S205 [15]):** PA asserts `deputy-maint ^main == 0` before any push (pa.md S199 + wrap step 7). Working — my T32 maps + T33 integrated at the S205 wrap.
- **S42 WRAP-THINNING (ratified S205 [19]):** the wrap now REFERENCES digest/delta-log/deputy-state for mechanical content (deputy-enabled). The S205 wrap was the first thinned one.
- **F1 dilation REALIZED (S205 [3]/[17]):** F1 ~8.3k (was 0 in S204); total ~14-15k/cycle ≈ 1.5%/1M. Net-positive.
- **Maps mechanism (T12, user no-consent) + cadence:** `project-mapper` into the worktree (CWD-pinned, worktree-only brief, NO isolation) + verify `git -C <main> status --porcelain -- .claude/maps/` EMPTY before commit. BATCH compiler-src/.scrml changes into one run (each ~110-130k sub-agent tokens; PA-window saving ~6-7k → minimize invocations). T12 + T32 ran clean.

## Graph/dock health (§3c — per-tick standing step)

- **Snapshot @ tick 34 (PASS):** flograph 428n/103e+ · currency-sweep **0 (clean)** · 17 unverified · 19 dangling · 0 dup · 0 err. dock --check PASS · coverage 0/628 (0.0%) · 0 orphans. dangling/unverified grew (new S205 docs: harness capstone + PA-vPA-protocol DD, asserted-not-verified) — benign, **no NEW finding**.
- **route to PA (open nit):** §3 plain `flograph --emit` vs §3c `--check --with-support --with-archive` → graph.json drifts to 190n default; deputy emits with matching flags. Align §3 with §3c.

## In-flight dispatches (F3 watch list)

- **3 S205-deferred agents — ALL CONFIRMED DONE, awaiting next-session landing (S67 file-delta):** `aeca43607dd011a51` slice2 decl-coupled-validators (`5e39ab89` — needs within-node re-baseline + compound-field-rbt BUG file at landing) · `af5ed82479580631c` g-engine-autodecl (`ca43c723`) · `ab4fe40551c515110` g-colon-shorthand (`d67534d8` — deputy-confirmed, delta-log [22]). Worktrees retained (wrap deferred 6b-cleanup).
- LANDED earlier S205: slice-3 (f4fae410) · g-match (9a7bc3a5).

## Tick log (compressed)

- **T1-T8** boot + F1/GO-LIVE + reboot-gap (#3 bridged → re-attached+LANDED, zero loss).
- **T9-T14** S204 [1-6]; maps REFRESHED 60d547e1→cc765a5a; merge-before-push misses flagged → PA caught up.
- **T15** S205 [1-6] gate RATIFIED + F1 realized + dock built. **T16-25** PA idle (10 no-ops).
- **T26** S205 [7-9] (deref + flograph --with-archive + harness capstone). **T27** §3c wired. **T28** no-op. **T29-31** trucking burst (slice-3+g-match dispatched→LANDED; maps batched). **T32** maps REFRESHED cc765a5a→492b4bb9 (3-change batch). **T33** 5-agent watch; maps batch-2 held.
- **T34** S205 WRAPPED — absorbed [11-21]; adopted ACK+heartbeat ([19]); F3-recorded block-splitter [22] (resolved [20] CHECK-status); recent-sessions regen (wrap anchor); §3c PASS. 3 agents deferred → next session lands.

## Currency snapshot (@ tick 34)

- **Board:** HIGH 0 · MED 10 (S205 closed 3 MED) · gap-counts + recent-sessions PASS.
- **maps:** watermark `492b4bb9` — current for compiler-src (no new since; S205 deferred-agent fixes land next session → 2nd batch then).
- **digest:** current (head `74d7d0e2`, PA wrap-regen).
- **flograph/dock:** §3c PASS (snapshot above).

## Function 3 — agent monitoring (LIVE)

Each tick: `ls .claude/worktrees/` + `git -C <agent-wt> log/status`; scan delta-log for `disp` without `land`/`find`-close. **Append a `(deputy) state` entry ONLY when** an agent COMPLETED **and the PA is absent/rebooting/deferred-to-F3** (narrow single-writer exception — observation-only). NEVER land (PA S67 file-delta). Poll git-state.

## Sync rule (each tick)

`git merge --ff-only main`; if NOT clean FF → `git rebase main`. **Re-check delta-log + state.ts oracle AFTER syncing** (T15 lesson). Main may move/push mid-tick.

## Operational notes (for re-hydration)

- **node_modules:** symlink main's in (survives FF+rebase): `ln -s …/scrml/node_modules ./node_modules` · `…/scrml/compiler/node_modules ./compiler/node_modules`
- **CWD slip:** Bash CWD resets to MAIN — `cd` the worktree (or `git -C`) before ops.
- **Untracked new file:** `git add` first; `docs/graph/` gitignored. **Digest cadence:** regen only when a projected source moved.
- **perl edits:** use `{}` delimiters or escape `/`; heredoc-rewrite is the reliable fallback. **delta-log edits:** use python (backticks break the shell).
- **Commit gate:** pre-commit WARNS on non-main; ~17k subset (~75-120s); deputy commits derived-only → pass; never `--no-verify`.

## Maintenance seams (Function 2)

- `.claude/maps/*` — `project-mapper` into the worktree + main-clean verify; watermark (`492b4bb9`).
- `docs/changelog.md` · `@generated` §0 (`docs/known-gaps.md`) + `master-list.md` §0.6 — `bun scripts/state.ts --write` (gate `--check`).
- `handOffs/digest.md` — `bun scripts/state.ts --digest` (F1). · flograph `scripts/flograph.ts` · dock `scripts/dock.ts` (§3c) · block-lease (DD landed; not built).

## Cross-refs

- `scrml-support/vpa-scrml.md` — contract (§3 + §3c + §steady-state S205 ACK+heartbeat). · `pa-scrml.md` §"S199 addendum" — PA-side (+ gate, ACK/heartbeat read at boot+integration).
- `handOffs/delta-log.md` — live stream. · `docs/deep-dives/vpa-deputy-reframe-2026-06-17.md` — design. · `pa-vpa-communication-protocol-2026-06-18.md` — the ACK/heartbeat DD.
