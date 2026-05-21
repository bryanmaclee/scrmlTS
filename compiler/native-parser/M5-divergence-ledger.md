# M5 divergence ledger

S114-M5.4 conformance close — what the native parser parses cleanly under
`--parser=scrml-native` today, and what diverges from the live pipeline.

## Scope

At M5.1 close the `--parser=scrml-native` flag is observability-only — the
live BS+TAB+BPP pipeline still produces the FileAST consumed by downstream
stages. There is no "native pipeline output" to diff against the live output
at this milestone (no downstream routing has occurred). The divergence ledger
below documents what the native parser CAN parse today (per the
M4.3 conformance close + MK4 markup↔JS seam close, S114) and what the M5-FULL
follow-up dispatch will need to bridge to make a real swap possible.

## What the native parser produces today (S114 HEAD = `11e2ddf`)

| Surface | Native-parser output | Test harness |
|---|---|---|
| JS expressions | `Expr` AST (`ast-expr.js`, 37 ExprKind variants) | `parser-conformance-expr.test.js` — Tier 1+2 PASS vs Acorn (M2.1-M2.4: 614+ tests) |
| JS statements | `Stmt[]` from `parseProgram(tokens, source)` (`ast-stmt.js`, 20 StmtKind variants) | `parser-conformance-stmt.test.js` — Tier 1+2 PASS vs Acorn (M3.1-M3.4: 499+ tests) |
| Bounded JS subset | parses cleanly at RAW source (no preprocess shim) | `parser-conformance-corpus.test.js` BENCH: 12 fixtures, 0 diagnostics |
| Markup blocks (flat tree) | `BlockNode[]` from `parseMarkup(source)` (11 BlockKinds) | `parser-conformance-markup.test.js` — tier 1+2 strict for the markup-interleaved cases at MK4 |
| Markup↔JS seam | `LogicEscape` body parses to Stmt[]; `parsePrimary` LessThan discriminates markup-value vs less-than-operator | `parser-conformance-markup.test.js` MK4 §63-§66 + parser-conformance-expr.test.js MK4 §1-§5 |
| .scrml corpus (no-throw) | crash-free over the corpus (~900 files); diagnostics are EXPECTED and informational | `parser-conformance-corpus.test.js` SCRML: smoke pass; per-file diagnostic count recorded |

## What the live pipeline produces that the native parser does NOT

(From M5-ast-bridge-scoping.md — abridged here for the ledger's purposes.)

| Surface | Live FileAST | Native parser |
|---|---|---|
| Top-level shape | `{ filePath, ast: FileAST, errors }` with ~30-kind ASTNode union | Flat block-stream + separate Expr / Stmt ASTs (3 unconnected catalogs) |
| Markup `attrs[]` | rich 6-variant value union (string-literal / variable-ref / call-ref / expr / props-block / absent) + tokenized values | NOT produced — only opener-text span and `name` |
| Expression decorations | full Acorn ESTree (typed BinaryExpression/MemberExpression/etc.) on every ExprAttrValue / IfChainExpr / BareExprNode | Native ExprKind variants — structurally different from ESTree |
| Hoisted collections | `imports`, `exports`, `components`, `typeDecls`, `machineDecls`, `channelDecls` — top-level arrays derived via `collectHoisted` | NOT produced — no top-level hoisting walk |
| Span table | `spans: SpanTable` nodeId→Span | Span on each node directly (no centralized table) |
| PGO `has*` flags | `hasProgramRoot` / `hasResetExpr` / `hasEqualityExpr` / `hasChunkedMarkupTag` / `hasForStmt` — cached at TAB time | NOT produced |
| `<program>` extraction | `authConfig` + `middlewareConfig` from `<program>` attrs | NOT produced (no attr parse) |
| State block / state-constructor-def | typed `state` nodes + constructor tracking | NOT produced |
| SQL chained calls | `chainedCalls[]` on sql nodes | Text body only (MK1.3 sketch-depth) |
| CSS declarations / rules / reactive refs | full CSS AST under `css-inline` / `style` | Text body only (MK1.3 sketch-depth) |
| Error-effect arms | `arms[]` (typed ErrorArm union) | Sketch-depth dispatcher only |
| Meta block payload | typed metadata | Sketch-depth dispatcher only |
| Forbidden-switch detection | inline TAB emit + post-walker structural sweep | NOT implemented |

## What lands AT M5.1 close (this dispatch)

1. **`--parser=scrml-native` CLI flag** wired end-to-end:
   - `cli.js` help surfaces the flag under compile/dev options.
   - `commands/compile.js` parses both `--parser=scrml-native` and
     `--parser scrml-native` forms; rejects other values with a clean error.
   - `api.js`'s `compileScrml` accepts a `parser` option; when set to
     `"scrml-native"`, appends one **I-PARSER-NATIVE-SHADOW** info diagnostic.
2. **The I-PARSER-NATIVE-SHADOW diagnostic** is the observable proof the flag is
   recognized and threaded through. It carries the M5.1 scoping-doc citation
   so adopters who set the flag see the milestone-bounded explanation
   inline with their build output.
3. **M5-ast-bridge-scoping.md** — the cost-extension surfaced to PA;
   recommends M5-LIGHT (observability shadow, this dispatch) over M5-FULL
   (full pipeline swap, requiring 70-250h+ MD-ladder dispatch).
4. **This ledger** — captures what would need to be bridged to make a real
   swap feasible.
5. **Test posture** — zero regression vs v0.4 baseline (13358/0/92/1).

## What does NOT land at M5.1 close

- Real native-parser routing through downstream stages. Setting the flag
  changes only the observability surface; the live pipeline still runs.
- A native-pipeline parallel test run. The test suite still drives the live
  pipeline; the native-parser conformance harnesses
  (`parser-conformance-{expr,stmt,markup,lexer,corpus}.test.js`) drive the
  native parser directly and gate at the JS-subset bound.
- M6 work — BS / Acorn / BPP source-file deletion, flag retirement,
  `import:host` form, JS-parser-in-`^{}` retirement (per the brief's
  out-of-scope list).

## The M5-FULL or MD-ladder path

When PA decides to invest the 90-180h+ for the downstream bridge, the
MD-ladder decomposition surfaced in M5-ast-bridge-scoping.md is:

- **MD.1** — attrs[] + tokenizedAttrs in markup blocks (native attr
  tokenizer). 20-30h.
- **MD.2** — ESTree-decorated expression bridging on attribute values
  (native ↔ ESTree translation layer for expression payloads). 25-35h.
- **MD.3** — hoisted collections (imports / exports / components / typeDecls /
  machineDecls / channelDecls walked from the native block-stream). 15-20h.
- **MD.4** — span table + PGO `has*` flags. 10-15h.
- **MD.5** — state / sql / css / error / meta block payloads (the rich
  per-block payloads currently sketch-depth). 20-30h.
- **M5** (re-entered after MD.5) — `--parser=scrml-native` swaps in real
  routing. 8-16h.

Total MD + M5 = 98-146h optimistic; 150-180h with integration risk.

## Tags

#scrmlts #m5 #m5-1 #m5-3 #m5-4 #m5-light #native-parser #divergence-ledger #observability-shadow

## Links

- [M5-ast-bridge-scoping.md](./M5-ast-bridge-scoping.md)
- [IMPLEMENTATION-ROADMAP.md](../../docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md)
- [compiler/native-parser/README.md](./README.md)
- [compiler/tests/parser-conformance-corpus.test.js](../tests/parser-conformance-corpus.test.js)
- [scrml-native-parser-design-2026-05-17.md](../../../scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md)
