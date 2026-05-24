# M6.7-C2 — codegen-output parity under native (Phase-0 decomposition + dominant fix)

WORKTREE: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a29c0fec13d4b00bd
HEAD at start: 868a1cad
Maps consulted: primary.map.md (Task-Shape Routing → "Native-parser bug fix"); load-bearing: confirmed fix locus = native parser / native→live boundary, codegen stays parser-agnostic (b.5/b.6/C1 precedent).

## PHASE 0 — root-cause decomposition (the bucket label was IMPRECISE, as warned)

The brief framed all ~143 as "codegen OUTPUT-STRING-ASSERTION divergences (native parses fine + codegen
emits different output)". Empirical dual-pipeline probe (live `parser:null` vs `parser:"scrml-native"`,
compiling each suite's representative source) shows the label is WRONG for the dominant cluster: the
biggest cluster is a NATIVE PARSE FAILURE, not a parse-clean codegen divergence.

### Probe method
`tmp-probe/probe.mjs` + `probe-mh.mjs` + `probe-at.mjs` + `probe-promote.mjs` compile representative
sources from each suite under both pipelines and diff (a) hard-error codes, (b) the asserted needles,
(c) output lengths. Sources lifted verbatim from the six suites.

### Root-cause → failing-suite map

ROOT CAUSE A (DOMINANT, FIX HERE) — native rejects the `server @var = expr` form (SPEC §52.4 cell
authority modifier on the legacy `@`-form).
  Symptom: `${ server @a = loadA() }` → native emits E-EXPR-UNEXPECTED + E-STMT-MISSING-SEMICOLON +
    E-STMT-UNEXPECTED-TOKEN at the `server` token; the whole `${...}` block fails → degrades to a bare
    `markup` node → NO `state-decl{isServer:true}` is produced.
  Why it ripples to "codegen output divergence": mount-hydrate coalescing (collect.ts:549) collects
    `child.kind==="state-decl" && child.isServer===true`. With no such node under native, the synthetic
    /__mountHydrate route + client demux are never emitted → every mount-hydrate output-string assertion
    diverges (the suite SEES it as "codegen emitted different output", but the true cause is upstream).
  Suite hit: mount-hydrate-coalescing.test.js (all `server @var` cases — the entire suite's premise).
  Native parses `server function` (D2) and `pure fn` fine; ONLY the `server`→`@` (authority-on-cell)
    production is missing. Plain `@a = expr` parses clean under native (as `bare-expr > assign`).

ROOT CAUSE B (SPLIT → M6.7-C2-sql-loop-hoist) — sql-loop-hoist scaffolding absent under native.
  Symptom: `sql-hoist: get()` source compiles error-clean on BOTH pipelines, but native serverJs LACKS
    `_scrml_batch_keys_*`/`_scrml_batch_byKey_*` scaffolding (serverJs 3291 live vs 2425 native). The
    for-of N+1 loop-hoist (§8.10) is not detected/rewritten under native. Distinct root cause (batch
    planner / loop-shape recognition over the native AST), NOT shared with Root Cause A. Representative
    test: sql-loop-hoist-rewrite.test.js §1 ("emitted JS has keys/rows/byKey scaffolding").
  NOTE: sql-loop-hoist-detection.test.js + sql-loop-hoist-rewrite §-cases that use HAND-BUILT ASTs
    (runBatchPlanner directly) are PARSER-AGNOSTIC and do NOT flip — only the compileScrml-driven cases do.

ROOT CAUSE C (SPLIT → M6.7-C2-tablefor-clientjs) — tableFor: asserted needles MATCH under native
  (`<table data-scrml-tablefor>`, thead/tbody, title-cased th all present); only INCIDENTAL clientJs
  length differs (live 1298 vs native 1101) + html 436 vs 422. Needs a focused per-assertion sweep to
  confirm whether ANY load-bearing tableFor assertion actually flips, or whether the residual is benign
  boilerplate drift. Representative: table-for.test.js client-JS-reconcile cases. LOW PRIORITY — may be
  zero real failures.

ROOT CAUSE D (LIKELY ZERO — monitor) — server-eq-helper: the load-bearing needle `(arr.length === 0)`
  MATCHES under native; only incidental clientJs/html length differs. server-eq-helper-import.test.js
  may fully PASS under native. SPLIT → M6.7-C2-residual-audit only if a sweep finds a real flip.

ROOT CAUSE E (SPLIT → M6.7-C2-reactivity-grammar) — debounce/throttle: the `§1 parser:` cases in
  debounce-throttle-attribute.test.js drive `splitBlocks`/`buildAST` DIRECTLY (hardcoded live parser) —
  they CANNOT flip through the suite as written. The `reactivity.{debounced,throttled}` field is a KNOWN
  native parser feature gap (translate-stmt makeStateDeclNode OMITS it, documented L905-912). The
  codegen-path (compileInline) cases would diverge under native because `<x debounced=300ms>` loses its
  reactivity field. Distinct root cause (native reactivity-grammar parse), pre-existing documented gap.

### Dominant pick
Root Cause A (`server @var`) — closes the entire mount-hydrate cluster, smallest blast radius (the form
currently HARD-ERRORS under native, so any file using it is already broken → pure improvement, no
working-path regression). Fix mirrors the D2 precedent (parse-stmt.js production + bridge translation),
keeps codegen parser-agnostic.

## FIX (Root Cause A)

### Fix files (2 commits on the worktree branch)
1. `compiler/native-parser/parse-stmt.js` — `parseStatement` dispatches `KwServer`+`ScrmlAt` to the new
   `parseServerAtStateDecl`, which parses `server @name [: Type] = expr` into a native StateDecl with
   `structuralForm:false, server:true, shape:"plain", isConst:false, init=<RHS>`. Precise guard: a bare
   `server` not leading to `@` (or `fn`/`function`) still falls through to the expr-stmt arm.
2. `compiler/native-parser/translate-stmt.js` — `makeStateDeclNode` now honors `stmt.structuralForm`
   (was hardcoded `true`) so the legacy `@`-form emits `structuralForm:false` matching live; defaults
   `true` for the V5-strict path.

### Verification (PA re-verifies independently)
- Native `server @a = loadA()` post-bridge state-decl shape == live EXACTLY:
  {name:"a", isServer:true, structuralForm:false, shape:"plain", isConst:false, initExpr:{kind:"call"}}.
- Mount-hydrate cluster CLOSED under native (probe): all 5 output needles match live
  (_scrml_route___mountHydrate / path:"/__mountHydrate" / Promise.all / fetch("/__mountHydrate") /
  "coalesced via /__mountHydrate"); no serverJs/clientJs length divergence remains.
- New test `compiler/tests/unit/m67-c2-codegen-output-parity.test.js` (6 tests): 6/6 pass WITH fix;
  5/6 FAIL against pre-fix sources (LOAD-BEARING confirmed).
- Strict-pass canary EXACT: 964 BEFORE -> 964 AFTER (HELD — load-bearing gate). Full class histogram
  unchanged {EXACT:964, LIVE-DEGENERATE:12, GAP-state-block:1, LIVE-PHANTOM:1, DEFERRAL-test-block:21,
  LIVE-HOIST-MISCLASSIFY:2}.
- Within-node: 7 fixtures moved (5 phase1-server-reactive-* + 2 s20-sql server-var). EXPLAINED
  parse-completeness rise: every content class (KIND-NAME/MISSING-FIELD/FIELD-SHAPE/EXTRA-FIELD/
  COUNT-LENGTH) DROPPED; only SPAN-COORD rose +1..+3 (cosmetic). Allowlist regen SAME commit, targeted
  (only the 7 affected entries; 994 others byte-identical). Within-node gate 1005/0 post-regen.
- Full `bun run test`: 21337 pass / 0 fail / 780 files (no live regression). Pre-commit gate (excludes
  browser): 14318/0.

### C2-impact spot-check (how many of the ~143 this fix closes)
- mount-hydrate-coalescing.test.js — ENTIRE suite premise restored under native (the whole suite uses
  `server @var`; pre-fix EVERY codegen-output assertion in it diverged). This is the dominant chunk of
  the ~143. The remaining ~143 are the SPLIT root causes B/C/E (sql-loop-hoist, tableFor clientJs drift,
  reactivity-grammar), which this fix does NOT touch — see follow-on units below.

## NAMED FOLLOW-ON UNITS (C2 remainder plan — survives this unit)

- **M6.7-C2-sql-loop-hoist** — §8.10 N+1 for-of loop-hoist scaffolding (`_scrml_batch_keys_*`,
  `_scrml_batch_byKey_*`, Map lookup) is absent under native though both pipelines parse error-clean.
  Distinct root cause: batch-planner / loop-shape recognition over the native AST shape. Representative
  test: `sql-loop-hoist-rewrite.test.js §1`. NB: the `*-detection` suite + several `*-rewrite` §-cases
  use hand-built ASTs (parser-agnostic, do NOT flip) — only the compileScrml-driven cases flip.
- **M6.7-C2-reactivity-grammar** — `debounced=`/`throttled=` (§6.13) reactivity field is a KNOWN native
  parser feature gap (translate-stmt makeStateDeclNode OMITS it, documented L905-912). Codegen-path
  debounce/throttle cases diverge under native because the field is dropped. The `§1 parser:` cases in
  `debounce-throttle-attribute.test.js` drive live splitBlocks/buildAST DIRECTLY and cannot flip as
  written. Representative: the `compileInline` debounce cases.
- **M6.7-C2-tablefor-clientjs** — tableFor: load-bearing needles (`<table data-scrml-tablefor>`,
  thead/tbody, title-cased th) MATCH under native; only INCIDENTAL clientJs (1298 vs 1101) + html
  (436 vs 422) length drift. Audit whether any load-bearing tableFor assertion actually flips or the
  residual is benign boilerplate. LOW PRIORITY (possibly zero real failures).
- **M6.7-C2-residual-audit** — server-eq-helper: load-bearing needle `(arr.length === 0)` MATCHES under
  native; only incidental length drift. Likely ZERO real flips — fold into a single residual sweep.

## STOP conditions: none hit. The dominant fix is native-parser + bridge only; codegen UNTOUCHED, so the
## "codegen parity vs native-shape-fix" design question (a documented STOP trigger) did not arise.

## Commits (worktree branch worktree-agent-a29c0fec13d4b00bd)
- e6407f40  fix(M6.7-C2): native parses `server @var = expr` (§52.4) — parser + bridge + this doc
- dffa29b9  test(M6.7-C2): load-bearing parity test (6) + within-node allowlist regen (7 fixtures)

## Tags
#scrmlts #m6-7 #m6-7-c2 #native-parser #server-at-var #cell-authority #mount-hydrate #coalescing #spec-52-4 #spec-8-11 #within-node-canary #strict-pass #flip-parity #parse-completeness

## Links
- [parse-stmt.js](../../../compiler/native-parser/parse-stmt.js) — parseServerAtStateDecl
- [translate-stmt.js](../../../compiler/native-parser/translate-stmt.js) — makeStateDeclNode structuralForm
- [m67-c2-codegen-output-parity.test.js](../../../compiler/tests/unit/m67-c2-codegen-output-parity.test.js)
- [parser-conformance-within-node-allowlist.json](../../../compiler/tests/parser-conformance-within-node-allowlist.json)
- [primary.map.md](../../../.claude/maps/primary.map.md)
