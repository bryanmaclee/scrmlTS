# Pre-Snapshot: bug-h-rettype-fix

## Test Baseline
- bun test: 7,498 pass / 40 skip / 0 fail / 27,078 expects
- Date: 2026-04-24

## Bug Description
Function with return-type annotation (`function name(arg: T) -> ReturnType { match ... }`)
compiles to IIFE without leading `return`, causing the function to always return `undefined`.

## Compiled Output (before fix)
```js
function _scrml_colorName_3(c) {
  (function() {           // <-- missing `return`
  const _scrml_match_4 = c;
  if (_scrml_match_4 === "Red") return "red";
  ...
  })()
}
```

## Expected Output
```js
function _scrml_colorName_3(c) {
  return (function() {    // <-- `return` present
  const _scrml_match_4 = c;
  if (_scrml_match_4 === "Red") return "red";
  ...
  })()
}
```

## Root Cause Analysis
- `emitFnShortcutBody` in `emit-logic.ts` only applies tail-expression implicit return
  when `fnKind === "fn"` (line 1182)
- `function` declarations with `-> ReturnType` have `fnKind: "function"`, so the implicit
  return is never applied
- The AST builder discards the return-type annotation without recording it on the node

## Fix Plan
1. ast-builder.js: Add `hasReturnType: true` to function-decl nodes when `-> T` or `: T` is present
2. emit-logic.ts: Extend `emitFnShortcutBody` to apply implicit return when `hasReturnType` is set
3. emit-functions.ts: Route `hasReturnType` functions through `emitFnShortcutBody` path
4. Add tests

## Tags
#bug-h #pre-snapshot #rettype

## Links
- [reproducer](../../../handOffs/incoming/2026-04-22-0940-bugH-function-rettype-match-drops-return.scrml)
