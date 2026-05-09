# C9 progress — Cross-field validator dependencies (L14)

## 2026-05-08T00:00Z — startup verification

- pwd, git toplevel, git status: ✓
- bun install: ✓
- bun run pretest: ✓
- baseline: 10176 pass / 60 skip / 1 todo / 0 fail (after ignoring single flaky run)

## 2026-05-08T00:05Z — survey

Wrote SURVEY.md. Verdict: REFINEMENT.

Found a real silent bug: cross-field validators referencing `@compound.field`
(member-expr form, e.g., the §55.11 worked example `eq(@signup.password)`)
subscribe to the WRONG dep key — they subscribe to the compound parent
(`"signup"`) instead of the actual child (`"signup.password"`). Result:
validator does NOT re-fire when the cross-field cell changes.

Root cause: `forEachIdentInExprNode` walks MemberExpr's `object` only (yields
the base ident `@signup`), but for the `@-prefixed` cell-reference form, the
qualified path is the intended dep target.

C7's existing unit tests use stub AST that bypasses the real parser shape
(`{kind: "ident", name: "@signup.password"}` synthetic vs. real
`{kind: "member", object: {kind: "ident", name: "@signup"}, property: "password"}`),
so the bug was hidden.

Affected sites:
- `compiler/src/codegen/emit-validators.ts:178-184` — valueDeps collection
- `compiler/src/codegen/emit-validators.ts:lowerOneArg` — thunk read-key
- `compiler/src/dependency-graph.ts:1980-1999` — B10 Phase 3 validator-reads edges

## 2026-05-08T01:00Z — runtime correctness verified (survey update)

End-to-end runtime probe disproved my initial bug-hypothesis. Cross-field
reactivity DID work via transitive dirty propagation through the compound
parent (which subscribes to all its children). Subscribing the validator
runner to the compound parent caused over-fires (validator fired on every
sibling-field write) but not silent failures.

Updated SURVEY.md §0 (TL;DR) + §3 (verified) + §3.5 (precision concern) +
§6 (in-scope = precision + tests, not correctness fix).

## 2026-05-08T01:30Z — walker added (commit `c731aeb`)

Added `forEachQualifiedCellRefInExprNode`, `forEachQualifiedCellRefInValidatorArg`,
`forEachQualifiedCellRefInValidators` to `compiler/src/validator-arg-parser.ts`.

Recognizes:
- `IdentExpr("@X")` standalone → `"X"`
- `MemberExpr(IdentExpr("@X"), "Y")` chain → `"X.Y"`
- Multi-level chains → fully qualified path
- Method call `@x.method(...)` → receiver chain only (excludes the method name)
- Multi-receiver `@a.b.method(...)` → lifts `"a.b"` (excludes `.method`)
- Binary, ternary, array, object descents work normally

Adds-only — `forEachIdentInExprNode` + standard ident walkers untouched.

## 2026-05-08T01:45Z — TDD red phase + green phase (commit `7520898`)

Added `compiler/tests/unit/c9-cross-field-deps.test.js` — 35 tests across
9 sections:
- §C9.0 walker direct invocation
- §C9.1 precise subscribe key (real-parse shape)
- §C9.2 direct qualified-path read in thunk
- §C9.3 multiple cross-field args (each precise)
- §C9.4 method-call call-form (receiver chain only)
- §C9.5 binary expr operand chains
- §C9.6 array literal element chains
- §C9.7 top-level @ident back-compat
- §C9.8 relational predicate inner expr
- §C9.9 runtime end-to-end (cross-field re-fire + sibling non-fire precision)

Updated `emit-validators.ts`:
1. `valueDeps` collection uses `forEachQualifiedCellRefInValidators` →
   precise qualified-path subscribes.
2. `lowerOneArg` pre-rewrites @-rooted member chains into synthetic
   `IdentExpr("@X.Y")` so `emitIdent` emits `_scrml_reactive_get("X.Y")`
   directly. Method-call shape preserved by `rewriteCalleeChain`.

Tests: 10176 → 10211 (+35 / 0 regressions).

## 2026-05-08T01:55Z — done

C9 SHIPPED. Final SHA pending; covered:
- SPEC §55.11 cross-field validation precision: validators subscribe to the
  exact cell-reference, not the compound parent.
- §55.11 "predicate args beyond bare cell-reference" (call/binary/array
  forms) all wire correctly.
- Indirection-via-dirty-prop-chain (the prior implementation's correctness
  vehicle) is now an unused fallback; the precise path is the canonical
  emission.

Deferred (per SURVEY §6 item 4): B10 dep-graph `validator-reads` edge
wiring still resolves to base @-ident only. Cycle detection works at
compound-parent granularity, sufficient for v0.2.0; precise indexing is
architectural (B-step), not C9 (codegen).
