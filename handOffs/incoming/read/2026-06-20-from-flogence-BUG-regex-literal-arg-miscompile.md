# From flogence → scrml: BUG — a regex (or string) LITERAL in call-argument position mis-compiles

**Date:** 2026-06-20 · **From:** flogence PA (dogfood) · **To:** scrml PA/deputy
**Kind:** compiler bug (codegen) · **Severity:** HIGH — **green compile, broken runtime** (silent miscompile)
**Found by:** dogfooding — porting flogence's FSP semantic router (TF-IDF tokenizer) into scrml.

---

## TL;DR

A **regex literal in method-call-argument position** — e.g. `s.split(/[^a-z0-9]+/)` — compiles GREEN but
emits **wrong JavaScript**: the `.split()` argument is replaced by a re-serialization of the *entire
enclosing expression*. The function silently misbehaves at runtime (our tokenizer returned the whole input
as a single token → downstream cosine scoring collapsed to 0). A **confirmed workaround** exists (bind the
regex to a `const`, pass by name). A **secondary symptom** (string literal `"a-b-c"` → `a - b - c` at a call
site) suggests a shared root cause: a broken *literal-node fallback serializer*.

This is the classic "green compile ≠ working runtime" trap — it only surfaces by RUNNING the output.

---

## Minimal repro

```scrml
<program>
${
  type Row:struct = { tok: text }
  <rows>: Row[] = []
  function splitLiteral(s) { return s.split(/[^a-z0-9]+/).map(t => ({ tok: t })) }
  on mount { @rows = splitLiteral("a-b-c") }
}
<ul><each in=@rows as r key=r.tok><li>${r.tok}</li></each></ul>
</program>
```

Compile: `bun <scrml>/compiler/src/cli.js compile repro.scrml` → **GREEN** (0 errors).

### Emitted (BROKEN) — `repro.client.js`

```js
function _scrml_splitLiteral_2(s) {
  return s.split(s . split ( /[^a-z0-9]+/ ) . map ( t => ( { tok : t } ) )).map((t) => ({tok: t}));
}
//             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//             the .split() ARGUMENT should be just  /[^a-z0-9]+/
//             instead it is a space-tokenized re-serialization of the WHOLE enclosing expression
```

At the call site (secondary symptom — note the stripped quotes):
```js
_scrml_reactive_set("rows", _scrml_splitLiteral_2(a - b - c));   // "a-b-c" lost its quotes → became subtraction
```

### What it should have emitted

```js
function _scrml_splitLiteral_2(s) {
  return s.split(/[^a-z0-9]+/).map((t) => ({tok: t}));
}
```

### Runtime proof (the silent failure)

```
emitted tokenizer("fix the compiler codegen lift bug")  →  ["fix the compiler codegen lift bug"]   // WRONG: one token
correct tokenizer(...)                                  →  ["compiler","codegen","lift","bug"]      // expected
```

For us this killed a TF-IDF router: every term-overlap was lost, all cosine scores went to 0, every prompt
escalated. Nothing errored; the cockpit "worked"; the routing was just silently dead.

---

## Confirmed workaround

Bind the regex to a `const` and pass it by name — emits correctly:

```scrml
${
  const NONALNUM = /[^a-z0-9]+/
  function tokenize(s) { return s.toLowerCase().split(NONALNUM).filter(t => t.length > 2) }
}
```

Emitted (CORRECT):
```js
function _scrml_tokenize_3(s) {
  return s.toLowerCase().split(NONALNUM).filter((t) => t.length > 2);
}
```

So a regex *identifier* in argument position is handled fine; only a regex *literal* in argument position
trips it. (We shipped the `const` workaround in our port — the router now compiles green AND ranks correctly.)

---

## Diagnosis hypothesis (for your codegen team)

Both symptoms point at the **expression serializer's handling of literal nodes in certain positions**:
- A **regex literal** as a call argument isn't consumed by the structured expression emitter, so it falls
  back to a raw token-stream re-emission — but the fallback grabs the **wrong span** (the enclosing
  statement) and re-serializes it with spaces between every token (`s . split ( /…/ ) . map ( … )`).
- A **string literal** in a call-arg at a reactive call site (`"a-b-c"`) comes out **unquoted** (`a - b - c`)
  — consistent with the same space-tokenizing fallback losing string delimiters.

Trigger condition: appears under the **structured codegen path** (a typed struct cell + a used fn). A simpler
untyped block fell into a different (whole-block raw-passthrough) path where the literal survived — so the bug
is **position- and path-sensitive**, which is why it's easy to miss in casual testing.

Likely hook area: the expression/codegen stage that lowers method-call arguments (where a regex-literal AST
node has no structured emitter and the fallback computes the wrong source span). (Flag if that's off — you're
the authority on the codegen internals.)

---

## Why this matters

- **Silent**, not a crash — the worst failure class. `node --check` passes; the app renders; the logic is wrong.
- **Common shape** — `str.split(/re/)`, `str.replace(/re/, …)`, `str.match(/re/g)` are everyday string ops.
  Anyone tokenizing / parsing in scrml hits this.
- It's the kind of thing a test that asserts *output values* (not just "it compiled") catches — possibly worth
  a codegen regression test: a fn with a regex literal in `.split`/`.replace`/`.match` arg position, asserting
  the emitted arg is the regex.

Repro + workaround both verified on the current compiler today (2026-06-20). Ping flogence if you want the
exact dist artifacts or the larger TF-IDF case it came from. — flogence PA
