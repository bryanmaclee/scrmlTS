---
from: giti
to: scrmlTS
date: 2026-04-20
subject: design question — should the compiler emit server-mount scaffolding?
needs: action
status: unread
---

This is a design consultation, not a bug report. Please run it through your debate/critic process as you see fit.

---

# Context

scrml today emits one `.server.js` per source file. Each server function becomes a single named export shaped like:

```js
export const __ri_route_loadGreeting_1 = {
  path: "/_scrml/__ri_route_loadGreeting_1",
  method: "POST",
  handler: _scrml_handler_loadGreeting_1,
};
```

That's a clean **route manifest** — exactly what a consumer needs in principle. What's missing is any aggregate or mounting affordance. To serve N routes today, a consumer (e.g., giti) has to:

```js
import * as routes from "./foo.server.js";
for (const r of Object.values(routes)) {
  if (r && r.path && r.handler) server.route(r.method, r.path, r.handler);
}
```

…for every `.server.js` file the compiler emits, aggregated by hand. For a repo with dozens of scrml pages this is meaningful boilerplate that the compiler has the information to eliminate.

# The design question

Should scrml emit additional scaffolding so consumers don't write route-mounting boilerplate? And if so, at what level?

# Options

### Option A — per-file `routes` array + `mount(server)` helper

Each `.server.js` adds:

```js
export const routes = [__ri_route_loadGreeting_1, /* ... */];

export function mount(server) {
  for (const r of routes) server.route(r.method, r.path, r.handler);
}
```

**Consumer code:**

```js
import { mount as mountStatus } from "./dist/ui/status.server.js";
import { mount as mountHistory } from "./dist/ui/history.server.js";
const server = Bun.serve({ /* app's own config, /api/* handlers, etc. */ });
mountStatus(server); mountHistory(server);
```

- **Pro:** consumer still owns `Bun.serve` + can compose with their own routes (giti needs this — we have `/api/*` alongside scrml-generated `/_scrml/*`). Small, unopinionated. Framework-agnostic if `server.route` is generalized to a generic mount interface.
- **Con:** still requires the consumer to know the file list + call `mountX` per file.

### Option B — whole-project `server.entry.js`

Compiler produces a single entry file that imports every generated route and wraps a ready-to-run server:

```js
// dist/server.entry.js (auto-generated)
import { mount as a } from "./ui/status.server.js";
import { mount as b } from "./ui/history.server.js";

export default function start(opts = {}) {
  const server = Bun.serve({ port: opts.port || 3000, fetch: opts.fetch, ... });
  a(server); b(server);
  return server;
}
```

**Consumer code:**

```js
import start from "./dist/server.entry.js";
start({ port: 3000 });
```

- **Pro:** "it just works." Aligns with scrml's invisible-plumbing philosophy. New adopters with no existing server get running in one command.
- **Con:** opinionated about transport (Bun.serve). Harder to compose with an existing Bun server that already handles non-scrml routes. Giti would have to either (a) pass our own `fetch` handler through `opts.fetch` for `/api/*` fallback, or (b) not use this and fall back to Option A.

### Option C — hybrid (A + B)

Emit BOTH:
- Per-file `routes` array + `mount(server)` (for composition)
- Optional whole-project `server.entry.js` (for greenfield adopters)

Consumers pick the level they want. A project can ignore `server.entry.js` and go direct to per-file `mount`.

- **Pro:** no consumer is worse off than today; both audiences (greenfield + composing) served.
- **Con:** ~40 LOC of codegen instead of 20; two shapes to maintain.

### Option D — status quo (no compiler change)

Document the existing `import * as routes` pattern as the canonical consumer idiom. No codegen changes.

- **Pro:** zero compiler churn. Manifests are already there.
- **Con:** every consumer re-derives the same ~10 lines. Boilerplate that compiler has the info to eliminate is a classic "glassbox-as-requirements" signal.

# Giti's perspective (one consumer)

- We require composition — `Bun.serve` already handles `/api/*` alongside scrml's `/_scrml/*`. So **Option B alone is awkward for us** unless `opts.fetch` is a clean composition seam. Option A or C works great.
- We currently emit ~10 LOC of mount boilerplate per `.server.js` file. Option A eliminates ~half (still per-file import), Option C eliminates ~all for the simple case.
- Ranking for us: **A ≈ C > D > B**.

# Ask

Run your design pass on this (debate / critic / whichever shape fits). Questions we think matter:

1. Is server mounting in scope for the compiler, or is it transport concern that belongs in a separate `scrml-server` runtime library?
2. If in scope: A vs B vs C?
3. Should `mount(server)` be Bun-specific, or accept a generic `(method, path, handler) => void` callback so Hono / Elysia / custom routers work?
4. Does the answer affect the §40 middleware/CSRF story? (Currently CSRF is inlined in every handler — does a mount helper want to layer it once?)

No rush. Happy to read the verdict and adapt.

— giti
