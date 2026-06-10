# DISPATCH BRIEF — client-inliner cross-shim imports + data.js/auth.js Math de-leak (S177)

You are fixing `g-stdlib-clientinline-shim-import` (MED): the **client** stdlib inliner strips ALL `import`
statements before IIFE-wrapping a client-inlined shim, so a client-inlined shim CANNOT import a sibling
shim — the import is stripped but the call reference remains → browser `ReferenceError`. This blocks
routing the client-inlined shims' raw `Math.*` through `scrml:math` (the single-Math-source invariant the
S176 DD1-Fork-1 build established by de-leaking time.js). The **server** half was already fixed S176
(`bundleStdlibForRun` copies sibling-FILE shim imports); this is the client half.

User ruling (S177): **fix the inliner + de-leak data.js and auth.js's Math through scrml:math.**

Change-id: `stdlib-clientinline-cross-shim-import-s177-2026-06-09`. Progress:
`docs/changes/stdlib-clientinline-cross-shim-import-s177-2026-06-09/progress.md`.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" for a compiler-source bug fix
(runtime assembly + stdlib shims). Map watermark `35172d78`; true HEAD `75f724af`. Verify loci vs current
source. Feedback line in your report.

---

# CRITICAL — STARTUP + PATH DISCIPLINE (worktree)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. `git status --short` clean.
3. `git merge main` (or confirm base == `75f724af`).
4. `bun install`. 5. `bun run pretest` (populates samples dist for the browser suite).
- ALL edits via **Bash** (`perl`/`python3`/heredoc) on **worktree-absolute paths incl. `.claude/worktrees/agent-<id>/`** — NOT Edit/Write, NOT bare main-absolute (S126 + S176: the hook does NOT catch Bash writes — self-enforce the prefix). NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"` / `bun --cwd "$WORKTREE_ROOT"`.
- First commit message embeds startup `pwd`. Commit per unit. `git status` clean before DONE (S83).

---

# THE BUG — root

`compiler/src/runtime-template.js` → `function _loadStdlibChunk(name)` (~L47). It reads
`compiler/runtime/stdlib/<name>.js`, extracts exported names, then:
```
const stripped = source
  .replace(/^export /gm, "")
  .replace(/^import[\s\S]*?;[ \t]*$\n?/gm, "");   // <-- STRIPS ALL IMPORTS (the bug)
return `_scrml_stdlib.${name} = (function() {\n` + stripped + `\n  return { ${exportedNames} };\n})();\n`;
```
Called for the 4 **client-inlined** shims: `auth`, `crypto`, `data`, `host`. (Server-only shims use the
separate `bundleStdlibForRun` path — already fixed S176; do NOT touch it.)

The strip is intentional for EXTERNAL imports (`bun`, `bun:sqlite`, `node:*`) that must loud-fail on the
client. The bug: it ALSO strips **sibling-shim** imports (`./math.js`, `./random.js`) which SHOULD be
inlined. Shims import siblings via RELATIVE FILE paths (e.g. `time.js` already has
`import { floor } from "./math.js"`; `http.js` has `import { random } from "./random.js"`), NOT `scrml:math`.

---

# THE FIX

## 1. `_loadStdlibChunk` — follow sibling-shim imports (transitive-inline)
Replace the blanket import-strip with a classifier:
- For each top-level `import { A, B as C, ... } from "<spec>";`:
  - **`<spec>` is a SIBLING shim** (a relative `./X.js` / `./sub/Y.js` under `compiler/runtime/stdlib/`):
    resolve the path relative to the shim's dir, read it, extract the DEFINITIONS of the imported symbols
    (the `export function NAME`/`export const NAME` whose name matches an import binding), strip their
    `export`, and PREPEND them to the IIFE body so they are in scope before the importing shim's code.
    Honor `as`-aliases (`import { post as httpPost }` → define `httpPost` = the imported `post` body, e.g.
    `const httpPost = post;` after inlining `post`, or rename — pick the cleaner). **Transitive:** an
    inlined sibling may itself import a sibling — recurse. **Dedup by name** within one IIFE (don't define
    the same helper twice; a closure over a Set of already-emitted names).
  - **`<spec>` is EXTERNAL** (`bun`, `bun:sqlite`, `node:*`, bare non-relative): STRIP (current loud-fail
    behavior — keep it; add a brief comment that the symbol will ReferenceError on the client, which is
    intended for server-only surfaces reaching client emission).
- Keep `export `-stripping + the `return { exportedNames }` wrapper unchanged (the IMPORTING shim's
  exports are unchanged; inlined sibling fns are IIFE-local helpers, NOT re-exported).
- math.js's fns are leaf (pure `Math.*`/`Number.*` wrappers, no inter-deps) so the common path is shallow;
  build the recursion general but it won't go deep for math/random.

**Guard:** a name collision (an imported sibling symbol equals a name the importing shim itself defines)
would shadow/double-define. The de-leak below AVOIDS this (data.js imports min/max/ceil — NOT clamp,
which data.js defines itself). If your inliner detects a collision, prefer the importing shim's own def +
skip the inline for that name (or emit a clear build-time error). Document the chosen behavior.

## 2. De-leak `compiler/runtime/stdlib/data.js` (2 raw Math sites → scrml:math)
Add `import { min, max, ceil } from "./math.js";` at the top (NOT `clamp` — data.js exports its own `clamp`).
- `clamp` (line ~382): `return Math.min(Math.max(value, minimum), maximum);` → `return min(max(value, minimum), maximum);`
- `paginate` (line ~387): `Math.ceil(total / pageSize)` → `ceil(total / pageSize)`.
After: `grep 'Math\.' data.js` → 0 sites.

## 3. De-leak `compiler/runtime/stdlib/auth.js` (7 raw Math → scrml:math; LEAVE Date.now())
Add `import { floor, max } from "./math.js";`. Rewrite the 7 sites:
- 5× `Math.floor(...)` → `floor(...)` (lines ~90, ~129, ~233, ~235, ~251).
- 2× `Math.max(0, ...)` → `max(0, ...)` (lines ~183, ~197).
- **LEAVE `Date.now()` raw** — 3 of the floors wrap `Math.floor(Date.now() / 1000)` → becomes
  `floor(Date.now() / 1000)`. The `Date.now()` clock touch is a SEPARATE leak class (scrml:time.now()),
  explicitly OUT OF SCOPE for this Math/inliner gap — do NOT route it through scrml:time (note it for a
  possible follow-on; auth JWT/TOTP timing is security-sensitive).
After: `grep 'Math\.' auth.js` → 0 sites (only `Date.now()` remains, which is not a `Math.` token).

---

# ACCEPTANCE GATE — the client de-leak must actually WORK (no ReferenceError)
The whole point: the inlined sibling fns must resolve at runtime in the client IIFE. Verify, don't assume:
- Compile a scrml app that USES `data.clamp` / `data.paginate` and an `auth` function (e.g. `createRateLimiter`),
  inspect the emitted `scrml-runtime.*.js` (or `.client.js`): the `_scrml_stdlib.data = (function(){...})()`
  IIFE now CONTAINS the inlined `min`/`max`/`ceil` definitions (and auth's IIFE contains `floor`/`max`);
  `node --check` clean; NO bare `import` left in the runtime.
- **Runtime callability check** (the load-bearing one — mirror an existing stdlib-runtime test, e.g.
  `compiler/tests/integration/form-for-stdlib-runtime.test.js` / `bug-18-scrml-stdlib-client-import.test.js`
  / `inline-function-bodies.test.js`): assert the inlined client shim is CALLABLE —
  `_scrml_stdlib.data.clamp(15, 0, 10) === 10`, `_scrml_stdlib.data.paginate([...], ...)` correct, an auth
  fn works — i.e. evaluate the emitted runtime (node `vm`/eval or happy-dom) and call through. A
  compile-clean result is NOT acceptance; the inlined fns must execute.
- **No server regression:** the server path (`bundleStdlibForRun`, time.js/http.js sibling copies) still
  works — run the full stdlib + server test suites.
- **De-leak verified:** `grep -c 'Math\.' compiler/runtime/stdlib/data.js` == 0; `auth.js` == 0 (Date.now stays).
- Add an inliner unit test: a client-inlined shim importing a sibling → the sibling fns are inlined +
  callable + the external-import strip still loud-fails (a synthetic shim importing `bun:sqlite` still
  strips). Mirror the existing stdlib-runtime test style.
- Pre-commit subset green; parser-conformance-within-node (no parser change — expect 0 drift, no rebump);
  full `bun run test` (the SCRML_RUNTIME string is shared by ALL emitted output — run the WHOLE suite).

**Scope guard:** runtime-template.js (the inliner) + data.js + auth.js + tests. Do NOT touch the server
`bundleStdlibForRun`, the native-parser, or `.scrml` mirrors. Do NOT touch `docs/known-gaps.md` (PA owns it).

---

# FINAL REPORT
- WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED.
- Inliner fix: the classifier (sibling-inline vs external-strip), transitive + dedup handling, collision policy.
- data.js + auth.js: the de-leaked sites (before/after), `grep -c 'Math\.'` = 0 each.
- Runtime callability proof: paste the test asserting `_scrml_stdlib.data.clamp(...)` etc. executes correctly + the emitted-IIFE excerpt showing the inlined math fns.
- No-server-regression confirmation. external-import-still-strips confirmation.
- Pre-commit subset + full `bun run test` pass/skip/fail. within-node result. Maps line. git clean + per-unit commits.
