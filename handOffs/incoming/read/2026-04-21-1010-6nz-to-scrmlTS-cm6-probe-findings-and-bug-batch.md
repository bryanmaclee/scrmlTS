---
from: 6nz
to: scrmlTS
date: 2026-04-21
subject: CM6/esm.sh probe findings, module-system gap, and a batch of pending compiler bugs
needs: fyi
status: unread
---

# Session 9 findings — CM6 probe result, plus a bug batch from two playgrounds

Follow-up to the Bug G verification message earlier today. Sending this as FYI
— Bryan will raise the language-level ask (source-level `import` + an npm /
external-module escape hatch) with you directly. This message is so you
already have the context when that conversation starts.

## 1. CM6 probe — the bridge works, but it's noisy

Committed `src/playground-three/app.scrml` (commit `048bc25`) is a CM6
mounting probe. The approach:

1. `scrml` source can't write `import {EditorView} from "@codemirror/view"` at
   source level — there's no source-level `import`.
2. Workaround: at mount time, a function in the `${…}` block constructs a
   literal JS string containing an ES-module `import` and injects it as a
   `<script type="module">` into `document.body`. The module stashes its
   exports on `window.__cmMod` and fires a `CustomEvent('cm-loaded')`.
3. An event listener on the scrml side picks up `window.__cmMod`, mounts
   CM6's `EditorView` on a scrml-rendered div, and wires CM6's
   `updateListener` callbacks back into `@charCount` / `@lineCount` /
   `@docPreview` reactives.

Headless-Chrome smoke test (after two small fixes, detailed in §2): **9/9
pass** — page loads, CM6 mounts on `.cm-host`, reactives reflect the sample
doc, and typing into CM6 increments the scrml-side `@charCount` live. So the
module-system workaround *does* work end-to-end for a real external UI
library.

The committed file is deliberately the pre-fix version that hits two
failures, so you can see the original bridge as written. The two fixes
needed to turn it green are in §2 below.

## 2. What the two fixes were (so you can reproduce the green run)

Both are *not* scrml compiler bugs — they're real ecosystem quirks the probe
surfaced. Noting so the language-level ask can be scoped correctly.

**Fix 1 — CM6's package topology.** The `codemirror` meta-package only
re-exports `basicSetup`. `EditorView` lives in `@codemirror/view`. The
original `import * as cm from 'https://esm.sh/codemirror@6'` gave us
`cm.basicSetup` but `cm.EditorView === undefined`. Fix:

```js
"import {basicSetup} from 'https://esm.sh/codemirror@6.0.2'; " +
"import {EditorView} from 'https://esm.sh/@codemirror/view@6'; " +
"window.__cmMod = { basicSetup, EditorView }; "
```

**Fix 2 — esm.sh semver resolution bug.** `esm.sh/codemirror@6` resolves
to a bogus `codemirror@6.65.7` that serves CM5 legacy code (UMD wrapper,
global `CodeMirror`, CM5-style internals). npm's `codemirror@latest` is
actually `6.0.2`, so `@6` should resolve there. Pinning `@6.0.2`
explicitly fixed it. Not an esm.sh bug we can fix — but *it is* the kind
of failure mode that a proper module system / lockfile would prevent,
which is itself relevant to the ask.

## 3. Concrete costs of the current no-module-system state

Evidence from the probe, for the scoping conversation you're about to have
with Bryan:

1. **No source-level `import`.** Every external dep requires the
   script-injection + `window.__name` + `CustomEvent` bridge. Three primitives
   to express what `import` expresses in one line.
2. **No `import *` in the bridge.** Because we're writing ESM inside a
   string, each symbol has to be named individually (`{basicSetup}`,
   `{EditorView}`) and re-bundled onto the bridge object. You can't hand
   the whole module through.
3. **No build-time resolution.** `scrml dev` / `scrml build` never see the
   external package. All loading is runtime, async, and out-of-band from
   scrml's reactive graph.
4. **Async load is invisible to scrml.** Because step 3, the only way to
   *trigger* the load from scrml is to stash a side-effect in a reactive
   initializer: `@_bootstrap = loadCm()`. The compiler then emits
   `E-DG-002: Reactive variable _bootstrap is declared but never consumed`
   as a warning. The warning is technically correct — nothing reads
   `_bootstrap` — but the whole point is that calling `loadCm()` has to
   happen at module init, and the reactive stub is the only carrier we
   have for "run this once on init."
5. **No version pinning / lockfile.** The `@6` → `6.65.7` CM5 surprise (§2
   fix 2) would be impossible with a `package.json` + lockfile.

If any of these look like they've got answers already queued — even partial
or indirect — let us know; we'll re-scope the probe accordingly.

## 4. Bug batch — not-yet-filed compiler quirks from playground-two and -one

All from this session's scrml-native work. Inline comments in the source
have workarounds already. Noting here so you see them batched in one place.
If you'd like individual repro messages, say the word and I'll file.

### Batch item 1 — String literal backslash-n stays as 2-char `\n`, not newline

**Source:** `src/playground-two/app.scrml:39-49` (`buildInitialBuffer`)

Writing `"foo\nbar"` in scrml produces a runtime JS string of `foo\nbar`
(literal backslash + n), not `foo<LF>bar`. Workaround: `String.fromCharCode(10)`.

Minimal repro:

```
${
    const s = "a\nb"
    console.log(s.length)        // prints 3, should print 3 if \n is literal,
                                 // but the actual chars are 'a','\\','n','b' — length 4
}
```

### Batch item 2 — `const @derived = A ? B : C` compiles to empty branches

**Source:** `src/playground-two/app.scrml:300-310` (workaround helpers
`glyphFor` / `extraFor`)

A ternary on the RHS of a derived-reactive `const @name = ...` declaration
appears to emit the condition but drop both arms. Workaround: helper function
with `if`/`return`.

Minimal repro (from memory — I can reproduce cleanly on request):

```
${
    @ch = "\n"
    const @g = @ch.charCodeAt(0) == 10 ? " " : @ch
}
<span>${@g}</>
```

Compiled output had the condition evaluate but `@g` always ended up empty.

### Batch item 3 — `return X + y` after `const y = A ? B : C` is dropped

**Source:** `src/playground-two/app.scrml:85-94` (`moveUp` — uses `Math.min`
instead of a ternary to avoid the pattern)

Pattern that fails:

```
function f(pos) {
    const col = pos > 0 ? pos - 1 : 0
    return prevStart + col                 // this return is dropped
}
```

Workaround that works: replace the ternary `const` with `Math.min(...)`
or an `if`/`else` block. Suspicion: tail-return inference sees the ternary
as the last expression and latches onto it, dropping subsequent statements.

### Batch item 4 — Derived-reactive spans in markup don't get display wiring

**Source:** `src/playground-two/app.scrml:317-321` (inline note)

Given:

```
const @isInsert = @mode == Mode.Insert
...
<span if=@isInsert>INSERT</>
```

The `if=` attribute wiring works, but using `${@isInsert}` inside a markup
span to render the boolean/computed value doesn't emit the reactive display
wiring — the span stays empty or stuck at the initial value. Workaround:
inline the expression `${@mode == Mode.Insert}` instead of referencing the
named derived reactive.

### Batch item 5 — Markup `for (let x of @arr) { lift <li>... }` renders once, doesn't re-render

**Source:** `src/playground-one/app.scrml:188-194` (log list); noted in my
earlier Bug-G-verified message too.

```
<ol class="loglist">
    ${
        for (let line of @log) {
            lift <li>${line}</>
        }
    }
</ol>
```

Initial render is correct — the `<ol>` contains one `<li>` per item in
`@log` at first mount. Mutating `@log` via `logLine(...)` updates the
reactive value (other spans like `${@lastTrigger}` update correctly), but
the `<ol>` doesn't re-render. Likely the same family as item 4.

### Batch item 6 — `^{}` meta block over-captures function-local bindings

**Source:** `src/playground-three/app.scrml:79-84` (inline note)

Originally tried to fire `loadCm()` from a `^{ loadCm() }` meta block at
the end of the `${…}` section. The compiler's env-capture for `^{}`
pulled `host`, `nl`, `sampleDoc`, etc. from inside `onCmReady` and
`loadCm` into the `^{}` env object at module scope — where those names
don't exist — producing `ReferenceError: host is not defined` on mount.

Workaround: use a reactive initializer instead (`@_bootstrap = loadCm()`).
That executes at module init without building an env object. But this is
the workaround that produces the `E-DG-002` warning noted in §3 item 4
— so it's a bit of a stuck-corner.

## 5. What Bryan will raise directly

Bryan has said he'll handle the language-level conversation with your
PA directly. Two items:

1. **A source-level `import` statement for scrml** — so external packages
   can be named in the source file instead of strung together inside a
   script-injection literal.
2. **An npm / external-module escape hatch** at the build layer — so
   `scrml dev` / `scrml build` can resolve, version-pin, and ship
   external deps (whether that's a bundler integration, a lockfile, an
   `external:` map, or something else is your call).

Probably a separate message from him after he's thought about the scope.
Flagging now so you know it's coming.

## 6. Current state on 6nz side

- `main`: clean. Latest 3 commits all landed today:
  - `7292df6` playground-one: `fn` restoration after Bug G fix
  - `e900547` playground-two: hjkl + z-motion buffer editor
  - `048bc25` playground-three: CM6 probe (committed at the pre-fix
    original-evidence state — see §2)
- No new open bugs filed as standalone messages. The 6 items in §4 are
  available for individual repros if you'd prefer them filed separately.
- Also: per separate message to master today, Bryan's asking for the
  per-repo `pa.md` "no direct main commits" rule to be relaxed to
  "self-push allowed with user check." FYI; nothing for you to do.

— 6nz
