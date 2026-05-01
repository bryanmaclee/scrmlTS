# Progress: P1.E

P1.E ships the deferred P1 pieces as a coherent unit:
- P1.E.A — Uniform opener (BS): both `<id>` and `< id>` produce equivalent AST
- P1.E.B — NameRes Stage 3.05 implementation in shadow mode
- P1.E.C — W-CASE-001 emission (lowercase user-state-type shadows HTML)
- P1.E.D — W-WHITESPACE-001 emission (whitespace-after-`<`)
- P1.E.E — Samples migrated to `<engine>` keyword
- P1.E.F — SPEC §15.15 + §34 + PIPELINE Stage 3.05 implementation-status updates

## Baseline
- HEAD: 0334942 fix(p1): state-as-primary Phase P1 partial + engine rename
- bun test: 8388 pass / 40 skip / 0 fail / 401 files / 14.51s
- Branch: changes/p1.e from main

## Strategy Decision Log

### Uniform-opener implementation strategy
Existing semantics: BS classifies `<id>` (no-space) → `type:"markup"`, `< id>` (with-space) → `type:"state"`.
Downstream code (emit-html.ts, emit-client.ts, protect-analyzer.ts, route-inference.ts, type-system.ts) checks BOTH:
- For some lifecycle keywords (channel, timer, poll, request, errorBoundary): `tag === "..."` on markup nodes (no-space path).
- For others (db, schema, engine/machine): `kind === "state" && stateType === "..."` (with-space path only).

Lifecycle gap audit (no-space form):
- `<channel>`, `<timer>`, `<poll>`, `<request>`, `<errorBoundary>`: WORK in no-space (markup-path emitters handle tag-name).
- `<db>`, `<schema>`: BROKEN in no-space (silently produces literal HTML element).
- `<engine>`, `<machine>`: BROKEN in no-space (no markup-path handler).
- `< channel>`, `< timer>`, `< poll>`, `< request>`, `< errorBoundary>` (with-space): BROKEN — produces a state block with no downstream handler (silent miscompile).
- `< db>`, `< schema>`, `< engine>`, `< machine>` (with-space): WORK (canonical form pre-P1.E).

Strategy: keep BS classification (preserves CONF-001, CONF-024 — no breakage). Add `openerHadSpaceAfterLt: bool`
field to BS markup + state blocks. In ast-builder.js (`buildBlock`), normalize block.type at entry:
- If block.type === "state" AND block.name in {channel, timer, poll, request, errorBoundary, errorboundary} → rewrite to "markup".
- If block.type === "markup" AND block.name in {db, schema, engine, machine} → rewrite to "state".
This produces equivalent AST regardless of opener form. The `openerHadSpaceAfterLt` flag is preserved verbatim
so NR can emit W-WHITESPACE-001.

CONF-TAB-030 was NOT updated — its assertions still hold for non-lifecycle lowercase identifiers (`< div>`
remains `kind:"state", stateType:"div"` per the test). The gap-fill is scoped to lifecycle keywords only;
unknown lowercase names in the with-space form continue to BS-classify as state and remain there.

### NameRes shadow-mode wiring
NR runs post-MOD (in api.js between Stage 3.1 MOD and Stage 3.2 CE). Walks tag-bearing nodes (markup, state,
state-constructor-def, machine-decl), stamps `resolvedKind` + `resolvedCategory` per SPEC §15.15. W-CASE-001
emission fires on declaration sites; W-WHITESPACE-001 fires from the AST walk (consumes openerHadSpaceAfterLt).
Performance budget honored: per-file overhead ~0-1ms; full suite wall-clock 14.51s → 14.11s (no regression).

### Self-host parity test note
Adding `openerHadSpaceAfterLt` and `legacyMachineKeyword` fields to the JS AST builder broke 68 self-host
parity tests (the scrml self-host AST builder doesn't yet record these fields). Resolved by adding both
fields to the strip list in `compiler/tests/self-host/ast.test.js`'s `stripIds` helper (precedent: same
treatment was applied for F-AUTH-002's `isPure`/`isServer` flags). Self-host scrml updates can adopt these
fields independently.

### api.js stage-label cleanup
The pre-existing api.js code labelled GCP1 as "Stage 3.05" and GCP3 as "Stage 3.06" — clashing with NR's
canonical 3.05 slot per PIPELINE.md. Renamed to 3.005 / 3.006 to disambiguate without renaming the actual
stage abbrevs (GCP1, GCP3). PIPELINE.md remains authoritative.

## Log
- [t0] Branch + pre-snapshot landed.
- [t1] Strategy decided: uniform-opener via ast-builder gap-fill (no BS classification change),
  NR runs post-MOD shadow-mode, downstream stays on isComponent.
- [t2] BS edits: openerHadSpaceAfterLt + permit self-closing state opener — committed.
- [t3] BS test file (9 tests) — committed.
- [t4] ast-builder normalization for lifecycle keywords — committed (8388→8397, +9 tests, 0 reg).
- [t5] Equivalence test file (14 tests) — committed (8397→8411, +14 tests).
- [t6] AST node fields (openerHadSpaceAfterLt + legacyMachineKeyword) propagated; self-host parity
  test stripIds helper extended — committed (no regressions after fix).
- [t7] NR implementation + wiring post-MOD — committed.
- [t8] NR test file (25 tests) — committed (8411→8436, +25 tests).
- [t9] Engine-keyword regression test file (8 tests) — committed (8436→8444).
- [t10] Sample migrations (machine-basic, traffic-light, rust-dev-debate-dashboard) → <engine> — committed.
- [t11] SPEC §15.15 + §15.15.6 + §34 + PIPELINE Stage 3.05 implementation-status updates — committed.
- [t12] api.js stage-label rename (3.05/3.06 → 3.005/3.006) — committed.

## Final state
- bun test: 8444 pass / 40 skip / 0 fail / 405 files / ~15.1s wall-clock
- 8388 → 8444 = +56 new tests (9 BS + 14 equivalence + 25 NR + 8 engine-keyword regression)
- 0 regressions
- Wall-clock: 14.51s baseline → ~15.1s (+~4%, well within 10% budget)
- NameRes shadow: implemented + wired + tested
- Uniform opener: both forms work for db, schema, engine, machine, channel, timer, poll, request, errorBoundary
- W-CASE-001 + W-WHITESPACE-001 + W-DEPRECATED-001 all emitting correctly
- Samples migrated; W-DEPRECATED-001 regression coverage moved to dedicated unit test
- SPEC + PIPELINE updated; PIPELINE Stage 3.05 flipped to "IMPLEMENTED (Shadow Mode)"

## Deferrals (per intake — explicit non-goals for P1.E)
- Internal compiler rename `machineName` → `engineName` / `emit-machines.ts` → `emit-engines.ts` /
  type-system `Machine` → `Engine` (~350 refs). Separate T2 dispatch.
- Full SPEC §51 keyword sweep + worked example rewrites. Separate doc-sweep dispatch.
- E-MACHINE-* → E-ENGINE-* code rename. Separate small dispatch.
- P2 work: `export <ComponentName>` direct grammar; W6 §21.2 SHALL NOT removal; switching downstream
  stages from `isComponent` to `kind` discriminant. Different dispatch.
- P3 work: cross-file `<channel>`/`<engine>` inline-expansion. Different dispatch.

## New findings (informational)
- Pre-existing failures on `samples/compilation-tests/` (283 errors / 546 warnings) are unchanged by P1.E.
  My changes only added W-WHITESPACE-001 warnings (60 new) — no new errors, no fewer errors. Same compile
  success/failure pattern across the suite.
- `samples/compilation-tests/channel-basic.scrml` and `samples/rust-dev-debate-dashboard.scrml` already had
  pre-existing E-SCOPE-001 issues unrelated to opener form or NR.
