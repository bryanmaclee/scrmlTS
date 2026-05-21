# progress-R2 — declaration hoist gap (collect-hoisted typeDecls/components/machineDecls)

Append-only. Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5475441166c55763`

## 2026-05-21 — startup

- Startup verification passed: worktree root confirmed, `git merge main --no-edit`
  fast-forwarded `8c9d855b -> 46a2a558`, tree clean, `bun install` ok,
  `bun run pretest` ok.
- Read BRIEF-R2 + M5-SWAP-residual-decomposition Unit R2 in full.

## 2026-05-21 — investigation

- Read live `collectHoisted` (ast-builder.js L11904) — the behavioral contract.
  `typeDecls`/`components` come from the pre-filtered arrays cached on each
  `logic` node + the `meta.body` walk; `machineDecls` from `engine-decl` AST
  nodes (children of markup/program), recursing `bodyChildren`.
- Read live AST shapes (ast.ts): `TypeDeclNode{name,typeKind,raw}`,
  `ComponentDefNode{name,raw}`, `EngineDeclNode{engineName,governedType,...}`.
- Probed the native parser (`parseMarkup`) against type/engine/component
  exemplars. Findings:
  - `<engine for=T>` → clean `Markup` block, `name:"engine"`,
    `tagKind:"ScrmlStructural"`, `attrs` carries `for=`. RECOGNIZABLE via (b).
  - legacy `<machine for=T>` → `Markup` block, `name:"machine"`,
    `tagKind:"Html"` (not in structural registry), `tagClass:"Markup"`.
    RECOGNIZABLE via (b) by `name === "machine"`.
  - `const Card = <div>...` → clean `VarDecl{declKind:"const",
    declarations:[{target:{name:"Card"}, init:{kind:"MarkupValue"}}]}`.
    RECOGNIZABLE via (b): uppercase-initial const name + `MarkupValue` init.
  - `type Name : kind = {...}` → **MIS-PARSED**. `type` is NOT a native keyword
    token (absent from `JS_KEYWORDS` in token.js). It lexes as an `Ident`, so
    `type DutyStatus : enum = {...}` parses as `ExprStmt{Ident:"type"}` +
    `Labeled{label:"DutyStatus", body: Assignment{target:Ident"enum", ...}}`.
    The `type Alias = number` form parses as `ExprStmt{Ident:"type"}` +
    `ExprStmt{Assignment}`. The `export type ...` form parses as
    `Export{declaration:null, specifiers:[]}` — the type is DROPPED entirely.
  - Same `type` mis-parse inside `^{...}` Meta blocks.

## 2026-05-21 — ESCALATION (soft-escalation gate)

Approach (b) is FEASIBLE for engine + component (clean recognizable shapes)
but INFEASIBLE for `type-decl`: the native parser has no `type` keyword
production, so there is no reliable block-stream signal to recognize — only
accidental, form-dependent `ExprStmt`/`Labeled` garbage, and `export type`
loses information. Recognizing `type` from `collectHoisted` would be a
fragile heuristic that mis-classifies legitimate `type`-named identifiers and
cannot recover the `export type` case at all.

`auth-graph.ts` enumerates `:enum` declarations from `FileAST.typeDecls` — so
an empty/wrong `typeDecls` is a real auth-routing correctness regression, not
cosmetic. Closing the `type` slice requires a native `type` production
(lexer keyword + TokenKind + StmtKind + ast-stmt factory + parse-stmt dispatch
+ `export type` interaction + `.scrml` mirrors + tests) — materially larger
than R2's "extend collectHoisted" framing and coupled to R1 (statement
catalog) + R4 (§34 diagnostics for a `type` keyword).

## 2026-05-21 — escalation finding WIDENED (all three collections)

Deeper consumer audit shows the gap is NOT type-only — it is the same
structural problem across all three collections. The R2 gap is a
declaration-shape SYNTHESIS gap, not a recognition gap:

- `machineDecls` consumers — `emit-engine.ts`, `type-system.ts`
  (`buildMachineRegistry`), `reactive-deps.ts` — expect full `EngineDeclNode`
  shapes (~14 fields: `engineName`, `governedType`, `rulesRaw`, `bodyChildren`,
  `sourceVar`, `varName`, `initialVariant`, `pinned`, `legacyMachineKeyword`,
  ...). The native parser produces an engine as a plain `Markup` block
  (`name:"engine"`, `attrs`, `children`, `tagClass`). Recognizing the block is
  trivial; SYNTHESIZING a faithful `EngineDeclNode` from it (attr parsing for
  for=/var=/name=/initial=/pinned, `rulesRaw` from child source,
  `bodyChildren`) is substantial per-kind production work.

- `components` — `component-expander.ts`'s `normalizeTokenizedRaw` expects
  `component-def.raw` in the LIVE ast-builder `collectExpr()` tokenized form
  (space-joined logic tokens: `< tagname attr = "v" >`). The native parser
  yields verbatim source via `LogicEscape.bodyText.substring(span)` — a
  different `raw` contract. Recognizing the `const Card = <markup>` VarDecl is
  clean; producing the consumer-expected `raw` is not a drop-in.

- `typeDecls` — `auth-graph.ts` enumerates `:enum` decls from it. The native
  parser has NO `type` keyword (absent from `JS_KEYWORDS`); `type` decls
  mis-parse into accidental `ExprStmt`/`Labeled` shapes and `export type`
  drops the type entirely. No reliable block-stream signal exists.

CONCLUSION: the decomposition's "(b) is lighter, M6-neutral" rests on a
recognition-vs-synthesis conflation. The recognition part is light; the
shape-synthesis part is the real cost and is the SAME whether done inside
`collectHoisted` (b) or as native declaration productions (a). Both paths
materially exceed the 10-16h R2 framing and couple into R1 (the `type`
keyword is a statement-catalog concern), R3 (the adapter could re-parse
`LogicEscape.bodyText` through the live logic parser as an alternative), and
R4 (a native `type` keyword needs a §34 diagnostic story).

PER THE SOFT-ESCALATION GATE: STOPPED before committing to either the
(b)-with-full-synthesis path or the (a) native-production path. No
`collectHoisted` code written — writing speculative synthesis for one
collection would presume a re-scope decision that is PA's. Reporting to PA
for re-scope. Recommended framing in the final report.
