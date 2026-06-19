# sPA ss4 — block-splitter-native-parser

**Launch:** `read spa.md ss4` · **Branch:** `spa/ss4` · **Worktree:** `../scrml-spa-ss4`
**Merged from:** block-splitter-statechild-scanners · native-parser-frontend-conformance

## Shared ingestion
The structural front-end. `block-splitter.js` scanners + the two sibling state-child parsers
(`match-statechild-parser.ts`, `engine-statechild-parser.ts`): comment/string-span opacity
(`computeCommentRegions`/`skipHtmlComment`), the E-STRUCTURAL-ELEMENT-MISPLACED engine-never-reaches-
parser gate, the `legacyColonPlacement:true` match path that works e2e (why match works but engine
doesn't), and §4.14/§18.0.1/§51.0.I placement rules. PLUS the Charter-B native parser
(`compiler/native-parser/`) + the dual-pipeline conformance harness: M1-M6 ladder,
native-as-canonical-enforcer, byte-identical-vs-Acorn gate, GAP-*/DIFF-* ledger.

## Core files
`compiler/src/block-splitter.js` · `compiler/src/match-statechild-parser.ts` · `compiler/src/engine-statechild-parser.ts` · `compiler/native-parser/parse-file.js` · `compiler/tests/parser-conformance/dual-pipeline-canary.js` · `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`

## Items (least-ingestion-first)
1. **`bug-75`** `[open]` bug LOW · tier med — after-`>` ENGINE `:`-shorthand hard-fails e2e at block-splitter (E-STRUCTURAL-ELEMENT-MISPLACED); the deprecated form should compile-with-warning (`W-COLON-SHORTHAND-LEGACY-PLACEMENT`) — match locus already works (`legacyColonPlacement:true`). Entry: block-splitter.js ~175-180.
2. **`g-blocksplitter-comment-span-not-opaque`** `[open]` bug LOW · tier med — BS + arm/state-child scanners don't treat `<!-- -->` as opaque (tag-mentions/odd-quotes inside comments skew balance). Uniformly treat comments opaque, extending `computeCommentRegions`. Entry: match-arm scanner (E-MATCH-PARSE-001 :580) + engine state-child scanner (:1316/:1504).
3. **`native-parser-corpus-gap-ledger`** `[open]` bug LOW · tier med — unexplained native-vs-live FileAST divergences opt-in-skipped as GAP-LEDGER entries; skip→strict flips automatically as a class closes. Entry: `parser-conformance-corpus.test.js:275` + dual-pipeline-canary.js + parse-file.js/parse-stmt.js.
4. **`native-parser-byte-identical-lexer-gap`** `[open]` experiment LOW · tier med — byte-identical native-vs-Acorn token-stream parity skipped pending M1.3(comments)/M1.4(regex) + template-token-shape normalizer. Entry: `parser-conformance-lexer.test.js:581` + native-parser/lex.js + token.js.
5. **`phase-a2-structural-elements`** `[open]` feature n-a · tier high — STALE legacy S58 row; substance shipped (A1c waves + A7). Currency-correct then close; live front-end is native-parser Charter B. Entry: master-list.md §0.1 row A2 + roadmap.
6. **`native-parser-front-end-m2-m6`** `[open]` feature n-a · tier high — **BIG multi-milestone arc** (M2.4 + MK2 + M3-M6 incl. block-splitter deletion + Acorn removal). Dominant unit: each/match/colon-shorthand structural-promotion ~70% (M6.6). Dispatch per-milestone, not as one. Entry: IMPLEMENTATION-ROADMAP.md (top banner L22-L35) + native-parser/*.

## Progress
`ss4.progress.md`. Land on `spa/ss4`; ping PA inbox when ready. Do not advance main / do not push.
