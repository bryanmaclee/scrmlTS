# OQ-2 reproduction

## Command
```
bun ./compiler/src/cli.js dev examples/23-trucking-dispatch/
```

## Captured failures (cwd = WORKTREE_ROOT, HEAD = 3dab098)

```
[dev] Failed to import billing.server.js: Unexpected .
[dev] Failed to import load-new.server.js: Unexpected .
[dev] Failed to import load-detail.server.js: Unexpected ;
[dev] Failed to import register.server.js: Cannot find package 'scrml:auth' from '/.../dist/register.server.js'
[dev] Failed to import board.server.js: Unexpected .
[dev] Failed to import app.server.js: Cannot find package 'scrml:auth' from '/.../dist/app.server.js'
[dev] Failed to import customers.server.js: Unexpected .
[dev] Failed to import invoices.server.js: Unexpected ;
[dev] Failed to import home.server.js: Unexpected ;
[dev] Failed to import login.server.js: Cannot find package 'scrml:auth' from '/.../dist/login.server.js'
[dev] Failed to import quote.server.js: Unexpected ;
[dev] Failed to import drivers.server.js: Unexpected .
[dev] Failed to import loads.server.js: Unexpected ;
[dev] Failed to import load-log.server.js: Unexpected ;
[dev] Failed to import hos.server.js: Unexpected ;
[dev] Failed to import messages.server.js: Unexpected ;
[dev] Failed to import profile.server.js: Cannot find package 'scrml:store' from '/.../dist/profile.server.js'
```

## Two distinct failure classes

### Class A — Stdlib virtual-module resolution failure (OQ-2 proper)

Files: `app.server.js`, `login.server.js`, `register.server.js`, `profile.server.js`

These emit literal `import { … } from "scrml:auth"` / `"scrml:store"`. Bun's import
resolver does not recognize `scrml:*` schemes — they are not registered as packages,
not in an import map, not virtualized. `node --check` PASSES on these files (valid
syntax). The failure is at `await import()` time inside `dev.js`.

Example — `dist/login.server.js` lines 4-6:
```js
import { hashPassword, verifyPassword } from "scrml:auth";
import { generateToken } from "scrml:crypto";
import { createSessionStore } from "scrml:store";
```

This is the **OQ-2 W0b scope**.

### Class B — SQL `?{}` trailing-content boundary failures (DIFFERENT BUG)

Files: `billing.server.js`, `home.server.js`, `load-detail.server.js`, etc.

These show patterns like:
```js
  const loads = /* sql-ref:-1 */.all();
  const currentLoad = /* sql-ref:-1 */;
```

`sql-ref:-1` is the codegen's "unresolved SQL block" placeholder, emitted because BS
warned upstream: `statement boundary not detected — trailing content would be silently
dropped`. The 28+ "statement boundary not detected" warnings in the dev output
correspond 1:1 with these emit sites.

`node --check` FAILS on these files (genuine syntax error in emitted JS).

This is a **separate, pre-existing parsing bug** unique to the dispatch app's complex
multi-line SQL with backticks split across `?{...}` boundaries. It is NOT covered
by OQ-2's "stdlib resolution" framing in the deep-dive (§2 / §8.2 / §12.3 all describe
OQ-2 as M16 stdlib/CLI gap).

**This dispatch will NOT fix Class B.** It will be surfaced in progress.md as an
adjacent finding for the supervising PA to scope separately. (Likely candidates:
F-LIN-001 follow-on, SQL parser robustness in BS/TAB.)

## Smoke-test target after Class A fix

After the fix lands, files that have ONLY Class A errors (login, register, app,
profile) should import cleanly. Files with Class B errors will still fail their
imports — that's correct, since Class B is out of scope. We will not declare OQ-2
"fully resolved" until both classes are closed; we WILL declare OQ-2's M16 stdlib
half resolved.
