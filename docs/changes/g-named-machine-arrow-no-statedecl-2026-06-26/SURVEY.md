# SURVEY VERDICT — g-named-machine-arrow-no-statedecl-silent-empty (ss39 item 3)

**Status: PARKED → escalated to PA.** Survey-first item; survey concludes it is NOT a
determinate sPA fix. Recorded here for the PA's design ruling.

## TL;DR

- The brief's premise — "named-machine path emits no init → should emit/require it" — is
  **SPEC-FORBIDDEN** for non-derived named machines: §51.3.3 mandates a SEPARATE
  `@var: MachineName = init` binding; §51.4 allows multiple machines per enum + multiple
  cells per machine; §51.0.B says `name=` does NOT source an auto-var. There is no single
  canonical cell or `initial=` to auto-emit (and §51.0.E's "default to first state-child"
  is undefined for an arrow body with zero state-children). **Option (a) is off the table.**
- The diagnostic option (b) cannot be landed determinately because the **implementation and
  the SPEC encode contradictory models** of what a non-derived named machine's READ is, and
  the silent-empty fix is gated on resolving that.

## The open question for the PA ruling

> Is the lowercased / auto-derived read name (`@pm` / `@ui`) a legal read of a **non-derived**
> named machine, or only of **derived / projection** machines (§51.9)?

- **Model 1 (§51.3.3 spec-canonical):** non-derived named machine = pure graph; the only
  governed cell is the separately-declared `@var: MachineName`. Then `@PM`/`@pm` reads are
  undeclared-cell reads, the typer's `type-system.ts:11314` pre-bind (which binds them) is
  the bug, and the fix is "narrow the pre-bind to derived-only + let `E-STATE-UNDECLARED`
  fire + route match `on=` through that walker."
- **Model 2 (S192 `type-system.ts:11314` + its §51.0.C/§51.9 comment):** the lowercased
  machine name IS the canonical read; then codegen must auto-init that cell — but that
  re-collides with §51.3.3/§51.4 (which name? which initial? multiple-machine collision).

The S192 pre-bind was added **deliberately** (to stop `E-STATE-UNDECLARED` false-fires on
`@ui`-style reads), so undoing it for non-derived machines is exactly the contested
decision — NOT a safe unilateral narrowing.

## Codegen / typer locus (for the post-ruling dispatch)

- Named-machine emit (transitions table only, no cell init): `compiler/src/codegen/emit-machines.ts`.
- B2 §51.0.C guard + its `hadNameAttr` exemption: `compiler/src/symbol-table.ts` ~6667–6723
  (`validateEngineStateChildrenAndRules`; `isNamedMachine = engineDecl.hadNameAttr === true`
  is the clause that skips this case).
- Split-brain root (typer pre-bind binding BOTH `PM` and lowercased `pm` for EVERY machine,
  derived or not): `compiler/src/type-system.ts` 11314–11339.
- `E-STATE-UNDECLARED` read-side fire (suppressed by the 11314 pre-bind):
  `compiler/src/type-system.ts` 6447–6483.
- Match `on=` lowering (bypasses the read-side walker entirely — a GENERAL gap):
  `compiler/src/codegen/emit-match.ts`.
- `hadNameAttr` set: `compiler/src/ast-builder.js` ~15419; `compiler/native-parser/collect-hoisted.js`
  ~460 (frozen — do not touch); typed `compiler/src/types/ast.ts` ~982.

## B2 precedent (`d71a6dcc`)

B2 closed the §51.0.C silent-empty (`<engine for=T initial=...>` no-`name=` whole-body
arrow → transitions table but no §51.0.C cell init → undefined → empty match, fires
`E-ENGINE-RULE-LEGACY-SYNTAX`). It DELIBERATELY EXEMPTS (a) the `<machine>` keyword, (b) the
§51.3.2 named form (`hadNameAttr`), (c) derived engines. The B2 commit body itself files
this exact residual as "its own follow-up."

## Repro confirmation (all compiled in scratchpad; no repo edits)

- **BUG reproduces:** `<engine name=PM for=Phase>` arrow body + `<match for=Phase on=@PM>`,
  no state-decl → only `W-ENGINE-INITIAL-MISSING` (+ W-PROGRAM-001); client.js has the
  transitions table + `_scrml_reactive_subscribe/get("PM")` but **no `_scrml_reactive_set`**
  → undefined at mount → match renders empty, **zero diagnostic**.
- **Working differential:** add a separate `<phase>: PM = Phase.A` + match `on=@phase` →
  client.js gains `_scrml_reactive_set("phase", Phase.A)`. Init comes from the STATE-DECL,
  never the engine.
- **Read-name split-brain (decisive):** `${@PM}` and `${@pm}` resolve silently; `${@phase}`
  (the §51.0.B `for=Type`-derived name) FIRES `E-STATE-UNDECLARED`. The typer treats the
  machine-name-derived reads as valid and the spec's for=Type-derived read as undeclared;
  codegen inits none of the three.
- **Match `on=` bypass (broader gap):** `<match for=Phase on=@totallyUndeclared>` with no
  engine + no decl compiles clean — the match `on=` read never runs the `E-STATE-UNDECLARED`
  walker.
- **`<machine>` keyword:** identical silent-empty (+ W-DEPRECATED-001). Same gap.
- **Derived engines:** distinct, NOT a gap — emit `_scrml_derived_declare/subscribe` which
  genuinely init the cell. Correctly exempt.

## Recommended post-ruling decomposition (likely Model 1 — a small multi-surface arc)

1. Narrow the `machineRegistry` pre-bind (`type-system.ts` 11314–11339) to **derived-only**
   + corpus sweep for any non-derived named-machine lowercased reads.
2. Route the match `on=@X` read (`emit-match.ts` resolution) through the
   `E-STATE-UNDECLARED` walker (`type-system.ts` 6447) — a GENERAL match-`on=` gap, broadest
   corpus impact.
3. Fix the `W-ENGINE-INITIAL-MISSING` misfire on arrow-body named machines (§51.0.E promises
   a "default to first state-child" that cannot happen with zero state-children).
4. Optional "unbound named machine" lint at the decl site — NOT spec-determined (cross-file
   binding via §51.16 means "no in-file binding" is not necessarily an error); needs its own
   ruling.

## Surveyor

agent `a25e4410ca7d4eb73` · SURVEY-ONLY (no source edits; repros in scratchpad only).
