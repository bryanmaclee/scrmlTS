# Trucking Dispatch — Friction Findings

Living log of friction surfaced while writing the dispatch app. Format per scoping §9. Severity: P0 = silent failure / validation-principle violation; P1 = working but awkward; P2 = minor DX paper cut.

---

## F-AUTH-001 — `auth="role:X"` is silently inert (P0)

**Surfaced in:** M1 design (scoping §5 + §11); applies to every M2-M4 role-gated page.

**M2 confirmation:** All 6 dispatcher pages (board, load-new, load-detail,
drivers, customers, billing) now use the F-AUTH-001 server-side fallback
pattern: each page declares `<program auth="required">` and an inline
`getCurrentUser(sessionToken)` server fn that resolves the cookie + reads
the users row, plus a per-server-fn `if (!user || user.role != "dispatcher")
return { unauthorized: true }` guard. The page-level `auth="role:dispatcher"`
attribute (when written) is documentation only — no compiler effect, no
runtime gating. M2 ships with the attribute deliberately omitted from the
`<program>` openers (because the original `<page route= auth=>` wrapper
hits multi-error parse cascades when it lives inside `< db>`) — the role
check is server-side only. The result: the F-AUTH-001 friction is now
exercised six times in the codebase, exactly as intended by the scoping
doc's stress-test framing. No design change.

**What I tried:**
```scrml
<page route="/dispatch" auth="role:dispatcher">
  ...
</page>
```

**What didn't work:** Compiler accepts `auth="role:dispatcher"` as a generic HTML attribute with no error, no warning, and no runtime role-gating effect. Adopters reading the kickstarter or working from intuition will assume the attribute does what its name says — and the app will silently authorize everyone.

**Workaround used:** Server-side fallback. Every page that declares `auth="role:X"` must also call `checkRole(getCurrentUser(req.headers.cookie), "X")` from a server fn and `navigate("/login?reason=unauthorized")` if it fails. The `checkRole` helper is in `models/auth.scrml`. M1 documents the pattern but doesn't exercise it (only `/login` + `/register` are open).

**Suggests:** Either:
- Compiler should recognize `auth="role:..."` and emit role-gating codegen (preferred: makes the attribute do what it says); or
- Compiler should emit a warning (e.g. `W-AUTH-002`) when it sees an `auth=` value other than `required` / `optional` / `none` so adopters know the attribute is being ignored.

The current behavior — silent acceptance — directly contradicts the S49 validation principle ("if the compiler accepts something but it doesn't work at runtime, that's a P0 friction finding").

---

## F-AUTH-002 — Cross-file server functions with SQL access are not portable (P0)

**Surfaced in:** M1, when attempting to put `login()` / `register()` / `getCurrentUser()` in `models/auth.scrml` so multiple pages could import them.

**M2 confirmation:** Each of the 6 dispatcher pages duplicates the
~7-line `getCurrentUser(sessionToken)` server fn body inline. Total
duplication: ~42 LOC across the 6 pages doing the same session →
user-id → users-row lookup. Refactoring this into a shared helper file
hits E-SQL-004 the moment the helper has a `?{}` SQL block, so the
duplication is unavoidable. M2 confirms the friction is sharp and
load-bearing on every multi-page scrml app touching auth.

**What I tried:** Make `models/auth.scrml` a pure-fn file (§21.5) exporting `server function login(email, password)` etc., with `?{}` SQL blocks reading the `users` table.

**What didn't work:**
- E-SQL-004 fired at compile time: `?{}` block has no `db=` declaration in any ancestor `<program>`.
- Pure-fn files (no markup, no CSS) by definition have no `<program>` root, so they cannot host any `< db>` block, and any `?{}` they contain has no ancestor `<program db=>` to resolve against.
- Adding `<program db="./dispatch.db">` + `< db src="./dispatch.db" tables="users, customers">` to the file would make it a full page, not a pure-fn file — and would also create a separate program lifecycle that the importing page can't share session state with.

**Workaround used:** Inline `login()`, `register()`, and `getCurrentUser()` into `app.scrml`'s `< db>` block (M1). For M2-M6 pages that also need these, copy the function bodies into each page's own `< db>` block, OR wrap them in middleware (§40 `handle()`). Exporting non-SQL helpers (cookie parsing, role checks, constants) from `models/auth.scrml` works fine — the friction is specifically with `?{}`-using server fns.

**Suggests:** Either:
- §21 should be extended so that an exported `server function` carrying `?{}` is "portable" — at import time, the compiler resolves the `?{}` against the importing file's `< db>` block (or fails if absent); or
- A new file mode "module-with-db-context" that lets a non-page file declare `< db>` for its own server fns; or
- Document the gap explicitly in §21 + §44 so adopters know server fns with SQL must live in their using page.

The friction is sharp because the obvious abstraction (factor out auth into `models/auth.scrml`) is exactly what every multi-page app wants. Inlining session/user logic into every page is duplicative, error-prone, and undermines §21's promise of multi-file scrml.

---

## F-EQ-001 — `===` is not valid scrml (P2 — DX paper cut)

**Surfaced in:** M1, first draft of `models/auth.scrml`.

**What I tried:** `if (k === name)` — out of JS/TS instinct.

**What didn't work:** E-EQ-004 — *"`===` is not a valid scrml operator. Use `==` instead — scrml equality is always strict."*

**Workaround used:** Replaced `===` with `==`. Per §45.7, scrml `==` IS strict (lowers to `===` for primitives and `_scrml_structural_eq` for compound types in server bundles). No semantic change, but the sigil is different.

**Suggests:** This is well-documented in the kickstarter §3 anti-pattern table and the error message itself is excellent. Logging it not as a defect but as a data point on JS-instinct collisions — anyone porting JS to scrml will hit this within minutes. The error is already top-tier (clear code, clear message, clear suggestion). No action needed.

---

## F-SCHEMA-001 — `< schema>` block doesn't satisfy E-PA-002 (P1)

**Surfaced in:** M1, first compile of `app.scrml`.

**What I tried:** Declared all 9 tables in a `< schema>` block per §39, alongside `< db src="./dispatch.db" tables="...">`. Expected the compiler to use the `< schema>` declaration as the schema source for `?{}` PA validation.

**What didn't work:** E-PA-002 fired:
> "Database file `./dispatch.db` does not exist and no CREATE TABLE statement was found in any `?{}` block for tables `users, customers, ...`. Either create the database file first, or add a CREATE TABLE statement in a `?{}` block so the compiler can validate the schema at compile time."

The PA pass apparently looks for either a live DB file OR CREATE TABLE statements inside `?{}` blocks. It does NOT consult the `< schema>` declaration as a third source.

**Workaround used:** Bootstrap `dispatch.db` once at example-setup time using `bun -e "..."` with raw `CREATE TABLE IF NOT EXISTS` SQL (now committed alongside the example). Subsequent compiles see the live DB and pass PA. This works but defeats the "schema is code" promise of §39 — adopters can't just declare and compile.

**Suggests:** PA should treat a `< schema>` declaration as authoritative for table shape when no live DB file exists. The flow should be: declared schema → PA validation → compile → `scrml migrate` (or first run) materializes the DB. Currently §39 + PA disagree on which schema source is canonical.

Alternatively, the compiler could auto-bootstrap the DB from `< schema>` on first compile (writing the empty schema into a fresh SQLite file), so PA always has a live target.

---

## F-EXPORT-001 — `export server function` is not a recognized form (P1)

**Surfaced in:** M1, first draft of `seeds.scrml`.

**What I tried:**
```scrml
${
    export server function runSeeds() {
        ?{`INSERT ...`}.run()
    }
}
```

**What didn't work:** Compiler emits E-IMPORT-004 in the importing file: `runSeeds is not exported by ./seeds.scrml`. The `export` modifier is silently dropped (or never recognized) when followed by `server function`. Per §21.2 the valid forms are `export type`, `export function`, `export fn`, `export const`, `export let`. `export server function` isn't listed and isn't accepted.

**Workaround used:** Replace `export server function name() { body }` with `export function name() { server { body } }`. The wrapping client-side `export function` carries the export, and the inner `server { }` block makes the body server-only. Compiles clean and the `?{}` SQL inside resolves against the importing file's `< db>` ancestor.

**Suggests:** Either:
- Extend §21.2 to accept `export server function` as a valid declaration form, or
- Document the workaround in §21.2 + the kickstarter so adopters know to wrap server fns with `export function name() { server { ... } }`.

The workaround is mechanical but non-obvious — and the error message ("not exported") points to the wrong cause (the file isn't missing the export — it's the *form* that isn't recognized).

---

## F-AUTH-003 — W-AUTH-001 fires even when `auth=` IS explicit (P2)

**Surfaced in:** M1, login.scrml + register.scrml.

**What I tried:** Both pages have `<program db="../../dispatch.db" auth="optional">`. The `auth=` attribute is explicit and a recognized value (`optional`), and the page also declares `protect="password_hash"` on its `< db>` block.

**What didn't work:** Compiler emits W-AUTH-001:
> "File has protect= fields but no explicit auth= attribute. Auth middleware auto-injected (auth="required", csrf="auto"). Add `<program auth="required">` to control auth settings explicitly."

The warning explicitly says "no explicit auth= attribute" — but `auth="optional"` IS explicit. Either the check is reading `<program>` from the wrong scope (e.g. only the inner `< db>` block's auth), OR the warning logic is `protect= && auth != "required"` rather than `protect= && !has_explicit_auth`.

**Workaround used:** Live with the warning — behavior is correct (the page is reachable without a session, login works), only the diagnostic is wrong.

**Suggests:** Tighten the W-AUTH-001 trigger so it only fires when there's no `auth=` attribute on `<program>` at all. `auth="optional"`, `auth="none"`, and any other recognized value should suppress it.

---

## F-COMPONENT-001 — Bare `lift <ImportedComponent/>` hits E-COMPONENT-020; HTML wrapper required (P0)

**Surfaced in:** M2 first compile of `pages/dispatch/board.scrml`. Reproduces in any file that imports a component and uses it as the direct body of `lift`.

**What I tried:**
```scrml
${
    import { LoadCard } from '../../components/load-card.scrml'
    ...
}
${
    for (let l of @loads) {
        lift <LoadCard load=l customerName=l.customer_name/>
    }
}
```

**What didn't work:**
```
error [E-COMPONENT-020]: Component `LoadCard` is not defined in this file.
Define it with `const LoadCard = <element .../>` before using it, or check the
spelling.
  stage: CE
```

The error fires even though the `import` statement resolves cleanly (the
referenced file exists, the export name matches, no `E-IMPORT-*` errors).
Reproduces with the canonical `examples/22-multifile/components.scrml` shape
when consumed in any file other than the original `app.scrml`. Confirmed
minimal repro: copy `22-multifile/types.scrml` + `components.scrml` into a
fresh dir, add a new file with the imports + bare `lift <UserBadge/>` —
fails. Wrap the `<UserBadge/>` in any HTML element (e.g. `<li>`,
`<div>`) — succeeds.

**Workaround used:** Wrap the imported component call site inside a
`${ lift <wrapper>...</wrapper> }` block in markup position:
```scrml
${ lift <div><LoadCard load=l customerName=l.customer_name/></div> }
```
And inside `${ for ... }` loops:
```scrml
${
    for (let l of @loads) {
        lift <div><LoadCard load=l customerName=l.customer_name/></div>
    }
}
```
Both compile clean. **What does NOT work:**
- Bare `lift <Component/>` (no HTML wrapper) — fails E-COMPONENT-020.
- Direct markup `<div><Component/></div>` outside any `${ ... lift }` block — fails E-COMPONENT-020.
- Component as direct child of `<div>` outside a `lift` context — fails.

The component must be inside an HTML element AND inside a `lift` expression.

**Special case — `<tr>`-shaped components in tables:** Wrapping a `<tr>`-rooted
component in `<div>` breaks HTML semantics (a `<table>` body must contain
only `<tr>` rows). For `<DriverCard>`, `<CustomerCard>`, `<InvoiceCard>` —
the M2 workaround is to **import only the helper `fn`s** from the component
file (not the component itself), then inline the row markup at the call
site. The helpers (`driverStatusClasses`, `paymentTermsLabel`, etc.)
factor cleanly across files; only the markup has to be copied.

This is duplicative — the same `<tr><td>...</td>...</tr>` shape appears in
both the component file and the consuming page. The component-as-shared-row
abstraction is exactly what every list view wants and the gap kills it.

**Suggests:** Either:
- The component-expander pass (CE) should accept a directly-lifted
  imported component the same way it accepts an imported component
  embedded inside HTML markup; or
- The error message should explain the wrapper requirement so adopters
  don't think their import is broken.

This is sharp because the failure mode (`is not defined in this file`)
points the adopter toward the import statement, but the import is fine —
the lookup is a markup-position issue. Severity P0: silent acceptance of
the import + apparent-undefined at the use site is the validation-principle
failure (S49 row 169 — *"if compiler accepts X, X must do something"*).

The 22-multifile/app.scrml example escapes this gap because every
`<UserBadge>` use is already wrapped in `<li>`. M2's load card / status
badge / driver card usages all need the same wrapper or they fail.

**EXPANDED + ARCHITECTURAL (2026-04-30, S50):** Triage dispatch
discovered F-COMPONENT-001's visible failure is the **loud surface
of a much bigger architectural defect**: cross-file component
expansion does not work end-to-end on current scrmlTS. Three
intersecting faults: (F1) `hasAnyComponentRefsInLogic` doesn't
recurse into nested markup — wrapped patterns silently skip CE;
(F2) `runCEFile` looks up `exportRegistry.get(imp.source)` by raw
import-path string while production registries are keyed by absolute
filesystem path — lookup always misses; (F3) CLI reads `inputFiles`
only, never auto-gathers files reachable through imports.

**The wrapper "workaround" is a silent failure.** Wrapping a
component call in `<div>` makes the COMPILE succeed (Fault 1's
recursion guard skips CE entirely) but the emitted JS contains
`document.createElement("ComponentName")` — a phantom custom
element. The browser sees an unknown HTML element and renders
blank. Confirmed by independent reproduction:
`examples/22-multifile/dist/app.client.js` line 12 contains
`document.createElement("UserBadge")` (verified 2026-04-30).
**The canonical "multi-file scrml" example is silently broken.**

**Existing tests mask the bug.** `compiler/tests/unit/cross-file-components.test.js`
synthesizes key-matched `exportRegistry`/`fileASTMap` fixtures (the
test file's header documents this convention as "test-only key
synthesis"); they assert "no `isComponent: true` markup remains"
which passes when CE silently skips, AND they never diff emitted
JS for actual template expansion. Net: a passing test suite that
hides a P0 architectural defect.

**Affected surface:**
- `examples/22-multifile/` — silently broken, renders blank
- `examples/23-trucking-dispatch/components/` — every imported
  component in M2 is silently broken at runtime
- Any future multi-file scrml app that imports components

**Conservative fix is not viable.** Three rejected options
documented in `docs/changes/f-component-001/diagnosis.md`:
- Fix Fault 1 alone → wrapped cases START failing E-COMPONENT-020
  (regression on canonical examples)
- Fix Fault 2 alone → multi-stage propagation across module-resolver
  + api.js + AST contract; not narrow
- Silence the bare error → leaves output broken (validation-principle
  violation reinforced)

**Plan B disposition (2026-04-30, S50):**
- Cross-file component expansion is **known-broken** until a proper
  end-to-end deep-dive ships the architectural fix.
- M2 dispatch app's components live in `components/` but are NOT
  used by the consumer pages — M2's pages all inline their row
  markup directly (helper functions imported, markup inlined). This
  is the only pattern that actually renders correctly. Going
  forward: kickstarter v1 + master-list note flag the gap; M3-M6
  continue with inline-only.
- Post-M6, dispatch a deep-dive on cross-file component expansion
  with the full pattern catalog from M2-M6 in scope.

---

## F-COMPONENT-002 — Component prop names at call site become spurious local declarations (P1)

**Surfaced in:** M2 first compile of `pages/dispatch/load-detail.scrml` consuming the `<AssignmentPicker>` component.

**What I tried:**
```scrml
<AssignmentPicker
    drivers=@drivers
    tractors=@tractors
    trailers=@trailers
    currentDriverId=(@assignment == null ? 0 : @assignment.driver_id)
    currentTractorId=(@assignment == null ? 0 : @assignment.tractor_id)
    currentTrailerId=(@assignment == null ? 0 : @assignment.trailer_id)
    onAssign=saveAssignment
/>
```

The component declares those names in its `props={ ... }` spec. The
expressions on the right-hand side are valid (the @vars exist).

**What didn't work:**
```
error [E-MU-001]: Variable `currentTractorId` was declared but never used
before this scope closes.
error [E-MU-001]: Variable `currentTrailerId` was declared but never used
before this scope closes.
error [E-MU-001]: Variable `onAssign` was declared but never used before
this scope closes.
  stage: TS
```

The TypeScript-pass treats the prop names on the call-site as fresh
identifier *declarations* rather than as parameter-name labels for the
component. Since the page doesn't reference `currentTractorId` /
`currentTrailerId` / `onAssign` again, they're flagged as unused.

The errors don't even point to a file (the diagnostic emits `stage: TS`
with no `--> path:line:col` cursor), so reproducing or tracking them
required commenting out call sites one by one to bisect.

**Workaround used:** Declare a parallel `@var` for each prop name on the
consuming page, give it a real assignment in the `refresh()` body, and
pass `propName=@propName` instead of an inline expression:
```scrml
@currentDriverId  = 0
@currentTractorId = 0
@currentTrailerId = 0

function refresh() {
    ...
    const a = data.assignment
    @currentDriverId  = a ? a.driver_id  : 0
    @currentTractorId = a ? a.tractor_id : 0
    @currentTrailerId = a ? a.trailer_id : 0
}

<AssignmentPicker
    currentDriverId=@currentDriverId
    currentTractorId=@currentTractorId
    currentTrailerId=@currentTrailerId
    onAssign=saveAssignment
/>
```
This compiles clean. Note: I did NOT need a `@onAssign` — passing the
client function directly works once the rest is `@`-prefixed.

**Suggests:** The TS-pass should know that prop-name attributes on a
component opener (e.g. `currentTractorId=expr`) are call-site labels,
not new declarations. Severity P1: workaround is mechanical (~3 LOC per
component) but every call site has to know the gap exists. The error
without a file path makes diagnosis disproportionately hard — adopters
will spend 10x time hunting "what file is `currentTrailerId` in?"

---

## F-COMMENT-001 — HTML comments leak content into the parser/scope checker (P1)

**Surfaced in:** M2 first compiles of board.scrml + customers.scrml.

**What I tried:**
```scrml
<!-- F-AUTH-001 carryover: `auth="role:dispatcher"` documents intent; the
     runtime fallback in loadBoardData() does the actual gating.
     The `<page>` wrapper hits E-COMPONENT-020 ... -->
<div>...</div>
```

```scrml
<!-- Inline expanded detail row, visible when this customer's id matches @expandedId -->
${ if (c.id == @expandedId) { lift <tr>...</tr> } }
```

**What didn't work:**
- The first comment fired E-CTX-001 and E-CTX-003 — the BS pass tracked
  `<page>` from the comment text as if it were an open tag.
- The second fired E-SCOPE-001 on the bare word `when` — the TS pass
  parsed comment text as logic.

**Workaround used:** Remove any HTML-tag-like content (`<page>`,
`<for>`, etc.) and keyword-like words (`when`, `if`) from `<!-- ... -->`
comments. Use `//` JS-style comments inside `${ ... }` blocks instead;
they're never parsed as markup.

Better practice: keep HTML comments to short single-purpose annotations
that don't mention scrml or HTML keywords. Move documentation prose to
file-level `//` comments at the top.

**Suggests:** The lexer / BS pass should treat `<!-- ... -->` as a true
opaque comment region. Currently it appears the comment is consumed by
the markup-tokenizer but its content is also being lex-checked or
scope-checked in ways the `// ... ` JS comment isn't.

Severity P1: the failure mode is reliably reproducible but the error
messages point to the wrong line (the `<div>` or `${ ... }` *after* the
comment, not the comment itself), so adopters spend time chasing the
wrong code.

---

## F-RI-001 — Server-fn return-value branching escalates the wrapping client function to server (P0)

**Surfaced in:** M2 `transition()` and `saveAssignment()` in `load-detail.scrml`.

**What I tried:**
```scrml
function transition(target) {
    const tok = getSessionToken()
    const result = transitionStatusServer(tok, @load.id, target)
    if (result.unauthorized) {
        window.location.href = "/login?reason=unauthorized"
        return
    }
    if (result.error) {
        @errorMessage = result.error
        return
    }
    refresh()
}
```

**What didn't work:**
```
error [E-RI-002]: Server-escalated function `transition` assigns to a
`@` reactive variable. Reactive state is client-side; server functions
cannot mutate it directly. Move the reactive assignment to a client-side
callback, or restructure the function so the reactive mutation occurs on
the client.
  stage: RI
```

The compiler escalated `transition` to "server" because it calls a
server fn (`transitionStatusServer`), then complained that the same
function reassigns `@errorMessage`. Refactoring into a separate
`handleTransitionResult(result)` helper didn't help — that helper got
escalated instead. The 03-contact-book pattern (call server fn → assign
@var → done) compiles clean, but only when the server-fn return is
NOT inspected on the client side.

**Workaround used:** Restructure to:
```scrml
function transition(target) {
    @errorMessage = ""                              // 1. assign first
    const result = serverFn(tok, ...)               // 2. server call
    if (result.unauthorized) {                      // 3. exit early
        window.location.href = "..."
        return
    }
    if (!result.error) {                            // 4. happy path
        refresh()
        return
    }
    setError(result.error)                          // 5. setError helper
}

function setError(msg) {
    @errorMessage = msg
}
```

Key insight: an extra `@var = ""` BEFORE the server call seems to anchor
the function as client-side. Then the negative path delegates the @var
assignment to `setError()` (a separate client function), keeping the
escalation analysis happy.

Also: `if (result.error == null)` and `if (result.error is not)` both
fail (E-SYNTAX-042 + E-SCOPE-001 respectively). `if (!result.error)`
is the form that compiles.

**Suggests:**
- The escalation rule should accept "client function calls server fn,
  then conditionally assigns @vars" as canonical client-side. This is
  the Promise-chain pattern every full-stack framework uses. Adopters
  will write it 10x per app.
- E-SYNTAX-042's prescribed replacement (`x is not`) doesn't work for
  field access (`obj.error is not` → E-SCOPE-001). Either extend `is`
  to support field access or document `!field` as the correct form.

Severity P0: the canonical "call server fn, dispatch on result, update
UI" pattern doesn't compile. Adopters cannot ship without finding the
workaround through trial-and-error.

**PARTIAL RESOLUTION (2026-04-30, S50):** F-RI-001 is more nuanced than
the original M2 author understood AND more nuanced than the triage agent
concluded. Three distinct findings now separate from the original entry:

- **Isolated narrow patterns work** — single function calls server fn,
  branches, assigns `@var` on error path, and is the only function in
  the file (or has no peer functions that escalate). Triage doc-fix +
  7 regression tests in commits `d19faab..2b3b31b` (`compiler/tests/unit/route-inference-f-ri-001.test.js`)
  pin this case as supported.
- **Real-app file context still fails.** Attempted revert of the M2
  workaround in `load-detail.scrml` (transition + saveAssignment in the
  same file) confirmed `transition` fires E-RI-002 when paired with
  `saveAssignment` in the same file. **The fix's regression tests pass
  in isolation but don't cover this shape.** Workaround restored;
  `setError()` indirection + `@errorMessage = ""` anchor remain in
  `load-detail.scrml` until a narrower fix targets file-context analysis.
- **F-RI-001-FOLLOW** (the `is not` member-access bug) split out as a
  separate finding below — confirmed real, still open.
- **F-CPS-001** (architectural CPS-eligibility weakness) split out as
  a separate finding below — confirmed real via repro, but architectural
  (out of scope for any conservative fix).

What this means: F-RI-001 is downgraded from "fully stale" to "partial".
Adopters writing the canonical narrow pattern (one server call, branch,
@var assignment) will succeed. Adopters writing two server-call shapes
in one file may still hit E-RI-002 on the simpler one due to file-context
contamination of the analysis. Severity stays P0 because the trigger is
unpredictable from the adopter's perspective.

---

## F-RI-001-FOLLOW — `is not` doesn't support member-access targets (P1)

**Surfaced in:** F-RI-001 triage 2026-04-30 (S50). Split out as a separate finding.

**What I tried:**
```scrml
if (obj.error is not) { ... }    // intended: "obj.error is not assigned"
```

**What didn't work:** E-SCOPE-001 fires on `error` — the TS pass treats
the member-access right-hand side as a free identifier rather than as a
property name on `obj`.

**Workaround used:** `if (!obj.error)` compiles clean and has the same
semantics for nullable fields.

**Repro:** `docs/changes/f-ri-001/repro-follow.scrml`.

**Suggests:** Either:
- Extend `is`/`is not` to recognize `obj.field` and `obj.path.field` as
  valid LHS targets (would mirror the bare-identifier path through the
  TS pass), or
- Document `!field` as the canonical form for nullable member-access
  presence checks; demote `is not` to identifier-only.

Severity P1: workaround is one character (`!`) but the diagnostic
points to the wrong cause (`error` is unrecognized → wrong; the issue
is the LHS shape).

---

## F-CPS-001 — CPS-eligibility skips nested control-flow when finding reactive assignments (P1)

**Surfaced in:** F-RI-001 triage 2026-04-30 (S50). Adjacent finding the triage agent surfaced as out-of-scope for T2.

**What I tried (theoretical):**
```scrml
function loadAndShow() {
    const data = ?{`SELECT * FROM users WHERE id = ${id}`}.get()
    if (data == null) {
        @users = []                     // nested @var assignment
        return
    }
    @users = [data]                     // nested @var assignment
}
```

**What doesn't work:** When a function has BOTH a direct server trigger
(SQL `?{}` in body) AND a `@var` assignment buried inside an if/while/for
body, E-RI-002 fires. The reactive-assignment finder (`findReactiveAssignment`)
recurses into nested bodies; the CPS-eligibility analyzer
(`analyzeCPSEligibility`) only inspects top-level statements. CPS could
potentially split this shape, but the protocol currently carries only
one server-side intermediate (`_scrml_server_result`).

**Behavior is correct as-is** — the function IS server-bound (by the SQL
trigger) and CAN'T mutate client reactive state directly. So E-RI-002
firing is technically right. The friction is that CPS could potentially
rescue this shape but doesn't.

**Repro:** `docs/changes/f-ri-001/repro4.scrml`.

**Suggests:** Architectural — extend the CPS protocol to carry multiple
server-side intermediates to the client, then teach `analyzeCPSEligibility`
to recurse into nested statement bodies. Out of scope for any conservative
fix; would change the codegen contract.

Severity P1: not blocking (workaround is to lift the assignment out of
the conditional, or keep the flatter pattern of separate functions).
Logged for future deep-dive consideration.

---

## F-DESTRUCT-001 — Array destructuring inside `for-of` may confuse type-scope (P2)

**Surfaced in:** M1 first draft of `_readCookie` helper.

**What I tried:**
```scrml
for (const p of parts) {
    const [k, v] = p.trim().split("=")
    if (k === name) return v
}
```

**What didn't work:** E-SCOPE-001 fired for `k` and `v`: *"Undeclared identifier `k`/`v` in logic expression."* The destructuring binding wasn't recognized by the type-scope analyser inside the `for-of` body, even though it's a perfectly valid JS pattern.

**Workaround used:** Replaced array destructuring with explicit `indexOf("=")` + `substring()` calls:
```scrml
const eqIdx = piece.indexOf("=")
if (eqIdx < 0) continue
const k = piece.substring(0, eqIdx)
```
This compiles clean.

**Suggests:** Either:
- Type-scope pass should recognize array/object destructuring inside `const`/`let` declarations and bind the destructured names; or
- If destructuring is intentionally unsupported, document it in §6 + the kickstarter anti-pattern table.

The kickstarter doesn't mention this gap. Adopters will write destructuring liberally (it's idiomatic modern JS) and hit this. Severity P2 only because the workaround is short.

(Update: not 100% sure the root cause is destructuring vs. something else in my original snippet — needs an isolated repro before opening a compiler fix. Logging it here so M2-M6 watch for it.)

---

## F-MACHINE-001 — `<machine for=Type>` rejects imported types (P1)

**Surfaced in:** M3 `pages/driver/hos.scrml`. The HOS state machine declares
`<machine name=HOSMachine for=DriverStatus>` where `DriverStatus` is imported
from `schema.scrml` (where every other M3 file reads it from).

**What I tried:**
```scrml
${
    import { DriverStatus } from '../../schema.scrml'
}

< machine name=HOSMachine for=DriverStatus>
    .OffDuty      => .OnDuty | .SleeperBerth
    ...
</>
```

**What didn't work:**
```
error [E-MACHINE-004]: Machine 'HOSMachine' references unknown type
'DriverStatus'. The 'for' clause must name an enum or struct type
declared in this file or imported via 'use'.
  stage: TS
```

The error message says "imported via 'use'" — suggesting a capability
import is the recognized form. But §41.2 `use scrml:X` is for stdlib
capability imports, not for cross-file user types. There is no
`use ./schema.scrml` syntax.

**Workaround used:** Re-declare `DriverStatus` in `hos.scrml` as a local
enum (lifted from `schema.scrml` verbatim):

```scrml
${
    type DriverStatus:enum = {
        OffDuty
        OnDuty
        Driving
        SleeperBerth
    }
}

< machine name=HOSMachine for=DriverStatus>
    ...
</>
```

The duplication is ~6 LOC. The bigger problem is conceptual: the `schema.scrml`
file exists precisely so M2-M6 share enum spellings; the `<machine>` block
forces a violation of that contract.

**Suggests:** Either:
- `<machine for=>` should resolve through the same import scope as logic-block
  identifiers, accepting `import { Type } from './path.scrml'` declarations; or
- The error message should say which import forms it WILL accept (currently
  "imported via 'use'" is misleading for cross-file user types); or
- Document the gap explicitly in §51 (machine spec) so adopters know the
  type must be locally declared.

This is sharp because the cross-file type abstraction is the canonical
multi-file pattern. Severity P1: workaround is mechanical but the
duplication breaks the "single source of truth" promise of `schema.scrml`.

---

## F-NULL-001 — Files containing `<machine>` reject `null` literals/comparisons in client-fn bodies (P1)

**Surfaced in:** M3 `pages/driver/hos.scrml`. Client-side `function`s with
`null` literals or `== null` / `!= null` comparisons fire E-SYNTAX-042 in
GCP3 — but only in this file. Identical patterns in M2 dispatch pages
(load-detail, board, drivers, customers) compile clean.

**What I tried:**
```scrml
function computeHoursIn(target) {
    if (@driver != null && @driver.current_status == target) return 24
    return 0
}

function parseFromPayload(payload) {
    if (payload == null || payload == "") return ""
    ...
}
```

**What didn't work:** Five E-SYNTAX-042 errors fire, all in GCP3 stage,
none with line numbers:
```
error [E-SYNTAX-042]: `null` is not a scrml token — scrml uses `not` for
absence (§42). Replace `!= null` with `x is some` (checks for presence)
or `x is not` for absence.
  stage: GCP3
```

The errors only appear when the file also contains a `<machine>` block.
Removing the machine made identical null-checks compile fine. Adding the
machine back (with a locally-declared enum, per F-MACHINE-001) brings them
back. So the trigger is "machine present + null literals in client-fn
bodies".

**Workaround used:** Replace every `== null` / `!= null` with truthiness
checks (`if (!x)` / `if (x)`) and avoid `null` as a value (use empty
string sentinels for nullable strings, omit nullable fields from object
literals where possible). Concretely:

```scrml
// before
const lastAt = lastChange == null ? null : lastChange.at
return { lastChangeAt: lastAt }

// after
const lastAt = lastChange ? lastChange.at : ""
return { lastChangeAt: lastAt }
```

```scrml
// before
if (@driver != null && @driver.current_status == target) return 24

// after
const driver = @driver
if (!driver) return 0
if (driver.current_status == target) return 24
```

```scrml
// before
@lastChangeAt = null
@driver = null

// after — keep @driver = null at declaration (works); switch lastChangeAt
// to empty string + truthiness instead.
@driver = null
@lastChangeAt = ""
```

Note `@var = null` at declaration position still works in this file.
The trigger is specifically `null` in client-fn bodies and ternary
expressions — not the literal anywhere.

**Suggests:** Either:
- The E-SYNTAX-042 detector should treat the file the same way regardless
  of `<machine>` presence (and either continue to allow `== null` /
  `!= null` everywhere, or reject it everywhere — the current asymmetry is
  the validation-principle violation); or
- Document in §51 that `<machine>` files have stricter null syntax rules,
  and what the canonical alternative is.

The kickstarter v1 §3 anti-pattern table doesn't mention `null` as
forbidden. The error message recommends `is some` / `is not`, but both
forms have their own friction (F-RI-001-FOLLOW: `is not` doesn't support
member-access targets). The actual workaround that compiles is the truthiness
check — which is well-established JS but isn't what the error message
prescribes.

Severity P1 because the trigger is unpredictable (file gains or loses a
`<machine>` block and behavior of identical client-fn null-checks flips)
and the recommended fix path doesn't quite work. Not P0 because the
workaround is mechanical and short.

**Repro:** Remove `<machine>` block from hos.scrml → null-checks compile.
Re-add the block → the same null-checks fail. Smallest reproducible:
a file with just `<program>` + `${ }` containing a client `function f() { if (x == null) return 0 }` and a sibling `<machine>` block.

---

## F-PAREN-001 — `a + (b - c)` paren-stripping idempotency invariant (P2 — data point)

**Surfaced in:** M3 `pages/driver/hos.scrml` — both client-fn arithmetic
expressions and the home.scrml `cur == X && (newStatus == Y || newStatus == Z)`
pattern (M3 day 1).

**What I tried:**
```scrml
ms = ms + (atMs - prevMs)        // simple addition with a parenthesized subtraction
ms = ms + (nowMs - prevMs)
const hours = ms / (60 * 60 * 1000)
const mins = Math.floor((sinceMs - hours * 60 * 60 * 1000) / (60 * 1000))
```

**What didn't work:** The `compiler/tests/integration/expr-node-corpus-invariant.test.js`
"corpus invariant" test fires per-file and asserts the round-trip parse →
emit → reparse leaves the AST shape unchanged. My parens get stripped on
emit, then on reparse the result is no longer the same shape.

Pre-commit hook fails:
```
error: IDEMPOTENCY FAILURE in hos.scrml
  Field: initExpr (string field: init)
  AST node kind: tilde-decl
  ExprNode kind: binary
  Reparsed kind: binary
  Emitted string: ms + atMs - prevMs
```

The emitted string `ms + atMs - prevMs` is semantically equivalent to
`ms + (atMs - prevMs)` for primitive addition — but the AST shape is
different (the parens ARE in the original ExprNode), and the invariant
test refuses to accept the divergence.

**Workaround used:** Lift sub-expressions into intermediate `const`
bindings:
```scrml
const diff = atMs - prevMs
ms = ms + diff

const tail = nowMs - prevMs
ms = ms + tail

const hourMs = 60 * 60 * 1000
const hours = ms / hourMs
```

Same calculation; no parens needed.

**Suggests:** The invariant test is being faithful to the AST shape, which
is the right thing to do. The friction is that adopters write parens for
human-readability, not for precedence reasons, and don't expect the AST
to record them as load-bearing. The fix path is one of:
- The emitter should preserve trivial parens (cosmetic) so round-trip is
  faithful; or
- The invariant test should ignore cosmetic-only paren differences when
  the AST normalizes to the same precedence-aware shape; or
- Document in the kickstarter that adopters should avoid wrapping sub-
  expressions in parens unless required for precedence.

Severity P2 because the workaround (intermediate vars) is mechanical AND
arguably improves readability anyway. Logging this as a data point for
the future paren-handling debate. The same idempotency invariant fired
on M3 day 1 with `cur == "off_duty" && (newStatus == "on_duty" || newStatus == "sleeper_berth")` — split into separate conjuncts there.

---

## F-AUTH-001 — M3 RECONFIRMATION (P0)

All 6 driver pages use the same server-side fallback as M2: each page
declares its own `<program auth="required">` and inline `getCurrentUser()`
+ `if (!user || user.role != "driver")` guard. The page-level
`auth="role:driver"` attribute is documentation only.

Total reconfirmations across M2 + M3: **12 pages** (6 dispatcher + 6
driver). Every server fn that needs role gating has the same 4-line
copy-pasted guard. The friction is now exercised at scale.

No design change.

---

## F-AUTH-002 — M3 RECONFIRMATION (P0)

Each of the 6 driver pages duplicates the ~7-line `getCurrentUser`
server fn body inline. Combined with M2's 6 pages, the cumulative
inline-duplication is ~84 LOC across 12 pages doing the same session →
user-id → users-row lookup. M3 confirms the friction is sharp and
load-bearing on every multi-page scrml app touching auth.

No design change.

---

## F-COMPONENT-001 — M3 RECONFIRMATION (P0, architectural)

M3 ships zero cross-file component imports per kickstarter v1 + S50 plan
B. Every page imports helper functions (`driverStatusClasses`,
`driverStatusLabel`, `formatRate`, `formatPickupAt`, `statusBadgeClasses`,
`statusLabel`) and inlines the markup directly. The component-as-row
abstraction every list/card view wants remains broken; M3 reaffirms the
inline-only workaround works for app code.

No design change.

---

## F-NULL-002 — `!= null` / `== null` in server-fn bodies fires E-SYNTAX-042 (P1)

**Surfaced in:** M4 `pages/customer/invoices.scrml::markPaidServer`. The
server fn checked `if (inv.paid_at != null && inv.paid_at != "")` after a
`SELECT i.id, i.customer_id, i.paid_at FROM invoices ...`. The compiler
fired E-SYNTAX-042 in GCP3 with no line number.

**Distinct from F-NULL-001:** F-NULL-001 documents the trigger as "file
contains `<machine>`". F-NULL-002 reproduces in plain server-fn bodies
with no `<machine>` block in the file (or in the project). Minimal repro:

```scrml
<program>
${
  server function test() {
    const x = "hello"
    if (x != null) return { ok: true }   // E-SYNTAX-042 fires
    return { ok: false }
  }
}
<div>test</div>
</program>
```

Fails with `error [E-SYNTAX-042]: ... stage: GCP3` (no line/column).

**Markup-side null comparisons compile fine** in the same file:
```scrml
<div if=(@x != null && @x != "")>${@x}</div>   // OK
```

So the GCP3 detector is asymmetric: it inspects server-fn body
expressions but NOT markup `if=` attribute expressions or template
interpolations. This is the inverse of F-NULL-001 (which is the
machine-presence trigger affecting client-fn bodies).

**What I tried:**
```scrml
server function markPaidServer(sessionToken, invoiceId) {
    ...
    const inv = ?{`SELECT id, customer_id, paid_at FROM invoices WHERE id = ${invoiceId}`}.get()
    if (!inv) return { error: "Invoice not found." }
    if (inv.customer_id != customer.id) return { unauthorized: true }
    if (inv.paid_at != null && inv.paid_at != "") {        // ← fails here
        return { error: "Invoice already paid." }
    }
    ...
}
```

**Workaround used:** truthiness check.

```scrml
if (inv.paid_at) {
    return { error: "Invoice already paid." }
}
```

For a column that's TIMESTAMP (text or null in SQLite) this is fine —
empty-string and null both coerce to falsy. For numeric or boolean
columns the semantics may differ; in those cases the workaround is to
test against an obvious sentinel (`if (inv.x != 0)`).

**Suggests:**
- Bring the server-fn-body GCP3 detector in line with what's allowed in
  markup. Right now `!= null` / `== null` are accepted inside markup
  `if=` attributes and `${ ... ? ... : ... }` interpolations but rejected
  inside server-fn bodies. Either both should be allowed (if the language
  position is "JS-style null checks are pragmatic") or both should be
  rejected with a single uniform diagnostic.
- The error has no line/column. Adopters writing the repro above with a
  100-line server fn body will spend disproportionate time bisecting.

Severity P1: workaround is mechanical (one character `!`), but the
asymmetry between markup-OK and server-fn-not-OK is unpredictable and
the missing source location compounds the confusion. Not P0 because the
fix path is short once you know it.

**Repro:** `/tmp/null-test.scrml` shape above. Six-line minimal. Reproduces
in any version of the compiler that runs the GCP3 stage (every M2-M4
build).

---

## F-CONSUME-001 — `@var` in attribute-string interpolation isn't recognized as consumption (P2)

**Surfaced in:** M4 `pages/customer/invoices.scrml`. The page declared
`@highlightLoadId` (read from `?load=<id>` query param) and used it in
the row class:

```scrml
lift <tr class="border-b border-slate-200 hover:bg-slate-50 ${(inv.load_id == @highlightLoadId) ? 'bg-yellow-50' : ''}">
```

**What didn't work:** E-DG-002:
> "Reactive variable `@highlightLoadId` is declared but never consumed
> in a render or logic context. Consider removing the unused variable,
> or prefix with `_` (e.g., `@_highlightLoadId`) to suppress this
> warning."

The variable IS read — inside the `${ ... ? ... : ... }` ternary embedded
in the `class=` attribute string. The DG (declaration-graph) pass doesn't
treat this kind of interpolation as a consumption site.

**Workaround used:** lift the conditional class into a `const` binding in
the for-loop body before the `lift`:

```scrml
${
    for (let inv of @invoices) {
        if (!matchesFilter(inv, @filter, TODAY_ISO)) continue
        const rowClass = (inv.load_id == @highlightLoadId)
            ? "border-b border-slate-200 bg-yellow-50"
            : "border-b border-slate-200 hover:bg-slate-50"
        lift <tr class="${rowClass}">
            ...
        </tr>
    }
}
```

The `const rowClass = ... @highlightLoadId ...` line counts as a logic-block
read and silences the warning. The lifted `class="${rowClass}"` then drops
to a single-variable interpolation.

**Repro:** minimal:
```scrml
<program>
${ @x = 0 }
<div class="abc-${@x}">test</div>
</program>
```
→ fires E-DG-002 on `@x` despite the visible read.

**Suggests:**
- The DG-pass consumption finder should walk into attribute-value
  template-literal interpolations the same way it walks into `${}` body
  expressions. The compile output already serializes the `@x` read in the
  emitted JS, so the read IS happening — the false-negative is in the
  warning logic.
- Alternatively, document the pattern explicitly: "for `@var` reads
  inside attribute interpolations, lift to a logic-block const first."

Severity P2: the workaround is mechanical and the const-lift arguably
improves readability. Logging because it's the third "@var read site
that the analyzer doesn't recognize" finding (after F-RI-001's nested
control-flow exclusion + F-CPS-001's nested-statement-body exclusion).

The pattern feels load-bearing on apps that style rows / cells based on
reactive selection state — sortable columns, expanded rows, highlighted
search hits — so adopters will hit this near-immediately when building
list views.

---

## F-AUTH-001 — M4 RECONFIRMATION (P0)

All 6 customer pages use the same server-side fallback as M2 + M3: each
page declares its own `<program auth="required">` and inline
`getCurrentUser()` + `if (!user || user.role != "customer")` guard.
The page-level `auth="role:customer"` attribute is documentation only;
M4 (like M2 + M3) deliberately omits it from the `<program>` opener
because the original `<page route= auth=>` wrapper hits multi-error
parse cascades when nested in `< db>`.

**Cumulative reconfirmations:** 18 pages (6 dispatcher + 6 driver + 6
customer). Every server fn that needs role gating has the same 4-line
copy-pasted guard. Across M2 + M3 + M4 the duplicated `if (!user || user.role != X)`
guards now appear ~30+ times across the app.

The friction is exercised at full scale — three slices, each persona
consistently re-implementing the same fallback because the compiler
attribute is silently inert.

No design change.

---

## F-AUTH-002 — M4 RECONFIRMATION (P0)

Each of the 6 customer pages duplicates the ~7-line `getCurrentUser`
server fn body inline. Combined with M2 + M3, the cumulative inline-
duplication is **~126 LOC across 18 pages** doing the same session →
user-id → users-row lookup. M4 confirms F-AUTH-002 is consistently
load-bearing on every page touching auth.

The single-source-of-truth file `models/auth.scrml` exists, exports
non-SQL helpers (`readSessionCookie`, `checkRole`, `rolePath`,
`SESSION_DB_PATH`, `SESSION_COOKIE_NAME`, `SESSION_TTL_SECONDS`,
`DISPATCH_DB_PATH`), but cannot host the SQL-reading `getCurrentUser`
fn that every page actually needs. The cross-file `?{}` portability gap
(E-SQL-004) blocks the abstraction.

No design change.

---

## F-COMPONENT-001 — M4 RECONFIRMATION (P0, architectural)

M4 ships zero cross-file component imports per kickstarter v1 + S50
plan B. Every customer page imports helper functions (`formatRate`,
`formatPickupAt`, `statusBadgeClasses`, `statusLabel`,
`accountStatusClasses`, `accountStatusLabel`, `paymentTermsLabel`,
`invoiceStatus`, `invoiceStatusClasses`, `invoiceStatusLabel`,
`formatIsoDate`) and inlines all markup directly. Helpers refactor
clean across files; markup must be copied or written inline at every
consumer site.

**Cumulative reconfirmations:** every M2 + M3 + M4 page (18 of 18) uses
the inline pattern. Zero cross-file component instances ship in the
app. The components directory exists with `LoadCard`, `LoadStatusBadge`,
`CustomerCard`, `InvoiceCard`, `DriverCard`, `AssignmentPicker`,
`StatusPicker`, `AddressForm`, but they are documentation / type-export
hosts only. None render correctly when imported as components.

No design change. The deep-dive on cross-file component expansion
remains queued post-M6.

---
