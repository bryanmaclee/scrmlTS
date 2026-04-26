# fix-meta-effect-loop-var-leak — Intake (6NZ Bug O)

**Surfaced:** 2026-04-26 (S43 inbox arrival), by 6nz via `handOffs/incoming/2026-04-26-1041-6nz-to-scrmlTS-bugs-m-n-o-from-playground-six.md`. Bug filed during playground-six construction.
**Status:** RECEIVED with sidecar; verified reproducing on current main `82e5b0d`. Queued for triage in S44.
**Sidecar:** `handOffs/incoming/read/2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml` (will move on intake confirm).
**Tier:** **T2** (codegen — meta-effect frozen-scope object construction).
**Priority:** medium-high — produces runtime `ReferenceError` at module load whenever for-lift markup coexists with any `^{}` block; common pairing.

---

## Symptom

When markup contains `${ for (x of @list) { lift <tag>...</tag> } }` **and** the program also contains a `^{ ... }` meta-effect, the codegen captures the loop variable `x` as a free identifier in the meta-effect's frozen-scope object — emitting `x: x` referring to a name that does not exist at module scope. Module load throws `ReferenceError: <name> is not defined`.

Source:

```scrml
<program>
${
    @items = ["a", "b", "c"]
    @tick = 0
    function init() { @tick = 1 }
}

^{ init() }

<ul> ${
    for (it of @items) {
        lift <li>${it}</li>
    }
} </ul>

<div>tick: ${@tick}</>
</program>
```

Expected: page renders three `<li>` items; tick = 1.

Actual emit (verified on `82e5b0d`):

```js
_scrml_meta_effect("_scrml_meta_28", function(meta) {
  _scrml_init_4();
}, Object.freeze({
  get items() { return _scrml_reactive_get("items"); },
  get tick()  { return _scrml_reactive_get("tick"); },
  init: _scrml_init_4,
  it: it                              // <-- LEAK: `it` is loop-local, undefined at module scope
}), null);
```

Module load: `ReferenceError: it is not defined`.

The lift's create-item closure correctly receives `it` as a function parameter — the leak is **specifically into the meta-effect's captured-scope object**, which sits at module top-level where the loop variable doesn't exist.

## Bonus anomaly — duplicate meta-effect emission

The repro source contains exactly **one** `^{ init() }` block, but codegen emits **two** `_scrml_meta_effect(...)` calls:

- `_scrml_meta_28` — at the position of the `^{...}` block
- `_scrml_meta_55` — at the very end of the module, after the for-lift / reactive-display wiring

Both invoke `_scrml_init_4()` with identical bad-capture frozen-scope objects. So the source has 1 effect; emit has 2. This may be the same bug (something walking past the `^{}` boundary captures additional state and emits a second effect), or it may be a separate codegen issue surfaced by the same shape. Worth checking during fix.

## Trigger condition

Both must be present:
1. For-of (or other) loop in markup that introduces a binding via lift (`${ for (x of @list) { lift <tag>...</tag> } }`).
2. At least one `^{...}` meta-effect anywhere in the module.

Removing the `^{}` block lets for-lift work cleanly. Removing the for-lift makes the bonus duplicate-meta-effect anomaly disappear (untested in this intake, but inferred).

## Workaround (in 6nz playground-six)

Abandoned for-lift. Built a helper `describeDiagnostics(ds)` that renders the entire list as a newline-joined string and interpolates into a single `<pre>` block. Functional, but loses per-item DOM identity (no keyed-reconcile, no per-item event bindings).

## Root-cause hypothesis (per 6nz suggestion + verification)

Per 6nz: "wherever the meta-effect codegen builds its captured-scope object, walk only module-scope identifiers (not loop-local names from markup-embedded for-loops)."

The frozen-scope construction is collecting free identifiers from a too-broad scan that includes loop-local bindings introduced by markup-embedded `for (... of ...)` constructs. The walker needs to either:
- exclude loop-local bindings from the captured-scope set, OR
- only include identifiers that resolve to module-scope declarations.

For the duplicate-emission anomaly: investigate whether something downstream of the for-lift codegen path re-triggers a meta-effect emission.

## Suggested fix scope

1. Locate the meta-effect codegen site (`compiler/src/codegen/` — meta-effect frozen-scope construction).
2. Audit the free-identifier-collection logic around `^{}` blocks. Confirm whether the walker has access to a proper scope chain or is doing identifier-set-difference against a too-broad name set.
3. Verify exclusion of for-loop-introduced bindings (and any other markup-introduced bindings — `lift` parameters in general).
4. Investigate the duplicate-emission separately; may be same root cause, may not.
5. Regression tests:
   - For-lift alone (no `^{}`): renders correctly.
   - `^{}` alone (no for-lift): single emission, clean capture.
   - Both together: single emission per `^{}`, no loop-local in capture.
   - Multiple `^{}` blocks + for-lift: each `^{}` emits once, none capture loop-local.
   - Different lift binding shapes (for-of, for-in, for-let-decl) — confirm all excluded.

## Reference

- 6nz inbox message: `handOffs/incoming/2026-04-26-1041-6nz-to-scrmlTS-bugs-m-n-o-from-playground-six.md`
- Sidecar: `handOffs/incoming/2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml`
- 6nz tested against scrmlTS HEAD `c51ad15`; verified still reproducing on main `82e5b0d`.

## Tags
#bug #codegen #meta-effect #for-lift #scope-capture #6nz-bug-o #sidecar #duplicate-emission-anomaly
