# schema.map.md
# project: scrmlts
# updated: 2026-05-27T04:14:32Z  commit: f6c98ed8

Authoritative AST type catalog: `compiler/src/types/ast.ts`. The M5 native-parser swap
must produce output coercible to `FileAST` / `TABOutput`. As of C1/C2 (S119),
`nativeParseFile` (compiler/native-parser/parse-file.js) IS that coercion and is routed
at the TAB seam behind `--parser=scrml-native`. (Line anchors below re-derived at HEAD;
ast.ts grew with surrounding edits — anchors may drift ±15, re-grep for surgical work.)

## Pipeline I/O Types

### TABOutput  [compiler/src/types/ast.ts:1544]
```
filePath: string
ast: FileAST
errors: TABErrorInfo[]
```

### FileAST  [compiler/src/types/ast.ts:1513] — top-level output of TAB stage
```
filePath: string
nodes: ASTNode[]                — top-level AST nodes
imports: ImportDeclNode[]
exports: ExportDeclNode[]
components: ComponentDefNode[]
typeDecls: TypeDeclNode[]
channelDecls?: ChannelDeclNode[]
spans: Record<number, Span>     — nodeId → Span table
hasProgramRoot: boolean
authConfig: AuthConfig | null   — populated by PRECG stage
middlewareConfig: MiddlewareConfig | null
hasResetExpr / hasEqualityExpr / hasChunkedMarkupTag / hasForStmt: boolean  — PGO flags
```

### AuthConfig
`auth / loginRedirect / csrf / sessionExpiry: string`

### MiddlewareConfig
`cors / log / ratelimit / headers / idempotencyStore / idempotencyTTL / batchInListCap / corsMaxAge / channelReconnect: string | null`

## Core AST Unions

### ASTNode  [ast.ts:1433] — top-level / markup-child node union (12 members)
`MarkupNode | TextNode | CommentNode | StateNode | StateConstructorDefNode | LogicNode | SQLNode | CSSInlineNode | StyleNode | ErrorEffectNode | MetaNode | LogicStatement`
NB: the synthesized `match-block` and `each-block` nodes (below) are NOT members of this union — they are produced by ast-builder/parse-file and collected via generic child-array walking, not exhaustive-switch typing.

### LogicStatement  [ast.ts:1383] — ~40-kind sub-union inside logic bodies
`let-decl | const-decl | tilde-decl | lin-decl | reactive-decl | reactive-debounced-decl | reactive-nested-assign | reactive-array-mutation | reactive-explicit-set | reactive-assign (V-kill, S123) | function-decl | component-def | if-stmt | if-expr | for-expr | match-expr | for-stmt | while-stmt | return-stmt | throw-stmt | switch-stmt | try-stmt | match-stmt | match-arm-inline | bare-expr | lift-expr | fail-expr | propagate-expr | guarded-expr | import-decl | use-decl | export-decl | type-decl | transaction-block | cleanup-registration | when-effect | when-message | upload-call + block-ref nodes`

## Synthesized Block Nodes (NOT in the ASTNode union — walked generically)

### EachBlockNode  [synthesized by ast-builder.js:11204 — NEW S131] → consumed by emit-each.ts
```
kind: "each-block"
iterShape: "in" | "of" | null     — "in"=item-iteration, "of"=count-iteration
inExprRaw: string | null          — raw text after `in=` (null when shape "of")
ofExprRaw: string | null          — raw text after `of=` (null when shape "in")
asName: string | null             — bareword iteration-variable alias (optional)
keyExprRaw: string | null         — raw text after `key=` (null → inferred per §17.7.5)
bodyChildren: ASTNode[]           — full walkable AST mirror (includes <empty>)
templateChildren: ASTNode[]       — bodyChildren minus the <empty> sub-element (per-item template)
emptyChild: ASTNode | null        — the <empty> sub-element node, or null when absent
bodyRaw: string                   — raw body text fallback (mirrors match-block.armsRaw shape)
span: Span
openerHadSpaceAfterLt: boolean
```
`emit-each.ts` defines a local `EachBlockAstNode` interface (emit-each.ts:45) mirroring this shape. `collectEachBlocks(fileAST)` (emit-each.ts:71) recurses through `children`/`body`/`bodyChildren`/`nodes`/`arms`/`templateChildren` to gather all `kind:"each-block"` nodes (incl. nested). `@.` in `templateChildren` resolves to the iteration value (item, or index for `of=N`); a codegen step converts `@.` to the iter var name.

### MatchBlockNode (synthesized by parse-file.js — S121 P5-7)
`{ kind:"match-block", forType, onExprRaw, armsRaw, bodyChildren, span }`

## Node Interfaces (selected)

### Span  [ast.ts:21]
`start / end / line / col: number; file?: string`

### AttrValue  [ast.ts:42] — 6-variant union
`StringLiteralAttrValue | VariableRefAttrValue | CallRefAttrValue | ExprAttrValue | PropsBlockAttrValue | AbsentAttrValue`

### ReactiveAssignNode  [ast.ts ~764] — S123 V-kill
```
kind: "reactive-assign"
target: string        — reactive variable name (without @)
value: string         — raw value expression text
valueExpr?: ExprNode  — structured ExprNode form
```
Replaces pre-S123 phantom state-decl synthesis for bare `@name = expr` inside fn/function/user `${...}`. SYM PASS 3 fires E-STATE-UNDECLARED when no structural `<name>` decl is in scope.

### Declaration nodes
`LetDeclNode | ConstDeclNode | TildeDeclNode | LinDeclNode | ReactiveDeclNode | FunctionDeclNode | ComponentDefNode | EngineDeclNode | TypeDeclNode | ImportDeclNode | ExportDeclNode | UseDeclNode | ChannelDeclNode`

### FunctionDeclNode — relevant to MCP serverfns extraction
`params: string[]` (entries may carry `:`-typed annotations); `isServer: boolean` — canonical server-boundary marker the MCP serverfns extractor reads; `returnTypeAnnotation` (canonical) / `returnType` (forward-compat) read for return type. Native parser now translates `-> ReturnType` annotations (M6.7-D8a-i).

## Lifecycle Annotation Types  [compiler/src/type-system.ts — NEW S130-S131]

§14.3 / §14.12 — per-struct-field pre/post-transition type pair. Lifecycle annotation form is `(A to B)` (legacy `(A -> B)` glyph resolves identically — `findTopLevelArrow` detects the glyph at the TOP LEVEL of the parenthesized inner expression; a nested arrow inside a sub-expression is NOT a lifecycle annotation).

**S135 Fix #1**: `findTopLevelArrow` now uses word-boundary rule (non-identifier char before/after `to`) rather than whitespace-only — tolerates parser whitespace-collapse around `.` (e.g., `(.Draft to.Published)` still detects the lifecycle glyph). The legacy `->` form already used a single-space tolerance; Fix #1 makes `to` at least as tolerant.

### LifecycleFieldSpec  [type-system.ts:2089]
`{ preType: ResolvedType; postType: ResolvedType }`  — `preType` = the `A` (pre-transition) type, `postType` = the `B` (post-transition) type.

### LifecycleRegistry  [type-system.ts:2094]
`Map<string, Map<string, LifecycleFieldSpec>>`  — outer key = struct/type name; inner key = field name. Sparse: only lifecycle-annotated fields populate the inner map; a struct with no lifecycle fields gets an empty `Map<>` entry. Built by `buildLifecycleFieldRegistry` (type-system.ts:2097) via `extractLifecycleFields` (type-system.ts:2161 — struct-body extractor). `checkLifecycleFieldAccess` walks statement text (Pass 1: discover `transition()` calls → advance state; Pass 2: flag post-shape field access without `transition()`) and fires E-TYPE-001. `transition()` (§14.12.6.3) is a compile-time-only marker — required after discriminating to a post-variant before post-shape field access.

### Shape 1 per-access lifecycle tracker  [type-system.ts:14916 — NEW S134, B-prereq Bug 19 HIGH; Q6-narrow S135]

`runCellValueLifecycleAccessCheck` (type-system.ts:15088) — pipeline-facing wrapper; called from the main TS pass at type-system.ts:12337. Closes Bug 19 HIGH: SPEC §14.12.10 promises per-access tracking on Shape 1 plain reactive cells (`<state>: (A to B) = init`); pre-S134 impl covered struct-field + fn-return loci only.

Key internals:
- `collectCellValueTypedLifecycleBindings` (type-system.ts:14947) — recursive collector for `state-decl` AST nodes with lifecycle-annotated types; scoped to file-scope cells.
- Per-scope walk: for each lifecycle-annotated reactive cell, mirrors the struct-field two-pass approach — `transition()` calls via `@cell = B-shaped-value` advance the per-access state; post-transition field accesses before transition fire E-TYPE-001.
- Source label in diagnostics: `"on a Shape 1 reactive cell"` (distinguishes from struct-field fires).
- Engine-cell name set (Sub-Pass 2.a) — built to exclude engine-cell positions from Shape 1 tracking (engines own variant-graph via `rule=`; lifecycle annotation there is E-TYPE-LIFECYCLE-ON-ENGINE-CELL).

**S135 Q6-narrow (§6.8.3 impl):** `RESET_CALL_RE` regex + new Pass in `processStatementText` recognizes `reset(@cell)` and `reset(@cell.field.path)` calls; routes through `classifyWriteAgainstSpec` to revert per-access state per §6.8.3 (pre-type value → revert to "pre"; post-type value → maintain/advance "post"). Two trackers: Tracker 1 (cell-value Shape 1) + Tracker 2 (struct-typed Shape 1 with field lifecycle). Whitespace-tolerant regex. Heuristic limitations: Bug 21 (deep multi-level nested compound uses `fieldPath[0]`), Bug 22 (cross-cell `default=@otherCell` is heuristic).

**S135 source-form fixes (Fix #3 + companion):** `parseLifecycleReturnAnnotation` — `extractBareVariant` strips both leading `.` (bare-dot) AND `EnumName.` prefix (qualified form) so the discrimination regex matches canonical bare-variant names regardless of annotation source-form. `TRANSITION_CALL_RE` accepts optional `@` prefix: matches `transition(@phase)` and `transition(phase)`, stripping `@` so binding-map keys align.

§6.8.3 (`reset × lifecycle` interaction) status: **SPEC LANDED S134; IMPL LANDED S135** (Q6-narrow commit `2ffe4f6a`). Shape 1 B-prereq tracker is the foundation.

## Alias Types  [compiler/src/symbol-table.ts — NEW S134, A4]

### AliasRecord  [symbol-table.ts:820]
```
cellName: string        — derived cell name aliased (no @ prefix)
pathTail: string[]      — path segments from cell to aliased value ([] = whole-cell alias;
                          ["a","b"] = static-path; ["[…]"] = computed-index sentinel)
cellRecord: StateCellRecord   — for diagnostic context (qualifiedPath, declNode span)
declNode: any           — let-decl / const-decl source node (alias declaration site)
```
Produced by `walkRegisterLocalAliases` (symbol-table.ts:1881) — PASS 2.c (S134 A4). Stored in `Scope.aliasProvenanceRecords` (per-scope map). Consumed by PASS 6 L21 walker (`rejectWritesToDerivedVars`) when a mutation form's leaf-ident is NOT `@`-prefixed (alias-mutation path). Closes the §6.6.18 alias-escape gap: `let local = @cell; local.foo = x` now fires E-DERIVED-VALUE-MUTATE.

Chain-break rules (init shapes that do NOT produce an AliasRecord): spread, object/array literals, binary/unary/logical/conditional expressions, function-call results, method-call returns (`.filter` etc. return new arrays).

## BinaryExpr precedence printer  [codegen/emit-expr.ts — Bug W, S127]
`emitBinary` (emit-expr.ts ~688) re-inserts the grouping parens Acorn dropped (Acorn keeps tree nesting but drops `ParenthesizedExpression` nodes — a SILENT arithmetic-correctness bug). Supporting tables:
- `BINARY_PRECEDENCE` — `Record<BinaryExpr["op"], number>`; `**`=14 … `||`/`??`=4; self-bracketed `is`/`is-*`=3.
- `RIGHT_ASSOCIATIVE` — `Set(["**"])`.
- `binaryOpEmitsFlat(op)` — false for `==`/`!=`/`is`/`is-not`/`is-some`/`is-not-not` (those emit own outer parens / IIFE).
- `binaryOperandNeedsParens(child, parentOp, isRightChild)` — wrap when `prec(child) < prec(parent)`, or equal-precedence wrong-side, or ES2020 `??`-mixed-with-`||`/`&&` SyntaxError class.

S131 emit-expr.ts:277 — orphan-`~` defensive fallback in emitIdent (`name === "~"` → emits `null /* ~ orphaned — codegen-fallback */`); complements the emit-logic.ts:bare-expr orphan-skip (~snapshot Bug 15).

## ast-builder.js structural placement table — NEW S135

### STRUCTURAL_ELEMENT_PLACEMENT  [ast-builder.js:183]
```
schema:       string   — canonical placement message (§39.2/§39.12)
engine:       string   — (§51.0/§51)
channel:      string   — (§38.1/§38.3)
page:         string   — (§40/§40.8)
auth:         string   — (§40.9.5/§40.1.1)
errors:       string   — (§55.8)
onTransition: string   — (§51.0.H)
onTimeout:    string   — (§51.0.M)
onIdle:       string   — (§51.0.R)
```
9 entries. `<match>` intentionally absent (block-form `<match>` is markup-as-value, legal inside `${...}`). Used by `leadingTagName()` (ast-builder.js:214) to gate `E-STRUCTURAL-ELEMENT-MISPLACED` at both html-fragment fallback sites in `parseLogicBody` (ast-builder.js:6529 + 9744). Detection is case-sensitive; PascalCase components and bare HTML elements do NOT fire.

## Meta-Checker Types  [compiler/src/meta-checker.ts — CHANGED S133-S134]

### META_BUILTINS  [meta-checker.ts:127]
`Set<string>` — identifiers available in `^{}` meta contexts that SHALL NOT trigger E-META-001 (compile-time primitives: `emit`, `reflect`, `meta`, `compiler`, `console`, `Math`, `JSON`, `Date`, `RegExp`, `structuredClone`, `Object`, `Array`, `String`, `Number`, `Boolean`, and timer/interval forms). **S133 narrow**: `bun.eval()` user-facing surface REMOVED from META_BUILTINS (it is Approach C §22.12 forbidden via `JS_HOST_FORBIDDEN`). `META_BUILTINS` membership is now purely compile-time API suppression for E-META-001/E-META-005.

### JS_HOST_FORBIDDEN  [meta-checker.ts:188 — NEW S134, Bug 17]
`Set<string>` — JS-host ambient globals categorically forbidden inside `^{}` blocks (§22.12 categorical enforcement). Distinct from `META_BUILTINS`:
- `META_BUILTINS` gates compile-time runtime-variable enforcement (§22.4).
- `JS_HOST_FORBIDDEN` gates the categorical §22.12 constraint regardless of compile-time vs runtime classification.

Members include: `bun`, `process`, `setInterval`, `clearInterval`, `setTimeout`, `clearTimeout`, `fetch`, `WebSocket`, `XMLHttpRequest`, `window`, `document`, `navigator`, `location`, `history`, `localStorage`, `sessionStorage`, `indexedDB`, `crypto` (Web Crypto API — not `meta.crypto`), and additional JS-runtime-only surfaces. Belt-and-suspenders: if an identifier is in BOTH sets, `META_BUILTINS.has(id)` wins (no overlap in practice today).

`checkJsHostGlobals` (meta-checker.ts:1168) — walker invoked from the main meta checker; recursively walks `^{}` bodies (stopping at nested `^{}` which have their own check) and fires E-META-001 for any `JS_HOST_FORBIDDEN` identifier encountered.

## MCP Descriptor Shapes  [compiler/src/codegen/mcp-descriptors.ts — 922L]

App-wide arrays emitted as JSON sidecars (`engines.json` / `forms.json` / `channels.json` / `serverfns.json`). Shapes ARE the A↔B contract `scrml:mcp` runtime helpers consume. The four compound-rollup keys are nested under `FormDescriptor.compoundKeys` (S127 fix; flattening had broken `submitted` decode); `EngineDescriptor` emits `cellKey`. v0 ENCODING CAVEAT: per-file §47 encoding context is not threaded to this post-CG extractor, so `cellKey`/form keys are emitted as the raw (encoding-off) name; `cellKey === name` in default compile mode.

### McpDescriptors  [mcp-descriptors.ts]
`{ engines: EngineDescriptor[]; forms: FormDescriptor[]; channels: ChannelDescriptor[]; serverFns: ServerFnDescriptor[] }`  (assembled by `buildMcpDescriptors`)

### EngineDescriptor → engines.json
```
name: string                     — auto-declared var name (no @) or var= override
cellKey: string                  — runtime-state key for the current-variant cell; encodeKey-identity in default mode (===name); read at mcp.js as descriptor.cellKey || descriptor.name
type: string                     — governing enum type (for=Type)
variants: EngineVariantDescriptor[]
rules: Record<string, string[]>  — FROM-tag → legal-to set; single→[X], multi→[A,B], wildcard→["*"], absent/terminal/malformed→[]
kind: "primary" | "derived"      — derived = §51.0.J derived=expr engine
```

### EngineVariantDescriptor
`{ tag: string; fields: EngineVariantFieldDescriptor[] }`  (fields=[] for unit variants)

### EngineVariantFieldDescriptor
`{ name: string; type: string }`  (type = raw source-text annotation)

### FormDescriptor → forms.json
```
formName: string
compoundKeys: FormCompoundKeys   — the 4 rollup keys NESTED (read by getFormStatus → descriptor.compoundKeys.{...})
fields: FormFieldDescriptor[]
```

### FormCompoundKeys
`{ isValidKey; errorsKey; touchedKey; submittedKey: string }`  — resolved `<formName>.{isValid|errors|touched|submitted}` rollups. `submittedKey` is compound-ONLY (§55.7) — why flattening broke B.

### FormFieldDescriptor
`{ name; qualifiedName; errorsKey; isValidKey; touchedKey: string }`  (resolved per-field §55.6/§55.9 keys; v0 = raw qualified names)

### ChannelDescriptor → channels.json
`{ name: string; topic: string; autoSyncedCells: ChannelAutoSyncedCell[] }`  (name defaults "channel"; topic defaults to name per §38.3)

### ChannelAutoSyncedCell
`{ name: string; key: string }`  (§38.4 V5-strict state-decl cells)

### ServerFnDescriptor → serverfns.json
```
name: string
params: ServerFnParamDescriptor[]
returnType: string               — raw annotation or "unknown"
file: string                     — absolute decl path (same-name disambiguation)
dispatchable: false              — PERMANENT v0 marker (read-only enumeration, PA Q2)
```

### ServerFnParamDescriptor
`{ name: string; type: string }`

## Codegen I/O Types  [compiler/src/codegen/]

### FileIR  [codegen/ir.ts]
`{ filePath; html: HtmlIR; css: CssIR; server: ServerIR; client: ClientIR }`

### CompileContext  [codegen/context.ts]
`{ filePath / fileAST / routeMap / depGraph / protectedFields / authMiddleware / middlewareConfig / csrfEnabled / encodingCtx / mode / testMode / dbVar / workerNames / errors / registry / derivedNames / analysis / runtimeChunks ... }`

### RuntimeChunkName  [codegen/runtime-chunks.ts]
Union of named runtime chunk keys ('core' | 'scope' | 'timers' | 'animation' | 'prefetch' | ...).
`CHUNK_DEPENDENCIES: { scope: ['timers', 'animation'] }` — 6nz Bug P (S123). `applyChunkDependencies(chunks)` — fixed-point closure.

## Code-Segment Fence  [codegen/code-segments.ts — S125, leaf module, no project imports]
Shared regex-literal / comment / string-aware splitter for every scrml keyword-lowering text pass. BOTH `rewrite.ts::rewriteNotKeyword` AND `expression-parser.ts::preprocessForAcorn` share one fence.
- `rewriteCodeSegments(expr, transform)` — applies `transform` ONLY to code regions. Re-exported from rewrite.ts.
- `regexAllowedAfter(codeBefore)` — regex-vs-division disambiguation via `REGEX_PERMISSIVE_KEYWORDS`.

`rewrite.ts` (2304 LOC) also carries the `~snapshot` bare-`~`-replacement helper — word-boundary-aware (`(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])`) so `~` is replaced by the tilde var only when standalone.

## Symbol Table Types  [compiler/src/symbol-table.ts — 10445 LOC]

### ScopeKind
`"file" | "function" | "engine" | "component" | "compound" | "field"`

### CellKind
`"plain" | "bindable" | "markup-typed" | "compound-parent" | "engine"`

### EngineStateChildEntry  [symbol-table.ts:549]
```
tag: string; rule: EngineRuleForm; bodyRaw: string
isColonShorthand: boolean; rawOffset: number; historyAttr: boolean
internalRule: EngineRuleForm; onTimeoutElements: OnTimeoutEntry[]
innerEngines: NestedEngineEntry[]; effectRaw: string | null
onTransitionElements: OnTransitionEntry[]; payloadBindings: PayloadBinding[]
onIdleElements: OnIdleEntry[]
```
Produced by `engine-statechild-walker.ts` (M6.6.b.2 primary path) or `engine-statechild-parser.ts` (legacy fallback). `EngineRuleForm` kinds (`absent`/`single`/`multi`/`wildcard`/`legacy-arrow`/`parse-error`) are read by `mcp-descriptors.ts:buildRulesMap`.

### AliasRecord  [symbol-table.ts:820 — NEW S134, A4]
See "Alias Types" section above.

### SYMInput / SYMResult / Scope
`SYMInput { filePath, ast: FileAST, exportRegistry? }`
`SYMResult { filePath, errors: SYMDiagnostic[], fileScope: Scope, stats: SYMStats }`
`Scope { kind: ScopeKind; parent: Scope | null; file: string; stateCells: Map<...>; importBindings: Map<...>; children: Scope[]; aliasProvenanceRecords: Map<string, AliasRecord> }`

## Native-parser AST Catalogs

### Token  [compiler/native-parser/token.js]
`TokenKind` — Object.freeze enum; `CONTEXTUAL_KEYWORDS`.

### Stmt catalog  [ast-stmt.js] — frozen StmtKind variants
Block, ExprStmt, Empty, VarDecl, If, While, DoWhile, For, ForIn, ForOf, Return, Break, Continue, Labeled, FunctionDecl, ClassDecl, Import, Export, Try, Throw, LinDecl, TypeDecl, TildeDecl, **StateDecl** (M6.5.b.2), **Given** (M6.7-D7 presence-guard node, §42.2.3).

#### Native StateDecl node shape  [parse-stmt.js `parseStructuralStateDecl`]
```
kind: "StateDecl"; name; typeAnnotation; structuralForm: true; isConst; shape: "derived"|"plain"
defaultExprRaw; pinned (§6.10); server (§52); debouncedRaw/throttledRaw (§6.13)
validators: [...]; init: <expr>; span
```
Bridged to live `state-decl` by `translate-stmt.js makeStateDeclNode`. `server` → live `isServer`. PARTIAL: 6 of 8 productions.

### Expr catalog  [ast-expr.js] — 40 frozen ExprKind variants
Ident, NumberLit, StringLit, BoolLit, RegexLit, TemplateLit, AtCell, BareVariant, This, Super, Array, Object, Paren, Unary, Update, Binary, Logical, Assignment, Conditional, Sequence, Call, New, Member, TaggedTemplate, Arrow, Function, RestElement, AssignmentPattern, BlockStub; scrml-extension: NotValue, Tilde, Sql, InputStateRef, IsCheck, Match (+MatchArm/VariantPattern/WildcardPattern/IsPattern/MatchBinding), Render, Lift, Fail, Propagate, GuardedExpr, Yield, MarkupValue.

Match-arm parsing: `parseMatchExpr` (parse-expr.js) accepts `,` / `;` / newline (M6.5.b.1) AND `:>` colon-arrow (M6.7-D3) as inter-arm separators; `parseMatchArmPattern` handles Dot+UpperIdent variant patterns. `parsePrimary` accepts null/undefined atoms (M6.7-D1). `parseNamedImportSpecifiers` accepts string-literal specifiers (M6.7-D6).

### Block catalog  [parse-markup.js]
BlockKinds: Markup, Text, Comment, Sql, Css, Meta, ErrorEffect, LogicEscape, DisplayTextLiteral, Test (`_{}`), ForeignCode (`^^{}`).

## ExprNode union  [ast.ts ~1939] — 20 lowercase kinds
`IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr | AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr | CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr`

## Database Models
No application DB schema — scrml is a compiler. SQLite *.db files are throwaway test fixtures.

## Tags
#scrmlts #map #schema #ast #fileast #native-parser #codegen #m5-swap #bridge #each-block #iteration #lifecycle #lifecycle-registry #lifecycle-shape1-tracker #lifecycle-reset-aware #alias-record #alias-escape #reactive-assign #symbol-table #mcp-v0 #mcp-descriptors #emit-binary #code-segments #snapshot-fix #js-host-forbidden #meta-builtins-narrow #structural-element-placement #structural-in-logic-body #s131 #s133 #s134 #s135

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
