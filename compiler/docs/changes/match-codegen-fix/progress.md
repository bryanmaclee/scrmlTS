# Progress: match-codegen-fix

- [Pipeline] Classification: T2 — multi-file within CG region (emit-control-flow.ts + rewrite.ts + test)
- [Pipeline] Decomposition plan:
    Step 1: emit-control-flow.ts — fix parseMatchArm to handle single-string multi-arm input
    Step 2: rewrite.ts — fix splitInlineArms to split on arm boundaries, fix compact regex capture group
    Step 3: emit-match.test.js — add regression tests for both single-string multi-arm paths
- [Pipeline] Pre-snapshot: bun test run pending (user to run and confirm)
- [Pipeline] Agent dispatched — COMPLETED directly (Agent tool not available)

## Changes Made

### emit-control-flow.ts
- Added `splitMultiArmString(s: string): string[]` helper function (before `emitMatchExpr`)
  - Scans for arm boundary patterns at non-string positions
  - Critical guard: `.UpperCase` only treated as arm start when NOT preceded by identifier char
    (prevents false positives from `Status.InProgress` style property accesses)
  - Handles: `.Variant`, `"str" =>`, `else`, `::Variant`, `_ ->`
- Updated `emitMatchExpr` body loop: calls `splitMultiArmString(trimmed)` before `parseMatchArm`
  - Each body child string is split into individual arm strings first
  - All arms from all split strings are collected correctly

### rewrite.ts
- Added `_splitMultiArmString(s: string): string[]` private helper (same logic as above, duplicated to avoid cross-module coupling)
- Updated `splitInlineArms(armsStr: string): string[]`:
  - Newline-split result with 2+ arms: returns immediately (no change in behavior)
  - Single-line case: calls `_splitMultiArmString` as fallback (BUG-R13-001 fix)
- Fixed compact regex fallback in `rewriteMatchExpr` line 522:
  - OLD: `(compactMatch[3]?.trim() ?? compactMatch[2].trim())`
  - NEW: `compactMatch[2].trim()`
  - `compactMatch[3]` did not exist (only 2 capture groups before the lookahead)

### emit-match.test.js
- Added describe block: "emitMatchExpr — single-child body with all arms in one string (BUG-R13-001)"
  - 4 tests: 3 variant arms, mixed variant+string+else, string+else, and property-access guard
- Added describe block: "rewriteMatchExpr — arms on one line without newlines (BUG-R13-001)"
  - 4 tests: 3 variant arms, 2+else, 2 string arms, property access in result

## Files Modified
- /home/bryan-maclee/projects/scrml8/compiler/src/codegen/emit-control-flow.ts
- /home/bryan-maclee/projects/scrml8/compiler/src/codegen/rewrite.ts
- /home/bryan-maclee/projects/scrml8/compiler/tests/unit/emit-match.test.js

## Status
PENDING: Branch creation, test run, and user review
