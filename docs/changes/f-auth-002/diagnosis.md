# F-AUTH-002 Diagnosis

**Bug:** A `server function` exported from a pure-fn file (e.g.,
`examples/23-trucking-dispatch/models/auth.scrml`) cannot use `?{}` SQL
templates. Compiler does not produce a usable artifact when the importing
file is a `<program db=...>` page.

**Spec gap:** SPEC §44.7 lists `E-SQL-004: ?{} has no db= in any ancestor
<program>` as the gate. SPEC §21.5 says pure-type files emit only a JS
module with exported bindings. SPEC has no contract describing how a
`?{}` inside an exported `server function` resolves its db driver when
the file lives outside any `<program db=>` ancestor.

## Reproducer

```
/tmp/f-auth-002-repro/models/auth.scrml
${
    export server function getUser(userId) {
        return ?{`SELECT id, email FROM users WHERE id = ${userId}`}.get()
    }
}
```

```
/tmp/f-auth-002-repro/app.scrml
<program db=":memory:">
< schema> users { id: integer primary key, email: text not null unique } </>
< db src=":memory:" tables="users">
    ${
        import { getUser } from './models/auth.scrml'
    }
    server @currentUser = getUser(1)
    <main><p>{@currentUser?.email ?? "loading"}</p></main>
</>
</program>
```

`bun compiler/src/cli.js compile /tmp/f-auth-002-repro/app.scrml` produces:

1. `E-IMPORT-004: getUser is not exported by ./models/auth.scrml`
2. `E-PA-002: Database file does not exist` (infra noise — irrelevant to bug)
3. `E-CG-006: Server-only pattern detected in client JS output` (cascade)

## Root cause(s)

### Layer 1 — Export regex blind to `server` modifier

`compiler/src/ast-builder.js:3901`:

```js
const declMatch = expr.match(/^\s*(type|function|fn|const|let)\s+(\w+)/);
```

When the user writes `export server function getUser(...)`, the
collected `expr` starts with `server function getUser(...)` (the leading
`export` keyword is consumed before `collectExpr`). The regex's first
group has no `server` alternative, so `declMatch` is `null`. The export
node is recorded with `exportedName: null` and `exportKind: null`.

`module-resolver.js:165-178` reads `exp.exportedName`. Because it's
`null`, no entry is registered for `getUser` in the export registry.
Cross-file validation (`validateImports`) then fires E-IMPORT-004 when
`app.scrml` imports `getUser`.

The same regex omits `server fn` — a parallel bug. Both forms (`server
function` and `server fn`) are valid declarations elsewhere in the
parser (ast-builder.js:4558-4577 handles them in body-position) but the
top-level export-decl regex was never extended.

### Layer 2 — `?{}` driver resolution depends on ancestor `<program db=>`

`compiler/src/codegen/index.ts:275-327` annotates `_dbVar` on
descendants of `<program db=...>`. A pure-fn file has no `<program>`
ancestor, so its server function's `?{}` blocks see `_dbVar = undefined`
in `CompileContext`.

When `emit-server.ts` processes the function body and rewrites `?{}`
through `rewriteServerExpr(...)`, the `dbVar` parameter falls back to
the module-level default `_scrml_sql` (`compiler/src/codegen/rewrite.ts:1792`).

Pure-fn files do not emit a `_scrml_sql` initializer in their server.js
output (no program lifecycle). So at runtime the imported server
function would reference an undefined symbol if it ran in its own
file's compilation unit.

### Layer 3 — No spec contract for "module with imported db context"

SPEC §21.5 (pure-type files) describes JS module output but doesn't
discuss SQL access. SPEC §44.2 requires "the closest ancestor
`<program db=...>`" — silent on the cross-file case.

There are two viable contract shapes (deep-dive §5.1):

- **Shape A — Resolve at import-site:** When a `<program db=X>` page
  imports `getUser` from a pure-fn file, the SQL pass treats the
  importing context's db as the resolution scope for any `?{}` inside
  the imported function. Validation: importing the same pure-fn file
  from a non-db context fires a hard error.
- **Shape B — Module-with-db-context declaration:** Pure-fn files
  declare `< db>` (or a similar marker) at file top to assert "this
  module uses `?{}` and expects to be imported into a `<program db=>`
  context." Lighter spec change.
- **Shape C — Both:** Spec defines the contract (B) + impl resolves at
  import-site (A). Validation prevents misuse.

**Selected shape: C with minimal markup.** The new contract:

1. SPEC §21.5 extends to allow exported `server function` definitions
   that contain `?{}` blocks. Files containing such functions remain
   pure-fn files (no `<program>`, no markup, no CSS).
2. The compiler resolves `?{}` inside an imported `server function`
   against the **importing call site's** db scope. The importing site
   must have a `<program db=>` ancestor; if not, a hard error fires
   (new code, e.g., `E-SQL-009: server function with ?{} imported from
   pure-fn file <path> requires importing site to have <program db=>
   ancestor`).
3. SPEC §44.2 amended: when the `?{}` belongs to a server function
   defined in a pure-fn file, the driver is determined by the importing
   `<program db=>` (transitively, via the import call's lexical scope
   in the importing page).
4. No new file-level marker required — the EXISTENCE of an `export
   server function` containing `?{}` in a pure-fn file is the implicit
   declaration of intent.

## Implementation strategy

The pipeline already inlines server-side dispatch via the importing
page's `_dbVar` (`_scrml_sql_<n>`). The fix is concentrated in
**emit-server.ts** + the cross-file callsite resolution: when an imported
`server function` is invoked, the server.js for the importing PAGE
embeds the function body with the page's `_dbVar` substituted in. The
pure-fn file's own emit can be made to produce a re-exported wrapper or
(simpler) the module-resolver can mark such functions as "import-site
inlined" and the page emit emits the body inline at call-resolution
time.

Concretely:

1. **Fix Layer 1 first (regex).** Extend the export regex to recognize
   `server function`, `server fn`, `pure function`, `pure fn`, and
   `pure server function` / `pure server fn`. Cleanly captures
   `exportedName` for module-resolver.

2. **Layer 2 (driver resolution at call site).** When the page emits a
   call to an imported server function, the page's compiler-stage
   already knows the importing db scope (`_dbVar` annotation from
   §4.12.6). Instead of generating a fetch-style RPC to the pure-fn
   file's server route, the compiler INLINES the server function body
   into the page's server.js, with `_dbVar` substituted from the page's
   scope. The pure-fn file's compiled output then carries no `?{}`
   references at all — its server.js is empty (or just constants /
   pure-fn helpers).

3. **Layer 3 (spec amendment).** Add §21.5.1 (or extension to §44.2)
   describing the import-site db-context contract + new error code
   (likely `E-SQL-009`).

4. **Validation gate.** When a pure-fn file's `export server function`
   contains `?{}`, every importing site MUST have a `<program db=>`
   ancestor. If a site without `<program db=>` imports it, fire
   `E-SQL-009`. Module-resolver gains a flag-walk: identify pure-fn
   `server function` exports that contain `?{}`, propagate the flag to
   the import graph, validate at the importing site.

## Scope decision

Layer 1 (regex) + Layer 3 (SPEC amendment) + minimal Layer 2 (callsite
inlining) is a coherent W5 unit. The "lift function body into importing
page's server.js" is the surgical change that makes the whole thing
work without inventing a new emission target.

If callsite-inlining is too invasive (e.g., touches multiple emitters
across the codegen tree), a fallback is to compile the pure-fn module
to a SHARED-STATE server.js that the page's server.js initializes with
the page's db variable at boot. That trades runtime indirection for
codegen surgery. Defer that decision to mid-implementation.

## Tests required

1. `compiler/tests/integration/f-auth-002-pure-fn-sql.test.js` —
   2-file fixture: `models/auth.scrml` (pure-fn export with `?{}`) +
   `app.scrml` (`<program db=>` imports `getUser`). Assert compiles
   clean + emitted server.js binds the db variable correctly.
2. Validation test: `bad-app.scrml` (no `<program db=>`) imports the
   pure-fn module with `?{}` — assert `E-SQL-009` (or whichever code
   the spec amendment defines).
3. Smoke-test: load the emitted server.js in Bun, invoke the imported
   server function, verify SQL works against `:memory:` db.
4. Unit tests for the export regex change (covers `server function`,
   `server fn`, `pure function`, `pure fn`, etc.).
