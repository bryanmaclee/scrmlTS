# Native-Parser-Swap Flip-Failure RE-TRIAGE — S166 (451 remaining)

**Date:** 2026-06-05 · **HEAD at triage:** `e947c924` · **Flip:** `parser = null`→`"scrml-native"` at `api.js:631`, full `bun test compiler/tests/` → **451 fail / control 0** (matches S165). · **Method:** 6 read-only survey agents (workflow `wf_710bd4b6-df1`), each reproduced default-clean/native-fail with `bun compiler/bin/scrml.js compile <repro>` ± `--parser=scrml-native` and **byte/shape-diffed emitted output** (not exit code — the S163/S165 silent-miscompile trap).

**Supersedes** the S164 `docs/changes/native-swap-triage-s164/TRIAGE.md` for the post-S165 451 set. S164's clean-single targets (lift/F2a/table-for/F2-generator=server-fn-star/F2-match-recognition/promote-each/R1) are all consumed.

## ⚠ Measurement caveat (banked)
"Failing test file" ranking via stack-trace grep is **unreliable** — `console.error` stack-traces from PASSING runtime tests inflate counts. `bug-k-sync-effect-throw` ranked #1 (24) by grep but is a **pure runtime-template test that never routes through the parser** (passes 5/0 regardless of `--parser`). The S164 "loci wrong 3×" pattern, recurring at the bucket-attribution level. Real family attribution must come from **loud native parse/compile failures on real fixtures**, which is what this re-triage did per-family.

## Ranked family table (the 5 real families)

| Family | ~fails | divergenceKind | root | effort | emit? | rec | native ROOT (HYPOTHESIS — Phase-0 verify) |
|---|---|---|---|---|---|---|---|
| **bare-`function` failable** | 10 (**31 files share root**) | parse-fail | **single, clean** | **S** | yes | **grind-now** | `parse-stmt.js` `parseFunctionDecl` (1676-1713) has NO `!`/error-type handling after `)`; the proven block exists in `parseScrmlFunctionDecl` (1912-1945, R25-Bug-36) — port it + thread `{canFail,errorType}` as makeFunctionDecl's 7th arg (1712 passes only 6 → metadata silently dropped even with a parse-only patch) |
| **cross-file export** | ~14 | parse-fail + miscompile | 2 roots, 1 subsystem | M (1 dispatch) | yes | **grind-now** | ROOT-2 (dominant): `collect-hoisted.js` `synthExportDecl` (~552, slice 609-621) computes `lo/hi` against `blockSpan.start` but a `${...}` LogicEscape body's origin is offset → `hi` overshoots → raw="" → E-COMPONENT-020/035 (breaks the 30-test FX-2 fixture + C2/C3/C4/C7b/C9/C10/C11). ROOT-1: `translate-stmt.js` Export arm (330-332) pushes only the export marker, drops the inner decl node (export-fn body never reaches codegen) |
| **render-by-tag Shape-2** | ~17 | parse-fail (+ wrong HTML emit) | single root, layered | L (clean slice S/M) | yes | decompose | `parse-stmt.js` `parseStructuralStateDecl` (3378): on `=` (3554) calls `parseAssignmentLevelExpr` in InExpression — treats RHS `<input/>` as an EXPRESSION, never detects the markup opener, never emits `shape:"decl-with-spec"` + `renderSpec`. Documented OUT-OF-SCOPE at parse-stmt.js:3576 + translate-stmt.js:986/1049. Decomp: (1) top-level Shape-2 → renderSpec+bindable [root, S/M] → (2) validator carry-through → (3) compound-parent block form → (4) nested consumer expansion + E-DG-002 read-credit |
| **r24-bug-31 / if-as-expr** | ~17 (12+5) | parse-fail (+ miscompile) | **3 roots, 2 subsystems** | L | yes | decompose | ROOT-1 (gates all 12 bug-31, CLEAN S): `parse-markup.js` `isProgramFamilyRoot`(2208)/`atStateDeclSite`(400) don't admit a `<state>` TagFrame as a decl site → `<x>=""` inside `<state>` mis-parsed → E-MARKUP-002. ROOT-2 (M, prereq, moves 0 alone): `parse-expr.js parseGuardedExprTail` (1218) lossy `join(" ")` → `:: Name` → `parse-error-body.js scanErrorPattern` (152) requires `::` immediately followed by ident → drops `::Variant` arms → E-TYPE-080. ROOT-3 (separate file, M/L): `parse-expr.js parsePrimary` (945-954) has no KwIf branch → if-as-expr → E-EXPR-UNEXPECTED |
| **engine-opener-effect** | ~12 | silent-miscompile | 3 roots | M+ | partial | decompose | ROOT-C1 (S, family-closing for boot half): `collect-hoisted.js synthEngineDecl` (~392-471) never reads `effect=` → no `openerEffect` field → symbol-table.ts:5188 reads undefined → emit-engine skips §51.0.H Form-3 boot IIFE (mirror live ast-builder.js:12492). ROOT-C2 (M/L, BROAD — its own family): `translate-expr.js translateLambdaBody` (~834) returns `{kind:"block",stmts:[]}` UNCONDITIONALLY for BlockStub → all block-body arrows/fns emit `/* block body */` placeholder (C1's test won't green without C2 — loadTasks body stubbed). ROOT-A: §4.18 bare-body — native SPEC-correct, test fixture is spec-divergent (design-gated, NOT a native fix) |

## Disposition / recommended grind order
1. **bare-`function` failable** — RECOMMENDED FIRST. Highest leverage: clean single root, S effort, proven fix to port (R25-Bug-36 `!`-block), 31-file blast radius (clears more than its nominal 10; underlies other failable-via-`function` families). Verify byte-shape + metadata thread (7th arg) — parse-only patch silently drops `canFail`.
2. **cross-file export** — strong second: ~14 (incl. the 30-test FX-2 fixture), 2 same-subsystem roots, M one-dispatch. ROOT-2 coordinate fix must not regress the working file-top path.
3. **render-by-tag Shape-2** — strategic (a fundamental scrml form, PRIMER §4 Shape 2) but L; grind sub-unit (1) standalone first.
4. **r24-bug-31 DECOMP-A** (state-wrapper, clean S) — but needs DECOMP-B to green most bug-31 tests.
5. **engine-opener-effect C1** — coupled to the broad C2 (block-body translation); C2 is its own bigger family.

## NOT native fixes / flag-to-PA
- **bug-k-sync-effect-throw** — runtime-only test, zero parser involvement. Drop from the family list.
- **engine-body-render (~14)** — §4.18 bare→quoted corpus migration; native SPEC-correct (S163 ruling). Design-gated, M6.
- **compiler-api (~14)** — derivative; clears as upstream parse gaps close.
- **lifecycle-shape1 (~12) / structural-in-logic (~11)** — missing-enforcement / inverse-shape (native compiles clean where default fires); real parity but no adopter emit move; schedule after emit-producing families.
- **engine-opener-effect ROOT-A (§4.18)** — test fixture ships spec-divergent bare bodies; migrate-or-rule, not a native fix.
- **Inverse-shape leads surfaced** (native CORRECT, default buggy — NOT native-swap work; file separately if real-corpus-reproducible): default-parser CG truncates a markup-interp ternary referencing a fn-mutated reactive var (`... < 0 ?;`, no files written) while native emits correct output.

## Provenance
Repro artifacts under `/tmp/retriage-s166/<family>/`. Workflow `wf_710bd4b6-df1`. Each family confirmed default exit-0 (or default-correct) vs native fail/miscompile with an emitted-output diff.
