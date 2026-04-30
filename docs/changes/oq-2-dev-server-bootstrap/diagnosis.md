# OQ-2 Diagnosis

## Summary

**Root cause is NOT specific to the dev server.** Both `scrml compile` and `scrml dev`
emit the same broken output for any file that imports a `scrml:*` stdlib module.
Specifically, the codegen at `compiler/src/codegen/emit-server.ts:117` and
`compiler/src/codegen/emit-client.ts:401` emits literal
`import { ... } from "scrml:auth"` into the output JS file. Bun's import resolver does
not know what `scrml:auth` is (no package.json `imports` map, no Bun loader plugin, no
filesystem entry for the literal specifier), so any attempt to `import()` the emitted
file at runtime fails with `Cannot find package 'scrml:auth'`.

The `scrml:` scheme is only resolved at **compile time** (in `module-resolver.js`)
for the purpose of import-graph cycle detection and stage 5 (RI) server-side detection.
The compiler does NOT bundle, copy, or otherwise materialize stdlib modules into the
output directory, and does NOT rewrite the `scrml:*` specifier to point at any runtime
artifact.

The dispatch app is the FIRST example in the corpus that imports stdlib modules at
runtime — every other `examples/*.scrml` is single-file and either has no imports or
imports only its own runtime code. There are zero existing samples that exercise this
path, which is why the bug went silent for the entire history of the M1-M6 dispatch
build.

## Evidence

### 1. Compile alone reproduces the failure

```
$ bun ./compiler/src/cli.js compile examples/23-trucking-dispatch/
Compiled 32 files in 1311ms -> examples/23-trucking-dispatch/dist/

$ bun -e 'await import("./examples/23-trucking-dispatch/dist/login.server.js")'
error: Cannot find package 'scrml:auth' from
       '/.../dist/login.server.js'
```

The dev server is NOT involved. This is a pure compile + import test.

### 2. The codegen emits literal `scrml:*` specifiers

`compiler/src/codegen/emit-server.ts:113-122`:

```ts
for (const stmt of allImports) {
  if ((stmt.kind === "import-decl" || stmt.kind === "use-decl") && stmt.source && stmt.names?.length > 0) {
    const names: string = stmt.names.join(", ");
    if (stmt.isDefault) {
      lines.push(`import ${names} from ${JSON.stringify(stmt.source)};`);
    } else {
      lines.push(`import { ${names} } from ${JSON.stringify(stmt.source)};`);
    }
  }
}
```

`stmt.source` is `"scrml:auth"`, the JSON-stringified output is `"scrml:auth"`, and that
is what ends up in `login.server.js`.

`compiler/src/codegen/emit-client.ts:386-403` does the same for the client bundle, with
this comment that turned out to be wrong:

```ts
// scrml: and vendor: prefixed imports pass through unchanged — they are valid
// Bun module specifiers and resolve at runtime against the bundled stdlib.
```

There is no "bundled stdlib." There is no Bun plugin or import map registering
`scrml:*` specifiers. The comment describes a contract that is not implemented.

### 3. The cross-file-import-export test asserts the broken behavior

`compiler/tests/unit/cross-file-import-export.test.js:549-550` and surrounding tests
explicitly assert `expect(clientJs).toContain('import { session } from "scrml:auth"')`.
That contract IS the bug — passing through `scrml:` specifiers verbatim is exactly
what produces unloadable JS.

### 4. The compile-time resolver knows where stdlib lives

`compiler/src/module-resolver.js:402` defines `STDLIB_ROOT` and resolves
`scrml:auth` → `<repo>/stdlib/auth/index.scrml`. So we know the correct on-disk source
location at compile time. The gap is the bridge from that compile-time resolution to a
runtime-loadable artifact.

### 5. The dispatch app is the first runtime adopter

```
$ grep -l "scrml:auth\|scrml:crypto\|scrml:store\|scrml:data" examples/*.scrml
(no matches)
```

Single-file examples never used stdlib. The dispatch app's 33 source files are the
first time the runtime path was exercised — and it failed on day one.

## Failure classes in OQ-2 output

The 17 dev-server failures sort into **two distinct classes**:

### Class A — Stdlib resolution (this dispatch's scope)

4 of 17 failures: `app.server.js`, `login.server.js`, `register.server.js`,
`profile.server.js`. Each fails with `Cannot find package 'scrml:auth'` (or
`'scrml:store'` for profile). `node --check` PASSES on these — they are syntactically
valid; they fail at `import()` time.

### Class B — SQL `?{}` boundary parsing failures (DIFFERENT BUG)

13 of 17 failures: `billing.server.js`, `home.server.js`, `load-detail.server.js`, etc.
Each fails with `Unexpected .` / `Unexpected ;`. Pattern:

```js
  const loads = /* sql-ref:-1 */.all();
  const currentLoad = /* sql-ref:-1 */;
```

`sql-ref:-1` is the codegen's "unresolved SQL block" placeholder, emitted because BS/TAB
warned upstream: `statement boundary not detected — trailing content would be silently
dropped`. `node --check` FAILS on these.

This is a **separate parser bug** unique to the dispatch app's complex multi-line SQL
with backticks split across `?{...}` boundaries (cf. F-LIN-001 follow-on). It is NOT
covered by the deep-dive's M16 stdlib/CLI gap framing for OQ-2. **This dispatch will
NOT fix Class B** — it will be surfaced for separate scoping.

## Decision matrix — fix shape

The brief lists 4 candidate fix shapes. After diagnosis:

### Shape A — Dev-server intercepts `scrml:*` at request time

Rejected. The bug reproduces with `compile` alone, no dev server involved. A dev-only
fix would diverge `compile` and `dev` outputs (the brief explicitly warns against this).
Also: `import()` runs in the same Bun process as the dev server — there is no HTTP
request to intercept; the `scrml:auth` resolution failure happens inside Bun's loader,
before any request handler runs.

### Shape B — Codegen emits a relative path to a precompiled stdlib output

**Selected.** This is the cleanest fix that aligns compile and dev paths.

Mechanism:
1. The compiler discovers stdlib imports in the input set (via existing
   `module-resolver.js` graph build).
2. Compile each referenced stdlib module to `<outputDir>/_scrml/<name>.server.js` (and
   `.client.js` for browser-reachable modules).
3. Rewrite emitted `import { ... } from "scrml:auth"` to
   `import { ... } from "<relative-path-to-_scrml/auth.server.js>"` at codegen time.

This keeps the `compile` and `dev` output identical, makes the artifacts portable
(can be served as static files by any Bun server), and does not require a separate
loader plugin or Bun-specific resolution magic.

### Shape C — package.json `imports` map / Bun loader plugin

Considered but inferior. An import map in `package.json` would resolve `scrml:auth` only
when Bun is invoked from the project root that has the map — it would NOT resolve when
the emitted JS is served as a static file or copied somewhere else. The Bun loader
plugin path would require runtime registration before the first `import()`, which only
works in the dev server (not in a bare-bones static deployment). Both options entangle
the dev-server runtime with the compiled output, which the brief explicitly warns
against ("dev-server should match build path").

### Shape D — Codegen bug for "Unexpected ./;"

Out of scope. As documented above, those failures are SQL `?{}` boundary failures, a
separate parsing bug unrelated to OQ-2's stdlib/M16 framing.

## Fix plan

Implement Shape B in three coordinated commits:

1. **Stdlib bundling pass in `api.js`**: After resolving the input file graph, collect
   the set of `scrml:*` specifiers referenced. For each, compile the corresponding
   stdlib `.scrml` file (using the SAME compileScrml pipeline) into
   `<outputDir>/_scrml/<name>.server.js` and (when relevant) `<name>.client.js`.
   Reuse the existing `compileScrml` pipeline — do not duplicate compilation logic.
2. **Codegen rewrite in `emit-server.ts` + `emit-client.ts`**: When emitting an import
   whose specifier starts with `scrml:`, rewrite the specifier at emit time to the
   relative path of the precompiled stdlib output. The path is computed from the source
   file's output location to `<outputDir>/_scrml/<name>.<server|client>.js`.
3. **Test coverage**: New integration test `compiler/tests/integration/scrml-stdlib-runtime-resolution.test.js`
   that compiles a minimal app with `<use scrml:auth />`, then `await import()`s the
   emitted `*.server.js` and asserts the import succeeds without `Cannot find package`.

## Constraints and risks

- Existing test `cross-file-import-export.test.js:549-550` asserts `scrml:auth` passes
  through verbatim. That assertion is the codification of the bug — it MUST be updated
  to reflect the new emit shape. Risk: this is a behavioral change visible to other
  users of the test fixture API.
- The dispatch app's 32 files reference 3 stdlib modules: `scrml:auth`, `scrml:crypto`,
  `scrml:store`. The dispatch dispatch app uses `models/auth.scrml` which imports from
  `scrml:auth` and `scrml:crypto`. Nested stdlib imports (e.g., `scrml:auth`'s
  `index.scrml` re-exports from `./jwt.scrml` + `./password.scrml`) must be handled
  transitively.
- Stdlib modules contain `server {}` blocks. The compiler's existing pipeline already
  handles `server {}` blocks correctly when compiling any `.scrml` file, so reusing
  `compileScrml` for stdlib should "just work" for that.
- The artifact path `<outputDir>/_scrml/` is namespaced to avoid collisions with user
  files and is consistent with the existing `_scrml_*` runtime symbol naming.

## Smoke-test target

After fix:
```
$ bun ./compiler/src/cli.js compile examples/23-trucking-dispatch/
$ bun -e 'await import("./examples/23-trucking-dispatch/dist/login.server.js")'
# Expected: silent success (loaded ok)

$ bun ./compiler/src/cli.js dev examples/23-trucking-dispatch/
# Expected: 4 stdlib failures (login/register/app/profile) gone.
# Class B failures remain, surfaced separately.
```
