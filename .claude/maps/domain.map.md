# domain.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Core Concepts

| Concept | Definition |
|---|---|
| **Block** | Top-level named unit in a `.scrml` file — markup, logic, server, style, test, machine, or program block. Produced by Block Splitter (BS). |
| **AST Node** | Discriminated-union tree node with `kind`, `id`, `span`. All compiler stages consume and produce AST. |
| **Reactive variable** (`@var`) | A variable whose changes trigger re-renders. Client-side reactive graph is emitted by CG. |
| **Protect analysis** | Stage (PA) that determines which server-side fields must never appear in client JS. Produces a set of protected field names. |
| **Route inference** | Stage (RI) that infers which functions cross the server/client boundary and assigns route paths. |
| **Type system** | Stage (TS) that enforces scrml's structural type contracts and produces typed node annotations. |
| **Dependency graph** | Stage (DG) that resolves `import` / module references and schedules parallel server calls (`Promise.all`). |
| **Meta block** (`^{}`) | Compile-time code that runs during compilation to generate AST nodes or string output. |
| **Inline test** (`~{}`) | Test block stripped from production builds; compiled to `bun:test` `describe`/`test`/`expect` in test mode. |
| **Machine** | State machine defined with `<machine>` tag; CG emits transition tables + runtime guards (§51.5). |
| **Channel** | WebSocket state type (`<channel>`); CG emits client + server wiring without HTML markup (§35). |
| **Worker** | Self-contained JS bundle for `<program name="...">` — runs in a Web Worker (§4.12.4). |
| **Self-host** | Pipeline stages rewritten as `.scrml` source; loaded with `--self-host` flag. L2 + L3 bootstrap complete. |
| **Component expander** | Stage (CE) that inlines component references and resolves slot/snippet contracts. |

## Pipeline Stages (ordered)

| Stage | Code | File | Consumes | Produces |
|---|---|---|---|---|
| Block Splitter | BS | block-splitter.js | `.scrml` source | Block list |
| Tokenizer + AST Builder | TAB | tokenizer.ts + ast-builder.js | Blocks | AST per block |
| Body Pre-Parser | BPP | body-pre-parser.ts | AST | Patched AST (parser workarounds) |
| Protect Analyzer | PA | protect-analyzer.ts | AST | Protected field set |
| Route Inference | RI | route-inference.ts | AST | Route map |
| Type System | TS | type-system.ts | AST | Type-annotated AST |
| Dependency Graph | DG | dependency-graph.ts | AST | Dep graph, scheduling plan |
| Meta Eval | ME | meta-eval.ts | AST | Expanded AST (meta blocks evaluated) |
| Meta Checker | MC | meta-checker.ts | AST | Validated meta usage |
| Component Expander | CE | component-expander.ts | AST + dep graph | Expanded AST |
| Code Generator | CG | codegen/index.ts | All above | HTML + CSS + client JS + server JS + source maps |

## Business Invariants

- Protected fields (`@protect`) must never appear in emitted client JS
- Route paths are deterministic: derived from file path + function name by RI
- Self-host modules are reference copies — primary lives in `~/scrmlMaster/scrml/`
- All pipeline errors are collected (not thrown); CLI presents them all before halting
- `~{}` inline test blocks are stripped from production builds entirely
- `<channel>` generates no HTML markup — client + server wiring only

## Key Output Artifacts (per compiled file)

| Artifact | Content |
|---|---|
| `.html` | Full HTML including `<script>` client JS injection |
| `.client.js` | Client-side reactive JS (no protected data) |
| `.css` | Scoped CSS |
| `.server.js` | Server route handlers |
| `.map` | Source Map v3 (optional) |
| `.worker.js` | Web Worker bundle (if `<program>` present) |
| `.test.js` | `bun:test` file (if `~{}` blocks present) |

## Tags
#scrmlTS #map #domain #compiler #pipeline #scrml-language

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [compiler/PIPELINE.md](../../compiler/PIPELINE.md)
- [compiler/SPEC.md](../../compiler/SPEC.md)
