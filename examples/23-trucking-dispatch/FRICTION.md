# Trucking Dispatch — Friction Findings

Living log of friction surfaced while writing the dispatch app. Format per scoping §9. Severity: P0 = silent failure / validation-principle violation; P1 = working but awkward; P2 = minor DX paper cut.

---

## F-AUTH-001 — `auth="role:X"` is silently inert (P0)

**Surfaced in:** M1 design (scoping §5 + §11); applies to every M2-M4 role-gated page.

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

**Workaround used:** Wrap every imported-component call site in a containing
HTML element:
```scrml
${
    for (let l of @loads) {
        lift <div><LoadCard load=l customerName=l.customer_name/></div>
    }
}
```
This compiles clean. The wrapping `<div>` is semantically meaningless but
satisfies the component-expander's lookup pass.

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
