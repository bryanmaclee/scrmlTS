# codegen/ — Code Generator (Stage 8)

The code generator transforms validated ASTs into executable output:
HTML, CSS, server-side JS, and client-side JS.

## Module List

| Module | Purpose |
|---|---|
| `index.js` | Entry point. Exports `runCG()` and `CGError`. Orchestrates all phases. |
| `analyze.js` | Analysis layer. Walks AST + pipeline data to produce `FileAnalysis` per file. |
| `ir.js` | IR factory functions. Plain-object containers between analysis and emission. |
| `binding-registry.js` | Typed contract between HTML gen and client JS gen (event + logic bindings). |
| `reactive-deps.js` | String-literal-aware `@var` dependency extraction from expressions. |
| `collect.js` | AST collection utilities (getNodes, collectFunctions, collectMarkupNodes, etc.). |
| `rewrite.js` | Expression rewriters (@var, ?{}, navigate, match, fn keyword). |
| `utils.js` | Shared helpers (escapeHtmlAttr, routePath, replaceCssVarRefs, VOID_ELEMENTS). |
| `var-counter.js` | Deterministic variable name generator (`genVar`, `resetVarCounter`). |
| `errors.js` | `CGError` class (code + message + span). |
| `scheduling.js` | Dependency-graph-aware statement scheduling (Promise.all for independent server calls). |
| `emit-html.js` | HTML emission from markup AST nodes. Populates BindingRegistry. |
| `emit-css.js` | CSS emission from inline `#{}` blocks and `<style>` blocks. |
| `emit-server.js` | Server-side route handler generation (fetch endpoints, CPS splits, auth). |
| `emit-client.js` | Client-side JS orchestrator (delegates to emit-functions, emit-bindings, etc.). |
| `emit-functions.js` | Fetch stubs, CPS wrappers, and client-boundary function bodies. |
| `emit-bindings.js` | `ref=`, `bind:`, and `class:` directive wiring. |
| `emit-reactive-wiring.js` | Top-level logic statements and CSS variable bridge. |
| `emit-overloads.js` | State-type overload dispatch functions. |
| `emit-event-wiring.js` | Event handler wiring and reactive display wiring (DOMContentLoaded). |
| `emit-logic.js` | Single LogicNode to JS emission (switch on node.kind). |
| `emit-control-flow.js` | if/for/while/try/match/switch statement emission. |
| `emit-lift.js` | Lift expression emission (createElement chains for `_scrml_lift`). |
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
    emitReactiveWiring()  — top-level logic + CSS variable bridge
    emitOverloads()       — state-type dispatch
    emitEventWiring()     — event listeners + reactive display (reads BindingRegistry)
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
    Map<filePath, { html, css, clientJs, serverJs }>
```

## Parser Workarounds

The `compat/parser-workarounds.js` module handles known parser bugs:

- **Leaked comments**: The tokenizer sometimes includes `// comment` text as bare expressions. `stripLeakedComments()` and `isLeakedComment()` detect natural language text and strip it.
- **Merged statements**: The parser loses statement boundaries, concatenating multiple declarations into one node. `splitBareExprStatements()` recovers boundaries by scanning for identifier starts after value tokens. `splitMergedStatements()` handles the `"value @name2 = value2"` pattern in reactive/let/const inits.
