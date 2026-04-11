# schema.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## TypeScript Types & Interfaces

Single source file for AST types: `compiler/src/types/ast.ts` (933 lines)

### Span  [ast.ts:23]
```
file: string       — absolute path of source file
start: number      — byte offset, first character
end: number        — byte offset, one past last character
line: number       — 1-based
col: number        — 1-based
```

### AttrValue  [ast.ts:36]
Discriminated union — `kind` field selects variant:
- `"string-literal"` — StringLiteralAttrValue { value: string }
- `"variable-ref"` — VariableRefAttrValue { name: string }
- `"call-ref"` — CallRefAttrValue { name: string, args: string[] }
- `"expr"` — ExprAttrValue { raw: string, refs: string[] }
- `"props-block"` — PropsBlockAttrValue { propsDecl: unknown }
- `"absent"` — AbsentAttrValue

All variants carry `span: Span`.

### AST node base pattern  [ast.ts]
Every node carries:
- `kind: string` — discriminant literal
- `id: number` — unique within compilation unit
- `span: Span` — source location

Note: Full AST node union is 933 lines. Read `compiler/src/types/ast.ts` directly for all node kinds (markup nodes, logic nodes, declaration nodes, expression nodes, etc.).

## Compiler Stage Output Types

Key shaped types used across pipeline stages (defined inline in their respective stage files, not in `types/`):

| Type | File | Description |
|---|---|---|
| `FileAnalysis` | codegen/analyze.ts | per-file analysis output: nodes, functions, markup, CSS bridges, IR |
| `BindingRegistry` | codegen/binding-registry.ts | typed contract — event + logic bindings from HTML to client JS gen |
| `CompileContext` | codegen/context.ts | single object threaded through every emitter (params, options, analysis) |
| `CGError` | codegen/errors.ts | `{ code: string, message: string, span?: Span }` |
| `BSError` | block-splitter.js | block-splitter parse error |
| `TABError` | ast-builder.js | tokenizer/AST builder error |
| `TSError` | type-system.ts | type system check error |
| `PAError` | protect-analyzer.ts | protect analyzer error |
| `DGError` | dependency-graph.ts | dependency graph error |
| `ModuleError` | module-resolver.js | module resolution error |
| `MetaError` | meta-checker.ts | meta block check error |
| `MetaEvalError` | meta-eval.ts | meta block eval error |

## Runtime Error Classes (emitted into compiled output)

Defined in `compiler/src/runtime-template.js` (inlined into generated client JS):

| Class | Base | Purpose |
|---|---|---|
| `NetworkError` | `_ScrmlError` | HTTP fetch failures |
| `ValidationError` | `_ScrmlError` | Input validation failures |
| `SQLError` | `_ScrmlError` | Database query failures |
| `AuthError` | `_ScrmlError` | Authorization failures |
| `TimeoutError` | `_ScrmlError` | Request timeout |
| `ParseError` | `_ScrmlError` | Response parsing failures |
| `NotFoundError` | `_ScrmlError` | 404-type failures |
| `ConflictError` | `_ScrmlError` | Conflict/409-type failures |

All extend `_ScrmlError extends Error` with `.type` and `.cause` fields.

## Tags
#scrmlTS #map #schema #ast #types #compiler

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [compiler/src/types/ast.ts](../../compiler/src/types/ast.ts)
