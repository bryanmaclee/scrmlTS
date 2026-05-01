# Pre-snapshot — W2 (F-COMPONENT-001 architectural fix)

**Date:** 2026-04-30 (S51 W2 dispatch)
**Branch:** `worktree-agent-af177eb4254624be0` (rebased onto main `8dddd27`)
**Authorization:** PA dispatch with all 6 OQ defaults from deep-dive (`f-component-001-architectural-2026-04-30.md`).

## Test counts (worktree, pre-W2, after `bun install` + `bun run test` with `pretest` precompile)

```
8280 pass
40 skip
0 fail
28929 expect() calls
Ran 8320 tests across 392 files. [9.02s]
```

This MATCHES the briefed baseline.

## E2E pre-fix verification of the canonical fixture

`bun run compiler/src/cli.js compile examples/22-multifile/app.scrml -o /tmp/22-out-pre` →
**FAILED — 1 error**: `E-COMPONENT-035` (UserBadge survived CE).

`bun run compiler/src/cli.js compile examples/22-multifile/ -o /tmp/22-out-dir` →
**FAILED — 1 error**: `E-COMPONENT-035` (UserBadge survived CE).

Both invocations fire VP-2 because:
- single-file: F3 missing — only `app.scrml` is in `tabResults`; F2 lookup misses raw `'./components.scrml'`.
- directory: F2 missing — `scanDirectory` gathers all 3 `.scrml` files but CE looks up `imp.source` (raw `'./components.scrml'`) instead of absolute path; lookup misses.

Both compositions confirm F2 is load-bearing. The directory invocation isolates F2 (F3 already gathered the files). The single-file invocation requires F3 (gather) + F2 (canonical key) to compose.

## Confirmed F1/F2/F3 line citations (against current source post-W1)

- **F1 — CE recursion gate:** `compiler/src/component-expander.ts` lines 1452-1470 (`hasAnyComponentRefsInLogic`). Verified — does NOT recurse into `liftMarkup.children`.
- **F2 — Registry-key mismatch:** `compiler/src/component-expander.ts` lines 1499-1543. Verified — looks up `imp.source` (raw) instead of `imp.absSource` (absolute).
- **F3 — CLI gathering gap:** `compiler/src/commands/compile.js` lines 122-152 (parseArgs); `compiler/src/api.js` lines 67-86 (scanDirectory). Verified — never traverses imports.

LSP precedent (`lsp/workspace.js:5-7`): `Map<absPath, ...>` triple. CE is the outlier among 4 internal consumers (CE, MOD validateImports, TS-pass at `api.js:626-660`, LSP) — 3 of 4 already do canonical-key correctly.

## Plan B disposition (pre-W2)

- `master-list.md` row 99: `[x][❌]` for `examples/22-multifile/`.
- Kickstarter v1 multi-file section: KNOWN-BROKEN flag.
- FRICTION.md §F-COMPONENT-001: PARTIALLY-CLOSED-BY-W1 (silent window closed; architectural gap remains).

## Scope reminders (from W2 dispatch brief)

- Approach B + B2-b (CE consumes `importGraph` directly).
- 6 OQ defaults: `.scrml`-only gather, sane-limit guard ON, `--no-gather` opt-out ON, no F-COMPONENT-002 fold-in, no W2-FOLLOW dispatch app refactor, no edition gate.
- Sibling W3.1+W3.2 running concurrently — DO NOT touch `gauntlet-phase3-eq-checks.js` or null-detection paths.
- Test discipline (M17 closure): NEW integration tests under `compiler/tests/integration/` that compile real `examples/22-multifile/` end-to-end and diff emitted JS shape (not the M17-masking unit-test pattern).
