# S19 Language Gauntlet — Bug List

Tracked across phases. Each entry: title · fixture · repro · expected · actual · root cause (if diagnosed) · fix commit.

Status legend: **OPEN** (unconfirmed) · **CONFIRMED** (PA reproduced, root cause identified) · **FIXED** (commit landed + regression test).

---

## Phase 1 — Declarations + Scoping

**Verification run:** 118 fixtures compiled via `scripts/gauntlet-s19-verify.mjs`. 80 MATCH · 38 non-match (after filtering boilerplate W-PROGRAM-001 / W-AUTH-001).

### A. Missing diagnostics (spec says error, compiler emits nothing) — 19 candidates

| # | Diagnostic | Fixture | Spec |
|---|---|---|---|
| A1 | **E-FN-001** (SQL inside fn) | `phase1-fn-prohibition-sql-004` | §48.3.1 |
| A2 | **E-FN-003** (outer-scope mutation from fn) | `phase1-fn-prohibition-outer-mutation-006` | §48.3.3 |
| A3 | **E-FN-003** (fn calls non-pure function) | `phase1-fn-call-non-pure-function-015` | §48.3.3 |
| A4 | **E-FN-005** (async inside fn) | `phase1-fn-prohibition-async-008` | §48.3.5 |
| A5 | **E-FN-008** (lift past fn boundary) | `phase1-fn-lift-past-boundary-022` | §48 |
| A6 | **E-IMPORT-003** (import inside function body) | `phase1-import-inside-function-007` | §21.6 |
| A7 | **E-IMPORT-004** (import name not exported) | `phase1-import-not-exported-004` | §21.6 |
| A8 | **E-IMPORT-004** (import default when no default export) | `phase1-import-default-003` | §21.6 |
| A9 | **E-IMPORT-005** (bare npm import, no vendor: prefix) | `phase1-import-bare-npm-006` | §21.6 |
| A10 | **E-IMPORT-001** (export outside logic) | `phase1-export-outside-logic-009` | §21.6 |
| A11 | **E-SCOPE-010** (duplicate file-scope let) | `phase1-let-duplicate-binding-010` | §7.6 |
| A12 | **E-TYPE-031** (type-annot mismatch on const) | `phase1-const-type-mismatch-004` | §14 |
| A13 | **E-TYPE-031** (type-annot mismatch on let) | `phase1-let-type-mismatch-004` | §14 |
| A14 | **E-LIN-002** (outer lin consumed in loop) | `phase1-lin-loop-outer-006` | §35.4.4 |
| A15 | **E-AUTH-002** (server @var derived from local) | `phase1-server-reactive-derived-from-local-009` | §39 |
| A16 | **E-USE-001** (`use` inside `${}`) | `phase1-use-inside-logic-014` | §41.2.2 |
| A17 | **E-USE-002** (`use` after markup start) | `phase1-use-after-markup-015` | §41.2.2 |
| A18 | **E-USE-005** (`use` with unknown prefix) | `phase1-use-bad-prefix-016` | §41 |
| A19 | `const` without initializer | `phase1-const-no-init-002` | JS-level / spec silent |

### B. Wrong diagnostic code — lin checker 3 cases

| # | Fixture | Expected | Actual | Note |
|---|---|---|---|---|
| B1 | `phase1-lin-closure-double-008` | `E-LIN-002` (double-consume) | `E-LIN-001` (zero-use) | lin captured in closure; outer scope sees zero consumes. Double-consume happens *through* the closure. |
| B2 | `phase1-lin-match-arms-asymmetric-013` | `E-LIN-003` (asymmetric branches) | `E-LIN-001` | match-arm branch analysis not treating arms as parallel branches for lin accounting? |
| B3 | `phase1-lin-branch-asymmetric-004` | `E-LIN-003` only | `E-LIN-003` + `E-LIN-001` | extra E-LIN-001 fires alongside the correct E-LIN-003. Double-reporting the same condition. |

### C. False-positives (spec says clean, compiler errors) — 8 candidates

| # | Fixture | Unexpected codes | Note |
|---|---|---|---|
| C1 | `phase1-const-array-type-005` | E-DG-002, E-CTX-001 | array type annotation `const xs: [number, ...]` |
| C2 | `phase1-fn-multiline-011` | E-CTX-001 | multi-line fn body |
| C3 | `phase1-let-multiline-008` | E-CTX-001 | multi-line array literal RHS |
| C4 | `phase1-fn-inside-meta-016` | E-PARSE-002 | fn declaration inside `^{}` |
| C5 | `phase1-lin-match-arms-012` | E-LIN-001 | symmetric match arms — lin consumed in every arm, should pass |
| C6 | `phase1-reactive-file-level-003` | E-SYNTAX-050 | `@count = 0` at file top level (outside any `${}`) |
| C7 | `phase1-use-bare-011` / `phase1-use-named-012` | E-COMPONENT-020 | `use scrml:ui` resolves ambiguously |
| C8 | `phase1-use-vendor-013` | expected E-USE-004, got E-COMPONENT-020 + E-SCOPE-001 | vendor prefix handling |

### D. Spec ambiguity — compiler currently accepts (needs spec ruling) — 6 cases

| # | Construct | Fixture | Spec status |
|---|---|---|---|
| D1 | `@throttled` / `@debounced` | `phase1-reactive-throttled-005`, `...-004` | Not in SPEC.md |
| D2 | `type X:union = ...` kind keyword | `phase1-type-union-009` | Only `:enum`, `:struct` in §14 |
| D3 | `type X = ...` (no `:kind`) alias form | `phase1-type-no-kind-alias-011` | §14 grammar always shows `:kind` |
| D4 | `let lin = 5` (lin as identifier) | `phase1-lin-as-variable-name-011` | §35 doesn't reserve |
| D5 | `using` keyword (shape check) | `phase1-using-keyword-001` | Not in SPEC.md |
| D6 | `with` keyword (scoping block) | `phase1-with-keyword-001` | Not in SPEC.md |

---

## Fix log — batch 3 (Cat C triage)

Only 1 of 8 Cat C fixtures was a compiler-logic false-positive. The rest split into two deferred issues + a fixture-author error.

| # | Fixture | Status |
|---|---|---|
| C2 phase1-fn-multiline-011 E-FN-008 extra | **FIXED** | `return ~` now marks `hasFnLocalTilde = true` so the legitimate "fn accumulates into implicit local tilde" pattern doesn't fire E-FN-008 anymore. |
| C1/C2/C3 E-CTX-001 on `<li for X / lift Y />body</>` | **DEFERRED (markup bug)** | `/>` self-closer detection misinterprets the `for/lift` shorthand as self-close, orphaning body + `</>`. Real compiler bug, owned by markup/block-splitter specialist. |
| C5 phase1-reactive-file-level-003 E-SYNTAX-050 | **DEFERRED (parser edge case)** | File-top-level `// comment` immediately before bare `@var` decls trips the subsequent markup's `/` tokenization. Isolated repro: without the comment, clean; with the comment, `/` between `${a}` and `${b}` is read as bare closer. Owned by block-splitter. |
| C4 phase1-fn-inside-meta-016 E-PARSE-002 | **FIXTURE ERROR** | `fn` inside `^{}` meta block is explicitly rejected per ast-builder.js:3654 — fixture's expected-clean is wrong; E-PARSE-002 is the documented behavior. Expected.json updated. |
| C6/C7/C8 phase1-use-bare/named/vendor E-COMPONENT-020 | **FEATURE GAP** | `use scrml:ui { Button }` doesn't yet auto-bind component names into scope. Separate implementation (use-capability expander). Deferred. |

---

## Fix log — batch 1

**Status:** 12 bugs FIXED, test baseline **6,228 → 6,364 pass** (+136), 2 pre-existing fails preserved. Not yet committed.

| # | Status | Fix |
|---|---|---|
| A1 E-FN-001 (SQL in fn) | FIXED | `type-system.ts` walkBody: added `/\?\s*\{/` text-heuristic to catch `?{}` embedded in let-decl init text. |
| A2 E-FN-003 (outer mut) | FIXED | `type-system.ts`: removed `tilde-decl` from `collectLocalDecls` (tilde-decl = reassignment, not fresh decl). Added `tilde-decl` to `checkOuterScopeMutation` assignment branch. |
| A3 E-FN-003 (non-pure call) | FIXED | `type-system.ts`: new `nonPureFnNames` set populated from function-decls with `fnKind !== "fn"`. Threaded through `checkFnBodyProhibitions`. Regex scans each stmt for `callee(` and cross-references. |
| A4 E-FN-005 (async fn) | FIXED | `ast-builder.js`: extended fn-shorthand guard to accept `async` IDENT lookahead (`async fn`, `async server fn`). Sets `isAsync: true` on the emitted node, which the existing E-FN-005 check at `type-system.ts:4816` picks up. |
| A5 E-FN-008 (lift boundary) | FIXED | `type-system.ts:5114`: added `"lift-expr"` alongside `lift-stmt`/`lift` in kind check. |
| A12 E-TYPE-031 (const annot) | FIXED | `ast-builder.js` const-decl: call `collectTypeAnnotation()` between name and `=`. `type-system.ts` let/const case: unpredicated-primitive literal mismatch check using `extractInitLiteral`. |
| A13 E-TYPE-031 (let annot) | FIXED | Same as A12 (let-decl side). |
| A14 E-LIN-002 (outer in loop) | FIXED (lin-specialist) | Added `for-stmt`/`while-stmt`/`do-while-stmt` cases in walkNode alongside legacy synthetic kinds. |
| B1 E-LIN-002 (closure double) | FIXED (lin-specialist) | New `scanLambdasInExpr` helper walks ExprNode/lambda bodies to count captures. |
| B2 E-LIN-003 (asym match arm) | FIXED (lin-specialist) | Rewrote `match-stmt` case to iterate `node.body` (parser stores arms there, not `node.arms`). Added `match-expr` path. |
| B3 extra E-LIN-001 with E-LIN-003 | FIXED (lin-specialist) | Force-consume on asymmetric path suppresses the cascading scope-exit E-LIN-001. |
| C5 false-positive symmetric match | FIXED (lin-specialist) | Same root cause as B2. |

**Regression tests added:**
- `compiler/tests/unit/gauntlet-s19/lin-checker.test.js` (7 tests, lin-specialist)
- `compiler/tests/unit/gauntlet-s19/fn-prohibitions.test.js` (5 tests)
- `compiler/tests/unit/gauntlet-s19/type-annot-mismatch.test.js` (4 tests)

---

## Triage priorities

- **Cat A** — 19 missing diagnostics represent the bulk of user-facing "silent wrong code accepted" risk. Highest priority.
- **Cat B** — 3 lin-checker miscategorizations. Medium priority; message accuracy matters for user trust.
- **Cat C** — 8 false-positives. Each needs individual investigation; some may be fixture-author errors (e.g. C7/C8 `use` path resolution may require real stdlib files the fixture doesn't create).
- **Cat D** — 6 spec questions; route to spec author before fixing either direction.

---

## Next

1. Confirm Cat A by hand on a few representative fixtures to rule out fixture-author errors before filing as bugs.
2. Fix highest-ROI Cat A diagnostics (fn prohibitions, import, scope — these are broadly invoked).
3. Spec-ruling pass on Cat D.
4. Parallel: start Phase 3 (operators) developer dispatch.
