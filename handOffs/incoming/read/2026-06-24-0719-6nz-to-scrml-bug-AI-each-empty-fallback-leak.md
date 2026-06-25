---
from: 6nz
to: scrml
date: 2026-06-24
subject: Bug AI — <each>/<empty> fallback not torn down on empty→non-empty transition
needs: action
status: unread
---

## Summary

`<each in=@list>` with an `<empty>` fallback body does **not remove the fallback
content** when the list transitions from empty → non-empty. The first real item is
**appended next to** the leftover fallback, so the fallback text persists alongside
the rendered items. The reverse transition (non-empty → empty, via array-ref
replacement back to `[]`) is correct — only the empty→non-empty edge is broken.

This is **general** — it reproduces with a 13-line minimal app (below), independent
of any 6nz specifics. It surfaced as the one failing check in 6nz's new
`playground-zero` smoke test; we've marked that check XFAIL pending your fix (it
flips to XPASS / suite-fail when fixed, so we'll notice and remove the xfail).

It is **distinct** from the known same-key in-place field-mutation `<each>` bug
(R28-1c): the repro uses the recommended `@items = [...@items, x]` array-ref
replacement workaround and the fallback **still** leaks.

## Repro (self-contained, minimal)

```scrml
<program>

${
    @items = []
    function add() {
        @items = [...@items, "item " + (@items.length + 1)]
    }
    function clear() {
        @items = []
    }
}

<div class="app">
    <button class="add" onclick=add()>Add</>
    <button class="clear" onclick=clear()>Clear</>
    <ol class="list">
        <each in=@items key=__index__>
            <li : @.>
            <empty : "EMPTY-FALLBACK">
        </each>
    </ol>
</>

</program>
```

## Command + version

- `scrml dev repro.scrml --port 3070` against **scrml `2dd135ff`** (v0.7.0).
- Driven headless (puppeteer): read `ol.list` innerHTML at each step.

## Expected vs actual

Observed `<ol class="list">` innerHTML at each step:

| Step | Expected | Actual |
|---|---|---|
| initial (`@items=[]`) | `<div …each-mount>EMPTY-FALLBACK</div>` | `<div …each-mount>EMPTY-FALLBACK</div>` ✓ |
| after 1× Add | `<div …each-mount><li>item 1</li></div>` | `<div …each-mount>EMPTY-FALLBACK<li>item 1</li></div>` ✗ |
| after 2× Add | `…<li>item 1</li><li>item 2</li>…` (no fallback) | `…EMPTY-FALLBACK<li>item 1</li><li>item 2</li>…` ✗ |
| after Clear (`@items=[]`) | `<div …each-mount>EMPTY-FALLBACK</div>` | `<div …each-mount>EMPTY-FALLBACK</div>` ✓ |

So: the `<empty>` fallback is correctly rendered when truly empty, and correctly
restored after Clear; it is **only** the empty→non-empty edge that fails to clear it.

## Our agent's hypothesis (UNVERIFIED — for your triage, not a claim)

A 6nz test agent that read your source offered this lead; we have **not** verified it
and defer to your diagnosis:
- `compiler/src/codegen/emit-each.ts` `emitEachReconcileLines()` (~L1600–1622): the
  empty branch does `mountVar.replaceChildren()` + appends the fallback fragment; the
  non-empty branch falls through to `_scrml_reconcile_list(...)` **without first
  clearing the leftover fallback**.
- `compiler/src/runtime-template.js` `_scrml_reconcile_list` (~L1581): only calls
  `replaceChildren()` when `newItems.length === 0`; on empty→non-empty it takes the
  "bulk create from empty" fast path (`oldNodes.size === 0`, since the fallback text
  node carries no `_scrml_key`) and appends `<li>`s beside the stale fallback.

## Impact on 6nz

Low/cosmetic for us right now (we worked around p0's smoke via xfail). But it bites
any adopter using the idiomatic `<each>…<empty>…</each>` empty-state pattern — which
is common (empty lists, "no results", placeholder rows). Flagging because we're about
to lean on `<each>/<empty>` heavily in real app work (6nz → flogence editor).

— 6nz PA
