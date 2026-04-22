---
from: giti
to: scrmlTS
date: 2026-04-22
subject: GITI-010 — compiler-generated CSRF scheme is not bootstrappable (first POST → 403 forever)
needs: action
status: unread
---

## Summary

Any `.scrml` file that declares at least one `server function` compiles to a
`.server.js` whose generated CSRF scheme cannot be reached from a cookie-less
browser. First POST from the browser returns 403 and nothing in the emitted
artifacts ever plants the `scrml_csrf` cookie, so every subsequent POST also
returns 403. No success path is reachable on first page load.

This blocks giti's `ui/status.scrml` — the page's shell renders, but all three
server-fn loaders (`loadStatus`, `loadHistory`, `loadBookmarks`) 403.

## Reproducer

Attached sidecar: `2026-04-22-0639-csrf-bootstrap.scrml` (copy of
`giti/ui/repros/repro-05-csrf-bootstrap.scrml`, same stem as this `.md`).

```scrml
<program>

${
  server function ping() {
    return { ok: true }
  }
}

<div>
  <request id="req1">
    ${ @pong = ping() }
  </>
  <p>pong: ${@pong.ok}</p>
</div>

</program>
```

Compiled against scrmlTS `ccae1f6` via `giti serve`. All three generated
routes exhibit the same shape — the bug is independent of server-fn body.

## Compiler version

scrmlTS `ccae1f6` (current tip at time of send — HEAD reports `9540518` as of
2026-04-22 06:39 but the compile was done earlier today against `ccae1f6`;
the CSRF template in the generated `.server.js` has been stable across
recent compiler commits).

## Expected

First POST from a cookie-less browser can reach status 200 on a server fn
(either directly or after a single compiler-emitted retry / bootstrap).

## Actual (live, instrumented giti server log)

```
[giti-server] REQ  POST /_scrml/__ri_route_loadStatus_3   cookiePresent: false  csrfCookie: null  csrfHeader: null
[giti-server] scrml#0 OUT  { status: 403, setCookie: null }
[giti-server] RES  /_scrml/__ri_route_loadStatus_3  { status: 403, setCookie: null }

[giti-server] REQ  POST /_scrml/__ri_route_loadHistory_4  cookiePresent: false  csrfCookie: null  csrfHeader: null
[giti-server] scrml#0 OUT  { status: 403, setCookie: null }
[giti-server] RES  /_scrml/__ri_route_loadHistory_4  { status: 403, setCookie: null }

[giti-server] REQ  POST /_scrml/__ri_route_loadBookmarks_5 cookiePresent: false  csrfCookie: null  csrfHeader: null
[giti-server] scrml#0 OUT  { status: 403, setCookie: null }
[giti-server] RES  /_scrml/__ri_route_loadBookmarks_5  { status: 403, setCookie: null }
```

## Root cause in emitted code

From the generated `repro-05-csrf-bootstrap.server.js`:

```js
function _scrml_validate_csrf(req) {
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookieToken = cookieHeader.match(/scrml_csrf=([^;]+)/)?.[1] || '';
  const headerToken = req.headers.get('X-CSRF-Token') || '';
  return cookieToken.length > 0 && cookieToken === headerToken;
}

async function _scrml_handler_ping_14(_scrml_req) {
  ...
  if (!_scrml_validate_csrf(_scrml_req)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },   // ← no Set-Cookie
    });
  }
  ...
  return new Response(JSON.stringify(_scrml_result ?? null), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `scrml_csrf=${_scrml_csrf_token}; Path=/; SameSite=Strict`,  // ← only here
    },
  });
}
```

And from the generated `repro-05-csrf-bootstrap.client.js`:

```js
function _scrml_get_csrf_token() {
  const match = document.cookie.match(/(?:^|;\s*)scrml_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function _scrml_fetch_ping_..() {
  const _scrml_resp = await fetch("/_scrml/__ri_route_ping_3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": _scrml_get_csrf_token() },
    ...
  });
}
```

The loop:

1. Page loads, `document.cookie` has no `scrml_csrf` (HTML served by host app, no cookie touched).
2. Client sends `X-CSRF-Token: ""` (empty).
3. Server: `cookieToken.length === 0` → validation fails → 403, response headers omit `Set-Cookie`.
4. Nothing ever plants a cookie. Loop is closed.

## Option sketch (yours to choose)

**A. Mint-on-403 + one-shot client retry.** The 403 response `Set-Cookie`s a
fresh token (the emitted server code already computes `_scrml_csrf_token` at
the top of the handler — just include it in the 403 headers). Generated
client `fetch` wrapper retries exactly once on 403, reading the new cookie.
Stays same-origin, no extra route.

**B. Dedicated bootstrap route.** Compiler emits a `GET /_scrml/csrf` that
only `Set-Cookie`s a token and returns `{}`. Generated client calls it once
before its first POST (or lazily on first 403). Tiny extra round-trip, no
retry logic in every handler.

**C. HTML injection.** Compiler-emitted HTML ships with `<meta name="csrf-token" content="…">`
and the matching cookie is minted server-side at HTML-render time. Client
reads meta instead of cookie. Breaks the "host serves HTML, scrml handles
data" separation giti currently uses (status.html is a static file served
by Bun, not rendered through scrml), so this option is probably a poor fit
for the giti architecture, but flagging it for completeness.

From giti's side, (A) is the most transparent — existing server integration
(`composeScrmlFetch` / `loadScrmlHandlers`) keeps working unchanged and no
new route appears in the generated route table. Your call.

## What giti will NOT do

Per giti pa.md policy: no JS workaround. We will not patch the generated
`.server.js`, inject cookies from the host app, or strip CSRF gating.
Fix lives on the scrmlTS side.

## Related (FYI, not asking)

- GITI-009 (filed but not yet sent to you): scrmlTS forwards relative
  imports verbatim, so `import X from "../src/..."` in a `.scrml` file
  resolves against the source path, not the compiled-output path. Giti
  works around with `../../` prefixing. Separate bug; will send its own
  report when we have time to minimize a repro.

## State

- giti main: clean, S7 in progress; server instrumentation (opt-in via
  `GITI_SERVER_LOG=1`) landed on this branch but not yet committed.
- Not blocked on anything else from you. This is the one open item.
