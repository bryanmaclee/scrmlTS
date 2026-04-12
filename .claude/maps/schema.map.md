# schema.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## TypeScript Types & Interfaces

### Source Location  [compiler/src/types/ast.ts:18-30]
Span: { file, start, end, line, col }
ExprSpan: { file, start, end, line, col }

### Attribute Values  [compiler/src/types/ast.ts:40-86]
AttrValue = StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue
VariableRefAttrValue: { kind, name, exprNode?, span } — Phase 3: exprNode populated by ast-builder
ExprAttrValue: { kind, raw, refs, exprNode?, span } — Phase 3: exprNode populated by ast-builder
AttrNode: { name, value:AttrValue, span }
TypedAttrDecl: { name, typeExpr, optional, defaultValue, span }

### CSS Types  [compiler/src/types/ast.ts:120-154]
CSSReactiveRef: { name, expr }
CSSDeclaration: { prop, value, span, reactiveRefs?, isExpression? }
CSSRule = CSSPropertyRule | CSSSelectorRule
ErrorArm: { pattern, binding, handler, handlerExpr?, span } — Phase 3: handlerExpr on non-block arms
LiftTarget = { kind:"markup", node } | { kind:"expr", expr, exprNode? }

### AST Nodes (42+ kinds)  [compiler/src/types/ast.ts:200-903]
Discriminated by `kind` string literal. BaseNode provides { id, span }.
Key nodes: MarkupNode, TextNode, CommentNode, StateNode, StateConstructorDefNode, LogicNode, SQLNode, CSSInlineNode, StyleNode, ErrorEffectNode, MetaNode
Declarations: LetDeclNode, ConstDeclNode, TildeDeclNode, LinDeclNode, ReactiveDeclNode, ReactiveDerivedDeclNode, ReactiveDebouncedDeclNode
Reactive ops: ReactiveNestedAssignNode, ReactiveArrayMutationNode, ReactiveExplicitSetNode
Functions: FunctionDeclNode { ..., fnKind:"function"|"fn", isServer, canFail, errorType?, route? }
Control flow: IfStmtNode, IfExprNode, ForStmtNode (cStyleParts?), WhileStmtNode, ReturnStmtNode, ThrowStmtNode, SwitchStmtNode, TryStmtNode, MatchStmtNode
Expressions: BareExprNode, LiftExprNode, FailExprNode, PropagateExprNode, GuardedExprNode
Module: ImportDeclNode, UseDeclNode, ExportDeclNode, TypeDeclNode
Effects: TransactionBlockNode, CleanupRegistrationNode, WhenEffectNode (bodyExpr?), WhenMessageNode (bodyExpr?), UploadCallNode (fileExpr?, urlExpr?), DebounceCallNode, ThrottleCallNode

### ExprNode Types (19 kinds)  [compiler/src/types/ast.ts:999-1356]
ExprNode = IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr | AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr | CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr

IdentExpr: { kind:"ident", name, span } — @name for reactive, "~" for pipeline
LitExpr: { kind:"lit", raw, value, litType, span } — litType includes "not" (section 42 absence)
BinaryExpr: { kind:"binary", op, left, right, span } — scrml ops: "is","is-not","is-some","is-not-not"
AssignExpr: { kind:"assign", op, target, value, span } — reactive assign: @var = expr
LambdaExpr: { kind:"lambda", params, body, isAsync, fnStyle, span } — body is expr|block
MatchExpr: { kind:"match-expr", subject, rawArms, span } — arms still raw strings (Phase 2 target)
EscapeHatchExpr: { kind:"escape-hatch", estreeType, raw, span } — fallback for unparseable constructs

### Discriminated Unions  [compiler/src/types/ast.ts:842-909]
LogicStatement: union of 42+ statement node kinds + block-level nodes (MarkupNode, SQLNode, CSSInlineNode, MetaNode, ErrorEffectNode)
ASTNode: union of all top-level kinds

### File-Level Types  [compiler/src/types/ast.ts:949-997]
FileAST: { filePath, nodes, imports, exports, components, typeDecls, spans, hasProgramRoot, authConfig, middlewareConfig }
TABOutput: { filePath, ast:FileAST, errors:TABErrorInfo[] }
AuthConfig: { auth, loginRedirect, csrf, sessionExpiry }
MiddlewareConfig: { cors, log, csrf, ratelimit, headers }

### Codegen Types  [compiler/src/codegen/context.ts, emit-expr.ts, emit-event-wiring.ts, index.ts]
CompileContext: { filePath, fileAST, routeMap, depGraph, protectedFields, authMiddleware, middlewareConfig, csrfEnabled, encodingCtx, mode, testMode, dbVar, workerNames, errors, registry, derivedNames, analysis, usedRuntimeChunks }
EmitExprContext: { mode:"client"|"server", derivedNames?, tildeVar?, dbVar?, errors? }
CgInput: { files, routeMap?, depGraph?, protectAnalysis?, sourceMap?, embedRuntime?, mode?, testMode?, encoding? }
EventBinding: { placeholderId, eventName, handlerName, handlerArgs?, handlerExpr?, handlerExprNode? }
LogicBinding: { placeholderId, expr, reactiveRefs?, isConditionalDisplay?, varName?, condExpr?, condExprNode?, exprNode? }
CGError: { code, message, span, severity }
RewriteContext: { errors?, derivedNames?, dbVar? }

### Expression Parser Types  [compiler/src/expression-parser.ts:33-49]
ESNode: { type:string, [key]:unknown } — minimal ESTree node
ParseResult: { ast:ESNode|null, error:string|null }
RewriteResult: { result:string, ok:boolean }

## Tags
#scrmlTS #map #schema #ast #ExprNode #types #codegen

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
