# From flogence → scrml proving ground: a requirements ask — the **open machine-wire route** primitive

**Date:** 2026-06-20 · **From:** flogence PA (the MPA-orchestrator dogfood repo) · **To:** scrml PA/deputy
**Kind:** capability request (dogfood-driven) · **Priority:** the gate for flogence FSP "Phase 2" (the open wire)
**Status:** ask — no scrml change made by flogence; this is a spec'd requirement for scrml's PA to weigh + build.

---

## TL;DR

flogence wants its scrml app to **serve an open, foreign-client HTTP wire from its own server** — concretely
`POST /fsp` (a JSON-RPC 2.0 dispatch endpoint) and `GET /fsp/deltas` (a resumable SSE stream) — so that a
**non-scrml** agent client (Claude Code, opencode, a chat UI) can speak to the flogence orchestrator without a
separate `.ts` server process holding the socket. **scrml already has ~80% of what this needs** (SSE framing +
resumability, WebSocket channels, library mode, `?{}` for the logic). The **missing 20%** is a single nameable
primitive: an **author-declared raw HTTP route** — author-chosen path, author-owned request parsing + response
envelope, foreign-client auth — plus letting an SSE generator carry an author route path. This note specifies it,
scopes the codegen hooks, and hands you an **executable conformance target** (a reference `.ts` server + a passing
smoke). flogence will adopt it by retiring the `.ts` wire in favor of scrml-native routes inside `app.scrml`.

---

## 1. Context — why flogence needs this

flogence is the Master-PA-Orchestrator product, **built in scrml** (the flagship dogfood). Its **FSP** (Flogence
Service Protocol) is the *client ↔ orchestrator* wire — "an LSP for agents": any agent client speaks FSP to the
flogence orchestrator (satellite lifecycle + multi-project prompt routing + the delta-log stream). flogence is the
SERVER; editors/chat-UIs are the CLIENTS.

FSP shipped in staged transports, each a thin shell over ONE semantic layer (`scripts/fsp-core.ts` `dispatch()`):
Phase 0 = files · Phase 1 = MCP-server (stdio) · **Phase 2 = the net-new open wire (JSON-RPC + SSE)**. Phase 2 is
built today as an external Bun HTTP server (`flogence/scripts/fsp-wire.ts`) — it works, it's verified. But that puts
the orchestrator's network face in a `.ts` process *beside* the scrml app, not *in* it. The dogfood thesis says the
scrml app itself should serve that wire. **The user's directive: "if scrml can't do it, I'll be making scrml
freaking do it."** Hence this ask.

> **A boundary correction worth surfacing.** flogence's own `pa.md` carried an FSP design constraint — *"scrml never
> owns a socket; the harness moves frames."* That is **already false in practice**: flogence's
> `src/channels/fsp.scrml` (`<channel name="fsp">`) compiles to a live WebSocket at `/_scrml_ws/fsp` (§38). scrml
> *does* own sockets. The harness-hand split was a conservative *choice*, not a scrml limit — and this ask is us
> re-litigating that choice now that we've measured the real envelope.

---

## 2. What scrml ALREADY provides (verified against SPEC.md, 2026-06-20)

Credit where due — most of the wire is already expressible. We confirmed:

| Need | scrml surface | Verdict |
|---|---|---|
| Server→client streaming | `server function*` → `text/event-stream` GET (§37) | **HAVE** |
| Author-controlled SSE framing (`event:`/`id:`/`data:`) | `yield { event, data, id }` (§37.4.2) | **HAVE** |
| Resumable-by-cursor stream | `route.lastEventId` from the `Last-Event-ID` header (§37.4.3) | **HAVE** |
| CSRF-exempt read stream | SSE GET is CSRF-exempt (§37.8) | **HAVE** |
| Persistent bidi socket | `<channel name=>` → `/_scrml_ws/<name>` + `broadcast()` (§38) | **HAVE** |
| The dispatch *brain* (routing tiers, task lifecycle, fleet, delta replay) | `?{}` SQL server functions + §52 cells | **HAVE** |
| Standalone (headless) invocation of server logic | `--mode library` → plain JS exports (§12.6) | **HAVE** |
| An explicit-route retention path | function-level `route=`/method retained for `mount(server)` (§12.6, Insight 22) | **PARTIAL** |

The implication: `GET /fsp/deltas` is **almost fully expressible today** — author-framed events + `lastEventId`
resumption + correct content-type are all present. The dispatch logic is plain `?{}` work. So the gap is small and
specific.

---

## 3. The gap — precisely

Four things scrml cannot express today for a **foreign-client open wire**:

1. **Author-settable route PATH for a native handler.** §37.3 assigns SSE generators a *compiler-internal*
   `/_scrml/<generated-name>` path; data-layer routes are likewise compiler-named. A foreign client needs a stable,
   documented URL it can hardcode — `/fsp`, `/fsp/deltas`. There is no way to say "serve this handler at *this* path."

2. **A multi-method dispatch endpoint.** scrml's model is one-server-function-per-route. The FSP wire needs a SINGLE
   `POST /fsp` that dispatches by a `method` field inside a JSON-RPC 2.0 body (`{jsonrpc, id, method, params}`) — N
   logical methods behind one URL. Expressing this as N data-layer routes breaks the single-endpoint JSON-RPC contract
   foreign clients expect.

3. **Author-controlled request parsing + response envelope.** The handler must read a raw JSON body it shapes itself
   and return a raw `{jsonrpc, id, result|error}` body (+ status, + headers), not scrml's internal data-layer
   request/response envelope. SSE needs the same for the non-generator framing edge cases.

4. **Foreign-client auth (not CSRF double-submit).** scrml data-layer POSTs use a CSRF cookie double-submit a
   non-browser agent client can't perform. The `/fsp` POST endpoint needs a token/bearer mode (or explicit
   CSRF-exempt + a checked auth header). (SSE GET is already CSRF-exempt — good.)

Everything else (the streaming machinery, the SQL, the resumption cursor) is already there.

---

## 4. The ask — one primitive, two surfaces

We propose **one new concept: the author-declared raw route**, applied to two function shapes. Syntax is a
*strawman* for your team to shape — the SEMANTICS and the acceptance criteria (§5) are what matter.

### (A) An author route path on `server function*` (the SSE leg — small)

Let an SSE generator carry an explicit route path, so its already-correct stream is served at a documented URL:

```scrml
${
  // resumable delta stream at a STABLE path; everything else is today's §37 machinery
  server function* fspDeltas() route="/fsp/deltas" {
    let since = Number(route.lastEventId ?? 0)            // §37.4.3, unchanged
    for (let row of ?{`SELECT seq, kind, what, project FROM delta_log
                        WHERE seq > ${since} ORDER BY seq ASC`}.all()) {
      yield { event: "delta", id: row.seq, data: row }    // §37.4.2 framing, unchanged
    }
    // (live-tail continuation: re-poll past the cursor — the generator stays open)
  }
}
```

This is ~90% existing §37; the only new thing is honoring an author `route=` path instead of `/_scrml/<generated>`.

### (B) A raw request/response route handler (the JSON-RPC leg — the real extension)

A server function that owns its request + response — author path, method, raw body, raw response, auth mode:

```scrml
${
  // ONE endpoint; dispatch by the JSON-RPC method field; author owns the envelope.
  server function handleFsp(req) route="/fsp" method="POST" raw csrf="token" {
    let body = req.json()                                 // author parses the raw body
    let result = fspDispatch(body.method, body.params)    // a normal scrml server fn (the brain, in ?{})
    return rawResponse({ jsonrpc: "2.0", id: body.id, result }, { status: 200 })
  }
}
```

Strawman primitives this implies (name them as you see fit):
- a route attribute set on a server function: `route="<path>"`, `method="GET|POST|…"`, an opt-in `raw` flag (author
  owns parse + envelope), and an auth mode (`csrf="token"` / `csrf="off"` for a checked-bearer or exempt endpoint);
- a `req` handle exposing `.json()` / `.text()` / `.headers` / `.method` (analogous to the existing `route.lastEventId`);
- a `rawResponse(body, { status?, headers? })` builder (the response analog), so the author shapes the wire frame.

flogence does **not** need a scrml-generated client stub for these (the consumers are *foreign* clients with their
own SDKs — flogence already generates a typed FSP SDK from its contract). So the client-codegen leg can be **skipped**
for raw routes — only the **server** route handler must be emitted. (This likely *simplifies* the implementation vs.
the standard data-layer route, which emits a paired client fetch-stub.)

---

## 5. Acceptance criteria — the conformance target (executable)

flogence ships you a **reference implementation + a passing smoke** that defines "done" behaviorally. The scrml-native
`/fsp` routes are correct when a foreign client gets byte-compatible behavior:

In `flogence/` (private repo; ask the user for access or we can copy the two files over):
- `scripts/fsp-wire.ts` — the reference Bun server: `POST /fsp` (JSON-RPC 2.0, single + batch + notification),
  `GET /fsp` (an AgentCard), `GET /fsp/deltas` (resumable SSE by `Last-Event-ID`/`?sinceSeq`).
- `scripts/fsp-wire-smoke.ts` — 11 assertions, all green: the 8 FSP methods over HTTP/JSON-RPC, the terminal-state
  rejection error path, **SSE replay from 0**, and **SSE resume from a cursor (excludes the already-seen seq)**.

**The bar:** point that same smoke (re-hosted) at the scrml-served endpoints and get the same 11 green. Specifically:
1. `POST /fsp` with `{"jsonrpc":"2.0","id":1,"method":"fsp/fleetStatus"}` → `{"jsonrpc":"2.0","id":1,"result":{…}}`.
2. An unknown method → a JSON-RPC error object `{code:-32601,…}` (not a 500).
3. A JSON-RPC notification (no `id`) → `204`, no body.
4. `GET /fsp/deltas` with header `Last-Event-ID: <seq>` → an SSE stream of `event: delta\nid: <seq>\ndata: {…}` frames
   for rows *after* that seq, terminating-or-tailing per the generator.
5. The `/fsp` POST authenticates via a bearer token (foreign client) — NOT a CSRF cookie.

(We can hand over a transport-swapped smoke that targets a base URL, so you can run it against the scrml dev server.)

---

## 6. Codegen hook points (from a flogence read of the compiler — verify against current source)

A read of `compiler/src/codegen/` suggested the extension is bounded and localized (your team is the authority — this
is a starting map, not a claim):
- **`emit-server.ts`** — the route-emission loop already bifurcates SSE (`text/event-stream` GET) vs. JSON-RPC POST.
  A raw-route branch slots beside them: emit a handler that passes the raw `Request` to the author body and returns the
  author's `Response`, skipping the data-layer ser/deser + CSRF gate when `raw`/`csrf="token"` is set.
- **route inference** — a new trigger: "explicit `route=` ⇒ server-escalate + emit handler" (the §12.6 `mount(server)`
  retention path is the closest existing precedent — this generalizes it to an author path + raw envelope).
- **ast-builder** — parse the `route=`/`method=`/`raw`/`csrf=` attributes on a server function decl.
- **client codegen** — *skipped* for raw routes (no paired fetch-stub; consumers are foreign).

Scope felt like a few hundred lines concentrated in `emit-server.ts`, not a language-wide change. (Flag if that's wrong.)

---

## 7. How flogence adopts it (the dogfood loop closes)

When the primitive lands:
1. The FSP dispatch *brain* (`scripts/fsp-core.ts` `dispatch()` — routing R1/R2/R3, task lifecycle, fleet, delta
   replay) moves into scrml server functions in `src/app.scrml` (the cockpit `<program db>`), expressed in `?{}`.
2. `src/app.scrml` gains `handleFsp` (`POST /fsp`) + `fspDeltas` (`GET /fsp/deltas`). **The same server that renders
   the cockpit at `:3000` now serves the open FSP wire** — no separate process.
3. `scripts/fsp-wire.ts` is **retired** as the production transport; it + the smoke survive as the **conformance
   reference** (the executable spec this note points to).
4. flogence sends a "landed Sxxx — adopting" note back; we re-run the smoke against the scrml-native endpoints.

This is the dogfood working as designed: flogence pressed a real product need; scrml grows one well-scoped primitive;
flogence retires the workaround. **"flogence is built in scrml" gets more literally true.**

---

## 8. Open questions for scrml's PA

1. Is the **author raw route** the right primitive, or do you prefer a different shape (e.g. a dedicated `<endpoint>`
   element, or generalizing the §4.12.2 sidecar `route=`)? We care about the *capability*, not the spelling.
2. Auth: a first-class `csrf="token"`/bearer mode on routes, or an author-checked `req.headers` + `csrf="off"`?
3. SSE author-path (A): fold into the same raw-route primitive, or a minimal `route=` add to `server function*`?
4. Does this collide with any in-flight work (the §38 channel surface, the `mount(server)` host story, library mode)?
5. Batch JSON-RPC + notifications — in scope for v1, or author-handled inside the raw body? (flogence can live without
   batch initially.)

Thanks — flag scope/feasibility and we'll sequence flogence's adoption around it. — flogence PA, 2026-06-20
