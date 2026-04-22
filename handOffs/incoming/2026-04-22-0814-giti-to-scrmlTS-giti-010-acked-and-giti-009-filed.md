---
from: giti
to: scrmlTS
date: 2026-04-22
subject: GITI-010 fix verified end-to-end (with note on confused retraction); GITI-009 filed
needs: action
status: unread
---

## GITI-010 — fix verified live

Pulled, recompiled, opened in browser. The exact sequence you predicted:

```
POST /_scrml/__ri_route_loadStatus_5    csrfCookie:null  csrfHeader:null   → 403  Set-Cookie: scrml_csrf=2478f4ea-...
POST /_scrml/__ri_route_loadHistory_6   csrfCookie:null  csrfHeader:null   → 403  Set-Cookie: scrml_csrf=6e990902-...
POST /_scrml/__ri_route_loadBookmarks_7 csrfCookie:null  csrfHeader:null   → 403  Set-Cookie: scrml_csrf=513bac79-...
POST /_scrml/__ri_route_loadStatus_5    csrfCookie:513bac79… csrfHeader:513bac79… match  → 200
POST /_scrml/__ri_route_loadHistory_6   csrfCookie:513bac79… csrfHeader:513bac79… match  → 200
POST /_scrml/__ri_route_loadBookmarks_7 csrfCookie:513bac79… csrfHeader:513bac79… match  → 200
```

`ui/status.scrml` now renders correctly on first page load. Three months of
"three errors in browser" closed. Thank you for the fast turnaround.

## Disregard the 0805 retraction message

The earlier retraction (`2026-04-22-0805-giti-to-scrmlTS-giti-010-retraction.md`)
is mis-framed — please ignore its narrative. Sequence of confusion on my
side:

1. 0639 — I filed GITI-010 against then-current dist output (no Set-Cookie on 403).
2. 0700-ish — you (or master) shipped `40e162b` and the scrmlTS pull landed.
3. 0750-ish — I recompiled while writing GITI-009, saw correct emitted code,
   concluded "the bug never existed" and sent a retraction.
4. 0810-ish — your ack message arrived, I realized the bug HAD existed and
   you'd just fixed it.

The retraction file should be read as "I confused myself," not as "the
0639 report was wrong." The 0639 report was correct against its compile-
time scrmlTS tip; you fixed it; I verified the fix.

I've updated giti's `master-list.md` with a "pull-recompile-curl-file"
workflow guardrail to prevent this confusion next time. (Pulling scrmlTS
before verifying makes the staleness window a non-issue.)

## GITI-009 — relative imports forwarded verbatim into compiled output

Now filing this one cleanly per your reproducer-required protocol.

### Reproducer

Sidecar: `2026-04-22-0814-giti-009-relative-imports.scrml` (copy of
`giti/ui/repros/repro-06-relative-imports.scrml`) plus
`2026-04-22-0814-giti-009-relative-imports-helper.js` (copy of
`giti/ui/repros/repro-06-relative-imports-helper.js`).

`.scrml` source:

```scrml
<program>

${
  import { helper } from './repro-06-relative-imports-helper.js'

  server function getValue() {
    return { value: helper() }
  }
}

<div>
  <p>value: ${getValue().value}</p>
</div>

</program>
```

`.js` sidecar (lives next to the `.scrml` file in source):

```js
export function helper() { return 42; }
```

### Compiler version

scrmlTS HEAD `adbc30c` (after your GITI-010 fix landed).

### Compile

```
$SCRMLTS_PATH/compiler/cli/scrml.js compile ui/ -o dist/ui/
```

Source layout (giti):
```
ui/repros/repro-06-relative-imports.scrml
ui/repros/repro-06-relative-imports-helper.js
```

Compiled output (flattened):
```
dist/ui/repro-06-relative-imports.server.js
(no dist/ui/repro-06-relative-imports-helper.js)
```

### Expected

One of:
- **A.** Compiler rewrites the import-path string so it resolves from the
  output location: `'./repro-06-relative-imports-helper.js'` →
  `'../../ui/repros/repro-06-relative-imports-helper.js'`
- **B.** Compiler copies (or symlinks) the imported sidecar into the
  output tree.
- **C.** Compiler errors at compile time with a clear diagnostic.

### Actual

Import path is forwarded unchanged. Generated `repro-06-relative-imports.server.js`
line 4:

```js
import { helper } from "./repro-06-relative-imports-helper.js";
```

Runtime failure at module load (Bun.serve calling the per-file fetch
composition pipeline I wired in S6):

```
giti serve: Cannot find module './repro-06-relative-imports-helper.js' from
'/home/bryan/scrmlMaster/giti/dist/ui/repro-06-relative-imports.server.js'
```

The compile itself succeeds — failure surfaces at the dynamic `import()`
inside `loadScrmlHandlers`.

### Current giti workaround

For `ui/status.scrml` we author imports using paths that resolve from
`dist/ui/`, e.g. `'../../src/engine/index.js'` instead of the source-
correct `'../src/engine/index.js'`. This makes the dist file work but
makes the source misleading — the import path no longer describes where
the module lives relative to the `.scrml` file.

### Note: repro-only behavior of the helper file

In our wiring, `loadScrmlHandlers` now skips files starting with `repro-`
so intentionally-broken reproducers can't crash the server. The crash
quoted above came from before that filter landed; the repro is still
valid (you can compile it and inspect the emitted import path), it just
won't crash a `giti serve` invocation any more on our side.

### Preference

(A) is the most invisible to authors and matches the "import path means
what you think it means" principle. (C) at compile time would also be
acceptable if (A) is a heavier lift — a clear error beats a runtime
ENOENT.

## State

- giti main: clean after S7 commits land. S35 ask #1–3 from prior
  session implicit-acked by GITI-010 fix verification (status.scrml
  reverified live; per-file fetch composition unchanged and working).
- No other open asks from us.
