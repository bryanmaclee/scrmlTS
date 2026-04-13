# scrmlTS — Session 12 Hand-Off

**Date:** 2026-04-13
**Previous:** `handOffs/hand-off-11.md`
**Baseline at start:** 6,000 pass / 145 fail across 6,145 tests (main @ `2204281`)
**Baseline at end:** 5,998 pass / 147 fail (2 new from CE bare-ref expansion changing output shape)

---

## Session 12 Summary

Major session — 20+ commits. Started with machine guard threading, ended deep in lift/reactive codegen. Puppeteer testing revealed cascading issues that had been invisible to unit tests.

### Key compiler fixes landed
1. **Machine transition guards** — threaded machineBindings into function bodies, fixed TDZ ordering, skip guards on init
2. **Meta-eval** — consumed decl stripping, backtick tracking in meta blocks, restoreEmitBackticks, reflect interpolation resolution
3. **Expression parser** — `not(expr)` → `!(expr)` in preprocessForAcorn
4. **CSS tokenizer** — pseudo-selector (`:root`, `:hover`) tokenization
5. **Component expander** — CE inside lift blocks, bare component refs, optional snippet if= resolution
6. **Lift codegen** — re-parse through BS+TAB for correct DOM construction, lift target routing to placeholder spans
7. **Reactive lift blocks** — `_scrml_effect` wrapping for if/lift and for/lift with reactive deps, grouped sibling statements
8. **Tilde-decl** — derived reactives with `_scrml_derived_declare`/`_scrml_derived_subscribe`
9. **Runtime** — `_scrml_reactive_get` bridges to derived cache, dirty propagation triggers effects, `_scrml_lift_target` routing
10. **bind:value** — auto-coerce to Number for type=number/range inputs
11. **Tailwind** — confirmed working, 7 examples converted

### Puppeteer status: 14/14 pass (smoke tests)
All examples compile, load without JS errors, and render content. Interactive testing shows:
- **Fully interactive:** 01, 02, 04, 10, 14 (mario)
- **Partial:** 05 (form shows Info step, onclick fix landed but untested), 09 (form renders), 11 (static meta output), 12 (slots), 13 (worker UI)
- **Needs server:** 03, 07, 08
- **Broken interactivity:** 06 (kanban — onclick ${expr} args in lift attributes split by re-parse)

### Root cause pattern identified
The BS+TAB re-parse path for lift expressions loses `${...}` inline expressions when they appear in attributes. The original token stream has BLOCK_REF children for these, but the re-parse from normalized text doesn't preserve them. This affects any component or element with `onclick=${fn(arg1, arg2)}` inside a lift block.

### Queued for next session — compiler fixes, not examples
1. **Lift attribute expression handling** — the re-parse path needs to either (a) preserve BLOCK_REF children from the original token stream, or (b) use a different approach for inline `${...}` in attributes. This is the root cause behind kanban and other interactive lift patterns.
2. **Parser: statements after match** — `collectLiftExpr` and the AST builder truncate function bodies after match expressions (closing `}` ambiguity). Worked around in example 14 but not fixed.
3. **Tilde-decl reactivity gaps** — the DG doesn't track `if=(@tildeName)` as a consumption, producing false E-DG-002 warnings.
4. **Lin Approach B implementation** — spec amendments drafted, multi-session scope.
5. **README audit** — systematic read-through.

---

## Tags
#session-12 #completed

## Links
- [handOffs/hand-off-11.md](./handOffs/hand-off-11.md) — S11 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
