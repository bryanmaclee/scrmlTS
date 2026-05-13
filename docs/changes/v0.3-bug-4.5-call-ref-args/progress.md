# Bug 4.5 progress — call-ref attribute args read-detection gap (DG)

## Step 1 — startup verification (2026-05-12)

- pwd / git rev-parse OK; tree clean
- bun install OK
- bun run pretest OK (12 fixtures compiled clean)
- Maps consulted: primary.map.md, structure.map.md, error.map.md
- Required reads done: BRIEFING-ANTI-PATTERNS.md, PA-SCRML-PRIMER.md §13.7 B7

## Step 2 — surface analysis

- `compiler/src/dependency-graph.ts:1812-1849` markup-attr scan
- attrVal kinds handled today: `string` (raw), `variable-ref` (`{name: "@x"}`), `expr` (`{kind:"expr", raw, refs}`)
- attrVal kind MISSED: `call-ref` (`{kind:"call-ref", name, args:string[], argExprNodes?: ExprNode[]}`)
- shape confirmed via ast-builder.js:1239-1249 (ATTR_CALL → call-ref)
- Bug 4 sibling fix at route-inference.ts (commit cee4469) for the same recursion-into-nested-fields shape

## Step 3 — fix landed (commit 793301f)

- `dependency-graph.ts:1846` new `valObj.kind === "call-ref"` branch:
  - ExprNode walk via `forEachIdentInExprNode` over `argExprNodes` (preferred — robust against compound nav, unary/binary)
  - String-fallback regex on `args[]` (covers parse-failure shapes; idempotent against the ExprNode walk)
  - Transitive-read credit via `fnTransitiveReads.get(name)` (mirrors line 1795-1803 callee path)
- Repro file `repro-before.scrml` confirms post-fix: NO E-DG-002 on `@cell` (was: false-fire); zero W-DEAD-FUNCTION on `logIt`
- Pre-commit hook: 11592 pass / 2 fail. The 2 failures (`TodoMVC §0/§1: dist must exist`) are PRE-EXISTING preconditions (TodoMVC dist not pre-built in this worktree); confirmed by direct test run (`bun test browser-todomvc.test.js` → 39 pass / 0 fail when dist exists from pretest)

## Step 4 — unit tests landed

- New file: `compiler/tests/unit/dep-graph-call-ref-args.test.js` — 8 tests
- Coverage: T1 single-arg (canonical repro), T2 multi-arg, T3 nested-member (`@compound.field`), T4 multiple call-refs same element, T5 transitive-read via called fn, T6 negative regression (truly-dead cell still fires), T7 negative (literal-only args), T8 negative (existing variable-ref/string paths)
- Verification: 5 of 8 tests FAIL on pre-fix tree (T1, T2, T4, T5, T6 are load-bearing); all 8 PASS post-fix
- Related dep-graph tests (engine-self-credit, projected-var-reader-credit): 10 pass / 0 fail (no regression)

