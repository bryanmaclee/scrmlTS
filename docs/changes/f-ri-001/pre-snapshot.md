# Pre-snapshot — F-RI-001

Captured BEFORE any code changes. Records baseline behavior so anomaly
analysis can distinguish expected fixes from regressions.

## Branch

- Worktree HEAD before reset: `a70c6aa`
- Reset to current main: `1a9a011` (matches `/home/bryan-maclee/scrmlMaster/scrmlTS` main)
- Working branch: `changes/f-ri-001`

## Test baseline

- `bun test compiler/tests/` from worktree root after `bun install` + `bash scripts/compile-test-samples.sh`:
  - **8165 pass / 40 skip / 0 fail across 384 files** (matches dispatch-stated M2 baseline)
  - 28691 expect() calls
  - Wall: ~13.45s
- ECONNREFUSED noise in trailing output is from a network-touching test that has no fail
  assertion and is benign for these purposes.

## Repro confirmation

The original F-RI-001 pattern (without the workaround) is:

```scrml
function transition(target) {
    const tok = getSessionToken()
    const result = transitionStatusServer(tok, @load.id, target)
    if (result.unauthorized) {
        window.location.href = "/login?reason=unauthorized"
        return
    }
    if (result.error) {
        @errorMessage = result.error
        return
    }
    refresh()
}
```

This is expected to compile clean — `transition` calls a server fn,
awaits the result, branches on the return, and assigns `@errorMessage`
on the error path. Per `route-inference.ts` lines 34–40 doc, this
function has NO direct server triggers (no SQL, no protected fields,
no server-only resources, no `server` annotation), only a callee
into the server fn. The "transitively-escalated only" suppression
case (b) for E-RI-002 should apply.

## Per-tier obligations

- T2 (multi-file scope possible — at minimum `route-inference.ts` and
  a new test file). If decomposition expands to 3+ files, escalate to T3.
- Pre-snapshot ✓ (this file)
- Anomaly report required after fix.

## Tags

- pipeline-stage: RI
- error-code: E-RI-002
- friction-id: F-RI-001
- tier: T2

## Links

- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/examples/23-trucking-dispatch/FRICTION.md` (entry F-RI-001 at L353)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/compiler/src/route-inference.ts` (E-RI-002 doc L34–40, emission L1567)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` (load-detail with workaround)
