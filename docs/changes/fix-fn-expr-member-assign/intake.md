# fix-fn-expr-member-assign — Intake (6NZ Bug M)

**Surfaced:** 2026-04-26 (S43 inbox arrival), by 6nz via `handOffs/incoming/2026-04-26-1041-6nz-to-scrmlTS-bugs-m-n-o-from-playground-six.md`. Bug filed during playground-six (LSP-over-WebSocket) construction.
**Status:** RECEIVED with sidecar; verified reproducing on current main `82e5b0d`. Queued for triage in S44.
**Sidecar:** `handOffs/incoming/read/2026-04-26-1041-bug-m-fn-expr-member-assign.scrml` (will move on intake confirm).
**Tier:** **T2** (codegen — assignment statement RHS handling for function expressions).
**Priority:** medium — produces JS syntax error (hard fail at module load); workaround via `addEventListener` exists but breaks any DOM API expecting handler-property assignment (`ws.onopen`, `xhr.onload`, `el.onclick`, etc.).

---

## Symptom

Property/member assignment of a function expression emits as **two** statements: the assignment with empty RHS, followed by an orphaned function literal. The result is a JS syntax error (`Unexpected token ';'`).

Source:

```scrml
<program>
${
    @opened = false
    function setup() {
        const ws = new window.WebSocket("ws://localhost:65535")
        ws.onopen = function() {
            @opened = true
        }
    }
}
<button onclick=setup()>setup</>
<div>${@opened}</>
</program>
```

Expected emit:

```js
ws.onopen = function () { _scrml_reactive_set("opened", true); };
```

Actual emit (verified on `82e5b0d`):

```js
ws . onopen =;
function () {
  _scrml_reactive_set("opened", true);
}
```

`node --check` on the resulting `bug-m.client.js` fails:

```
SyntaxError: Unexpected token ';'
    at line 7: ws . onopen =;
```

## Trigger condition

Specifically **property/member assignment of a function expression** (`x.y = function() {...}` or `x[y] = function() {...}`).

The function-as-argument path emits correctly:
- `addEventListener("ev", function() {...})` — clean
- `setTimeout(function() {...}, 100)` — clean

The function-as-RHS-of-simple-binding path emits correctly (declaration form):
- `const f = function() {...}` — clean (this is hoisting-equivalent at decl time; codegen probably treats it as named-fn-decl-shaped).

So the trigger is narrowly: **assignment-expression where LHS is a member expression and RHS is a function expression**.

## Workaround (in 6nz playground-six)

Use `addEventListener` instead of property assignment:

```scrml
ws.addEventListener("open", function() {
    @opened = true
})
```

Functional but constrains author choice; some DOM APIs only expose property handlers (no equivalent `addEventListener` interface), and library/framework integrations sometimes require property assignment.

## Root-cause hypothesis (unverified)

Codegen path for `AssignmentExpression` where:
- LHS is `MemberExpression` (member access)
- RHS is `FunctionExpression`

is emitting the function expression as a separate top-level statement rather than as the assignment's RHS. The `=;` artefact suggests the codegen visited LHS + `=`, then bailed on RHS emission and let the function expression flow downstream as a sibling statement.

Adjacent already-fixed pattern: `ed9766d fix-arrow-object-literal-paren-loss` — also an expression-context emission bug, parens-stripped from arrow body. Different shape, but suggests expression-vs-statement context tracking in codegen has historical fragility.

## Suggested fix scope (conditional, dispatch agent verifies)

1. Locate the assignment-expression codegen site (`compiler/src/codegen/` — likely `emit-expr.ts` or `emit-stmt.ts`).
2. Audit the AssignmentExpression branch where RHS is `FunctionExpression` (and probably `FunctionDeclaration`-shaped node misclassification).
3. Compare with the function-as-call-arg path, which emits cleanly — find the divergence.
4. Add regression tests:
   - `obj.foo = function() {...}` (DOM property handler shape)
   - `obj["foo"] = function() {...}` (computed member)
   - `obj.foo.bar = function() {...}` (deeper member chain)
   - `obj.foo = function() { @reactive = X }` (with reactive write — repro shape)
   - Confirm `const x = function() {...}` (decl form) still works
   - Confirm `f(function() {...})` (arg form) still works
   - Confirm `x.y = () => {...}` (arrow form) — may or may not be affected; check both

## Reference

- 6nz inbox message: `handOffs/incoming/2026-04-26-1041-6nz-to-scrmlTS-bugs-m-n-o-from-playground-six.md`
- Sidecar: `handOffs/incoming/2026-04-26-1041-bug-m-fn-expr-member-assign.scrml`
- 6nz tested against scrmlTS HEAD `c51ad15`; verified still reproducing on main `82e5b0d`.

## Tags
#bug #codegen #assignment-expression #function-expression #6nz-bug-m #sidecar
