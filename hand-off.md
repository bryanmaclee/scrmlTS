# scrmlTS — Session 20 Hand-Off

**Date:** 2026-04-16
**Previous:** `handOffs/hand-off-19.md`
**Baseline at start:** 6,706 pass / 10 skip / 2 fail (25,214 expects across 268 files)
**Current:** 6,743 pass / 10 skip / 2 fail (25,258 expects across 269 files)
**Status:** Phase 5 (Meta) in progress

---

## S20 work — Phase 5 Meta Gauntlet

### Bugs found and fixed (4)

| Bug | Description | Fix |
|-----|-------------|-----|
| BUG-META-P5-003 | `reflect(@var)` misclassified as compile-time — caused E-META-001 + E-META-005 on valid runtime reflect | `bodyUsesCompileTimeApis` now checks reflect() argument type; variable args → runtime path per §22.4.2 |
| BUG-META-P5-004 | `reflect()` outside `^{}` — no E-META-008 fired | Added `checkReflectOutsideMeta` in `runMetaChecker`; uses ExprNode-first detection to avoid false positives on string/regex literals |
| BUG-META-P5-005 | `lift` inside `^{}` — no E-META-006 fired | `bodyContainsLift` now checks `kind === "lift-expr"` AST nodes (markup lift), not just `lift()` function call pattern |
| BUG-META-P5-007 | `reflect(NonExistentType)` treated as runtime variable → spurious E-META-001 + E-META-005 alongside correct E-META-003 | Both `bodyMixesPhases` and `checkMetaBlock` now exclude PascalCase identifiers that are reflect() arguments from runtime-ident checks |

### Bugs found but NOT yet fixed (5)

| Bug | Description | Category |
|-----|-------------|----------|
| BUG-META-P5-001 | `^{}` block does not count as lin consumption (§22.5.3) — false E-LIN-001 | lin checker gap |
| BUG-META-P5-002 | lin used in `^{}` + markup — neither counted, no E-LIN-001 | lin checker gap |
| BUG-META-P5-006 | Phase separation detected at eval-time (E-META-EVAL-001 crash on `@`) instead of checker-time (E-META-005) | meta-checker + meta-eval pipeline gap — `bodyReferencesReactiveVars` misses reactive assignment nodes |
| BUG-META-P5-008 | DG pass false-positive E-DG-002 for `@var` consumed via `meta.get()`/`meta.bindings` | DG pass gap |
| BUG-META-P5-009 | Nested `^{}` in compile-time meta crashes eval | meta-eval gap |

### Files changed

- `compiler/src/meta-checker.ts` — 4 bug fixes (reflect hybrid resolution, E-META-008, lift-expr detection, reflect-arg exclusion)
- `compiler/tests/unit/gauntlet-s20/meta-gauntlet.test.js` — 12 new regression tests
- `samples/compilation-tests/gauntlet-s20-meta/` — 25 new fixture files

### Fixture corpus (25 files)

All in `samples/compilation-tests/gauntlet-s20-meta/`:
- emit.raw() contrast (2 fixtures)
- Phase separation / error codes: E-META-005, E-META-006, E-META-007, E-META-008 (4 fixtures)
- Runtime meta: reactive, hybrid reflect, bindings capture, type registry, cleanup, scopeId, multiple blocks (9 fixtures)
- Placement: in-function, in-component, after-markup (3 fixtures)
- Edge cases: empty block, nested deep, match-in-meta (3 fixtures)
- lin interaction: capture, double-consume (2 fixtures)
- Compile-time: pure, bun.eval (2 fixtures)

---

## Gauntlet progress

| Phase | Status | Tests added |
|-------|--------|-------------|
| 1 — Declarations | Done (S19) | S19 fixtures |
| 2 — Control flow | Done (S19) | S19 fixtures |
| 3 — Operators | Done (S19) | S19 fixtures |
| 4 — Markup | Done (S19) | S19 fixtures |
| **5 — Meta** | **In progress** | **25 fixtures + 12 regression tests** |
| 6 — SQL | Not started | |
| 7 — Error/Test | Not started | |
| 8 — Styles | Not started | |
| 9 — Validation/Encoding | Not started | |
| 10 — Channels | Not started | |
| 11 — Integration apps | Not started | |
| 12 — Error messages UX | Not started | |

## Open work (carried from S19)

### Backlog (deprioritized per user direction S18)
- P3 self-host completion + idiomification
- P5 TS migrations (ast-builder, block-splitter)
- P5 ExprNode Phase 4d (component-expander, body-pre-parser) + Phase 5 (self-host parity)
- Full Lift Approach C Phase 2
- `lin` redesign (queued — discontinuous scoping deep-dive + debate)
- Async loading stdlib helpers (RemoteData, Approach E)
- DQ-12 Phase B (bare compound `is not`/`is some` without parens)
- 2 remaining self-host test failures

## Tags
#session-20 #gauntlet #phase-5-meta #bug-fixes
