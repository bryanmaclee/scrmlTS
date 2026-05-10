# Phase A10 — Engine state-child body render

**Authored:** S78 — 2026-05-10
**Authorization:** S78 user direction "go for it. 1 2 3" — referring to PA's recommended path for unblocking A5-6 Feature 1 (named timer + `cancelTimer` builtin), which depends on engine state-child body rendering. Per pa.md Rule 4 — this SCOPE doc surfaces architecture options for ratification BEFORE any compiler work; SHIP-only after user picks options.
**Roadmap reference:** *not currently in IMPLEMENTATION-ROADMAP.md.* Body-render has been deferred from C12 (engine substrate, ~6 days back) onward through C13 / C14 / B17.4 / A5-4 / A5-6 with explicit "follow-on" notes. This SCOPE doc is the proposal to schedule it.
**Status:** **SHIPPED 2026-05-10 (S78)** — Phase 1+2 commit `9f888d0` + Phase 3+4+5 commit `080f5aa` (predecessor branch) + Phase 6 (re-wire-on-variant-change) commits `ae2be75` + `ebb843d` (this branch). All six phases shipped; cost actual ~9-10h vs SURVEY estimate ~6.5-12h; 28 new unit tests + 3 happy-dom integration tests; 0 regressions. **v1 limitation closed (Phase 6, 2026-05-10):** reactive `${@cell}` interpolation inside non-initial-arm bodies + non-delegable event handlers are RE-WIRED across variant changes via per-arm wire functions. Out-of-scope reactive surfaces (errors-element, if-chain branches, mount-toggle, transitions, bind:*, lifecycle elements) remain documented limitations until follow-on dispatch — see `compiler/src/codegen/emit-variant-guard.ts` JSDoc.

**Original ratification (RATIFIED 2026-05-10 S78):** Q1=**Option C-prime** (Option C with factored variant-guard helper discipline so future match-block-form codegen reuses it without forking); Q2=**strict-engine-scoped** (no match-block bundle); Q3=**PA-direct Phase 0** (~1-2h survey); Q4=**retain mount-position marker** (debug aid, zero cost); Q5=**separate A5-6 Feature 1** (clean follow-on); Q6=**proceed** (deferral chain is 6-deep; substantive bar requires it). User verbatim S78: "all your recos look good. but before we go, I want to discuss and weigh the Q1 options A, C" + after weighing-matrix discussion: "C prime".

---

## §0 Frame — what this is and isn't

**What this is.** A scoped implementation plan to elevate engine state-child *bodies* from `bodyRaw: string` (the structural-parse output today) to walkable AST + correct rendering codegen. Five sites in `compiler/src/codegen/` (`emit-engine.ts:46,754,1307,1348` + `emit-client.ts:611`) currently emit a placeholder comment marker instead of body codegen — body-render is the missing piece those markers are pointing to. This dispatch fills it.

**What this is NOT.**
- Not greenfield design. DD6 (`scrml-support/docs/deep-dives/dd6-engine-state-children-2026-05-03.md`) ratified the body grammar 2026-05-03 — state-children bodies are markup that renders when the engine is in that variant. The shape is locked. This is implementation, not redesign.
- Not match-block-form codegen. The `<match for=Type on=expr>` block form may have a parallel body-render gap (no `emit-match.ts` exists, only `match-expr` + `match-stmt` AST kinds — see §2.3 below) — but that's out of scope for this dispatch. Surface for separate scope if a similar SCOPE doc is needed.
- Not body-render for `<onTransition>` / `effect=` body content — those already have working codegen via B17.4 (S74); this dispatch does not touch them.
- Not a substantive grammar extension. No new spec text expected (DD6 already covers it; SPEC §51.0.D is the relevant section for engine declaration-position-IS-mount-position, already authoritative).

**Why this is the natural next step.** Engines without body-render are structurally incomplete in a way the test suite doesn't catch: tests pass because no fixture asserts that an engine actually renders state-child UI when its variant changes at runtime. The compiler emits the `__scrml_engine_<varName>_transitions` table (C12), wires `.advance()` (C13), runs derived engines (C14), mounts cross-file engines (C15), runs `<onTransition>` hooks (B17.4) — but the user-facing rendering surface is still a placeholder comment. Per the primer §7 worked example, the canonical engine body is `<Idle rule=.Loading><button onclick=load()>Load</button></>` — that button is meant to render and wire its event handler when `@phase === .Idle`. Today it doesn't.

A5-6 Feature 1 (named timer + `cancelTimer`) is downstream — the use case is `<Visible><onTimeout name="autoDismiss" after=30s to=.Hidden/><button onclick=cancelTimer("autoDismiss")>Keep visible</button></>`, which requires `<button onclick=...>` inside a state-child body to actually render and wire. Body-render unblocks it; A5-6 Feature 1 then takes ~2-3h on top.

---

## §1 What this dispatch ships

End-to-end body-render for `<engine>` state-children:

1. **Parser** — engine state-child bodies elevated from raw text to walkable AST nodes (markup, `${...}` interpolations, event handlers, payload bindings). State-child openers + closers retained as today; what changes is what's inside them.

2. **Typer** — scope resolution + variable lookup + payload bindings + reactive-cell ref tracking for state-child body content.

3. **Codegen** — per-state-child render emission guarded on engine variant. Reactive wiring for events inside state-child bodies (button onclick, etc.). Payload bindings emitted as locals scoped to the state-child body.

4. **Tests** — round-trip tests covering: empty body, text-only body, markup body, body with `${@cell}` interpolation, body with event handler invoking a function, body with payload binding (`<Error msg>${msg}</>`), tree-shake invariant on engines with all-empty bodies.

**Tree-shake invariant** (must hold): an engine where every state-child body is empty produces NO body-render runtime overhead beyond what C12 already emits.

---

## §2 Prior context (load-bearing for architecture choice)

### §2.1 DD6 ratified body shape (2026-05-03)

`scrml-support/docs/deep-dives/dd6-engine-state-children-2026-05-03.md` line 168:

> An engine body contains one state-child per variant of the governed enum (or, for engines `for=Type` where Type is a non-enum, one state-child per discriminator value):
> `{markup body — what renders when engine is in state VariantA}`

DD6 §2.1 quotes the user's S54 statement on engine body grammar; §3.1 specifies the structural shape; §7 specifies the exhaustiveness algorithm; §8 specifies auto-declared variable. Body-render is the unimplemented residue of this dive.

### §2.2 The deferral chain

- **C12 SURVEY.md §"Survey question 4 — Body-rendering reuse decision"** (line 192-219): explicitly raised the question, proposed two reuse options (parallel `<match>` render-by-variant dispatch; or new emission), deferred. Decision verbatim: *"DEFER body-rendering to C13/follow-on (PA-decision territory)"*. Reasoning: parser hasn't elevated bodies to walkable AST; even with walkable input, codegen needs DOM-build infra beyond C12's substrate-emit scope.
- **C12 BRIEF.md** (line 60): proposed the architectural reuse question. Lean: *"if `<engine>`'s body-rendering is parallel to `<match>`'s render-by-variant dispatch, reuse; else surface as a scope question."*
- **C13** (`.advance()` + write-hook): did NOT pick up body-render. C13 emitted `_scrml_engine_advance` + `<onTransition>` hook firing; bodies remained raw text.
- **C14** (derived engines BRIEF line 68): explicitly preserved C12's deferral — *"body rendering remains DEFERRED (C12's open follow-on)"*.
- **C15** (cross-file engine mount): emitted `<EngineName/>` mount-position marker; did NOT render imported engine bodies.
- **B17.4** (`<onTransition>` codegen, S74): explicitly punted — *"State-child body rendering — still deferred. B17.4 emits hook firing but does NOT render state-child markup bodies. Wide body-parse step territory."*
- **A5-4** (S77, `<onTimeout>` codegen): per-state-child timer-config table, arm/clear wiring, initial-arm. Did NOT touch body-render.
- **A5-6 Feature 1** (S77, named timer + cancelTimer): explicitly DEFERRED in commit `10ecdc2` body — *"depends on engine state-child body rendering (currently emits placeholder marker per emit-engine.ts:46)"*.

Six deferral points across a month converging on the same gap. This is the dispatch that closes them.

### §2.3 Match block-form has the same shape gap (out of scope for this SCOPE)

`<match for=Type on=expr>` block form (Tier 1, primer §1) does not appear to have a dedicated codegen path either: `compiler/src/types/ast.ts` declares `match-expr` (line 768) + `match-stmt` (line 841) + `match-arm-inline` (line 859) but no `match-block` AST kind for the markup-tree form. There is no `emit-match.ts` in `compiler/src/codegen/`. This SCOPE doc does NOT address that gap; if the user wants match-block-form body-render, that's a separate dispatch with separate ratification. Mentioning here only so the architecture decision in §3 is informed.

### §2.4 Existing reuse infrastructure

The compiler already has working infrastructure for the constituent parts of body-render:

- **Markup parsing** — block splitter + AST builder parse markup at program scope and component scope into walkable nodes today. The parsed `EngineStateChildEntry.bodyRaw` is a substring of the same markup grammar; the parser is structurally capable, just not currently invoked on body content.
- **Reactive event wiring** — `emit-event-wiring.ts` wires `onclick=` event handlers for markup at program scope. The same machinery should drive event handlers inside state-child bodies.
- **`${@cell}` interpolation reactive emission** — `emit-reactive-wiring.ts` handles `${...}` interpolation in markup. Reusable verbatim.
- **Variant-guarded rendering precedent** — `emit-control-flow.ts` handles `match-stmt` with variant-keyed dispatch. The mechanism for "render this block when variant equals X" exists at the statement level; extending to markup-tree dispatch is the new piece.

Reuse story is strong: this is plumbing existing parts together with one new variant-guarded markup emitter, not building from scratch.

---

## §3 Architecture — three options for §3.X choice

The architectural question is **how does body-render lower to JS**. Three options. PA recommendation in each section; final choice gates this dispatch.

### §3.1 Option A — Synthesize implicit `<match for=Type on=@<varName>>` lowering

Engine `<engine for=Phase>` with state-children `<Idle>...</> <Loading>...</> <Error msg>...</> <Empty/> <Success count>...</>` lowers to an implicit match block over `@<varName>`:

```scrml
<engine for=Phase initial=.Idle>
  <Idle rule=.Loading>
    <button onclick=load()>Load</button>
  </>
  <Loading rule=(.Success | .Error | .Empty)>
    Loading...
  </>
  <Error msg rule=.Loading>
    <div>${msg}</div>
    <button onclick=${@phase = .Loading}>Retry</button>
  </>
</>
```

→ lowers conceptually to (the user never writes this; compiler emits it):

```
<match for=Phase on=@phase>
  <Idle><button onclick=load()>Load</button></>
  <Loading>Loading...</>
  <Error msg><div>${msg}</div><button onclick=${@phase = .Loading}>Retry</button></>
  ...
</>
```

- **Pro:** uniform with primer's "two Tier-1 shapes coexist" framing. Engines ARE (in part) match blocks with extra rule= machinery; reusing match block-form codegen for the rendering aspect is structurally honest.
- **Pro:** match block-form is explicitly the canonical UI-tree shape per primer §1. Engine bodies render the same way match arm bodies render.
- **Con:** requires match block-form codegen to exist OR to be built alongside this dispatch. Per §2.3, match block-form codegen does not exist today. This Option's actual cost is **engine body-render + match-block-form codegen as a bundle.**
- **Con:** the implicit-lowering story doesn't translate directly because engines have additional substrate (variant cell, transitions table, `<onTransition>`, `<onTimeout>`, history) that match doesn't. The "engine = match + extras" framing is conceptually clean but architecturally incomplete.

### §3.2 Option B — Per-state-child render functions guarded on variant equality

Direct emission: each state-child body becomes a render function; a top-level dispatcher reads `@<varName>` and calls the matching render function. Mechanically:

```js
function _scrml_engine_phase_render() {
  const v = _scrml_reactive_get("phase");
  if (v.tag === "Idle")    return _render_phase_Idle();
  if (v.tag === "Loading") return _render_phase_Loading();
  if (v.tag === "Error")   return _render_phase_Error(v.payload[0]);
  ...
}
function _render_phase_Idle() { /* button(load) */ }
function _render_phase_Loading() { /* "Loading..." */ }
function _render_phase_Error(msg) { /* div + button */ }
```

Reactive subscribe `@phase` → re-run dispatcher → DOM update. Standard reactive markup re-render shape.

- **Pro:** doesn't require match block-form codegen to land first. Self-contained.
- **Pro:** payload binding (`<Error msg>` introducing `msg`) maps cleanly to a function parameter.
- **Pro:** easy tree-shake — emit nothing when all bodies are empty.
- **Con:** redundant with (eventual) match block-form codegen. When match block-form lands, engine and match will have parallel-but-distinct rendering machinery. Possible DRY violation.
- **Con:** mechanical; doesn't echo primer's structural framing.

### §3.3 Option C — Route bodyRaw back through ast-builder + reuse program-body codegen

Treat the state-child body as a sub-program: re-invoke the markup/expression parser on `bodyRaw` with state-child scope context (engine variable in scope, payload bindings injected), then emit using the same `emit-html.ts` / `emit-reactive-wiring.ts` / `emit-event-wiring.ts` paths the program body uses. Wrap each state-child's body emission in a variant-guard at the dispatcher level (same dispatcher mechanic as Option B, but the body emission inside reuses program-body emitters).

- **Pro:** maximal reuse of existing emitters. New code = the dispatcher + the parser re-invocation glue.
- **Pro:** consistent with how bodies render at every other scope (program, component) — engines become a third site for the same body emission machinery.
- **Pro:** doesn't bundle match block-form codegen.
- **Con:** parser re-invocation adds complexity around scope context (need to inject state-child variant, payload bindings, engine variable). C12 SURVEY explicitly noted this concern: *"re-running the block splitter + AST builder on each `bodyRaw` substring … a parser-architecture change"*.
- **Con:** phase A1b/A1c walkers (B1-B22) operate on the file-level AST; re-parsed body sub-trees might not get walked by them automatically. Risks: missed validations, missed reactive-dep tracking. Mitigation: integrate the re-parse output BACK into the file-level AST as proper engine-decl child nodes BEFORE A1b walks (i.e., the re-parse happens at A1a / TAB-stage, not codegen-stage).

### §3.4 Option C-prime — Option C with factored variant-guard helper discipline (RATIFIED S78)

After S78 weighing-matrix discussion comparing A vs C honestly: plain Option C lands engine body-render fast but creates a fork-merge cost when match block-form codegen later arrives (Tier-1 rendering primitive). Option A bundles match-block-form ratification surface that has no current scope. The middle path, **Option C-prime**, captures A's structural rightness without bundling A's ratification surface:

> Build engine body-render via a factored variant-guard helper:
> ```
> emitVariantGuardedRender(varExpr, arms[{tag, payloadBindings, body}], emitterCtx) → JS
> ```
> Engine's body-render dispatcher calls it. When match block-form codegen lands later, ITS dispatcher calls the same helper. New code in this dispatch: helper + engine consumer. Future match-block-form dispatch: just adds a second consumer. **No fork to merge later — the consolidation is at the helper level, not at the lowering level.**

**Key discipline that makes this work:** the helper signature must be variant-source-agnostic. It does NOT take an `engine-decl`; it takes `(variantExprAccessor, arms, ctx)`. The engine consumer maps `engine-decl.engineMeta.stateChildren` → `arms[]` and passes `() => _scrml_reactive_get(varName)` as the accessor. The future match consumer maps `match-block-form-decl.armNodes` → `arms[]` and passes the `on=` expression's emitted form as the accessor. Both consumers feed the same helper; the helper has no knowledge of which Tier called it.

**Promotion-ladder fidelity preserved.** When match block-form codegen lands as a separate small dispatch (estimated ~5-10h), it adds only a thin consumer; the rendering machinery is identical. The user's structural intent (Tier-1 state-children carry forward verbatim to Tier-2) holds at the codegen level, just realized via shared helper rather than via lowering-into-match.

**Pillar 5 honesty.** The factored helper IS the universal structural-rendering primitive. Engine and match-block-form are two consumers of one rendering machinery. That's the "all scrml is scrml" pillar applied at the codegen layer.

**Cost.** ~10-17h same as plain C; the helper-factoring is discipline, not extra LOC. Phase 3 codegen step writes the helper as its first deliverable, then writes the engine consumer that calls it.

**Out-of-scope reaffirmed.** Match block-form consumer is NOT in this dispatch. Helper is built generic; only engine consumer is wired. Future match-block-form scope is a separate ratification.

---

## §4 Phase 0 — Capability survey (~1-2h, MUST run before architecture lock)

Per the depth-of-survey discount precedent (primer §12, 7+ confirmed occurrences of survey-cuts-cost 2-5x), Phase 0 is mandatory before scope finalizes. The architecture choice in §3 is PA's lean; Phase 0 either confirms or corrects it.

Phase 0 deliverables:
1. Read `engine-statechild-parser.ts` end-to-end. Determine the cost of attaching parsed body subtrees to `engine-decl.children` vs leaving as `bodyRaw` and re-parsing later.
2. Read `ast-builder.js` markup parsing entry points. Determine if re-invocation on a substring is feasible without parser-arch change, or if scope-context injection requires new infrastructure.
3. Walk the A1b PASSes (B1-B22) and identify which would need to walk engine state-child body subtrees if those subtrees existed (i.e., what are the downstream consumers we're enabling).
4. Read `emit-html.ts` + `emit-reactive-wiring.ts` + `emit-event-wiring.ts` and confirm they accept arbitrary markup subtrees and emit correctly without scope-context awareness (or what context they need).
5. Read `emit-machines.ts` and the legacy `<machine>` body codegen path — does the legacy machine render its bodies? If so, what mechanism does it use? (Possible Option D — reuse the legacy mechanism.)
6. Final cost estimate per Option A / Option B / Option C with Phase 0 findings folded in.

Phase 0 may surface a cleaner option not enumerated in §3. Survey output: a 1-2-page brief that gates §5.

---

## §5 Implementation outline (assumes Option C ratified; revise per Phase 0)

### Phase 1 — Parser integration (~3-5h)
- Extend `engine-statechild-parser.ts` to invoke the markup parser on each state-child's `bodyRaw` substring with correct scope context (engine variable in scope, payload bindings as locals).
- Attach parsed body subtree to `engine-decl.children` (or a sibling `engine-decl.stateChildBodies` field) so A1b walkers can reach it.
- `EngineStateChildEntry` extension: `bodyAST?: ASTNode[]` populated when the body is non-empty + non-trivial; `bodyRaw` retained for forensic / fallback.
- Payload binding extraction: `<Variant payload1 payload2>` opener should already extract payload names per B15; ensure they're recorded on `EngineStateChildEntry.payloadBindings: string[]`.
- New tests: parser round-trip for empty / text-only / markup / interpolation / event-handler / payload-binding bodies.

### Phase 2 — Typer integration (~2-4h)
- Validate that A1b PASSes (B1, B3, B6, B8, B17.3, etc.) walk engine state-child body subtrees correctly.
- Scope-injection at the body subtree: engine variable in scope, payload bindings as `let`-equivalent locals.
- Confirm existing E-* error codes fire correctly when violations occur inside state-child bodies (e.g., E-NAME-COLLIDES-STATE if local shadows state name; E-DERIVED-VALUE-MUTATE if a `const`-derived cell is mutated inside a state-child body).
- New tests: each known walker fires its diagnostic when triggered inside an engine state-child body.

### Phase 3 — Codegen (~3-5h, C-prime discipline)
- **First deliverable: factored variant-guard helper** at new `compiler/src/codegen/emit-variant-guard.ts` (or similar). Signature shape:
  ```
  emitVariantGuardedRender(
    variantExprAccessor: () => JsExpr,   // engine: () => `_scrml_reactive_get(varName)`; match: () => `<emitted on= expr>`
    arms: Array<{ tag: string; payloadBindings: string[]; body: ASTNode[] }>,
    ctx: CodegenCtx
  ): { dispatcherJs: string; renderFunctionsJs: string }
  ```
  Helper has no knowledge of engine vs match. Tree-shake-aware (returns empty strings when all `arms[].body` are empty).
- **Second deliverable: engine consumer.** Map `engineMeta.stateChildren` → `arms[]` (extract `tag`, `payloadBindings`, `bodyAST` from each entry); construct `variantExprAccessor` reading the engine variable cell; call helper.
- Reactive subscribe to `@<varName>` → re-run dispatcher on variant change → DOM update.
- Tree-shake: when ALL state-child bodies are empty, helper returns `{ dispatcherJs: "", renderFunctionsJs: "" }`; emit-engine emits nothing extra. C12 placeholder marker preserved as documented debug aid (Q4 ratified).
- Replace the 5 placeholder-marker sites in `emit-engine.ts` (lines 46, 754, 1307, 1348) + `emit-client.ts:611` with calls into the new body-render emission.
- Payload binding: emitted as render-function parameters, sourced from variant payload tuple.
- Reuse existing `emit-html.ts` / `emit-reactive-wiring.ts` / `emit-event-wiring.ts` to walk arm body subtrees (helper passes them through `ctx`).
- **No match-block-form consumer in this dispatch.** Helper is built generic; only engine consumer is wired. Future match-block-form scope adds its own consumer in a separate ratified dispatch.

### Phase 4 — Tests (~2-3h)
- ~15-25 unit tests in `compiler/tests/unit/engine-body-render.test.js` covering parser / typer / codegen.
- ~5-8 integration tests in `compiler/tests/integration/` covering compile + run engines with bodies; assert correct DOM updates on variant transitions.
- Tree-shake invariant test: empty-bodies engine produces zero body-render runtime overhead.
- Regression sweep: existing 10961-pass baseline, confirm 0 regressions.

### Phase 5 — Docs (~30min)
- IMPLEMENTATION-ROADMAP.md §2.5 (or new §2.5a): mark body-render SHIPPED.
- PA-SCRML-PRIMER.md §7: remove the "body rendering deferred" framing; add a one-paragraph note that engine state-child bodies render reactively on variant change.
- This SCOPE doc gets a STATUS line marking SHIPPED + commit hash.

**Total estimate:** ~10-17h (10h optimistic if Phase 0 finds heavy reuse; 17h pessimistic if scope-injection turns out to need new infrastructure). Compare to A5-4 codegen which estimated 10-15h, shipped in ~9h.

---

## §6 Out-of-scope

- **Match block-form body codegen** (`<match for=Type on=expr> arms </>` markup tree). Separate dispatch with separate ratification.
- **Component body render context** — engines can NOT be inside component bodies (E-COMPONENT-ENGINE-SCOPE). This dispatch only handles engines at file or program scope.
- **Nested engine bodies** (`<engine>` declared inside an outer engine's composite state-child, per §51.0.Q) — they need their OWN body-render once their decl-scope body-render is solved. Out of scope for this dispatch; they ride the same machinery once it lands.
- **History-attribute interaction** (composite state-children with `history`). Body-render in a composite state-child should not change the history semantics of the inner engine. Surface in Phase 0 if interaction is non-trivial.
- **Non-enum engine bodies** (`<engine for=Type>` where `Type` is not an enum). Per DD6 §3.1: "for engines `for=Type` where Type is a non-enum, one state-child per discriminator value" — same architecture should work; verify in Phase 0.

---

## §7 Open questions for user ratification

**Q1 — Architecture choice:** Option A (match-block-form lowering, bundles match codegen) / Option B (per-state-child render functions) / Option C (re-parse + reuse program-body emitters) / Option D (TBD from Phase 0). PA recommendation: **Option C**, with Phase 0 confirming feasibility.

**Q2 — Match block-form coupling:** does the user want this dispatch to *bundle* match block-form codegen, or stay strictly engine-scoped? Bundling = Option A. Strict = Option B or C. Affects total cost (~+5-8h to bundle).

**Q3 — Phase 0 dispatch shape:** PA-direct (PA reads + writes the survey, ~1-2h) vs single agent dispatch (~2-3h)? Phase 0 is small; PA-direct preferred for tight feedback loop. Surface as choice point.

**Q4 — Tree-shake placeholder semantics:** when an engine has all-empty bodies, today's `// §51.0.D engine mount position: ...` comment marker is meaningful (it documents the mount position for downstream debug). Should this dispatch retain the marker even when no body-render code emits? PA lean: **retain** — debug aid; zero runtime cost.

**Q5 — A5-6 Feature 1 follow-on bundling:** after body-render lands, A5-6 Feature 1 (named timer + cancelTimer, ~2-3h per its SCOPE doc) is a small follow-on. Bundle into this dispatch (gives a complete A5-6) or separate dispatch (smaller scope, cleaner gates)? PA lean: **separate** — body-render is enough scope; A5-6 Feature 1 is a clean follow-on with its own SCOPE doc already.

**Q6 — Veto:** is body-render actually wanted now, or should it defer further (e.g., until adopter friction reports demand it)? Per pa.md Rule 1 + Rule 3: substantive bar is "compiler working as planned"; engines without body-render are structurally incomplete; deferring further compounds the deferral chain (§2.2) without addressing the gap. PA recommends **proceed**.

---

## §8 Files expected to change (assumes Option C ratified)

| File | Change | Est LOC |
|---|---|---|
| `compiler/src/engine-statechild-parser.ts` | Body parse + attach to entry | +~80-150 |
| `compiler/src/ast-builder.js` (or new helper) | Sub-AST integration glue | +~30-80 |
| `compiler/src/symbol-table.ts` | `EngineStateChildEntry.bodyAST` field; PASS extensions for body-walk if needed | +~30-60 |
| `compiler/src/codegen/emit-variant-guard.ts` (NEW) | Factored variant-guard helper (engine + future match-block consumer) | +~80-150 |
| `compiler/src/codegen/emit-engine.ts` | Replace 5 placeholder sites with helper-driven body-render emission; engine consumer of `emit-variant-guard.ts` | +~80-150 |
| `compiler/src/codegen/emit-client.ts` | Replace `:611` placeholder | +~10-30 |
| `compiler/tests/unit/engine-body-render.test.js` (NEW) | ~15-25 unit tests | +~250-400 |
| `compiler/tests/integration/engine-body-render.test.js` (NEW or extend existing) | ~5-8 integration tests | +~150-250 |
| `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` | Add Phase A10 entry; mark SHIPPED on close | +~20-40 |
| `docs/PA-SCRML-PRIMER.md` | Remove deferral-framing in §7; add one-paragraph body-render description | +~10-20 |

**No SPEC text expected.** DD6 already covers the design; this is implementation. If Phase 0 surfaces a spec gap, surface as a separate ratification.

---

## §9 Dispatch shape

**Tiered: Phase 0 (PA-direct or single agent) → Phase 1+2 (one bundle dispatch) → Phase 3+4 (one bundle dispatch) → Phase 5 (PA-direct).**

- **Phase 0** (~1-2h): PA-direct (default) or `general-purpose` agent if user prefers parallel work. Output: ratified architecture + cost confirmation.
- **Phase 1+2** parser + typer (~5-9h): one `scrml-dev-pipeline` dispatch with worktree. Brief paste-in: SCOPE-AND-DECOMPOSITION.md + Phase 0 output + the F4 worktree-discipline block.
- **Phase 3+4** codegen + tests (~5-8h): one `scrml-dev-pipeline` dispatch with worktree. Depends on Phase 1+2 landing.
- **Phase 5** docs (~30min): PA-direct.

**Crash-recovery + landing:** standard worktree-as-scratch / file-delta protocol per pa.md S67 standing rule. PA reviews diff at landing, `git checkout <agent-branch> -- <files>`, single PA-authored commit per dispatch.

**Authorization checkpoints:**
1. User ratifies §7 OQs — this SCOPE doc transitions PENDING → RATIFIED.
2. Phase 0 lands — architecture confirmed or revised.
3. Phase 1+2 landing — review + commit + push (subject to per-action authorization).
4. Phase 3+4 landing — review + commit + push.
5. SHIP marker.

---

## §10 Tags

#phase-a10 #engine-state-child-body-render #unblock-a5-6-feature-1 #dd6-implementation-residue #ratified-s78 #c-prime-factored-helper #promotion-ladder-respected
