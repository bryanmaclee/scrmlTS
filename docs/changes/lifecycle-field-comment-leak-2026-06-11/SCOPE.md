# SCOPE — lifecycle-field comment-leak parse bug

**Filed:** S184 (2026-06-11). **Authorized:** user ruling "A, scope to just the parse bug".
**Severity:** real false-positive ERROR on valid scrml (blocks compilation). Zero corpus exposure today (lifecycle feature barely dog-fooded), but hits the canonical SPEC §14.12.1 / PRIMER §6.5 / kickstarter §3.2 examples as printed.

## The bug

A trailing `//` (or `/* */`) comment on a struct-field line carrying a `to`-keyword lifecycle annotation leaks into the field's TYPE annotation string, causing the type to be misclassified as a FUNCTION TYPE → `E-STRUCT-FUNCTION-FIELD` fires (wrongly).

```
passwordHash: (not to string)   // starts absent; transitions to string after hashing
```
→ `E-STRUCT-FUNCTION-FIELD` (WRONG — valid lifecycle field).

## Root cause (PA survey S184)

- `compiler/src/type-system.ts:parseStructBody` (~line 1417): line 1440 extracts
  `typeExpr = trimmed.slice(colonIdx + 1).trim()` — INCLUDING the trailing comment.
- `typeExpr` flows to `resolveTypeExpr(typeExpr, ...)` AND `isFunctionShapedAnnotation(typeExpr)` (line 1459), both with the comment still attached.
- `isFunctionTypeAnnotation` (~line 2087) detects lifecycle via `s.startsWith("(") && s.endsWith(")")` (line 2099). The trailing comment makes `endsWith(")")` FALSE → `isLifecycleWrapped=false`; `findTopLevelArrow(s)` then finds the word "to" inside the comment ("transitions **to** string") → returns true (thin-arrow function type) → misclassified.

## Empirical reproducers (PA, S184) — `/tmp/s184-lifecycle/`
- `t1-comment.scrml` — lifecycle field WITH trailing `// comment` → `E-STRUCT-FUNCTION-FIELD` (the bug).
- `t2-nocomment.scrml` — same WITHOUT comment → parses fine, `E-TYPE-001` tracking works.
- `t3-aboveComment.scrml` — comment on its OWN line above the field → parses fine.
- Narrow trigger: only `to`-keyword lifecycle form + trailing comment containing "to"/"->". Plain fields (`email: string // x`), refinement types (`number(>=18) // x`) tolerate trailing comments fine.

## Fix

Strip a trailing line/block comment from a struct-field type-expr string BEFORE classification/resolution. No reusable comment-strip helper exists in `compiler/src/*.ts` — add a small local helper (comment-aware: do not strip a `//` that lives inside a string literal in the type-expr, though that is near-impossible in a type annotation).

**SURVEY the parallel loci** before deciding the insertion point — a comment containing "to"/"->" after a lifecycle `(A to B)` may leak the same way at: inline-struct field parse (the `parseStructBody`-equivalent for inline `{ ... }` cell types, ~line 2562), fn-return lifecycle annotation, fn-param lifecycle annotation, Shape-1 cell-type lifecycle annotation, schema/channel field. Apply the strip wherever the same comment-leak reproduces. If a single central strip at the entry of `isFunctionTypeAnnotation` + the type-expr extraction covers all loci cleanly, prefer that.

## SCOPE GUARD — "just the parse bug"
- DO fix the comment-leak (strip trailing comment from type-expr at every leaking locus) + add regression tests.
- DO NOT change the E-TYPE-001 tracking semantics.
- DO NOT touch the two known incidentals (out of scope): (1) E-TYPE-001 double-fire on one read; (2) W-LINT-007 ghost false-positive on struct object literals.
- ZERO behavior change except: a type-expr with a trailing comment now strips the comment before classification.

## Follow-on (NOT this dispatch)
After this lands: PA rewrites PRIMER §6.5 + kickstarter §3.2 to the idiomatic cell-form (`<u>: User = {...}` + `@u.passwordHash`); SPEC §14.12.1 example reviewed. That closes the original `g-lifecycle-struct-field-const-notfire` doc-vs-impl gap (Direction 1).
