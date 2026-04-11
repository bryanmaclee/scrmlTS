# codegen/ — Code Generator (Stage 8)

The code generator transforms validated ASTs into executable output:
HTML, CSS, server-side JS, client-side JS, source maps, worker bundles,
and bun:test files.

## Module list

| Module | Purpose |
|---|---|
| `index.ts` | Entry point. Exports `runCG()` and `CGError`. Orchestrates the three phases. |
| `context.ts` | `CompileContext` — single object consolidating params threaded through every emitter. |
| `analyze.ts` | Analysis layer. Walks AST + pipeline data to produce `FileAnalysis` per file. |
| `ir.ts` | IR factory functions. Plain-object containers between analysis and emission. |
| `binding-registry.ts` | Typed contract between HTML gen and client JS gen (event + logic bindings). |
| `reactive-deps.ts` | String-literal-aware `@var` dependency extraction from expressions. |
| `collect.ts` | AST collection utilities (getNodes, collectFunctions, collectMarkupNodes, etc.). |
| `rewrite.ts` | Expression rewriters (`@var`, `?{}`, navigate, match, `fn` keyword, `is`/`is not`). |
| `utils.ts` | Shared helpers (escapeHtmlAttr, routePath, replaceCssVarRefs, VOID_ELEMENTS). |
| `var-counter.ts` | Deterministic variable name generator (`genVar`, `resetVarCounter`). |
| `type-encoding.ts` | ADR-001 encoded variable names — type-derived deterministic names for emitted JS. |
| `errors.ts` | `CGError` class (code + message + span). |
| `scheduling.ts` | Dependency-graph-aware statement scheduling (`Promise.all` for independent server calls). |
| `source-map.ts` | Source Map v3 generator with inline VLQ encoder. Maps output JS lines back to `.scrml`. |
| `runtime-chunks.ts` | Splits `SCRML_RUNTIME` into named chunks for tree-shaking. Assembled by `emit-client.ts`. |
| `emit-html.ts` | HTML emission from markup AST nodes. Populates `BindingRegistry`. |
| `emit-css.ts` | CSS emission from inline `#{}` blocks and `<style>` blocks. |
| `emit-server.ts` | Server-side route handler generation (fetch endpoints, CPS splits, auth, predicate checks). |
| `emit-client.ts` | Client-side JS orchestrator. Delegates to `emit-functions`, `emit-bindings`, etc. |
| `emit-functions.ts` | Fetch stubs, CPS wrappers, and client-boundary function bodies. |
| `emit-bindings.ts` | `ref=`, `bind:`, and `class:` directive wiring. |
| `emit-reactive-wiring.ts` | Top-level logic statements + CSS variable bridge + sync infrastructure. |
| `emit-overloads.ts` | State-type overload dispatch functions. |
| `emit-event-wiring.ts` | Event handler wiring and reactive display wiring (`DOMContentLoaded`). |
| `emit-logic.ts` | Single `LogicNode` to JS emission (switch on `node.kind`). |
| `emit-control-flow.ts` | `if` / `for` / `while` / `try` / `match` / `switch` statement emission. |
| `emit-lift.js` | Lift expression emission (`createElement` chains for `_scrml_lift`). |
| `emit-channel.ts` | §35 `<channel>` — WebSocket state type codegen (no HTML; client + server wiring). |
| `emit-worker.ts` | §4.12.4 `<program name="...">` — self-contained worker JS bundles. |
| `emit-machines.ts` | §51.5 — transition tables + runtime guards for `< machine>` and enums with `transitions{}`. |
| `emit-predicates.ts` | §53 inline type predicates — boundary runtime checks (`E-CONTRACT-001-RT`) + HTML attr derivation. |
| `emit-sync.ts` | §52.6 sync infrastructure for `server @var` (initial load, optimistic update, sync stub). |
| `emit-test.ts` | `~{}` inline test codegen — emits `bun:test` `describe`/`test`/`expect` from `TestGroup[]` IR. |
| `emit-library.ts` | Library mode emission — exports for compiled scrml modules used as libraries. |
| `compat/parser-workarounds.js` | Parser bug workarounds (leaked comments, merged statements). |

## Three-Phase Execution Model

```
Phase 1: ANALYZE
  runCG() calls analyzeAll() which runs analyzeFile() per file.
  Each file gets a FileAnalysis with pre-collected nodes, functions,
  markup nodes, top-level logic, CSS bridges, and an IR container.

Phase 2: PLAN (HTML emission populates BindingRegistry)
  generateHtml() walks markup AST nodes and emits HTML strings.
  As it encounters event handlers and reactive expressions, it
  records them in a BindingRegistry instance — the typed contract
  that bridges HTML generation to client JS generation.

Phase 3: EMIT (all other outputs)
  generateCss()      — collects and concatenates CSS blocks
  generateServerJs() — emits route handlers for server-boundary functions
  generateClientJs() — orchestrates client-side emission:
    emitFunctions()       — fetch stubs + CPS wrappers + client functions
    emitBindings()        — ref=/bind:/class: directive wiring
    emitReactiveWiring()  — top-level logic + CSS variable bridge + sync
    emitOverloads()       — state-type dispatch
    emitEventWiring()     — event listeners + reactive display (reads BindingRegistry)
    emitMachines()        — transition tables + runtime guards
    emitChannels()        — WebSocket channel client/server wiring
    emitWorkers()         — worker JS bundles for nested <program> nodes
    emitTests()           — bun:test output for ~{} inline tests
```

## Data Flow

```
                      Pipeline Inputs
                      ===============
  files (AST[])    routeMap (RI)    depGraph (DG)    protectAnalysis (PA)
       |                |                |                   |
       v                v                v                   v
  +------------------------------------------------------------------+
  |                     analyzeAll()                                  |
  |  Per-file: getNodes, collectFunctions, collectMarkupNodes, etc.   |
  |  Cross-file: collectProtectedFields                              |
  +------------------------------------------------------------------+
       |                                                    |
       v                                                    v
  Map<filePath, FileAnalysis>                    Set<protectedFields>
       |
       |  For each file:
       v
  +-------------------+      BindingRegistry      +-------------------+
  |  generateHtml()   | -----> (event+logic) ---> | generateClientJs()|
  +-------------------+                           +-------------------+
       |                                                    |
       v                                                    v
     HTML string                                    client JS string
                                                          |
  +-------------------+                            (validates no
  |  generateCss()    |                             protected fields
  +-------------------+                             leak to client)
       |
       v
     CSS string

  +-------------------+
  | generateServerJs()|
  +-------------------+
       |
       v
    server JS string

  All outputs collected into:
    Map<filePath, { html, css, clientJs, serverJs, sourceMap?, workerJs?, testJs? }>
```

## Parser Workarounds

The `compat/parser-workarounds.js` module handles known parser bugs:

- **Leaked comments**: The tokenizer sometimes includes `// comment` text as bare expressions. `stripLeakedComments()` and `isLeakedComment()` detect natural language text and strip it.
- **Merged statements**: The parser loses statement boundaries, concatenating multiple declarations into one node. `splitBareExprStatements()` recovers boundaries by scanning for identifier starts after value tokens. `splitMergedStatements()` handles the `"value @name2 = value2"` pattern in reactive/let/const inits.
