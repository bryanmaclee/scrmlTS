# BRIEF — Native BlockStub verbatim-body recovery (Wave 2: Mario fix + lambda callback) · S170
# agent adfbdbc41fd7881dd · scrml-js-codegen-engineer · isolation:worktree · base 5a346faa
# Authority: S170 re-triage Bucket-2 ROOT-1 + Bucket-1 SUB-SHAPE-B. RISK: each/match-adjacent (M6.7-STOP class) but native-only + additive (currently emits "{}", restoring can't regress a passing arm).

ROOT: native reconstructArmBody (translate-expr.js:1120-1128) returns literal "{}" for BlockStub arm bodies → match-as-expr block-arm statements DROPPED (Mario eatPowerUp @coins/@score/.advance gone → click fires, no transition; dominant corpus form ~1463 files). Same gap: translateLambdaBody (872-879) returns empty stmts → callback bodies vanish.

FIX (1 foundation + 2 consumers, compiler/native-parser/):
- FOUNDATION: parse-expr.js parseBlockStub (~2744) stamp stub.verbatim = ctx.source.slice(span.start,span.end) (balanced {...}; reuse the brace-depth tracker's span; verify no off-by-one). Avoids threading source through translateExpr's ~30 call sites.
- CONSUMER 1 (Mario): translate-expr.js reconstructArmBody returns body.verbatim not "{}".
- CONSUMER 2 (lambda): translateLambdaBody emits EscapeHatchExpr raw=body.verbatim (mirror expression-parser.ts:2152-2192; reuse emitEscapeHatch).

OUT OF SCOPE: engine bare display-text — multi-word E-UNQUOTED = §4.18.7 SPEC-correct (S163) corpus-migration; single-word silent-drop = separate tokenizer bug (FILE it, don't fix).

VERIFY: temp-flip + 14-mario-runtime-sim (MUSHROOM Small→Big) + method-chain-callback-emission + match-arm fixtures; REVERT flip; R26 (compile Mario --parser=scrml-native, arm-body statements in emit not {}, node --check); flip CANARY asserting block-arm STATEMENTS survive (Bug-73 lesson); within-node SURGICAL reconcile (verify PARSE-FAILURE:0/NESTED-SHAPE:0 BEFORE reconciling, benign only); full `bun run test` 0-regress. S83 commits; NUL-check.
