# Progress: fix-acorn-implicit-dep

- [start] Read intake.md — claim: "acorn is not declared as a dependency in any package.json"
- [investigate] Found acorn IS declared in compiler/package.json: `"acorn": "^8.16.0"`
- [investigate] Found acorn IS in bun.lock at version 8.16.0
- [investigate] Verified compiler/package.json has been declaring acorn since the initial split commit (44c1054)
- [verify clean install] Ran `bun install` in fresh worktree (no node_modules anywhere)
- [verify clean install] Confirmed `compiler/node_modules/acorn` resolves correctly post-install
- [verify tests] Ran `bun run test` (with pretest hook compile-test-samples)
- [verify tests] Result: 7670 pass / 40 skip / 0 fail / 362 files — matches baseline exactly
- [verify e2e] Compiled samples/compilation-tests/control-001-if-basic.scrml — succeeds (1 W-PROGRAM-001 warning, expected)
- [verify import surface] Confirmed only compiler/src/expression-parser.ts imports acorn; no consumers outside compiler/ workspace
- [decision] Intake premise is incorrect. No code/dep change is required.
- [decision] Writing CLEAR-NO-ACTION report and reporting back to user.

## Tags
#acorn #dependency #verification #no-action

## Links
- intake.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/compiler/package.json
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/bun.lock
