# scrml — Recent Fixes & Work In Flight

A rolling log of what just landed and what's actively underway in the compiler. For the full spec and pipeline docs see `compiler/SPEC.md` and `compiler/PIPELINE.md`.

Baseline (2026-04-14 end of S17): **6,224 tests passing / 14 failing** (all 14 are pre-existing, non-blocking — environment issues, self-host build step, edge cases).

---

## Recently Landed

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
