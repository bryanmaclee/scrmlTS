# SCOPE — g-component-body-markup-parser-absent (build)

**Status:** survey DONE (S228, Plan agent `a49cb047`) → **VERDICT: live-ast-builder-buildable.** PA-ratified build: **Design A**, all 3 shapes in scope, reuse `E-COMPONENT-ENGINE-SCOPE`. change-id `g-component-body-engine-reject-2026-06-27`.

## The gap (refuted disposition)
known-gaps claimed "a from-scratch component-body markup parser is the precondition — DESIGN-TRACK." **REFUTED by direct probe.** The parser that produces the required shape ALREADY exists and ALREADY runs on `component-def.raw`: `component-expander.ts:parseComponentBody` (946) → `reparseSynthesizedFile` (918) → legacy `splitBlocks + buildAST` (924), invoked unconditionally for every def by `buildComponentRegistry` (1098-1108). Direct probe of `buildAST` on the shape-1 body yields `child kinds: ["engine-decl:Phase"]`, `machineDecls.length: 1` — the b17-walker-ready shape. This is a **wiring + sequencing gap**, not a missing subsystem.

## Repro (all 3 shapes, HEAD 6ac1f635 — all currently BROKEN)
1. **structural** `const Card = <div><engine for=Phase initial=.Idle>…</engine></div>` → compiles CLEAN exit 0, `<Card/>` → **empty `<div>`**; no engine substrate, **no `E-COMPONENT-ENGINE-SCOPE`** (silent total drop).
2. **lift-value** `const Card = <div>${ <engine …/> }</div>` → engine parsed as a markup-value lift → **phantom DOM element** (`createElement("engine")` …), `[emit-lift] unhandled attribute value kind: dotted-ident`. Garbage, no diagnostic. (Distinct mechanism: `machineDecls===0`, engine buried in a lift/logic node.)
3. **mount** file-scope `<engine for=Phase…>` + `const Card = <div><Phase/></div>` → **`E-COMPONENT-020`** ("Component Phase not defined") + `E-COMPONENT-035` — misleading cascade, not the scope error.

## Why it never reaches the (already-correct) reject-walker
- `parseComponentBody` (957) keeps only `nodes.filter(kind==="markup")` and **DISCARDS `reparsed.ast.machineDecls`** — the engine survives only buried in the `<div>`'s `.children`.
- **Sequencing:** SYM/PASS-13 reject-walker runs Stage 3.06 (`api.js:1433`) BEFORE CE Stage 3.2 (`api.js:1464`); at SYM time the def still carries `raw:string` + sibling-only `defChildren` (attach `ast-builder.js:16437-16446` collects following *siblings*, never body markup) → `walkRejectEnginesInComponentDefChildren` (`symbol-table.ts:8404`) finds nothing.
- `collectHoisted` (`ast-builder.js:17031-17091`) has no `component-def` case → never descends into `raw`.

The `raw:string` storage is a DELIBERATE lazy-parse deferral (CE owns prop/snippet/inline at registry-build); re-parsing `.raw` is safe and already happens. The ONE invariant: a body engine must NOT be hoisted into the file's `machineDecls` (would emit a singleton-violating substrate) — the correct outcome is the loud reject, after which compilation fails and emission is moot.

## b17 "activates for free" — verified
`walkRejectEnginesInComponentDefChildren` (8404-8468) + `fireComponentEngineScope` (8479) are genuinely correct (synthesized-AST tests §B17.1-9 in `compiler/tests/unit/engine-component-scope-b17.test.js` fire `E-COMPONENT-ENGINE-SCOPE` once per (component, engine)). The 3 `test.skip` cases (lines 332-342) are the activation target. NOTE: the SYM walker fires only on an engine-decl that is a DIRECT member of `component-def.defChildren`; the CE route (Design A) reuses the fire-CODE, not the walker.

## Design A (RATIFIED build) — fire in CE, reuse the machineDecls CE already computes
1. **`component-expander.ts:parseComponentBody` (946-985):** stop discarding `machineDecls` — return `{ nodes, errors, machineDecls: reparsed.ast.machineDecls }`.
2. **`component-expander.ts:parseComponentDef` (991-1011):** where `name`+`span` are in scope, if `machineDecls.length > 0`, push a CE error PER engine matching `fireComponentEngineScope`'s exact shape (`E-COMPONENT-ENGINE-SCOPE`, severity error, span = engine's span, names component + engine var + governed type). Fires for used AND unused defs (registry built for all).
3. **Shape 3** (`component-expander.ts` uppercase-tag resolver near the `E-COMPONENT-020` fire, ~3808): before firing `E-COMPONENT-020`, check the file's engine names (engine registry / `ast.machineDecls`) and divert an engine-named tag → `E-COMPONENT-ENGINE-SCOPE` (`<EngineName/>` is cross-file-only per §51.0.D, so a same-file engine name in a component body is doubly-illegal).
4. **Shape 2** (in scope): in `parseComponentBody`, also scan the re-parsed `nodes` for a lift/markup-value subtree whose markup tag is `engine` → fire the same code.

## Test plan
- Un-`.skip` the 3 deferred cases in `engine-component-scope-b17.test.js` (332-342); assert `E-COMPONENT-ENGINE-SCOPE` (Error) end-to-end for shapes 1/2/3. Use the file's existing `diagByCode` helper; cross-stream (`result.errors` + `result.warnings`).
- Keep §B17.1-9 synthesized tests GREEN (walker regression).
- Add a compile assertion: structural shape no longer emits a silent empty `<div>` + exit code non-zero.
- **R26 (S138):** compile all 3 repro shapes on the post-fix baseline; confirm the code fires (not silent-drop / phantom-DOM / E-COMPONENT-020).
- **S215 adversarial:** valid component WITHOUT an engine must NOT over-fire; a nested engine (engine-in-div-in-component) fires; an engine in NON-component top-level markup is unaffected.

## SPEC (normative)
- **§15.13.5** (SPEC.md:9435): a component body SHALL NOT instantiate an engine → `E-COMPONENT-ENGINE-SCOPE` (rejection is REQUIRED).
- **§51.0.K / §51.0.A** — engines singleton-by-design.
- **§51.0.D** — `<EngineName/>` mount is cross-file-only (bears on shape 3).
- **§34** — `E-COMPONENT-ENGINE-SCOPE` row exists (Error); this supplies the missing live fire-site (Rule 4).

## Critical files
- `compiler/src/component-expander.ts` (parseComponentBody:946 · parseComponentDef:991 · resolver E-COMPONENT-020 ~3808)
- `compiler/src/symbol-table.ts` (reject-walker:8404 · fireComponentEngineScope:8479 — reuse the message shape)
- `compiler/src/ast-builder.js` (Design-B locus only; not used by A)
- `compiler/src/api.js` (stage order: SYM 3.06 before CE 3.2)
- `compiler/tests/unit/engine-component-scope-b17.test.js` (§B17.1-9 + 3 deferred cases 332-342)
