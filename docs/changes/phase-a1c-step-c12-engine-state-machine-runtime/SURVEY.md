# Phase A1c Step C12 — Engine state-machine runtime — SURVEY

**Date:** 2026-05-08 (S74)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a98b7c2edac796de1`
**Branch:** `worktree-agent-a98b7c2edac796de1`

## Pre-survey: spec re-verified (pa.md Rule 4)

Read SPEC §51.0.A through §51.0.G verbatim (lines 20179-20455). Salient
load-bearing claims for C12 emission:

- **§51.0.A** — singleton state machine. ONE engine declaration → ONE running
  state machine instance.
- **§51.0.B** — declaration syntax. `<engine for=Type [initial=.Variant]
  [derived=expr] [pinned] [var=name]>` + state-children with `rule=`,
  `effect=`, `<onTransition>`, body.
- **§51.0.C** — auto-declared variable. `lowerFirst(Type)` per Move 16
  (`MarioState` → `marioState`); `var=` overrides; cell IS reactive (read-write
  per rule= contract; read-only on derived engines).
- **§51.0.D** — declaration position IS mount position (same-file).
- **§51.0.E** — `initial=` REQUIRED on non-derived engines. Absence emits
  `W-ENGINE-INITIAL-MISSING` AND defaults to first state-child variant.
- **§51.0.F** — three rule= forms: single (`rule=.X`), multi
  (`rule=(.A | .B)`), wildcard (`rule=*`). Direct write enforcement via Move 12
  (rule= IS a CONTRACT on writes). Compile-time + runtime enforcement.
  Runtime severity for invalid transition: `E-ENGINE-INVALID-TRANSITION`.
- **§51.0.G** — `.advance(.X)` API. **C13 owns this.** C12 just needs to
  shape the substrate to support it.

§34 catalog rows confirmed:
- `E-ENGINE-INVALID-TRANSITION` (line 14376) — Runtime severity.
- `W-ENGINE-INITIAL-MISSING` (line 14379) — Warning, A1b/B14 fires it; C12
  consumes the resolved initial value.

## Survey question 1 — File-locus decision

**Question:** does `<engine>` AST currently route through `emit-machines.ts`?
If yes, extend in place; if no, decide between extending vs NEW
`emit-engine.ts`.

**Findings:**
- Both `<engine>` and legacy `<machine>` produce AST nodes with
  `kind: "engine-decl"` (per `ast-builder.js:8710`).
- `emit-machines.ts` is wired EXCLUSIVELY for the legacy machine flow:
  - `buildMachineRegistry()` (in `type-system.ts`) parses
    `engineDecl.rulesRaw` as **legacy arrow rules** (`.From => .To`) — NOT
    the new state-children form. (`isLegacyArrowRulesBody` discrimination is
    in `engine-statechild-parser.ts`.)
  - `buildMachineBindingsMap()` (in `emit-reactive-wiring.ts:212`) walks
    `state-decl` nodes carrying `node.machineBinding` annotation — i.e., it
    operates on USER-AUTHORED reactive cell decls that the type-system bound
    to a legacy `<machine name=X>` block.
  - `emitTransitionTable()` is called once per registered machine with
    `TransitionRule[]` shape `{from, to, guard, label, effectBody, ...}`.
- The new `<engine>` AST node carries B14's `engineMeta`:
  - `varName`, `forType`, `initialVariant`, `variants[]` (B15-populated),
    `stateChildren[]` (B15-populated, each with `.tag` + parsed
    `.rule: EngineRuleForm`).
  - `EngineRuleForm` shapes are `{kind:"single",target}`,
    `{kind:"multi",targets[]}`, `{kind:"wildcard"}`, `{kind:"absent"}`,
    `{kind:"legacy-arrow"}`, `{kind:"parse-error"}`.
- The B14 engine variable IS NOT registered as a `state-decl` AST node —
  it's a synthetic `StateCellRecord` with `_cellKind === "engine"` registered
  in the file scope's `stateCells` map by PASS 10.A.
- `emit-client.ts`'s logic-walker switch (line 162) has cases for
  `state-decl`, `markup`, `for-stmt`, `lift-expr` — NO case for
  `engine-decl`. **The codegen pipeline currently SKIPS `engine-decl`
  entirely** for new-style engines. The legacy `<machine>` path runs only
  via `buildMachineRegistry`/`buildMachineBindingsMap` plumbing.

**Decision: NEW `compiler/src/codegen/emit-engine.ts`.**

Reasoning:
1. The data shapes do not merge: `EngineRuleForm` (per state-child entry) vs
   `TransitionRule[]` (flat list) → forking is the cleanest expression.
2. The trigger sites differ: legacy machine emission is gated on
   `machineRegistry` (built from arrow-rule bodies). New engine emission is
   gated on `engine-decl` AST nodes whose `_record.engineMeta.stateChildren`
   has entries. Mixing them in one file would entangle two distinct
   discrimination paths.
3. C12 is the FOUNDATIONAL Wave-4 step — C13/C14/C15 all build on top.
   Giving them a clean `emit-engine.ts` to extend is the single-source-of-
   truth pattern those steps follow elsewhere (e.g., `emit-validators.ts` /
   `emit-messages.ts` / `emit-parse-variant.ts`).
4. Sibling-file pattern matches existing `emit-engine.ts`-style files
   (`emit-machines.ts`, `emit-channel.ts`, `emit-validators.ts`,
   `emit-messages.ts`, `emit-parse-variant.ts`, `emit-synth-surface.ts`).
5. Legacy `<machine>` path is preserved untouched — C12 takes a strict
   no-regression posture.

## Survey question 2 — What B14 annotates that C12 consumes

**Per `compiler/src/symbol-table.ts` `EngineMetadata` interface (lines
211-305):**

```ts
interface EngineMetadata {
  forType: string;            // "MarioState" — the enum type name
  variants: string[];         // ["Small","Big","Fire","Cape"] — B15 from typeRegistry
  initialVariant: string|null;// "Small" — from initial=.Small (B14)
  derivedExpr: unknown|null;  // null for non-derived engines (C12 scope)
  varName: string;            // "marioState" — B14, autoDeriveEngineVarName
  isExported: boolean;
  isPinned: boolean;
  // ... A7 fields (parentEngine, innerEngines, historyAttr, ...)
  stateChildren?: EngineStateChildEntry[];  // B15 PASS 11
}

interface EngineStateChildEntry {
  tag: string;                // "Small" — variant name
  rule: EngineRuleForm;       // parsed rule= attribute
  bodyRaw: string;            // raw text body
  isColonShorthand: boolean;
  rawOffset: number;
  historyAttr: boolean;
  internalRule: EngineRuleForm;
  onTimeoutElements: OnTimeoutEntry[];
  innerEngines: NestedEngineEntry[];
}

type EngineRuleForm =
  | { kind: "absent" }
  | { kind: "single"; target: string; historyForm?: boolean }
  | { kind: "multi"; targets: string[]; historyForms?: boolean[] }
  | { kind: "wildcard" }
  | { kind: "legacy-arrow"; raw: string }
  | { kind: "parse-error"; raw: string; reason: string };
```

C12 consumes: `forType`, `varName`, `initialVariant`, `variants`,
`stateChildren[]` (specifically `.tag` + `.rule`). Out of C12 scope:
`derivedExpr` (C14), `internalRule` (history work), `onTimeoutElements`
(separate temporal substrate), `innerEngines` (Wave 4 follow-on),
`historyAttr` (history work).

**Resolved initial variant:** `engineMeta.initialVariant` is what B14 set
from `initial=.X` literal, or `null` when `initial=` was absent. Per
§51.0.E + the brief, the resolved-initial fallback (default-to-first-state-
child) is A1b/B14's job. Today B15 fires `W-ENGINE-INITIAL-MISSING` but does
NOT mutate `initialVariant`. C12 must therefore implement the
default-to-first-state-child fallback at codegen time when `initialVariant`
is null but `stateChildren[]` is non-empty. This is consistent with the
brief's "C12 honors A1b's resolved initial value" if we interpret "resolved"
to include the fallback.

## Survey question 3 — Direct-write rule= validation hook decision

**Question:** in C12 vs deferred to C13?

**Findings:**
- The legacy direct-write hook works via:
  1. `state-decl.machineBinding: "MachineName"` annotation (set by
     `type-system.ts` annotation pass when a state-decl's typeAnnotation
     names a legacy machine).
  2. `buildMachineBindingsMap` walks state-decls + builds the cell-name →
     `{engineName, tableName, rules, auditTarget}` map.
  3. `emit-logic.ts` line 540: `_emitReactiveSet` consults
     `opts.machineBindings.get(node.name)` and wraps the assignment with
     `emitTransitionGuard` instead of `_scrml_reactive_set`.
- For the new `<engine>` flow, the engine variable is NOT a state-decl —
  it's a synthetic `StateCellRecord` registered by PASS 10.A. There is NO
  `state-decl` AST node carrying `machineBinding` for the engine variable.
- To reuse the existing hook, C12 would need to either:
  - (A) Extend `buildMachineBindingsMap` to also walk engine-decl AST nodes
    and register `engineMeta.varName → {tableName, rules}` derived from
    `engineMeta.stateChildren[].rule`; AND adapt the rule shape to match
    `TransitionRule` (or fork a new `engineBindings` map), OR
  - (B) Synthesize a phantom `state-decl` node for the engine variable in
    the AST and let the existing path pick it up (architectural mismatch —
    the engine variable doesn't have an init expr in the user's source).

Both are non-trivial — (A) widens machine-bindings semantics, (B) breaks
"engine variable is not a state-decl" invariant. Per the brief: "**If
non-trivial: defer to C13 + add a TODO + surface to PA.** C13 will need the
same hook for `.advance()` anyway."

**Decision: DEFER direct-write rule= validation to C13.**

Reasoning: (1) the hook seam doesn't exist yet — wiring it correctly
requires the same plumbing C13 will need for `.advance()`; designing it
in two passes risks rework; (2) the table emission C12 ships gives C13
all it needs (table-name accessor + cell-name accessor); (3) zero spec
violation — the runtime throw is just deferred to C13 alongside `.advance`,
which has the same `E-ENGINE-INVALID-TRANSITION` family; (4) C12 still
unblocks all downstream Wave-4 work because the table is the foundation.

C13 will need to (a) define a write-hook seam (parallel to today's
`machineBindings` map, or extend it), (b) emit `E-ENGINE-INVALID-TRANSITION`
runtime throw on illegal direct writes, (c) emit `.advance()` method
that uses the same table, (d) emit `<onTransition>` hook firing.

## Survey question 4 — Body-rendering reuse decision

**Question:** does `<engine>`'s body rendering parallel `<match>`'s
render-by-variant dispatch path?

**Findings:**
- Per `engine-statechild-parser.ts` lines 14-21: "engine bodies are RAW
  TEXT (engine-decl.rulesRaw) — no walkable children today." The parsed
  `EngineStateChildEntry.bodyRaw` is a string, NOT a walkable AST node tree.
- The `<match>` block-form (Tier 1, §18.0) DOES have walkable arms because
  match arms are properly tokenized into `arm` AST nodes with `body` arrays
  of statements. Engine state-children are NOT yet at that level of parser
  support.
- Translating engine state-children's `bodyRaw` into walkable AST in C12
  would require re-running the block splitter + AST builder on each
  `bodyRaw` substring. That's a parser-architecture change, not a codegen
  concern.

**Decision: DEFER body-rendering to C13/follow-on (PA-decision territory).**

Reasoning: (1) the parser hasn't elevated engine state-child bodies to
walkable AST, so C12 has no walkable input for body-render emission; (2)
even if we did parse `bodyRaw` here, the rendering would be a switch-on-
variant emission that requires DOM-build infrastructure beyond C12's
"emit the substrate" scope; (3) the brief explicitly authorizes this:
"if no, surface as a scope question." (4) C12 can emit a placeholder
comment marker at the engine's source position so a follow-on body-render
emitter can locate it.

C12 emits: `// §51.0.D engine mount position: <varName> (forType)` at the
declaration position to mark where the engine renders. Actual body markup
emission is C13 / Wave-4 follow-on.

## Decisions summary

| Question | Decision | Reasoning |
|---|---|---|
| File locus | NEW `emit-engine.ts` | AST shape distinct from legacy machine; clean foundation for C13/C14/C15 |
| Direct-write hook | DEFERRED to C13 | Engine var has no state-decl; non-trivial seam C13 owns alongside `.advance()` |
| Body rendering | DEFERRED to C13/follow-on | State-child bodies not walkable AST today |
| `engine` runtime chunk (#18) | NOT NEEDED for C12 | Substrate is purely declarative — table const + reactive cell init via existing helpers |

## Verdict

**SHIP** — narrow C12 scope: variant cell init + transition table emission +
initial-state wiring. Direct-write hook + body rendering deferred to C13
with explicit handoff notes.
