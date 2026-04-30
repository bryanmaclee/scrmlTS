# Progress: uvb-w1

## Timeline

- [start] Worktree verified at agent-a0e3e3da6eb661992; rebased onto main 70eb995; W0a stdlib + pathFor present.
- [start] `bun install` + `bash scripts/compile-test-samples.sh` to bring worktree to runnable state.
- [start] Pre-snapshot baseline captured: 8,221 pass / 40 skip / 0 fail / 387 files (after re-run; 2 initial fails were flaky network/ECONNREFUSED).
- [start] Pre-snapshot committed.
- [survey] Examined html-elements.js, route-inference.ts, component-expander.ts, AST shape (LiftTarget). Identified existing E-COMPONENT-* and E-CHANNEL-* code spaces.
- [design] Code namespace decided: W-ATTR-001/002 (new), E-COMPONENT-035 (next free, 022 taken for slot=), E-CHANNEL-007 (next free, 005/006 taken).
- [build] attribute-registry.js — committed.
- [build] VP-1/VP-2/VP-3 validators — committed (initial draft, used inline AST-walk).
- [wire] api.js wired Stage 3.3 — committed. Initial smoke test: VP-3 + VP-1 fired correctly; VP-2 missed UserBadge.
- [debug] Identified inline AST-walk did not recurse into lift-expr.expr.node nor for-stmt.body.
- [refactor] Created shared validators/ast-walk.ts; refactored all three validators. VP-2 now correctly surfaces UserBadge in 22-multifile and LoadCard in dispatch board.
- [test] Added 43 new tests (VP-1: 20, VP-2: 9, VP-3: 10, integration: 4). All passing.
- [verify] Full test suite: 8,265 pass / 40 skip / 0 fail / 391 files. Net +44 tests, 0 regressions.
- [spec] Added §15.14 (post-CE invariant), §38.11 (channel literal name/topic), §52.13 (recognized auth values). Master error catalog updated with E-CHANNEL-005/006/007, E-COMPONENT-035, W-ATTR-001/002.
- [pipeline] Added Stage 3.3 section to PIPELINE.md. Reconciled the line 614 vs 639 invariant tension.
- [friction] Updated FRICTION.md with UVB-W1 status notes for F-AUTH-001, F-COMPONENT-001, F-CHANNEL-001, F-CHANNEL-005.
- [resolved] Cleaned up two leftover stash conflicts in unrelated tailwind files (not part of W1; checked out HEAD and dropped stale stashes).
- [smoke] Final verification:
  - 22-multifile/app.scrml → fails with E-COMPONENT-035 (was silently passing pre-W1)
  - dispatch board.scrml → fails with 3 E-COMPONENT-035 (was silently passing pre-W1)
  - dispatch login.scrml → compiles clean (1 unrelated W-AUTH-001 warning)
  - 12 test samples → compile

## Final test counts

- Pre-W1: 8,221 pass / 40 skip / 0 fail / 387 files
- Post-W1: 8,265 pass / 40 skip / 0 fail / 391 files
- Net: +44 pass tests, +4 test files. 0 regressions.

## New error/warning codes

- W-ATTR-001 (warning, VP-1) — Unrecognized attribute name on a scrml-special element. Forwarded to HTML as-is; surfaces silent-acceptance gaps without breaking forward-compat behaviour.
- W-ATTR-002 (warning, VP-1) — Unrecognized attribute value-shape (e.g. `auth="role:X"` on `<page>` / `<channel>` / `<program>`). Closes F-AUTH-001 + F-CHANNEL-005 silent-acceptance window. The role-gating ergonomic itself remains unimplemented for a future track.
- E-CHANNEL-007 (error, VP-3) — `${...}` interpolation in `<channel name=>` or `<channel topic=>`. Closes F-CHANNEL-001 silent-failure window.
- E-COMPONENT-035 (error, VP-2) — Residual `isComponent: true` markup node after CE. Closes F-COMPONENT-001 silent phantom-DOM-emission window.

## Dispatch app FRICTION findings now warned/errored

| Finding | Severity | UVB-W1 surface | Closes |
|---|---|---|---|
| F-AUTH-001 | P0 | W-ATTR-002 (VP-1) | Silent acceptance of `auth="role:X"` |
| F-COMPONENT-001 | P0 | E-COMPONENT-035 (VP-2) | Silent `document.createElement("LoadCard")` |
| F-CHANNEL-001 | P0 | E-CHANNEL-007 (VP-3) | Silent `${id}` literalization in WebSocket URL |
| F-CHANNEL-005 | P1 | W-ATTR-002 (VP-1) | Silent acceptance of `<channel auth="role:X">` |

## Files touched

### New files
- `compiler/src/attribute-registry.js`
- `compiler/src/validators/ast-walk.ts`
- `compiler/src/validators/attribute-allowlist.ts`
- `compiler/src/validators/attribute-interpolation.ts`
- `compiler/src/validators/post-ce-invariant.ts`
- `compiler/tests/unit/uvb-w1-attr-allowlist.test.js`
- `compiler/tests/unit/uvb-w1-attr-interpolation.test.js`
- `compiler/tests/unit/uvb-w1-post-ce-invariant.test.js`
- `compiler/tests/integration/uvb-w1-pipeline.test.js`
- `docs/changes/uvb-w1/pre-snapshot.md`
- `docs/changes/uvb-w1/progress.md` (this file)

### Modified files
- `compiler/src/api.js` — Stage 3.3 wiring (3 validator imports + 3 stage calls)
- `compiler/SPEC.md` — §15.14, §38.11, §52.13, master error catalog updates
- `compiler/PIPELINE.md` — Stage 3.3 section, Stage 3.2 invariant reconciliation
- `examples/23-trucking-dispatch/FRICTION.md` — UVB-W1 status notes on 4 findings

## Deferred-to-supervisor decisions

None. All scope items completed within W1 boundary.

## Notes for supervisor

- VP-2 fires loudly on `examples/22-multifile/app.scrml` and on multiple dispatch app pages (board.scrml, load-detail.scrml, etc.) where the canonical `lift <li><ImportedComp/></li>` workaround is NOT used and the bare `<ImportedComp/>` is consumed. This is the F-COMPONENT-001 architectural gap surfacing — exactly the silent-failure window UVB-W1 was designed to close. The architectural fix (cross-file CE accepting bare `lift <ImportedComp/>`) is W2 territory; UVB-W1 closes only the SILENT-EMISSION window.
- Pre-existing dispatch-board compiled silently (pre-W1) but emitted phantom `document.createElement("LoadCard")` in client.js — confirmed by cross-comparing to the main repo's compile output. Post-W1 the same source is a compile error pointing the adopter at the workaround.
- W-ATTR-001 is a NEW warning code that did not previously exist. No corpus test exercises auth=role:X or unknown-attr-on-<page> patterns, so 0 regressions in the test suite.
- W-ATTR-001 is intentionally permissive: forward-compat HTML attributes (e.g. `data-testid` on `<page>`) are explicitly allowed via `isOpenAttrPrefix()`. This keeps adopters' existing apps building.
- The shared AST walker (validators/ast-walk.ts) is a small but load-bearing utility — without it, validators silently miss markup nested inside `lift-expr`, `for-stmt`, `if-stmt`, etc. Future validation passes added at Stage 3.3 SHOULD use the shared walker.
