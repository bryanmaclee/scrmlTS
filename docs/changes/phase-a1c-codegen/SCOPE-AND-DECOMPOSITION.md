# A1c — Codegen + Runtime + PIPELINE prose: scope and per-step decomposition (DRAFT)

**Status:** RATIFIED 2026-05-05 (S60). All 8 open Qs ratified. User verbatim: "Q3. C is what i want, the rest are ratified". Q3 selected Option (c) compile-time elision — adds usage-analysis pass; see §11 + new step C0.
**Predecessor:** A1b (resolve+type) — see `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`. A1c begins after A1b-COMPLETE (final B-step wraps).
**Successor:** Phase A2 (engines), then A3-A6 (per the v0.2.0 inventory). A1c-COMPLETE marks v0.next "compiler implements the new shapes end-to-end" — the milestone that unblocks downstream phase work.
**Authority:** SPEC v0.next (post-D4 + L21). A1c emits JavaScript for every AST shape A1a produced (Steps 1-13 + 11.5) and every annotation A1b decorated.

---

## §1 What A1c is

A1c's scope is **codegen + runtime + PIPELINE.md prose pass** — everything from "the AST is annotated and validated" (A1b's deliverable) to "JavaScript is in the user's hands and the architecture doc reflects what the code does." It is the **emission phase**: every spec semantic that requires runtime support gets a JavaScript rendering here.

A1c's outputs:
- **Generated client JS** — DOM wiring, reactive-cell setters/getters, derived-cell computation closures, render-spec expansion at `<x/>` use sites, bind:* dispatch, validity-surface synthesis, engine state-machine runtime.
- **Generated server JS** — route handlers, server-function lowering, schema-driven SQL queries, channel WebSocket endpoints with auto-injected `broadcast`/`disconnect`.
- **Runtime library** — `dist/scrml-runtime.js` extended with v0.next primitives (validator catalog, refinement-zone runtime, engine state-machine helper, channel client glue).
- **Updated PIPELINE.md** — stage descriptions reflecting v0.next AST shapes, lock-firing loci, and the validity-surface synthesis step.

A1c does NOT change the AST shape (A1a's job) or fire diagnostic errors (A1b's job). It walks A1b's annotated AST and produces JavaScript text + runtime-library JS.

A1c is a **single phase** in the compiler pipeline contract — but per per-step decomposition (§4 below), the implementation work splits into ~23 focused dispatches. Each step is a per-step branch with PA cherry-pick to main between steps, mirroring A1a + A1b.

---

## §2 Spec authority — sections + locks

A1c emits runtime code for the following **Spec sections**:
- **§4** Structural elements (`<engine>`, `<match>`, `<errors>`, `<onTransition>`) — runtime registration + dispatch
- **§5** Event handlers — bare-form lowering (multi-statement already rejected by B18)
- **§6** Reactivity — V5-strict reactive primitives (§6.1), three RHS shapes (§6.2 — emission per shape), Variant C compound proxy (§6.3), render-by-tag expansion (§6.4), mutable arrays (§6.5), derived computation closures (§6.6), markup-typed derived (§6.6.17), `default=` + `reset(@cell)` runtime (§6.8 — L18, γ semantics)
- **§14** Bare-variant inference codegen — emit resolved enum-variant access path (M9)
- **§15** Components — multi-instance lowering (M20)
- **§21** Imports — `pinned` hoisting (M18)
- **§38** Channels — file-level WebSocket endpoint emission; auto-injected `broadcast()`/`disconnect()` in server functions
- **§39** Schema — additive shared-core lowering: `req → NOT NULL`, `length → CHECK`, `pattern → CHECK ... REGEXP/~` driver-dependent, `min/max/gte/lte → CHECK`, `oneOf → CHECK ... IN(...)`. SQL-mirror passthrough unchanged.
- **§40.7** `<program>` documentary attributes — `title`/`description`/`version`/`author`/`license` to HTML `<head>`
- **§51** Engines — state-machine runtime, transition handlers, `<onTransition>` hooks, `derived=expr` reactive variant, cross-file mount singleton semantics (L20, M16, M18)
- **§53** Refinement types — three-zone runtime: static-zone elision; boundary-zone hook (server-fn entry, fetch boundary); trusted-zone elision after first check
- **§55** Validators + validity surface — predicate runtime catalog; per-cell validator runner; rollup + per-field synthesis; cross-field args; 4-level error-message resolution chain (L11, L12, L13, L14)

A1c emits runtime support for the following **Locks**:
- **L1** Markup-as-first-class-value — markup nodes flow through the value-passing path same as scalars
- **L2** Compound state Variant C — nested reactive proxy with field paths
- **L3** Decl-coupled-with-render-spec — `<x/>` use-site expands to the cell's bindable markup
- **L4** Validator vocabulary unification — same predicate runtime fires in three loci
- **L5** `is some` vs `req` — distinct runtime predicates with documented semantics
- **L11** Auto-derived validity surface — runtime synthesis of `.isValid`, `.errors`, `.touched`, `.submitted`
- **L12** 4-level error message resolution — runtime chain: inline literal → registered messages → scrml:data defaults → `<match>` escape hatch
- **L13** `<errors of=expr/>` — first-class element emission
- **L14** Cross-field validation — runtime dep wiring across cells
- **L15** `const <derived>` ALL-SCOPE — derived-cell computation emission
- **L17** Compiler dispatches binding by render-spec — bind:value/checked/files based on element type
- **L18** `reset(@cell)` keyword + `default=` — runtime reset path with γ semantics (default-expr OR init-expr fallback)
- **L20** `derived=expr` engine — reactive variant computation
- **L21** E-DERIVED-VALUE-MUTATE — A1b enforces; A1c contributes by emitting derived-cell read-only proxies (the runtime mirror)

A1c emits codegen for the following **Moves**:
- **M9** Bare-variant inference codegen
- **M15** `:` shorthand body emission
- **M16** Auto-declared engine variable
- **M18** Cross-file engine import (singleton mount semantics)
- **M20** Components-vs-engines distinction

---

## §3 Compiler subsystems touched

### §3.1 Cell emitter — `compiler/src/codegen/cell-emit.ts` (or equivalent)

The largest A1c surface. Survey will confirm exact files (codegen is currently in `compiler/src/codegen/` per A1a Step 6 + Step 9 work). Responsibilities:

- **Shape-aware emission** — dispatch on `state-decl.shape`:
  - `"plain"` → existing reactive-cell setup (`_scrml_reactive_set/get`)
  - `"decl-with-spec"` → emit reactive cell PLUS the bound input element + bind:* dispatch
  - `"derived"` → emit reactive computation closure with dep-tracking from A1b's DAG
- **Variant C compound** — nested reactive proxy with field paths (`@formRes.name` resolves to setter/getter on the proxy)
- **Markup-typed derived** (§6.6.17) — derived cell whose `initExpr` produces markup; consumers via `${@cell}` interpolation
- **`default=` storage** — emit the `defaultExpr` as a runtime field on the cell descriptor for `reset()` access

### §3.2 Render-spec expander — markup walker (likely `compiler/src/codegen/markup-emit.ts` or equivalent)

- **`<x/>` use-site detection** — A1b annotates use sites with cell-resolution; A1c walks markup, finds `<x/>` tags whose `tag` matches a registered Shape-2 cell, and EXPANDS to the cell's render-spec markup.
- **Bind:* dispatch (L17)** — based on the expanded element's tag/type, emit the right `bind:value` / `bind:checked` / `bind:files` glue.
- **Multi-render** (L16) — same cell rendered multiple times: cell value flows to all expansion sites; writes from any site flow back. No new override syntax (per L16).

### §3.3 Reset emitter — `reset(@cell)` lowering

- **Runtime call form** — `reset(@cell)` lowers to `_scrml_reset(cellRef)` or equivalent runtime helper.
- **γ semantics (L18):** at runtime, the helper:
  1. If cell has `defaultExpr` set, evaluate `defaultExpr` and assign
  2. Otherwise, re-evaluate the cell's init-expr (the original RHS) and assign
  3. Compound case: recursively reset children
- **Validity surface coupling:** reset MAY also clear `.touched` + `.submitted` flags per spec — confirm at survey.

### §3.4 Validator runtime — `compiler/src/runtime/validators.js` (NEW or extended)

A new sub-system likely; the existing `dist/scrml-runtime.js` may have skeletal validator support but not the full v0.next vocabulary.

- **14-predicate catalog** (§55.1, L4) — `req`, `is some`, `length`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom`. Each is a runtime function with documented semantics.
- **Per-cell validator runner** — for each cell with `validators[]`, A1c emits a derived computation: read cell value + each validator arg → produce a reactive `.isValid` + `.errors` (enum tags, NOT strings — per L11).
- **Rollup synthesis** — for compound parents, emit a derived computation that aggregates child `.isValid` + `.errors` into compound `.isValid` + `.errors`.
- **Cross-field deps (L14)** — cross-cell predicate args wire dependency edges so any upstream change re-fires the validator.
- **`is some` vs `req` runtime distinction (L5)** — `is some` returns true for `""`; `req` returns false for `""`. Documented + tested.

### §3.5 Validity surface emitter — synthesizes auto-cells

- For each compound-with-validators (B11) and per-field-with-validators (B12), emit:
  - Reactive `.isValid` cell (rollup for compound; per-field elsewhere) — read-only proxy backed by computed
  - Reactive `.errors` cell — read-only proxy of an array of enum tags
  - Reactive `.touched` cell — write happens on first user interaction (from bind:* dispatch)
  - Reactive `.submitted` cell — write happens on first form submit attempt
- **Synthesized writes are runtime-blocked** even after A1b's compile-time E-SYNTHESIZED-WRITE check, as a defense-in-depth measure (the runtime proxy throws if the developer somehow bypasses).
- **`<errors of=expr/>` (L13)** — first-class element emission: walks the resolved error source (per-cell or rollup) and emits a markup node iterating the error array.
- **4-level error-message resolution (L12)** — A1b records the chain decision per validator; A1c emits the right runtime call: inline literal, `_scrml_messages.lookup(.Tag, args)`, `scrml:data` default lookup, OR `<match>` escape-hatch invocation.

### §3.6 Engine emitter — `compiler/src/codegen/engine-emit.ts` (NEW or extended)

- **State-machine runtime** — A1c emits a runtime `_scrml_engine` instance per `<engine for=Phase>`:
  - Current variant cell (reactive)
  - Transition table (parsed from `rule="event -> Variant"` attrs)
  - Initial state from `initial=` (or first variant if missing — per W-ENGINE-INITIAL-MISSING)
- **`.advance(.event)` emission** — emits a method on the engine instance that looks up event in transition table, fires `<onTransition>` hooks, applies state change.
- **`<onTransition from=A to=B>`** — registered as a hook on the engine instance, fired during `.advance()`.
- **`derived=expr` engine (L20)** — no rules, no `.advance()`; instead, A1c emits a derived computation that recomputes the variant when upstream deps fire.
- **Auto-declared engine variable (M16)** — A1b resolved this; A1c emits the binding (`<phase>` cell backed by engine instance).
- **Cross-file engine mount (M18)** — `<MarioMachine/>` use sites in non-decl files emit a mount-call against the singleton instance from the decl file. Singleton resolution is shared across all use sites in the importer's file.
- **Components-vs-engines (M20)** — A1b enforces the separation; A1c emits component-instance bodies as fresh-per-instance and engine bodies as singleton-per-app.

### §3.7 Refinement-type runtime — `compiler/src/runtime/zones.js` (NEW)

Three-zone enforcement (SPARK model, §53.4):
- **Static zone** — type-checker proves conformance at compile time; A1c elides runtime checks.
- **Boundary zone** — at trust boundaries (server-function entry, fetch result, file read, etc.), A1c emits a runtime predicate check that throws on non-conformance (with a typed error, not a generic `Error`).
- **Trusted zone** — once a value has passed boundary check, downstream uses elide further checks.

A1b records zone decisions per type-annotation; A1c emits the runtime predicates at boundary loci only.

### §3.8 Schema lowerer — `compiler/src/schema/*` (NEW or extended)

- **Additive shared-core lowering** (§39.5.8): `req → NOT NULL`, `length(>=N) → CHECK (length(col) >= N)`, `pattern(re) → CHECK (col REGEXP ...)` driver-dependent (Postgres `~`, SQLite/MySQL `REGEXP`), `min/max/gt/lt/gte/lte/eq/neq → CHECK`, `oneOf([...]) → CHECK (col IN (...))`.
- **SQL-mirror form** unchanged — `not null`, `unique`, `references`, `default(literal)`, `primary key` lower as-is.
- **`<schema>` block lowering** — emits SQL DDL strings used by `?{...}` blocks and the schema validation runtime.
- **Cross-locus consistency** — A1b validates the same predicate vocabulary in three loci (state-validator, refinement-type, schema); A1c emits the schema-locus runtime (CHECK constraints) AND ensures cross-locus alignment is preserved in the output.

### §3.9 Channel emitter — `compiler/src/codegen/channel-emit.ts` (NEW or extended)

- **WebSocket endpoint** — `<channel name="chat" topic="lobby">` produces `/_scrml_ws/chat` endpoint; `topic=` defaults to `name`.
- **Auto-injected `broadcast()`/`disconnect()`** — server functions inside the channel body get these injected as locals.
- **Auto-sync** — channel-scoped V5-strict cells (`<messages> = []`) auto-sync across subscribed clients via the runtime.
- **`onserver:message=handler(msg)`** — handler attribute params are function-local LOCALS accessed bare (V5-strict locals semantic).

### §3.10 `<program>` documentary attribute emitter — head emission

- `title=` → HTML `<title>` element
- `description=` → `<meta name="description" content="...">` 
- `version=` → `<meta name="version" content="...">`
- `author=` → `<meta name="author" content="...">`
- `license=` → `<meta name="license" content="...">`
- W-PROGRAM-TITLE-NESTED warning when documentary attrs appear on nested `<program>` blocks (§43)

### §3.11 PIPELINE.md prose pass — documentation work

- **Stage descriptions** updated for v0.next AST shapes — TAB / NR / MOD / UVB / TS / DG / CG addenda from D4 stitched + reflowed
- **Lock-firing locus** for each lock — which stage fires which check
- **Validity-surface synthesis step** documented as a new pipeline stage (or sub-stage of TS)
- **Integration Failure Mode Catalog** extended with v0.next-specific failure modes

---

## §4 Decomposition into per-step dispatches

23 steps total, ~93-131 h focused work, 6 waves. Each step is a per-step branch with PA cherry-pick to main, mirroring A1a + A1b.

### §4.0 Foundational usage-analysis pass (Step C0) — ~3-5 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| **C0** | **Feature-usage analysis pass** — walk A1b's annotated AST, produce a usage bitmap recording which v0.next features the app actually touches (validators-by-predicate-name, engines-yes/no, refinement-types-yes/no, channels-yes/no, derived-cells, validity-surface, render-spec, reset, etc.). Bitmap is consumed by every downstream runtime-emission step. | `compiler/src/codegen/usage-analyzer.ts` (NEW) | **3-5 h** | INSERTED S60 ratification (Q3 Option C). Foundational; all Wave 1-5 steps that emit runtime helpers consult the bitmap. False-negatives = runtime crashes; false-positives = bloat. Soundness-over-completeness; conservative inclusion when in doubt. |

### §4.1 Foundational state-decl emission (Steps C1-C4) — ~15-20 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C1 | **Shape-aware cell emitter** — extend cell-emit to dispatch on `state-decl.shape` | `compiler/src/codegen/*` | 4-6 h | Foundational; C2-C4 depend |
| C2 | **Derived-cell reactive computation emission** — wire B7's DAG into derived computation closures; markup-typed derived included | `codegen/*` + `runtime/*` | 4-6 h | Powers C5+ |
| C3 | **Render-spec expansion at `<x/>` use site** — markup walker expands cell-tag use sites to the cell's bindable markup | `codegen/markup-emit.ts` | 4-5 h | L16 multi-render handled here |
| C4 | **Bind:* dispatch (L17)** — based on render-spec element type, emit the right binding glue | `codegen/markup-emit.ts` | 3-4 h | Builds on C3 |

### §4.2 Reset + validators (Steps C5-C7) — ~12-18 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C5 | **`reset(@cell)` runtime + `default=` integration (L18, γ)** — runtime helper that resets to `defaultExpr` OR init-expr fallback; compound recursive | `codegen/*` + `runtime/*` | 4-5 h | Closes A1a Step 9 deferral |
| C6 | **Validator predicate runtime catalog (14 predicates)** — `req`, `is some`, `length`, `pattern`, `min`, `max`, `gte`, `lte`, `eq`, `oneOf`, `email`, `url`, `numeric`, `integer`, `custom` (L4) | `runtime/validators.js` (NEW) | 5-7 h | Powers C7+, C9, C16 |
| C7 | **Per-cell validator runner** — for each cell with `validators[]`, emit a derived computation producing `.isValid` + `.errors` (enum tags) | `codegen/*` + `runtime/*` | 3-5 h | |

### §4.3 Validity surface (Steps C8-C11) — ~18-25 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C8 | **Validity surface synthesis emission** — for compound-with-validators, emit synthesized `.isValid` / `.errors` / `.touched` / `.submitted` rollup cells (L11) | `codegen/*` + `runtime/*` | 5-7 h | Consumes B11/B12 annotations |
| C9 | **Cross-field validator dependencies (L14)** — predicate args referencing other cells wire reactive deps so upstream change re-fires validator | `codegen/*` | 3-5 h | |
| C10 | **4-level error-message resolution emission (L12)** — per-validator chain decision recorded by A1b; A1c emits inline literal / `_scrml_messages.lookup` / scrml:data default / `<match>` escape | `codegen/*` + `runtime/*` | 5-7 h | Touches every validator path |
| C11 | **`<errors of=expr/>` element emission (L13)** — walks resolved error source, emits markup iterating error array | `codegen/markup-emit.ts` | 5-6 h | First-class element; multi-form `all=` attr |

### §4.4 Engines (Steps C12-C15) — ~18-25 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C12 | **Engine state-machine runtime** — current variant cell, transition table, initial state (W-ENGINE-INITIAL-MISSING handled at A1b) | `codegen/engine-emit.ts` (NEW or ext.) + `runtime/engine.js` (NEW or ext.) | 5-7 h | Foundational for C13-C15 |
| C13 | **`.advance(.event)` emission + `<onTransition>` hook firing** — method on engine instance; hook registry fired in transition path | `codegen/engine-emit.ts` | 4-5 h | |
| C14 | **`derived=expr` engine emission (L20)** — reactive variant recomputation; no .advance, no rules | `codegen/engine-emit.ts` | 4-6 h | |
| C15 | **Cross-file engine mount + auto-declared engine variable (M16, M18)** — singleton resolution across importer's file; auto-bind `<phase>` cell to engine instance | `codegen/engine-emit.ts` + import lowerer | 5-7 h | Singleton semantics critical |

### §4.5 Cross-cutting + ergonomics (Steps C16-C22) — ~25-35 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C16 | **Refinement-type runtime emission (§53)** — three-zone: static elision; boundary check at trust boundary; trusted-zone elision marker | `runtime/zones.js` (NEW) + `codegen/*` | 5-7 h | A1b records decisions; A1c emits boundary hooks |
| C17 | **Schema additive shared-core lowering (§39)** — req → NOT NULL, length → CHECK ..., pattern → CHECK ... REGEXP/~, etc. SQL-mirror passthrough unchanged | `compiler/src/schema/*` | 4-6 h | Driver-dependent regex form; PA verifies driver matrix |
| C18 | **Channel WebSocket emission + broadcast/disconnect runtime injection (§38)** — `/_scrml_ws/<name>` endpoint; auto-injected helpers in server functions | `codegen/channel-emit.ts` (NEW or ext.) + `runtime/channels.js` | 4-6 h | |
| C19 | **`<program>` documentary attributes emission (§40.7)** — title/description/version/author/license to HTML head + W-PROGRAM-TITLE-NESTED on nested | `codegen/*` | 1-2 h | Small; closes S59 documentary-attrs work |
| C20 | **`pinned` import hoisting** — A1b validates legality; A1c hoists imports flagged `pinned: true` to break forward-ref cycles | `codegen/*` + import lowerer | 3-4 h | Survey: existing import lowerer behavior |
| C21 | **Variant C compound + markup-typed derived emission** — nested reactive proxy with field paths; markup-typed derived produces markup for `${@cell}` interpolation | `codegen/*` + `runtime/*` | 5-7 h | |
| C22 | **Bare-variant inference codegen (M9)** — A1b resolved qualified form; A1c emits resolved enum-variant access path | `codegen/*` | 2-3 h | Small; touches expression emitter |

### §4.6 PIPELINE prose (Step C23) — ~5-8 h

| # | Step | Files | Est | Notes |
|---|---|---|---|---|
| C23 | **PIPELINE.md prose pass** — stage descriptions per v0.next; lock-firing locus per stage; validity-surface synthesis as new (sub-)stage; Integration Failure Mode Catalog extended | `compiler/PIPELINE.md` | 5-8 h | Independent of code changes; can run in parallel with any later wave |

**Total: ~96-136 h** focused work across **24 steps** (C0 + C1-C23). C0 added by Q3 ratification.

### §4.7 Step-to-lock + step-to-error-code mapping

| Step | Locks emitted | Error codes / warnings emitted |
|---|---|---|
| C1 | L1, L2, L3, L15 | — (emission only; A1b fired) |
| C2 | L15, §6.6.17 markup-derived | — |
| C3 | L3, L16, §6.4 | — |
| C4 | L17 | — |
| C5 | L18 | — |
| C6 | L4, L5 | — |
| C7 | L11 | — |
| C8 | L11 | runtime: synthesized-write blocker |
| C9 | L14 | — |
| C10 | L12 | runtime: `_scrml_messages` chain fallback |
| C11 | L13 | — |
| C12 | §51 | — |
| C13 | §51 | runtime: invalid `.advance` arg |
| C14 | L20 | — |
| C15 | M16, M18 | — |
| C16 | §53 | runtime: typed-zone-violation error |
| C17 | L4 | — (SQL emission) |
| C18 | §38 | — |
| C19 | §40.7 | (W-PROGRAM-TITLE-NESTED is A1b/A1c boundary; verify) |
| C20 | M18 | — |
| C21 | L1, L2, §6.6.17 | — |
| C22 | M9 | — |
| C23 | (docs) | — |

### §4.8 Step-to-A1b-dependency table

| Step | Required A1b deliverables |
|---|---|
| C1 | B5 (cell classifier) + B7 (derived dep DAG) |
| C2 | B7 (derived DAG) + B5 |
| C3 | B5 + B6 (render-by-tag classifier) |
| C4 | B5 (bindable classifier) |
| C5 | B22 (reset target validation) + state-decl `defaultExpr` field |
| C6 | B10 (validator typer) |
| C7 | B10 + B5 |
| C8 | B11 (compound-rollup synthesis) |
| C9 | B10 + B14 (cross-field arg resolution via @name) |
| C10 | B13 (4-level chain decision recorded) |
| C11 | B10 + B11 |
| C12 | B14 (engine binding) |
| C13 | B14 + B15 (transition exhaustiveness) |
| C14 | B16 (derived engine validation) |
| C15 | B14 + B17 (cross-file engine import) |
| C16 | B21 (zone decision recording) |
| C17 | A1b schema validation pass (out of B-step scope; existing infra extended) |
| C18 | B19 (channel context check) |
| C19 | A1b head-attribute pass (existing infra) |
| C20 | B4 (pinned cycle decision) |
| C21 | B5 (Variant C classifier) |
| C22 | B20 (bare-variant inference) |
| C23 | (independent) |

### §4.9 Test-delta forecast

A1c has heavy runtime-behavior testing — output JS must produce correct DOM behavior, network behavior, reactive cell updates, validity-surface visibility, engine transitions, etc. Many tests are integration / browser-suite shape.

| Wave | Steps | Approx test delta |
|---|---|---|
| 1 (foundational emission) | C1-C4 | +50 to +80 |
| 2 (reset + validators) | C5-C7 | +40 to +60 |
| 3 (validity surface) | C8-C11 | +60 to +100 |
| 4 (engines) | C12-C15 | +50 to +80 |
| 5 (cross-cutting) | C16-C22 | +60 to +100 |
| 6 (docs) | C23 | 0 (docs only) |
| **Total** | **23 steps** | **+260 to +420** |

A1c-close baseline forecast: ~9,400-9,600 pass tests (depending on A1b churn + Step 12 rewrites + Step 11.5 fold).

---

## §5 Sequencing rationale

**Strict dependencies:**
- C1 (shape-aware emission) before C2 — derived needs shape-discriminator emission
- C2 before C5 — reset needs derived-cell reactive setup (compound resets touch derived sub-cells)
- C3 before C4 — bind dispatch consumes render-spec expansion output
- C6 before C7-C11 — predicate catalog is the foundation
- C7 before C8 — per-cell runner before rollup synthesis
- C8 before C9, C10, C11 — synthesis is the substrate for cross-field, message, and `<errors>` element
- C12 foundational for C13-C15
- C16-C22 are mostly independent (cross-cutting); some pairs may collide on the typer / cell-emitter — survey-first
- C23 (PIPELINE prose) independent; can run in parallel with any wave

**Parallel-dispatch opportunity:** Wave 5 (C16-C22) is the largest parallel-candidate window. Wave 4 (engines) could parallel-dispatch with Wave 5 if file-touch independence is verified.

**Recommended sequence:**

Wave 1 (foundational): C1 → C2 in series; C3 → C4 in series; the two pairs can dispatch in parallel.
Wave 2 (reset + validators): C5 standalone; C6 → C7 in series.
Wave 3 (validity surface): C8 → {C9, C10, C11} the three siblings in parallel after C8.
Wave 4 (engines): C12 → C13 → C14 → C15 sequential.
Wave 5 (cross-cutting): C16-C22 mostly parallel; PA dispatches in waves of 2-3.
Wave 6 (docs): C23 anytime after Wave 4 lands (so PIPELINE prose reflects engine wiring).

**Wall-time estimate (sequential):** 93-131 h ≈ 12-17 working days at 8h/day.
**Wall-time estimate (with intra-wave parallelism):** 65-90 h.

---

## §6 Risk surface

### §6.1 Architectural risks

- **Codegen + runtime split** — current compiler has `compiler/src/codegen/` for emission and `dist/scrml-runtime.js` for runtime helpers. v0.next adds substantial runtime surface (validator catalog, engine state-machine, zone runtime, channel client). **Risk:** runtime library size growth + cold-start performance degradation. Mitigation: tree-shaking opportunities surveyed at C6 (validator catalog).
- **Validator catalog naming collision** — `req` is also a HTTP request shorthand in samples; ensure runtime function namespace is sufficiently scoped (e.g., `_scrml_validators.req`). Survey-first.
- **Engine runtime abstraction** — current compiler's engine support is partial (per A1b §11 warning). A1c may surface gaps requiring more rework than estimated. **Add 6-10h contingency to Wave 4.**
- **Channel WebSocket integration** — current compiler may not have full Bun.serve WS integration for v0.next channels. Survey-first at C18.

### §6.2 Behavioral risks

- **Output JS size growth** — every new lock + every new validator + every new synthesized cell adds bytes. Could push compiled-app sizes notably. Mitigation: unused-validator elision via static analysis (potential A1c step or post-A1c optimization).
- **Performance regression on reactive updates** — validity-surface synthesis adds reactive deps; large compounds with many validators may hit reactive update cascades. Mitigation: batched updates already part of the runtime; verify v0.next surface respects.
- **DOM update jank from render-spec expansion** — multi-render (L16) means a single cell change updates multiple DOM positions; ensure update batching covers.

### §6.3 Coordination risks

- **A1c BLOCKED on B-step completeness** — A1c cannot start until A1b is done; if A1b's 22 steps slip, A1c slips proportionally.
- **A1b → A1c handoff gaps** — A1b records decorations on the AST; if a decoration is missing, A1c can't emit. Mitigation: each B-step DoD includes "A1c can read this decoration via field X" as a stated invariant.
- **Self-host parity** — currently deferred per the carry-forward A1a/A1b policy. A1c-COMPLETE marks the natural restoration point: once the TS compiler emits v0.next end-to-end, self-host parity becomes a separate phase (likely Phase A2's substrate work).

### §6.4 Carry-forward gaps from A1a (deferred to A1c)

- **Shape 3 V5-strict codegen gap** — surfaced S61 during Step 11.5 (FOLD `reactive-derived-decl` → `state-decl{shape:"derived",isConst:true}`). Latent from Step 4 (`shape:"derived"` populated in AST but not honored by `emit-logic.ts`). Specifically: V5-strict structural derived form `const <x> = expr` emits `_scrml_reactive_set` (the plain-cell helper) instead of `_scrml_derived_declare` / `_scrml_derived_subscribe` (the derived-cell helpers). The legacy `const @x = expr` path post-fold uses the correct derived helpers via the gating predicate `shape === "derived" && isConst === true && structuralForm === false`. Fix: extend the gating predicate (or the case-discrimination logic in `emit-logic.ts`) to also fire on `structuralForm === true` for the V5-strict shape, OR refactor the dispatch on the `shape` discriminator alone. Documented in Step 11.5 progress.md. **A1c step assignment:** likely C-codegen-derived (whichever C-step touches `emit-logic.ts` derived-helper invocations).

---

## §7 Test invariant strengthening

A1a established the **anti-html-fragment guard**. A1b extended with **anti-folklore + anti-suppression + annotated-AST shape**. A1c extends further:

- **Output-byte-shape assertion** — every C-step that touches an existing emission path asserts the byte-output for unmodified pre-v0.next code is unchanged (modulo new feature emission). Defends against silent codegen regressions.
- **Runtime-behavior assertion** — every C-step that adds new runtime emission has at least one DOM-level / network-level / engine-transition / validity-surface-visible test asserting end-user-observable behavior. Compile-clean is necessary but not sufficient at A1c.
- **Output-size budget** — major C-steps record output-size delta on a representative sample. PA spot-checks for regressions ≥ 5% on critical paths (TodoMVC sample, kickstarter v2 §3 corpus).

---

## §8 What this doc does NOT cover (read elsewhere)

- A1b status — see `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`
- A1a status — see `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md`
- Phase A2-A6 + B + C scope — see `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md`
- Per-step BRIEFs — drafted at-dispatch-time, like A1a + A1b's per-step briefs
- L18 + γ semantics SPEC text — `compiler/SPEC.md` §6.8
- Validity-surface SPEC text — `compiler/SPEC.md` §55
- Engine SPEC text — `compiler/SPEC.md` §51
- §53 refinement-type three-zone SPEC text — `compiler/SPEC.md` §53.4

---

## §9 Ratified decisions (S60 — user verbatim "Q3. C is what i want, the rest are ratified")

1. **[RATIFIED] A1b completion before A1c starts** — strict dependency; A1c needs A1b's annotated AST. A1c begins immediately after A1b's final B-step wraps.

2. **[RATIFIED] Wave parallelism scope** — selective parallel within Wave 5 (C16-C22) where file-touch independence is verified. **Cap: 2-3 concurrent agents.** Wave 4 (engines, C12-C15) strictly serial. Other waves dependency-locked. Mirrors A1b ratification.

3. **[RATIFIED — Option C COMPILE-TIME ELISION]** — runtime library is emitted per-app based on actual feature usage. **Adds a foundational feature-usage analysis pass (NEW step C0) at the start of A1c.** All downstream runtime-emission steps (C6, C12, C16, C18, C21, etc.) consult the usage bitmap and emit only the runtime helpers the app actually touches. **Consequence:** smallest output per app; most complexity in A1c (the elision logic must be sound — false-negatives crash apps at runtime, false-positives only bloat). Worth it per user direction.

4. **[RATIFIED] PIPELINE.md prose timing** — C23 lands after Wave 4 (engines), before/parallel-with Wave 5. Engine-emit details need to be accurate before prose; one update pass not two.

5. **[RATIFIED] Step count** — 23 + 1 (NEW C0 from Q3 ratification) = **24 steps total**. Per-step focus preserved; compression declined.

6. **[RATIFIED] Refinement-type three-zone scope (C16)** — subset for A1c: static-zone elision + boundary-zone hook emission. Trusted-zone elision deferred to v0.3.0 (consistent with A1b's deferral chain). Saves ~+5h C16. **Consequence:** trusted-zone is fully out of v0.2.0; values pay boundary-check cost on every traversal until v0.3.0 lands trusted-zone elision.

7. **[RATIFIED] Schema lowering driver matrix (C17)** — Postgres + SQLite + MySQL ONLY for v0.2.0 (matches stdlib's existing driver coverage). MSSQL, Oracle, others deferred to post-v0.2.0.

8. **[RATIFIED] Output-byte-shape regression policy** — ≤5% regression budget on critical paths (TodoMVC sample, kickstarter v2 §3 corpus) as the spot-check threshold. Higher regressions get **surfaced for triage**, not auto-blocked. Codegen quality is one signal among many.

---

---

## §10 Self-host parity + branch-naming policy

**Self-host parity (carry-forward from A1a/A1b):** `compiler/self-host/*` is out-of-sync by design at this phase. v0.next is the engineering target; once A1c-COMPLETE lands (the TS compiler implements v0.next end-to-end), self-host parity is restored as a separate dispatch (likely Phase A2+ substrate work). **A1c dispatches do NOT mirror to self-host unless survey reveals self-host has independent code paths producing the relevant codegen that ALSO need v0.next behavior.** Document any divergence in per-step `progress.md`.

**Per-step branch naming:** `phase-a1c-step-cN-<slug>` (parallel to A1a/A1b conventions). Per-step doc directories: `docs/changes/phase-a1c-step-cN-<slug>/` with `BRIEF.md` + `progress.md`.

---

## §11 Runtime library growth policy — RATIFIED Option C (compile-time elision)

**Ratified 2026-05-05 (S60).** User direction: Q3 Option (c) — compile-time elision based on per-app feature usage.

**Current state:** `dist/scrml-runtime.js` is a single shared runtime emitted alongside compiled app output.

**v0.next runtime additions (per-feature, all elidable):**
- Validator predicate catalog (~3-5 KB minified, 14 functions; **per-predicate elidable** — only emit `req` if app uses `req`, etc.)
- Validity surface synthesis helpers (~1-2 KB; **elidable if app has no compound-with-validators**)
- Engine state-machine helper (~2-3 KB; **elidable if app has no engine**)
- Zone runtime (~1 KB; **elidable if app has no refinement-type predicates**)
- Channel client (~2-3 KB; **elidable if app has no channels**)

**Total v0.next runtime growth (worst case, app uses everything):** +9-14 KB minified.
**Total v0.next runtime growth (typical app — counter + form, no engine, no channels):** +1-3 KB minified (just the validators it uses).

### §11.1 Mechanism — feature-usage bitmap

C0 (foundational step) walks A1b's annotated AST and produces a `FeatureUsage` bitmap:
- `validators: { req: bool, length: bool, pattern: bool, ... }` — per-predicate flags
- `engines: bool`
- `derivedEngines: bool`
- `channels: bool`
- `refinementTypes: bool`
- `validitySurface: bool` (any compound-with-validators?)
- `renderSpec: bool` (any Shape 2 cells?)
- `markupTypedDerived: bool`
- `reset: bool` (any `reset(@cell)` call sites?)
- ... etc.

Downstream runtime-emission steps (C6, C8, C12, C16, C18, etc.) consult the bitmap and emit ONLY the helpers needed.

### §11.2 Soundness vs completeness

**Soundness:** if a feature is USED, the bitmap MUST include it (false-negative = runtime crash). C0 is conservative — when in doubt, include.

**Completeness:** if a feature is NOT used, the bitmap MAY exclude it. False-positive = bloat (~bytes), not crash. Acceptable.

**Trade-off ordering:** soundness > completeness > minimal-output-size. Conservative inclusion is the right default for v0.2.0; refinement of the analysis (more aggressive elision) is post-v0.2.0 optimization.

### §11.3 Risk surface

- **C0 must walk the FULL annotated AST** including imports + transitively-imported modules. Importing a module that uses engines means the importer's bitmap has `engines: true` even if the importer's own code doesn't.
- **Cross-file imports** (M18 cross-file engines) require import-graph traversal at C0 time. Caching the per-module bitmap is the right shape.
- **Validator catalog elision** — `req` is the most-used predicate; `pattern` next. The 14-predicate catalog will likely retain ~6-8 predicates in typical apps, eliding the rest. Modest savings but adds up.
- **Worst-case test fixture** — TodoMVC and kickstarter v2 §3 corpus should both exercise feature-usage detection. Add at C0's DoD: bitmap output for each is documented.

---

## §12 Tags

#phase-a1c #scope-doc #codegen #runtime #pipeline-prose #decomposition #24-steps #96-136h #ratified-s60 #6-waves #compile-time-elision-option-c #C0-usage-analyzer #refinement-zone-subset #postgres-sqlite-mysql-only
