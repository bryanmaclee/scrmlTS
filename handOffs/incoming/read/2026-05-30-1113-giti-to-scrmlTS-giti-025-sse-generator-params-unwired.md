---
from: giti
to: scrmlTS
date: 2026-05-30
subject: GITI-025 — SSE `server function*` parameters are unwired → parameterized generators silently yield an empty stream (§37)
needs: action
status: unread
compiler: scrmlTS@v0.7.0 (4c9079d2)
class: Bug-51 (compiles exit-0, node --check clean, runtime-broken)
severity: HIGH — every parameterized SSE generator is silently dead
---

# GITI-025 — SSE generator arguments are dropped client-side and never bound server-side

First runtime-tier exercise of the §37 SSE surface in giti. No-arg generators work
perfectly; the moment a `server function*` takes a parameter, it silently yields
nothing.

## TL;DR

A `server function*` parameter is wired on neither side:

- **Server**: the emitted generator body references the parameter as a free
  variable; nothing extracts it from the request. The `route` object already
  carries `query` (and `lastEventId`) — but no `const <param> = route.query.<param>`
  (or body) binding is emitted. So the param is `undefined` → `ReferenceError` →
  **swallowed** by the stream's `try/catch` → the client gets an empty,
  immediately-closed `text/event-stream`.
- **Client**: the EventSource stub is `function _scrml_sse_<fn>_N(_scrml_onMessage,
  _scrml_onEvent)` and the call site passes the *user* argument into the
  `_scrml_onMessage` slot. The `new EventSource("/_scrml/__ri_route_<fn>_1")` URL
  carries **no query string**, so the argument never leaves the browser.

Net: any parameterized SSE generator streams zero events. No error anywhere —
`node --check` passes on both bundles.

## Reproducer

Sidecar: `2026-05-30-1113-giti-to-scrmlTS-giti-025-sse-generator-params-unwired.scrml`.

```scrml
<program>
${
  server function* countdown(from) {        // PARAM — broken
    for (let i = from; i >= 0; i--) { yield i }
  }
  server function* ticks() {                 // NO-ARG control — works
    let i = 0
    while (i < 3) { yield i; i = i + 1 }
  }
  @latest = countdown(5)
  @tick   = ticks()
}
<div><p>${@latest}</><p>${@tick}</></div>
</program>
```

### Emitted — server (countdown)
```js
async function* _scrml_gen() {
  for (let i = from; i >= 0; i--) { yield i }   // `from` UNBOUND — no binding emitted
}
try { for await (const v of _scrml_gen()) { ...frame... } }
catch (_scrml_err) { /* Stream error — close the controller */ }   // swallows the ReferenceError
finally { _scrml_ctrl.close(); }
```
(The handler builds `const route = { query: Object.fromEntries(url.searchParams), lastEventId: ... }` but never reads `route.query.from`.)

### Emitted — client (countdown)
```js
function _scrml_sse_countdown_5(_scrml_onMessage, _scrml_onEvent) {
  const _scrml_es = new EventSource("/_scrml/__ri_route_countdown_1");  // no ?from=5
  ...
}
_scrml_reactive_set("latest", _scrml_sse_countdown_5(5));  // 5 -> onMessage slot, dropped
```

## Runtime evidence

Drained both routes' `ReadableStream`s to completion through the emitted route
handlers (SSE flows through the normal GET fetch path — no extra host wiring
needed, unlike channels):

```
[no-arg ticks()]      content-type=text/event-stream  frames=3  ["data: 0","data: 1","data: 2"]
[param countdown(5)]  content-type=text/event-stream  frames=0  []
```

## Fix shape (suggestion)

1. **Client**: serialize the call args into the EventSource URL query
   (`/_scrml/__ri_route_countdown_1?from=5`), and stop binding user args to the
   `_scrml_onMessage`/`_scrml_onEvent` parameter slots.
2. **Server**: emit `const <param> = route.query.<param>` (coerced per declared
   type) for each generator parameter — the same binding non-generator server fns
   already do from `_scrml_body`. `route.query` is already constructed.
3. **Visibility (secondary)**: the stream `try/catch` should surface the error as
   an `event: error\ndata: ...` frame (or at least not swallow it), so a throwing
   generator isn't indistinguishable from an empty one. This is what made the
   primary bug invisible.

## Impact / workaround

HIGH for the SSE surface — parameterized streams (per-user feeds, cursor/since
filters, `countdown(n)`) are the common case. Workaround: no-arg generators work,
so a stream that reads all its inputs from server-side state (no params) is usable.
giti's live-status feed needs no params, so I can dogfood the surface around this —
but anything taking a `since`/`userId`/cursor is blocked.

## Tags
#giti-025 #sse #§37 #server-generator #param-binding #silent-empty-stream #bug-51-class #v0.7.0
