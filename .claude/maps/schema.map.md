# schema.map.md
# project: scrmlts
# updated: 2026-05-20T00:30:00Z  commit: df1211d

## S108 additions (additive — see catalog below for full inventory)

| Item | Where | What |
|------|-------|------|
| `kind: "match-block"` routing | `ast-builder.js` produces; `compiler/src/codegen/emit-match.ts` (NEW S108, ~430L) consumes | Phase 3+4 codegen consumer fully wired. Reuses `emit-variant-guard.ts:emitVariantGuardedRender` helper. `:`-shorthand body form (Phase 4) parses via `parseExprToNode` + synthesized `logic > bare-expr` AST. |
| `_constantFolded?: boolean` | bare-expr / logic-statement nodes via `collect.ts` + Bug 5 P3 const-folding pass | Marks expressions that evaluated to compile-time literals inlined directly into HTML. Consumers (orphan-filter at `emit-reactive-wiring.ts:389`) skip emit. Companion to NEW `compiler/src/codegen/const-fold-env.ts` (~155L, cached env via `partiallyEvaluateExpr`). |
| `FileAST.hasForStmt: boolean` | `ast-builder.js` (NEW S108 PGO C2) | TAB-time short-circuit DFS via `detectMarkupForStmtChunkPresence` walker. emit-client.ts gates `buildFunctionBodyRegistry` when false. |
| `FileAST.hasChunkedMarkupTag: boolean` | `ast-builder.js` (NEW S108 PGO C2) | TAB-time short-circuit DFS. emit-client.ts elides markup tag-test per-node when false. |

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

### Match block-form AST node (NEW S107 — `kind: "match-block"`)

Produced directly by `compiler/src/ast-builder.js:10521+` (NOT declared in ast.ts; constructed inline as a plain JS object). Phase 1 (S107 commit `82c48fd`) added the dispatch case; Phase 2 (S107 commit `c91fae0`) added downstream re-tokenization via `match-statechild-parser.ts`.

**Shape (JS-only, not in TS ast.ts as of S107):**
```js
{
  id: number,
  kind: "match-block",
  span: Span,
  forType: string,             // bareword struct/enum type ident from `for=` (REQUIRED per §18.0.1)
  onExprRaw: string | null,    // raw text inside `on=` attribute, or null when omitted (auto-implied subject)
  armsRaw: string              // raw body text between opener and explicit `</match>` / `</>` closer
}
```

**Pipeline lifecycle:**
- BS (Stage 2): `<match>` is in both `STRUCTURAL_RAW_BODY_ELEMENTS` (raw-body capture; explicit `</match>` required) AND `COMPOUND_LIFT_EXEMPT_TAGS` (no auto-lift as compound state-decl). See `compiler/src/block-splitter.js:123-125` and `:140-144`.
- TAB (Stage 1 ast-build): `case "match"` dispatcher in ast-builder.js produces the AST node directly. Body text captured via children-concat + raw-slice fallback.
- SYM PASS 20 (S107 NEW): `compiler/src/symbol-table.ts:8952+` walks `match-block` nodes; re-tokenizes `armsRaw` via match-statechild-parser; fires 5 diagnostics (E-MATCH-ON-REQUIRED / E-MATCH-NOT-EXHAUSTIVE / W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN).
- Phase 3 codegen render dispatch (CARRY-FORWARD): not yet implemented. Compiler currently treats `match-block` AST nodes as no-ops at CG stage (the previous "html-fragment pass-through" behavior went away when Phase 1 landed; the node now reaches CG as a `match-block` kind that needs explicit dispatch — TBD).

**v1.next:** consider lifting to a typed ast.ts interface (mirror of `EngineDeclNode`) once Phase 3+4 land; currently the JS-shape lives only in ast-builder.js + match-statechild-parser.ts.

### FileAST  [ast.ts:1392]
filePath: string, nodes: ASTNode[], imports, exports, components, typeDecls,
channelDecls?: ChannelDeclNode[], spans: Record<number, Span>, hasProgramRoot: boolean,
authConfig: AuthConfig | null, middlewareConfig: MiddlewareConfig | null,
hasResetExpr?: boolean  [PGO P3.B-followup S102 — cached presence of reset-expr nodes, set by TAB/detectResetExprPresence; consumed by emit-client detectRuntimeChunks O(1) gate],
hasEqualityExpr?: boolean  [PGO C1 S106 `c491b12` — sibling Option-2 pattern to hasResetExpr; cached presence of `kind === "binary"` with `op === "==" || op === "!="` nodes; set by TAB/detectEqualityExprPresence (throw-sentinel short-circuit DFS in ast-builder.js); consumed by emit-client.ts to pre-activate chunks.add("equality") when true, gate needEquality probe when false. 15 unit tests.]

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

### FunctionDeclNode  [ast.ts:~820]
name: string, params: ParamNode[], body: Stmt[], async?: boolean, pure?: boolean, server?: boolean,
isPinned?: boolean  [S105 — §48.6.4 `pinned fn` opt-out-of-hoisting marker; set by ast-builder.js at both fn-decl parser sites (~:5587+ nested + ~:8350+ top-level) when `pinned` is outermost IDENT prefix; consumed by SYM PASS 19 in symbol-table.ts for E-STATE-PINNED-FORWARD-REF firing],
span: Span

### ExprNode (union)  [ast.ts:1838]
IdentExpr | LitExpr | ArrayExpr | ObjectExpr | SpreadExpr | UnaryExpr | BinaryExpr |
AssignExpr | TernaryExpr | MemberExpr | IndexExpr | CallExpr | NewExpr | LambdaExpr |
CastExpr | MatchExpr | SqlRefExpr | InputStateRefExpr | EscapeHatchExpr | ResetExpr

## AuthGraph Types — `compiler/src/types/auth-graph.ts` (A-3, ~354 LOC)

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
      "I-AUTH-REDIRECT-UNRESOLVED" | "W-AUTH-PAGE-INFERRED" | "W-AUTH-LOGIN-MISSING"
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

## Per-Route Artifact Splitter Types — `compiler/src/codegen/route-splitter.ts` (A-4)

### ChunkKey  [route-splitter.ts]
entryPointId: EntryPointId, role: RoleVariant, tier: "initial" | "tier1" | "tier2" | `tierN${number}`

### ChunkOutput  [route-splitter.ts]
key: ChunkKey, payloadJs: string, chunkHash: string, filename: string, byteSize: number

### ChunksManifest  [route-splitter.ts]
Map<ChunkKey, ChunkOutput>

### RouteInfo  [atom-emitter.ts]
routePath: string | null, shape: "page" | "spa-program"

### EmitPerRouteInput  [route-splitter.ts:255]
Includes: `chunkSizeBudgetBytes?: number` — Q-OPEN-5 soft budget override; falls back to CHUNK_LARGE_SOFT_BUDGET_BYTES (100,000) when absent/non-positive

## FNV-1a Hash Primitive — `compiler/src/codegen/fnv1a-hash.ts` (A-4.6)

FNV_OFFSET: 2166136261 (const — SPEC §47.1.3 normative)
FNV_PRIME: 16777619 (const — SPEC §47.1.3 normative)
fnv1aHash(input: string): string — FNV-1a 32-bit hash, output as 8-char base36, zero-padded

getCompilerIdentity(): string — reads package.json `version`, returns `"scrml-" + V`, cached; fallback `"scrml-unknown"` on read failure (Q-OPEN-4)

## Wire Format Types — `compiler/src/codegen/wire-format.ts` (228 LOC)

Exports (constants + function):
- `returnTypeAllowsAbsence(annot: string | undefined | null): boolean`
- `SERVER_WIRE_ENCODER_HELPER: string` — inline JS encoder helper (emitted at top of .server.js)
- `CLIENT_WIRE_DECODER_HELPER: string` — inline JS dual-decoder helper (emitted in client core chunk)

Wire envelope shape (canonical, SPEC §57): `{"__scrml_absent": true}`

## §18.0.1 Match Block-Form Parser Types — `compiler/src/match-statechild-parser.ts` (NEW S107, 530 LOC)

Phase 2 re-tokenizes `armsRaw` from `match-block` AST nodes (Phase 1 output) into structured `MatchArmEntry[]` consumed by SYM PASS 20 (5 diagnostics) and future Phase 3 codegen. Mirrors `engine-statechild-parser.ts` (S68 / B15) but for the Tier-1 `<match>` locus.

### MatchArmAttr  [match-statechild-parser.ts:54]
```typescript
interface MatchArmAttr {
  name: string;        // attribute name (e.g. "rule", "effect")
  valueRaw: string;    // raw attribute value (or empty for bareword attrs)
  spanStart: number;   // local byte offset within armsRaw
  spanEnd: number;     // local byte offset within armsRaw
}
```

### MatchArmEntry  [match-statechild-parser.ts:63]
```typescript
interface MatchArmEntry {
  variantName: string;        // PascalCase variant ident OR "_" for wildcard
  isWildcard: boolean;        // true iff variantName === "_"
  payloadBindingsRaw: string; // raw text inside `(...)` if present, else empty
  attrs: MatchArmAttr[];
  bodyForm: "self-closing" | "shorthand" | "bare-body";
  bodyRaw: string;            // body content (empty for self-closing)
  spanStart: number;          // local byte offset within armsRaw of whole arm
  spanEnd: number;            // local byte offset within armsRaw of whole arm
  openerStart: number;        // local byte offset of arm-opener `<`
}
```

### MatchParseDiagnostic  [match-statechild-parser.ts:77]
```typescript
interface MatchParseDiagnostic {
  code: string;    // e.g. "E-MATCH-PARSE-001"
  message: string;
  spanStart: number;
  spanEnd: number;
}
```

**Body form recognition (per SPEC §18.0.1 line 9589-9592):**
- Self-closing `<Variant/>` — no body. `bodyForm: "self-closing"`, `bodyRaw: ""`.
- `:`-shorthand `<Variant attrs> : expr` — single expression body, terminated by newline OR next arm-opener at the same depth. `bodyForm: "shorthand"`, `bodyRaw: <expr-text>`.
- Bare-body `<Variant attrs>...</>` or `<Variant attrs>...</Variant>` — markup body terminated by matching closer. `bodyForm: "bare-body"`, `bodyRaw: <body-text>`.

**Payload binding (per SPEC §18.0.1 line 9586-9588, Q-MB-3 ratification):**
- `(` immediately after the variant name (no whitespace) opens parenthesized identifiers list.
- Captured as raw text in Phase 2; tokenized in Phase 4 (when the type-system reuse path lands — Q-MB-3 ratified reuse of §51.0.B.1 parenthesized payload parser).

**Span tracking:** all spans are local byte-offsets within `armsRaw`. SYM PASS 20 absolutizes via `match-block.span.start + entry.spanStart`.

**Phase 2 DOES NOT validate.** It tokenizes only. The 5 SYM PASS 20 diagnostics (E-MATCH-ON-REQUIRED / E-MATCH-NOT-EXHAUSTIVE / W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN) fire after re-tokenization completes.

## §41.16 tableFor Types — `compiler/src/codegen/emit-table-for.ts` (S105)

Source-level expansion; types used by the type-system §41.16 stage to pass the expansion plan to `expandTableForElement()`. Mirror of formFor + schemaFor pattern (`collectTableForImports` + `walkAndExpandTableForNodes` in type-system.ts).

### TableForColumnInfo  [emit-table-for.ts:~95]
fieldName: string, label: string, baseTypeName: "string"|"number"|"integer"|"boolean"|"struct"|"enum"|"asIs"|"date"|"timestamp",
isNestedStruct: boolean, isSortable: boolean, hasSlotOverride: boolean, slotChildren: unknown[] | null

### TableForSelectionInfo  [emit-table-for.ts:150]
cellName: string, pkFieldName: string  [mechanical `id`-field PK derivation; `selectedBy="field"` overrides]

### TableForExpansion  [emit-table-for.ts:122]
structName: string, rowsExpr: string, rowsCellVarName: string | null,
columns: TableForColumnInfo[]  [pick/omit-filtered list in declared order],
hasSortable: boolean  [any column has sortable=true → auto-synth `@<varName>.sortedBy: TableSort | not` state cell],
selection: TableForSelectionInfo | null  [non-null when outer `selectable=@cell` attr present],
emptySlot: unknown[] | null  [`<empty>` slot children; null → default "No rows" text],
span: unknown

**Pipeline-input contract:** built by `compiler/src/type-system.ts` §41.16 pass (`walkAndExpandTableForNodes`); consumed by `expandTableForElement()` which produces synth MarkupNode tree (table + thead + tbody + tr/td for each row) inlined in-place. DG / VSS / CG stages receive it as ordinary scrml AST. Approach A invariant: "emitted output is standard scrml" — same as formFor + schemaFor.

**SPEC §41.16 deviations documented in commit `1fdeef8`:**
1. Sort-state cell auto-synthesized implicit (functionally equivalent to explicit state-decl per §41.16.7 — v1.next can flip to explicit if adopter friction surfaces)
2. SELECTABLE-CELL-WRONG-TYPE fire-site deferred to downstream type-checker (currently works via downstream type-check; v1.next strict-mode can fire at §41.16 pass)
3. `<empty>` slot codegen depends on pre-existing §17.4a for/else gap (affects all `<empty>` slot text emission; v1.next when §17.4a closes)

## §41.15 schemaFor Types — `compiler/src/codegen/emit-schema-for.ts` (S104)

Source-level expansion at type-system stage; FUNCTION-CALL form `${ schemaFor(StructType) }` interpolated inside `<schema>` block per OQ-SCH-1 debate verdict (Form B 50/60).

Key helpers:
- `pluralizeStructName(name)` — SPEC §41.15.2 normative (lowercase + trailing `s`; SPEC supersedes deep-dive's snake_case framing per Rule 4)
- `classifyFieldForSql(fieldType)` — six-way dispatch: primitive / predicated / bare-enum / payload-enum / nested-struct / no-mapping
- `lowerFieldToSharedCore(fieldName, fieldType)` — emits shared-core vocabulary (req/length/pattern/min/max/oneOf/notIn) per §39.5.7; flagship enum lowering injects `oneOf([variant-names...])` for bare-variant enum fields per OQ-SCH-12
- `walkAndExpandSchemaForCalls(ast, ctx)` — two-pass: Pass A descends `<schema>` state nodes + validates + replaces `logic` children with synthesized `text`; Pass B walks every other ExprNode firing E-SCHEMAFOR-INVALID-CALL-CONTEXT

## §41.14 formFor Types — `compiler/src/codegen/emit-form-for.ts` (S102)

Source-level expansion; types used by the type-system stage to pass the expansion plan to `expandFormFor()`.

### FormForStructLike  [emit-form-for.ts:51]
kind: "struct", name: string, fields: Map<string, unknown>
(structural mirror of StructType from type-system.ts; avoids cross-module type dependency)

### FieldInfo  [emit-form-for.ts:67]
name: string, baseTypeName: "string"|"number"|"integer"|"boolean"|"struct"|"enum"|"asIs",
label: string  [§41.14.7 mechanical default: title-case of field name],
validators: FormForValidator[],
isNestedStruct: boolean  [true → slot override required per §41.14.8]

### FormForValidator  [emit-form-for.ts:79]
name: "req"|"length"|"pattern"|"min"|"max"|"gt"|"lt"|"gte"|"lte"|"eq"|"neq"|"oneOf"|"notIn"|"custom"
argsRaw: string | null  [raw text inside parens, or null for arg-less validators like `req`]

### FormForExpansion  [emit-form-for.ts:90]
cellName: string, structName: string, includedFields: FieldInfo[],
slotOverrides: Map<string, unknown[]>,
onsubmitFnName: string | null, onsubmitBoundary: "server"|"client"|null,
peActionUrl: string, errorStrategy: "per-field"|"summary"|"both", partial: boolean, span: unknown

### RewriteContext  [codegen/rewrite.ts:50]
Context threaded through every rewrite pass; all fields optional. Key fields used by paren-form rewrite (S103):
(no tmpvar field — paren-form single-evaluation is intrinsic to `(expr)` form; `_scrml_tmp_N` interposition removed)

## L22 Family Shared Helper — `_resolveAndCheckL22TypeName` (S106 `6faf7a6`)

NEW S106 — `compiler/src/type-system.ts` helper extracted at third-caller threshold (tableFor S105 was the 4th caller). Handles sub-case-3 (unknown type) + sub-case-4 (wrong kind) shared across the L22 type-as-argument family:
- parseVariant §41.13 (S65)
- formFor §41.14 (S102)
- schemaFor §41.15 (S104)
- tableFor §41.16 (S105)

Sub-cases 1 + 2 (missing arg / wrong-shape arg) remain caller-specific because they vary by surface form (markup-attr vs call-arg). Net +9 lines (76 ins / 67 del); pure refactor; error message bytes preserved exactly. Positions future variantNames + reflective family members to inherit the helper.

## Codegen IR — `compiler/src/codegen/ir.ts`

### HtmlIR  parts: string[]
### CssIR   userCss: string, tailwindCss: string
### ServerIR  lines: string[]
### ClientIR  lines: string[]
### FileIR   filePath: string, html: HtmlIR, css: CssIR, server: ServerIR, client: ClientIR
### TestIR-family  AssertStmt, TestCase, TestBindDecl, TestGroup, TestIR

## Codegen Key Interfaces — `compiler/src/codegen/*.ts`

### CompileContext  [context.ts:24]
filePath, fileAST, routeMap, depGraph, protectedFields: Set<string>, authMiddleware, middlewareConfig,
csrfEnabled: boolean, encodingCtx: EncodingContext | null, mode: "browser"|"library", testMode: boolean,
dbVar: string, workerNames: string[], errors: CGError[], registry: BindingRegistry,
derivedNames: Set<string>, analysis: FileAnalysis | null, usedRuntimeChunks: Set<string>,
exportRegistry?: Map<string, Map<string, { kind, category, isComponent }>> | null,
reachabilityRecord?: ReachabilityRecord | null,
hasPrefetchableLinks: boolean  [A-4.4 — set by emit-html when internal `<a href>` resolves to RouteMap.pages],
hasInternalLinks: boolean      [Q-OPEN-6 — set by emit-html on any absolute-path string-literal `<a href>`, independent of resolution]

### CgInput  [codegen/index.ts:79]
files, routeMap?, depGraph?, protectAnalysis?, sourceMap?, embedRuntime?, mode?, testMode?,
emitMachineTests?, encoding?, batchPlan?, batchPlannerErrors?, exportRegistry?,
reachabilityRecord?, emitPerRoute?: boolean, chunkSizeBudgetBytes?: number  [Q-OPEN-5]

### CgFileOutput  [codegen/index.ts:143]
sourceFile, serverJs?, clientJs?, libraryJs?, html?, css?, testJs?, machineTestJs?,
workerBundles?: Map<string, string>, clientJsMap?, serverJsMap?

### CGError  [errors.ts:11]
code: string, message: string, span: CGSpan | object, severity: 'error' | 'warning' | 'info'
(severity includes 'info' since S92 — errors.ts line 15)

## API Layer Helper — `collectErrors` (S107 Bug-3 enrichment)

`compiler/src/api.js:570+` — `collectErrors(stageName: string, errors: Diagnostic[], filePath?: string | null): EnrichedDiagnostic[]`. Optional `filePath` parameter (default `null` for backward-compat). Per-error transform: lifts legacy `bsSpan` → `span` (older block-splitter errors used `bsSpan` to avoid spread-collision on some engines); stamps `enriched.filePath` and `enriched.span.file` from the per-file path. Closes Bug 3 (`[BS]` + `[TAB]` diagnostics now carry `path:line:col` prefix matching `[W-LINT-*]` shape). 6 unit tests at `compiler/tests/unit/bug-3-diagnostic-file-paths.test.js`.

## scrml:host Runtime Types — `compiler/runtime/stdlib/host.js`

### HostError
Variant constructor: `HostError.Thrown(message, name) → { variant: "Thrown", data: { message, name } }`
### safeCall(thunk) → value | scrml-error-shape
### safeCallAsync(thunk) → Promise<value | scrml-error-shape>

## Native Parser Token Types — `compiler/native-parser/token.js` (M1.1-M1.4)

### Token  [token.js:181]
`{ kind: TokenKind, text: string, span: NativeSpan, ...payload }`
- RegexLit token also carries: `{ pattern: string, flags: string, raw: string }`
- TemplateChunk token carries the chunk text (no extra payload)
- TemplateInterpStart/TemplateInterpEnd are zero-payload boundary tokens

### NativeSpan  [span.js]
`{ start: number, end: number, line: number, col: number }`
(distinct from compiler/src/types/ast.ts Span which also carries `file: string`)

### TokenKind values  [token.js:5-123]
Grouped by category:

| Category | Values |
|----------|--------|
| Brackets | LParen, RParen, LBrace, RBrace, LBracket, RBracket |
| Punctuation | Semicolon, Comma, Dot, Ellipsis, Arrow, Colon, Question |
| Arithmetic | Plus, Minus, Star, Slash, Percent, StarStar |
| Assignment | Assign, PlusAssign, MinusAssign, StarAssign, SlashAssign |
| Comparison | Equal, NotEqual, StrictEqual, StrictNotEqual, LessThan, LessEqual, GreaterThan, GreaterEqual |
| Logical | LogicalAnd, LogicalOr, NullishCoalesce |
| Bitwise | BitAnd, BitOr, BitXor, BitNot, BitShiftLeft, BitShiftRight, BitShiftRightUnsigned |
| Unary | Increment, Decrement, Bang |
| JS keywords | KwIf, KwElse, KwFor, KwWhile, KwDoWhile, KwReturn, KwBreak, KwContinue, KwFunction, KwLet, KwConst, KwVar, KwClass, KwExtends, KwNew, KwImport, KwExport, KwFrom, KwAs, KwDefault, KwAsync, KwAwait, KwYield, KwTry, KwCatch, KwFinally, KwThrow, KwTrue, KwFalse, KwNull, KwUndefined, KwTypeof, KwInstanceof, KwIn, KwOf, KwVoid, KwDelete, KwThis, KwSuper |
| scrml extensions | KwIs, KwNot, KwMatch, KwLift, KwFail, KwRender, KwGiven, KwSome |
| Literals | NumberLit, StringLit, TemplateChunk, RegexLit (M1.4), BoolLit |
| Template interp | TemplateInterpStart, TemplateInterpEnd (M1.2) |
| Identifier | Ident |
| scrml syntax | BareVariant, ScrmlAt, SqlBlock, InputStateRef, Tilde, LogicEscapeOpen, LogicEscapeClose |
| Whitespace/Meta | Newline, Whitespace, EOF |

### QuoteKind  [token.js:125]
Single | Double | Backtick

### Functions  [token.js:181-195]
`makeToken(kind, text, span, payload?)` → Token
`makeIdentOrKeyword(text, span)` → Token (Ident or matching Kw* variant via JS_KEYWORDS lookup)
`makeEof(pos, line, col)` → Token

## Tags
#scrmlts #map #schema #ast #types #codegen #ir #s107 #v0.3.3 #formfor #emit-form-for #schemafor #emit-schema-for #tablefor #emit-table-for #l22-4-of-6 #FunctionDeclNode-isPinned #match-block #match-statechild-parser #MatchArmEntry #MatchArmAttr #spec-18-0-1 #spec-18-0-2 #auth-graph #wire-format #reachability #approach-a2 #approach-a3 #approach-a4 #route-splitter #fnv1a-hash #chunk-plan #q-open-4 #q-open-5 #q-open-6 #native-parser #token-catalog #m1-5 #hasResetExpr #hasEqualityExpr #pgo-p3 #pgo-c1 #oq-tf-13-helper #bug-3-collectErrors

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
