# schema.map.md
# project: scrmlts
# updated: 2026-05-20T17:07:32-06:00  commit: 87453fb

This is a compiler. There is no database schema or external API schema.
The "schemas" below are the compiler's internal data structures: the AST node
union, the codegen IR, the symbol table, the auth-graph / reachability types,
and (NEW) the native-parser's Expr AST + engine catalog.
scrml *source files* (`.scrml`) declare their own data via `<schema>` blocks,
struct/enum `<Type>` declarations, and `schemaFor()` — that is runtime DDL the
compiler emits, not a schema of this codebase.

## AST Node Types — live pipeline  [compiler/src/types/ast.ts — 1927 lines]

Discriminated union; every node has `kind` (string literal), `id`, `span`.
`ASTNode` (line 1381) is the top-level union; `LogicStatement` (1332) the
statement sub-union. UNCHANGED since commit 78faa65.

### Source Location
Span [ast.ts:21] — file, start, end (byte offsets), line, col

### Attribute values — `AttrValue` union [ast.ts:42]
StringLiteralAttrValue [50] · VariableRefAttrValue [56] · CallRefAttrValue [64]
ExprAttrValue [73] · PropsBlockAttrValue [82] · AbsentAttrValue [88]
AttrNode [97] · TypedAttrDecl [108]

### CSS nodes
CSSReactiveRef [125] · CSSDeclaration [133] · CSSRule [144] (= CSSPropertyRule [146] | CSSSelectorRule [154])

### Block / markup nodes
MarkupNode [214] · TextNode [249] · CommentNode [256] · StateNode [265]
StateConstructorDefNode [279] · LogicNode [294] · SQLNode [311]
CSSInlineNode [330] · StyleNode [339] · ErrorEffectNode [350] · MetaNode [359]
HtmlFragmentNode [1080]

### Declarations
LetDeclNode [421] · ConstDeclNode [436] · TildeDeclNode [454] · LinDeclNode [466]
ReactiveDeclNode [477] · FunctionDeclNode [765] · ComponentDefNode [830]
EngineDeclNode [852] · ImportDeclNode [1158] · UseDeclNode [1176]
ExportDeclNode [1190] · TypeDeclNode [1209] · ChannelDeclNode [1237]

### Reactive / render
RenderSpecNode [704] · ReactiveNestedAssignNode [731] · ReactiveArrayMutationNode [745]
ReactiveExplicitSetNode [756]

### Statements & expressions
IfStmtNode [913] · IfExprNode [924] · ForExprNode [935] · MatchExprNode [946]
ForStmtNode [955] · WhileStmtNode [973] · ReturnStmtNode [982] · ThrowStmtNode [989]
SwitchStmtNode [996] · TryStmtNode [1005] · MatchStmtNode [1024] · MatchArmInlineNode [1042]
BareExprNode [1060] · LiftExprNode [1090] · FailExprNode [1100] · PropagateExprNode [1114]
GuardedExprNode [1126]

### Validators / predicates
RelationalPredicateNode [620] · ValidatorEntry [653] · ValidatorArg [693] (= ExprNode | RelationalPredicateNode)

### Destructuring
DestructureArrayElement [376] · DestructureObjectProperty [382]
DestructureArrayPattern [400] · DestructureObjectPattern [408] · DestructurePattern [416]

### Misc
ImportSpecifier [1146] · TransactionBlockNode [1256] · CleanupRegistrationNode [1265]
WhenEffectNode [1277] · WhenMessageNode [1291] · UploadCallNode [1302]
ErrorArm [165] · SQLChainedCall [182] · LiftTarget [195]

## Native-Parser Expr AST  [compiler/native-parser/ast-expr.{scrml,js}]

NEW since 78faa65. The expression-AST catalog the scrml-native parser (M2)
produces. SEPARATE from the live ast.ts union above — consumed only by
native-parser tests, not the pipeline.

### ExprKind  [ast-expr.js:5 — Object.freeze enum, 28 variants]
Primary literals:   Ident · NumberLit · StringLit · BoolLit · RegexLit · TemplateLit
scrml extensions:   AtCell · BareVariant
Keyword atoms:      This · Super
Composite:          Array · Object · Paren
Operators (M2.2):   Unary · Update · Binary · Logical · Assignment · Conditional · Sequence
Call/member (M2.3): Call · New · Member · TaggedTemplate · Arrow · Function
Pattern/body-stub:  RestElement · AssignmentPattern · BlockStub

### Sub-kind enums
ArrayElementKind   [ast-expr.js:51] = Item · Spread · Hole
ObjectPropertyKind [ast-expr.js:57] = KeyValue · Shorthand · Spread · Method

### Node constructors  [ast-expr.js:66-220 — 35 `make*` pure constructors]
makeIdent · makeNumberLit · makeStringLit · makeBoolLit · makeRegexLit
makeTemplateLit · makeTemplateQuasi · makeAtCell · makeBareVariant · makeThis
makeSuper · makeArray · makeObject · makeParen · makeArrayItem · makeArraySpread
makeArrayHole · makeObjectKeyValue · makeObjectShorthand · makeObjectSpread
makeObjectMethod · makeUnary · makeUpdate · makeBinary · makeLogical
makeAssignment · makeConditional · makeSequence · makeCall · makeNew · makeMember
makeArrow · makeFunction · makeTaggedTemplate · makeRestElement
makeAssignmentPattern · makeBlockStub  ·  isExpr (predicate)

## Native-Parser Token catalog  [compiler/native-parser/token.{scrml,js}]

TokenKind     [token.js:5]   — Object.freeze enum, nested-by-category; all JS-subset
                               token kinds (keywords, idents, numerics, punctuation,
                               operators) + scrml extensions + (M1.2) TemplateInterpStart
                               / TemplateInterpEnd + RegexLit token
QuoteKind     [token.js:125] — Single · Double · Backtick
JS_KEYWORDS   [token.js:131] — keyword-string → TokenKind lookup table
Constructors: makeToken · makeIdentOrKeyword · makeEof
Span          [span.js]      — { start, end, line, col } struct; pure-data construction

## Native-Parser Engine declarations (state-shape, Pillar 5b)

All declared as `<engine>` in the `.scrml` canonical; the `.js` shadow carries
the live JS-host mirror. See domain.map.md for the composed-engines architecture.

LexMode      [lex-mode.scrml:112]   — JS-lexer context engine; initial `.InCode`;
  7 state-children: InCode · InTemplateBody · InSingleString · InDoubleString ·
  InLineComment · InBlockComment · InRegexBody. `.InTemplateBody` is a COMPOSITE
  state-child nesting `<engine for=LexMode var=innerLexMode>` (§51.0.Q.1).
BracketStack [bracket-stack.scrml]  — bracket-depth + opener-frame engine; variants
  `.Balanced` / `.OpenAt(depth, opener, span)`; live frame stack in the `.js` shadow.
ErrorRecovery[error-recovery.scrml] — parse-error recovery engine; 3 state-children:
  ParsingNormally · AccumulatingSkipped · ReSynchronized; full rule= matrix.
ParseMode    [parse-mode.scrml:92]  — JS expression/statement context engine; initial
  `.TopLevel`; 7 state-children: TopLevel · InExpression · InArrayLiteral ·
  InObjectLiteral · InFunctionBody · InClassBody · InArguments. `.InObjectLiteral`
  is COMPOSITE (nests an inner `<engine for=ParseMode var=innerParseMode>`).
BlockContext [block-context.scrml:155] — MARKUP-LAYER context-grid engine; initial
  `.TopLevel`; 10 state-children: TopLevel · InMarkupTag · InLogicEscape · InCss ·
  InSql · InErrorEffect · InMeta · InTest · InForeignCode. `.InMarkupTag` nests a
  BodyMode engine; `.InLogicEscape` nests the LexMode engine graph (markup→JS seam).
BodyMode     (nested, declared inside block-context.scrml) — markup-tag body mode;
  `.FreeText` / `.CodeDefault` (§4.18; substantive body is MK3's job).

## Native-Parser parse-context object  [compiler/native-parser/parse-ctx.{scrml,js}]

`makeParseContext()` [parse-ctx.js:20] — the shared seam substrate; EXTENDS M1's
`makeLexContext` (adds an AST node sink + a delegation-frame stack).
Helpers: appendNode · nodeCount · appendBlock · makeBlockNode · makeDelegationFrame
· pushDelegationFrame · popDelegationFrame · topDelegationFrame · delegationDepth
· inDelegation. Close-condition constructors: closeOnBraceDepth ·
closeOnTagFrameBalanced · closeOnAttrTerminator · closeOnShorthandEol.

## Codegen IR  [compiler/src/codegen/ir.ts — 253 lines]

### FileIR [ir.ts:43] — top-level IR for one compiled .scrml file
filePath: string
html: HtmlIR     — { parts: string[] }            [ir.ts:22]
css: CssIR       — { userCss: string, tailwindCss: string }  [ir.ts:27]
server: ServerIR — { lines: string[] }            [ir.ts:33]
client: ClientIR — { lines: string[] }            [ir.ts:38]

### Test IR (emitted for inline `scrml:test`)
AssertStmt [132] · TestCase [148] · TestBindDecl [171] · TestGroup [214] · TestIR [244]

## Symbol Table  [compiler/src/symbol-table.ts]

ImportBindingRecord [166]
ScopeKind [204] = "file" | "function" | "engine" | "component" | "compound" | "field"
CellKind [225] = "plain" | "bindable" | "markup-typed" | "compound-parent" | "engine"
EngineMetadata [252] · EngineRuleForm [343] · PayloadBinding [369]
OnTimeoutEntry [384] · OnIdleEntry [421] · NestedEngineEntry [443] · OnTransitionEntry [465]
EngineStateChildEntry [498] · StateCellRecord [595]
SynthProperty [692] = "isValid" | "errors" | "touched" | "submitted"
Scope [741] · SYMResult [771] · SYMDiagnostic [781] · SYMStats [791] · SYMInput [804]

## AuthGraph types  [compiler/src/types/auth-graph.ts — 405 lines]
MarkupNodeId [49] · EntryPointId [56] · RoleVariant [67]
AuthSiteKind [83] · RoleClassification [107]
AuthGate [127] · RoleEnum [209] · AuthGraphDiagnostic [284]
AuthGraph [318] · AuthGraphOutput [402]

## Reachability types  [compiler/src/types/reachability.ts — 373 lines]
NodeId [61] · EntryPointId [70] · RoleVariant [79] · VendorUnitId [85]
ReachabilityRecord [98] · RolePlayableSurface [111] · ChunkPlan [123] · ChunkContents [145]
ReachabilityDiagnostic [177] · ReachabilityEntryPoint [199] · PlayableSurface [222]
RoleClassificationEntry [244]
RSInput [271] · RSOutput [323] · RSError [343]

## Tags
#scrmlts #map #schema #ast #ir #compiler #types #native-parser #expr-ast

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
- [structure.map.md](./structure.map.md)
