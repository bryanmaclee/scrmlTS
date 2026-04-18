# scrmlTS — Session 26 Wrap

**Date opened:** 2026-04-18
**Date closed:** 2026-04-18 (single-day session)
**Previous:** `handOffs/hand-off-26.md` (S26 starting brief)
**Baseline entering S26:** 7,006 pass / 10 skip / 2 fail (25,735 expects / 293 files) at `87eef58`.
**Final at S26 close:** **7,069 pass / 10 skip / 2 fail** (25,991 expects / 301 files) at `0af336e`.

---

## 0. Close state

### All S26 commits on origin/main

Master PA pushed `24089c5` + `86d9880` (CNAME) mid-session; user authorized direct push for the remaining seven commits at wrap.

### Uncommitted

`docs/SEO-LAUNCH.md` — still has the same pre-S26 tweaks (LICENSE hash + About copy edit) from before S26 opened. Not touched this session. Left for whenever the SEO work next moves.

### Incoming

`handOffs/incoming/` empty (only `read/` archive).

### scrmlTSPub retirement

Still pending at master from S25 wrap. No new status from master this session.

---

## 1. Session summary

Single-arc session. The queued S25 priority was **§2b F auto-generated property tests from machine declarations** (multi-session item, "machine = enforced spec" from the 2026-04-17 cluster deep-dive). Landed end-to-end in six phases + two bug fixes surfaced along the way. Eight commits, zero regressions, **+63 tests**.

### Commit list

| # | Commit | Scope |
|---|--------|-------|
| 1 | `24089c5` | feat(§51.13): auto-property-tests phase 1 — exclusivity. New `--emit-machine-tests` CLI flag, `<base>.machine.test.js` output, self-contained tryTransition harness. 10 tests. |
| 2 | `b84dadf` | fix(§51.5): machine guard `@reactive` refs must rewrite before JS emit. Latent since S22 — no existing test exercised `given (@foo)`. 5 tests. |
| 3 | `19e8b29` | fix(parser): typed `const @name: T = expr` lost its initializer. Both nested and top-level branches in ast-builder.js failed to collect the `:type` annotation. 8 tests. |
| 4 | `81d6d5c` | feat(§51.13): phase 2 — guard coverage. Labeled `given` guards get passing + failing test pair. Harness extended with `guardResults` parametrization. 7 tests. |
| 5 | `4bd9ca6` | feat(§51.13): phase 3 — payload bindings. Filter relaxed. Harness is binding-transparent so bindings flow through unchanged. 7 tests. |
| 6 | `3156b5d` | feat(§51.13): phase 4 — wildcards. `*:To` / `From:*` / `*:*` with four-step fallback chain matching emitTransitionGuard. Harness tracks matched key for guardResults. 9 tests. |
| 7 | `eecaa89` | feat(§51.13): phase 5 — temporal rules. Lifted filter, `(after Nms)` annotation in titles, explicit timer-lifecycle scope-out note in suite header. 10 tests. |
| 8 | `0af336e` | feat(§51.13): phase 6 — projection machines. Distinct emit path. New property (d) projection correctness. 7 tests. |

### §2b F — what landed

Compiling any scrml source with `--emit-machine-tests` now emits `<base>.machine.test.js` that runs under `bun test` with zero runtime dependencies. The generated suite verifies:

- **(a) Exclusivity** — only declared transitions succeed; undeclared pairs throw E-MACHINE-001-RT.
- **(c) Guard coverage** — labeled `given` guards get passing + failing tests using a parametrized `guardResults` harness.
- **(d) Projection correctness** — for derived/projection machines (§51.9), every source variant maps to the declared target through an inlined copy of `_scrml_project_<Name>`.

Covers the full machine-surface feature matrix: payload bindings, wildcard rules (`*:X` / `X:*` / `*:*`), temporal rules (`.From after Ns => .To`), variant-ref-list alternation (`.A | .B | .C => .X`), labeled + unlabeled guards (unlabeled → machine skipped with comment), and derived / projection machines.

Timer lifecycle (arm on entry / clear on exit / reset on reentry) is **explicitly** out of scope — verifying it needs a live runtime with fake-timer control, which the self-contained harness deliberately doesn't invoke. When a source has any temporal rule, the generated file emits a header note calling this out.

Guarded projections are also out of scope for now (phase 7 territory — requires first-match-wins modeling against simulated reactive state).

### §51.13 spec clause — full shape

Four properties defined (a, b, c, d), six phases documented with explicit scope boundaries for each. Phased-implementation clause named. Skip reasons standardized across phases so users always know *why* their machine was skipped.

### Bugs surfaced by the §2b F arc

Both latent, both single-line root causes, both caught by the simple act of writing tests that exercised `given (@reactive) [label]` and `const @derived: T = init`:

- **Bug A — machine guard `@` rewrite gap.** `rule.guard` flowed as raw scrml text from type-system.ts:2451 straight into emit-machines.ts:248's `!(${rule.guard})` interpolation. Any `@reactive` reference in a guard produced invalid JS (raw `@` token). Fix: apply `rewriteExpr` in `emitTransitionGuard` + `emitProjectionFunction` before JS emit; keep raw scrml in the "Guard:" diagnostic string for user-facing clarity. No regression detection pre-fix because `machine-guards-integration.test.js` only tested `guard: null` rules.
- **Bug B — typed `const @name` initializer dropped.** Both `const @name` parser branches (~1728 nested / ~3498 top-level) handled the untyped form but fell through when a `:type` appeared before `=`. Returned `init: ""`, emitted `const name = ;` plus a dangling `: T = init;` statement. Fix: mirror the typed-const annotation handling from the non-reactive branch.

### Test infrastructure note

A real test-harness gotcha surfaced during bug A: writing compiler output files *under* `compiler/tests/` causes `bun test` to re-glob them and re-execute test files, which produces *different* compiler output on the second pass (truncated / inconsistent). Moving tmp dirs to `/tmp` fixed it. All S26 gauntlet tests now write to `/tmp/scrml-<uniq>/...`. Noted in the helper comment.

### Suite trajectory

6,949 (S24 baseline) → 7,006 (S25 close) → **7,069** (S26 close). +120 tests landed since S24. Zero regressions across this entire arc. Same two pre-existing self-host fails unchanged.

### Files touched this session

New:
- `compiler/src/codegen/emit-machine-property-tests.ts` (~390 lines)
- `compiler/tests/unit/gauntlet-s26/*.test.js` × 6 (phase 1 + bug A + bug B + phase 2 + phase 3 + phase 4 + phase 5 + phase 6 = 8 files; phase 1 was extended in-place)

Modified:
- `compiler/SPEC.md` (§51.13 authored + 5 phase updates through §51.13.1 properties list + phased-implementation clause)
- `compiler/SPEC-INDEX.md` (§51 row)
- `compiler/src/cli.js`, `compiler/src/commands/compile.js`, `compiler/src/api.js`, `compiler/src/codegen/index.ts` (flag plumbing)
- `compiler/src/codegen/emit-machines.ts` (bug A fix)
- `compiler/src/ast-builder.js` (bug B fix)

---

## 2. Queued for S27

### High-impact

- **§51.13 phase 7 — guarded projection machines.** First-match-wins projection-guard evaluation against simulated reactive state. Blocked on deciding the projection-guard parametrization model (the current transition-guard `guardResults` pattern would need extension for multi-rule first-match semantics).
- **Match-arm expression-only form** (`.Variant => singleExpr`) — still queued from S25.
- **Error-arm `!{}` bindings scope-push** — still queued from S25.

### Design / user-decision

- **Approach C lin (cross-function `lin:out` / `lin:in`)** — still deferred.
- **§2b G free audit/replay** — next cluster candidate after F. Already has partial landing (§51.11 audit clause), but the full audit/replay surface was flagged by the 2026-04-17 deep-dive as tied-for-5th priority with F. With F now done, G is the natural next "correctness multiplier" item.

### §5-era backlog (unchanged)

- P3 self-host completion + 2 pre-existing self-host fails.
- P5 TS migrations (`ast-builder.js`, `block-splitter.js`).
- P5 ExprNode Phase 4d / Phase 5.
- Full Lift Approach C Phase 2.
- Async loading stdlib helpers.
- DQ-12 Phase B.

---

## 3. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- Suite at tip: 7,069 pass / 10 skip / 2 fail / 25,991 expects / 301 files / ~5.0s.
- New gauntlet dir `compiler/tests/unit/gauntlet-s26/` (7 files, 56 tests).
- New CLI flag: `--emit-machine-tests`. Default: off. Independent of `--test` / `testMode`.

---

## 4. Agents available

Same primary roster as S22/S23/S24/S25/S26. No new agents staged this session.

---

## 5. Recommended S27 opening sequence

1. Check `handOffs/incoming/` for messages. Master may have acted on the scrmlTSPub retirement; if so, archive the read message.
2. Verify origin/main is at `0af336e` (all S26 pushed).
3. Pick next priority. With §2b F closed, the biggest remaining cluster items are **§2b G free audit/replay** (already has a partial — §51.11 audit clause — so extending to full replay/time-travel is a natural next arc) or **match-arm expression-only form** (concretely scoped AST-builder slice).

---

## Tags
#session-26 #closed #all-pushed #s2bF-complete #spec-§51.13 #bugA-fixed #bugB-fixed #queue-§51.13-phase-7 #queue-§2bG-audit-replay #queue-match-arm-expr-form
