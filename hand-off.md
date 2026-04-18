# scrmlTS — Session 26 Hand-Off

**Date opens:** TBD
**Previous:** `handOffs/hand-off-25.md` (S25 starting brief)
**Baseline at S25 wrap:** **7,006 pass / 10 skip / 2 fail** (25,735 expects across 293 files) at commit `e37a6fd`.

---

## 0. Cold-start state

### All S25 commits pushed to origin/main

Nothing unpushed. The last push was `7305ac1..e37a6fd` on S25 wrap.

### Untracked

None.

### Incoming messages

`handOffs/incoming/`: empty (only `read/` archive).

### scrmlTSPub status

Retirement message sent to master 2026-04-17-1804. Still pending at S25 wrap; prod if no action.

---

## 1. S25 session summary

Long session. The whole §2h lin redesign (Approach B) arc landed, the two S24-deferred items both landed, the documented S22 parser bug got fixed, and a user-facing lin guide was added. 13 meaningful slices + 4 housekeeping/docs, 19 commits, zero regressions across the entire run.

### Work done — full list

| # | Commit | Scope |
|---|--------|-------|
| 1 | `6f5b90c` | feat(§35.5): E-LIN-005 — reject let/const/lin shadowing an enclosing lin. `ScopeEntry.isLin` + `checkLinShadowing` helper. 11 tests. |
| 2 | `b6c4f5d` | fix(§35.5): push scope for while-stmt so E-LIN-005 fires in while bodies. Merged duplicate while-stmt cases. |
| 3 | `3556b22` | fix(§51): emit effect blocks for rules without a `given` guard. S24 pre-existing bug. 4 tests. |
| 4 | `0e52306` | docs(§35.1/§35.2): Approach-B wording — restricted intermediate visibility. Spec-only alignment. |
| 5 | `5ab63ac` | feat(§2a): push scope for match-arm-block body. 5 tests. |
| H | `7dd6fe6` | chore(tests): redirect expr-ast audit catalog to `os.tmpdir()`; drop stray `docs/dfas`. |
| 6 | `83101c7` | docs(§35.2.2): ratify cross-`${}` block lin — 6 tests + spec section. Prior diagnosis ("blocked") was wrong — already working. |
| 7 | `4b1e8b2` | feat(§2a): push scope for if-stmt consequent and alternate branches. 6 tests. Zero regressions — nothing in corpus relied on the leak. |
| 8 | `e171e33` | feat(§35.5): E-LIN-006 — reject lin consumption inside `<request>`/`<poll>` body. Narrow interpretation (A). `_declDeferredDepth` on LinTracker. 6 tests. |
| 9 | `3b8f2db` | docs: add `docs/lin.md` — 384-line how-to guide. README Linear Types section points at it. |
| 10 | `347ac02` | feat(§51.3.2): migrate machine opener from sentence form to attribute form. 11 files / 35+ opener instances migrated. E-MACHINE-020 on pre-S25 form. 6 tests. |
| 11 | `7305ac1` | feat(§51.12): temporal machine transitions — `.From after Ns => .To`. Parser + codegen + runtime helpers + initial-state arming. 8 tests. |
| 12 | `e37a6fd` | fix(parser): statement boundary on `@name:` — closes S22 §6 parser bug. 5 tests. |
| W | `95b5618`, `5075ab2`, `1da34e4`, `4f36236` | mid-session hand-off wrap commits. |

### §2h lin redesign (Approach B) — complete

The full Approach B arc from the 2026-04-13 deep-dive shipped this session:

- **E-LIN-005** shadowing (child-scope let/const/lin rebinds an enclosing lin).
- **E-LIN-006** deferred-ctx (narrow interpretation — markup `<request>`/`<poll>` only, closures still §35.6).
- **§35.1/§35.2** wording amended (restricted intermediate visibility).
- **§35.2.2** cross-`${}` block lin formalized.
- **Scope-push fixes** for while-stmt, match-arm-block, if-stmt (prerequisites surfaced by E-LIN-005).
- **User-facing guide** at `docs/lin.md`.

No blocking work remains for Approach B in the compiler. Approach C (cross-function `lin:out`/`lin:in` explicit teleportation) is deliberately deferred per the deep-dive — only needed if users request cross-function lin mobility.

### S24-deferred queue — cleared

Both items that S24 marked "ratified, deferred" landed as a pair:

- **Machine opener attribute-form migration** (`347ac02`) — `< machine Name for Type>` → `< machine name=Name for=Type>`. Bareword-ident values. E-MACHINE-020 on the old form.
- **§2b C temporal transitions** (`7305ac1`) — `.From after Ns => .To` syntax. Timer arm on entry, clear on exit, reset-on-reentry (XState parity). Initial-state arming via `_scrml_machine_arm_initial`.

### Pre-existing bugs cleared

- **S22 §6 parser bug** (`e37a6fd`) — untyped-then-typed reactive-decl statement-boundary. Single-line fix in `collectExpr`.
- **Effect emission for non-guarded rules** (`3556b22`) — `emitTransitionGuard` double-filter.
- **while-stmt scope-push gap** (`b6c4f5d`) — duplicate case shadowing.

### Suite trajectory

6,949 → 7,006 pass (+57), 25,619 → 25,735 expects (+116), 284 → 293 files (+9). Same 2 pre-existing self-host fails. Zero regressions.

### Incidental observations (not fixed)

- **switch-stmt integration with checkLinear** — probed; `switch` is essentially non-idiomatic in scrml (one mention in SPEC, about compiler implementation, not language). Low value; skipped.
- **error-arm `!{}` bindings scope** — probed at a surface level; the error-effect AST area needs investigation before a targeted fix can land.
- **match-arm expression-only form** — `collectExpr` stop-condition work in AST builder. Larger than the S24 estimate; touches many tests.

---

## 2. Queued for S26

### High-impact, multi-session

- **§2b F auto-generated property tests from machine declarations.** "Machine = enforced spec." Compile-time `~{}` suite emission behind `--emit-machine-tests` flag. Medium complexity, no grammar change, but needs CLI flag + new compilation phase + harness integration. Multi-session.

### Moderate scope

- **match-arm expression-only form (`.Variant => singleExpr`).** AST builder change. `collectExpr` stop-condition extension to recognize next-arm-pattern (`.IDENT =>`, `else =>`, `not =>`) as a boundary. Touches many tests; do it standalone.
- **error-arm `!{}` bindings scope-push.** Caught-error binding probably needs its own scope-push case. Needs investigation of the error-effect AST shape first.

### Small, low-impact

- **switch-stmt integration with checkLinear.** `switch` is non-idiomatic in scrml; gains are limited. Fix only if a user hits it.

### Design-review / user-decision items

- **Approach C lin (cross-function `lin:out`/`lin:in`).** The deep-dive explicitly deferred this; only warranted if users ask for cross-function lin mobility.

### §5-era backlog

- P3 self-host completion + idiomification (+ the 2 pre-existing self-host fails).
- P5 TS migrations — `ast-builder.js`, `block-splitter.js` still `.js`.
- P5 ExprNode Phase 4d + Phase 5 — additional coverage, then retire legacy string-form fields.
- Full Lift Approach C Phase 2 — `emitConsolidatedLift` refactor for fragmented bodies.
- Async loading stdlib helpers.
- DQ-12 Phase B — diagnostic quality work.

---

## 3. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- New gauntlet dir `compiler/tests/unit/gauntlet-s25/` — contains:
  - `lin-005-shadowing.test.js` (§35.5, 11 tests)
  - `machine-effect-without-guard.test.js` (§51, 4 tests)
  - `match-arm-block-scope.test.js` (§2a, 5 tests)
  - `lin-cross-block.test.js` (§35.2.2, 6 tests)
  - `if-stmt-scope.test.js` (§2a, 6 tests)
  - `lin-006-deferred-ctx.test.js` (§35.5, 6 tests)
  - `machine-opener-attribute-form.test.js` (§51.3.2, 6 tests)
  - `machine-temporal-transitions.test.js` (§51.12, 8 tests)
  - `reactive-decl-typed-boundary.test.js` (§6, 5 tests)
- Suite at tip: 7,006 pass / 10 skip / 2 fail / 25,735 expects / 293 files / ~5.0s.

---

## 4. Agents available

Same primary roster as S22/S23/S24/S25. No staging needed for the queued items.

---

## 5. Recommended S26 opening sequence

1. Check `handOffs/incoming/` for messages. Master may have acted on the scrmlTSPub retirement; if so, archive the read message.
2. Nothing unpushed from S25.
3. Pick next priority. With the §2h lin redesign and the S24-deferred queue both complete, the biggest remaining user-vision item is **§2b F auto-property-tests** — "machine = enforced spec." Alternative: a narrower AST-builder slice (match-arm expression-only form, or error-arm scope investigation).

---

## Tags
#session-26 #open #all-pushed #lin-redesign-complete #s24-deferred-queue-cleared #queue-property-tests #queue-match-arm-expr-form #queue-error-arm-scope #s25-complete
