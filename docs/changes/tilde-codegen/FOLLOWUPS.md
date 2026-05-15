# `~` codegen follow-ups (surfaced during S94 example sprinkle)

**Filed:** 2026-05-15 (S94)
**Companion:** `SURVEY.md` (S94 codegen-lowering dispatch survey) +
`ROUND-TRIP-SURVEY.md` (S94 parser round-trip survey).

When PA wrote `examples/24-tilde-pipeline.scrml` and retrofitted
`examples/16-remote-data.scrml`'s `load()` function with `~`, three additional
shape gaps surfaced that the agent's regression suite did not cover. Each is a
genuine compiler gap, not a misuse on PA's part. Filing here so the next
`~`-codegen work picks them up.

The pre-commit-blocking round-trip bug (parseExprToNode reparse without
tildeActive falling through to escape-hatch) is **already closed** at commit
`09cd0c7`. The three gaps below remain open.

---

## Gap 5 — `~` after `!{}` handler doesn't lower

### Shape

```scrml
function loadAndFormat(id: number) -> string {
  loadItem(id) !{
    | .NotFound -> { return "missing" }
    | .Timeout  -> { return "timeout" }
  }
  return format(~)        // bare `~` leaks to JS
}
```

### Symptom

Codegen produces `return _scrml_format_7(~);` — the literal `~` token is in the
emitted JS, which JS parses as bitwise-NOT prefix; the following `)` is then an
expression-expected SyntaxError.

### Probable root cause

The `failable-call with !{}-handler` construct lowers via a different AST path
than a plain `bare-expr` call. The `_tildeActive` flag in ast-builder
(extended in `a10ef65` to fire after bare-expr) does NOT fire after this
construct. The S94 codegen-lowering fix addressed `bare-expr` activation; the
failable-handler-call shape needs an analogous fix.

This is load-bearing for the v0.4 body-split arc described in
`docs/website/roadmap-from-v0.3-2026-05-14.md` ("Surfaces that will likely
change visibility" section) — the canonical post-v0.4 failable pipeline is
exactly this shape:

```scrml
fetchUser(id) !{ | ::NotFound -> { return } }
validateUser(~) !{ | ::Invalid -> { return } }
saveToDB(~) !{ | ::DBError -> { return } }
```

Without this gap closed, the roadmap's framing claim doesn't hold.

### Suspected fix surface

- `compiler/src/ast-builder.js` — extend `_tildeActive` activation to fire
  after the failable-handler-bearing call node kind (whatever AST shape the
  parser produces — likely `bare-expr` containing a `failable-call` with an
  `handler:` field).
- Verify the result-binding side: when the handler is exhaustive and no arm
  returns, the failable call DOES produce a value (the success path). That
  value should initialize `~` analogously to a plain bare-expr call.

### Est: ~2-4h (parser-side flag extension + regression tests)

---

## Gap 6 — `~` at `<program>` direct-child position silently dropped

### Shape

```scrml
<program>
  function step1(n: number) -> number { return n + 10 }
  function step2(n: number) -> number { return n * 3 }

  step1(2)                       // SILENTLY DROPPED from output
  const result = step2(~)        // SILENTLY DROPPED from output
  const piped = step2(7)         // survives (no ~ involved)
</program>
```

### Symptom

The compiled JS contains the function declarations and the `const piped`
binding, but **the `step1(2)` and `const result = step2(~)` lines are missing
entirely from the output**. Downstream `${result}` in markup fires
`E-SCOPE-001: Undeclared identifier 'result'` because the binding was dropped.

Wrapping in an explicit `${}` logic block makes the same code work:

```scrml
${
  step1(2)
  const result = step2(~)        // lowered correctly: let _scrml_tilde_N = step1(2); const result = step2(_scrml_tilde_N);
}
```

### Probable root cause

The v0.3 program-as-container logic-default-mode auto-lift at `<program>`
direct-child position handles function decls + simple const decls, but the
`~`-bearing const-decl + preceding bare-call pair isn't recognized by the
BS-layer's auto-lift detection. Sibling to the BS-batch v2 residuals (commit
`2201556`) — the BS layer has a finite set of recognized lift patterns and
this shape isn't in it.

### Suspected fix surface

- `compiler/src/block-splitter.js` — the auto-lift detection at `<program>`
  direct-child needs to recognize bare-call-followed-by-const-with-~ as a
  pair-to-lift. Today it may be auto-lifting them independently (or dropping
  them) when the BARE_EXPR + CONST_DECL pair is wrapped by the same `${}`.
- Alternatively: `compiler/src/ast-builder.js` BARE_DECL_RE handling for
  text fragments at `<program>` direct-child may need to recognize this
  specific pattern.

### Workaround in `examples/24-tilde-pipeline.scrml`

The example wraps the `~` chain in an explicit `${}` block:

```scrml
${
  step1(2)
  const result = step2(~)
}
```

This produces correct codegen. Once Gap 6 closes, the explicit wrapper can be
dropped to match the v0.3 canonical shape.

### Est: ~4-6h (BS-layer pattern extension + regression tests + corpus migration)

---

## Gap 7 — pure consume+reinit chain self-references

### Shape

```scrml
step1(2)              // ~ = 12
step2(~)              // SHOULD consume previous ~, reinit ~ to 36
const final = ~       // SHOULD be 36
```

### Symptom

Codegen:

```js
let _scrml_tilde_5 = _scrml_step1_3(2);
let _scrml_tilde_6 = _scrml_step2_4(_scrml_tilde_6);   // self-reference — uses _scrml_tilde_6 in its OWN initializer
const final = _scrml_tilde_6;
```

The "unbound call that BOTH consumes the previous `~` AND becomes the new `~`"
pattern produces a self-referencing `let` declaration. At runtime,
`_scrml_tilde_6` is `undefined` in its initializer, so `step2(undefined)` runs
with NaN-producing semantics; `final` is whatever `step2(undefined)` returned
(NaN, "NaN", etc. depending on the function).

### Probable root cause

The codegen emits a fresh `_scrml_tilde_<N>` variable for every unbound call
that has tilde-tracking active. When that call's argument references `~`
(the PREVIOUS one), the codegen substitutes the NEW variable name (the one
being declared), not the previous one. Off-by-one in the tilde-variable
assignment order.

### Suspected fix surface

- `compiler/src/codegen/emit-logic.ts` — the per-statement tildeContext setup
  needs to track "previous `~` name" vs "new `~` name being initialized in
  this statement." The current code uses the same name for both.

### Workaround

Use bound intermediates (the agent's Test 2 pattern):

```scrml
step1(5)
const a = step2(~)          // bound consume; safe
step3(a)                    // unbound, reinitializes ~
const result = ~            // consume final ~
```

### Est: ~2-3h (codegen tildeContext sequencing fix + regression tests)

---

## Cumulative status of `~` codegen surface

The S94 dispatches landed:
- **Codegen-lowering** (`d37b1f5`) — smoke case + two-link bound-consume chain +
  function-body pipeline + scope-shadowing + tree-shake.
- **Parser round-trip** (`09cd0c7`) — `parseExprToNode → emitStringFromTree →
  parseExprToNode` is now stable for all `~` shapes; pre-commit corpus invariant
  test passes for `~` examples.

Tests cover those shapes (19 round-trip + 5 codegen-lowering). Gaps 5/6/7
above + the four S94 SURVEY-deferred items (E-TILDE-001/002 not firing on
ExprNode-form `~` reads; unbound if-as-expression parser gap; accumulation-
lift not honoring tildeContext; function-body value-lift untested) are the
remaining surface.

**Adopter-facing impact:** the v0.4 body-split arc framing in
`docs/website/roadmap-from-v0.3-2026-05-14.md` depends on Gap 5 closing
(failable pipelines are the canonical v0.4 example). Gap 6 limits where
adopters can write `~` (today: only inside explicit `${}` and inside fn
bodies; not directly under `<program>` despite the v0.3 default-logic-mode
expectation). Gap 7 limits chain length to two links unless intermediate
bindings are used.

**Recommendation:** dispatch a second `~`-codegen pass when v0.3.x patch arc
drains and v0.4 body-split design lands — Gaps 5+6+7 are a natural bundle for
that work and would close the surface end-to-end.

---

## Cross-link

- `SURVEY.md` — S94 codegen-lowering dispatch survey
- `ROUND-TRIP-SURVEY.md` — S94 parser round-trip survey
- `compiler/tests/integration/tilde-carry-forward.test.js` — codegen-lowering regression suite
- `compiler/tests/integration/tilde-roundtrip.test.js` — round-trip regression suite
- `docs/website/roadmap-from-v0.3-2026-05-14.md` "Surfaces that will likely change visibility" section
- `examples/24-tilde-pipeline.scrml` — adopter-facing showcase (uses Gap 6 workaround)
- `examples/16-remote-data.scrml` — retrofit using the smoke shape (no gaps hit)
