# scrml — Recent Fixes & Work In Flight

A rolling log of what just landed and what's actively underway in the compiler. For the full spec and pipeline docs see `compiler/SPEC.md` and `compiler/PIPELINE.md`.

Baseline (2026-04-17 after S22 §1a): **6,841 tests passing / 10 skipped / 2 failing** (25,426 expects across 275 files). 2 remaining self-host fails deferred per user.

---

## Recently Landed

### 2026-04-17 (S22 — §1a enum payload variants: construction + match destructuring)

- **Enum payload variant construction (prereq for §51.3.2 payload binding in machine rules).** Before S22, `Shape.Circle(10)` threw `TypeError: Shape.Circle is not a function` because `emitEnumVariantObjects` only emitted string entries for unit variants and short-circuited entirely when an enum had zero unit variants. Now `emit-client.ts:emitEnumVariantObjects` iterates every variant and emits a constructor function for each payload variant: `Shape.Circle(10) === { variant: "Circle", data: { r: 10 } }`. Unit variants still emit as strings (`Shape.Square === "Square"`). The tagged-object shape aligns with §19.3.2 `fail` (minus the `__scrml_error` sentinel) so one runtime dispatches both error and regular variants by inspecting `.variant`. The inline `EnumType.Variant(args) → { variant, value: (args) }` rewrite in `rewrite.ts:rewriteEnumVariantAccess` was removed — the constructor function is now the single source of truth, and the old shape (`value` vs the correct `data`) couldn't carry multi-field / named-field payloads anyway. SPEC §51.3.2 prereq text flipped from "blocked" to "landed S22". Commit `a25d812`.
- **Match destructures tagged-object payload variants.** Before S22, `.Circle(r) => r * r` parsed the binding but the emitter dropped it; `r` was referenced undeclared in the generated JS. Multi-arg `.Rect(w, h)` wasn't parsed at all. Now `parseMatchArm` captures the raw paren contents; a new `parseBindingList` splits on commas and recognizes positional (`r`), named (`reason: r`), and `_` discard forms. `emitMatchExpr` + `emitMatchExprDecl` emit `const __tag = (v && typeof v === "object") ? v.variant : v;` when at least one arm needs tagged dispatch (unit-only and scalar matches stay on the plain `tmpVar === "X"` path). Variant arms with bindings emit `const loc = tmp.data.<field>;` — positional bindings resolve via a per-file variant-fields registry (`buildVariantFieldsRegistry(fileAST)` populates it at the top of `generateClientJs`, clears after), named bindings use the field name directly. Collisions / unknown variants produce a diagnostic comment instead of a runtime `ReferenceError`. A `splitMultiArmString` bug was also fixed — the §42 presence-arm detector was splitting `.Circle(r) =>` at the `(` because it didn't notice the paren belonged to a variant binding. Commit `1d84ab3`.
- **Regression tests (13 new, 2 updated).** New `compiler/tests/unit/gauntlet-s22/payload-variants.test.js` (6 tests: all-payload, mixed unit/payload, single- and multi-field round-trip, `.variants` ordering, §19.3.2 `fail` alignment). New `compiler/tests/unit/gauntlet-s22/payload-variants-match.test.js` (7 tests that compile + execute the emitted client JS: positional, multi-field, named, mixed unit/payload, `_` discard, scalar, unit-only). `emit-match.test.js:45` flipped from "binding ignored" to registry-aware positional and named destructuring. Existing `enum-variants.test.js` §6–§13b and `codegen-struct-rewrite.test.js` "enum variant in chain" updated to the constructor-function model (calls are preserved by rewrite, shape is asserted via `emitEnumVariantObjects` eval).
- **Known limitation, deferred.** Short-form `.Circle(10)` in a typed-annotation context `let s:Shape = .Circle(10)` still lowers to `"Circle"(10)` by the standalone-dot pass (a type-inference concern, not codegen). Fully qualified `Shape.Circle(10)` works. Live repro remaining at `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-match-payload-positional-031.scrml` — match destructures correctly now, only the construction line is still broken.

### 2026-04-17 (S21 — §19 codegen, §21 imports, §51 alternation, README/tutorial polish)

- **§51 `|` alternation in machine transition rules.** Grammar extended: `machine-rule ::= variant-ref-list '=>' variant-ref-list guard? effect?`, where `variant-ref-list ::= variant-ref ('|' variant-ref)*`. Both sides of `=>` may list variants; the rule desugars to the cross-product of single-pair rules before the type checker (`expandAlternation` at `type-system.ts:1902`). Any guard or effect block attaches to every expansion. Duplicate `(from, to)` pairs — within a line or across lines — emit new **E-MACHINE-014**. Mario example collapses from 8 lines to 3. Commit `eef7b5e`.
- **§19 error handling codegen rewrite.** `fail E.V(x)` now parses and emits a tagged return object inside nested bodies (if/for/function); `?` propagation works in nested bodies; `!{}` inline catch checks `result.__scrml_error` and matches on `.variant` rather than using try/catch (per §19.3.2 "fail does not throw"). E-ERROR-001 (fail in non-failable function) now fires — was unreachable before because `fail` never parsed inside function bodies. Parser also accepts canonical `.` separator alongside `::` alias. `ast-builder.js` parseFailStmt + parseOneStatement dispatch; `emit-logic.ts` guarded-expr rewrite. Commit `37049be`.
- **E-IMPORT-006 on missing relative imports.** Module resolver previously resolved the absolute path but never checked `existsSync`, so `import { x } from "./missing.scrml"` compiled clean. `buildImportGraph` now flags E-IMPORT-006 when the target is not a `.js` specifier, not in the compile set, and absent on disk; synthetic test-path importers are skipped so self-host / resolver unit tests stay green. Commit `86b5553`.
- **README "Why scrml" rewrites.** "State is first-class" redefined from "@var reactivity" to "state is named, typed, instantiable" per the S10/S11 memory. "Mutability contracts" rescoped from a machine-only paragraph to an opt-in three-layer story: value predicates (§53) + presence lifecycle (`not`/`is some`/`lin`) + machine transitions. Features-section bullet that still held the `server @var`/`protect` grab-bag renamed to "Server/client state." Commits `d802707` and the preceding §51 commit.
- **Tutorial v2 promoted.** `docs/tutorial.md` now contains the former v2 content (v1 deleted). Snippets renamed `docs/tutorialV2-snippets/` → `docs/tutorial-snippets/`. Commit `41e4401`.
- **Regression tests (3 new files, 22 tests).** `compiler/tests/unit/gauntlet-s20/error-handling-codegen.test.js` (11), `.../import-resolution.test.js` (3), `.../machine-or-alternation.test.js` (8). Updated `emit-logic-s19-error-handling.test.js` (14 tests) to the new return-value model.

### 2026-04-16 (S20 — gauntlet phases 5-12)

Executed gauntlet phases 5-12 against SPEC.md: meta, SQL, error/test, styles, validation/encoding, channels, integration apps, error UX. Fixed 5 compiler bugs, documented 11 more for batch treatment.

- **Bugs fixed (5).** `reflect(@var)` misclassified (now runtime per §22.4.2); E-META-008 now fires for `reflect()` outside `^{}`; E-META-006 now catches `lift <tag>` inside `^{}`; no spurious E-META-001/005 alongside E-META-003 on unknown types in `reflect()`; E-FN-003 now catches `@var = …` / `@var += …` inside `fn` bodies.
- **Bugs documented for future batch.** `fail` compiles to bare `fail;` (fixed in S21); E-ERROR-001 not enforced (fixed in S21); `?` emits as literal `?;` (fixed in S21); `!{}` try/catch vs `fail` return mismatch (fixed in S21); `lin + ^{}` capture not counted as consumption; phase separation detected at eval-time; DG false-positive for `@var` via `meta.get()`/`meta.bindings`; nested `^{}` in compile-time meta crashes eval; E-SCOPE-001 doesn't fire for undeclared variables in logic blocks; **E-IMPORT-006** for missing modules (fixed in S21).
- **Test artifacts.** 80 fixture files under `samples/compilation-tests/gauntlet-s20-{channels,error-test,error-ux,meta,sql,styles,validation}/` and 16 regression tests under `compiler/tests/unit/gauntlet-s20/`. End-of-S20 baseline: 6,802 pass / 10 skip / 2 fail.

### 2026-04-14–15 (S19 — gauntlet phases 1-4)

Language gauntlet across declarations, control-flow, operators, and markup. Multiple bug fixes + fixture additions across commits `8e95226` (error-system §19 compliance), `dd25311` (reject JS-reflex keywords), `cf426a1` (animationFrame + `ref=`), `36a99bd` (loops/labels/assignment-in-condition), `a9ab734` (`_` wildcard alias + E-LOOP-003 disable), `cee9fc1` (markup fixture corpus). Full Phase 2 triage documented under `docs/changes/gauntlet-s19/` (pending archival to scrml-support/archive).

### 2026-04-14 (S18 — public-launch pivot)

- **README SQL-batching expansion.** Five new Server/Client bullets (Tier 2 N+1 rewrite, Tier 1 envelope, mount coalescing, `.nobatch()` opt-out, batch diagnostics) plus a sharper "Why scrml" paragraph (adds `D-BATCH-001` near-miss + `.nobatch()` escape hatch) plus `?{}` row in the Language Contexts table noting auto-batching. Commit `d20ffa4`.
- **Lift Approach C Phase 2c-lite — drop dead BS+TAB re-parse block.** The inline re-parse fork inside `emitLiftExpr` (~50 LOC) that normalized tokenizer-spaced markup and rebuilt a MarkupNode via `splitBlocks` + `buildAST` was confirmed dead by S14 instrumentation (0 hits across 14 examples + 275 samples + compilation-tests). Deleted. Commit `f5d78df`. Full Phase 2 deferred (helpers still reached via `emitConsolidatedLift` for fragmented bodies).
- **Bug fix: `export type X:enum = {...}` misparsed.** `ast-builder.js` `collectExpr` treated `:` + IDENT + `=` as a new assignment-statement boundary, breaking the decl because `enum`/`struct` tokenize as IDENT (not KEYWORD). The leftover `enum = {...}` was reparsed as a standalone let-decl, firing `E-MU-001` on `enum`. Fix: added `:` to the lastPart skip-list alongside `.` and `=`. Commit `b123ed1`. **Affects any user writing an exported named-kind type — high public impact.**
- **Bug fix: reactive-for `innerHTML = ""` destroys keyed reconcile wrapper.** `emit-reactive-wiring.ts` unconditionally emitted the clear inside `_scrml_effect`, so every re-run destroyed the `_scrml_reconcile_list(` wrapper before the diff could run. Fix: skip the clear when `combinedCode` contains `_scrml_reconcile_list(` (mirrors the existing single-if branch guard). Commit `b123ed1`.
- **Test fixture: `if-as-expr` write-only-let.** Not a compiler bug — MustUse correctly flagged `let x = 0; if (true) { x = 1 }` (no read of `x`). Test intent was if-stmt codegen, not MustUse semantics — fixture updated to `log(x)` after the if-stmt. Commit `b123ed1`.
- **8 TodoMVC happy-dom tests skipped with notes.** The harness wraps the runtime in an IIFE, scoping `let _scrml_lift_target = null;` to that IIFE; client-JS IIFE can't see it, throws `ReferenceError: _scrml_lift_target is not defined`. Real browsers share global lexical env between classic `<script>` tags — works there. Puppeteer e2e (`examples/test-examples.js`) covers 14/14 examples. Tests marked `test.skip` with top-of-file annotation documenting root cause and unskip condition. Commit `b123ed1`.
- **S19 gauntlet plan queued.** Full 12-phase language gauntlet plan (decls, control-flow, operators, markup, meta, SQL, error/test, styles, validation/encoding, channels, integration apps, error UX) left at `handOffs/incoming/2026-04-14-2330-scrmlTS-to-next-pa-language-gauntlet-plan.md`. 31 agents identified from `~/.claude/agentStore/` with wave-staging recommendation.

### 2026-04-14 (S17)

- **SQL batching Slice 6 — §8.11 mount-hydration coalescing.** When ≥2 `server @var` declarations on a page have callable initializers (loader functions), the compiler emits one synthetic `POST /__mountHydrate` route whose handler runs every loader via `Promise.all` and returns a keyed JSON object. The client replaces per-var `(async () => { ... })()` IIFEs with one unified fetch that demuxes results via `_scrml_reactive_set`. Non-callable placeholders (literal inits, `W-AUTH-001`) are excluded; writes stay 1:1 per §8.11.3. Route export follows the existing `_scrml_route_*` convention. Tier 1 coalescing (§8.9) applies automatically inside the synthetic handler because loaders are sibling DGNodes.
- **SQL batching Slice 5b remainder — §8.10.7 guards.** `E-PROTECT-003` fires when a Tier 2 hoist's `SELECT` column list overlaps any `protect`-annotated column on the target table — the hoist is refused and CG falls back to the unrewritten for-loop. `SELECT *` expands to every protected column on the table. New exported `verifyPostRewriteLift` runs after Stage 7.5 and emits `E-LIFT-001` if any hoist's `sqlTemplate` contains a `lift(` call (defensive — §8.10.1 construction makes this unreachable today, but the pass is the spec's required re-check gate).
- **SQL batching microbenchmark.** New `benchmarks/sql-batching/bench.js` measures the exact JS shapes the compiler emits before/after the batching passes on on-disk WAL `bun:sqlite` (synchronous=NORMAL). Results in `benchmarks/sql-batching/RESULTS.md`. Headline: Tier 2 loop-hoist speedup is **1.91× at N=10, 2.60× at N=100, 3.10× at N=500, 4.00× at N=1000**. Tier 1 shows ~5% on read-only handlers — the envelope's real value is snapshot consistency and contention amplification under concurrent writers.
- **README promotion.** "Why scrml" now states "the compiler eliminates N+1 automatically" with a link to the measured results.

### 2026-04-14 (S16)

- **SQL batching Tier 1 + Tier 2 end-to-end** — spec §8.9 / §8.10 / §8.11 + PIPELINE Stage 7.5 + CG emission all landed (11 commits on `main`).
  - **Tier 1 per-handler coalescing (§8.9)**: independent `?{}` queries in a single `!` server handler execute under an implicit `BEGIN DEFERRED..COMMIT` envelope with catch-`ROLLBACK`. One prepare/lock cycle instead of N. `.nobatch()` chain method opts out of any site. `E-BATCH-001` fires on composition with explicit `transaction { }`; `W-BATCH-001` warns when `?{BEGIN}` literals suppress the envelope.
  - **Tier 2 N+1 loop hoisting (§8.10)**: `for (let x of xs) { let row = ?{... WHERE col = ${x.field}}.get() }` rewrites to one `WHERE IN (...)` pre-fetch + `Map<key, Row>` + per-iteration `.get(x.id) ?? null`. `.all()` groups into `Map<key, Row[]>`. Positional `?N` placeholders preserve parameter safety. `D-BATCH-001` informational diagnostic on near-miss shapes (`.run()`, tuple WHERE, multiple SQL sites, no match). `E-BATCH-002` runtime guard on `SQLITE_MAX_VARIABLE_NUMBER` overflow.
  - **CLI**: `scrml compile --emit-batch-plan` prints the Stage 7.5 BatchPlan as JSON.
- **`.first()` → `.get()` reconciliation (§8.3)** — 17 occurrences renamed in SPEC. `.get()` matches bun:sqlite convention; `.first()` dropped.
- **README refinements** — new "Free HTML Validation" subsection explains predicate → HTML attr derivation; "Variable Renaming" rewritten with real §47 encoding (`_s7km3f2x00`) + tree-shakeable decode table story.

### 2026-04-14 (S14)

- **Match-as-expression (§18.3)** — `const x = match expr { .A => v else => d }` now works end-to-end. Follows the same pattern as `if`/`for` as expressions.
- **`:>` match arm arrow** — codegen support complete. Both `=>` and `:>` are canonical; `->` retained as a legacy alias. `:>` avoids overloading JS arrow-function syntax and reads as "narrows to."
- **`</>` closer propagation** — the 2026-04-09 spec amendment (bare `/` → `</>`) was incompletely applied; the AST builder still accepted bare `/` as a tag closer. Now uniformly enforced across parser, codegen, and all 11 affected sample files.
- **Lift Approach C Phase 1** — `parseLiftTag` produces structured markup AST nodes directly during parsing. Previously 0% of real inline lift markup went through the structured path; now it's 100%. The fragile markup re-parse path is dead in production (retained only for legacy test fixtures pending Phase 3).
- **Phase 4d (ExprNode-first migration)** — all compiler consumers now read structured `ExprNode` fields first, with string-expression fields deprecated across 20+ AST interfaces. Expression handling is now AST-driven end-to-end.

---

## In Flight

- **Phase 3 — Legacy test fixture migration.** ~21 fixtures still use the old `{kind: "expr", expr: "..."}` shape. Rewriting them unlocks deletion of ~250–300 LOC of dead string-parsing fallback code in `emit-lift.js`.
- **Lin Approach B (discontinuous scoping).** Design complete, spec amendments drafted. Multi-session work to land an enriched `lin` model beyond Rust-style exact-once consumption.
- **SPEC sync.** Formalizing the `:>` match arm, match-as-expression, and Lift Approach C changes in `compiler/SPEC.md`.

---

## Queued

- **Phase 2 reactive effects** — two-level effect separation for `if`/`lift`. Design settled; will land when a concrete example drives the need.
- **SQL batching (compiler-level).** Two wins on the table:
  - *Per-request coalescing* — independent `?{}` queries in one server function get emitted together, one prepare/lock cycle instead of N.
  - *N+1 loop hoisting* — detect `for (let x of xs) { ?{...WHERE id=${x.id}}.get() }` and rewrite to a single `WHERE id IN (...)` fetched once before the loop. This is only tractable because the compiler owns both the query context and the loop context.
  - Cross-call DataLoader-style batching is parked until beta.
- **Remaining 14 test failures** — triaged, pre-existing, none block beta.
