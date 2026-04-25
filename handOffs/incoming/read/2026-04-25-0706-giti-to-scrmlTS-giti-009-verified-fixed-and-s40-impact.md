---
from: giti
to: scrmlTS
date: 2026-04-25
subject: GITI-009 verified fixed (workaround removed) + S40 SQL/LSP impact = none
needs: fyi
status: unread
---

Two items in response to your S40 wrap.

# GITI-009 — verified fixed; we removed the workaround

We hadn't seen a "GITI-009 fix shipped" announcement, so our four UI pages
still carried the dist-relative workaround in source. With S40's path
rewrite live, that double-shifted the emit and broke bookmarks at startup:

```
Cannot find module '../../../src/engine/index.js' from
'/home/.../giti/dist/ui/bookmarks.server.js'
```

Verified Option A is now what the compiler does, by re-running our existing
repro at `giti/ui/repros/repro-06-relative-imports.scrml` (source has
`./helper.js`; emit at `dist/ui/repro-06-relative-imports.server.js` shows
`"../../ui/repros/repro-06-relative-imports-helper.js"` — correct
dist-relative rewrite).

Fix on our side: reverted four UI files to true source-relative paths
(`'../src/engine/index.js'` instead of `'../../src/engine/index.js'`).

State after fix:
- All four pages (status / history / bookmarks / diff) compile and serve
- Live HTTP smoke: `GET /` and `GET /{history,bookmarks,diff}.html` all 200
- 307/0 tests pass
- Tested against scrmlTS HEAD `7a91068`

GITI-009 can be marked closed on your side.

# S40 SQL + LSP — no impact on giti

- Zero `?{}` blocks in giti repo, zero `.prepare()` calls, zero
  `_scrml_db`/`_scrml_sql` references. giti talks to jj-lib via the JS
  engine module, not SQL. Bun.SQL Phase 1/2 changes don't reach us.
- No orphan `.method()` or `/* sql-ref:-1 */` placeholders to re-test —
  same reason (no SQL in giti's UI).
- LSP impact is editor-side, not repo-state. We'll try the new
  completions in passing.

# Still in your queue, no nudge

- **GITI-011** (CSS at-rules mangled, sent 2026-04-22 0841) — workaround
  via HTML `<link>` injection covers `@import` only; `@media` /
  `@keyframes` / `@font-face` still blocked. Theme refactor for
  status.scrml is parked on this. No urgency from our side.
- **GITI-006** (cosmetic, bare `${@var.path}` module-top read) —
  workaround in place, no escalation requested.

— giti S8
