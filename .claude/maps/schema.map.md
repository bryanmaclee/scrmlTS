# schema.map.md
# project: scrmlts
# updated: 2026-05-14T00:37:04-06:00  commit: ff9be0e

## TypeScript AST — `compiler/src/types/ast.ts` (~1,858 LOC)

Single source of truth for all AST node shapes. All nodes carry `id: number` and `span: Span`.

### Span  [ast.ts:19]
file: string, start: number, end: number, line: number, col: number

### AttrValue (union)  [ast.ts:40]
StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue

### AttrNode  [ast.ts:95]
name: string, value: AttrValue, span: Span

### TypedAttrDecl  [ast.ts:106]
name: string, typeExpr: string, optional: boolean, defaultValue: string | null, span: Span

### CSS Types  [ast.ts:120-156]
CSSReactiveRef: { name: string, expr: string | null }
CSSDeclaration: { prop, value, span, reactiveRefs?, isExpression? }
CSSRule = CSSPropertyRule | CSSSelectorRule

### ErrorArm  [ast.ts:163]
pattern: string, binding: string, handler: string, handlerExpr?: ExprNode, span: Span

### SQLChainedCall  [ast.ts:180]
method: string, args: string

### LiftTarget (union)  [ast.ts:193]
{ kind: "markup", node: ASTNode } | { kind: "expr", expr: string, exprNode?: ExprNode }

### MarkupNode  [ast.ts:212]
kind: "markup", tag: string, attrs: AttrNode[], children: ASTNode[], selfClosing: boolean,
closerForm: string, isComponent: boolean,
resolvedKind?: 'html-builtin'|'scrml-lifecycle'|'user-state-type'|'user-component'|'unknown',
resolvedCategory?: 'html'|'channel'|'engine'|'timer'|'poll'|'db'|'schema'|'request'|'errorBoundary'|'machine'|'user-component'|'user-state-type'|'unknown',
auth?: string, loginRedirect?: string, csrf?: string, sessionExpiry?: string

### ChannelDeclNode  [ast.ts:1152]
tag: "channel"  (always)
isExport?: boolean
_p3aInlinedFrom?: string
_p3aSourceSpan?: Span

### ASTNode (discriminated union)  [ast.ts:1312]
MarkupNode | TextNode | CommentNode | StateNode | StateConstructorDefNode | LogicNode |
SQLNode | CSSInlineNode | StyleNode | ErrorEffectNode | MetaNode | LogicStatement

### FileAST  [ast.ts:1392]
filePath: string, nodes: ASTNode[], imports, exports, components, typeDecls,
channelDecls?: ChannelDeclNode[], spans: Record<number, Span>, hasProgramRoot: boolean,
authConfig: AuthConfig | null, middlewareConfig: MiddlewareConfig | null

### TABOutput  [ast.ts:1424]
filePath, ast: FileAST, errors: TABErrorInfo[]

### TABErrorInfo  [ast.ts:1434]
code: string, message: string, tabSpan: Span, severity?: "error" | "warning"

### AuthConfig  [ast.ts:1337]
auth: string, loginRedirect: string

### MiddlewareConfig  [ast.ts:~1345]
cors, log, ratelimit, headers, idempotencyStore?, idempotencyTTL?, batchInListCap?, corsMaxAge?, channelReconnect?

### Logic statements, control flow, declarations
LetDeclNode, ConstDeclNode, TildeDeclNode, LinDeclNode, ReactiveDeclNode, FunctionDeclNode,
EngineDeclNode, IfStmtNode, IfExprNode, ForExprNode, ForStmtNode, WhileStmtNode,
ReturnStmtNode, ThrowStmtNode, SwitchStmtNode, TryStmtNode, MatchStmtNode, WhenEffectNode
(30+ named node kinds — see `export type ASTNode` for full union)

### ExprNode (union)  [ast.ts:1838]
IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr |
AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr |
CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr

## AuthGraph Types — `compiler/src/types/auth-graph.ts` (NEW S90 A-3, ~354 LOC)

### MarkupNodeId
type alias: number — stable AST node id for gate-bearing MarkupNodes

### AuthSiteKind  [auth-graph.ts:83]
"program-auth" | "page-auth" | "auth-role-block" | "channel-auth"

### RoleClassification  [auth-graph.ts:107]
| { closed_form: true;  gated_for_role: Set<RoleVariant> }
| { closed_form: false; gate_expr: ExprNode | null }

### AuthGate  [auth-graph.ts:127]
siteKind: AuthSiteKind, nodeId: MarkupNodeId, filePath: string, span: Span,
role: string | null, gateExpr: ExprNode | null, check: string | null,
redirect: string | null, classification: RoleClassification | null, rawPredicate: string

### RoleEnum  [auth-graph.ts:209]
name: string, variants: RoleVariant[], span: Span, filePath: string, isImplicitAnonymous: boolean

### AuthGraphDiagnostic  [auth-graph.ts:272]
code: "E-AUTH-GRAPH-001" | "E-AUTH-GRAPH-002" | "E-AUTH-GRAPH-003" | "E-AUTH-GRAPH-004" |
      "I-AUTH-REDIRECT-UNRESOLVED" | "W-AUTH-PAGE-INFERRED"
severity: "error" | "warning" | "info"
message: string, span: Span, filePath: string

### AuthGraph  [auth-graph.ts:305]
gates: Map<MarkupNodeId, AuthGate>, roleEnum: RoleEnum | null,
gateToEntryPoint: Map<MarkupNodeId, EntryPointId>, redirectTargets: Map<MarkupNodeId, string | null>,
errors: AuthGraphDiagnostic[]

### AuthGraphOutput  [auth-graph.ts:389]
graph: AuthGraph, errors: AuthGraphDiagnostic[]

## Reachability Solver Types — `compiler/src/types/reachability.ts` (S89 A-2.1, 360 LOC)

### ReachabilityRecord  [reachability.ts:98]
closures: Map<EntryPointId, RolePlayableSurface>, diagnostics: ReachabilityDiagnostic[]

### RolePlayableSurface  [reachability.ts:111]
byRole: Map<RoleVariant, ChunkPlan>

### ChunkPlan  [reachability.ts:123]
initialChunk: ChunkContents, prefetchTier1: ChunkContents, prefetchTier2: ChunkContents, prefetchTierN: ChunkContents[]

### ChunkContents  [reachability.ts:145]
componentNodeIds: Set<NodeId>, reactiveCellNodeIds: Set<NodeId>, serverFnNodeIds: Set<NodeId>, vendorUnitNames: Set<VendorUnitId>

### ReachabilityDiagnostic  [reachability.ts:177]
code: "E-CLOSURE-001" | "E-CLOSURE-002" | "W-AUTH-RUNTIME-FALLBACK"
severity: "error" | "info"

### RSError  [reachability.ts:329]
code: "E-CLOSURE-001" | "E-CLOSURE-002" | "W-AUTH-RUNTIME-FALLBACK"
severity: "error" | "warning" | "info"

### RSInput  [reachability.ts:271]
depGraph, routeMap?, authGraph?: AuthGraph | null, serverFnBoundary?, vendorUnitDeclarations?, roleEnum?, batchPlan?, files?

### RSOutput  [reachability.ts:309]
record: ReachabilityRecord, errors: RSError[]

### ReachabilityEntryPoint  [reachability.ts:199]
id: EntryPointId, filePath: string, routePath: string | null, shape: "page" | "spa-program", rootNodeId: NodeId

### RoleClassificationEntry  [reachability.ts:244]
gateNodeId: NodeId, role: RoleVariant, classification: "in" | "out" | "runtime-fallback", predicateSource?: string

## Reachability Component Types — `compiler/src/reachability/`

### ReactiveDepClosure  [component-2.ts:146]
Map<EntryPointId, Set<RSNodeId>> — output of computeReactiveDepClosure()

### ServerFnReachable  [component-3.ts:160]
serverFnIds: Set<NodeId>, calleeNodeIds: Set<NodeId>
ServerFnReachableByEntryPoint = Map<EntryPointId, ServerFnReachable>

### GateVisibility  [component-4.ts:114]
"in" | "out" | "runtime-fallback"
GateVisibilityIndex = Map<[MarkupNodeId, RoleVariant], GateVisibility>

### Component4Result  [component-4.ts:156]
byRole: Map<RoleVariant, Map<NodeId, Set<NodeId>>>, errors: RSError[], gateVisibilityIndex: GateVisibilityIndex

### VendorUnitsUsed  [component-5.ts:113]
Map<EntryPointId, Set<VendorUnitId>>

## Wire Format Types — `compiler/src/codegen/wire-format.ts` (NEW S90, 228 LOC)

Exports (not interface types — constants + function):
- `returnTypeAllowsAbsence(annot: string | undefined | null): boolean`
- `SERVER_WIRE_ENCODER_HELPER: string` — inline JS encoder helper (emitted at top of .server.js)
- `CLIENT_WIRE_DECODER_HELPER: string` — inline JS dual-decoder helper (emitted in client core chunk)

Wire envelope shape (canonical, SPEC §57): `{"__scrml_absent": true}`

## Codegen IR — `compiler/src/codegen/ir.ts`

### HtmlIR  parts: string[]
### CssIR   userCss: string, tailwindCss: string
### ServerIR  lines: string[]
### ClientIR  lines: string[]
### FileIR   filePath: string, html: HtmlIR, css: CssIR, server: ServerIR, client: ClientIR
### TestIR-family  AssertStmt, TestCase, TestBindDecl, TestGroup, TestIR

## Codegen Key Interfaces — `compiler/src/codegen/*.ts`

### CompileContext  [context.ts:23]
filePath, fileAST, routeMap, depGraph, protectedFields: Set<string>, authMiddleware, middlewareConfig,
csrfEnabled: boolean, encodingCtx: EncodingContext | null, mode: "browser"|"library", testMode: boolean,
dbVar: string, workerNames: string[], errors: CGError[], registry: BindingRegistry,
derivedNames: Set<string>, analysis: FileAnalysis | null, usedRuntimeChunks: Set<string>,
exportRegistry?: Map<string, Map<string, { kind, category, isComponent }>> | null

### CGError  [errors.ts:11]
code: string, message: string, span: CGSpan | object, severity: 'error' | 'warning'

Note: CGError.severity does NOT include "info" — info-level diagnostics go through separate channels (RSError, AuthGraphDiagnostic). "info" severity lives only in types/auth-graph.ts and types/reachability.ts.

## scrml:host Runtime Types — `compiler/runtime/stdlib/host.js`

### HostError
Variant constructor: `HostError.Thrown(message, name) → { variant: "Thrown", data: { message, name } }`
### safeCall(thunk) → value | scrml-error-shape
### safeCallAsync(thunk) → Promise<value | scrml-error-shape>

## Tags
#scrmlts #map #schema #ast #types #codegen #ir #s90 #auth-graph #wire-format #reachability #approach-a2 #approach-a3

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
