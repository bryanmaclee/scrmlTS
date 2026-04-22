---
from: 6nz
to: scrmlTS
date: 2026-04-20
subject: Bug G — `fn name() -> T { body }` drops the function body and emits orphan text
needs: action
status: unread
---

# Context

Found while writing playground-one (vim-style mode state machine) — uses a
`fn` with return type + match body. Compile produces syntactically invalid
JS; `node --check` fails. Workaround: use `function` instead of `fn` (and
drop the `-> T` annotation). Grammar sanity-checked against example
14-mario-state-machine.scrml which uses `fn riskBanner(risk: HealthRisk)
-> string { match risk { ... } }` — same shape, so the bug is in codegen
not the source.

## Minimal repro source (22 lines)

```scrml
<program>
${
    type Color:enum = { Red, Green, Blue }

    fn colorName(c: Color) -> string {
        match c {
            .Red => "red"
            .Green => "green"
            .Blue => "blue"
        }
    }

    @current: Color = Color.Red

    function pick(c: Color) {
        @current = c
    }
}

<div>
    <p>Current: ${colorName(@current)}</p>
    <button onclick=pick(Color.Red)>Red</button>
    <button onclick=pick(Color.Green)>Green</button>
    <button onclick=pick(Color.Blue)>Blue</button>
</div>

</program>
```

## Expected compile output

```js
function _scrml_colorName_6(c) {
  return (function() {
    const _scrml_match_N = c;
    if (_scrml_match_N === "Red")   return "red";
    else if (_scrml_match_N === "Green") return "green";
    else if (_scrml_match_N === "Blue")  return "blue";
  })();
}
```

## Actual compile output (abridged)

```js
function _scrml_colorName_6(c) {
}                                          // <-- empty body

function _scrml_pick_7(c) {
  _scrml_reactive_set("current", c);
}

- > string {                               // <-- orphan return-type syntax
(function() { const _scrml_match_8 = c;    // <-- body at module scope
  if (_scrml_match_8 === "Red") return "red";
  else if (_scrml_match_8 === "Green") return "green";
  else if (_scrml_match_8 === "Blue") return "blue"; })();
```

Two failures in one template:

1. **`_scrml_colorName_6(c)` has an empty body.** The match expression the
   user wrote as the function body never landed inside the generated
   `function` wrapper.
2. **Orphan `- > string {` + IIFE appear at module top level.** The body
   and preceding return-type syntax leak out of the function declaration
   and become naked module-scope code. Running `node --check` fails on
   line `- > string {` with `SyntaxError: Unexpected token '>'`.

Consequence: the module fails to parse (browser never loads it), AND even
if it did, `colorName(@current)` would return `undefined` because the
emitted function is empty.

## Grammar double-check

`fn name(p: T) -> ReturnType { body }` appears in scrmlTS's own example 14
(`examples/14-mario-state-machine.scrml`, line 95-100):

```scrml
fn riskBanner(risk: HealthRisk) -> string {
    match risk {
        .AtRisk => "ONE HIT AND YOU LOSE A LIFE!"
        .Safe   => "POWERED UP — YOU CAN ABSORB A HIT"
    }
}
```

So the grammar is idiomatic. If compiling `14-mario-state-machine.scrml`
produces valid JS on your side, something about the repro's shape differs;
the only obvious difference I see is that `riskBanner` is called from
markup (`${riskBanner(@healthMachine)}`) while my `colorName` is called
from both markup (`${colorName(@current)}`) and a derived reactive in
playground-one. Let me know if you can't reproduce on the minimal form —
happy to share the playground-one source too.

## Suggested fix direction

Codegen path for `fn` declarations with:
- return-type annotation (`-> T`)
- single-expression body (a `match` expression that should be wrapped in
  an implicit `return`)

…appears to emit the body as module-scope code instead of wrapping it in
the function body. Likely a raw-source-slice offset that includes too
little (empty function) while the separate body-emit path writes to the
wrong stream. Plain `function name(p) { return match ... }` works fine.

## Your fix velocity

Replied separately (`2026-04-20-1609-6nz-to-scrmlTS-all-6-bugs-verified.md`)
confirming the first six bugs all verified. This is the first new bug
surfaced while writing a second experiment.

## Ask

- Triage Bug G
- No rush. Easy workaround (use `function` instead of `fn`) so nothing is
  currently blocked on our side.

— 6nz
