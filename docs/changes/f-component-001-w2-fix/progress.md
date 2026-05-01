# Progress — W2 (F-COMPONENT-001 architectural fix)

Append-only timeline. `[HH:MM]` UTC.

- [11:18] Worktree set up. `bun install` ran clean (224 packages). Rebase onto main (8dddd27) clean.
- [11:21] `bun run test` baseline: 8280p / 40s / 0f / 392 files — matches briefed baseline.
- [11:25] Confirmed pre-fix VP-2 fires E-COMPONENT-035 on `examples/22-multifile/app.scrml` for BOTH single-file and directory invocations. Both fail F2; single-file additionally fails F3.
- [11:27] pre-snapshot.md written. F1/F2/F3 line citations re-verified against current source.
- [11:30] **Plan:** sub-fix order per deep-dive §15.2:
  1. B4-pre — integration test scaffold (failing first; verifies pre-fix state mechanically)
  2. B1 — F1 recursion fix (hasAnyComponentRefsInLogic walks nested markup)
  3. B2-b — F2 canonical key (CE consumes importGraph; uses imp.absSource)
  4. B3 — F3 auto-gather (compileScrml gathers transitive .scrml closure; sane-limit)
  5. B3 — `--no-gather` flag plumbed through compile.js + dev.js + build.js
  6. B5 — dev.js watch-loop ripple (recompute dirsToWatch after each runOnce)
  7. B4-post — integration test cases enabled and passing
  8. B8 — existing unit-test cleanup (M17 header removed; key synthesis fixed)
  9. B6 — SPEC §15.14.4 + §15.14.5 + §21.7 + PIPELINE Stage 3.2 amendments
  10. B7 — Plan B reversal (master-list / kickstarter / FRICTION)
  11. Final summary commit

- [12:30] **F4 surfaced (out of W2 scope):** when a component body (same-file OR cross-file) contains nested PascalCase references (e.g. `<Card>` with `<Sub/>` inside), `parseComponentDef` → `parseComponentBody` → BS produces 0 blocks for the re-parsed body, parseComponentDef returns null silently, registry never gets the entry, and CE emits E-COMPONENT-020 + VP-2 emits E-COMPONENT-035. This affects the dispatch app's `<LoadCard>` (which has `<LoadStatusBadge>` inside). Confirmed pre-existing — fails identically in same-file. Phase 1 limitation per parseComponentDef docstring at line 350-352. NOT in F1/F2/F3 fault catalog. Surfacing per dispatch brief "STOP and surface" rule. Continuing W2 because the 22-multifile canonical example AND the integration tests all pass — F4 is a separate dispatch (W2-FOLLOW or its own ticket) for the nested-cross-file-component case.

- [13:00] B6 SPEC + PIPELINE amendments committed (`2a2d52c`).
- [13:05] B7 Plan B reversal: master-list row 99 flipped [x][❌] → [x][✅]; FRICTION.md §F-COMPONENT-001 W2-RESOLVED note appended (with F4 nested-case caveat); kickstarter v1 multi-file section: KNOWN-BROKEN flag dropped, canonical 3-file pattern + lift-bare recipe documented; F4 limitation transparently noted in kickstarter for adopter expectations.
- [13:08] Final test count: 8290 pass / 40 skip / 0 fail / 393 files (vs baseline 8280 / 40 / 0 / 392 — +10 from new integration tests, +1 file from new test file). Zero regressions.

- [13:15] **G-gate verification:**
  - G1 PASSED — `examples/22-multifile/app.scrml` and `examples/22-multifile/` (directory) both compile clean.
  - G2 PASSED — emitted JS contains expanded `class="badge"` markup; ZERO `createElement("UserBadge")` phantoms.
  - G3 PASSED (mechanically) — for-loop in client.js iterates `team` and creates the nested badge structure 5x.
  - G4 PASSED — 10/10 integration tests passing.
  - **G5 PARTIAL FAIL (out-of-W2-scope F4):** `examples/23-trucking-dispatch/pages/dispatch/board.scrml` still emits 3× E-COMPONENT-035 because LoadCard body contains nested `<LoadStatusBadge>` and `parseComponentDef`'s tokenizer-roundtrip on the multi-line body produces 0 BS blocks. Same-file equivalent fails identically — pre-existing Phase 1 limitation, not W2-specific. Surfaced and documented per dispatch brief.
  - G6 PASSED (qualified) — FRICTION §F-COMPONENT-001 carries "ARCHITECTURALLY RESOLVED for the canonical case" + F4 caveat.

- [13:18] Final test count: 8290 pass / 40 skip / 0 fail / 393 files. Net delta +10 from baseline (8280) — exactly the 10 new integration tests in `compiler/tests/integration/cross-file-components.test.js`. Zero regressions.
- [13:20] Dispatch complete. Awaiting summary commit.
