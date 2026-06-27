# ss42 — named-machine undeclared-read (Model 1, ss39 item-3) — SURVEY-FIRST

**Currency:** built S223 (PA) @ HEAD `04db09de` / 2026-06-26. **FIREABLE.** Design RULED S223 = **Model 1** (spec-canonical): `@pm` is NOT a legal read of a NON-derived named machine — the user must declare a separate `@var: MachineName = init` (§51.3.3). The silent-empty becomes a loud `E-STATE-UNDECLARED`.

**Authority (READ FIRST, Rule 4):** `docs/changes/g-named-machine-arrow-no-statedecl-2026-06-26/SURVEY.md` (the full split-brain analysis + loci) + SPEC §51.3.3 (separate binding mandated) · §51.0.B (`name=` does NOT source an auto-var) · §51.4 (multiple cells/machine → no canonical auto-cell) · §51.9 (derived/projection machines — the ONLY legal lowercased-read source) · §51.0.E (the "default to first state-child" that can't happen with an arrow body). The DESIGN IS RULED — do NOT re-open Model 2 (auto-emit-init is SPEC-forbidden).

**Parallel-safety:** touches `type-system.ts` (pre-bind + E-STATE-UNDECLARED walker) + `emit-match.ts` (match `on=` lowering). Disjoint from emit-client (ss32/ss41/ss33) + emit-server (ss34). ⚠️ `type-system.ts` is a hot file — intersect at landing vs any concurrent typer lane (S211). Build on current main (post-ss39).

**coreFiles:** `compiler/src/type-system.ts` (11314-11339 the S192 machineRegistry pre-bind · 6447-6483 the E-STATE-UNDECLARED read-side fire) · `compiler/src/codegen/emit-match.ts` (match `on=@X` resolution — bypasses the read-side walker) · SPEC §51.3.3/§51.0.B/§51.0.E/§51.9 + §34 (E-STATE-UNDECLARED). Do NOT touch `compiler/native-parser/collect-hoisted.js` (frozen).

**Brief reminders:** R26 + ADVERSARIAL (S215). The S192 pre-bind was added DELIBERATELY (stop `E-STATE-UNDECLARED` false-fires on `@ui`-style reads) — narrowing it is the contested edit, so the corpus sweep (item 1) is MANDATORY before the narrow. Full `bun run test`; a parser/typer-shape change MAY shift within-node fixtures → re-baseline the M6.5.b.0 allowlist for any over-budget fixture IN THE SAME LANDING (S198).

## Items

1. **Corpus sweep + narrow the S192 pre-bind to derived-only** `[status=landed-on-branch SHA=1ab17ce3]` **SURVEY-FIRST**
   - **STOP-first:** grep the corpus (`samples/` + `examples/` + the adopter `.scrml`) for non-derived named-machine lowercased reads (`@<lowercased-machine-name>` where the machine is `<engine name=X for=T>` NON-derived, no separate `@var: X` decl). Report the count + sites — this is the blast radius of the narrow (each becomes a NEW `E-STATE-UNDECLARED` fire). If the count is large, surface before proceeding.
   - Then narrow `type-system.ts:11314-11339` so the pre-bind binds the lowercased machine-read ONLY for DERIVED/projection machines (§51.9), not non-derived named machines. Non-derived `@pm` reads then fall through to the `E-STATE-UNDECLARED` walker.
   - **LANDED ss42** (`1ab17ce3`): SWEEP = **~0 blast radius** (compiled corpus + flogence adopter clean; the only `name=` corpus hit is in a comment; 17 test fixtures referenced but **0 newly-fired**, 0 migrations). **⚠ DISCRIMINATOR CORRECTED (cookbook-vs-empirical, S124):** the list's literal "derived-only" narrow is empirically WRONG — it would REGRESS non-named `<engine for=Type>` §51.0.C auto-cells (`@phaseTag` etc.), whose SOLE typer binding IS this pre-bind. Correct Model-1 discriminator = skip the pre-bind ONLY for **NAMED non-derived** machines (`machine.hadNameAttr === true && machine.isDerived !== true`); KEEP it for §51.9 derived AND non-named `for=Type` engines. SPEC-grounded (§51.0.B name≠auto-var vs §51.0.C for=Type auto-derives). Threaded new `MachineType.hadNameAttr` from ast-builder through buildMachineRegistry. Verified by agent's non-vacuous neutralize-and-fail proof + full suite 25519/0.

2. **Route match `on=@X` through the E-STATE-UNDECLARED walker** `[status=landed-on-branch SHA=061d48a7]`
   - `emit-match.ts` match `on=@X` resolution currently bypasses the read-side walker (`type-system.ts:6447`) — a GENERAL gap (`<match on=@totallyUndeclared>` compiles clean today). Route it through so an undeclared `on=` read fires `E-STATE-UNDECLARED`. Broadest corpus impact — verify against the sweep.
   - **LANDED ss42** (`061d48a7`): routed in the typer's `match-block` case (NOT emit-match.ts — the diagnostic belongs in the typer): parse `onExprRaw` via `parseExprToNode` → `checkLogicExprIdents` (same checker all expr sites use). Guards: skip `@.`/`@.field` (E-SYNTAX-064 owns), skip bare-variant `.Variant`, strip `${...}` wrapper, parse-failure defers to codegen. `<match on=@totallyUndeclared>` now fires; declared `@var` still resolves. 0 fixtures broke.

3. **Fix the `W-ENGINE-INITIAL-MISSING` misfire on arrow-body named machines** `[status=landed-on-branch SHA=60b600fb]`
   - §51.0.E promises "default to first state-child," impossible with a zero-state-child arrow body → the warning misfires. Correct the condition.
   - **LANDED ss42** (`60b600fb`): `symbol-table.ts` ~6360 W-condition gained `&& engineDecl.hadNameAttr !== true && engineDecl.legacyMachineKeyword !== true` (§51.3 named + `<machine>`-keyword arrow forms have zero state-children + no `initial=` concept). Not over-suppressed: a genuine non-named `<engine for=Phase>` state-child engine missing `initial=` STILL fires (regression test Case 10 asserts `=== 1`).

4. **Optional unbound-named-machine lint at the decl site** `[status=deferred — needs own ruling]`
   - NOT spec-determined: cross-file binding via §51.16 means "no in-file binding" is not necessarily an error. Defer to its own ruling; do NOT build in this lane.

## Acceptance
`<engine name=PM for=Phase>` arrow body + `<match on=@PM>` with no `@var: PM` decl → fires a clear `E-STATE-UNDECLARED` (was silent-empty); adding `@phase: PM = Phase.A` + `on=@phase` compiles + inits correctly; derived/projection machines (§51.9) still resolve their lowercased reads (no regression); the corpus sweep's sites are reconciled (migrate or confirm-intended); full suite green + allowlist rebaselined if shifted.
