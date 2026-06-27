# BRIEF — g-nested-template-raw-mangle-ast-builder (ss39 item 2)

**Dispatch:** scrml-js-codegen-engineer · isolation:worktree · model opus
**Branch base:** 5fb41cb9 (current main). Land target: re-integrated onto `spa/ss39` by the sPA.
**Surface:** `compiler/src/ast-builder.js` — nested template-literal handling (LEGACY parse path).

## Bug

A nested template literal inside a `${...}` interpolation is mangled by the ast-builder
BEFORE it reaches codegen:

```
${`inner ${pb()}`}
```

ss22 #4 surfaced this. ss22's `emit-expr` fix was correct AT THE EMIT LEVEL — but there is
a SEPARATE, upstream mangle in the ast-builder: the inner raw template is corrupted during
the ast-builder's `${...}` extraction / template scan, so even a correct emit-expr receives
already-damaged raw text.

## Root (hypothesis — verify by reading the code)

The `${...}` extraction + nested-template scan in `ast-builder.js` (see the region around
**lines ~1926–2030**: the recursive scan with `templateDepth` tracking brace depth inside
template-literal interpolations, comment near "Template literal — scan inside, but re-enable
detection inside `${...}`"). The inner raw template (the `` `inner ${pb()}` `` text) is not
preserved verbatim through to codegen. This is adjacent to the `g-inline-struct-return-type-misparse`
ast-builder return-type surface — possibly the same template/nested-raw scan. Confirm where
the raw is sliced/re-assembled and where a nested backtick run is mis-counted or dropped.

## Required fix

Preserve the inner raw template literal verbatim through the ast-builder to codegen, so that
`${`inner ${pb()}`}` produces the correct nested-template JS. Do NOT regress the existing
single-level `${...}` extraction.

## ADVERSARIAL coverage (S215 — construct ALL, do NOT just happy-path)

1. **Deeper nesting (3 levels):** `${`a ${`b ${x}`}`}` — all levels preserved.
2. **Interpolation with a CALL:** `${`got ${fetchName(id)}`}`.
3. **Interpolation with an AWAIT / async expr:** `${`v ${await load()}`}` (use whatever the
   canonical scrml await shape is — confirm against SPEC/PRIMER).
4. **Multiple nested templates in one interpolation:** `${`${a()} and ${b()}`}`.
5. **Nested template adjacent to markup:** a `${`...${x}...`}` immediately before/after a
   real markup tag on the same line — markup still parses; template raw intact.
6. **Differential:** a PLAIN single-level `${`hi ${name}`}` that ALREADY compiles must
   compile byte-identically after the fix (no regression to the common case).

## Constraints

- **DO NOT touch `compiler/native-parser/`** (frozen). LEGACY-path fix only —
  `compiler/src/ast-builder.js` (+ tests).
- **R26:** verify against REAL `.scrml` source through the FULL pipeline (the mangle is
  upstream, a synthetic AST would miss it). Compile actual `.scrml` repros and inspect the
  emitted JS for the correct nested template literals.
- Add a regression test (real `.scrml` compile-test) covering the primary repro + at least
  the 3-level-nesting and call-interpolation adversarial cases.

## Verification (report ALL in your final message)

1. Primary repro `${`inner ${pb()}`}` emits correct nested-template JS.
2. Each adversarial case 1–6: state pass/fail.
3. Full project test suite GREEN. Report exact command + counts. Do NOT `--no-verify`.
4. Differential: name any pre-existing shape whose behavior CHANGED (expected: none beyond
   the fix; case 6 must be byte-identical).

## Commit discipline

- Commit code + its coupled test in ONE commit.
- Commit incrementally — your agent branch is the crash-recovery anchor.
- Final message MUST report: exact files changed, your agent branch name + tip SHA
  (`git rev-parse --abbrev-ref HEAD` + `git rev-parse HEAD`), test command + counts, the
  adversarial results table, and any shape whose behavior changed.
