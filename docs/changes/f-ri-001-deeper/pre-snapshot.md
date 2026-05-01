# Pre-Snapshot — F-RI-001 deeper (W4)

Captured: 2026-04-30, before any code changes.

## Test baseline

```
bun test compiler/tests/
8361 pass / 40 skip / 0 fail / 398 files / 29077 expect() calls
```

Run from worktree root after `bun install` + `bun run pretest`.

## Branch
- Pre-rebase: `3dab098 docs(s50): close — fat wrap (4 tracks + 6-milestone dispatch app + 26+ findings)`
- Post-rebase: at main HEAD `5c35618 fix(f-sql-001): ?{} parser handles complex shapes; hard-error on unhandled`
- New branch: `changes/f-ri-001-deeper`

## E2E compilation state (dispatch-app pages with M2 workaround)

`examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` — compiles clean.
`examples/23-trucking-dispatch/pages/customer/load-detail.scrml` — compiles clean.
Both files preserve the M2 workaround verbatim:
- `@errorMessage = ""` before server call (acts as anchor)
- `setError(errMsg)` indirection instead of direct `@errorMessage = result.error`

Pre-W4 narrow regression suite: `compiler/tests/unit/route-inference-f-ri-001.test.js` — 7 tests added in S50 (boundary-security-fix scenarios). Per `docs/changes/f-ri-001/diagnosis.md`, these isolate single-server-fn shapes; they do NOT cover the multi-server-fn-in-same-file context that the dispatch app pages exercise.

## Source-of-truth pointers
- `docs/changes/f-ri-001/diagnosis.md` (S50 stale-friction triage; documents pre-W4 state)
- `docs/changes/f-ri-001/repro1-canonical.scrml` (passes — narrow Promise-chain pattern)
- `docs/changes/f-ri-001/repro4.scrml` (fails — F-CPS-001 architectural; OUT OF W4 SCOPE)
- `examples/23-trucking-dispatch/FRICTION.md` §F-RI-001 (PARTIAL marker)
- Deep-dive §4.5 (M5 root cause), §5.1 M5 fix strategy (B) piecemeal
- `compiler/src/route-inference.ts` (RI implementation)

## Pre-existing failures
None — full 8361p / 0f baseline.

## Tags
- pipeline-stage: RI
- error-code: E-RI-002
- friction-id: F-RI-001
- mechanism: M5 (file-context-dependent escalation)
- approach: deep-dive §5.1 (B) piecemeal — extend regression suite to dispatch-app shapes

## Links
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/docs/changes/f-ri-001/diagnosis.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/compiler/src/route-inference.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a41394a95344425f7/examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/systemic-silent-failure-sweep-2026-04-30.md`
