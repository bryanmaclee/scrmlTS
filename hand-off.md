# scrmlTS — Session 22 (live)

**Date:** 2026-04-17 (opened)
**Archived brief:** `handOffs/hand-off-22.md` (the full S22 cold-start plan — see for file paths, line numbers, failure-mode warnings)
**Baseline at start:** 6,824 pass / 10 skip / 2 fail (25,375 expects across 273 files) at commit `c41c940`.
**Unpushed:** `8cbea71` (§51 spec A + I) and `c41c940` (archive docs) — need one-time push auth or `needs: push` to master.

---

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

**Slice 2: A2 — Match destructuring against tagged-object shape**
- Extend parseMatchArm regex to capture raw binding-list (multi-arg, named form `field: local`, `_` discard).
- Add binding-list parser returning `Array<{ sourceField: string | null, localName: string }>`.
- At match emit time:
  - Emit `const __tag = (v && typeof v === "object") ? v.variant : v;` once per match.
  - Compare arm to `__tag`.
  - For variant arm with binding, emit destructuring from `tmp.data.<fieldName>`; resolve field names by scanning fileAST typeDecls for the variant name (single-enum lookup; collision → diagnostic).
- Update existing `emit-match.test.js:45` expectation — `r` will now be declared via destructuring.
- Update `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-match-payload-positional-031.scrml` expected output in any existing JS golden files (none found; safe).
- Add round-trip test to gauntlet-s22/payload-variants.test.js (construct + match + destructure).

**Slice 3: §1b — Machine rule binding** (not started this slice chain).
**Slice 4: §51 I — Derived machines** (parallel).

---

## Tags
#session-22 #open
