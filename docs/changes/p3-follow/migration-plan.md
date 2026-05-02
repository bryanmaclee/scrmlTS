# P3-FOLLOW Migration Plan — isComponent → resolvedCategory

## Goal

Promote NameRes (`resolvedKind` + `resolvedCategory`) to be the AUTHORITATIVE
source for state-type / component routing decisions. Demote `isComponent` to
a derived/legacy backcompat field that is no longer READ by any compiler
stage downstream of TAB stamping.

## Strategy summary

**Two-pronged "stamp it at the boundary, read it nowhere" pattern:**

1. **Stamping (write side) — RETAINED for AST shape backcompat.**
   - block-splitter.js continues to set `isComp` on blocks via `isComponentName`.
   - ast-builder.js continues to set `isComponent: <bool>` on markup nodes from
     `isComponentName(tag)`.
   - module-resolver.js continues to set `isComponent: <bool>` on the
     exportRegistry's `info` field.
   - These remain because: (a) AST-shape tests assert against the field;
     (b) the AST is serialized to JSON for tooling; (c) backcompat is
     trivial since they only WRITE.

2. **Reading (route side) — MIGRATED to `resolvedCategory`.**
   - Component-expander Phase 1 reads `markup.resolvedCategory === "user-component"`.
   - type-system reads `markup.resolvedCategory === "user-state-type"`.
   - codegen emit-html / emit-bindings / emit-client read `resolvedCategory`.
   - validators/post-ce-invariant reads `resolvedCategory`.
   - LSP handlers cross-file completion filters on `info.category`.
   - Tests that verify routing logic switch to `resolvedCategory`; tests that
     verify AST-shape stay on `isComponent` (those are the legacy field by design).

## Per-file dispatch order

(Followed in commit cadence.)

### Phase 2.1 — block-splitter.js (~6 refs)

**Current:** `isComponentName(name)` returns true on uppercase first char;
result stamped on block as `isComp`. Block consumed by ast-builder.

**Plan:**
- KEEP `isComponentName` and stamping. (Write side.)
- ADD a comment block citing P3-FOLLOW: "BS stamps `isComp`; downstream
  routing reads `resolvedCategory` post-NR. The boolean is retained for AST
  shape backcompat."
- No behavior change.

### Phase 2.2 — ast-builder.js (~10 refs)

**Current:** ast-builder consumes BS's `isComp` flag and stamps `isComponent`
on the markup node. `parseLiftTag` regex routes on isComponent.

**Plan:**
- KEEP all `isComponent` writes on markup nodes.
- KEEP `parseLiftTag` regex (it's purely a tokenizer-level grammar predicate
  on the *raw text* — not a routing decision).
- ADD a top-of-file comment: "ast-builder stamps `isComponent` for AST shape;
  routing in CE/TS/codegen reads `resolvedCategory` from NR."
- No behavior change.

### Phase 2.3 — module-resolver.js (~3 refs)

**Current:** `buildExportRegistry` sets `info.isComponent = (kind === "const" && /^[A-Z]/.test(name))`.
The shape `{ kind, category, isComponent }` is already in place from P3.A.

**Plan:**
- KEEP `info.isComponent` writes. (P3.A already added `info.category` as
  AUTHORITATIVE; `isComponent` is the derived backcompat field.)
- VERIFY downstream reads (handlers.js, name-resolver.ts) of `isComponent`
  are non-routing — those still need the boolean for AST shape.
- name-resolver.ts line 380, 407: `info.isComponent` is consumed to decide
  the imported name's `LocalDecl.kind/category`. **Migrate** to use
  `info.category` — that's the authoritative field and avoids the boolean.

### Phase 2.4 — component-expander.ts (~23 refs, CE Phase 1)

**Current:** CE Phase 1 walks markup nodes, replaces every
`isComponent === true` with the component's expanded HTML.

**Plan:**
- ROUTING reads of `markup.isComponent === true` → `markup.resolvedCategory === "user-component"`.
- WRITES of `isComponent: false/true` on synthesized nodes (e.g. fallback
  expanded markup, lift constructs) → keep writes (AST shape) AND stamp
  `resolvedCategory: "html"` or `"user-component"` on the synthesized node.
- `info.isComponent` reads in cross-file expansion → use `info.category === "user-component"`.
- Remove the comment "isComponent-routed (Phase 1 above)" and update.

### Phase 2.5 — type-system.ts (1 ref)

**Current:** `type-system.ts:3417` reads `n.isComponent` to skip components
during state-type validation.

**Plan:**
- Replace `!n.isComponent` with `n.resolvedCategory !== "user-component"`.

### Phase 2.6 — codegen (emit-html / emit-bindings / emit-client)

NOTE: dispatch listed these but `grep -rln "isComponent" compiler/src/`
showed NO matches in `compiler/src/codegen/` directory. Verify in
implementation. If empty, this phase is no-op (comments only).

### Phase 2.7 — validators/post-ce-invariant.ts (5 refs)

**Current:** VP-2 enforces "no `isComponent: true` markup node post-CE."

**Plan:**
- Replace `n.isComponent !== true` with `n.resolvedCategory !== "user-component"`.
- Update error message to cite the new authoritative field.

### Phase 2.8 — gauntlet-phase1-checks.js (2 refs)

**Current:** lift-detection peeks at `nextBlock.isComponent === true`.

**Plan:**
- Block-level data uses BS's `isComp` (kept for backcompat). Either:
  (a) keep as-is since BS still stamps the boolean, OR
  (b) compute the routing-equivalent locally.
- **Decision:** keep the BS-block-level read (it's downstream of NR but
  before AST is constructed; the simplest correct path is BS's stamp).
  Add comment.

### Phase 2.9 — api.js

Comment-only updates citing P3-FOLLOW.

### Phase 2.10 — name-resolver.ts (1 substantive ref)

**Current:** `info.isComponent` consumed at line 407 to derive
imported `LocalDecl`.

**Plan:** Switch to `info.category === "user-component"` to be NR-authoritative.
This is a key migration — NR consuming its own preferred shape.

### Phase 2.11 — LSP handlers + workspace (5 refs)

**Current:** `lsp/handlers.js` filters cross-file completions on
`info?.isComponent`. `lsp/workspace.js` documents the registry shape.

**Plan:**
- `handlers.js`: `info?.isComponent` → `info?.category === "user-component"`.
- `workspace.js`: comments updated to cite category as authoritative.

### Phase 2.12 — Tests

**Current:** ~154 references across 20 test files.

**Plan:**
- AST-shape tests (assert markup-node has `isComponent: true`) — KEEP.
  These verify the legacy field is correctly stamped.
- Routing tests (assert downstream behavior) — switch to assert
  `resolvedCategory` where applicable. Most existing routing tests already
  pass through `runFullPipeline` and assert on output, so they don't even
  touch the boolean.
- Add `compiler/tests/unit/p3-follow-no-isComponent-routing-reads.test.js`:
  grep-asserts compiler source has zero `isComponent` *routing reads*
  outside types/ast.ts and the legacy stamp sites.

### Phase 3 — state-type-routing.ts

**Decision:** RE-PURPOSE rather than delete.

After P3-FOLLOW lands:
- The `ROUTING` table becomes a category-DISPATCH table (used to look up
  per-category emit/validate behavior, not "is this routed by legacy or
  new path").
- Update doc string from "transitional pattern" → "category dispatch table
  (post-P3-FOLLOW). Each category specifies its routing strategy for
  CE/TS/codegen consumers."
- Remove `RoutingStrategy = "isComponent-legacy" | "resolvedCategory-new"`
  type — there is only one path now.
- Replace `ROUTING` value type with a richer per-category record (or
  simplify to a no-op marker pending future per-category extension).
- Keep `CROSS_FILE_INLINE_CATEGORIES` set + `isCrossFileInlineRef` predicate
  (these are functional, not just documentation).
- Keep `ResolvedCategory` type (canonical).
- Drop `shouldRouteByCategory` (always true now — equivalent to
  `category != null`). Or leave for source-compat.

### Phase 4 — SPEC §15.15.6 + PIPELINE Stage 3.05

- SPEC §15.15.6: rewrite the "Shadow Mode P1" / "P2 channel-routing" /
  "components stay legacy" sections to describe the unified post-P3-FOLLOW
  state.
- PIPELINE.md Stage 3.05: update "AUTHORITATIVE" status; remove "shadow
  mode" caveats.

### Phase 5 — Final commit + verify

- `bun test` zero regressions vs 8539 baseline.
- `grep -rn "isComponent" compiler/src/` shows only:
  (a) write sites (BS, ast-builder, module-resolver)
  (b) the `isComponent: boolean` field in `types/ast.ts`
  (c) doc comments
  (d) explicitly-allowed legacy paths
- `grep -rn "resolvedCategory" compiler/src/` shows it being read
  in CE/TS/codegen/validators/handlers.

## What changes vs what stays

### Changed (READ sites flipped)

- component-expander.ts CE Phase 1 routing
- type-system.ts state-type validation
- codegen emit modules (if any)
- validators/post-ce-invariant.ts
- name-resolver.ts importedRegistry derivation
- lsp/handlers.js completion filtering

### Unchanged (WRITE sites kept)

- block-splitter.js (`isComp` block flag)
- ast-builder.js (`isComponent` markup field)
- module-resolver.js (`info.isComponent` registry derived field)
- types/ast.ts (`isComponent: boolean` field declaration)

### Reframed

- state-type-routing.ts (re-purposed, not deleted)
- SPEC §15.15.6 + PIPELINE Stage 3.05 (status: AUTHORITATIVE)
