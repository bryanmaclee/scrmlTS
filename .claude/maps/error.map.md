# error.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Custom Error Types — Compiler Pipeline

| ErrorClass | File | Pattern | When thrown |
|---|---|---|---|
| `BSError` | compiler/src/block-splitter.js:51 | extends Error | Block splitter syntax error (bad closer, unexpected structure) |
| `TABError` | compiler/src/ast-builder.js:146 | extends Error | Tokenizer / AST builder parse error |
| `TSError` | compiler/src/type-system.ts:342 | class (not extends) | Type system constraint violation |
| `PAError` | compiler/src/protect-analyzer.ts:126 | class (not extends) | Protected field leaked to client boundary |
| `DGError` | compiler/src/dependency-graph.ts:180 | class (not extends) | Circular dependency or unresolvable reference |
| `ModuleError` | compiler/src/module-resolver.js:31 | class (not extends) | Module not found or load failure |
| `MetaError` | compiler/src/meta-checker.ts:62 | implements MetaErrorShape | Invalid meta block (`^{}`) usage |
| `MetaEvalError` | compiler/src/meta-eval.ts:46 | implements MetaEvalErrorShape | Meta block runtime eval failure |
| `CGError` | compiler/src/codegen/errors.ts:11 | class (not extends) | Code generator error; carries `code`, `message`, optional `span` |

## Error Handling Pattern

Most pipeline stages collect errors into an array rather than throwing:
- `splitBlocks()` returns `{ blocks, errors }` — caller checks `errors[]`
- `runTS()`, `runPA()`, `runDG()` follow the same collect-and-return pattern
- `runCG()` throws `CGError` on fatal codegen failure; caller catches in `index.js`

The CLI (`cli.js`) catches all pipeline errors and formats them to stderr with file + line info.

## Runtime Error Classes (emitted into compiled scrml apps)

Defined in `compiler/src/runtime-template.js`. All extend `_ScrmlError extends Error` with `.type` and `.cause`:

| Class | HTTP analog | Use case in compiled app |
|---|---|---|
| `NetworkError` | 5xx | Fetch failures |
| `ValidationError` | 422 | Input validation |
| `SQLError` | 500 | DB query failures |
| `AuthError` | 401/403 | Authorization failures |
| `TimeoutError` | 408/504 | Request timeouts |
| `ParseError` | 500 | Response parsing |
| `NotFoundError` | 404 | Not found |
| `ConflictError` | 409 | Conflict |

## Known Error Codes (spec-defined, from master-list.md §M)

| Code | Description | Status |
|---|---|---|
| E-COMPONENT-020 | Snippet expansion bug (example 12) | Open — bug |
| E-ROUTE-001 | Computed array access in worker (example 13) | Open — bug |
| BUG-R15-005 | `\n` literal in emit() HTML | Open P3 |
| E-META-001 | False positives on destructuring/rest/default params | Open |
| E-SYNTAX-043 | Complex expressions partially pass through | Open — partial |
| E-CONTRACT-001-RT | Runtime boundary check (predicates §53) | Implemented |

## Global Error Boundaries

No global error middleware or React ErrorBoundary detected (compiler is a CLI tool, not a server).
LSP server (`lsp/server.js`) wraps all diagnostic calls in try/catch to avoid crashing the language server.

## Tags
#scrmlTS #map #error #compiler #pipeline #runtime

## Links
- [primary.map.md](./primary.map.md)
- [schema.map.md](./schema.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
