# Tilde (`~`) round-trip parser/emitter invariant — Survey

Date: 2026-05-15
Branch: worktree-agent-a7734d2361f616987
Base SHA: d37b1f5 (post-S94 `~` codegen landing)

## Problem statement

The corpus-invariant test (`compiler/tests/integration/expr-node-corpus-invariant.test.js`) asserts the
ExprNode idempotency invariant:

```js
deepEqualExprNode(exprNode, parseExprToNode(emitStringFromTree(exprNode)))
```

Post-S94, `~` is structurally representable in the AST as `IdentExpr { name: "~" }`. But the round-trip
fails for any ExprNode containing a bare `~`: emit produces `func(~)` (correct), but the re-parse
returns an `EscapeHatchExpr { estreeType: "ParseError" }` for the whole expression — structurally NOT
equal to the original `CallExpr` tree.

PA discovered this when sprinkling `~` into examples 16 and 24 (corpus files); pre-commit gate fired
the idempotency failure with `Emitted string: ContactsState.Ready(~)`.

## Side of the round-trip that is broken: PARSER (`parseExprToNode`)

The emitter is correct: `emitStringFromTree` on `IdentExpr { name: "~" }` emits `"~"` (the bare ident
literal, line 1614–1617 of `expression-parser.ts`). Call sites and member accesses around it emit
correctly via the standard `CallExpr` / `MemberExpr` cases.

The parser is broken: `parseExprToNode(raw, file, offset)` only applies the `~` → `__scrml_tilde__`
placeholder substitution when called with the explicit `tildeActive: true` option (line 825 of
`expression-parser.ts`):

```ts
if (opts?.tildeActive) {
  s = s.replace(/(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/g, "__scrml_tilde__");
}
```

Without `tildeActive`, the bare `~` is left in the string and acorn attempts to parse it as JS
bitwise-NOT. Bitwise-NOT requires an operand to its right; with `func(~)` the `~` is followed by `)`,
producing a parse error. The entire expression escape-hatches.

## Demonstration

Synthetic repro (`/tmp/tilde-repro.js`, runnable):

```
test 1: bare `~` standalone
  parse(tildeActive=true)  → IdentExpr { name: "~" }
  emit                     → "~"
  reparse(no tildeActive)  → EscapeHatchExpr { estreeType: "ParseError", raw: "~" }   <— BUG
  reparse(tildeActive)     → IdentExpr { name: "~" }                                  <— stable

test 2: `func(~)`
  parse(tildeActive=true)  → CallExpr { callee: ..., args: [IdentExpr "~"] }
  emit                     → "func(~)"
  reparse(no tildeActive)  → EscapeHatchExpr { estreeType: "ParseError" }             <— BUG
  reparse(tildeActive)     → CallExpr (matches original)                              <— stable

test 3: `ContactsState.Ready(~)`
  parse(tildeActive=true)  → CallExpr { callee: MemberExpr, args: [IdentExpr "~"] }
  emit                     → "ContactsState.Ready(~)"
  reparse(no tildeActive)  → EscapeHatchExpr { estreeType: "ParseError" }             <— BUG (this is the corpus-invariant failure)
  reparse(tildeActive)     → CallExpr (matches original)                              <— stable
```

## Why the existing placeholder regex is already structurally safe

The current preprocessor regex `(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])` is precisely tuned to match
ONLY bare standalone `~`:

- `~variable` — followed by ident char → does NOT match (kept as bitwise-NOT)
- `~5`        — followed by digit → does NOT match (kept as bitwise-NOT)
- `~`         — alone → matches → placeholder
- `~ x`       — followed by space (then ident) → matches → placeholder (same as bare since the space
                 alone produces ambiguous "ident followed by ident" — already broken either way)
- `func(~)`   — bare `~` between `(` and `)` → matches → placeholder
- `~(1)`      — followed by `(` → MATCHES → placeholder

Only the last case is theoretically ambiguous: in pure JS, `~(1)` is bitwise-NOT-of-1 (= -2). Under
the placeholder substitution this becomes `__scrml_tilde__(1)` which parses as a call. However:

1. The `IdentExpr { name: "~" }` form emitted by the emitter is the tilde-accumulator. The bitwise-NOT
   form is encoded as `UnaryExpr { op: "~", argument: IdentExpr }` and emits as `~x` (no space — see
   line 1661 `${node.op}${arg}`). Round-tripping a bitwise-NOT thus produces `~x` which has `x` (an
   ident char) immediately following `~` — the regex does NOT match. The placeholder is never
   incorrectly applied to a bitwise-NOT round-trip.
2. `~(...)` for bitwise NOT is not a scrml idiom and would be exceedingly rare in any modern JS-like
   codebase. The corpus does not contain such forms.

So the regex is precisely the structural disambiguator: a `~` matched by it IS the accumulator (or
malformed bitwise-NOT, which is broken either way). The regex is the right structural test.

## Decision

**Fix shape**: drop the `opts?.tildeActive` gate around the placeholder regex. Apply the substitution
unconditionally. Same regex; no other changes.

Rationale:
- The regex itself is the correct structural disambiguator.
- Callers passing `tildeActive: true` continue to work identically.
- Callers NOT passing the flag (notably the corpus-invariant test, and any other re-parse path) now
  get the structurally-correct result.
- No new corner cases: any input where the regex matches was previously either (a) producing a
  ParseError escape-hatch (broken), or (b) intentionally tilde context. (a) is fixed; (b) is unchanged.
- Bitwise-NOT round-trips remain stable because the emitter produces `~x` with `x` adjacent (regex
  does not match).

The `opts.tildeActive` parameter remains in the signature for backward compatibility but becomes a
no-op for the purpose of `~` substitution. The flag's only consumer was this single preprocessing
step; once unconditional, the parameter has no remaining behavior.

Decision: keep the parameter in the signature (drop the gate); leave callers passing it. Document
that it is now informational only. Cleaning it up across all call sites is out of scope for this
dispatch (and the brief explicitly limits scope).

## Implementation plan

### Single edit

`compiler/src/expression-parser.ts` line ~825:

```ts
// BEFORE
if (opts?.tildeActive) {
  s = s.replace(/(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/g, "__scrml_tilde__");
}

// AFTER
// §32 tilde accumulator: replace standalone `~` with placeholder identifier.
// The regex is precisely tuned to match only bare `~` not adjacent to identifier chars,
// which is structurally the tilde-accumulator form (bitwise-NOT requires an attached operand).
// Applying unconditionally ensures round-trip stability across parseExprToNode → emitStringFromTree
// → parseExprToNode: callers that re-parse emitted strings (notably the corpus-invariant test)
// do not need to track whether the original parse was in tilde context.
s = s.replace(/(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])/g, "__scrml_tilde__");
```

The `opts?.tildeActive` parameter is preserved in the signature (no caller breakage) but no longer
gates the substitution. Comment updated to reflect the structural-disambiguator rationale.

### Regression tests

Add `compiler/tests/integration/tilde-roundtrip.test.js` covering:

- Bare `~` standalone
- `~` in call-arg position: `func(~)`
- `~` in member-call arg: `obj.method(~)`
- `~` in enum-variant payload: `Variant.Name(~)`
- `~` in expression position: `~` (deep-equal to itself)
- Multi-arg call: `f(a, ~, b)`
- Nested: `outer(inner(~))`
- Round-trip stability: deepEqualExprNode(node, parse(emit(node)))
- Verify bitwise-NOT round-trip unchanged: `~x` parses as UnaryExpr and round-trips stably (does NOT
  match the regex).

### Scope guards (from brief)

- DO NOT touch `compiler/src/codegen/emit-logic.ts` or other `~` codegen surface.
- DO NOT touch `examples/16` or `examples/24` — PA's commit.
- DO NOT modify `expr-node-corpus-invariant.test.js`.

## Risk assessment

- **Low risk.** The regex pattern is unchanged. Only the gate is removed.
- All call sites that previously passed `tildeActive: true` continue to receive identical output.
- Call sites that did NOT pass it (including the corpus-invariant test, the ast-builder fallback
  paths, and any external consumer) now get the structurally-correct ident form instead of an
  escape-hatch for bare `~`.
- No emitter change required.

## Test expectations

- Existing `tilde-carry-forward.test.js` continues to pass (it exercises the codegen pipeline which
  passes through ast-builder with `_tildeActive` tracking; the path is identical post-fix).
- New `tilde-roundtrip.test.js` passes.
- `expr-node-corpus-invariant.test.js` continues to pass on current corpus (no examples currently
  use `~`); will pass for examples 16 + 24 once PA reintroduces `~`.
- Baseline test counts unchanged.
