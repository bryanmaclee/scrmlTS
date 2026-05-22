# schema.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

Authoritative AST type catalog: `compiler/src/types/ast.ts`. This is the contract
the M5 native-parser swap must satisfy — native-parser output must be coercible to
`FileAST` / `TABOutput` for the api.js TAB seam. As of C1/C2 (S119), `nativeParseFile`
(compiler/native-parser/parse-file.js) IS that coercion — it assembles the live
`FileAST` directly and is routed at the TAB seam behind `--parser=scrml-native`.

## Pipeline I/O Types

### TABOutput  [compiler/src/types/ast.ts:1520]
filePath: string
ast: FileAST
errors: TABErrorInfo[]

### FileAST  [compiler/src/types/ast.ts:1487] — top-level output of TAB stage
filePath: string
nodes: ASTNode[]                — top-level AST nodes
imports: ImportDeclNode[]       — hoisted from logic blocks
exports: ExportDeclNode[]       — hoisted from logic blocks
components: ComponentDefNode[]  — hoisted component definitions
typeDecls: TypeDeclNode[]       — hoisted type declarations
channelDecls?: ChannelDeclNode[] — hoisted `<channel>` markup decls
spans: Record<number, Span>     — nodeId → Span table
hasProgramRoot: boolean
authConfig: AuthConfig | null   — (populated by PRECG stage, computeProgramConfig)
middlewareConfig: MiddlewareConfig | null — (populated by PRECG stage)
hasResetExpr / hasEqualityExpr / hasChunkedMarkupTag / hasForStmt: boolean
  — 4 PGO flags; set by api.js Stage 3.004 (computePGOFlags), NOT by ast.ts shape.

### AuthConfig  [ast.ts:1432]
auth: string | loginRedirect: string | csrf: string | sessionExpiry: string

### MiddlewareConfig  [ast.ts:1444]
cors / log / ratelimit / headers: string|null
idempotencyStore / idempotencyTTL / batchInListCap / corsMaxAge / channelReconnect: string|null

## Core AST Unions

### ASTNode  [ast.ts:1407] — top-level / markup-child node union
markup | text | comment | state | state-constructor-def | logic | sql |
css-inline | style | error-effect | meta | LogicStatement

### LogicStatement  [ast.ts:1358] — ~40-kind sub-union inside logic bodies
let-decl | const-decl | tilde-decl | lin-decl | reactive-decl | reactive-debounced-decl |
reactive-nested-assign | reactive-array-mutation | reactive-explicit-set |
function-decl | component-def | if-stmt | if-expr | for-expr | match-expr | for-stmt |
while-stmt | return-stmt | throw-stmt | switch-stmt | try-stmt | match-stmt |
match-arm-inline | bare-expr | lift-expr | fail-expr | propagate-expr | guarded-expr |
import-decl | use-decl | export-decl | type-decl | transaction-block |
cleanup-registration | when-effect | when-message | upload-call |
+ block-ref nodes: markup | sql | css-inline | meta | error-effect

## Node Interfaces (selected — see ast.ts for full field lists)

### Span  [ast.ts:21]
start / end / line / col: number; file?: string

### MarkupNode  [ast.ts:214] extends BaseNode
tag, attrs: AttrNode[], tokenizedAttrs, children, tagOpenerSpan, tagCloserSpan, …

### AttrValue  [ast.ts:42] — 6-variant union
StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue |
ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue

### Declaration nodes
LetDeclNode [447] | ConstDeclNode [462] | TildeDeclNode [480] | LinDeclNode [492] |
ReactiveDeclNode [503] | FunctionDeclNode [791] | ComponentDefNode [856] |
EngineDeclNode [878] | TypeDeclNode [1235] | ImportDeclNode [1184] |
ExportDeclNode [1216] | UseDeclNode [1202] | ChannelDeclNode [1263]

### Statement / expression-stmt nodes
IfStmtNode [939] | ForStmtNode [981] | WhileStmtNode [999] | ReturnStmtNode [1008] |
ThrowStmtNode [1015] | SwitchStmtNode [1022] | TryStmtNode [1031] | MatchStmtNode [1050] |
BareExprNode [1086] | LiftExprNode [1116] | FailExprNode [1126] |
PropagateExprNode [1140] | GuardedExprNode [1152] | HtmlFragmentNode [1106]

### Other block nodes
StateNode [265] | StateConstructorDefNode [279] | LogicNode [294] | SQLNode [311] |
CSSInlineNode [330] | StyleNode [339] | ErrorEffectNode [350] | MetaNode [359] |
TransactionBlockNode [1282] | WhenEffectNode [1303] | WhenMessageNode [1317] |
UploadCallNode [1328]

## ExprNode union  [ast.ts:1939] — scrml's own expression AST (20 lowercase kinds)
IdentExpr [1569] | LitExpr [1591] | ArrayExpr [1614] | ObjectExpr [1621] |
SpreadExpr [1633] | UnaryExpr [1650] | BinaryExpr [1678] | AssignExpr [1700] |
TernaryExpr [1712] | MemberExpr [1730] | IndexExpr [1741] | CallExpr [1751] |
NewExpr [1761] | LambdaExpr [1789] | CastExpr [1817] | MatchExpr [1835] |
SqlRefExpr [1852] | InputStateRefExpr [1866] | EscapeHatchExpr [1880] | ResetExpr [1921]
Note: the LIVE pipeline's `parseExprToNode` decorates ExprAttrValue / BareExprNode
with Acorn ESTree nodes; downstream stages consume those ESTree nodes directly.

## Codegen I/O Types  [compiler/src/codegen/index.ts]
CgInput [106] — files, routeMap, depGraph, protectAnalysis, batchPlan,
  reachabilityRecord, exportRegistry, emitPerRoute, chunkSizeBudgetBytes, debugPerf, …
CgFileOutput [206] — sourceFile, serverJs, clientJs, libraryJs, html, css, testJs,
  machineTestJs, workerBundles, clientJsMap, serverJsMap
CgOutput [223] — outputs: Map<string,CgFileOutput>, errors, runtimeJs, runtimeFilename,
  chunks?, chunksManifest?

## Native-parser AST catalogs (compiler/native-parser/)

### Token  [token.js] — lexer output
TokenKind — Object.freeze enum; QuoteKind; JS_KEYWORDS frozen set.
Factories: makeToken, makeIdentOrKeyword, makeEof.

### Stmt catalog  [ast-stmt.js] — `Stmt[]` from parseProgram(tokens,source)
StmtKind — 20 frozen variants: Block, ExprStmt, Empty, VarDecl, If, While, DoWhile,
For, ForIn, ForOf, Return, Break, Continue, Labeled, FunctionDecl, ClassDecl, Import,
Export, Try, Throw, LinDecl (B4 — `lin`), TypeDecl (B5 — `type`), TildeDecl (B3 — `~name = pipeline`).
Sub-enums: VarDeclKind, ClassMemberKind, MethodKind, ImportSpecifierKind, BindingKind,
BindingPropertyKind, BindingElementKind. ~45 make* node factories.

### Expr catalog  [ast-expr.js] — native `Expr` from parseExpression
ExprKind — 40 frozen variants. Primary: Ident, NumberLit, StringLit, BoolLit, RegexLit,
TemplateLit, AtCell, BareVariant, This, Super, Array, Object, Paren. Operators: Unary,
Update, Binary, Logical, Assignment, Conditional, Sequence. Call/member/fn: Call, New,
Member, TaggedTemplate, Arrow, Function, RestElement, AssignmentPattern, BlockStub.
scrml-extension forms: NotValue (`not`), Tilde (`~`), Sql (`?{...}`), InputStateRef
(`<#id>`), IsCheck, Match (+ MatchArm/VariantPattern/WildcardPattern/IsPattern/
MatchBinding), Render, Lift, Fail, Propagate (`?` — B1), GuardedExpr (`!{}` — B2),
Yield, MarkupValue. Sub-enums: ArrayElementKind, ObjectPropertyKind, IsCheckOp,
MatchArmPatternKind. ~60 make* node factories.

### Block catalog  [parse-markup.js] — `Block[]` from parseMarkup(source)
Each Block is `{ kind, span, ...payload }`. BlockKinds: Markup (name, children, attrs,
closerForm, tagClass, tagKind), Text, Comment, Sql (query, chainedCalls), Css (rules),
Meta (body:Stmt[], parentContext), ErrorEffect (arms), LogicEscape (body:Stmt[]),
DisplayTextLiteral (literal — §4.18.4 segments/exprs carrier), Test (`_{}`),
ForeignCode (`^^{}`). `parseMarkupTrace(source)` returns the full run record
`{ ctx, contextTrace }`; `ctx.nodes` is the Block[], `ctx.diagnostics` the parse-error
stream (lazily-created — `undefined` on a clean parse).

## Native→live FileAST assembler (C1/C2 — landed and routed, S119)
parse-file.js `nativeParseFile(filePath, source)` → `{ filePath, ast: FileAST, errors }` —
the drop-in analogue of `buildAST`. Pipeline:
  1. PARSE — `parseMarkupTrace(source)` → Block[] + ctx.diagnostics (folded into errors).
  2. MAP — each Block → live ASTNode via `mapOneBlock` / 11 synth* builders. The
     BlockKind→ASTNode map: Markup→markup, Text→text, Comment→comment, Sql→sql,
     Css→css-inline, Meta→meta, ErrorEffect→error-effect, LogicEscape→logic.
     A Markup block recognized as a STATE block (`isStateBlock`) → `state` /
     `state-constructor-def`; recognized as an ENGINE block (`isEngineBlock`) →
     `engine-decl` (DIFF-engine-in-nodes parity — also appears in machineDecls).
     `DisplayTextLiteral` → `text` (D1 deferral — §4.18.6 escape pass deferred).
     `Test` / `ForeignCode` → DROPPED with `I-NATIVE-BLOCK-DROPPED` info diag (D2).
     An unrecognized kind → DROPPED with `I-NATIVE-BLOCK-UNMAPPED`.
  3. ASSEMBLE — `collectHoisted` folds the Block[] into the 7 hoisted file-level outputs.
  4. PRODUCE — the live `buildAST` literal; `authConfig`/`middlewareConfig` set to
     `null` (PRECG Stage 3.004 derives them downstream).
ONE shared `idGen` `{ next }` counter is threaded through every synthesizer +
`collectHoisted` + every `translateStmtList` call → globally-unique ids in the file.

### Bridge layer (S118 — landed)
translate-stmt.js  `translateStmtList(nativeBody, idGen)` — native Stmt[] →
  live LogicStatement[] (PascalCase ESTree → lowercase scrml kinds; N×M structural).
  `Throw`/`Try` are forbidden-vocabulary kinds it rejects.
translate-expr.js  `translateExpr(nativeExpr)` / `translateExprList(nativeExprs)` —
  native Expr (40 ExprKinds) → live ExprNode (20 kinds); kind-rename + fan-out/fan-in.
collect-hoisted.js `collectHoisted(blocks, idGen, source)` → { imports, exports,
  typeDecls, components, machineDecls, channelDecls, hasProgramRoot }. SYNTHESIZES
  live FileAST declaration node shapes; exports `isEngineBlock` + `synthEngineDecl`
  (a Markup block named "engine"/"machine" → a 14-field EngineDeclNode).

### State-block shaping  [parse-state-body.js — S119]
`shapeStateBlock(block)` — stamps `stateNodeKind`/`stateType`/`typedAttrs` onto a
  Markup block whose opener TagKind is StateOpener (§4.3 space-after-`<`).
`STATE_FORM_KEYWORDS` — frozen `["db","schema"]` — the no-space `<db>`/`<schema>`
  lifecycle-keyword set; the native analogue of the live builder's
  `_STATE_FORM_LIFECYCLE` name-set (engine/machine EXCLUDED — routed to engine-decl).
`isStateBlock(block)` — true iff Markup block with `tagKind==="StateOpener"` OR
  `name ∈ STATE_FORM_KEYWORDS`. Depth-agnostic.
TypedAttrDecl: `{ name, typeExpr, optional, defaultValue, span }` — `splitTypedAttr`
  peels `= default` + trailing `?`, mirroring live `parseTypedAttributes`.

### HTML void elements  [tag-frame.js — S119]
`VOID_ELEMENTS` — frozen set (area, base, br, col, embed, hr, img, input, link, meta,
  source, track, wbr); copied 1:1 from block-splitter.js L72.
`isVoidElementName(name)` — case-insensitive void-element predicate.

## Database Models
No application DB schema — scrml is a compiler. SQLite *.db files at repo root and
in examples/ are throwaway test fixtures. SQL schema in .scrml sources is the
user-program domain, not a compiler model.

## Tags
#scrmlts #map #schema #ast #fileast #native-parser #codegen #m5-swap #bridge

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
