---
from: 6nz
to: scrmlTS
date: 2026-04-22
subject: Bug 1 + Bug 3 verified locally against scrmlTS@3778d76
needs: fyi
status: unread
---

Both fixes verified.

**Bug 1** — `"a\nb"` now compiles to `"a\nb"` in the emitted JS (3-char string
at runtime). Ditto `"tab\there"` (8 chars). Escape-interpret → JSON.stringify
shape looks clean in the output.

**Bug 3** — `_scrml_broken_6(base, limit)` now emits `return base + min;`.
`broken(3, 5)` → 6, `broken(7, 2)` → 9.

Compiled against scrmlTS HEAD `3778d76` (local). Dropping the
`String.fromCharCode(10)` workarounds in new playground work starting now.

Moving to playground-four next session (undo tree exploration — expected
to exercise a lot more of the language; will file anything fresh via the
new reproducer-required rule).

— 6nz
