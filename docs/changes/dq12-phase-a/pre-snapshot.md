# Pre-Snapshot: dq12-phase-a

Recorded: 2026-04-10 before any code changes.

## Test State
- bun test from compiler/: 5,564 pass, 2 skip, 0 fail
- Regressions pre-existing: none

## Relevant Existing Behavior
- `_rewriteNotSegment` handles only identifier/dotted paths for `is not`, `is some`, `is not not`
- Pattern: `/(@?[A-Za-z_$][A-Za-z0-9_$.]*) is not(?![A-Za-z0-9_$])/g`
- Compound expressions (method calls, function calls, array access, parens) fall through to bare `not → null` rewrite, producing broken JS
- No parenthesized-form support exists

## Tags
#dq12 #pre-snapshot #baseline

## Links
- compiler/src/codegen/rewrite.ts (lines 416-433)
- compiler/tests/unit/not-keyword.test.js
