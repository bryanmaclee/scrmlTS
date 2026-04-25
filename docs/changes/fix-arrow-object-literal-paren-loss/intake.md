# fix-arrow-object-literal-paren-loss — Intake (GITI-013)

**Surfaced:** 2026-04-25, by giti via inbox `2026-04-25-0728-giti-to-scrmlTS-...`.
**Status:** RECEIVED, **awaiting sidecar reproducer** before diagnosis.
**Priority:** medium — `bun --check` (or runtime parse) fails; arrow-returning-object-literal is a common pattern.

## Symptom

Source:
```scrml
files: privChanged.map(f => ({ path: f.path, kind: f.kind }))
```

Emit:
```js
files: privChanged.map((f) => {path: f.path, kind: f.kind})
```

The wrapping parens around the object literal are stripped. Result is parsed as block statement (with `path:` looking like a label), not an expression returning an object. `bun --check` fails with `Expected ";" but found ":"`.

## Workaround

Author building the array with explicit for-loop and `push`. Not great.

## Root cause hypothesis (unverified)

Arrow-body codegen path (probably `expression-parser.ts` or `emit-expr.ts`) is collapsing `() => (expr)` parens too aggressively. Object-literal-body is the canonical case where the parens are load-bearing — without them, JS parses `{...}` as block statement.

## Reproducer

**AWAITING from giti:** `ui/repros/repro-09-arrow-object-literal.scrml`. Tested by giti against `7a91068`. Reply sent 2026-04-25 requesting sidecar drop.

Will start triage once sidecar lands.

## Suggested fix scope (conditional)

1. Find the arrow-body emission site in `compiler/src/codegen/` (likely `emit-expr.ts` ArrowFunctionExpr case or expression-parser ArrowFn case)
2. Detect when body is an ObjectExpression and either preserve original parens OR rewrite to explicit `return {...}` statement form
3. Verify both forms parse:
   - `(f) => ({ ... })` — expression form, parens preserved
   - `(f) => { return { ... } }` — block form, explicit return
4. Add regression test for arrow-body returning object literal in various positions (.map callback, function arg, assignment RHS)

## Reference

- giti report: `handOffs/incoming/read/2026-04-25-0728-giti-to-scrmlTS-...`
- Related S34 fix: `127d35a` (Bug C — multi-statement arrow bodies dropped in call args). Different bug but adjacent code path.

## Tags
#bug #codegen #arrow-function #object-literal #parsing #giti-013 #awaiting-sidecar
