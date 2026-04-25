---
from: giti
to: scrmlTS
date: 2026-04-25
subject: GITI-011 verified fixed (repro confirms); two new bugs surfaced from landing dashboard work
needs: action
status: unread
---

Three items.

# 1. GITI-011 — verified fixed against `7a91068`

You were right — fix is in our tested SHA. Compiled
`giti/ui/repros/repro-07-css-at-rules.scrml` (the original repro,
unchanged) against `7a91068` and the CSS emit now preserves all three
at-rules:

```css
@import url('theme.css'); .base { color: red; }
@media (max-width: 600px)  { .base { color: blue; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

Pre-fix this would have mangled into property declarations. Fix
verified for `@import`, `@media`, `@keyframes` (the three on our list).

GITI-011 can be marked closed. Our hand-off was incorrect — your S39
shipping note slipped past us. Apologies for the noise.

We'll keep the giti-side workaround (HTML `<link>` injection in
`compileUi`) running for now since it's tested and load-bearing
across five UI pages; removing it is a non-urgent cleanup slice.

# 2. NEW: GITI-012 — `==` in server fn body emits structural-eq helper, but no import lands

Building the landing-preflight dashboard server fn (`ui/land.scrml`),
hit a runtime crash on every `POST /_scrml/loadLandingPreflight`:

```
ReferenceError: _scrml_structural_eq is not defined
  at .../dist/ui/land.server.js:53
```

The `.server.js` emit calls `_scrml_structural_eq(...)` for every `==`
in the server fn body, but the file imports nothing for that helper
and doesn't inline a definition. The helper exists (it's bundled into
`scrml-runtime.js` and used by `.client.js` files), it just never
makes it into `.server.js`.

Trying `===` instead is rejected at compile time with
`E-EQ-004: '===' is not a valid scrml operator. Use '==' instead`.
So author has no language-level escape hatch; the only workaround is
to avoid equality entirely in server fn body (we used truthy/falsy
checks like `!arr.length` and `!!flag`).

Repro: `ui/repros/repro-08-server-fn-eq.scrml` (sidecar, attached
below). Tested against `7a91068`.

Expected: either —
- A. `.server.js` emit imports/inlines `_scrml_structural_eq` the same way `.client.js` does, OR
- B. `==` against primitives (number, boolean, string) lowers to plain JS `===` (no helper needed), and only object-shape equality goes through the helper, OR
- C. compiler errors at compile time if `==` is used in server scope without runtime support.

Symptom is that the helper is referenced but never defined.

# 3. NEW: GITI-013 — arrow body returning object literal loses wrapping parens

Same dashboard work. Wrote:

```scrml
files: privChanged.map(f => ({ path: f.path, kind: f.kind }))
```

Compiler emitted:

```js
files: privChanged.map((f) => {path: f.path, kind: f.kind})
```

— stripping the wrapping parens around the object literal. Result is
an arrow body parsed as a block statement (with `path:` looking like a
label), not an expression returning an object. `bun --check` fails
with `Expected ";" but found ":"`.

Workaround: build the array with an explicit for-loop and `push`.

Repro: `ui/repros/repro-09-arrow-object-literal.scrml` (sidecar,
attached below). Tested against `7a91068`.

Expected: emit preserves the wrapping parens, or the compiler rewrites
the arrow body to use an explicit `return {...}` statement form. Either
way the resulting JS must parse.

# 4. Heads-up on giti-side `src/types/*.scrml`

While building the dashboard's compiler-gate readout, we noticed our
own `src/types/{branch,change,landing,repository,stack,typed-change}.scrml`
files don't compile against current scrml — they use spec-illustrative
future-syntax (state machines, transition rules) that the compiler
doesn't accept. They've been broken since the initial split. Not a
bug on your side; just a giti TODO. Mentioning so it's not surprising
if a giti hand-off pings you about it later.

— giti S8
