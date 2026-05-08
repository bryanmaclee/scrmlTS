# Pre-snapshot: server-keyword-deprecation-batch-1-2026-05-08

## Worktree state
- `WORKTREE_ROOT`: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a130438a3e4fefa63`
- `AGENT_BRANCH`: `worktree-agent-a130438a3e4fefa63`
- Worktree base after ff-merge: `33ac96e` (feat(c2): SHIP — derived-cell reactive computation emission)

## Test baseline (post-pretest, before any change)

Two consecutive runs:

| Run | pass | skip | todo | fail |
|-----|------|------|------|------|
| 1   | 9783 | 64   | 1    | 5    |
| 2   | 9784 | 64   | 1    | 3    |

The 2-fail differential between runs is a network-flake (`Network ( 500 )`) in
`integration` tests not under this dispatch's purview. The structural baseline is
**9784 / 64 / 1 / 3** (matches dispatch baseline 9785/64/1/3 within ±1 pass-count drift).

The 3 fails are documented self-host parity tests, pre-existing and out-of-scope:
- `(fail) F-BUILD-002 §3: generated entry parses without SyntaxError > write entry to a temp file and verify 'node --check' accepts it`
- `(fail) Bootstrap L3: self-hosted API compiles compiler > (unnamed)`
- `(fail) Self-host: tokenizer parity > compiled tab.js exists`

## E2E compilation baseline
12 test samples compile clean via `bun run pretest`.

## Pre-existing files relevant to this batch
- `compiler/src/route-inference.ts` (1962 lines) — primary surface
- `compiler/src/route-inference.ts:215-248` — current `SERVER_ONLY_PATTERNS` regex set (~16 patterns)
- `compiler/src/route-inference.ts:258-263` — current `SERVER_ONLY_SCRML_MODULES` set (4 entries: scrml:crypto, scrml:auth, scrml:data, scrml:http)
- `compiler/src/route-inference.ts:1023-1040` — `buildImportedServerFnNames` (recognizes scrml: imports only)
- `compiler/src/route-inference.ts:1448-1455` — Trigger 4 (explicit `server` annotation)
- `compiler/src/route-inference.ts:1487-1511` — Step 4: direct-only escalation (extension surface for D3)

## Existing tests that exercise this surface
- `compiler/tests/unit/route-inference.test.js` — primary test file (2400+ lines)
- §5 (lines 515-643) — server-only resource access tests
- §6 (direct-only escalation), §7 (multi-hop), §8 (cycle detection)

## Stdlib modules confirmed server-only (D1)
All 5 candidates verified by `index.scrml` headers:
- `scrml:redis` — wrapper over `Bun.redis`, "server-side only" stated explicitly
- `scrml:fs` — Node/Bun fs APIs, "server-side only"
- `scrml:process` — Node/Bun process APIs, "server-side only"
- `scrml:cron` — wrapper over `Bun.cron`, "server-side only"
- `scrml:oauth` — OAuth client, "SERVER-SIDE ONLY"

None are ambient.

## Diagnostics emission pattern
- RI emits diagnostics via the `RIError` class (route-inference.ts:184) with
  optional `severity: "error" | "warning"` field.
- Existing precedent for warnings in RI: `W-AUTH-001` (lines 1779-1788) for
  auth middleware auto-injection.
- W-DEPRECATED-SERVER-MODIFIER and W-DEAD-FUNCTION will follow this pattern.
