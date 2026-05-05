# Progress: phase-a1a-step-8-reserved-ident

## Baseline
- Branch: phase-a1a-step-8-reserved-ident from 802375e
- Run-1: 8725 pass / 43 skip / 2 fail (browser flake on http_client)
- Run-2: 8726 pass / 43 skip / 0 fail / 8769 tests — matches expected baseline. Flake protocol satisfied.

## Design choice
- Scoped check: emit `E-RESERVED-IDENTIFIER` ONLY when the function-name token is `reset` specifically.
- Rationale: Per dispatch "PA leans (a) for this step — narrow scope". Generalizing to "any KEYWORD as function name" would hit cases where `async`/`pure`/`server` or other contextual keywords might legitimately appear as identifier-shaped names, and the spec §6.8 explicitly names `reset` as the only reserved-identifier case in flight.
- Implementation note: In ast-builder.js, all three function-decl construction sites (lines ~3637, ~5260, ~5395) accept `IDENT|KEYWORD` for the name slot. We add the reset-specific check immediately after consuming the name token at each site.

## Reserved-keyword-as-name collisions found in repo (must rename or accept regression)
- compiler/tests/unit/lint-ghost-patterns.test.js:803 `function reset() { @count = 0 }` (asserts 0 diags) — RENAME
- compiler/src/commands/init.js:65 `function reset()` + onclick line 77 — RENAME (Step 1 dependency)
- samples/compilation-tests/combined-001-counter.scrml — used by browser/runtime-behavior.test.js — RENAME
- samples/compilation-tests/combined-018-timer.scrml — RENAME
- samples/compilation-tests/func-005-multiple.scrml — RENAME
- samples/compilation-tests/gauntlet-s79-counter-todo.scrml — referenced by for-lift-mixed-case-hoist.test.js — RENAME
- samples/recipe-book.scrml: `function resetForm()` — does NOT match `reset` exactly, no rename needed
- samples/gauntlet-r11/rust-state-machine.scrml: `function reset()` — RENAME
- samples/gauntlet-r14/htmx-forms.scrml: `function resetForm()` — does NOT match, skip
- samples/gauntlet-r14/solid-reactive-signals.scrml: `function resetAll()` — does NOT match, skip
- samples/compilation-tests/gauntlet-r10-htmx-feedback.scrml: `function resetForm()` — does NOT match, skip
- samples/compilation-tests/gauntlet-r10-svelte-dashboard.scrml: `function resetDashboard()` — does NOT match, skip
- compiler/SPEC.md:2636 — illustrative example showing the prohibited form; leave as-is (it's the spec).

## Steps
- [done] Add E-RESERVED-IDENTIFIER emission at 3 ast-builder.js sites (function-decl @ ~3637 nested, ~5260 main `function`, ~5395 `fn` shorthand)
- [done] Rename init.js template (function reset → clearCount + onclick callsite)
- [done] Rename test fixtures: lint-ghost-patterns.test.js scaffold (function reset → clearCount + onclick callsite)
- [done] Rename samples: combined-001-counter (clearCount), combined-018-timer (clearTimer), func-005-multiple (clearCount), gauntlet-s79-counter-todo (clearAll), rust-state-machine (resetMachine)
- [done] Add parse-shapes-v0next.test.js with 4 tests (2 positive: `function reset()`, `fn reset {}`; 2 negative: `function notReset()`, `function clearCount()`)
- [done] Final test run: 8730 pass / 43 skip / 0 fail / 8773 tests across 434 files. Delta from baseline: +4 tests (the 4 new in parse-shapes-v0next.test.js), +1 test file. Zero regressions.

## Final
- Branch: phase-a1a-step-8-reserved-ident
- Final test count: 8730 pass / 43 skip / 0 fail / 8773 tests (+4 tests, +1 file vs baseline 8769/433)
- init.test.js "app.scrml compiles without errors": still passes
- No `--no-verify` used at final commit

