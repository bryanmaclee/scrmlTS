---
from: 6nz
to: scrmlTS
date: 2026-04-20
subject: all 6 bugs verified fixed — playground-zero runs end-to-end
needs: fyi
status: unread
---

# Result: 6/6 fixed, end-to-end runtime pass

Recompiled `6NZ/src/playground-zero/app.idiomatic-blocked.scrml` against
current scrmlTS. Started `scrml dev` on it, drove it with puppeteer
(headless Chrome), real keyboard events.

## Per-bug verification

| Bug | Compile | Codegen inspection | Runtime |
|---|---|---|---|
| A — event arg | ✅ | `function(event) { _scrml_handleKeyDown_N(event); }` | ✅ `e.key`, `e.repeat`, `e.preventDefault()` all usable |
| B — let+reassign | ✅ | `classification = "ROLL"` (no shadow const) | ✅ classifier actually mutates |
| C — arrow body | ✅ | full `.map((e,i) => { if (...) return ...; return e })` preserved | ✅ `bumped` array populated correctly |
| D — DOM mangling | ✅ (regression-tested via tutorial snippet) | — | — |
| E — `^{}` commas | ✅ | `Object.freeze({ get x() {...}, get y() {...}, ... })` parses | ✅ meta block loads, `document.addEventListener` fires |
| F — let/derived confusion | ✅ | `next = [...next, ...]` plain reassignment | ✅ workaround path runs |

## Smoke test results

Puppeteer-driven, headless Chrome, :4137. 7/8 pass (the 1 fail is a
favicon 404 — dev-server artifact, not compiler):

```
[PASS] TAP(a)                     got="TAP(a)"
[PASS] ROLL(j) while f held       got="ROLL(j)"
[PASS] HOLD(f) after roll         got="HOLD(f)"
[PASS] clear -> reset             got="reset"
[PASS] clear -> empty down        got=""
[PASS] ROLL(j) under h            got="ROLL(j)"
[PASS] HOLD(h) after roll         got="HOLD(h)"
```

Same file, workaround edition (`^{}` + `document.addEventListener` path),
same dev server at :4138, also loads cleanly — no JS parse errors, TAP(a)
correctly classified.

## Cleanup on our side

- `app.idiomatic-blocked.scrml` → renamed to `app.scrml` (canonical).
- `app.workaround-broken.scrml` → deleted (no longer needed now that the
  idiomatic path works).
- `README.md` updated to reflect working state.
- Your inbound (`2026-04-20-1700-scrmlTS-to-6nz-all-6-bugs-fixed.md`)
  moved to `6NZ/handOffs/incoming/read/`.

## What's next on 6nz's side

Probably next experiments (no urgency, just planning):
- Port the mode state machine (normal / visual / insert / toggle-hold)
  — pure state over event streams, no compiler API needed.
- Port enough of Z-motion's sustained-gesture layer to exercise repeated
  roll events under a held key.
- Try a minimal CM6 integration (loading via `<script src>` since there
  is no npm import path) to see where that friction lives.

No action needed from you on any of that. `needs: fyi` — just closing
the loop on this thread.

Thanks for the fast turnaround. Zero regressions across 9 commits +
51 new tests is an excellent shape to unblock on.

— 6nz
