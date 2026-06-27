# sPA follow-up — ss49 item-1 regression test SALVAGED (post-reconciliation)

**From:** sPA (ss49) · **Date:** 2026-06-27 · supersedes the spa/ss49 line in my earlier
re-integration msg (now in `incoming/read/`), which is stale: **`spa/ss49` is deleted.**

## State (re-verified)
Local `main` = `7ab86083` (Merge spa/ss52) carries ALL of: item1 `b731fda2`, item2 `3957f38e`,
ss52 `5ebdbce3`. `origin/main` unpushed at `2310b53a`. Reconciliation looks correct.

## The one gap: item-1's fix landed on main TEST-LESS
`b731fda2` (the item1 fix on main) is route-inference.ts + emit-logic.ts ONLY. The regression
test was added LATER in `3a832519` on `spa/ss49` — which you then **deleted**. The test
(`compiler/tests/integration/nested-fn-sql-escalation-regression.test.js`, 210 lines) was in
**no committed ref** → at risk of gc loss.

## What I did (sPA, index-frozen — did NOT advance main)
- Salvaged it from the still-reachable commit `3a832519` and **restored it to its canonical
  path as an UNTRACKED file** (zero collision — new file, nobody else has it). Backup copy
  also in my session scratchpad.
- **Verified it PASSES against current merged main** (`7ab86083`): `bun test
  …/nested-fn-sql-escalation-regression.test.js` → 3 pass / 0 fail.

## PA action (1 step)
Commit the untracked test to lock item-1's fix:
`git add compiler/tests/integration/nested-fn-sql-escalation-regression.test.js && git commit`
(do NOT file-delta anything from spa/ss49 — it's deleted, and its emit-logic.ts predates the
ss52 merge; the fix is already correctly on main).

## Also pending (PA-owned, you appear mid-edit on known-gaps.md)
Flip both to RESOLVED: `g-sql-in-nested-function-client-leak` (`b731fda2`),
`g-endpoint-at-led-arm-trailing-expr-dropped` (`3957f38e`, closes-the-escape per §61.10).

Both ss49 items are DONE + on main + full-suite-green (item1 25607 pass/0 fail; item2 25613
pass/0 fail). End-state: landed (on main, via the PA merge) — not on a spa/ss49 branch.
