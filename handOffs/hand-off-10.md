# scrmlTS — Session 10 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-9.md`
**Baseline at start:** 6,000 pass / 146 fail across 6,146 tests (main @ `8b4b961`)

---

## Session 10 — complete

### Commits (5 on main)

1. **Phase 4d Slice 2+3** (`2d045e7`) — 7 ExprNode walker utilities + ~25 semantic pass sites migrated to ExprNode-first with string fallback across 6 files.
2. **E-SCOPE-001 fix** (`f3e13d0`) — dotted property access on reactive vars in attributes (`@todos.length`). Scope checker now extracts base name before first dot.
3. **Enum pipe-syntax + Puppeteer tests** (`7370e12`) — pipe-syntax enum variants (`.Info | .Preferences | .Confirm`) now generate `const Step = Object.freeze({...})`. Added `examples/test-examples.js` Puppeteer smoke test. Fixed 3 examples that wouldn't compile.
4. **Runtime + codegen fixes** (`90f6bb3`) — reconciler null-node safety for filtered lists; `not` keyword → `LitExpr{litType:"not"}` in expression parser; enum variant dot-trim.
5. **README `not` keyword** (`c2258a1`) — added absence value to features section.

### State

| Metric | S9 End | S10 End |
|--------|--------|---------|
| Tests | 6,000 / 146 fail | **6,000 / 145 fail** (-1) |
| ExprNode coverage | 99.0% | 99.0% |
| Semantic passes on ExprNode | 0 | **6 files migrated** (~25 sites) |
| Examples passing (Puppeteer) | untested | **12/14** |

### Bugs fixed this session
- `_scrml_eq` → `_scrml_structural_eq` name mismatch in emit-expr.ts
- E-SCOPE-001: dotted `@var.prop` in attributes (unblocks TodoMVC + benchmarks)
- Pipe-syntax enums not generating variant objects (`.Info | .Prefs` form)
- Reconciler crash on filtered list items (createFn returning undefined)
- `not` keyword emitted as bare identifier via ExprNode path (now LitExpr)
- 3 examples fixed: 05 (lin→guard), 07 (static headers), 09 (wildcard arm syntax)

### Known issues (remaining)
- **Example 11** — meta-eval doesn't inject surrounding `const` into compile-time scope; blocks fall through to runtime
- **Example 12** — `${render slotName()}` emitted as bare `render;` instead of slot substitution

### New files
- `examples/test-examples.js` — Puppeteer headless Chrome smoke test for all 14 examples
- `docs/tutorial.md` — 12-step tutorial from hello world to inline tests
- `DESIGN.md` — design rationale: why scrml is what it is

### README overhaul
- Added: Why scrml, state-as-first-class, mutability contracts, lin semantics, `not` absence value, runtime meta, `<program>`, Tailwind, state machines
- Fixed: 5 dead links removed, benchmarks restored from RESULTS.md, documentation links point to existing files
- New docs linked: tutorial, design notes

### Queued
1. **lin redesign deep-dive** — discontinuous scoping (user's original vision), debate if needed
2. **Example 11/12 fixes** — meta-eval scope injection, component slot rendering
3. **Machine transition guards** — wire guard emission (T2)
4. **Phase 4d Slice 4** — make ExprNode required, drop string fields
5. **Fresh benchmarks** — re-run now that TodoMVC compiles (E-SCOPE-001 fixed)

---

## Tags
#session-10 #complete #phase-4d-slice2 #phase-4d-slice3 #e-scope-001-fixed #puppeteer-testing #12-of-14-examples #readme-overhaul

## Links
- [handOffs/hand-off-9.md](./handOffs/hand-off-9.md) — S9 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
