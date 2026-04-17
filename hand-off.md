# scrmlTS — Session 22 (live)

**Date:** 2026-04-17 (opened)
**Archived brief:** `handOffs/hand-off-22.md` (the full S22 cold-start plan — see for file paths, line numbers, failure-mode warnings)
**Baseline at start:** 6,824 pass / 10 skip / 2 fail (25,375 expects across 273 files) at commit `c41c940`.
**Unpushed:** `8cbea71` (§51 spec A + I) and `c41c940` (archive docs) — need one-time push auth or `needs: push` to master.

---

## §1b — payload binding in machine rules (LANDED)

- `type-system.ts` — extended `TransitionRule` with `fromBindings` / `toBindings`, both
  `RuleBinding[] | null`. Added `resolveRuleBindings` which validates against the governed
  enum's payload fields and raises E-MACHINE-015 on three cases (unit variant, unknown
  field, positional overflow).
- `type-system.ts:expandAlternation` rewritten to track paren depth when splitting `|` and
  detecting the suffix start (so `given (n > 0)` in a binding-free line isn't cut off by a
  binding-bearing sibling alternative). Parity check across alternatives emits E-MACHINE-016.
- `type-system.ts` rule regex tightened from `(\w+|\*)?` to `([A-Z][A-Za-z0-9_]*|\*)?`. The
  old shape backtracked correctly without bindings but greedily captured keywords (`given`)
  as variant names once the optional `(binding-list)` group was added. PascalCase constraint
  matches §14.4 and excludes lowercase keywords from the variant-name slot.
- `emit-machines.ts` — added `buildBindingPreludeStmts(rule)` (exported for testing). The
  `emitTransitionGuard` function now emits `var <local> = __prev.data.<field>;` /
  `var <local> = __next.data.<field>;` inside the keyed `if (__key === "From:To") { ... }`
  block for both the guard and effect paths. When a rule has no bindings, the legacy
  single-line guard form is preserved (no binding prelude needed).
- 15 new unit tests in `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js`
  covering the parser (positional, named, discard), error codes (E-MACHINE-015 three
  flavors, E-MACHINE-016 two flavors), wildcard passthrough, the emitter prelude shape +
  keyed-block scoping, and the standalone helper.
- SPEC §51.3.2 flipped from `pending implementation` → `landed S22`; added implementation
  notes about per-rule scoping of bindings and error-code coverage.
- Baseline: **6,856 pass / 10 skip / 2 fail** (25,470 expects, 276 files) — +15 from §1b
  tests, no regressions. The 2 fails are still the pre-existing self-host parity ones.
- **Deferred, NOT in this slice:** rewriting `examples/14-mario-state-machine.scrml` to
  showcase a payload variant. The current machine-guard runtime wiring has a pre-existing
  gap — `@var = X` inside function bodies does not go through `emitTransitionGuard`, so
  guards don't fire from function assignments even in today's Mario. Switching `MarioState`
  from unit-only to a payload variant would break its equality checks (`@marioState ==
  MarioState.Small`) and string interpolations (`${@marioState}`). Tracked for a later
  slice that fixes the assignment-guard wiring first, then updates Mario as part of that
  change.

---

## Cross-repo messages sent this session

- `2026-04-17-1430-scrmlTS-to-master-push-s22-1a.md` — `needs: push` for S22 §1a landing (3 commits: `a25d812`, `1d84ab3`, `874a45d`). Dropped in `/home/bryan/scrmlMaster/handOffs/incoming/`.

## Session log

### S22 opener — scope of §1a complete

**Current state of payload variant support (verified by reading code, not tests):**

1. **Parser** — `ast-builder.js` only stores `type-decl.raw` (the string body). No structured variants until type-system pass.
2. **Type system** — `type-system.ts:1036-1067` already parses payload variants into `VariantDef.payload: Map<string, ResolvedType>` inside the type registry. Not attached back onto the typeDecl node — lives in the registry only.
3. **Enum emission** (`emit-client.ts:686 emitEnumVariantObjects`) — **broken for payload variants:**
   - `getUnitVariantNames` filters out payload variants (line 604 excludes anything with `payload`).
   - `emitEnumVariantObjects` short-circuits (line 694: `if (unitVariants.length === 0) continue`) when an enum has NO unit variants. So an all-payload enum like `Shape = { Circle(r:number), Rect(w:number, h:number) }` emits nothing at all — `Shape` is `undefined` at runtime.
   - Even when unit variants exist alongside payload ones, only the unit variants land in the frozen object.
4. **Match compilation** (`emit-control-flow.ts:508 parseMatchArm`):
   - Regex at line 510 only captures SINGLE-word binding `(\w+)` — `.Rect(w, h)` silently fails to parse.
   - Condition emitted always string-equal: `tmpVar === "X"` (line 897, 934).
   - Bindings for variant arms are **intentionally dropped** — `compiler/tests/unit/emit-match.test.js:45` says *"emits .Variant(binding) => arm (binding ignored in JS output)"* — that's the baseline bug.
5. **Live repro:** `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-match-payload-positional-031.scrml` compiles without error to:
   ```js
   let s = "Rect" ( 3 , 4 );        // "Rect"(3,4) → TypeError at runtime
   // ... match body collapsed to a single else; ALL arms dropped
   ```

### Plan for §1a — landed in two slices

**Slice 1: A1 — Enum payload variant constructors (LANDED)**
- `emit-client.ts:emitEnumVariantObjects` rewritten. Added helper `getAllVariantInfo(decl)`
  that returns `{ name, fieldNames }` for each variant (preferring structured
  `decl.variants` when present, falling back to parsing `decl.raw` since the type
  system doesn't always attach resolved variants back onto the AST node).
- `rewrite.ts:rewriteEnumVariantAccess` — removed the inline `EnumType.Variant(args) →
  { variant, value: (args) }` rewrite. Payload construction is now a call to the
  emitted constructor function; nothing rewrites it. Spec-aligned with §19.3.2 `fail`.
- Test updates:
  - `compiler/tests/unit/enum-variants.test.js` §6-13b rewritten to assert
    call-preserving behavior + runtime-shape via `emitEnumVariantObjects` eval.
  - `compiler/tests/unit/emit-match.test.js` "named args" describe block — same.
  - `compiler/tests/unit/codegen-struct-rewrite.test.js` "rewrites struct after
    enum variant access in chain" — asserts `GameStatus.Playing(42)` stays intact.
- New:
  - `samples/compilation-tests/payload-variants-001.scrml` — construction only.
  - `compiler/tests/unit/gauntlet-s22/payload-variants.test.js` — 6 tests; ties the
    emitted code to the spec shape (unit still strings, payload `.variant`/`.data`,
    field order preserved, `.variants` array unchanged, fail-alignment).
- SPEC.md §51.3.2 prereq text updated: "(landed S22)" replaces "blocked on".
- Baseline: **6,832 pass / 10 skip / 2 fail** (25,395 expects, 274 files) — +8 from
  S21 baseline. The 2 fails remain the pre-existing self-host parity ones.
- Intentionally out of scope: match destructuring against tagged-object shape.
  Existing test at `emit-match.test.js:45` ("binding ignored in JS output") stays
  green; slice 2 will flip that assertion.

**Slice 2: A2 — Match destructuring against tagged-object shape (LANDED)**
- `emit-control-flow.ts:parseMatchArm` regex loosened from `(\w+)` to `([^)]*?)`
  so `.Rect(w, h)` and `.Reloading(reason: r)` parse into a raw binding string.
- `emit-control-flow.ts:parseBindingList` added — splits a raw binding string
  into `PayloadBinding[]` with `{ sourceField, localName, discard }`.
- Module-level variant field registry (`_variantFields`, `_variantFieldCollisions`)
  populated at top of `generateClientJs` via new `buildVariantFieldsRegistry(fileAST)`
  in emit-client.ts, cleared after. Prevents per-file leakage.
- `emit-control-flow.ts:emitMatchExpr` + `emit-logic.ts:emitMatchExprDecl`:
  - `const __tag = (v && typeof v === "object") ? v.variant : v;` is emitted
    only when at least one variant arm carries a binding OR the variant name
    is in the registry. Unit-only and scalar matches stay on the plain
    `tmpVar === "X"` path (no extra var).
  - Variant arms compare against the `__tag` var; string arms still use
    `arm.test` raw (carries its own quotes — the prior single-branch emit
    double-wrapped strings into `""a""`; now the branch distinguishes kind).
  - Variant arms with bindings emit `const loc = tmp.data.<field>;` destructuring.
    Positional bindings resolve via the registry; named bindings use
    `sourceField` directly. Collisions / unknown variants emit a diagnostic
    comment and skip positional binding.
- `emit-control-flow.ts:splitMultiArmString` §42 presence-arm detector was
  splitting `.Circle(r) =>` at the `(` because it didn't consider that the
  paren belonged to a variant binding. Fixed: the detector now looks past
  leading whitespace to check whether the prior non-space char is an
  identifier char (in which case the `(` is part of a variant binding, not
  a presence arm).
- Tests:
  - `emit-match.test.js:45` — flipped from "binding ignored" to "positional
    binding without registry emits a diagnostic comment"; +2 new tests asserting
    registry-driven positional destructuring and named-binding destructuring.
  - `compiler/tests/unit/gauntlet-s22/payload-variants-match.test.js` — 7
    end-to-end tests that compile + execute the emitted client JS. Covers:
    positional, multi-field, named, mixed unit/payload, `_` discards, pure
    scalar matches, and pure unit-enum matches.
- Baseline: **6,841 pass / 10 skip / 2 fail** (25,426 expects, 275 files) — +17
  over S21. The 2 fails remain the pre-existing self-host parity ones.
- Known limitation (intentional, deferred): short-form `.Circle(10)` in a
  typed-annotation context (e.g. `let s:Shape = .Circle(10)`) is still
  rewritten to `"Circle"(10)` by the standalone-dot pass — a type-inference
  concern, not a codegen one. File-qualified form `Shape.Circle(10)` works.
  See `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-match-payload-positional-031.scrml`
  for a live repro of the leftover (match now destructures correctly, only
  the construction line is still broken).

**Slice 3: §1b — Machine rule binding** (not started this slice chain).
**Slice 4: §51 I — Derived machines** (parallel).

---

## Tags
#session-22 #open
