# Anomaly Report: lin-batch-c-step1

## Summary

The TS-G wiring fix was partially completed. Two source edits were made to
`compiler/src/type-system.ts`. Integration tests were NOT added because
investigation revealed a deeper structural gap that blocks them from passing —
a gap that predates this batch and is out of scope for a single-concern change.

---

## Source Edits Made

### Edit 1 — Remove dead `linNodes` field from `FileAST` interface (line 299)

The field `linNodes?: ASTNodeLike[]` was removed from the local `FileAST`
interface. `ast-builder.js` never populated this field; confirmed via grep.
This was a dead declaration. Removed cleanly.

### Edit 2 — Swap TS-G entry from `linNodes` to `allLinNodes` with dual-shape fallback

**Original (broken):**
```ts
const linNodes = (fileAST.linNodes as ASTNodeLike[] | undefined) ?? [];
```

**First attempt:**
```ts
const allLinNodes = (fileAST.nodes as ASTNodeLike[] | undefined) ?? [];
```

This was correct directionally but still wrong: `fileAST.nodes` is also
`undefined` at runtime. The CE stage outputs `{ filePath, ast: FileAST, errors }`
wrapper objects, and `runTS` receives these wrappers as its `files` input. Inside
`processFile`, `fileAST` IS the wrapper, so `fileAST.nodes` is always `undefined`.
The actual nodes are at `fileAST.ast.nodes`.

**Final fix:**
```ts
const allLinNodes = (fileAST.nodes as ASTNodeLike[] | undefined)
  ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
  ?? [];
```

This uses the same dual-shape fallback already present in `buildOverloadRegistry`
at line 4060. It is the correct fix for the wiring gap.

---

## Test Behavior Changes

### Before (unit tests — `bun test compiler/tests/unit/type-system.test.js`)

- 234 pass, 0 fail

### After (unit tests)

- 234 pass, 0 fail — **no regressions**

### Integration tests

- 23 pass, 3 fail (pre-existing, unrelated to this change)
- No new integration tests were added (see Deeper Gap section below)

---

## Deeper Gap Found — Out of Scope, Stop and Report

### The lin-decl / lin-ref AST mismatch

**What `checkLinear` expects:**

`checkLinear` is keyed on `lin-decl` and `lin-ref` AST node kinds:

```
case "lin-decl": { lt.declare(node.name) }  // line 3656
case "lin-ref":  { lt.consume(name) }        // line 3670
```

**What `ast-builder.js` actually produces:**

For `lin token = fetchToken()` in a logic block, the parser emits:
- `{ kind: "bare-expr", expr: "lin" }` — the `lin` keyword parsed as a bare expression
- `{ kind: "tilde-decl", name: "token", init: "fetchToken ( )" }` — the variable

The `lin` keyword in a logic block scope is treated as a tilde-decl (`~`
accumulator), not a distinct linear type declaration. The `lin-decl` AST node
kind is NEVER produced by `ast-builder.js`.

Similarly, variable references like `x` in function bodies are stored as strings
in expression fields (`init: "x"`, `expr: "x"`), not as `lin-ref` nodes.
`ast-builder.js` never emits `lin-ref` nodes.

**Result:** Even with the TS-G wiring fix, `checkLinear` will never fire
E-LIN-001 or E-LIN-002 for lin-decl variables in logic blocks because the
required AST node kinds are never produced.

**Exception — function params:** The function-decl case of `checkLinear`
(line 3845) correctly reads `param.isLin: true` from `{ name, typeAnnotation,
isLin: true }` param objects and calls `checkLinear` recursively with
`preDeclaredLinNames`. However, the function body references are strings
(`init: "x"`, etc.) — there are no `lin-ref` nodes to consume the declared
lin params. So the function-decl case would always produce E-LIN-001 (never
consumed) even for correct usage, which is also wrong.

**Scope assessment:** The unit tests (§33–§37, Lin-B1..B5) all use hand-crafted
AST nodes with `lin-decl`/`lin-ref` kinds that the real parser never produces.
This is a structural contract mismatch between `ast-builder.js` and
`type-system.ts`'s `checkLinear`. Fixing it requires either:

1. `ast-builder.js` changes — emit `lin-decl` instead of `tilde-decl` for `lin`
   keyword, emit `lin-ref` nodes for variable references to lin-declared names.
   This is a TAB-stage change affecting the AST shape — **scope creep, out of
   single-concern bounds.**

2. `checkLinear` changes — scan string expression fields for lin variable names
   (similar to how `scanNodeExpressions` does for `mustUseTracker`). This is a
   `type-system.ts` change but modifies `checkLinear`'s core logic — **scope
   creep beyond the TS-G wiring single-concern slice.**

Per task instructions: "If you find scope creep, stop and report rather than expanding."

---

## What Was Completed

1. Removed dead `linNodes` field from `FileAST` interface. Done, committed.
2. Swapped TS-G entry to read actual nodes via dual-shape fallback. Done, committed.
3. Unit tests: 234 pass, 0 regressions. Confirmed.
4. Integration tests: not added — they would fail due to the deeper ast-builder
   structural gap, not due to the TS-G wiring issue.

---

## What Remains

**Lin Batch C Step 2 (proposed):** Fix the AST representation mismatch.

Options to investigate:
- Option A: Change `ast-builder.js` to emit `lin-decl` instead of `tilde-decl`
  for the `lin` keyword, and emit `lin-ref` nodes for references. This is a
  TAB-stage change with downstream effects.
- Option B: Change `checkLinear` to detect lin variables from string expression
  fields (scanning `init`, `expr`, etc. for lin-declared names). This keeps
  ast-builder.js unchanged but makes `checkLinear` more complex.
- Option C: Hybrid — keep `tilde-decl` for `~` accumulator, introduce `lin-decl`
  as a distinct node kind from ast-builder for `lin` keyword variables only.

The choice between options has design implications (§35 vs §32 relationship,
parser contract changes). Recommend a T3 assessment for that step.

---

## Diff Summary

`compiler/src/type-system.ts`:
- Line 299: removed `linNodes?: ASTNodeLike[]` from `FileAST` interface (1 line removed)
- Lines 4261-4275: TS-G entry rewritten — 5 lines removed, 10 lines added

Total: 2 logical changes in 1 file. No other files touched.

---

## Anomaly Count: 1

The deeper gap is an anomaly relative to the change request's diagnosis ("linNodes never populated" → "fix is to use allNodes"). The real gap has two layers:
1. `linNodes` → `allLinNodes` shape fix: **done correctly** (this batch)
2. `lin-decl`/`lin-ref` nodes never emitted by parser: **out of scope, requires follow-on work**

## Status: PARTIAL — deeper gap found, stop and report

The TS-G wiring is fixed. The integration tests cannot pass without follow-on
work in ast-builder.js or checkLinear. Branch is clean; unit tests pass; no regressions.

---

## Tags
#scrmlTS #lin #anomaly-report #lin-batch-c-step1 #type-system #checkLinear #ast-builder

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
- [compiler/src/type-system.ts](/home/bryan/scrmlMaster/scrmlTS/compiler/src/type-system.ts)
- [compiler/src/ast-builder.js](/home/bryan/scrmlMaster/scrmlTS/compiler/src/ast-builder.js)
- [compiler/tests/unit/type-system.test.js](/home/bryan/scrmlMaster/scrmlTS/compiler/tests/unit/type-system.test.js)
