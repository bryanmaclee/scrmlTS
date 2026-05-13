# §36 Phase 3 — Progress

2026-05-13T-00 Start. Rebased onto main 39eba45.
- Pre-flight: read SCOPING §3, existing test file (800 lines, ends §18 E-INPUT-005), runtime-template keyboard (lines 1505-1574), codegen emit-reactive-wiring `emitInputStateNode` (lines 824-879).
- Section numbering: §19 = 3.A SSR no-emit; §20 = 3.B auto-repeat; §21 = 3.C nested-scope cleanup.
- Existing compile patterns: full-pipeline via `compileScrml` writes serverJs/clientJs to disk (see e.g. integration/program-documentary-attrs.test.js; unit/14-mario-runtime-sim.test.js).

Plan:
- 3.A: full `compileScrml` invocation in tmp dir, assert server.js does not contain `_scrml_input_*` substrings, client.js does.
- 3.B: load `SCRML_RUNTIME` string + eval with mocked `document` (event-emitter Map), simulate duplicate keydown.
- 3.C: assert codegen emits `_scrml_register_cleanup` with consistent scopeId between create + destroy calls.

2026-05-13T-01 Sub-Phase 3.A landed. §19 SSR no-emit guard. +4 tests (keyboard / mouse / gamepad / all-three). All 63 tests in input-state-types.test.js pass.

2026-05-13T-02 Sub-Phase 3.B landed. §20 keyboard auto-repeat suppression. +3 tests using happy-dom runtime sim. Pinned SPEC §36.2 "edge-based" justPressed semantics. All 66 tests pass.

2026-05-13T-03 Sub-Phase 3.C landed. §21 nested-scope cleanup. +3 tests parsing emitted reactive code via regex pair-match (create scopeId == destroy scopeId). Pinned SPEC §36.5.1 lifecycle pairing. All 69 tests pass. Phase 3 COMPLETE.
