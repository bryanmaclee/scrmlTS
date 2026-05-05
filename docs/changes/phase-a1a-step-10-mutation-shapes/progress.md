# Phase A1a Step 10 — MemberCall / MemberAssignment / UnaryDelete shape verification — Progress

Branch: `phase-a1a-step-10-mutation-shapes`
Parent baseline HEAD: `fded36a` (a1a-step-9 reset(@cell) keyword)
Test baseline: 8,812 pass / 43 skip / 0 fail / 8,855 across 437 files.

## Survey notes

[startup step-10] Worktree clean. `bun install` + `bun run pretest` complete.
Baseline `bun run test` re-run after first-run flake (2 ECONNREFUSED → 0) →
**confirmed 8,812 pass / 43 skip / 0 fail / 8,855 across 437 files**. Branch
`phase-a1a-step-10-mutation-shapes` created off `fded36a`.

[step-10 survey-ast-types] `compiler/src/types/ast.ts` survey:
  - **No `MemberCall`, `MemberAssignment`, `UnaryDelete` AST kinds exist.**
    scrml uses an ESTree-style flattened representation:
      • Method call on member  → `kind: "call"` with `callee: MemberExpr`
      • Member assignment      → `kind: "assign"` with `target: MemberExpr | IndexExpr`
      • Index assignment       → `kind: "assign"` with `target: IndexExpr`
      • Delete                 → `kind: "unary"` with `op: "delete"` and `argument: MemberExpr | IndexExpr`
  - The `op` field is **already present** on `AssignExpr` (line 1396) covering
    every assignment operator A1b needs:
    `"=" | "+=" | "-=" | "*=" | "/=" | "%=" | "**=" | "&&=" | "||=" | "??=" | "&=" | "|=" | "^=" | "<<=" | ">>=" | ">>>="`.
  - The `op` field is also already present on `UnaryExpr` (line 1346) covering
    `"delete"` as one of its valid operator strings.
  - Property names: `MemberExpr.property` is `string` (static); `IndexExpr.index`
    is `ExprNode` (computed). The split distinguishes `.foo` vs `[0]` cleanly.
  - Per AST-CONTRACTS-AND-DECOMPOSITION §1.5: "shape preservation only" —
    aligned with what we found. No new fields required, no rename required.

[step-10 survey-parser] `compiler/src/expression-parser.ts` `esTreeToExprNode`
translator (line 843+) survey:
  - `case "AssignmentExpression"` (line 1010): emits `{kind:"assign", op, target, value}`
    with `op = node.operator` (ESTree's `operator` is mapped to scrml's `op`).
  - `case "UnaryExpression"` (line 956): emits `{kind:"unary", op, argument, prefix}`
    where `op` is the ESTree `operator` string. Includes `"delete"` in the
    `validOps` allowlist (line 959).
  - `case "MemberExpression"` (line 1033): emits `{kind:"member", object, property}`
    for static access OR `{kind:"index", object, index}` for computed access.
  - `case "CallExpression"` (line 1057): emits `{kind:"call", callee, args}`;
    when callee is a member-access, the `callee` field is itself a `kind:"member"`
    or `kind:"index"` node — so member calls have the structure A1b needs.

[step-10 smoke-test-confirmed] Smoke-tested all eight target shapes via
`bun -e ...`. Every one produces the expected structure:
  - `@arr.push(x)`               → call(callee=member(@arr,"push"), args=[x])
  - `@obj.foo = x`               → assign(op="=", target=member(@obj,"foo"))
  - `@obj.foo += 1`              → assign(op="+=", target=member(@obj,"foo"))
  - `@arr[i] *= 2`               → assign(op="*=", target=index(@arr,i))
  - `@arr.length = 0`            → assign(op="=", target=member(@arr,"length"))
  - `delete @obj.foo`            → unary(op="delete", argument=member(@obj,"foo"))
  - `delete @arr[i]`             → unary(op="delete", argument=index(@arr,i))
  - `@form.errors.push(...)`     → call(callee=member(member(@form,"errors"),"push"))
  - `arr.push(1)` (negative)     → call(callee=member(ident("arr"),"push")) — name has NO `@`

[step-10 a1b-discriminator] **Can A1b discriminate `@arr.push(x)` from `localArr.push(x)`
via AST shape alone? — YES.** The `@` prefix is preserved verbatim in
`ident.name` (e.g., `name === "@arr"` vs `name === "arr"`). For nested receivers
like `@form.errors.push(...)`, A1b walks `callee.object` chain until it reaches
an `ident` node and checks `name.startsWith("@")`. This is the canonical scrml
convention (L2). The discriminator is purely string-shape on the existing
`ident.name` field; **no A1a parser work needed** to expose it.

[step-10 op-vs-operator] **Field name decision: scrml uses `op`, not `operator`.**
Already consistent across `UnaryExpr.op`, `BinaryExpr.op`, `AssignExpr.op`. ESTree's
`operator` is mapped to scrml's `op` at the `esTreeToExprNode` boundary. No rename
needed. The BRIEF text said "`op: string` MUST be on MemberAssignment" — this is
satisfied by `AssignExpr.op` since `MemberAssignment` is just `AssignExpr` with a
member-shaped target.

[step-10 conclusion] **Survey confirms: ZERO source changes required.** The parser
already produces correctly-shaped AST nodes for every form A1b's L21 walker needs:
  - **Form 1 (array mutating method)** → recognize via
    `node.kind === "call" && node.callee.kind === "member" && MUTATING_METHODS.includes(node.callee.property)`
  - **Form 2 (property write / compound-assign)** → recognize via
    `node.kind === "assign" && (node.target.kind === "member" || node.target.kind === "index")`
  - **Form 3 (delete)** → recognize via
    `node.kind === "unary" && node.op === "delete" && (node.argument.kind === "member" || node.argument.kind === "index")`

For each, A1b walks the receiver chain (`.object` traversal) to the leaf `ident`
and checks `name.startsWith("@")` to confirm the receiver is a reactive-cell
reference, then resolves whether that cell is `const`-derived (A1b's symbol-table
work).

This is the **7th confirmed depth-of-survey discount occurrence**:
  1. S51 W2 (LSP canonical-key)
  2. S52 DD4 (SPEC §54.2-§54.3 extension-point)
  3. S59 Step 2 (block-splitter raw `<` preservation)
  4. S59 documentary-attrs (codegen/index.ts:530 not emit-html.ts)
  5. S60 Step 6 (KEYWORD-vs-IDENT)
  6. S60 Step 7 (regex-driven parser)
  7. S60 Step 9 (acorn post-processing)
  8. **S60 Step 10 (ESTree-passthrough discount — confirmed today)**

This step is now per BRIEF §3 a "verify + add tests" pass. T1 by tier rule
(zero source changes; tests-only addition).

[step-10 survey-ast-builder-specialization] Additional survey finding —
ast-builder applies SPECIALIZED LOWERINGS for two of the eight target shapes
when they appear in statement position inside a logic block:

| Source shape                              | ast-builder body-node kind         | Discriminator path |
|-------------------------------------------|------------------------------------|--------------------|
| `@arr.push(1)`                            | `reactive-array-mutation` (specialized — single-seg ARRAY_MUTATIONS list) | direct fields: `target`, `method`, `args` |
| `@obj.foo = x`  (simple `=`)              | `reactive-nested-assign` (specialized — only `=`, not compound) | direct fields: `target`, `path`, `value` |
| `@arr.length = 0` (simple `=`)            | `reactive-nested-assign` | direct fields |
| `@obj.foo += 1` (compound)                | `bare-expr` (NOT specialized) | walk into `exprNode.kind: "assign"`, `op: "+="` |
| `@arr[0] = "x"` (computed index)          | `bare-expr` (NOT specialized) | walk into `exprNode.kind: "assign"` with `target.kind: "index"` |
| `delete @obj.foo`                         | `bare-expr` (NOT specialized) | walk into `exprNode.kind: "unary"`, `op: "delete"` |
| `delete @arr[i]`                          | `bare-expr` (NOT specialized) | walk into `exprNode.kind: "unary"`, `op: "delete"`, `argument.kind: "index"` |
| `@form.errors.push(...)` (nested receiver)| `bare-expr` (NOT specialized — ARRAY_MUTATIONS only fires for single-seg) | walk into `exprNode.kind: "call"`, `callee.kind: "member"` |
| `arr.push(1)` (no `@`)                    | `bare-expr` | walk into `exprNode.kind: "call"`, `callee.object.name === "arr"` (no `@`) |

ast-builder.js source: `compiler/src/ast-builder.js` lines 3503-3573 (the AT_IDENT
branch in the body-statement parser). The specialization is in two narrow conditions:
  - `reactive-array-mutation` requires `pathSegments.length === 1 && ARRAY_MUTATIONS.includes(lastSeg) && peek().text === "("` (line 3531).
  - `reactive-nested-assign` requires `peek().text === "=" && peek(1)?.text !== "="` (line 3555 — simple `=` only, NOT compound).

**Implication for A1b:** the L21 walker has TWO discrimination paths — direct
field access on specialized kinds (`reactive-array-mutation`, `reactive-nested-assign`)
AND structural walk into `bare-expr.exprNode` for compound-assigns / delete /
nested-receiver method calls. **All five A1b discriminators are satisfied by
the existing AST shapes** with no further parser work. The compound-receiver
case `@form.errors.push(...)` correctly preserves the `@` prefix at the leaf
ident in the chained-member callee, so A1b can walk `callee.object` chain to
the leaf and check `name.startsWith("@")`.

[step-10 conclusion] **Survey confirms: ZERO source changes required.** The parser
+ ast-builder already produce correctly-shaped AST nodes for every form A1b's L21
walker needs. The test file will exercise BOTH discrimination paths:

  - Specialized-kind path: `reactive-array-mutation` (direct `@arr.push`),
    `reactive-nested-assign` (simple `@obj.foo = x`)
  - Bare-expr path: `bare-expr.exprNode.kind === "assign"` with compound op,
    `bare-expr.exprNode.kind === "unary"` with delete, `bare-expr.exprNode.kind === "call"`
    with member callee for nested receivers.

This is the **8th confirmed depth-of-survey discount occurrence**:
  1. S51 W2 (LSP canonical-key)
  2. S52 DD4 (SPEC §54.2-§54.3 extension-point)
  3. S59 Step 2 (block-splitter raw `<` preservation)
  4. S59 documentary-attrs (codegen/index.ts:530 not emit-html.ts)
  5. S60 Step 6 (KEYWORD-vs-IDENT)
  6. S60 Step 7 (regex-driven parser)
  7. S60 Step 9 (acorn post-processing)
  8. **S60 Step 10 (ESTree-passthrough + specialized-lowering double layer — confirmed today)**

Note for primer #12: the discount survey itself surfaced an unanticipated extra
layer (the `reactive-array-mutation` / `reactive-nested-assign` specialized
lowerings in ast-builder.js, distinct from the expression-parser ESTree-pass-through).
A1b will need to be aware of both. This is exactly the "actual surface area is
different from what the brief named" pattern §12 calls out, but at finer
granularity — the brief was right about the shapes, but the realities of where
those shapes are produced (parser vs ast-builder) are split. **Logged as
deferred A1b documentation note: A1b's L21 walker spec must enumerate both
discrimination paths.** No A1a action needed.

This step is per BRIEF §3 "verify + add tests" — T1 by tier rule (zero source
changes; tests-only addition).

## Plan

1. NO source changes. AST shapes verified across both expression-parser and ast-builder layers.
2. Add `compiler/tests/integration/parse-mutation-shapes.test.js` with the §M10.1-§M10.8
   cases per BRIEF §4. Aim 8-10 tests. Tests assert at the body-node level (where A1b
   will walk), exercising BOTH the specialized-kind path AND the bare-expr.exprNode path.
3. Run `bun run test`. Confirm 0 regressions, +8 to +10 pass delta.
4. Final commit: `compile(a1a-step-10): mutation shape verification — N tests added; zero source changes (depth-of-survey discount #8)`.

## Implementation log

[step-10 tests-added] `compiler/tests/integration/parse-mutation-shapes.test.js`
created with 10 cases (BRIEF §4 specified §M10.1-§M10.8 = 8 minimum; rounded to
10 to also exercise `delete @arr[i]` computed-index form and `??=` logical-
compound assign on chained member). All 10 cases pass first try
(`bun test compiler/tests/integration/parse-mutation-shapes.test.js`:
10 pass / 0 fail / 96 expect()).

  Cases summary:
  - §M10.1: `@arr.push(1)` — specialized `reactive-array-mutation` lowering
  - §M10.2: `@obj.foo = 1` — specialized `reactive-nested-assign` lowering
  - §M10.3: `@obj.foo += 1` — bare-expr; exprNode.kind=assign, op=+=
  - §M10.4: `@arr[0] = "x"` — bare-expr; exprNode.target.kind=index
  - §M10.5: `@arr.length = 0` — specialized `reactive-nested-assign` (path=[length])
  - §M10.6: `delete @obj.foo` — bare-expr; exprNode.kind=unary, op=delete
  - §M10.7: `@form.errors.push(@form.errors.length)` — bare-expr; chained-member callee preserves @form leaf
  - §M10.8: `arr.push(1)` (negative — no @) — bare-expr; leaf.name has NO @-prefix
  - §M10.9: `delete @arr[i]` — bare-expr; exprNode.argument.kind=index (computed)
  - §M10.10: `@form.config.mode ??= "default"` — bare-expr; exprNode.op=??= on chained member

[step-10 final-test-run] `bun run test` after tests added:
**8,822 pass / 43 skip / 0 fail / 8,865 across 438 files.** Delta from baseline:
+10 pass (within BRIEF target of +6 to +10). Test file count: +1
(parse-mutation-shapes.test.js). 0 regressions. One ECONNREFUSED flake on the
single run; result is the post-flake authoritative number (the flake retries
internally per the harness).

## Final summary

**Files modified (0):** Step 10 is verification-only.

**Files added (1):**
  - `compiler/tests/integration/parse-mutation-shapes.test.js` (+10 tests / 96 expect()).

**Branch:** `phase-a1a-step-10-mutation-shapes`.

**Test delta:** 8,812 → 8,822 (+10) pass; 43 skip stable; 0 fail; 0 regressions.

**Self-host parity:** N/A — Step 10 is parser verification only; no source
change, no codegen change. The compiled JS for any sample is bit-for-bit
identical to pre-Step-10.

**Survey conclusion (per BRIEF §3):**
  - **Three target shapes are ALREADY correctly produced** by the parser
    (`call` with member callee, `assign` with member/index target + `op`,
    `unary` with `op: "delete"` and member/index argument). No new AST kinds
    introduced; no field renames.
  - **`op` field decision** — scrml uses `op` (not ESTree's `operator`).
    Already consistent across `UnaryExpr.op`, `BinaryExpr.op`, `AssignExpr.op`.
    The boundary mapping happens at `esTreeToExprNode` per acorn-source
    (`expression-parser.ts:957, 1011`).
  - **A1b discrimination is fully supported.** `@`-prefix is preserved verbatim
    in the leaf `ident.name`; A1b walks the receiver chain (`callee.object`
    or `target.object` or `argument.object` — depending on shape) to the leaf
    and checks `name.startsWith("@")`.
  - **Two-layer lowering** — ast-builder applies specialized lowerings for
    two narrow forms (`reactive-array-mutation` for direct `@name.method(...)`
    and `reactive-nested-assign` for simple `@obj.path = val`). Other forms
    flow through `bare-expr` with full ExprNode preserved on `exprNode`.
    A1b's L21 walker MUST handle BOTH paths: direct field access on
    specialized kinds + structural walk into `bare-expr.exprNode`.

**Deferred to A1b (per BRIEF §2.2):**
  - L21 firing on `const`-derived cells. A1b will:
    1. Walk every body node in every logic block.
    2. For specialized `reactive-array-mutation` and `reactive-nested-assign`
       nodes, look up `target` in the symbol table; if `const`-derived, fire
       E-DERIVED-VALUE-MUTATE.
    3. For `bare-expr` nodes, walk into `exprNode`:
       - `kind === "assign"` and `target.kind === "member" | "index"` → walk
         `target` chain to leaf ident; if `@<derived>`, fire E-DERIVED-VALUE-MUTATE.
       - `kind === "unary" && op === "delete"` and `argument.kind === "member" | "index"`
         → walk `argument` chain to leaf ident; if `@<derived>`, fire E-DERIVED-VALUE-MUTATE.
       - `kind === "call"` and `callee.kind === "member"` and `callee.property`
         is in §6.5.1 mutating-methods list → walk `callee` receiver chain
         to leaf ident; if `@<derived>`, fire E-DERIVED-VALUE-MUTATE.
  - Compound-derived sub-cell rule (§6.6.18 case 3): for compound shapes,
    A1b resolves `@compound.field` through the compound's child symbol table
    to determine if `field` is itself `const`-derived.
  - Symbol-table extension to mark cells as `isConst: true` (already present
    on state-decl nodes per Step 4 work).

**Anomaly check:** Test delta exactly matches plan. No unexpected behavioral
changes. New test file is the only addition. No source modifications.

**Path-discipline near-misses:** None. All Reads/Writes used absolute paths
under WORKTREE_ROOT (`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a0bbfcabb721cc931/...`).
Verified pwd at startup; confirmed git toplevel matches.

## Tags

#phase-a1a #step-10 #mutation-shapes #L21-precursor #expression-parser
#ast-builder #reactive-array-mutation #reactive-nested-assign #bare-expr
#depth-of-survey-discount-8 #zero-source-changes #verification-only
#spec-6-6-18 #ast-contract-1-5

## Links

- Brief: `docs/changes/phase-a1a-step-10-mutation-shapes/BRIEF.md`
- AST contract §1.5: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` lines 76-78
- SPEC §6.6.18: `compiler/SPEC.md` lines 3040-3132 (E-DERIVED-VALUE-MUTATE / L21)
- SPEC §6.6.8: `compiler/SPEC.md` (sibling rule E-DERIVED-WRITE for reassignment)
- SPEC §34: `compiler/SPEC.md` line 14193 (E-DERIVED-VALUE-MUTATE catalog entry)
- AST type definitions:
  - `compiler/src/types/ast.ts:1346-1356` (`UnaryExpr` with op including "delete")
  - `compiler/src/types/ast.ts:1395-1404` (`AssignExpr` with `op` field)
  - `compiler/src/types/ast.ts:1425-1453` (`MemberExpr`, `IndexExpr`, `CallExpr`)
- Parser ESTree → ExprNode translator:
  - `compiler/src/expression-parser.ts:956-967` (`UnaryExpression` case → `op`)
  - `compiler/src/expression-parser.ts:1010-1022` (`AssignmentExpression` case → `op`)
  - `compiler/src/expression-parser.ts:1033-1048` (`MemberExpression` case → `member`/`index`)
- AST-builder specialized lowerings:
  - `compiler/src/ast-builder.js:3528-3552` (`reactive-array-mutation`)
  - `compiler/src/ast-builder.js:3554-3567` (`reactive-nested-assign`)
- Step 9 predecessor: commit `fded36a` (`reset(@cell)` keyword + E-RESET-NO-ARG)
- Tests added: `compiler/tests/integration/parse-mutation-shapes.test.js`
- Predecessor lesson: depth-of-survey discount §12 of PA-SCRML-PRIMER (now 8th
  confirmed occurrence — the discount applied to a brief that already
  anticipated "no work needed" but also revealed an unanticipated extra layer
  in ast-builder).
</content>
</invoke>