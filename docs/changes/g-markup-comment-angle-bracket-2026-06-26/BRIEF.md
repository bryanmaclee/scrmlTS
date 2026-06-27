# BRIEF — g-markup-comment-angle-bracket-parsed-as-tag (ss39 item 1)

**Dispatch:** scrml-js-codegen-engineer · isolation:worktree · model opus
**Branch base:** 5fb41cb9 (current main = origin/main + ss38). Land target: re-integrated onto `spa/ss39` by the sPA.
**Surface:** `compiler/src/ast-builder.js` — markup-section comment scanner (LEGACY parse path).

## Bug

A markup-section line comment whose text contains angle-bracket fragments has those
fragments consumed by the tag scanner as opening tags, corrupting downstream structure.

```scrml
// inside a markup body:
// NOT a <form> — use the <each> helper instead
<match on=@x>
  <some=.A>...</some>
</match>
```

Symptom: `<form>` / `<each>` inside the `//` comment get tokenized as opening tags →
the AST structure is corrupted → an UNRELATED `<match>` far below fires
`E-MATCH-PARSE-001` + `E-MATCH-NOT-EXHAUSTIVE`. The diagnostics point at the wrong place
(the `<match>`), masking the real cause (the comment).

Contrast: JS/logic-section `//` comments are INERT to angle brackets (they're handled by
the normal JS comment path). Only **markup-section** `//` comments leak.

## Root (hypothesis — verify at the right pipeline stage)

The markup-section comment scanner does not suppress angle-bracket tag tokenization for
the remainder of a `//` line. Locate where markup-body text is scanned for tag openers
and ensure a `//` (line) comment masks the rest of that line from the tag scanner.

## Required fix

Suppress tag tokenization for the rest of a markup-section `//` line so the comment text
is treated as inert trivia (per SPEC §27.1 trivia/comments). `// foo <bar> baz` inside a
markup body must NOT parse `<bar>` as a tag.

## ADVERSARIAL coverage (S215 — construct these, do NOT just happy-path)

1. **Block comments:** `/* ... <form> ... */` inside a markup body — does the BLOCK
   comment scanner have the same leak? Check and fix if so. (The list explicitly flags
   this.)
2. **Multiple tag-fragments per comment line:** `// a <x> b <y> c </z>` — all must be
   inert.
3. **Comment at end of a line that began with real markup:** `<div> // not a <span>` —
   the real `<div>` must still parse; only the post-`//` text is inert.
4. **A `//` inside a string/attribute value** must NOT be treated as a comment
   (`<a href="//cdn.x">`). Differential: confirm a URL-ish `//` in an attribute still
   compiles unchanged.
5. **`/* */` on a single line followed by real markup:** `/* <x> */ <div>` — `<div>`
   still parses.

## Constraints

- **DO NOT touch `compiler/native-parser/`** (frozen per the compiler-reimagining ruling).
  This is a LEGACY-path fix only.
- **R26:** verify the fix against REAL source through the full pipeline (not a synthetic
  AST) — the bug is upstream at the scanner, so a hand-built AST would miss it. Compile
  an actual `.scrml` repro and confirm the spurious `E-MATCH-*` diagnostics disappear AND
  the comment text does not appear as tag nodes in the AST.
- Add a regression test (a real `.scrml` compile-test) for the primary repro + at least
  the block-comment and attribute-`//` adversarial cases.

## Verification (report in your final message)

1. Primary repro compiles clean (no spurious `E-MATCH-*`).
2. Each adversarial case behaves correctly (state which pass/fail).
3. Full project test suite green (`npm test` or the repo's test command) — report the
   exact command + counts. Do NOT `--no-verify`.
4. Differential: name any pre-existing shape whose behavior CHANGED (expected: none
   beyond the fix).

## Commit discipline

- Commit code + its coupled test in ONE commit (no transiently-red window).
- Commit incrementally in your worktree; your branch is the crash-recovery anchor.
- Final message MUST report: files changed, the agent branch name + tip SHA, test
  command + counts, adversarial results, and any shape whose behavior changed.
