# scrml — Recent Fixes & Work In Flight

A rolling log of what just landed and what's actively underway in the compiler. For the full spec and pipeline docs see `compiler/SPEC.md` and `compiler/PIPELINE.md`.

Baseline (2026-04-14 end of S18): **6,228 tests passing / 8 skipped / 2 failing**. S18 fixed 4 real tests (3 compiler bugs + 1 test fixture), skipped 8 happy-dom TodoMVC harness tests with documented root cause (harness IIFE-scope — Puppeteer e2e covers), 2 remaining self-host fails deferred per user.

---

## Recently Landed

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
