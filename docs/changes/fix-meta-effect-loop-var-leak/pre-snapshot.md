# Pre-Snapshot: fix-meta-effect-loop-var-leak

## Test baseline
- Full suite (`cd compiler && bun test`): 7773 pass / 40 skip / 132 fail / 27899 expect calls / 7945 tests / 378 files
- Unit-only (`cd compiler && bun test tests/unit`): 5981 pass / 0 fail / 24623 expect / 5981 tests / 262 files
- The 132 integration failures are pre-existing DOM-environment failures unrelated to Bug O.
  They cluster across: control-001/002/011 if/else samples, todo, bind:value/checked/group,
  Form Validation, reactive-014, combined-021 component, transition-001-basic, counter,
  class-binding §1-§13. These appear to be pre-existing test-harness failures and are NOT
  to be treated as regressions.

## Repro confirmation (Bug O)
- File: `handOffs/incoming/read/2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml` (read from main; copied to `/tmp/fix-meta-effect-loop-var-leak/bug-o.scrml`)
- Compile result: succeeds (no error)
- Output `bug-o.client.js` shows TWO `_scrml_meta_effect` emissions for the single `^{ init() }`:
  - `_scrml_meta_28` (at meta-effect position)
  - `_scrml_meta_55` (after for-lift wiring at module end)
- Both emissions include `it: it` in their `Object.freeze({...})` captured-scope object.
- `it` is the loop variable from `for (it of @items)` inside the `<ul>` markup, NOT a module-scope identifier.
- Module load throws `ReferenceError: it is not defined` (per intake; not re-verified in DOM here, but emit is conclusive).

## Bug confirmation
- Primary bug (loop-local leaks into frozen scope): REPRODUCED.
- Bonus bug (single `^{}` emits twice): REPRODUCED.

## HEAD before changes
- `8d1e07f docs(s43): wrap — hand-off close, master-list S43 update, changelog S43 entry`
