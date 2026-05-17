# Progress: combined-lint-additions-s98

Worktree: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-afccf9a7ac1b3d0cd`
Branch: `worktree-agent-afccf9a7ac1b3d0cd`
Start: 3f27a6c

## Pre-snapshot

### W-PROGRAM-001 baseline counts (pre-fix)
- `docs/website/` directory compile: 17 fires (all 17 `pages/**/*.scrml` are `<page>` files)
- `examples/23-trucking-dispatch/` directory compile: 24 fires
  - 20 from `<page>` files in `pages/**/*.scrml`
  - 4 from other module-shape files (`schema.scrml`, `seeds.scrml`, ... — pure-module shape that doesn't currently match the Bug 6B `isPureModuleFile` predicate)
  - integration baseline in `trucking-dispatch-smoke-integration.test.js` is `W-PROGRAM-001: 24`

### Test baseline (pre-fix)
- `bun test`: 15085 pass / 1 fail (Bug 18 browser smoke — orthogonal pre-existing fail).

## Item 1 (DONE) — W-PROGRAM-001 false-positive fix

- `compiler/src/ast-builder.js` — added `isNonEntryPageFile` suppression: a file
  with a top-level `<page>` markup node is recognized as a non-entry page per
  SPEC §40.8 and W-PROGRAM-001 is suppressed.
- `compiler/tests/integration/trucking-dispatch-smoke-integration.test.js` —
  baseline updated 24 → 4 (20 page-file false-positives suppressed; aggregate
  warnings 87 → 67); doc-block + adjacent comment refreshed.
- `compiler/tests/unit/bs-layer-corpus-friction-bugs.test.js` — appended new
  `S98 Item 1` describe block with 6 regression tests covering all cases per
  the brief (canonical `<page>`; per-route attrs; bare logic body; leading
  line-comments; orphan still fires; entry-file `<program>` still suppresses).

### Verified deltas (post-fix vs pre-fix)
- `docs/website/`: 17 → 0 W-PROGRAM-001 fires.
- `examples/23-trucking-dispatch/`: 24 → 4 W-PROGRAM-001 fires.

### Tests
- `compiler/tests/unit/bs-layer-corpus-friction-bugs.test.js`: 24 pass (was 18).
- `compiler/tests/integration/trucking-dispatch-smoke-integration.test.js`: 13 pass.
- Other tests referencing W-PROGRAM-001 (9 files, 200 tests): all pass.

## Item 2 (DONE) — W-LINT-024 Svelte `$store` auto-subscribe

- `compiler/src/lint-ghost-patterns.js` — appended Pattern 28 `W-LINT-024`
  matching `$ident` inside `${...}` markup-interp slot (approach (a)).
- `compiler/tests/unit/lint-ghost-patterns.test.js` — appended `W-LINT-024`
  regression test suite with 5 cases per the brief.

## Item 3 (SKIPPED — per brief) — §34 catalog row for W-LINT-024

Brief instruction (verbatim): "Add to W-LINT-* catalog in §34 if there's a §34 row
for the W-LINT-* family already (check by grepping §34 in SPEC.md for W-LINT-023;
if a numbered row exists, add 024)."

Grep result: W-LINT-001..015 ARE in §34. W-LINT-016..023 are NOT in §34 (8-row
catalog drift since the S97 W-LINT-016..023 wave landed; cross-ref the S97 close
commits b855d0d, 184c011, 12e2881 — none touched §34). Per the brief's
conditional, W-LINT-024 is NOT added to §34 in this PR; adding 024 alone would
codify the partial-catalog drift.

ANOMALY (surfaced to PA): the W-LINT-016..024 (9 codes) §34 catalog backfill
is owed work. Recommended: a dedicated dispatch that backfills all 9 rows in
one commit rather than continuing to drift further.

## Final bun test
- Pre-fix:  15085 pass / 1 fail (Bug 18 browser smoke — orthogonal pre-existing).
- Post-fix: 15107 pass / 1 fail (Bug 18 — unchanged orthogonal).
- Delta: +22 new passing tests (6 from S98 Item 1 + 16 from S98 Item 2). No regressions.
- Browser-smoke `bun test` summary line fluctuates (1-3 fails per run) due to
  Playwright/happy-dom non-determinism; the deterministic failure list is always
  exactly `Bug 18 ... browser-runtime smoke`.

## Commits
- [DONE] Item 1 fix + tests — `31829e2 fix(lint): W-PROGRAM-001 — suppress on non-entry <page> files (SPEC §40.8)`
- [DONE] Item 2 lint + tests — `628f40c feat(lint): W-LINT-024 — Svelte $store auto-subscribe inside ${...} markup-interp`
- [SKIPPED] Item 3 §34 catalog row — see ANOMALY note above (W-LINT-016..023 already drift; not codifying further)
- [next] progress.md final update commit
