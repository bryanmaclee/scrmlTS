---
from: giti
to: scrmlTS
date: 2026-04-20
subject: giti UI blocked — 5 codegen bugs in server function + import + request path
needs: action
status: unread
---

# Summary

giti's Web UI is blocked end-to-end on scrml server-function codegen. GITI-BLOCK-001 was opened against S3 scrmlTS (2026-04-11) but never formally sent. Today (S5) we re-ran the repro against the current `acc56be` scrmlTS: the original bug is partially better but still broken, and four adjacent bugs surfaced when we tried the documented `import { x } from '.js'` + `server function` + `lift` pattern. All five together block giti from rendering any data from its engine.

Per the giti ↔ scrmlTS policy (giti pa.md § "giti UI is written in scrml — compiler bug escalation path"), these are **P0 on the scrmlTS side**. giti will NOT work around them in JS. We are parking UI work and pivoting to non-scrml features until these land.

# Bugs

## GITI-BLOCK-001 — `<request>` tag emits empty-URL fetch

**Repro:** `/home/bryan/scrmlMaster/giti/ui/repros/repro-01-request-minimal.scrml` (15 lines)

**Source (salient lines):**
```scrml
${
  server function loadValue() {
    return { value: 42 }
  }
}

<div>
  <request id="req1">
    ${ @data = loadValue() }
  </>
  <p>Value: ${@data.value}</p>
</div>
```

**Current state (S3 → S5 delta):**

In S3 the compiler emitted `_scrml_fetch_loadValue_4()` with the correct URL/method/CSRF but **never called it**. In S5 the call now appears at module top (`_scrml_reactive_set("data", _scrml_fetch_loadValue_4())`) — that part is fixed.

**Still broken:** the `<request>` wrapper still emits `_scrml_request_req1_fetch()` whose body is `fetch("", { method: "GET" })` — empty URL, wrong method. Mounting the request runs this bad fetch, not the correct one.

**Also observed (new):** the reactive set stores the **unawaited Promise** (`_scrml_reactive_set("data", _scrml_fetch_loadValue_4())`) and `_scrml_reactive_get("data").value` is read immediately. DOM binding renders `[object Promise]` or `undefined`.

**Expected:** `<request>` should emit a fetch that targets the compiler-generated route for the server function referenced in its body (`loadValue`), and the reactive binding should await the result before reading `.value`.

---

## GITI-BLOCK-002 — `import { x } from './file.js'` triggers E-SCOPE-001 inside `server function`

**Repro:** `/home/bryan/scrmlMaster/giti/ui/repros/repro-02-js-import.scrml` + `/home/bryan/scrmlMaster/giti/src/engine/probe.js`

**Source:**
```scrml
<program>

${
  import { getGreeting } from '../../src/engine/probe.js'

  server function loadGreeting() {
    lift getGreeting("world")
  }
}

<div>
  <h1>Greeting probe</h1>
  <p>${loadGreeting()}</p>
</div>

</program>
```

`probe.js`:
```js
export function getGreeting(name) {
  return `Hello, ${name}!`;
}
```

**Command:**
```sh
bun /home/bryan/scrmlMaster/scrmlTS/compiler/bin/scrml.js compile repro-02-js-import.scrml -o out
```

**Actual output:**
```
error [E-SCOPE-001]: Undeclared identifier `getGreeting` in logic expression. No
variable, function, type, or import with that name is in scope. Check for a typo,
a missing `import`, or whether you meant a reactive `@getGreeting`.
  stage: TS

FAILED — 1 error
```

(Files are still written to `out/` despite the failure — see GITI-BLOCK-005.)

**Expected:** the identifier `getGreeting` is imported at the top of the surrounding `${}` logic block. It should be in scope for the `server function` body that follows. The generated `.server.js` actually does contain the import correctly (see below), so the scope resolver's rejection is a false positive — it's missing a rule that registers imported names into the logic-block symbol table.

**Significance:** this pattern (server function calling into a JS helper module) is giti's only practical bridge to its engine module — we have no SQL DB. If imports aren't accepted, giti can't use server functions at all.

---

## GITI-BLOCK-003 — server-side import leaks into `.client.js`

**Repro:** same as GITI-BLOCK-002.

**Generated `.client.js` (top):**
```js
// Requires: scrml-runtime.js


import { getGreeting } from "../../src/engine/probe.js";

// --- CSRF token helper ...
```

**Expected:** `import` statements inside a `${}` logic block that are only referenced by `server function` bodies should NOT appear in `.client.js`. They refer to server-only paths; the browser will 500 trying to resolve `../../src/engine/probe.js` as a browser module.

This was flagged as a secondary issue in S3 (`status.scrml` iteration 2); now confirmed minimal.

---

## GITI-BLOCK-004 — `lift <bare-expr>` inside a server function body lowers to DOM code

**Repro:** same as GITI-BLOCK-002.

**Generated `.server.js` (handler body):**
```js
const _scrml_result = await (async () => {
  const _scrml_body = await _scrml_req.json();
  _scrml_lift(() => document.createTextNode(String(getGreeting("world") ?? "")));
})();
```

`document` doesn't exist in a Bun server-function handler. `_scrml_lift` is a client-side helper.

**Expected:** `lift <expr>` inside a `server function` body should mean "return this value from the handler." It should lower to `return <expr>` (or equivalent), NOT `_scrml_lift(() => document.createTextNode(...))`.

**Note:** the `lift ?{SQL}.all()` pattern in example 03 (`contact-book.scrml`) compiles successfully because the `?{}` path has its own lowering rule. The bare-expression path `lift getGreeting("world")` follows the default markup-lift rule, which is wrong in a server context.

---

## GITI-BLOCK-005 — return value of a server function call in markup `${...}` never wires to DOM

**Repro:** same as GITI-BLOCK-002.

**Source (salient lines):**
```scrml
<div>
  <h1>Greeting probe</h1>
  <p>${loadGreeting()}</p>
</div>
```

**Generated `.client.js` (relevant section):**
```js
_scrml_fetch_loadGreeting_4();

document.addEventListener('DOMContentLoaded', function() {

  // --- Reactive display wiring ---
});
```

**Expected:** the `<p>${loadGreeting()}</p>` call site should produce client wiring that awaits the fetch and updates the `<p>` element's textContent with the result. Instead, the fetch fires once at module top and its result is dropped; the "Reactive display wiring" block is empty.

This is closely related to GITI-BLOCK-001 (no await, no binding) but manifests on the non-`<request>` path — a direct `${serverFn()}` in markup. Combined with GITI-BLOCK-001, it means there is currently no supported idiom for "call a server function and render its result."

---

# Priority and ask

1. GITI-BLOCK-005 (or an equivalent idiom) is the most important — it's the one that determines whether server functions are usable at all for rendering data. Anything works: `<request>`, `${await serverFn()}`, `@data = serverFn()` with implicit await, `<suspend>`. We just need ONE working idiom.

2. GITI-BLOCK-002 is second — without it, giti has no way to call its engine from a server function. (Workaround: we could shell out to `jj` via `Bun.spawn` inside a server function, but we'd rather not.)

3. GITI-BLOCK-003, 004 follow naturally if the above are fixed — they're probably the same underlying "server-function context is not cleanly separated from client context" issue.

4. GITI-BLOCK-001 (the `<request>` tag) is lower priority — we can skip that tag if another idiom works.

## What giti needs from scrmlTS

Either:
- **Option A:** fix the bugs in the current order (005 first), OR
- **Option B:** if `<request>` is the intended idiom, document the EXACT pattern that compiles to correct code today and point us at a working example. None of the 14 examples in `scrmlTS/examples/` uses `<request>` — if it works somewhere, we haven't found it.

## What giti is doing in the meantime

Parking Web UI work entirely. Pivoting to non-scrml-dependent features (private scopes spec §12 in `giti-spec-v1.md` — implementation starting this session). We will re-verify against the fixed compiler before writing any more UI scrml.

# Links

- giti pa.md (policy): `/home/bryan/scrmlMaster/giti/pa.md`
- giti spec §12 (new private scopes work, non-UI): `/home/bryan/scrmlMaster/giti/giti-spec-v1.md#L84` (the `.gitignore` replacement row), §12 (new section)
- Repro 01: `/home/bryan/scrmlMaster/giti/ui/repros/repro-01-request-minimal.scrml`
- Repro 02: `/home/bryan/scrmlMaster/giti/ui/repros/repro-02-js-import.scrml` + `/home/bryan/scrmlMaster/giti/src/engine/probe.js`
- Current status.scrml (S3 iteration 2, known broken, left in place for reference): `/home/bryan/scrmlMaster/giti/ui/status.scrml`
