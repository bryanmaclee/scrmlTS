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
- For some lifecycle keywords (channel, timer, poll): `tag === "..."` on markup nodes (no-space path).
- For others (db, schema, engine/machine): `kind === "state" && stateType === "..."` (with-space path only).

Lifecycle gap audit (no-space form):
- `<channel>`, `<timer>`, `<poll>`: WORK in no-space (markup-path emit-html.ts handles tag-name).
- `<db>`, `<schema>`: BROKEN in no-space (silently produces literal HTML element).
- `<engine>`, `<machine>`: BROKEN in no-space (no markup-path handler).

Strategy: keep BS classification (preserves CONF-001, CONF-024 — no breakage). Add `openerHadSpaceAfterLt: bool`
field to BS markup + state blocks. In ast-builder.js, when block.type === "markup" AND block.name matches a
lifecycle keyword that needs state-form handling (`db`, `schema`, `engine`, `machine`), produce the same AST
shape as the with-space (state-block) path. CONF-TAB-030 must be updated since the SPEC § amended in P1
already softened the rule.

### NameRes shadow-mode wiring
NR runs after TAB and before MOD. NR walks tag nodes (markup + state + machine-decl), populates
`resolvedKind` and `resolvedCategory` per SPEC §15.15.1. Same-file declarations come from
ast.components / ast.typeDecls / ast.machineDecls; cross-file from MOD's exportRegistry — but to
honor the "NR can run pre-MOD for same-file lookups" contract, run NR per-file pre-MOD AND a
post-MOD pass for unresolved tags using exportRegistry.

Actually simpler: run NR after MOD so cross-file resolution works in one pass. Per PIPELINE.md
§3.05 "Dependencies: TAB must complete; MOD optional (only required for cross-file lookups)" —
post-MOD is fine and more complete.

## Log
- [t0] Branch + pre-snapshot landed.
- [t1] Strategy decided: uniform-opener via ast-builder gap-fill (no BS classification change),
  NR runs post-MOD shadow-mode, downstream stays on isComponent.
