# Dispatch BRIEF — ss25-2: g-inline-struct-return-type-misparse (MED, legacy parser)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **opus** · **change-id:** ss25-2-inline-struct-return-misparse-2026-06-25 · land-on `spa/ss25` (sPA file-delta) · base origin/main `cf9f1109`.

A `fn` with an INLINE STRUCT return type — `fn f() -> { active: int, name: string } { return { … } }` — misparses: the body-splitter mistakes the return-type struct `{ active: int, … }` for the fn BODY, so the real body `{ return … }` becomes a dangling block and `return active;` is emitted standalone → **E-SCOPE-001** on the first field. Workaround: a NAMED return type. Pre-existing on cf9f1109 (surfaced by the endpoint-arm agent).

[STARTUP-VERIFICATION + PATH-DISCIPLINE — standard: pwd starts `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`; toplevel==WORKTREE_ROOT, remote scrml.git; status clean; `bun install`; `bun run pretest`. Edits via Bash on worktree-absolute paths; NEVER `cd` into main; never Edit/Write tool; never `--no-verify`.]

## Confirmed (sPA R26)
`${ function f() -> { active: int, name: string } { return { active: 1, name: "x" } } }` → errors `["E-SCOPE-001"]` (on the first field). A named-return-type variant compiles clean (the workaround).

## Locus (LEGACY front-end — NOT native parser)
The fn-signature/body boundary detection: `compiler/src/block-splitter.js` (how it identifies the fn BODY `{...}` vs a return-type struct `{...}`) and/or `compiler/src/ast-builder.js` fn-signature parse. The splitter sees the FIRST `{` after `->` (the inline struct return type) and treats it as the body, splitting the real body off. The fix must recognize that `-> { … }` is a TYPE EXPRESSION (struct return type) and skip past it to find the real body `{`. Mirror how a NAMED return type (`-> TypeName { body }`) already works — the disambiguation is: after `->`, consume a full type-expr (which may be an inline `{ field: type, … }` struct) BEFORE the body brace.

⚠ **If this turns out to live in the NATIVE parser (`.scrml` mirror / native-parser/*), STOP + escalate (cross-ingestion → ss28).** The list places it on the LEGACY path; verify the fire-site is legacy block-splitter/ast-builder before fixing.

## Fix
Disambiguate the inline-struct return type from the fn body. After `->`, parse a complete type expression (named OR inline-struct `{ k: T, … }` OR union) up to the body-opening `{`; only the brace AFTER the return-type is the body. Don't break: named return types, no-return-type fns (`fn f() { … }`), arrow/lambda forms, and union/array return types.

## Verify (R26 + adversarial) — CONFORMANCE-SENSITIVE
1. The repro `fn f() -> { active: int, name: string } { return {…} }` compiles clean (no E-SCOPE-001); the body + fields resolve; the returned struct is correct.
2. Adversarial: named return type still works; no-return-type fn still works; nested inline struct (`-> { a: { b: int } }`); inline struct + multi-statement body; union return (`-> int | string`); array return (`-> int[]`). A genuine E-SCOPE-001 (real undefined ref) still fires.
3. **FULL `bun run test`** (parser changes shift fixture ASTs). If any within-node/conformance fixture goes over-budget, **re-baseline the within-node allowlist IN THE SAME LAND** (per the ss25 list conformance note). Report baseline + after + any allowlist delta.

## Scope / report
ONLY the inline-struct-return disambiguation. Report: commit SHA · the exact locus (block-splitter vs ast-builder; confirm LEGACY not native) · red→green · adversarial results · full-suite baseline/after + any within-node re-baseline · `git status` clean + agent branch + tip SHA.
