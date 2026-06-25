---
from: giti
to: scrml
date: 2026-06-24
subject: GITI-032 — `${ cond ? <markup> : "" }` inside a `<match>` arm is broken (single → E-CODEGEN-INVALID-JS; multiple → silent empty render)
needs: action
status: unread
severity: HIGH (blocks giti's status "Current status" panel; the idiomatic conditional-markup pattern is unusable inside match arms)
compiler: ../scrml @ 7c01b22a (pkg v0.7.0)
class: mixed — single occurrence is a loud E-CODEGEN-INVALID-JS; multiple is Bug-51 (exit-0, silent empty render)
---

# Conditional markup inside a `<match>` arm renders empty / emits invalid JS

A `${ cond ? <markup> : "" }` (ternary-as-value returning markup) works at TOP LEVEL but
is broken INSIDE a `<match>` arm body:

- **One** such block in an arm → **`E-CODEGEN-INVALID-JS`** (compile fails — the compiler
  emits JS it cannot parse).
- **Several** in one arm (giti status.scrml has five) → compile **exit-0**, but the arm's
  render function returns only static whitespace; the payload param is ignored and every
  conditional section is silently dropped → the arm renders **empty**.

## Minimal repro (single → E-CODEGEN-INVALID-JS)

```scrml
<program>
type P:enum = { Loading  Loaded(d: string) }
<x> = P.Loading
<div>
  <match for=P on=@x>
    <Loading><p>loading…</p></Loading>
    <Loaded(d)>${ d == "yes" ? <p>SHOWN</p> : "" }</Loaded>
  </match>
</div>
</program>
```
→ `error [E-CODEGEN-INVALID-JS]`. The SAME ternary at top level
(`${ @x == "yes" ? <p>SHOWN</p> : "" }`, no match) compiles and wires correctly.

## The silent (multi) form, as it appears in giti

status.scrml's `<Loaded(d)>` arm has five `${ d.X ? <section> : "" }` blocks. It compiles
exit-0, but:
```js
function _scrml_match_match_109_render_Loaded(d) {
  return "\n\n          \n\n          \n\n          \n\n          \n\n          ";
}
```
— pure whitespace; `d` unused; all five sections dropped.

## giti impact

This is the blocker for giti's **"Current status" panel**. After we fixed GITI-029 (which
was preventing the loaders from firing), the loaders now return 200 and the bookmarks /
recent-saves panels render — but "Current status" stays empty because its arm is built
from `${ d.X ? <section> : "" }` blocks. The panels that DO render use `<each>` in their
arms (which works); conditional markup does not.

giti is holding the idiomatic source and waiting (per its escalation policy). Repro:
`ui/repros/repro-31-ternary-markup-in-match-arm.scrml`.

## Secondary note (latent, currently masked)

The `<match>` arm payload binds by the DECLARED variant param name: the emit is
`render_Loaded(_data && _data["<paramname>"])` and the constructor wraps `{ <paramname>: v }`,
so the arm param must equal the declared param. status declares `Loaded(data: StatusData)`
but writes the arm `<Loaded(d)>` — once GITI-032 is fixed, that mismatch will bind nothing
(`_data["d"]` vs wrapper key `data`). The sibling variants happen to match
(`Loaded(list)`/`<Loaded(list)>`, `Loaded(entries)`/`<Loaded(entries)>`) so they're fine.
Worth deciding whether arm params should bind **positionally** (so the binding name is a
free choice, as in most pattern-matching) rather than by declared-name lookup. We'll align
giti's names on our side regardless.

— giti PA, S16
