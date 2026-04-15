# scrmlTS — Session 18 Hand-Off (end-of-session)

**Date:** 2026-04-14
**Previous:** `handOffs/hand-off-17.md` (rotated post-outage, reconstructed)
**Baseline at start:** 6,205 pass / 14 fail (S17 end)
**Baseline at end:** **6,228 pass / 8 skip / 2 fail** (+4 tests fixed this session; 8 harness-only tests skipped with documented root cause)
**Commits on main:** 4 (README polish, lift dead-code cleanup, housekeeping, bug-fix batch)

---

## What shipped this session

### Commit trail
| Commit | What landed |
|--------|-------------|
| `d20ffa4` | README SQL-batching expansion — 5 new Server/Client bullets + "Why scrml" sharpening + `?{}` contexts-table row |
| `f5d78df` | Lift Approach C Phase 2c-lite — drop confirmed-dead BS+TAB re-parse block in `emitLiftExpr` (~50 LOC) |
| `a55ac8e` | Rotate S16/S17 hand-offs + S18 priority log |
| `b123ed1` | 3 real-bug fixes + skip 8 TodoMVC happy-dom harness tests |

### Real compiler bugs fixed (user-facing wins post-public-launch)

1. **`export type X:enum = {...}` misparsed** — `compiler/src/ast-builder.js` `collectExpr` treated `:` + IDENT + `=` as a new assignment boundary. `enum`/`struct` tokenize as IDENT (not KEYWORD), so `type X:enum` broke mid-decl after `export`. Fix: added `:` to the lastPart skip-list alongside `.` and `=`. Regression test: `cross-file-import-export.test.js §E1/§E2`.
2. **Reactive-for stray `innerHTML = ""` destroys keyed reconcile wrapper** — `compiler/src/codegen/emit-reactive-wiring.ts` unconditionally emitted the clear inside `_scrml_effect`, destroying the `_scrml_reconcile_list(` wrapper on every re-run. Fix: skip the clear when combinedCode contains `_scrml_reconcile_list(` (mirrors the existing single-if branch guard). Regression test: `reactive-arrays.test.js §11`.
3. **`if-as-expr` test fixture triggered valid E-MU-001** — fixture declared `let x = 0` and only wrote to it; MustUse was correct. Test intent is if-stmt codegen, not MustUse semantics. Fixture now adds `log(x)` after the if-stmt.

### Harness-only skips (not compiler bugs)

8 TodoMVC tests in `compiler/tests/browser/browser-todomvc.test.js` marked `test.skip` with annotation. Root cause: harness wraps runtime in IIFE, scoping `let _scrml_lift_target = null;` to the IIFE; client-JS IIFE can't see it. Real browsers share global lexical env between classic `<script>` tags — works there. **Puppeteer e2e (`examples/test-examples.js` 14/14 pass) covers this ground.** Unskip when the harness is refactored to not IIFE-wrap the runtime.

### Other work
- README polish with SQL-batching bullets shipped S17 (`f265036`) + expanded S18 (`d20ffa4`)
- Dropped needs:push msg to master, then user gave one-time auth → pushed directly
- `escape-hatch-catalog.{json,md}` timestamp drift reverted (was pre-session stale)

---

## State of the repo

- **Branch:** `main`, ahead of origin by 1 commit (`b123ed1`) at wrap — confirm push status at S19 start
- **Staged agents (still present):** debate-curator, debate-judge, scrml-language-design-reviewer, scrml-server-boundary-analyst
- **Uncommitted:** none
- **Test suite:** 6,228 pass / 8 skip / 2 fail (self-host deferred)

## Next priority → S19

**Bug-hunt gauntlet.** User authorized a 12-phase language-coverage gauntlet in S18 close. Full plan at:

`handOffs/incoming/2026-04-14-2330-scrmlTS-to-next-pa-language-gauntlet-plan.md`

The plan is not a summary — it's the exhaustive spec for S19+ execution. Includes:
- 12 phases (decls, control-flow, operators, markup, meta, SQL, error/test, styles, validation/encoding, channels, integration apps, error UX)
- 3 tracks (fixture-driven, gauntlet-dev personas, property-based probing)
- 31-agent staging list with wave recommendation
- Ghost-pattern anti-brief reference (`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`)
- Expected outputs per phase (fixture corpus, bug list, non-regression tests)

S19 PA: read the plan end-to-end before dispatching. Send agent-staging message to master per the wave recommendation (Wave 1 = ~15 agents for phases 1–3).

## Other open (deferred per user this session)

- P3 self-host completion + idiomification
- P5 TS migrations (ast-builder, block-splitter)
- P5 ExprNode Phase 4d (component-expander, body-pre-parser) + Phase 5 (self-host parity)
- Full Lift Approach C Phase 2 (delete `parseTagExprString` + `emitCreateElementFromExprString` + `emitConsolidatedLift` refactor + self-host mirror)
- `lin` redesign (queued per auto-memory — discontinuous scoping deep-dive + debate)
- Async loading stdlib helpers (RemoteData, Approach E)
- DQ-12 Phase B (bare compound `is not`/`is some` without parens)
- 2 remaining self-host test failures

## Tags
#session-18 #end-of-session #bug-fixes #public-launch-pivot #gauntlet-planned
