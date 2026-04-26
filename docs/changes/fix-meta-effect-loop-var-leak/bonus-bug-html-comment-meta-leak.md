# Bonus bug found during Bug O investigation: HTML comment text containing `^{...}` parses as a real meta block

## Status
Reproduces; NOT fixed by Bug O work; needs a separate intake.

## Source
Investigated as part of `fix-meta-effect-loop-var-leak` (Bug O). The
intake repro `2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml`
ends with an explanatory `<!-- ... -->` comment that contains the literal
text `^{ init() }`. The compiler emits TWO `_scrml_meta_effect(...)` calls
where the source has only ONE `^{ init() }` — the second emission
corresponds to the `^{ init() }` inside the trailing HTML comment.

## Reproduction
The pre/post-fix repro on `bug-o.scrml` shows two emissions:
- `_scrml_meta_28` at the real `^{ init() }` position
- `_scrml_meta_55` at offset 1609 — inside `<!-- ... -->` text
  (line 51 col 21)

A variant `bug-o-no-trailing-comment.scrml` (same source minus the
trailing HTML comment) emits exactly ONE `_scrml_meta_effect`. A
variant where the HTML comment is preserved but the literal `^{ init() }`
text inside is removed also emits exactly ONE.

## Root cause (suspected, not yet confirmed)
`compiler/src/block-splitter.js` only handles `//` comments (search:
"comment" — no `<!--` handling). HTML `<!-- ... -->` is processed as
text. When BS encounters `^` inside that text, it treats it as the
entry to a meta block. In a top-level position (after `</program>`
closes the program markup), BS happily produces a `meta`-typed block.

This is a §4.7 (PA-002) class issue but for HTML comments rather than
for `//` comments.

## Why it's a separate intake
Bug O is a CG/meta-checker bug (loop variable leaks into the captured-
scope object). The duplicate-emission is a BS bug: an HTML comment is
not opaque to the block splitter, and a meta sigil inside comment text
produces a real block.

The Bug O fix removes the *content* of the leaking capture, but does
NOT prevent BS from creating a phantom meta block from comment text.
After the Bug O fix, both meta emissions on `bug-o.scrml` have a clean
capture (`items`, `tick`, `init` — no `it`); the second one is still a
phantom but it's syntactically valid JS now.

## Suggested fix scope (for a future intake)
1. Add `<!-- ... -->` handling to BS, treating the entire span (including
   any nested-looking sigils) as opaque text/comment.
2. Decide: does the comment content survive into the AST (as a `comment`
   block type)? Or is it stripped? Either is fine, as long as the
   internal sigils don't open contexts.
3. Add tests:
   - `<!-- ^{ stuff } -->` produces NO meta block
   - `<!-- ?{ select 1 } -->` produces NO sql block
   - `<!-- _ { wasm } -->` produces NO foreign block
   - `<!-- ${ ... } -->` produces NO logic block
   - Nested-looking comment markers (`<!-- <!-- -->` etc.) match
     standard HTML semantics

## Severity
Low when paired with the Bug O fix (phantom emission is now
syntactically valid and references real bindings). High if a comment
contains `^{ throw new Error("..."); }` or any side-effect — that effect
would silently run at module load.

## Worker note
The bug is masked by the Bug O fix in the specific intake repro
(no runtime crash anymore on that file), but it's a real correctness
gap and should be addressed independently.
