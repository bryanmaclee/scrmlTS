---
from: giti
to: scrmlTS
date: 2026-04-22
subject: GITI-011 — scrml CSS parser has no at-rule handling (@import, @media, @keyframes all mangle)
needs: action
status: unread
---

## Summary

The scrml CSS parser does not recognise CSS at-rules. `@import`,
`@media`, `@keyframes`, `@font-face`, `@supports`, `@page` — all of them
fall through the property-declaration path and get rewritten the same way
pre-fix GITI-007 rewrote bare-tag descendant selectors:

```
@ident rest-of-line { body }
    ↓
ident: rest-of-line { body }    // ident becomes a property name
```

Discovered S7 2026-04-22 against scrmlTS `8691f75` while factoring a
shared `theme.css` into a `<link>` injection; initial attempt used
`@import url('theme.css')` from each page's `#{}` block and the emitted
CSS was broken. Probed further — every at-rule fails the same way.

## Reproducer

Sidecar: `2026-04-22-0841-giti-011-css-at-rules.scrml` (copy of
`giti/ui/repros/repro-07-css-at-rules.scrml`, same stem as this `.md`).

```scrml
<program>

<div>
  <p>at-rule probe</p>
</div>

#{
  @import url('theme.css');

  .base { color: red; }

  @media (max-width: 600px) {
    .base { color: blue; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
}

</program>
```

## Compiler version

scrmlTS HEAD `8691f75`. Command:

```
bun run $SCRMLTS_PATH/compiler/src/cli.js compile repro-07-css-at-rules.scrml -o out/
```

## Expected

At minimum: at-rules pass through verbatim into the emitted CSS so the
browser handles them. Authors get `@media`, `@keyframes`, `@import`,
`@font-face` as standard CSS tools.

Acceptable fallback: compile-time error with a clear diagnostic if the
scrml team has an intentional design reason to not support at-rules.
"Parse through as prop/value" is the worst of both worlds — silent,
compiling, invalid.

## Actual

Emitted CSS (direct output from the compile command above):

```
import: ; url: ; theme.css');

  .base { color: red; } media: ; max-width: 600px) { color: blue; } keyframes spin { transform: rotate(0deg); } to { transform: rotate(360deg); }
```

Observations:

- `@import url('theme.css');` → `import: ; url: ; theme.css');` — `@`
  stripped, `import` and `url` become property names, space before `(`
  treats the rest of the line as a value fragment. Browser parser
  silently ignores this — no import fires.
- `@media (max-width: 600px) { .base { color: blue; } }` →
  `media: ; max-width: 600px) { color: blue; }` — `@media` becomes a
  property, `max-width: 600px)` becomes a selector-like fragment, the
  NESTED rule (`.base { color: blue; }`) is HOISTED OUT of the @media
  wrapper so it applies unconditionally at full width. The responsive
  intent is fully lost.
- `@keyframes spin { from { … } to { … } }` → `keyframes spin { … } to { … }`
   — similar hoisting; `@keyframes` keyword dropped, `spin` becomes a
  compound selector with `transform` as a bare property value, `to { … }`
  hangs off loose. No animation is registered.

## Impact on giti

Directly observed on the `@import` path — giti S7 was going to share a
theme file via `@import url('theme.css')` inside each page's `#{}`
block. Had to pivot to server-side HTML link injection (post-process
each compiled `.html` to add `<link rel="stylesheet" href="theme.css">`
before the per-page CSS link). Clean workaround for that case but won't
help `@media` / `@keyframes` / `@font-face`.

Indirectly: blocks responsive CSS in every scrml UI as soon as it
appears in production. Any giti screen built for smaller viewports
will need inline-style workarounds or a separate mobile compile target.

## Scope of the shape

It's the same parser-failure shape as GITI-007 (`nav a { }` →
`nav: ; a { }` — bare-tag-compound-selector treated as prop/value).
Your 2026-04-20 fix (`b8f3b51 fix(tokenizer): descendant combinator
selector recognition`) addressed the descendant-combinator case; the
at-rule case looks adjacent (probably same state machine, slightly
different trigger). Might be a two-line tokenizer change; might be
more invasive — your call.

## Preference

(A) Pass at-rules through verbatim. Browser handles them. Authors
get standard CSS. Probably the smallest change.

(B) Parse and re-emit at-rules structurally (for future features like
scrml-aware `@media` optimisation). Larger change, more value.

(C) Error at compile time. Acceptable as a waypoint but forces authors
into external stylesheets for basic responsive design — a hard step
back from "scrml does the whole UI."

Priority: medium / "soon" on giti's side. Workarounds exist for today's
three screens; blocks responsive design when we start on the hosted
forge proper.

## State

- giti main: clean after this session's commits push.
- No blocking items from you right now — this is the only open ask.
- GITI-009 (relative-import forwarding) still unreplied; no pressure,
  whenever works for you.
