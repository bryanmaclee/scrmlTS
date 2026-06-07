# Native BlockStub verbatim-body recovery (Wave 2)

Change-id: native-blockstub-verbatim-body-2026-06-07
WORKTREE: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-adfbdbc41fd7881dd
Base: 5a346faa (Wave 1 swap fix)

## 2026-06-07 — startup + analysis
- Startup verification PASS: worktree path ok, toplevel match, HEAD 5a346faa, tree clean, bun install ok, pretest ok.
- Maps: read primary.map.md in full. Native-parser routing confirms `.js` is the live file (`.scrml` FEATURE-stale, no re-sync). parseBlockStub is the M3 extension point.
- ROOT CAUSE confirmed:
  - reconstructArmBody (translate-expr.js:1120) returns literal "{}" for ANY BlockStub arm body → match block-arm statements DROPPED.
  - translateLambdaBody (translate-expr.js:872) returns {kind:"block",stmts:[]} for BlockStub lambda body → callback statements DROPPED.
- COORDINATE-SPACE verification:
  - parseBlockStub span = makeSpan(open.span.start, closeTok.span.end, ...) — the balanced `{...}` span, absolute in the body-slice coordinate space.
  - Logic bodies parse via parse-markup.js parseLogicBodyBestEffort: `lex(bodyText)` + `parseProgram(tokens, bodyText)` → tokens AND ctx.source share the bodyText origin. So ctx.source.slice(span.start, span.end) is consistent AT PARSE TIME (before the top-level span shift on parse-markup.js:702, which only shifts top-level stmt spans, not nested expr/BlockStub spans).
- DOWNSTREAM verification:
  - CONSUMER 1 (match arm): emit-control-flow.ts parseMatchArm captures `result = [\s\S]+`; isBlockBody detect (line 1815) `result.trimStart().startsWith("{") && endsWith("}")`; slices outer braces → rewriteBlockBody → real statement emission. So returning the balanced `{...}` verbatim gives byte-parity with live.
  - CONSUMER 2 (lambda): emit-expr.ts emitEscapeHatch branches on nativeKind === "ArrowFunctionExpression"/"FunctionExpression" → rewriteExprArrowBody(node.raw). rewriteExprArrowBody runs scrml→JS passes over the WHOLE lambda value `(params) => {...}`, NOT a bare `{...}`. So the EscapeHatch raw MUST be the FULL lambda source, not just body.verbatim. The brief's "raw = body.verbatim" is imprecise; live (expression-parser.ts:2166-2192) slices the WHOLE node. Right answer: stamp full-lambda verbatim on the Arrow/Function node at parse time (finishArrow / parseFunctionExpr, where the full span is computed and ctx.source is available).

## Plan
1. FOUNDATION: parseBlockStub stamps stub.verbatim = ctx.source.slice(span.start, span.end) (the balanced `{...}`).
2. FOUNDATION-2 (lambda): finishArrow / parseFunctionExpr stamp node.verbatim = ctx.source.slice(span.start, span.end) (the full lambda).
3. CONSUMER 1: reconstructArmBody returns body.verbatim for BlockStub bodies.
4. CONSUMER 2: translateLambdaBody (+ translateArrow/translateFunctionExpr) emit EscapeHatchExpr (nativeKind Arrow/Function-Expression) carrying raw = full-lambda verbatim.
5. Tests + self-verification + within-node reconcile.

## 2026-06-07 — implementation + self-verification
- Foundation committed (ef2af8ef): parseBlockStub + finishArrow/parseFunctionExpr stamp verbatim.
- Consumers implemented in translate-expr.js: reconstructArmBody returns body.verbatim; translateArrow/translateFunctionExpr emit EscapeHatchExpr via blockBodyLambdaEscapeHatch (nativeKind ArrowFunctionExpression/FunctionExpression, raw = full lambda verbatim).
- R26 probe: match-expr rawArms verbatim slice is BALANCED `{...}` — `.Mushroom(n) => { @coins = @coins + n }` — no off-by-one. Pattern reconstructs canonical `=>`.
- SELF-VERIFICATION (api temp-flip to native, full unit suite):
  - baseline (foundation-only, consumers stashed) native-flip unit fails: 265
  - first consumer pass: 250 fails BUT introduced 2 NEW failures (match-arm-block lift-markup arm bodies → E-CODEGEN-INVALID-JS "Unterminated regular expression" because `{ lift <p/> }` verbatim re-parsed as JS).
  - ROOT: native mis-routes a `${ match @x {...} }` markup-position match with `lift <markup>` arm bodies through match-EXPR (translate-expr reconstructArmBody) instead of match-BLOCK. Pre-existing native gap; my verbatim recovery turned silent-drop into a hard crash for that subset.
  - FIX: added blockStubIsRenderBody guard (KwLift token OR `<`-adjacent-Ident markup opener) in parseBlockStub + stampLambdaVerbatim — render bodies skip verbatim → fall back to `{}` (regression-neutral baseline). JS-statement bodies still recover.
  - guarded re-run: 248 fails, ZERO new failures vs baseline, 17 FIXED (Mario MUSHROOM Small→Big, all .filter/.map/.forEach/.reduce/nested-arrow/function-expr block-body callbacks, TodoMVC .filter(cb), match-arm-block payload bindings).
- DEFERRED (filed): native does not promote markup-position `${ match @x {...} }` with lift/markup arm bodies to match-block — those arm render-bodies still drop to `{}` under native (same as pre-S170 baseline; not a regression). Separate match-block-promotion gap.
- api flip REVERTED (git checkout -- compiler/src/api.js); default pipeline untouched.

## 2026-06-07 — verification COMPLETE
- New native test committed (5bba501e): native-blockstub-verbatim-body.test.js, 5 tests, NUL-clean. Asserts STATEMENTS survive (coins+score both, .filter callback inner stmt) per Bug-73 lesson; native==default modulo escape-hatch param-spacing + statement-terminator cosmetics. Tests pin parser explicitly (stable regardless of default-flip).
- WITHIN-NODE reconcile: NOT NEEDED. within-node canary all-clean (1006 pass / 0 fail) WITH my change. Aggregate histogram: PARSE-FAILURE:0, NESTED-SHAPE:0 (both hard-regression classes CLEAN). Deltas absorbed within existing budget; no over-budget files; no allowlist edit.
- FULL DEFAULT SUITE: bun test compiler/tests/ = 23405 pass / 0 fail / 220 skip / 1 todo. Pre-commit gate (unit+integration+conformance) = 16211 pass / 0 fail. ZERO regressions vs 5a346faa (+5 from new test file).
- Commits: ef2af8ef (foundation) -> 7a2941a0 (consumers+guard) -> 5bba501e (test).
- DEFERRED ITEMS surfaced (NOT fixed here):
  1. Native does not promote a markup-position `${ match @x {...} }` whose arm bodies are `{ lift <markup> }` render bodies to a match-BLOCK — those arm bodies route through match-EXPR (translate-expr) and my render-body guard drops them to `{}` (regression-neutral, same as pre-S170). A real match-block-promotion fix is the proper close.
  2. Match-as-STATEMENT in a function body over an ENGINE cell: native routes through match-EXPR and emits plain `_scrml_reactive_set("marioState", X)` instead of the default's `_scrml_engine_direct_set(..., transitions)` §51.0.F write-guard. The Mario MUSHROOM transition still fires (observable state Small->Big correct; runtime sim test PASSES) because no `<onTransition>` exists, but the engine-write-guard routing is a separate native gap (match-statement vs match-expr + engineCtx threading). Surfaced by the "14-mario fixture (Bug 1.7 integration smoke) > marioState writes route through engine_direct_set" test which remains a baseline native-flip failure (NOT introduced by me).
  3. (per brief) ROOT-2 single-word bare DISPLAY-TEXT silent-drop native-tokenizer bug — FILED, not investigated/fixed (out of scope).
