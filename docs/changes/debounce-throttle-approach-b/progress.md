# Debounce/Throttle Approach B — Dispatch Progress

## Phase status
- [x] Phase 1: SPEC authoring (commit 1bb6d47)
- [x] Phase 2: Parser + Typer + Codegen + Runtime (commits f5eb249 + 64e8522)
- [x] Phase 3: Clean-cut deletion (commit 281efca)
- [x] Phase 4: Tests (commit 319d0a2)
- [x] Phase 5: Docs (this commit)

## Final summary

S79 dispatch — debounce/throttle Approach B (clean-cut) — SHIPPED end-to-end across 6 commits:

1. **1bb6d47 / Phase 1 SPEC** — §6.13 NEW, §6.8 amend, §34 +3 codes
2. **f5eb249 / Phase 2A** — AST + parser recognition
3. **64e8522 / Phase 2B** — runtime + codegen + typer
4. **281efca / Phase 3** — clean-cut deletion (+ test migrations + LSP)
5. **319d0a2 / Phase 4** — 28-test unit suite
6. (this) **Phase 5** — docs (PA primer + master-list + changelog)

Tests at dispatch close: `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` → 10353 pass / 62 skip / 1 todo / 0 fail (+22 net unit tests vs S78 baseline; -6 retired pre-v0.next assertions + 28 new = +22).

**OQ closures:** OQ-3 (reset cancels pending), OQ-4 (parseAfterDuration reuse), OQ-5 (channel client-side), OQ-6 (validity recomputes on debounced write), OQ-8 (throttled= parallel), OQ-9 (computed-form).

**Deferred:** OQ-1 (migrator — N/A under clean cut), OQ-2 (imperative debounce(fn,ms)/throttle(fn,ms) keyword-call retirement; orthogonal — separate dispatch). E-DEBOUNCED-WITH-SERVER lands as the typer code per §6.13.5; full server-side timing semantics deferred.

## Log (append-only)

- 2026-05-10 — dispatch opened; starting Phase 1 SPEC authoring
- 2026-05-10 — startup verification complete (pwd matches git toplevel; bun install OK; pretest OK 12 samples compiled)
- 2026-05-10 — beginning deep-dive read + targeted SPEC reads
- 2026-05-10 — read deep-dive in full (676 lines); read PA primer §1-§13.7; targeted reads of SPEC §6.2 / §6.7 / §6.8 / §51.0.M / §34
- 2026-05-10 — Phase 1 SPEC authoring: §6.13 NEW subsection (Reactivity Attributes — debounced= / throttled=); §6.8 amended (reset cancels pending timed writes paragraph + cross-ref); §34 +3 catalog rows (E-DEBOUNCED-WITH-DERIVED, E-DEBOUNCED-WITH-SERVER, E-REACTIVITY-ATTR-CONFLICT); committed 1bb6d47.
- 2026-05-10 — Phase 1 also fixed pre-existing test-body-statement-split.test.js cwd hardcode (mirrored main's fix to unblock pre-commit).
- 2026-05-10 — Phase 2 step A: types/ast.ts ReactiveDeclNode gets `reactivity?: { debounced?: AfterDurationResult; throttled?: AfterDurationResult }` field; type-only AfterDurationResult import.
- 2026-05-10 — Phase 2 step B: ast-builder.js scanStructuralDeclLookahead extended to recognize `debounced=DURATION` and `throttled=DURATION` attributes via new captures (debouncedRaw/throttledRaw + spans); parseAfterDuration applied at decl-completion time; reactivity field attached to both Shape 2 and Shape 1/3 state-decl nodes. Committed f5eb249.
- 2026-05-10 — Phase 2 step C: runtime-template.js — `_scrml_reactivity_register` + `_scrml_reactive_debounced` (rewrote — was partial) + `_scrml_reactive_throttled` (NEW) + `_scrml_reactivity_cancel` + per-cell registries. Registries hoisted to module top to avoid TDZ. _scrml_reactive_set wired to consult registry + route through timer helper (with bypass to avoid recursion). _scrml_reset wired to cancel pending timers (OQ-3 closed). emit-logic.ts: new _emitReactivitySidecar function emits `_scrml_reactivity_register("name", kind, ms)` (literal-form numeric ms or computed-form arrow-fn mirroring A5-5 pattern); attached to state-decl appendSidecar pipeline. emit-client.ts: utilities chunk-trigger added on state-decl with reactivity. type-system.ts: B14-style typer checks for E-REACTIVITY-ATTR-CONFLICT, E-DEBOUNCED-WITH-DERIVED, E-DEBOUNCED-WITH-SERVER, plus a generic E-SYNTAX-DURATION fall-through for malformed values. Committed 64e8522.
- 2026-05-10 — Phase 3 (clean-cut deletion): retired `reactive-debounced-decl` AST kind (ast.ts). Deleted parse paths in ast-builder.js (top-level + in-function-body). Deleted/migrated case-arms in type-system.ts (TS-pass), emit-logic.ts (codegen), emit-client.ts (chunk detector), route-inference.ts (2 sites), component-expander.ts (substitution), usage-analyzer.ts. lsp/handlers.js — state-decl analysis arm extended to detect reactivity attributes and surface them via the existing reactiveKind: "debounced"/"throttled" path; symbol detail strings updated to use the canonical attribute form (`<name debounced=Nms>`). Updated 5 affected test files: tab.test.js (deleted @debounced(N) describe-block), code-generator.test.js (deleted reactive-debounced-decl emit assertion), type-encoding-phase2.test.js, collectexpr-newline-boundary.test.js, gauntlet-s24/scope-001-logic-expr.test.js, self-host/ast.test.js (deleted parity test for retired form). Updated lsp/completions.test.js to assert new format (`debounced=200ms`). Migrated the 2 probe sample fixtures to canonical form. DEFERRED: imperative `debounce(fn, ms)` / `throttle(fn, ms)` keyword-call retirement (OQ-2; orthogonal surface). Committed 281efca.
- 2026-05-10 — Phase 4 (tests): authored `compiler/tests/unit/debounce-throttle-attribute.test.js` — 7 sections (parser / typer / codegen / computed-form / runtime / sample-compile / regression). 28 unit tests, 64 expect() calls, all pass. Full suite at `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`: 10353 pass / 62 skip / 1 todo / 0 fail. Committed 319d0a2.
- 2026-05-10 — Phase 5 (docs): docs/PA-SCRML-PRIMER.md §4 + §12 updated; master-list.md "Last updated" line refreshed; docs/changelog.md "Recently Landed" entry added at top. Final dispatch commit imminent.
