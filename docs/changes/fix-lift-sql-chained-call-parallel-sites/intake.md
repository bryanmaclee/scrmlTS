# fix-lift-sql-chained-call-parallel-sites — Intake

**Surfaced:** S40 2026-04-24, during fix-lift-sql-chained-call implementation.
**Status:** filed, not started.
**Priority:** unknown — depends on whether real source exercises these paths.

## Symptom (latent — not currently triggering)

The chained-call orphan bug fixed in `15a0698` for `lift ?{}.method()` exists in two more sites in `compiler/src/ast-builder.js`:

- **Line ~1918** — `parseOneStatement` BLOCK_REF path (bare `?{}.method()` outside lift)
- **Line ~3421** — `buildBlock` body-loop BLOCK_REF path

Both have the same IDENT-only check for the trailing method name. `?{}.get()` would leave `.get()` orphan because `get` tokenizes as KEYWORD (per `tokenizer.ts:62`), not IDENT.

## Why this isn't actively breaking

No example or test fixture exercises bare `?{}.method()` at top-level statement position outside a `lift` keyword (the current examples use `lift ?{...}.method()` exclusively, which goes through the lift path that was just fixed).

## Suggested fix

Extract the `consumeSqlChainedCalls` helper (added in `15a0698` to ast-builder.js) into a shared module-scope function. Apply at all three call sites: lift+BLOCK_REF (already fixed), parseOneStatement BLOCK_REF (line 1918), buildBlock body-loop BLOCK_REF (line 3421). Add regression tests for both newly-covered paths.

## Reference

`15a0698` — the fix that introduced the helper.
`baccf56` — the KEYWORD-vs-IDENT extension to the helper that caught `.get()`.

## Tags
#bug #ast-builder #latent #pre-existing #sql-chained-call #refactor-opportunity
