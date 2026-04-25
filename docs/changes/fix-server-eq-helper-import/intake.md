# fix-server-eq-helper-import — Intake (GITI-012)

**Surfaced:** 2026-04-25, by giti via inbox `2026-04-25-0728-giti-to-scrmlTS-...`.
**Status:** RECEIVED with sidecar; queued for triage.
**Sidecar:** `handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml`
**Priority:** medium — runtime crash at every server fn invocation that uses `==`.

## Symptom

`==` in a server function body emits `_scrml_structural_eq(...)` reference, but `.server.js` doesn't import or inline the helper. Runtime fails with:

```
ReferenceError: _scrml_structural_eq is not defined
  at .../dist/ui/land.server.js:53
```

The helper exists — bundled into `scrml-runtime.js` and used by `.client.js` files. But `.server.js` never imports it.

## Workaround

Author currently using truthy/falsy checks (`!arr.length`, `!!flag`). `===` rejected at compile time with E-EQ-004. No language-level escape hatch.

## Root cause hypothesis (unverified)

Per SPEC §45.4: "`a == b` (primitives) → `a === b` in JavaScript". So primitive equality SHOULD lower to plain `===` (no helper needed). Either:
- (a) The primitive-shortcut isn't applied in the server-side codegen path
- (b) The shortcut is applied client-side but missed server-side
- (c) The struct/enum equality path needs to inject `import { _scrml_structural_eq } from "scrml:runtime"` into the server emit

Most likely it's the codegen path for `==` not detecting the primitive case in server context.

## Reproducer

Sidecar in inbox archive: `handOffs/incoming/read/2026-04-25-0728-repro-08-server-fn-eq.scrml`. Tested against `7a91068`. Triggering shape: `arr.length == 0` in server fn body — `arr.length` is a number primitive, so SPEC §45.4 says it should lower to `===`, not the helper. Codegen apparently falls through to the helper path regardless of operand type.

## Suggested fix scope (conditional)

1. Trace `_scrml_structural_eq` emission site in `compiler/src/codegen/` — likely `emit-expr.ts` or wherever `==` lowers
2. Determine why server emit references the helper without importing it
3. Either: ensure primitive `==` lowers to `===` server-side (cheaper), or inject the runtime import into server emit (more correct for struct/enum case)
4. Add regression test in `compiler/tests/unit/` for server-fn `==` with both primitive and struct operands

## Reference

- giti report: `handOffs/incoming/read/2026-04-25-0728-giti-to-scrmlTS-...`
- SPEC §45 (Equality Semantics)
- E-EQ-001..E-EQ-004 error codes

## Tags
#bug #codegen #server #equality #runtime-import #giti-012 #awaiting-sidecar
