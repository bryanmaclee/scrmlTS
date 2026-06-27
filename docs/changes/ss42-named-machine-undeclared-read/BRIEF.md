# BRIEF — ss42: named-machine undeclared-read (Model 1, ss39 item-3) — items 1-3

**Dispatched by:** sPA ss42 · **Branch to land on:** `spa/ss42` (based on `origin/main` `7d8b527a`) · **Agent:** scrml-js-codegen-engineer, `isolation:"worktree"`, model opus.

**STARTUP (do FIRST, S112):** your worktree may provision at a stale session-start commit. Run `git merge main` (or confirm HEAD == `7d8b527a`) before working so you're on current main. Verify `compiler/src/type-system.ts` lines ~11314 + ~6447 match the references below.

## Design is RULED — Model 1 (do NOT re-open)
S223 PA ruling: `@pm` is NOT a legal read of a NON-derived named machine — the user must declare a separate `@var: MachineName = init` (§51.3.3). The silent-empty read becomes a loud `E-STATE-UNDECLARED`. **Model 2 (auto-emit-init) is SPEC-FORBIDDEN — do not build it.**

## Authority (Rule 4 — normative, READ FIRST in your worktree)
- `docs/changes/g-named-machine-arrow-no-statedecl-2026-06-26/SURVEY.md` — the full split-brain analysis + every locus + the repro confirmations.
- SPEC §51.3.3 (separate `@var: Machine` binding mandated) · §51.0.B (`name=` does NOT source an auto-var) · §51.4 (multiple cells/machine → no canonical auto-cell) · §51.9 (derived/projection machines — the ONLY legal lowercased-read source) · §51.0.E (the "default to first state-child") · §34 (E-STATE-UNDECLARED).

## sPA first-pass sweep (your Phase 0 CONFIRMS + extends this)
I grepped `samples/` + `examples/` + adopter (flogence) + `compiler/tests/`:
- **Compiled corpus: ~0 non-derived named-machine lowercased reads.** `engine-modern-001-basic.scrml`'s `name=X` hit is **in a comment**; its real engine is `<engine for=PhaseTag>` (derived `@phaseTag`, §51.0.C — NOT affected). The other `.scrml` hit is a frozen bug-sidecar in `handOffs/incoming/read/` (not compiled).
- **flogence adopter: clean** (no `name=` engine/machine `.scrml`).
- **Blast radius = `compiler/tests/` fixtures:** 17 files reference `name=` engine/machine; 7 assert `E-STATE-UNDECLARED`. Some may newly-fire under the narrow (item 1) and/or the match-`on=` routing (item 2). **This is bounded in-landing reconciliation, NOT a corpus migration.**

## PHASE 0 — SWEEP + WITNESS (STOP-report ONLY if blast radius is large)
1. **Confirm/extend the sweep:** thoroughly grep the corpus + test fixtures + inline test strings for non-derived named-machine lowercased reads (`<engine name=X for=T>` NON-derived, no separate `@var: X` decl, then a `@x`/`@X` read or `<match on=@x>`). Report the precise count + sites.
2. **Witness the bug** (R26, real compiled source) per the SURVEY repro: `<engine name=PM for=Phase>` arrow body + `<match for=Phase on=@PM>`, no state-decl → today: silent-empty, only `W-ENGINE-INITIAL-MISSING`, zero diagnostic. Confirm.
3. **STOP-report ONLY IF** the sweep reveals a flagship/adopter file or a LARGE (>~10 non-test) migration — that's a blast-radius escalation for the sPA/PA. Otherwise PROCEED (test-fixture reconciliation is in-scope).

## PHASE 1 — item 1: narrow the pre-bind to derived-only (`type-system.ts` 11314-11339)
- The loop binds BOTH `projectedName` AND `machineName` for EVERY machine (derived or not), suppressing `E-STATE-UNDECLARED`. **Narrow it so it binds ONLY for DERIVED/projection machines (§51.9).** Discriminator: derived machines carry an explicit projection (`machine.projectedVarName` set / a `derived`/`kind` flag) — determine the precise field from the `machineRegistry` value shape; non-derived machines auto-derive via the §51.0.C rule (`engineNameToProjectedVar` / `engine-varname.ts`) and must NOT be pre-bound.
- After the narrow, a non-derived `@PM`/`@pm` read falls through to the `E-STATE-UNDECLARED` walker (6447).
- **Reconcile** any test fixtures that newly-fire: if a fixture is a non-derived named machine read without a `@var: X` decl, add the decl (`@x: X = X.SomeState` + read `@x`) — OR if the test specifically asserts the OLD silent-resolve, update it to the Model-1 expectation (new `E-STATE-UNDECLARED`). Migrate, don't suppress.

## PHASE 2 — item 2: route match `on=@X` through the walker (`emit-match.ts` + `type-system.ts:6447`)
- `emit-match.ts` match `on=@X` resolution bypasses the read-side walker → `<match on=@totallyUndeclared>` compiles clean today (a GENERAL gap, broadest corpus impact). Route the `on=@X` read through the `E-STATE-UNDECLARED` walker so an undeclared `on=` read fires.
- This is the broadest-impact change — re-run the full suite and reconcile fixtures as in Phase 1.

## PHASE 3 — item 3: fix the `W-ENGINE-INITIAL-MISSING` misfire (independent — land regardless)
- §51.0.E promises "default to first state-child," impossible with a zero-state-child arrow body → the warning misfires on arrow-body named machines. Find where `W-ENGINE-INITIAL-MISSING` is emitted; correct the condition so it does NOT misfire for the arrow-body (zero-state-child) form. (Independent of the sweep — land even if 1+2 must park.)

## VERIFICATION (mandatory — R26 + S215 adversarial)
- **Acceptance (from the list):** `<engine name=PM for=Phase>` arrow body + `<match on=@PM>` no `@var: PM` → fires a clear `E-STATE-UNDECLARED` (was silent-empty); adding `@phase: PM = Phase.A` + `on=@phase` compiles + inits correctly; **derived/projection machines (§51.9) still resolve their lowercased reads (NO regression)**; the sweep's sites reconciled.
- **S215 adversarial:** derived engine (`const`-projection / §51.9) lowercased read must STILL resolve (the narrow must not over-fire) · `<machine>` keyword form (same gap) · multiple machines per enum · match `on=` with a DECLARED `@var` (must still resolve) vs undeclared (must fire) · the W-ENGINE-INITIAL-MISSING fix must not suppress the warning where it SHOULD fire (a state-child engine genuinely missing `initial=`).
- **Full suite:** `bun run test` green. TRUE full `bun test compiler/tests/` (hook excludes top-level `parser-conformance-*`). **A typer/parser-shape change MAY shift within-node fixtures → re-baseline the M6.5.b.0 allowlist for any over-budget fixture IN THE SAME LANDING (S198) — report what you rebaselined.**
- **Do NOT touch** `compiler/native-parser/collect-hoisted.js` (frozen).

## COMMIT DISCIPLINE
- Work in YOUR isolation worktree. **Commit INCREMENTALLY** (Phase-0 findings → item 1 → item 2 → item 3 → allowlist) — crash-recovery anchor.
- Do NOT bypass the pre-commit hook (`--no-verify`). Do NOT touch `main`. Do NOT push. The sPA lands your branch onto `spa/ss42`.
- Pre-commit hook runs the full ~18k-test suite (~160s); a foreground commit may overrun a 300s Bash timeout but still land — verify HEAD advanced + tree clean.

## RETURN (final message = structured data for the sPA)
(a) Phase-0 sweep count + sites + bug-repro witness; (b) item 1: the discriminator field used + which fixtures reconciled (how); (c) item 2: match-`on=` routing + fixtures reconciled; (d) item 3: the corrected W-condition; (e) files changed (full paths); (f) branch + tip SHA + per-item commit SHAs; (g) full-suite result (hook scope AND true `compiler/tests/`) + any allowlist rebaseline; (h) S215 adversarial results (esp. derived-machine no-regression); (i) any STOP/park.
