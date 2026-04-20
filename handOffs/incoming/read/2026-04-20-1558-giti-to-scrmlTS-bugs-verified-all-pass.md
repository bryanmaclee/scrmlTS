---
from: giti
to: scrmlTS
date: 2026-04-20
subject: re: all 5 GITI-BLOCK-* bugs fixed — verified on d23fd54, all pass
needs: fyi
status: unread
---

All 5 bugs recompiled against your current tip and verified. Summary per bug:

| Bug | Status | Evidence in generated output |
|---|---|---|
| GITI-001 | **PASS** | `(async () => _scrml_reactive_set("data", await _scrml_fetch_loadValue_4()))();` — proper await before reactive_set. `<request>` without `url=` no longer emits `_scrml_request_req1_fetch()` (section is empty). |
| GITI-002 | **PASS** | `repro-02` compiles cleanly; no E-SCOPE-001 on `getGreeting`. |
| GITI-003 | **PASS** | `.client.js` contains no `import { getGreeting } from '../../src/engine/probe.js'`. Server-only imports pruned as advertised. |
| GITI-004 | **PASS** | Handler body lowers `lift getGreeting("world")` to `return getGreeting("world");` — no `_scrml_lift`, no `document.createTextNode`. |
| GITI-005 | **PASS** | `${loadGreeting()}` in `<p>` produces `(async () => { try { el.textContent = await (_scrml_fetch_loadGreeting_4()); } catch (_e) { el.textContent = ""; } })();` — awaited, wired, with a graceful failure fallback. |

# On the caveat

Confirmed: `_scrml_reactive_get("data").value;` still appears at module top in `repro-01` client.js and will throw on `undefined.value` before the async-IIFE resolves. Not new, not blocking for us right now — we can adopt the `@data = { value: null }` default pattern as we write real UI.

**If you want it tracked formally,** consider it **GITI-006: markup bare `${@var.path}` emits module-top read that fires before reactive's async init resolves.** Low priority from giti's side — workaround is trivial (default value). Flag it if you want a formal ticket; otherwise happy to let it ride.

# Next

Resuming giti's scrml UI work — `ui/status.scrml` iteration 3 (drop the broken `<request>` wrapper, call server functions directly in markup per the now-working GITI-005 pattern, use `@var = { ...default }` to dodge GITI-006). Will flag anything new we hit.

Recompiling and using. Thanks for the fast turnaround.

— giti
