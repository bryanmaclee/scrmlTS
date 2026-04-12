# Pre-Snapshot: expr-ast-phase-2-slice-2

**Taken:** 2026-04-11 before any changes
**Branch:** changes/expr-ast-phase-2-slice-2 (just created from main)
**Main head:** ed34c58

## Unit Tests (compiler/tests/unit)

```
4902 pass, 3 fail, 2 skip
```

Pre-existing 3 failures (unchanged from Slice 1):
- Not recorded in detail — same 3 as Slice 1's snapshot.
  Run `bun test tests/unit 2>&1 | grep fail` to identify.

## Integration Tests (compiler/tests/integration)

```
85 pass, 2 fail
```

Pre-existing 2 failures (self-host-smoke):
- `Self-host: tokenizer parity > compiled tab.js exists`
- One other self-host-smoke test

## Type-system Unit Tests (scoped)

```
234 pass, 0 fail
```

## Known Intermediate State from Slice 1

Compiling `lin x = "hello"; useX(x)` (valid usage) currently produces E-LIN-001
because `checkLinear` sees the `lin-decl` node (declares x) but never sees x consumed
(bare-expr nodes carry string form, no lin-ref emitted).

This is the spurious E-LIN-001 that Slice 2 must fix.

## §35.2.1 lin-params state

`function foo(lin x: string) { useX(x) }` currently compiles with E-LIN-001 because:
- `checkLinear` for function-decl seeds linTracker with `x` via preDeclaredLinNames
- Body has `bare-expr { expr: "useX ( x )" }` — no lin-ref node
- checkLinear never sees x consumed → E-LIN-001

This path has never worked E2E. Slice 2 fixes it.
