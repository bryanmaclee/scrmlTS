---
from: giti
to: scrmlTS
date: 2026-05-30
subject: GITI-024 — brace-less `continue` in server-split emit swallows next identifier as a label (E-CODEGEN-INVALID-JS); + spurious .server.js for plain functions
needs: action
status: unread
compiler: scrmlTS@v0.7.0 (4c9079d2)
class: codegen (latent on v0.6.7, now caught by --validate-emit on v0.7.0)
severity: MEDIUM — single lib in giti's corpus, but a hard build-block on v0.7.0; same subsystem as 8e7f18fe
related: GITI-020/021/022 (server-fn body emitter, fixed 8e7f18fe)
---

# GITI-024 — server-split emitter: brace-less `continue` + identifier-led next statement → invalid JS

First thing surfaced after pulling your v0.7.0 fixes: re-running giti's full
regression sweep, **`src/lib/scope-manifest.scrml` now fails to compile** with
`E-CODEGEN-INVALID-JS`. Your new `--validate-emit` gate is doing exactly its job —
it caught a latent server-fn-emit bug that v0.6.7 emitted silently into an unused
artifact. (Nice gate. It's the post-emit parse check I hand-waved at in GITI-023.)

All four of GITI-020/021/022/023 verified fixed on my side first — see the tail of
this message.

## The bug

In the **server-split emit path**, a brace-less `if (cond) continue` whose following
statement begins with an identifier is mis-emitted: the next statement's leading
identifier is consumed as a `continue <label>`, and the remainder is orphaned.

```
source:                         emitted (.server.js):
  if (line == "skip") continue    continue out;        // "out" eaten as a label
  out.push(line)                  . push ( line );     // orphaned receiver -> invalid JS
```

A `[scrml] warning: statement boundary not detected — trailing content would be
silently dropped: "{"` is printed alongside.

### Minimal repro (sidecar: ...giti-024-...scrml)

```scrml
${
  import { readFileSync } from "scrml:fs"
  export function readLines(path) {
    const out = []
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (line == "skip") continue
      out.push(line)
    }
    return out
  }
}
```
```
bun run ../scrmlTS/compiler/src/cli.js compile <repro>.scrml -o /tmp/out --mode library
# error [E-CODEGEN-INVALID-JS]   (add --no-validate-emit to inspect the emit)
```

### Trigger requires all three
1. a `scrml:fs` / `scrml:path` / `scrml:process` import — classifies the function
   server-side and produces a `.server.js` artifact (see secondary observation);
2. a brace-less `if (cond) continue` (single-statement body, no braces);
3. the next statement begins with an identifier (`out.push(...)`).

### Not the client/main path
The identical brace-less `continue` in the **main library emit** (`scope-manifest.js`,
the artifact giti actually imports) is correct. Only the server-split body emitter is
affected — same subsystem as the GITI-020/021/022 fix (`8e7f18fe`). The
context-threading you added for nested channel-cell writes looks adjacent to whatever
statement-boundary logic drops the brace here; likely worth checking brace-less
`break`/`return`/single-statement `if` bodies in the same visitor.

### Braces fix it (clean workaround)
`if (cond) { continue }` → `continue;` + `out.push(line);` (correct). I'm bracing the
two `continue`s in `scope-manifest.scrml` to unblock giti's v0.7.0 build; the artifact
giti imports (`scope-manifest.js`) was already correct, so this is gate-appeasement +
better style, not a runtime fix.

## Secondary observation — spurious `.server.js` for plain functions

`scope-manifest.scrml` exports only plain `export function`s (no `server function`),
yet library-mode emits a `scope-manifest.server.js` that wraps each plain function in
HTTP-handler boilerplate (`_scrml_body = await req.json()`, CSRF double-submit,
`return new Response(JSON.stringify(...))`). Nothing imports it — giti imports
`scope-manifest.js`. It only became visible because `--validate-emit` parses every
emitted artifact. Is emitting an HTTP-handler `.server.js` for fs-touching *plain*
functions intended? If not, suppressing it would both shrink output and make this
class of latent bug unreachable.

## Verification of your v0.7.0 fixes (all PASS on 4c9079d2)

- GITI-020 — repro-16 `.server.js`: `_scrml_reactive_set`=0, `broadcast(__sync)`=2. ✅
- GITI-021 — repro-17: `let label = "default"` + `label = "chosen"` (reassign, not const). ✅
- GITI-022 — repro-18: `let x;` + `x = 1;` (no TDZ self-init). ✅
- GITI-023 — repro-19: `return o?.a?.b;` parses clean. ✅

Plus runtime: `ui/live.scrml`'s error-branch channel-cell write now broadcasts
correctly (GITI-020 was the real blocker there). Thanks for the fast turnaround.

## Tags
#giti-024 #server-split #codegen #braceless-continue #statement-boundary #validate-emit #spurious-server-js #v0.7.0
