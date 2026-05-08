# Pre-snapshot — server-keyword-deprecation-batch-2

**Date:** 2026-05-08
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-aed4eeafff5ce2a94`
**Branch:** `worktree-agent-aed4eeafff5ce2a94`
**Base SHA:** `479ec1a` (post-Batch-1 SHIP `ea0ee5b` + master-list amendments)

## Test baseline (verified)

```
9822 pass
64 skip
1 todo
3 fail
```

The 3 pre-existing fails (out-of-scope, preserved):

1. `F-BUILD-002 §3: generated entry parses without SyntaxError > write entry to a temp file and verify \`node --check\` accepts it`
2. `Bootstrap L3: self-hosted API compiles compiler > (unnamed)`
3. `Self-host: tokenizer parity > compiled tab.js exists`

All three are self-host parity / build-bootstrap fails carried since before Batch 1.

## Spec state (relevant sections)

- **§8.4** (Conditional WHERE — Null-Coalescing Pattern) — exists, lines 5470–5530. Insertion point for D2 fragment-reuse paragraph: after the existing `Worked example — invalid (dynamic SQL construction — not supported)` block, immediately before §8.5 begins at line 5531.
- **§11** (State Objects and `protect=`) — folded; content distributed to §6.12 and §52. No `server function` content remains in §11 to amend; the §11.4 references in Insight 26's amendment list resolve to **§52.10** (which IS the canonical home of `server function` interaction post-fold).
- **§12.2** (Escalation Triggers) — lines 6267–6276; lists 4 triggers. Trigger 4 is "explicit `server` annotation". D1e adds Trigger 5 (caller-context propagation) and Trigger 6 (dead-code unreached-warn).
- **§34** (Error Codes) — lines 14002+. **W-DEPRECATED-SERVER-MODIFIER** does NOT yet appear in the table (Batch 1 implemented the diagnostic in `route-inference.ts` but did not add the spec entry; this batch adds it).
- **§47.10** (Relative Import Path Rewrites) — UNRELATED to `server function`. Insight 26's amendment list cited "§47.10" in error; the surface that needs amendment is in **§13** (Async Model — server function composition), in **§37** (SSE Generators), and **§52.10**. We treat the brief's "§47.10" as a typo and amend §52.10 + §13 prose where `server function` is described as required/canonical.
- **§52.10** (Interaction with `server function` (§11.4)) — lines 23352–23362. The current text describes the syntactic distinction between `server function` and `server @var`. D1c adds the deprecation note here.

## Stdlib state (relevant for D3)

`grep -rEn "^[[:space:]]+server[[:space:]]*\{" /home/bryan/scrmlMaster/scrmlTS/stdlib/` returns **36 matches** across:

- `stdlib/auth/password.scrml` — 2 sites (lines 26, 45)
- `stdlib/auth/jwt.scrml` — 2 sites (lines 56, 100)
- `stdlib/auth/index.scrml` — 3 sites (lines 107, 149, 168)
- `stdlib/oauth/pkce.scrml` — 2 sites (lines 33, 63)
- `stdlib/fs/index.scrml` — 7 sites
- `stdlib/path/index.scrml` — 7 sites
- `stdlib/process/index.scrml` — 7 sites
- `stdlib/crypto/index.scrml` — 6 sites (one wraps `safeCompare` — D3b reclassification target)

All 36 are decorative `server { body }` wraps inside `function` bodies. The compiler does NOT lower `server { }` blocks at TS time today (per `compiler/src/api.js:51`). Stdlib runtime resolution is via hand-written ES module shims at `compiler/runtime/stdlib/*.js` — those are unaffected by this cleanup.

## Behavioral baseline

- `bun run pretest` passes. 12 compilation-test samples compile clean (with various warnings — none flagged as regressions).
- W-DEPRECATED-SERVER-MODIFIER fires from Batch 1 across stdlib + examples. After D3 cleanup, stdlib fires drop to 0; examples remain (~6 fires from contact-book / admin-dashboard / state-authority — adopter migration territory).

## Tags

`#pre-snapshot` `#server-keyword-deprecation` `#batch-2` `#insight-26` `#insight-27` `#spec-amendment` `#stdlib-cleanup`

## Links

- `/home/bryan/scrmlMaster/scrml-support/design-insights.md` — Insight 26 + Insight 27
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/server-keyword-inference-disposition-2026-05-08.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/stdlib-empty-body-audit-2026-05-08.md`
- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` §8.4 / §12.2 / §34 / §52.10
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/route-inference.ts:1811` (Trigger 5) / `:2094` (D5)
