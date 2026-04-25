# Progress: fix-acorn-implicit-dep

## Round 1 — investigation (2026-04-24, agent-a55e320d155fd930e)

- [start] Read intake.md — claim: "acorn is not declared as a dependency in any package.json"
- [investigate] Found acorn IS declared in compiler/package.json: `"acorn": "^8.16.0"`
- [investigate] Found acorn IS in bun.lock at version 8.16.0
- [investigate] Verified compiler/package.json has been declaring acorn since the initial split commit (44c1054)
- [verify clean install] Ran `bun install` in fresh worktree (no node_modules anywhere)
- [verify clean install] Confirmed `compiler/node_modules/acorn` resolves correctly post-install
- [verify tests] Ran `bun run test` (with pretest hook compile-test-samples)
- [verify tests] Result: 7670 pass / 40 skip / 0 fail / 362 files — matched baseline at the time
- [verify e2e] Compiled samples/compilation-tests/control-001-if-basic.scrml — succeeded
- [verify import surface] Confirmed only compiler/src/expression-parser.ts imports acorn; no consumers outside compiler/ workspace
- [decision] Intake premise is incorrect. No code/dep change is required.
- [closure] Wrote anomaly-report.md (false-positive). Committed as `b432816`.

## Round 2 — re-confirmation under cleanups bundle (2026-04-25, agent-ab884e60ece40d220)

User requested re-investigation as part of a T1 cleanups bundle. Re-verified:

- [verify dependency] `compiler/package.json` line 9 still declares `"acorn": "^8.16.0"`. No change needed.
- [verify clean install] Fresh worktree had zero node_modules. `bun install` completed (224 packages, no errors). `compiler/node_modules/acorn` exists and resolves.
- [verify import resolution] `bun -e 'import("acorn")...'` from `compiler/` cwd resolves acorn 8.16.0. From the root cwd it does NOT — but no caller imports acorn from the root, so this is correct workspace behavior, not a bug.
- [verify tests] `bun run test` (includes pretest sample-compile hook): **7825 pass / 40 skip / 0 fail / 370 files** — exact match to current baseline at `205602d`.
- [verify reproducer] `bun test compiler/tests/unit/sql-params.test.js` from worktree root after clean install — 36 pass / 0 fail. The intake's reproducer (which expected an "error importing acorn") does NOT reproduce.
- [decision] Confirmed Round 1 finding. No further action.

## Status

**CLOSED — false-positive.** Both investigation rounds (separated by ~1 day) reached the same conclusion: acorn is properly declared in `compiler/package.json`, the workspace install resolves it correctly, and the test baseline holds. The parallel-sites agent that originally surfaced this likely had a transient local node_modules anomaly, not a real package.json bug.

The intake stays in the dir as historical context but should be regarded as resolved.

## Tags

#acorn #dependency #verification #no-action #closed #false-positive

## Links

- /home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/fix-acorn-implicit-dep/intake.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/fix-acorn-implicit-dep/anomaly-report.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/compiler/package.json
- /home/bryan-maclee/scrmlMaster/scrmlTS/bun.lock
- Round 1 closure commit: `b432816`
