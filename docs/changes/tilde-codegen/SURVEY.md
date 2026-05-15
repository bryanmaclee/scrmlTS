# Tilde (`~`) codegen lowering — Survey

Date: 2026-05-15
Branch: worktree-agent-a4c05f21a801ee2e1
Base SHA: de84260

## Smoke (pre-fix)

Input (`/tmp/tilde-smoke/smoke.scrml`):
```scrml
function double(x: number) -> number { return x * 2 }
function describe(n: number) -> string { return `value is ${n}` }

${
  double(21)
  const result = describe(~)
}
```

Current output (`smoke.client.js`, broken):
```js
function _scrml_double_1(x) { return x * 2; }
function _scrml_describe_2(n) { return `value is ${n}`; }
_scrml_double_1(21);
const result = _scrml_describe_2 ( ~ );    // SyntaxError at runtime
```

Zero errors / zero warnings from compileScrml — the compiler silently emits broken JS.

## What already works

Tilde infrastructure is partially wired:

1. **`emit-expr.ts:emitIdent` (line 255–292)** has a `name === "~" && ctx.tildeVar` arm at line 272 that returns `ctx.tildeVar` (the generated JS var name). When `ctx.tildeVar` is null, the case falls through to "Plain identifier — pass through" and emits literal `~`.

2. **`emit-logic.ts:emitLogicBody` (line 3171)** pre-scans the node list via `nodeListContainsTildeRef` / `nodeContainsTildeRef`. When `~` is found, it creates a `tildeContext = { var: null }` and threads it through every `emitLogicNode` call.

3. **`bare-expr` case (line 1147)** checks `opts.tildeContext` — when set, it emits `let _scrml_tilde_N = <expr>;` instead of `<expr>;` and writes the var name into `tildeContext.var`. Both the `node.exprNode` Phase 3 fast path (line 1150) and the legacy string path (line 1297) honor this.

4. **`let-decl` / `const-decl` Phase 3 path (lines 1342 / 1432)** routes through `emitExpr(node.initExpr, _makeExprCtx(opts))`. `_makeExprCtx` (line 461) reads `opts.tildeContext?.var` into the EmitExprContext's `tildeVar`. So a const-decl init that references `~` correctly lowers to the generated tilde var IF `tildeContext` is on.

5. **`lift-expr` case (line 2056)** — when `opts.tildeContext` is set AND `liftE.kind === "expr"` AND the lift body does not look like markup (no leading `<`, no trailing `/`), the lift body emits as `${tildeContext.var} = ${liftRhs};` (single mode) or `${tildeContext.var}.push(${liftRhs});` (array mode).

6. **`emitIfExprDecl` / `emitForExprDecl` / `emitMatchExprDecl` (lines 2909 / 2962 / 3017)** each pre-declare their own `_scrml_tilde_N`, set up a local `tildeCtx`, and propagate the var back into the parent context after emission. These are the as-expression bindings (e.g. `const a = if (...) { lift 3 }`).

## What is broken

**Bug**: `nodeContainsTildeRef` at line 3209 only checks STRING fields (`expr`, `init`, `value`). It does NOT walk `exprNode` / `initExpr` structures. Since the Phase 3 fast path means almost every well-formed AST has `exprNode` / `initExpr` populated and the legacy string fields are often missing or stale, the pre-scan reports `tildeUsed = false` for the smoke case.

Specifically for `const result = describe(~)`:
- The const-decl carries `initExpr` (ExprNode for `describe(~)`) — NOT a top-level string `init`.
- The `~` is an IdentExpr inside `initExpr.arguments[0]`.
- `nodeContainsTildeRef` walks the top-level node, finds no string `expr`/`init`/`value` with `~`, returns false.

Result: `tildeContext` is never created, `bare-expr` emits `double(21);` (not `let _scrml_tilde_1 = double(21);`), and `const result = describe(~)` flows through emitExpr with `tildeVar: null`. `emit-expr.ts:emitIdent` sees `name === "~"`, condition `ctx.tildeVar` is falsy, falls through to "Plain identifier — pass through" → emits literal `~`.

**Defensive secondary**: `emit-expr.ts:emitIdent` falls through on a missing tilde var. In a well-formed program this shouldn't happen post-fix, but a defensive emission of a clear comment marker (or `null` with a comment) would prevent future silent-bad-JS bugs.

## Decision matrix

### Scope strategy: `let` shadowing (option b) — already implemented

The existing infrastructure uses `genVar("tilde")` per scope, which produces unique names like `_scrml_tilde_1`, `_scrml_tilde_2`, etc. Each nested `${}` body gets its own `emitLogicBody` invocation with its own `tildeContext`, so the variable names don't collide and JS scoping (via `let`) handles shadowing naturally. NO CHANGE needed here.

The per-scope unique-name strategy is preferred over a single `__scrml_tilde` shadowed via re-declare for two reasons:
1. **Stable debugging.** `_scrml_tilde_3` in the output makes it obvious which scope a value came from.
2. **No re-declare collisions.** A `${}` body that contains both a top-level bare-expr and a nested `${}` would otherwise need careful re-declare ordering; the per-scope-unique strategy is collision-free by construction.

### Generated variable name choice

`_scrml_tilde_<N>` via `genVar("tilde")`. Already used everywhere; keep.

### Lift-handling approach

For value-lift (`if (cond) { lift 3 } else { lift 4 }` used as unbound expression), the if-expr-as-stmt path (NOT the if-expr-as-decl path) needs to be examined. Currently the if-as-expression decl path (line 2909) handles `const x = if (...)` correctly. For the unbound case `if (cond) { lift 3 }; const dbl = ~ * 2;`, this is parsed as if-stmt (statement form), not if-expr (decl form). The lift inside the if-stmt body needs to capture into the tilde var when `tildeContext` is on.

DEFER: The pure if-stmt + unbound-lift case is not in the smoke fixture; it's a follow-up. The brief notes this. The if-as-expression form (consumed in a decl) IS wired.

For accumulation-lift (`<ul>${ for (item of items) { lift <li>${item.name}/ } </>`), the spec §32.6 elision rule means: if `~` is NOT referenced in the `${}` body, no codegen wiring is needed. If `~` IS referenced, every accumulation-lift must additionally capture into `~`. The current `emitLiftExpr` at `emit-lift.js:1585` does NOT honor `tildeContext` for markup-lift. Acceptable scope: defer this case for follow-up; surface in final report.

## Fix plan

### Step 1 — Fix `nodeContainsTildeRef` to walk ExprNode trees

Add structural ExprNode walk to `nodeContainsTildeRef`. Walk `exprNode`, `initExpr`, `condExpr`, `headerExpr`, `iterExpr`, plus arg lists / nested bodies. Recursive descent into ExprNode unions: check `name === "~"` on IdentExpr; recurse into `arguments`, `callee`, `object`, `property`, `left`, `right`, `target`, `value`, `argument`, `consequent`, `alternate`, `body`, `params`, `elements`, `props`, `key`, `headerExpr`, etc.

This is the minimal correct fix. Once the scanner reports `tildeUsed = true` for any ExprNode-bearing tilde reference, the rest of the existing infrastructure activates correctly.

### Step 2 — Defensive: `emit-expr.ts:emitIdent` for orphan `~`

When `name === "~"` and `ctx.tildeVar` is null, emit a clear marker rather than the literal `~` (which becomes a JS SyntaxError or worse — silent bitwise NOT). The type-system fires E-TILDE-001 for the orphan case, so this branch should never be reachable in a well-formed program; the defensive emission is a safety net.

Options:
- (a) `/* ~ orphaned — codegen-fallback */ null` — emits a comment + null literal
- (b) Throw a CGError — but codegen doesn't usually throw on bad inputs
- (c) Emit `null` silently

Pick (a): visible in output, parses as JS, doesn't crash runtime, and a casual reviewer sees the cause.

### Step 3 — Regression tests

Add `compiler/tests/integration/tilde-carry-forward.test.js` covering:
- Smoke case: `fn() ; const x = transform(~)` → captures + consumes; runnable
- Multi-step chain: three unbound calls with consume between
- Value-lift initializes `~` — `if/else { lift a } / { lift b }` form via the as-expression decl path
- Scope shadowing: outer + inner `${}` each get their own `~`
- Runnable: actually execute the JS through Bun and assert results

### Step 4 — Confirm no regressions

Run full `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` and confirm baseline 12,729 pass / 117 skip / 1 todo / 0 fail (per brief / latest).

## Out of scope (deferred)

- Markup accumulation-lift initializing `~` (spec §32.6 elision case 2). Rare pattern; not in smoke. Follow-up.
- Bare-expr-style value-lift (`lift 3;` as a top-level statement initializing `~` outside any decl). Need separate AST inspection — likely already works via the `lift-expr` case at line 2056. Verify in tests.
- If-stmt body containing `lift` initializing `~` for subsequent `~` reads OUTSIDE the decl form. Falls under the "lift inside if" case; the if-as-expression path covers the decl form; the unbound if-stmt form is rarer. Follow-up.
