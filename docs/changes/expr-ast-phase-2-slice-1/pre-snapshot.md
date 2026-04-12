# Pre-Snapshot: expr-ast-phase-2-slice-1

Captured: 2026-04-11
Branch: main (commit cc85b38)

## Unit Test Baseline

Command: `bun test compiler/tests/unit`
- 4902 pass
- 2 skip
- 3 fail (pre-existing)
- 148 files

## Integration Test Baseline

Command: `bun test compiler/tests/integration`
- 72 pass
- 2 fail (pre-existing: self-host-smoke.test.js tokenizer parity)
- 3 files

## Before-State: lin variable behavior

`lin x = "hello"` compiled to scrml produces:
- AST: bare-expr("lin") + tilde-decl("x", init: '"hello"')
- JS output: tilde-decl emits `const x = "hello"` (from const-decl/tilde-decl handler)
- BUT: the bare-expr("lin") also precedes it — emit-logic.ts line 246 drops bare identifier exprs

Wait — re-examining: tilde-decl uses `const` per the emit-logic.ts handler at line 344.
The actual behavior at line 246: `if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(bareExpr.trim())) return "";`
This matches "lin" (bare identifier) and returns "".

So: `lin x = expr` currently produces:
- bare-expr("lin") → dropped (line 246 of emit-logic.ts)  
- tilde-decl("x", init: expr) → emits `const x = rewriteExpr(expr)` OR
  if x was declared earlier via let-decl, emits `x = rewriteExpr(expr)`

This means lin variables currently DO produce JS output (as tilde-decl, not lin-decl).
The problem is NOT silent dropping — the problem is:
1. They are emitted as tilde-decl (semantically wrong — not tracked by lin enforcer)
2. checkLinear never sees lin-decl nodes so lin enforcement is entirely bypassed

## Pre-existing Failures

Unit (3 fail):
- Not enumerated individually; unchanged from prior sessions

Integration (2 fail):
- self-host-smoke.test.js: "compiled tab.js exists" — pre-existing
- self-host-smoke.test.js: one more tokenizer parity test — pre-existing

## Type-system.test.js baseline

Command: `bun test ./compiler/tests/unit/type-system.test.js`
- 234 pass, 0 fail
- All lin-decl/lin-ref hand-crafted tests pass
