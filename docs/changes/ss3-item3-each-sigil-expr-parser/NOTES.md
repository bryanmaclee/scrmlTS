# ss3 item3 — `g-each-body-sigil-root-expr-parser`: `@.` sigil expr-parser gap

**Branch:** `spa/ss3` · §17.7.3 · Root of the ss14 `expr-node-corpus-invariant` each-sigil false-positive.

## Bug (R26 reproduced on HEAD)

The acorn-based `parseExprToNode` (`scrmlAtPlugin`) only consumed `@` followed by
an identifier-start char. The `@.` contextual iteration sigil (`@.` / `@.field`)
therefore surfaced as an escape-hatch (ParseError) — the ExprNode layer could not
STRUCTURE the (valid-scrml) sigil:

```
parseExprToNode("@.")         -> escape-hatch   (was)  →  ident "@."        (now)
parseExprToNode("@.name")     -> escape-hatch   (was)  →  ident "@.name"    (now)
parseExprToNode("@.a.city")   -> escape-hatch   (was)  →  member (@.a).city (now)
parseExprToNode("@.items[0]") -> escape-hatch   (was)  →  index             (now)
```

This was the ROOT of the ss14 classifier each-sigil false-positive; the
`expr-node-corpus-invariant.test.js` each-sigil whitelist (categorize-and-exclude-
from-gate) was a band-aid over this gap.

**Scope note:** the each-body MARKUP path (`${@.name}` inside `<each>`) already
lowered `@.` correctly via a separate `emit-lift` string-rewrite (emits
`_scrml_each_item`), and `@.` outside an `<each>` is enforced by the type-system
`E-SYNTAX-064` token scan — both independent of the acorn parse. The gap was
purely the ExprNode-layer STRUCTURING (the classifier root), not the markup
codegen or the locus enforcement.

## Fix (`compiler/src/expression-parser.ts`)

`scrmlAtPlugin.readToken` now recognises `@.`: a non-destructive inline-ws-
tolerant lookahead from just after `@` (skip space/tab — never a newline); if a
`.` follows, consume `@.` + the trailing ws + an optional immediately-following
field as ONE name token (`@.` → "@.", `@.field` → "@.field"; chained `@.a.b`
reads "@.a" then acorn handles `.b` as member access). Inline-ws tolerance covers
the block-splitter join form `@ . name`. The lookahead fires ONLY when `@` is
followed (past ws) by `.`, so `@name` and `@x.y` (member access on `@x`) are
untouched. readToken never fires inside string/comment interiors (acorn handles
those), so no string-literal corruption.

## Verify

- R26: all `@.` forms (incl. space-padded `@ . name`) now structure (ident /
  member / index / binary), none escape-hatch.
- ss14 classifier: each-sigil escapes **2 → 0** (root closed; total 20 → 18, the
  remaining 18 are pre-existing unrelated).
- Regression: `@name` and `@x.y` unaffected; each-body markup still lowers
  `_scrml_each_item`; `@.` outside each unchanged.
- +9 unit tests (`each-sigil-expr-parser.test.js`). Full suite 24692 pass / 0.

## Residuals (file to PA)

1. **Dead band-aid:** the `expr-node-corpus-invariant.test.js` each-sigil
   classifier branch (categorize + gate-exclude, ~lines 134-143/285/388-396) is
   now always-0. Keeping it MASKS a future `@.`-parse regression (it'd be
   excluded from the >50% gate again). A test-hygiene pass should remove it so a
   regression counts toward the gate. Left in place here (out of the surgical
   parse-fix scope; harmless at count 0).
2. **Native parser (M2.x):** this fix is the acorn-based production
   `parseExprToNode`. Whether the separate native-parser pipeline structures
   `@.` was NOT verified here — worth a dual-pipeline-canary check when the
   native path is activated for this surface.
