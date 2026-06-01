# domain.map.md
# project: scrmlts
# updated: 2026-06-01T00:00:00-06:00  commit: 4e1f9492

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack reactive web
language compiled by this TypeScript/JS toolchain running on Bun. The compiler converts `.scrml`
source files into `*.server.js` + `*.client.js` + `*.html` + `*.css` outputs.

## Core Concepts

| Concept | Definition |
|---------|-----------|
| `.scrml` file | Single-file source combining markup, logic, styles, SQL, auth, types, and tests |
| Pipeline | 12 ordered stages: BS → TAB → NR → MOD → CE → PA → RI → TS → META → VSS → DG → CG |
| BS (Block Splitter) | Stage 1: tokenizes `.scrml` into typed blocks (markup/logic/sql/css/etc.) — `block-splitter.js` |
| TAB (Tokenizer+AST Builder) | Stage 2: builds FileAST from block stream — `tokenizer.ts` + `ast-builder.js` |
| NR (Name Resolver) | Stage 3: resolves reactive decls, engine vars, component refs — `name-resolver.ts` |
| MOD (Module Resolver) | Stage 3.1: builds import graph, detects circular imports, produces export registry — `module-resolver.js` |
| CE (Component Expander) | Stage 3.2: expands component references via same-file + cross-file registries — `component-expander.ts` |
| PA (Pre-Analysis) | Stage 4: structural validation, attribute allowlists — `attribute-registry.js` + validators/ |
| RI (Route Inference) | Stage 5: infers server routes from page structure — `route-inference.ts` |
| TS (Type System) | Stage 6: type checking, validity surface synthesis, engine type verification — `type-system.ts` (15994L) |
| META (Meta Check+Eval) | Stage 6.5: validates phase separation, evaluates `^{}` compile-time blocks — `meta-checker.ts` + `meta-eval.ts` |
| VSS (Validity Surface Synthesis) | Stage 6.7: synthesizes `@x.isValid` / `@x.errors` / `@x.touched` / `@x.submitted` accessor cells |
| DG (Dependency Graph) | Stage 7: builds reactive dependency DAG, detects cycles — `dependency-graph.ts` |
| CG (Code Generator) | Stage 8: emits server.js + client.js + html + css from IR — `code-generator.js` + codegen/ |
| FileAST | Compiler's internal AST representation for one .scrml file — `types/ast.ts` (1983L) |
| CGError | Structured diagnostic: code + message + span + severity — `codegen/errors.ts` |
| V5-strict | Access model: `@x` is read, `@x = v` is write; compiler tracks every read/write site |
| reactive-decl | A V5-strict reactive variable (`@name`): server-side cell with compile-time dependency tracking |
| engine | State machine declared in scrml (`<engine>`/`EngineDeclNode`); Tier 2 abstraction over reactive cells |
| engine opener `effect=` | §51.0.H Form 3 boot-only opener effect; fires once at engine init; emitted by `emitEngineOpenerEffect()` in emit-engine.ts (S148 C1) |
| engine-graph sidecar | Static "what-comes-next" JSON artifact per engine; written to `<base>.engine-graph.json` via `--emit-engine-graph`; produced by `buildEngineGraphJson()` in `engine-graph.ts` (S149) |
| EngineGraph | Exported type from engine-graph.ts: `{ engines: EngineGraphEngine[] }`; honest-empty `{ engines: [] }` when no engines |
| errorBoundary | Markup-context error catch (§19.6): typed `!`-error path + host-JS try/catch backstop; implemented in `emit-error-boundary.ts` |
| `lin` (linear type) | Value that must be consumed exactly once; enforced by compiler across all branches — `LinDeclNode` |
| `~` (tilde-decl) | Deferred-init mutable slot; must be initialized before read — `TildeDeclNode` |
| channel | Server-push WebSocket channel declared in markup; `<channel name="X">` — `ChannelDeclNode` |
| SSE (§37) | Server-Sent Events; client-stub wiring via `EventSource` — `emit-client.ts` GITI-026 |
| `_scrml_modules` registry | §21.3 cross-file CLIENT module-loading (known-gaps #6, S152); idempotent global object in runtime-template.js; exporter appends `_scrml_modules[key] = { ... }` footer; importer reads via `const { x } = _scrml_modules[key]`; key derived by `moduleRegistryKey()` from absolute path + outputBaseDir |
| source-map provenance | Real per-line `.js.map` produced by build-source-map.ts + srcmap-provenance.ts; emit fns inject `#scrmlmap#` sentinel marks; buildSourceMap() resolves them to use-site spans and strips marks before output (S149 B2; S150 line-lie close) |
| Shape 4 typed-array default | §6.2 Shape 4 (S152): `<name>: T[]` with no RHS defaults to `[]`; non-array typed decl with no RHS → E-DECL-NEEDS-INITIALIZER |
| `<each>` cell-init order | (S152 HIGH): `<each>` body render fn runs synchronously at module-init BEFORE same-file cell `_scrml_reactive_set`; guard `if (!_items)` added; `_scrml_effect_static` re-runs after cell-init fires |
| `given` guard | §42.2.3 presence guard: `given ident [, ident]* => { body }`; produces `kind: "given-guard"` AST node; standalone form `:>` ratified S148 as Insight-33 extension |
| formFor | Type-driven form generation from struct definition (§41.14) — `emit-form-for.ts` |
| schemaFor | Type-driven schema emission (§41 family) — `emit-schema-for.ts` |
| tableFor | Type-driven table rendering (§41 family) — `emit-table-for.ts` |
| native-parser | In-progress scrml-native replacement for BS+TAB; `compiler/native-parser/`; activated via `--parser=scrml-native` |
| library mode | Compile mode that emits ES module exports JS + server JS without HTML/runtime (SPEC §12.6); `emit-library.ts`; suppresses `.server.js` for body-content-escalated fns |
| arm separator `:>` | Canonical match / `!{}`-handler / `given`-guard arm separator (SPEC §18.2 / §34, S147-S148); `=>` and `->` are deprecated aliases; all three parse, build, and emit identically during the deprecation window |
| W-MATCH-ARROW-LEGACY | Info-level diagnostic emitted at every match arm or `!{}`-handler arm using a deprecated `=>` or `->` separator; suggests `bun scrml migrate --fix` for AST-driven rewrite |
| per-file watcher | `commands/dev.js` (S152): Bun `fs.watch` per-file (not recursive-dir) to avoid inotify exhaustion; degrades gracefully on ENOSPC limit |

## Business Invariants (from SPEC + code)
- `null` and `undefined` do NOT exist in scrml source; both → `not` (SPEC §42; `W-ABSENCE-IN-SCRML-SOURCE`)
- Client JS MUST NOT contain SQL execution calls, server env access, or other server-only constructs (E-CG-006)
- `<auth role="X">` gates JS-mount only, NOT served HTML content (W-AUTH-CONTENT-NOT-GATED, GITI-027A)
- Every reactive write site must be in a logic context (E-WRITE-NOT-IN-LOGIC-CONTEXT)
- `lin`-typed values must be consumed exactly once across all code paths
- `async`/`await` are forbidden in scrml source (E-ASYNC-NOT-IN-SCRML, E-AWAIT-NOT-IN-SCRML); CPS is the canonical async surface
- `switch`/`try`/`throw` are forbidden scrml vocabulary (E-SWITCH-FORBIDDEN, E-THROW-NOT-IN-SCRML, E-TRY-NOT-IN-SCRML)
- Engine state-children are canonical state-machine representations; nested engines are permitted
- Match / `!{}`-handler / `given`-guard arm separator is `:>`; `=>` / `->` are deprecated aliases — new code SHALL use `:>` (SPEC §18.2 / §34)
- Typed-array decl with no RHS defaults to `[]` (§6.2 Shape 4); non-array typed decl with no RHS is E-DECL-NEEDS-INITIALIZER

## Domain Events / Diagnostic Codes (key runtime lifecycle)
W-AUTH-CONTENT-NOT-GATED — emitted when `<auth role>` is used without content gating (GITI-027A)
W-MATCH-ARROW-LEGACY — emitted (info-level) at every match / `!{}`-handler arm using deprecated `=>` or `->` separator (S147, SPEC §18.2 / §34)
W-EACH-PROMOTABLE — emitted (info-level) at `${ for (let x of @cell) { lift ... } }` sites eligible for `<each>` promotion (S130 HU-1, Stage 6.4c)
W-EACH-KEY-001 — emitted (info-level) at `<each in=@cell>` sites where items have no inferable `.id` key (S130 HU-1, Stage 6.4d)
E-DECL-NEEDS-INITIALIZER — emitted at non-array typed-decl with no RHS (S152 §6.2 Shape 4)
I-MATCH-PROMOTABLE — info diagnostic suggesting match → engine promotion (§56)
I-FN-PROMOTABLE — info diagnostic suggesting function promotion

## Pipeline Source Files (stage → primary file)

| Stage | File |
|-------|------|
| BS | compiler/src/block-splitter.js |
| TAB | compiler/src/tokenizer.ts + compiler/src/ast-builder.js |
| NR | compiler/src/name-resolver.ts |
| MOD | compiler/src/module-resolver.js |
| CE | compiler/src/component-expander.ts |
| PA | compiler/src/gauntlet-phase1-checks.js + validators/ |
| RI | compiler/src/route-inference.ts |
| TS | compiler/src/type-system.ts |
| META | compiler/src/meta-checker.ts + compiler/src/meta-eval.ts |
| DG | compiler/src/dependency-graph.ts |
| CG | compiler/src/code-generator.js + compiler/src/codegen/ |
| Sidecar | compiler/src/engine-graph.ts (--emit-engine-graph, S149) |

## Tags
#scrmlts #map #domain #compiler #pipeline #reactive #state-machine #scrml #match-arrow #engine-graph #source-map #cross-file-modules #s149 #s151 #s152

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
