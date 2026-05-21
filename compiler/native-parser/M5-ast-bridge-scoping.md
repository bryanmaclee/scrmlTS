# M5 AST-bridge scoping

S114-M5 Phase M5.1 — the load-bearing scoping pass for the native-parser
pipeline-swap behind `--parser=scrml-native`.

## Surfaces compared

### Live-pipeline output: TAB's `{ filePath, ast: FileAST, errors: TABError[] }`

- `block-splitter.js` (2055 LOC) emits `{ filePath, blocks: Block[], errors }`.
- `ast-builder.js` (12880 LOC) consumes the Block tree and emits a typed `FileAST`:

  ```
  FileAST = {
    filePath: string,
    nodes:           ASTNode[],          // ~30 discriminated kinds (see schema.map.md)
    imports:         ImportDecl[],
    exports:         ExportDecl[],
    components:      ComponentDef[],
    typeDecls:       TypeDecl[],
    machineDecls:    MachineDecl[],
    channelDecls:    ChannelDecl[],
    spans:           SpanTable,          // nodeId → Span
    hasProgramRoot:  boolean,
    hasResetExpr:    boolean,
    hasEqualityExpr: boolean,
    hasChunkedMarkupTag: boolean,
    hasForStmt:      boolean,
    authConfig:      AuthConfig | null,
    middlewareConfig: MiddlewareConfig | null,
  }
  ```

- Every node carries `kind`, `id`, `span`, plus kind-specific payload. The 30
  kinds include `markup` (with `attrs`, `tokenizedAttrs`, `children`, `span`,
  `tag`, `tagOpenerSpan`, `tagCloserSpan`, etc.), `text`, `comment`, `state`,
  `state-constructor-def`, `logic` (with `body: LogicStatement[]` — itself a
  ~25-kind sub-union: let-decl / const-decl / tilde-decl / lin-decl /
  reactive-decl / function-decl / component-def / engine-decl / if-stmt /
  for-stmt / while-stmt / return-stmt / throw-stmt / match-stmt / try-stmt /
  bare-expr / lift-expr / fail-expr / propagate-expr / guarded-expr / ...),
  `sql`, `css-inline`, `style`, `error-effect`, `meta`, `throw-stmt`,
  `guarded-expr`, `lift-expr`, `fail-expr`, `html-fragment`, plus declarations
  (`import-decl`, `use-decl`, `export-decl`, `type-decl`, `channel-decl`).
- Attribute values are themselves a 6-variant sub-union (`AttrValue`:
  string-literal / variable-ref / call-ref / expr / props-block / absent).
- `parseExprToNode` (the Acorn-driven JS expression parser) decorates every
  ExprAttrValue / IfChainExpr / BareExprNode with a full ESTree node + scrml
  decorations. Downstream stages consume those ESTree nodes directly.
- Hoisted collections (`imports`, `exports`, `components`, `typeDecls`,
  `machineDecls`, `channelDecls`) are derived via `collectHoisted` from
  walked nodes. Downstream stages (MOD / CE / UVB / PA / RI / MC / TS / META /
  VSS / DG / BP / RS / CG) consume the hoisted collections heavily.
- `spans: SpanTable` is the nodeId→Span lookup table used across the back-end
  for diagnostics.
- The `has*` boolean flags are PGO-driven optimizations (Phase 3 follow-ups)
  cached at TAB time to short-circuit downstream walks.

### Native-parser output (current — HEAD `11e2ddf`, S114 M4.3+MK4 close)

- `lex.js` emits `Token[]`.
- `parse-stmt.js`'s `parseProgram(tokens, source)` emits `{ body: Stmt[], errors }`
  — a JS-only statement-list. Stmt catalog (`ast-stmt.js` StmtKind):
  `Block · ExprStmt · Empty · VarDecl · If · While · DoWhile · For · ForIn ·
   ForOf · Return · Break · Continue · Labeled · FunctionDecl · ClassDecl ·
   Import · Export · Try · Throw`.
- `parse-expr.js` produces Expr nodes (`ast-expr.js` ExprKind, 37 variants —
  see schema.map.md).
- `parse-markup.js`'s `parseMarkup(source)` emits a FLAT block-stream
  (`ctx.nodes`) of `BlockNode { kind, span, ... }`. The 11 BlockKinds are
  `Text · DisplayTextLiteral · Comment · Markup · LogicEscape · Sql · Css ·
   ErrorEffect · Meta · Test · ForeignCode`. `Markup` blocks carry `name`,
   `children`, `closerForm`, `tagClass`. `LogicEscape` blocks carry the body
   token stream (MK4-wired).
- `parse-seam.js` mediates markup→JS body delegation (LogicEscape body parses
  to Stmt[]) and JS→markup discrimination (parsePrimary LessThan branch).
- `ast-stmt.js` and `ast-expr.js` are SEPARATE AST catalogs. Neither produces
  a `FileAST` — neither carries `imports`, `exports`, `components`,
  `typeDecls`, `machineDecls`, `channelDecls`, `spans`, the `has*` flags, the
  `authConfig`, the `middlewareConfig`.

## Divergence inventory

| Category | Live `FileAST` | Native | Bridge cost |
|---|---|---|---|
| Top-level shape | `{ filePath, ast: FileAST, errors }` | `{ ok, body \| ctx.nodes, errors }` | Trivial wrap |
| File-level node array | `ast.nodes: ASTNode[]` (~30 kinds, rich payload) | `ctx.nodes: BlockNode[]` (11 kinds, sparse payload) | **HEAVY** |
| Markup node payload | `kind:"markup"` with `attrs[]` (6-variant value union), `tokenizedAttrs`, `children[]` (nested), `tagOpenerSpan` / `tagCloserSpan`, `id`, etc. | `kind:"Markup"` with `name`, `children`, `closerForm`, `tagClass`, `span` | **HEAVY** — no attrs, no tokenized values, no IDs |
| Logic node | `kind:"logic"` with `body: LogicStatement[]` (25-kind sub-union) | `kind:"LogicEscape"` body parses to native Stmt[] (20-kind native catalog) | **MEDIUM** — kind catalogs differ |
| Text node | `kind:"text"` with `text`, `id`, `span` | `kind:"Text"` with `span` and inline text | LOW |
| Imports / exports / components / typeDecls / machineDecls / channelDecls | Hoisted top-level arrays | **NOT PRODUCED** | **MEDIUM** — would need to be derived |
| Spans table | `spans: SpanTable` nodeId→Span map | Span on each node directly | LOW |
| has* PGO flags | `hasProgramRoot` / `hasResetExpr` / `hasEqualityExpr` / `hasChunkedMarkupTag` / `hasForStmt` | **NOT PRODUCED** | LOW — recompute by walk |
| `authConfig` / `middlewareConfig` | Extracted from `<program>` attrs at TAB | **NOT PRODUCED** | LOW — derive once attrs are bridged |
| Attribute payload | `AttrNode { name, value: AttrValue, ... }` with the 6-variant union | **NOT PRODUCED** — opener-token raw text only | **HEAVY** — attribute parsing + tokenization is its own pipeline (`tokenizeAttributes` + ExprAttrValue's Acorn parse) |
| Expression payload | `parseExprToNode` (Acorn ESTree) decorations on ExprAttrValue / IfChainExpr / BareExprNode / GuardedExpr | Native Expr AST (37 kinds, ast-expr.js) — separate catalog, NOT ESTree | **HEAVY** — downstream consumers (codegen, type-system) read ESTree node shape; native Expr AST is structurally different |
| State block / state-constructor-def | `kind:"state"` with constructor tracking | **NOT PRODUCED** | **MEDIUM** — no state-engine modeling yet |
| SQL block | `kind:"sql"` with `chainedCalls`, `text`, etc. | `kind:"Sql"` with body (text-only at MK1.3 stub) | **MEDIUM** — chained-call modeling absent |
| CSS-inline / style | `kind:"css-inline"` / `kind:"style"` with `declarations`, `rules`, reactive refs | `kind:"Css"` body (text-only at MK1.3 stub) | **MEDIUM** — CSS AST absent |
| Error-effect | `kind:"error-effect"` with `arms[]` (ErrorArm union) | `kind:"ErrorEffect"` (sketch-depth dispatcher only) | **MEDIUM** |
| Meta block | `kind:"meta"` with full metadata payload | `kind:"Meta"` (sketch-depth dispatcher only) | **MEDIUM** |
| Forbidden-switch / Gauntlet checks | Inline emit during TAB build | **NOT IMPLEMENTED** | LOW — runs after bridge |

## Verdict — approach (c) refactor at minimum 70h+; exceeds the 16-36h budget

The brief's three approach options:

- **(a) Native parser produces live-pipeline-equivalent AST directly** —
  **INFEASIBLE within the 16-36h budget.** The live `FileAST` is the OUTPUT
  of ~13000 LOC across `ast-builder.js` (12880) + `tokenizer.ts` (1607) +
  `expression-parser.ts` Acorn integration. To make the native parser emit
  this shape, every native-parser exit point (parse-markup, parse-stmt,
  parse-expr, parse-seam) would need to be re-targeted to produce the
  ~30-kind live AST union (including the full `attrs[]` value union, the
  ESTree expression decorations, the hoisted collections, the auth/middleware
  extraction, the span table, the PGO flags). This is essentially
  re-implementing the whole TAB stage as a native-parser output target.
  Cost estimate: **80-120h.**

- **(b) Translation layer (nativeAstToLiveAst.ts)** — **INFEASIBLE within
  the 16-36h budget.** A `nativeAstToLiveAst.ts` would have to:
  1. Walk every BlockNode (Markup / LogicEscape / Sql / Css / ErrorEffect /
     Meta / Test / ForeignCode / Text / DisplayTextLiteral / Comment) and
     synthesize the corresponding rich ASTNode.
  2. For Markup blocks: re-parse the opener attribute extent into an `attrs[]`
     array — but the native parser does not yet tokenize markup attributes
     (MK2/MK3 surfaced TagFrame + body modes, NOT attribute parsing). This
     would require running the live `tokenizeAttributes` from `tokenizer.ts`
     against the opener-span text — a re-tokenizer scaffolding ADDITION,
     not a deletion, working against the M6 goal.
  3. For LogicEscape blocks: the native Stmt[] catalog uses ESTree-DIFFERENT
     shapes (the live pipeline's `LogicStatement` union is scrml-specific —
     `let-decl` / `tilde-decl` / `lin-decl` / `reactive-decl` /
     `if-stmt` (with `then[]` / `else[]` arrays) / `match-stmt` / etc., NOT
     the ESTree-shaped `VarDecl` / `If` / `Match` natives). Translation is
     N×M (N native kinds × M live kinds with non-trivial mappings).
  4. For ExprNode payloads: the native Expr AST (37 kinds) is structurally
     different from the live pipeline's ESTree decorations. Every Binary /
     Logical / Conditional / Member / Call / etc. would need ESTree shape
     synthesis (`type: "BinaryExpression"`, `operator`, `left`, `right`,
     `loc`, etc.) — and the downstream consumers (codegen `emit-expr.ts`,
     the type-system unifier) walk ESTree node types by string equality.
  5. The hoisted collections (`imports`, `exports`, `components`,
     `typeDecls`, `machineDecls`, `channelDecls`) — the native parser does
     not produce these as top-level arrays at all. The bridge would need
     its own `collectHoisted` analogue.
  6. The span table, the auth/middleware extraction, the PGO `has*` flags
     — each adds its own walk.

  Cost estimate: **70-90h.** Plus the translation layer becomes a
  permanent maintenance surface — it has to track BOTH catalogs as they
  evolve, and it is exactly the scaffolding M6 is supposed to delete.
  Strategically wrong even if feasible.

- **(c) Refactor downstream stages to consume native AST directly** —
  **INFEASIBLE within the 16-36h budget; the most aligned with the M6
  goal but very expensive.** Every downstream stage (MOD / CE / UVB / PA /
  RI / MC / TS / META / VSS / DG / BP / RS / CG — 13 stages, plus the ~50
  `emit-*.ts` codegen modules) reads the live FileAST shape. A direct
  refactor would touch:
  - The kind dispatch in every stage (e.g., switch on `node.kind === "markup"`
    becomes `node.kind === "Markup"` — case-renames at minimum).
  - The attribute value union — `attrs[].value.kind === "expr"` access
    patterns disappear without a native attr-tokenizer.
  - The ESTree expression consumers — every codegen emit module that calls
    into the Acorn ESTree shape would need to swap to the native Expr AST.
  - The hoisted-collections consumers — MOD / CE / RI all walk `ast.imports`
    and `ast.exports` directly.

  Cost estimate: **150-250h.** This is the M6 budget, not the M5 budget.

## Recommendation — surface to PA

**M5 as specified — a feature-flagged opt-in pipeline swap where downstream
stages consume the native parser's output — is NOT a 16-36h dispatch.** The
divergence between the native parser's current output (a JS-only Stmt[] from
`parseProgram` + a flat markup block-stream from `parseMarkup`) and the
live pipeline's `FileAST` is too wide. The native parser today does not
produce most of what downstream stages need:

- No `attrs[]` on markup blocks (no markup-attribute tokenization).
- No ESTree expression decorations on attribute values.
- No hoisted `imports` / `exports` / `components` / `typeDecls` /
  `machineDecls` / `channelDecls` arrays.
- No span table, no auth/middleware extraction, no PGO `has*` flags.
- A flat block-stream instead of the rich ASTNode union.
- A separate Expr AST catalog incompatible with downstream ESTree consumers.

The M4.3 conformance close was a JS-subset bound + a no-throw .scrml smoke;
the corpus-gating proof was that the parser does not CRASH on the corpus,
not that it produces an equivalent AST.

## What M5 could realistically be — surface to PA before proceeding past M5.1

**Option M5-LIGHT — flag-gated PARSE-ONLY swap with downstream STILL on
live AST.** Scope:

1. Add the `--parser=scrml-native` CLI flag (Phase M5.3 wiring).
2. When set, the native parser runs ALONGSIDE the live BS+TAB+BPP, and a
   conformance shadow runs: the native parser parses the same source and
   its diagnostics + body shape are compared against the live AST and
   reported (already in place via `parser-conformance-corpus.test.js`).
3. The flag does NOT route downstream stages through the native parser.
   The compile path stays on the live pipeline. The flag's effect is
   **observability only** — adopters who set it see native-parser
   diagnostics in their build output alongside the live diagnostics.
4. M5 deliverable becomes: "the native parser is observably available as
   an opt-in parallel run; the M6 pipeline swap is unblocked once the
   downstream-bridge work lands."

   Cost estimate: **6-12h.** Inside the brief's safety budget.

**Option M5-FULL — defer until the downstream-bridge work is decomposed.**
Scope: defer M5 entirely, and run a NEW dispatch chain (M4.5 or "MD" — a
"downstream bridge" milestone) that:

1. Decomposes the live FileAST consumption into per-stage contracts.
2. For each stage, either (a) refactors the stage to consume the native
   AST or (b) extends the native parser to produce the slice of FileAST
   that stage needs.
3. The M-ladder gains MD.1 (attrs + tokenizedAttrs in markup), MD.2
   (ESTree-decorated expression bridging), MD.3 (hoisted collections), MD.4
   (span table + PGO flags), MD.5 (auth/middleware + state/sql/css/error/
   meta payloads). Each MD sub-step is an independent dispatchable.
4. M5 (the flag-gated swap) runs AFTER MD.5 completes.

   Cost estimate for MD ladder: **90-180h** (full downstream bridge);
   M5 then runs at 8-16h once MD is closed.

Either path is consistent with the brief's safety qualifier: "If approach
(c) — refactor downstream — total may exceed 36h; surface to PA before
proceeding past Phase M5.1."

## Concrete artifacts this dispatch should land

Per the brief's gates, this dispatch lands:

1. **This document** (M5-ast-bridge-scoping.md) — the M5.1 scoping verdict.
2. **(A path forward) Option M5-LIGHT skeleton** — the `--parser=scrml-native`
   CLI flag wired as an observability flag. The flag is RECOGNIZED;
   `compileScrml` accepts it as an option; the native parser runs as a
   shadow when the flag is set. No downstream routing.
3. **A divergence ledger** for the .scrml corpus — what the native parser
   parses cleanly (per the M4.3 no-throw smoke) vs what the live pipeline
   sees as a divergence. This already exists in
   `parser-conformance-corpus.test.js`; the M5 deliverable cites it.
4. **Roadmap update** — §3 row for M5 marked "M5.1 scoping complete;
   M5.2-M5.5 deferred pending PA decision on M5-LIGHT vs M5-FULL/MD
   ladder."

## Tags

#scrmlts #m5 #m5-1 #native-parser #ast-bridge #scoping #cost-extension

## Links

- [IMPLEMENTATION-ROADMAP.md](../../docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md)
- [scrml-native-parser-design-2026-05-17.md](../../../scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md)
- [scrml-native-parser-front-end-charter-2026-05-20.md](../../../scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md)
- [compiler/native-parser/README.md](./README.md)
- [compiler/src/ast-builder.js](../src/ast-builder.js)
- [compiler/src/api.js](../src/api.js)
- [compiler/tests/parser-conformance-corpus.test.js](../tests/parser-conformance-corpus.test.js)
