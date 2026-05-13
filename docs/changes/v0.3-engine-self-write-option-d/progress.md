# Progress: v0.3 engine self-write Option (d) synthesis

Tracks: idempotent runtime no-op + W-ENGINE-SELF-WRITE-DETECTED info lint + SPEC §51.0.F amendment.

Pattern reference: Insight 30 / §40.8.1 OQ closure (filesystem-inferred + lint synthesis).

## Log

- T+0 (startup): worktree verified clean; bun install + pretest green. Maps consulted: primary, structure, error.
- T+0 (context): read SPEC §51.0.F (line 21391), §34 catalog row for E-ENGINE-INVALID-TRANSITION (line 14642), runtime helpers `_scrml_engine_direct_set` (line 2478) + `_scrml_engine_advance` (line 2402) in runtime-template.js. Existing self-loop precedent confirmed at `_scrml_engine_history_capture_on_exit:2388` (line 2390 `if (current === target) return`).
- T+0 (test patterns): existing tests at `compiler/tests/unit/c13-advance-write-hook.test.js` provide the canonical runtime-test scaffolding (chunk eval via `RUNTIME_CHUNKS.engine`).
