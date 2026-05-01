# Diagnosis: F-COMPILE-002 + F-BUILD-002 (paired)

## F-COMPILE-002 — codegen does not rewrite `./*.scrml` imports

### Two-layer architecture

`use-decl` and `import-decl` AST nodes flow through codegen via `fileAST.ast.imports`.
Codegen has TWO emit sites and ONE post-emit rewrite hook:

| Layer | Path | Behavior |
|---|---|---|
| **emit-client.ts:388-403** | client.js emit | ALREADY rewrites `.scrml` → `.client.js` per-import (in-emit) |
| **emit-server.ts:111-122** | server.js emit | DOES NOT rewrite — emits `stmt.source` verbatim |
| **emit-library.ts** | library.js emit | Reads imports from raw source text via `await import()` regex; does NOT touch AST `imports` array |
| **api.js:283 `rewriteRelativeImportPaths`** | post-emit pass | Only matches `\.js)\2` regex — `.scrml` extensions slip through |

### Root cause

Two issues, both must be fixed:
1. **emit-server.ts:111-122** lacks the `.scrml` → `.server.js` rewrite that emit-client.ts has.
2. **api.js:283 `rewriteRelativeImportPaths`** regex only matches `.js`. Even if emit-server.ts started writing `./foo.scrml`, the post-emit normalizer wouldn't touch the extension. (For relocation rewrites — when output dir != source dir — these `.scrml`-bearing imports would be mis-located AND unrewritten.)

### Mapping context (server vs client vs library)

scrml files emit varying combos of: server.js (when there are server functions / SQL / channels / auth middleware), client.js (when there's reactive UI), library.js (only in library mode), and pure helpers. So `import { x } from "./foo.scrml"` resolves to:

- In server.js context: target's compiled `./foo.server.js` (if foo has any server-bearing exports)
- In client.js context: target's compiled `./foo.client.js` (if foo has reactive declarations)

**Pure helpers** (e.g., `models/auth.scrml` exporting only constants like `SESSION_TTL_SECONDS`) emit a `.server.js` only — they have no reactive content. So in client.js, `import { SESSION_TTL_SECONDS } from "./auth.scrml"` should resolve to `./auth.client.js` IF that exists, otherwise `./auth.js`. But the current emit-client.ts unconditionally rewrites to `.client.js`, which works because pure-helper files DO get a client.js stub when imported by client code (or fail loudly).

For consistency and minimal blast radius, **the fix is simple, symmetric, and context-driven**:
- emit-server.ts: rewrite `.scrml` → `.server.js` (server-side imports refer to server-side compiled output of the imported file).
- emit-client.ts: already rewrites `.scrml` → `.client.js` (preserve existing).
- api.js `rewriteRelativeImportPaths`: extend regex to also match `.server.js`, `.client.js`, `.scrml` suffixes — though after the in-emit rewrites at server/client emit sites, no `.scrml` should reach this rewriter anymore for AST-emitted imports. It's defense-in-depth.

### Server-side pure-helper resolution

When `app.server.js` imports from `./models/auth.scrml`, and `auth.scrml` has only `const SESSION_DB_PATH = "..."` (no server functions), what does `auth.scrml` compile to?

Per `compiler/src/codegen/index.ts` (line 393, 530), the codegen emits per-file outputs based on what's IN the file. A pure-helper file with only consts/types still goes through codegen — the generated server.js would either be skipped (line 99-104 returns "" if no server-bearing nodes) or written. If skipped, then `app.server.js` importing `./models/auth.server.js` would FAIL because no `auth.server.js` exists.

This is the trickier sub-case: when the imported file IS a pure helper, server.js needs to resolve to whichever artifact actually contains the imported names. Looking at how this plays out in practice in the dispatch app:

- `models/auth.scrml` contains `const SESSION_DB_PATH = ...`, `const SESSION_TTL_SECONDS = ...`, `const rolePath = (role) => "..."`. No server functions, no reactive UI.
- It would compile to nothing useful per file (no server.js, no client.js). User-imported names DO need a destination.

**Therefore the fix needs to consider:** does each `.scrml` import resolve to `.server.js` always (in server-side emit context), and is that file always emitted?

Looking at codegen/index.ts more carefully:

I'll check this empirically by compiling a pure-helper file and seeing what artifacts exist.

### Decision

The simplest, least-invasive fix:
- **emit-server.ts:** mirror emit-client.ts's pattern. Rewrite `.scrml` → `.server.js`.
- **api.js `rewriteRelativeImportPaths`:** extend regex to handle `.scrml`, `.server.js`, `.client.js` extensions — but only when the path needs relocation (output dir != source dir). For `.scrml` specifically, treat it like a sibling (already-rewritten) extension.

**Rationale:** server.js ALWAYS exists for any imported file when imported by another server module — even pure-helper modules. Codegen emits a `.server.js` whenever the file is referenced as an import target, OR we need to ensure that's the case. Empirical verification needed.

Actually, looking at this from a cleaner angle: the rewrite layer at emit-server.ts is the right place to do the in-emit `.scrml` → `.server.js` substitution, mirroring emit-client.ts. The post-emit `rewriteRelativeImportPaths` then handles relocation correctly because it sees `.server.js` (already in its regex).

**Empirical check needed:** does importing a pure-helper `.scrml` produce a `.server.js` artifact? Will verify in the test fixture.

---

## F-BUILD-002 — duplicate `_scrml_session_destroy` import → SyntaxError

### Source-of-truth chain

1. **emit-server.ts:165-178** emits `export const _scrml_session_destroy = { ... }` from EVERY server.js that has `authMiddlewareEntry`. This is the auth/session POST handler at `/_scrml/session/destroy`.
2. **build.js:122-166** `discoverServerRoutes` walks all `*.server.js` files, reads their named `_scrml_*` exports, and builds `serverModules[].routeNames` = `["_scrml_session_destroy", "_scrml_route_X", ...]`.
3. **build.js:200-209** `generateServerEntry` for each module emits:
   ```js
   import { ${allNames.join(", ")} } from "./${filename}";
   ```
   So if N modules export `_scrml_session_destroy`, the entry has N lines all importing the same name → SyntaxError.

### Auth middleware is per-page, but session-destroy is global

`_scrml_session_destroy` is the single endpoint `/_scrml/session/destroy` (POST). It's emitted once per file because each server.js is built standalone. But functionally only ONE of these routes is needed — they all do the same thing (clear the cookie, return 200).

### Fix shape decision

Per the dispatch's defaults: option (a) namespace imports is cleanest. Option (d) — skip duplicates — is even simpler and matches the actual intent (one handler total).

**Choice: Option (d) — de-duplicate by name in `generateServerEntry`.** Track which names have already been imported; skip subsequent imports of the same name. The retained import wins. The first server.js that exports `_scrml_session_destroy` provides it; subsequent ones contribute their unique routes only.

This is correct because:
- All `_scrml_session_destroy` exports are identical in shape (compiler-generated boilerplate).
- The route registry (line 220) only needs ONE `_scrml_session_destroy` to register the endpoint.
- Other route names (`_scrml_route_<unique>`) are file-unique by construction (route paths are unique per scrml file).

This is simpler than (a) namespace imports and avoids the per-call indirection of `_m1._scrml_session_destroy()`.

### Implementation

In `generateServerEntry` (build.js:181):
- Maintain a `Set<string>` of already-imported names.
- For each server module, filter its `allNames` to only include names not yet seen.
- If the filtered list is empty, skip the import line entirely.
- Add accepted names to the seen set.

This change is local to `generateServerEntry`; it does not require any change to `discoverServerRoutes`, codegen, or runtime. All tests that depend on the entry shape continue to pass because the entry is still well-formed JavaScript.

---

## Plan

### F-COMPILE-002 fix

1. emit-server.ts:111-122 — add `.scrml` → `.server.js` rewrite (mirror emit-client.ts:388-403).
2. api.js:283 `rewriteRelativeImportPaths` — extend regex to also match `.server.js` and `.client.js` extensions (currently only `.js`).
3. Empirical check: does pure-helper `.scrml` always produce `.server.js`? Verify in fixture.

### F-BUILD-002 fix

1. build.js:181 `generateServerEntry` — de-duplicate imported names across modules using a seen-set.

### Tests

For F-COMPILE-002:
- Fixture: a parent `.scrml` with `${ import { x } from "./helper.scrml" }` + a helper `.scrml` exporting x. Compile both. Assert emitted server.js contains `from "./helper.server.js"`.
- Same for client.js (already works — keep regression coverage).

For F-BUILD-002:
- Fixture: 2 server.js files each exporting `_scrml_session_destroy`. Run discoverServerRoutes + generateServerEntry. Assert generated entry has exactly one `import { _scrml_session_destroy } from "./X.server.js"` line. Assert `node --check` (or `await import()` in Bun) succeeds.
