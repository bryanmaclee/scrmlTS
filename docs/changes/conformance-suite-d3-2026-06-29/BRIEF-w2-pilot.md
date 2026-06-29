# W2 (DE-RISKING PILOT) — D3 conformance-suite extraction: format + impl#1 adapter + pilot lift

Dispatched S231 (2026-06-29) · agent a313eb2ca22fe3a12 · isolation:worktree · scrml-js-codegen-engineer · base HEAD b6821f88.

You are building the FIRST increment of the scrml conformance-suite extraction — the load-bearing build of the language/compiler split (V1 = scrml-language-1.0). This is a PILOT: build the agnostic case FORMAT + the impl#1 ADAPTER + a RUNNER, lift a REPRESENTATIVE PILOT of ~12-15 cases (NOT all 109), prove impl#1 reproduces their verdicts, and REPORT extraction friction for the full lift. Change-id: conformance-suite-d3-2026-06-29.

[F4 startup-verification + path-discipline block: pwd under .claude/worktrees/agent-, git toplevel, status clean, bun install, bun run pretest; Bash-edit on WORKTREE_ROOT-absolute paths only (S99/S126), no cd into main, first commit WIP(w2): start at $(pwd).]

[MAPS block: read primary.map.md, Task-Shape Routing test-authoring/harness; map watermark 0df45d2e vs HEAD b6821f88 (5 ahead) = starting hypothesis; report load-bearing finding.]

READ: SCOPE.md (the W1 case format + adapter interface + 5 waves); survey compiler/tests/conformance/ (~8-10 representative conf-CODE tests); compiler/src/api.js (compileScrml entry, result.errors/.warnings .code shape).

TASK — the (a) CODES half ONLY (the (b) runtime-effect half = final-DOM+state is being designed in a PARALLEL DD; do NOT build input/dom/state, only reserve the schema keys):
1. Case format — conformance/cases/<category>/<case-id>/case.scrml + expected.json {id, description, language-version:"1.0", expect:{codes:[],notCodes:[]}}. codes = code-SET presence (not position, SCOPE OQ3); notCodes = must-be-absent (POS+NEG pairs).
2. impl#1 adapter — conformance/adapters/impl1-ts.ts: compile(source)->{codes:string[]} via compileScrml, sorted-unique .code across errors+warnings. NO run()/dom+state (that's the DD's W3).
3. Runner — conformance/run.ts: load all cases, assert emitted ⊇ expect.codes AND disjoint expect.notCodes; pass/fail summary, non-zero on fail; + conformance/conformance-corpus.test.js bun:test wrapper.
4. Pilot lift — ~12-15 cases spanning INPUT, LOOP, AUTH, 2 block-grammar, ERROR, form-for (incl. 1-2 compile-AND-run tests — extract CODES only + flag runtime-half-pending). POS->expect.codes; NEG->own source + expect.notCodes.

GATES: runner all pilot cases PASS against impl#1 (extraction correct iff impl#1 reproduces verdicts; mis-extract = fix extraction not weaken assert); bun test compiler/tests/conformance 0 regressions (ADD, don't modify the 109); node --check clean; do NOT touch compiler/src/.

REPORT: format as built (sample case dir + schema); pilot N/N pass; EXTRACTION FRICTION for the full-109 lift (multi-source, multi-code, compile-AND-run runtime asserts, helper-shared/generated sources, warnings-vs-errors — the load-bearing deliverable scoping the full W2); WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/deferred. Commit incrementally; do NOT land to main (PA does S67 file-delta); git status clean before DONE.
