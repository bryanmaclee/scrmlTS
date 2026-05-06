# Phase A1b Step B2 — Progress

**Branch:** `main` (working directly on main per dispatch authorization — pattern from Stage 0c.A and Phase 4d)
**Parent baseline:** `8bda55f` (HEAD at dispatch start)
**Working tree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/` (no isolation)

Append-only timestamped log. WIP commits expected; final summary at end.

---

## Timeline

- [00:00] Startup verification: pwd `/home/bryan-maclee/scrml-support` (irrelevant — using absolute paths). `git -C scrmlTS status --short` clean. `git -C scrmlTS rev-parse HEAD` = `8bda55fce0d85c0325ddd17b56ffc1baffadff0b`.
- [00:01] Baseline `bun run test 2>&1 | tail -15` from scrmlTS: **8928 / 44 / 1 / 0 / 8973 / 440** (1 ECONNREFUSED in browser tests, harmless; total tests / files = 8973 / 440).
- [00:02] Confirmed B1 symbol-table.ts in place. Public API surface read in full: `runSYM`, `runSYMBatch`, `lookupStateCell`, `lookupQualifiedStateCell`, `getScopeForNode`. Stage 3.06 SYM wired in `api.js:688` between NR and CE.
- [00:03] SPEC.md grep'd: E-NAME-COLLIDES-STATE registered at §34 line 14199 ("Local identifier declaration uses the same name as a registered state cell in scope. Local names cannot shadow state names.") + §6.1.3 example.

---

## Survey phase — findings (Phase 1, mandatory)

### Q1 — Is the resolver phase already running and does it touch local-decl walking?
**Finding:** B1 added Stage 3.06 SYM at `compiler/src/symbol-table.ts`. SYM walks `state-decl`, `function-decl`, and recurses through containers. SYM does NOT visit `let-decl` / `const-decl` / `tilde-decl` / `lin-decl` today (per its docblock — those are local decls and B1 was scope-construction-only, not lookup-firing).

**Existing local-decl handlers across compiler/src:**
- `gauntlet-phase1-checks.js:363` — `checkFileScopeDuplicateBindings` walks let/const at file-root logic blocks; fires `E-SCOPE-010` on dup. Pattern is what B2 wants but for state collision.
- `component-expander.ts:1098-1101` — knows about all 4 local-decl kinds in a switch.
- `dependency-graph.ts:534` — handles tilde-decl.
- `meta-checker.ts` — many sites visit let/const inside meta blocks.
- `meta-eval.ts` — let/const handling.
- `gauntlet-phase3-eq-checks.js:263` — visits let/const/state-decl.
- `codegen/scheduling.ts:250` — visits let/const.

None of these have state-cell-collision check today. NR doesn't walk these kinds. SYM is the place where the symbol table lives.

### Q2 — Is E-NAME-COLLIDES-STATE already registered in any error-codes registry?
**Finding (3 hits in src):**
- `compiler/src/symbol-table.ts:9, 37, 465` — comments referencing the future B2 check.
- `compiler/src/api.js:680` — comment reserving SYM diagnostic surface for B2-B22.
- `kickstarter-v2-smoke.test.js:109, 143` — comments noting "A1b will fire E-NAME-COLLIDES-STATE here later."

**No actual error-code registration exists today.** The compiler's diagnostics infrastructure does not have a centralized "registry"; error codes are emitted directly via `CGError` (codegen/errors.ts), `GauntletError`, or per-stage diagnostic objects (`SYMDiagnostic` in symbol-table.ts already defined). SYM already declares `SYMDiagnostic { code, message, span, severity }` and `runSYM` already returns `errors: SYMDiagnostic[]`. SYMResult.errors is empty at B1 — B2 populates it via the existing `collectErrors("SYM", ...)` path in api.js:690. **No new registry plumbing needed.**

### Q3 — Test fixtures using `<x>` + `let x` in same scope?
**Finding (1 hit needs update):**
- `kickstarter-v2-smoke.test.js:117` — source `<count> = 0; function inc() { @count = @count + 1 }; function clear() { @count = 0 }; function describe() { let count = "five" }`. The `let count` shadows the registered `<count>` cell. Test currently expects `errors.length === 0`; B2 will fire E-NAME-COLLIDES-STATE here. Comments at lines 109 and 143 explicitly anticipate this. **Must update this test to expect the firing.**

Other `let count` / `const count` uses checked:
- `samples/compilation-tests/control-007-while.scrml`, `edge-009-nested-sql-in-logic.scrml`, etc. — no co-located `<count>` state cell. Won't fire.
- `parse-shapes-v0next.test.js` §S4.8 — `let count = 5` alone (no state cell). Won't fire.
- `compiler/tests/conformance/s32-fn-state-machine/s33-pure.test.js` — uses `let counter = 0` (no `<counter>` state). Won't fire.
- LSP tests — `const count = symbols.find(...)` is in test JS, not scrml source.
- Browser tests — `let count = 0` is in test JS, not scrml source.

### Q4 — V5-strict-per-context table touchpoints
**Finding:** SPEC §6.1.3 explicitly specifies the decl-shadow case as E-NAME-COLLIDES-STATE. SPEC §3.4 has the per-context table that lists "Bare names = local identifiers only; cannot shadow registered state names (E-NAME-COLLIDES-STATE)." Authority confirmed.

### Q5 — Where is the local-decl walker? Does the SYM walker already pass through let/const blocks?
**Finding:** Yes — symbol-table.ts `walk(nodes, currentScope, ...)` recurses into `body`, `children`, `consequent`, `alternate`, `arms[].body`. So when the walker descends into a function-decl body, it sees `body[]` of LogicStatement, which contains let-decl / const-decl / tilde-decl / lin-decl nodes. SYM ignores them today. **B2 extends this branch to look up the decl name in the current scope and emit if found.**

This is a **localized extension**, not new infrastructure. The depth-of-survey discount applies — surface is much smaller than "new local-decl visitor pass."

### Q6 — Compound scope edge case
**Finding:** Inside a Variant C compound body, the scope kind is "compound". A `let` decl inside compound body is unlikely (compound bodies hold state-decl children, not local decls), but the walker should handle it correctly anyway via `lookupStateCell` parent-chain walk.

### Q7 — Engine / component scope shadow
**Finding:** Per B1's notes, engine + component bodies are NOT walked at B1 (they store rules as `rulesRaw: string` and `raw: string`). So inside an engine, no local-decl walking happens at B1/B2. Shadow checks across SHADOW boundaries (separate engines / separate components) require engine scope construction, deferred to B14+.

For now, **B2 only fires within file/function/compound scopes** — which is exactly what the SPEC examples in §6.1.3 illustrate (file-level state-decl + function-body local-decl).

### Q8 — §S11D.5 .todo absorption test
**Finding:** §S11D.5 in `parse-shapes-v0next.test.js:2344` is a `.todo` for a PARSER bug — top-level `<formRes>\n  <name> = ""\n</>` produces 0 BS blocks at TRUE top-level. This is a BS/parser-level concern. B1's TAB-output absorption is a no-op for this case because the parser still produces 0 blocks (BS issue, not B1 issue). **Verifying after B2 lands** is unlikely to flip the .todo because it's a parser-level bug. Likely status: stays `.todo`. Will verify post-implementation.

---

## Survey conclusions

**Surface is SMALLER than the 4-6h estimate suggests.**

1. The B2 check is a **localized extension** to the existing SYM walker — adding 4 case branches (let-decl, const-decl, tilde-decl, lin-decl) that consult `lookupStateCell` and emit a diagnostic.
2. Diagnostic infrastructure exists already (`SYMDiagnostic` type, `runSYM` returns `errors: SYMDiagnostic[]`, api.js already wires `collectErrors("SYM", ...)`).
3. No new error-code registration needed — the code is emitted via SYMDiagnostic directly.
4. Only ONE existing test fixture needs updating (kickstarter-v2-smoke.test.js §K11.1).
5. §S11D.5 .todo is unrelated to B2 (parser-level, not B2-relatable). Will verify post-impl.

**Implementation plan:**

**Chunk 1:** Extend `symbol-table.ts` walker — add let-decl/const-decl/tilde-decl/lin-decl case branches; use `lookupStateCell(currentScope, declNode.name)` to detect collision; populate `errors[]` with a SYMDiagnostic carrying `code: "E-NAME-COLLIDES-STATE"`. (Threads `errors` through walker.) **Commit.**

**Chunk 2:** Update `kickstarter-v2-smoke.test.js` §K11.1 to expect the firing (one error, code E-NAME-COLLIDES-STATE). **Commit.**

**Chunk 3:** Add new integration tests in `compiler/tests/integration/symbol-table.test.js` (extend existing file with §B2 tests):
- B2.1: positive — `<count> = 0` + function body `let count` → fires.
- B2.2: positive — `<userName> = ""` + function body `const userName` → fires.
- B2.3: positive — `<x> = 0` + function body `let x` → fires once even if read multiple times.
- B2.4: positive — `<count> = 0` + nested function-in-function with `let count` → fires (parent-chain walk).
- B2.5: negative — `<count> = 0` + function body `let total` → no fire.
- B2.6: negative — function body `let count` with NO state cell → no fire.
- B2.7: positive — compound parent collision — `<form>\n<name> = ""\n</>` + outer function `let name` → fires (the leaf `name` only registers in compound sub-scope, NOT in file scope; outer file scope has only `form`. So this should NOT fire on `name`. But the outer collision IS on `form`).
- B2.8: positive — multiple decls colliding in same function → multiple diagnostics.
- B2.9: positive — tilde-decl form `~name = expr` collides.
- B2.10: positive — lin-decl form `lin name = expr` collides.
- B2.11: cross-scope semantics — let in inner function shadows state cell in outer function — fires (parent-chain walk via lookupStateCell).

**Commit.**

**Chunk 4:** Verify §S11D.5 .todo. Run the test in isolation; if it now passes, promote. If not (parser bug still), leave as .todo. **Commit only if change.**

**Final commit:** Squash/refactor cleanup commit with summary. (Or leave WIP commits per branch convention.)

---

## Implementation phase

### Chunk 1 — landed `f12c116`

- Extended `compiler/src/symbol-table.ts`:
  - Imported the four local-decl types: `LetDeclNode`, `ConstDeclNode`, `TildeDeclNode`, `LinDeclNode`.
  - Added `checkLocalDeclCollidesState()` helper that calls `lookupStateCell(currentScope, decl.name)` and pushes a `SYMDiagnostic` with `code: "E-NAME-COLLIDES-STATE"` if a record is found. Message format: `local \`{kw} {name}\` shadows registered state cell \`<{qualifiedPath}>\`. ...` with V5-strict + SPEC §6.1.3 reference.
  - Added `walkLocalDeclsForCollisions()` — PASS 2 walker that visits the same AST tree as the B1 PASS 1 walker, but ONLY checks local-decls and re-uses the `_scope` annotations PASS 1 attached. Two-pass design: PASS 1 fully populates the symbol table (state-decls hoist), then PASS 2 fires diagnostics with the table fully built. Forward refs handled correctly.
  - `runSYM` now calls both passes; `errors[]` populated by PASS 2.
  - Updated docblock: B2 LANDED, V5-strict bare-name resolution active.

- Test impact: 4 channel tests (`p3a-*`) fixed:
  - `compiler/tests/integration/p3a-cross-file-multi-page-broadcast.test.js`
  - `compiler/tests/unit/p3a-chx-same-file-passthrough.test.js`
  - `compiler/tests/unit/p3a-chx-cross-file-inline.test.js`
  - `compiler/tests/unit/p3a-diagnosis.test.js`

  These tests used the legacy non-V5-strict pattern `messages = [...messages, ...]` inside server functions. Under the parser, this was being recognized as a `tilde-decl` (bare-name declaration) — which, post-B2, shadows the registered `<messages>` state cell and fires `E-NAME-COLLIDES-STATE`.

  Replaced the function bodies with neutral `return author` — these tests probe WS routing/wire identity, not function body semantics. The original pattern was never V5-strict; B2 surfaced this drift. (A1a Step 12 was meant to land all such migrations but missed these — the bare-name shadow pattern wasn't on the Step 12 inventory.)

- **Test counts:** 8928 / 44 / 1 / 0 / 8973 / 440 — zero net delta from baseline. Chunk 1 is wiring + sweep; integration tests come in Chunk 3.

- Pre-commit clean. Post-commit gauntlet (TodoMVC) clean.



