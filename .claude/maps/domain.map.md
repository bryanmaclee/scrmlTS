# domain.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

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
| errorBoundary | Markup-context error catch (§19.6): typed `!`-error path + host-JS try/catch backstop; implemented in `emit-error-boundary.ts` |
| `lin` (linear type) | Value that must be consumed exactly once; enforced by compiler across all branches — `LinDeclNode` |
| `~` (tilde-decl) | Deferred-init mutable slot; must be initialized before read — `TildeDeclNode` |
| channel | Server-push WebSocket channel declared in markup; `<channel name="X">` — `ChannelDeclNode` |
| SSE (§37) | Server-Sent Events; client-stub wiring via `EventSource` — `emit-client.ts` GITI-026 |
| formFor | Type-driven form generation from struct definition (§41.14) — `emit-form-for.ts` |
| schemaFor | Type-driven schema emission (§41 family) — `emit-schema-for.ts` |
| tableFor | Type-driven table rendering (§41 family) — `emit-table-for.ts` |
| native-parser | In-progress scrml-native replacement for BS+TAB; `compiler/native-parser/`; activated via `--parser=scrml-native` |
| library mode | Compile mode that emits ES module exports JS + server JS without HTML/runtime (SPEC §12.6); `emit-library.ts`; suppresses `.server.js` for body-content-escalated fns |

## Business Invariants (from SPEC + code)
- `null` and `undefined` do NOT exist in scrml source; both → `not` (SPEC §42; `W-ABSENCE-IN-SCRML-SOURCE`)
- Client JS MUST NOT contain SQL execution calls, server env access, or other server-only constructs (E-CG-006)
- `<auth role="X">` gates JS-mount only, NOT served HTML content (W-AUTH-CONTENT-NOT-GATED, GITI-027A)
- Every reactive write site must be in a logic context (E-WRITE-NOT-IN-LOGIC-CONTEXT)
- `lin`-typed values must be consumed exactly once across all code paths
- `async`/`await` are forbidden in scrml source (E-ASYNC-NOT-IN-SCRML, E-AWAIT-NOT-IN-SCRML); CPS is the canonical async surface
- `switch`/`try`/`throw` are forbidden scrml vocabulary (E-SWITCH-FORBIDDEN, E-THROW-NOT-IN-SCRML, E-TRY-NOT-IN-SCRML)
- Engine state-children are canonical state-machine representations; nested engines are permitted

## Domain Events / Diagnostic Codes (key runtime lifecycle)
W-AUTH-CONTENT-NOT-GATED — emitted when `<auth role>` is used without content gating (GITI-027A)
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

## Tags
#scrmlts #map #domain #compiler #pipeline #reactive #state-machine #scrml

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
