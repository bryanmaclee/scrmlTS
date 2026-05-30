# schema.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

Authoritative AST type source: `compiler/src/types/ast.ts` (1983 lines, TypeScript).
IR types: `compiler/src/codegen/ir.ts` (253 lines).
Type-system internals: `compiler/src/type-system.ts` (15994 lines — internal interfaces, not exported).

---

## Core AST Node Types  [compiler/src/types/ast.ts]

### Span
start: number; end: number; line?: number; col?: number; file?: string

### AttrValue (union)
StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue

### AttrNode
name: string; value: AttrValue; span: Span

### BaseNode (base interface for all AST nodes)
kind: string; span: Span; id?: number

### MarkupNode extends BaseNode
kind: "markup"; tag: string; attrs: AttrNode[]; children: ASTNode[]; closerForm: string; angleDepth: number; ... +8 more fields

### TextNode extends BaseNode
kind: "text"; value: string

### StateNode extends BaseNode
kind: "state"; statetype: string; attrs: AttrNode[]; children: ASTNode[]

### StateConstructorDefNode extends BaseNode
kind: "state-def"; name: string; attrs: TypedAttrDecl[]; body: ASTNode[]

### LogicNode extends BaseNode
kind: "logic"; body: LogicStatement[]; exports: ExportDeclNode[]; ... +3 more fields

### SQLNode extends BaseNode
kind: "sql"; query: string; params: ExprNode[]; chain: SQLChainedCall[]; ... +5 more fields

### LetDeclNode extends BaseNode
kind: "let-decl"; name: string; typeAnnotation?: string; init?: ExprNode; isOptional: boolean

### ConstDeclNode extends BaseNode
kind: "const-decl"; name: string; typeAnnotation?: string; init: ExprNode

### TildeDeclNode extends BaseNode
kind: "tilde-decl"; name: string; init?: ExprNode

### LinDeclNode extends BaseNode
kind: "lin-decl"; name: string; typeAnnotation?: string; init: ExprNode

### ReactiveDeclNode extends BaseNode
kind: "reactive-decl"; name: string; typeAnnotation?: string; init?: ExprNode; renderSpec?: RenderSpecNode; ... +12 more fields

### FunctionDeclNode extends BaseNode
kind: "function-decl"; name: string; params: FunctionParam[]; returnType?: string; body: LogicStatement[]; modifier: "fn"|"server"|"pure"|"function"|null; errorType?: string; ... +5 more fields

### ComponentDefNode extends BaseNode
kind: "component-def"; name: string; props: TypedAttrDecl[]; body: ASTNode[]

### EngineDeclNode extends BaseNode
kind: "engine-decl"; name: string; stateChildren: ASTNode[]; initial?: string; derived?: ExprNode; ... +8 more fields

### TypeDeclNode extends BaseNode
kind: "type-decl"; name: string; typeKind: "struct"|"enum"|"alias"; body: string

### ChannelDeclNode extends MarkupNode
kind: "markup"; tag: "channel"; name: string; isExported: boolean; ... extends MarkupNode

### ImportDeclNode extends BaseNode
kind: "import-decl"; specifiers: ImportSpecifier[]; source: string; importKind: "value"|"type"|"side-effect"

### ExportDeclNode extends BaseNode
kind: "export-decl"; raw: string; exportedName: string|null; exportKind: string|null; reExportSource: string|null; isPure?: boolean; isServer?: boolean

### FileAST
filePath: string; nodes: ASTNode[]; imports: ImportDeclNode[]; exports: ExportDeclNode[]; components: ComponentDefNode[]; typeDecls: TypeDeclNode[]; channelDecls: ChannelDeclNode[]; ... +8 more fields

### AuthConfig  [compiler/src/types/ast.ts:1458]
roles: string[]; loginPage?: string; defaultRole?: string

### MiddlewareConfig  [compiler/src/types/ast.ts:1470]
name: string; path: string; exports: string[]

---

## Expression Node Types  [compiler/src/types/ast.ts:1577+]

### ExprNode (union)
IdentExpr | LitExpr | ArrayExpr | ObjectExpr | UnaryExpr | BinaryExpr | AssignExpr | TernaryExpr |
MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr | CastExpr | MatchExpr | SqlRefExpr |
InputStateRefExpr | EscapeHatchExpr | ResetExpr | HtmlFragmentNode | LiftExprNode | FailExprNode |
PropagateExprNode | GuardedExprNode

Key expression shapes:
- PropagateExprNode: kind: "propagate-expr"; inner: ExprNode  (the `?` operator)
- GuardedExprNode: kind: "guarded-expr"; body: LogicStatement[]  (`!{}` form)
- FailExprNode: kind: "fail-expr"; enumType: string; variant: string; data?: ExprNode

---

## IR Types  [compiler/src/codegen/ir.ts]

### HtmlIR
head: string[]; body: string[]; scripts: string[]; styles: string[]

### ServerIR
functions: string[]; exports: string[]; middleware: string[]

### ClientIR
init: string[]; effects: string[]; handlers: string[]; runtime: string[]

### FileIR
filePath: string; html: HtmlIR; server: ServerIR; client: ClientIR; css: CssIR; errors: CGError[]

### TestIR  [compiler/src/codegen/ir.ts:244]
cases: TestCase[]; binds: TestBindDecl[]

### TestBindDecl  [compiler/src/codegen/ir.ts:171]
name: string; serverFnName: string; span: Span

---

## CGError  [compiler/src/codegen/errors.ts]

code: string; message: string; span: CGSpan | object; severity: 'error' | 'warning' | 'info'

W-/I- prefix + severity:warning/info → result.warnings (non-fatal).
Everything else → result.errors (CLI exits 1).

---

## Type-System Internal Types  [compiler/src/type-system.ts — selected]

ResolvedType (union): PrimitiveType | StructType | EnumType | ArrayType | UnionType | AsIsType |
  UnknownType | NotType | SnippetType | StateType | ErrorType | HtmlElementType |
  CssClassType | FunctionType | MetaSpliceType | RefBindingType | PredicatedType | MachineType

MachineType: states: Map<string, VariantDef>; initial: string; derived?: ResolvedType; ... +5 more fields

LinState: "unconsumed" | "consumed"
TildeState: "uninitialized" | "initialized"

## Tags
#scrmlts #map #schema #ast #types #compiler #ir

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [error.map.md](./error.map.md)
