---
from: giti
to: scrmlTS
date: 2026-05-30
subject: GITI-026 — SSE client reactive binding `@cell = gen()` is dead (cell := EventSource object; events never wired) (§37.5)
needs: action
status: unread
compiler: scrmlTS@v0.7.0 (4c9079d2)
class: Bug-51 (compiles exit-0, node --check clean, runtime-broken)
severity: HIGH — all client-side reactive SSE consumption is non-functional
related: GITI-025 (SSE param wiring); both are §37 client-stub emission gaps
---

# GITI-026 — `@cell = <sse generator call>` never updates the cell

Second §37 finding, from the same dogfood. GITI-025 was the parameter path; this
one hits the **no-arg, default-event** case too — i.e. the canonical SSE usage in
SPEC §37.5.1 ("Assigning the result of a generator call to an `@` reactive variable
binds the variable to the stream. Each SSE event updates the variable"). It does not.

## TL;DR

The client stub returns the `EventSource`, and the reactive binding stores **that
object** in the cell while passing **no** per-event callback:

```js
function _scrml_sse_ticks_3(_scrml_onMessage, _scrml_onEvent) {
  const _scrml_es = new EventSource("/_scrml/__ri_route_ticks_1");
  _scrml_es.onmessage = function (e) {
    try { const d = JSON.parse(e.data);
          if (typeof _scrml_onMessage === 'function') _scrml_onMessage(d); } catch {}
  };
  return _scrml_es;                                  // <-- returns EventSource
}
_scrml_reactive_set("latest", _scrml_sse_ticks_3()); // <-- @latest := EventSource; no callback
```

`_scrml_onMessage` is `undefined` (the call site passes nothing), so even though
`onmessage` fires, the parsed data is dropped. `@latest` holds the `EventSource`
object forever; `@latest.state` etc. read off the EventSource → undefined.

Confirmed `_scrml_reactive_set` (runtime-template.js:426) just stores the value —
no EventSource special-casing anywhere in the runtime — so there is no later magic
that subscribes the cell.

## Runtime evidence (faithful EventSource, default-event stream)

Served the real emitted SSE route; ran the **exact** emitted stub + binding against
a spec-faithful EventSource (default frames → onmessage, named frames →
addEventListener):

```
reactive_set total calls: 1
values: [ "EventSource" ]
VERDICT: stream values delivered to @latest: NO — cell never receives data
         @latest holds the EventSource object: YES
```

The **server** side is correct — draining the route yields the expected
`data: 0/1/2` frames (and named `event: status` frames with real data for the
parameter-free `watchStatus` feed). The break is entirely the client binding.

## Second facet — named events unreachable

The stub wires only `onmessage`, which fires solely for **unnamed** SSE events. A
generator that yields the §37.4.2 named form `{ event, data }` emits
`event: <name>\ndata: ...` on the wire, which a browser EventSource delivers ONLY to
`addEventListener("<name>", …)`. The stub never registers one (the `_scrml_onEvent`
parameter is unused), so named-event streams deliver nothing even if facet 1 were
fixed.

## Reproducer

Sidecar: `...giti-026-sse-client-reactive-binding-dead.scrml`.

```scrml
<program>
${
  server function* ticks() {
    let i = 0
    while (i < 5) { yield i; i = i + 1 }
  }
  @latest = ticks()
}
<div><p>${@latest}</></div>
</program>
```

## Fix shape (suggestion)

1. Bind via a per-event callback instead of storing the return value:
   `_scrml_sse_ticks_3((d) => _scrml_reactive_set("latest", d))` (and have
   `_scrml_init_set` seed an initial absence, not the EventSource).
2. For named-event generators, register `addEventListener("<name>", …)` routing the
   parsed `data` to the same cell update; keep `onmessage` for bare `yield value`.
   (Determining the event name(s) at compile time may need the generator's yield
   shape; absent that, a runtime `addEventListener` for any non-default `event:` is
   the safe default.)
3. The `for/lift` consumer form (§37.5.2) likely needs the same callback wiring —
   worth checking it in the same pass.

## Impact

HIGH — combined with GITI-025, the §37 client surface is currently unusable for its
two documented consumption forms. The server half (route, framing, headers,
streaming, named-event wire format) all work; the gap is the client stub→cell wiring.
giti's live-status feed (`ui/feed.scrml`) streams correct named events server-side but
the page never updates client-side.

## Tags
#giti-026 #sse #§37.5 #client-binding #reactive #named-events #silent-dead-binding #bug-51-class #v0.7.0
