# Pre-snapshot: fix-server-eq-helper-import

**Captured:** 2026-04-25 (S41)
**Base SHA:** 205602d
**Branch:** changes/fix-server-eq-helper-import

## Test baseline (compiler/)

```
7825 pass
40 skip
0 fail
27971 expect() calls
Ran 7865 tests across 370 files. [6.54s]
```

This matches the documented S40 baseline (7,825/0/40/370).

## Pre-existing failures

None — clean baseline.

## Repro confirmation

`handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml` is the bundled sidecar.
Triggering shape: `arr.length == 0` in a `server function` body. Codegen emits
`_scrml_structural_eq(arr.length, 0)` in `.server.js`, but the helper is never imported
or inlined → `ReferenceError: _scrml_structural_eq is not defined` at runtime.

## Confirmed code locations

- `compiler/src/codegen/emit-expr.ts:209-212` — unconditional `_scrml_structural_eq(...)` emit for `==`/`!=`
- `compiler/src/runtime-template.js:1299-1334` — helper definition (chunk: 'equality')
- `compiler/src/codegen/runtime-chunks.ts:101` — `equality: '§45 Structural equality'` chunk marker
- `compiler/src/codegen/emit-client.ts:84,231` — client-side equality chunk detection
- `compiler/src/codegen/emit-server.ts` — does NOT inline runtime helpers (no equivalent chunk plumbing)

## Tags
#pre-snapshot #fix-server-eq-helper-import #giti-012

## Links
- intake: docs/changes/fix-server-eq-helper-import/intake.md
- sidecar: handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml
- spec: compiler/SPEC.md §45 Equality Semantics
