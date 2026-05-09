# Phase A1c — Step C12: Engine state-machine runtime (Wave 4 foundational)

**Phase:** A1c. Wave 4 sequential head — C13/C14/C15 all depend on C12's transition-table + variant-cell + initial-state shape.
**Estimate:** 5-7h focused (per SCOPE §4.4) + Wave 4 contingency 6-10h pool (per SCOPE §6.1 — engine substrate may surface gaps).
**Dispatched:** 2026-05-08 (S74).
**Authority chain:** SPEC §51.0.A through §51.0.G + §51 (engine declaration / variant cell / mount / initial= / rule= contract / .advance() — though `.advance` runtime API is C13). SCOPE-AND-DECOMPOSITION row C12 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:230` + `:298` A1b dependency = B14 + `:349` strict sequential).

## Goal (one paragraph)

Emit the **runtime substrate** that turns an `<engine for=Type initial=.X>` declaration into a working singleton state machine. After C12 lands, every engine declaration in compiled output produces:
1. **One auto-declared reactive variant cell** (`@<typeNameLowerFirst>: Type`) typed as the enum, owning the engine's current state (§51.0.C).
2. **One transition table** — a static, encoded representation of the state-children's `rule=` contracts, keyed by from-state variant (§51.0.F).
3. **Initial state wired** from the `initial=.Variant` attribute (§51.0.E; `W-ENGINE-INITIAL-MISSING` lint already fires at A1b/B14 with default-to-first-state-child semantics — C12 honors A1b's resolved initial value).

C12 is the SUBSTRATE. C13 layers `.advance()` + `<onTransition>` hook firing on top. C14 layers `derived=expr` engines. C15 layers cross-file engine import / `<EngineName/>` mount + auto-declared-variable visibility across files. **Out of C12 scope:** `.advance()` API method on the cell; `<onTransition>` hook firing; derived engines; cross-file mount; legacy `<machine>` keyword (already shipped via `emit-machines.ts`).

**Note on rule= validation for direct writes:** §51.0.F requires that direct writes (`@marioState = .Big`) be validated against the from-state's `rule=`. Whether the validation hook lands in C12 (substrate "transition table is consulted on writes") or C13 (alongside `.advance` which uses the same contract) is a SURVEY DECISION. Lean: if the runtime cell-write path can hook the table cheaply at C12, do it here — `E-ENGINE-INVALID-TRANSITION` runtime emission is then a thin shared dispatch C13 reuses. If the hook is non-trivial, surface to PA + defer to C13.

## What's already in place (depth-of-survey signal)

**Survey FIRST. Several substrates likely already exist for legacy `<machine>` and may or may not extend cleanly to `<engine>`:**

- **`compiler/src/codegen/emit-machines.ts`** (719 LOC) — legacy `<machine>` codegen. Already exports `emitTransitionTable(tableName, rules)`, `emitProjectionFunction`, `emitDerivedDeclaration`, `buildBindingPreludeStmts`, `classifyTransition`, `emitTransitionGuard`. Survey: does it run on `<engine>` AST nodes today? If yes (because S57 D2.8 may have aliased the openers), C12 may just need to verify + extend — NOT NEW. If no, decide whether to extend `emit-machines.ts` (preferred — single-source-of-truth for state machines) or NEW `emit-engine.ts` (only if architecturally justified).
- **`compiler/src/engine-statechild-parser.ts`** (768 LOC) — parses engine state-children. Survey: what AST shape does it produce? Does each state-child carry a `rule=` parsed form? Is the engine-decl AST node carrying enough to drive C12 emission directly?
- **`compiler/src/runtime-template.js`** (2128 LOC) — already has `_scrml_machine_timers`, `_scrml_machine_arm_timer`, `_scrml_machine_clear_timer`, `_scrml_machine_arm_initial` for legacy machine temporal. Survey: are these helpers reusable for `<engine>`? Is there an existing `_scrml_engine_*` family? Are runtime helpers needed for the variant cell + table beyond what reactive-cell substrate already provides?
- **`compiler/src/codegen/usage-analyzer.ts`** (already shipped C0) — has `engines: boolean`, `derivedEngines`, `engineHistory`, `engineInternalRules`, `engineOnTimeout`, `engineNested`, `onTransitionHooks` flags. Survey: confirm `engines: true` triggers a runtime chunk gate that can carry C12's runtime additions.
- **`compiler/src/codegen/runtime-chunks.ts`** (chunk #17 for C10's `messages` is the latest) — survey whether engine substrate gets a NEW chunk (`engine`) gated on `usage.engines === true`, or whether C12's adds are small enough to live in `core` / inline at decl site. Lean: NEW `engine` chunk if any non-trivial engine-specific runtime helpers ship; inline if substrate is purely declarative table + reactive cell init.
- **A1b B14** (engine binding) — confirm what B14 attached to engine-decl AST nodes. Per A1b SCOPE: variant cell name, resolved initial variant (post-W-ENGINE-INITIAL-MISSING default-to-first), transition table data structure (or raw rule= attributes), parent-scope binding (file-scope vs. nested). C12 CONSUMES whatever B14 emitted; do NOT re-derive at codegen.
- **`compiler/src/codegen/emit-client.ts`** (line 184 `case "state-decl"`) — main per-statement emission switch. Engine-decl is likely a separate AST `kind` — find/confirm the case arm for engine emission (or `case "engine-decl"` if that's the AST kind name). Wire C12's emitter from there.
- **`compiler/src/codegen/emit-logic.ts`** (called from emit-client) — confirm whether engine-decl emission flows through emit-client direct, or via a logic-context emitter.

## Scope (in / out)

**IN scope (C12):**

1. **Variant cell emission** — for each `<engine for=Type initial=.X [var=name]>`, emit:
   - One reactive cell declaration named `<varName>` (auto-derived `lowerFirst(Type)` per §51.0.C, or `var=` override).
   - Cell type is `Type` (the enum).
   - Cell init value is the resolved initial variant (`initial=.X` literal, or A1b's W-ENGINE-INITIAL-MISSING default-to-first-state-child variant).
   - Cell uses standard reactive-cell substrate (`_scrml_state` + `_scrml_reactive_get/set`) — NOT a new cell kind.

2. **Transition table emission** — for each engine, emit a static const naming the table (e.g., `_scrml_engine_<varName>_transitions`) whose value encodes:
   - Keyed by from-variant name (string).
   - Each entry is the legal target set: `["X"]` for single-target, `["A","B","C"]` for multi-target, `"*"` (or sentinel) for wildcard.
   - Survey: leverage existing `emit-machines.ts:emitTransitionTable` if shape matches; else fork or extend.
   - **Do NOT inline duplicated table data** at every write site. ONE table per engine, referenced by table name.

3. **Initial-state wiring** — the variant cell's init-value comes from A1b's resolved `initialVariant` annotation on the engine-decl AST node. If A1b has not annotated it, fall back to the literal from `initial=.X`. Do NOT re-derive default-to-first here (that is A1b/B14's job per §51.0.E lint behavior).

4. **(SURVEY DECISION) Direct-write rule validation** — if the runtime cell-write path can hook the transition table cheaply, emit a write-interceptor that:
   - Reads the current variant via `_scrml_reactive_get`.
   - Looks up the from-state's legal targets in the transition table.
   - If the new value's variant tag is in the legal set (or `*`), proceeds with the write.
   - Else throws `E-ENGINE-INVALID-TRANSITION` (runtime severity per §34 line 14376 — the runtime severity is already specced).
   - Compile-time-known from-state is OUT of C12 scope (that requires control-flow analysis of state-child body context — likely C13 or later).
   - **If non-trivial: defer to C13 + add a TODO + surface to PA.** C13 will need the same hook for `.advance()` anyway.

5. **AST `kind` discrimination** — make sure C12's emission arm fires on the correct AST kind. Likely `engine-decl` (or `state-decl-engine` per any naming convention already in use). Survey + confirm. If `<engine>` declarations are currently routed through legacy `emit-machines.ts` paths via aliasing, C12 may simplify to "wire the engine path to use the same substrate, plus emit any new annotations B14 added that legacy didn't have."

6. **Same-file mount position emission** — per §51.0.D, the engine's DECLARATION position IS its rendered output position. The engine's body (state-children with their own bodies — text / `<onTransition>` / nested markup / `:`-shorthand) renders. C12's responsibility is to ensure the variant cell + transition table get DECLARED at the engine's source position (so other expressions in the file's emit context can reference them), and that the body MARKUP path picks up the cell. **Body markup expansion based on current variant** (the "render `<Small>`'s body when `@marioState == .Small`" behavior) — survey whether that's already wired via existing markup-walker dispatching on `<match for=Type on=expr>`-equivalent shape, OR whether it's new emission C12 must add. Lean: if `<engine>`'s body-rendering is parallel to `<match>`'s render-by-variant dispatch, reuse; else surface as a scope question.

7. **Tests:**
   - Unit test: `compiler/tests/unit/c12-engine-state-machine-runtime.test.js`. Cover at minimum:
     - Single engine, simple states, single-target rules — variant cell declared with correct name + initial value; transition table emitted with correct shape.
     - Multi-target rule — table entry is array of target names.
     - Wildcard rule — table entry is `"*"` sentinel.
     - `var=` override — variant cell uses the override name.
     - W-ENGINE-INITIAL-MISSING precondition: A1b's default-to-first-state-child resolution flows into C12's emission.
     - Multiple engines in one file — each gets its own variant cell + transition table; no name collisions.
     - (If direct-write hook is in scope per survey decision) — direct-write emits validation; legal write proceeds; illegal write throws E-ENGINE-INVALID-TRANSITION at runtime.
   - Browser test follow-up (if needed): defer to C13/C14 — C12's substrate is largely visible via emit-output assertions.

**OUT of scope (deferred):**

- **`.advance(.event)` method emission** — **C13.**
- **`<onTransition>` hook firing** — **C13.**
- **`<onTimeout>` runtime** (§51.0.M S67 amendment) — separate work; rides §51.12 legacy machine temporal substrate.
- **`derived=expr` engines** — **C14** (consumes B16).
- **Cross-file engine import + `<EngineName/>` mount + auto-declared-variable visibility across files** — **C15** (consumes B17).
- **Nested engines** (§51.0.Q S67) — out of A1c Wave 4 entirely; declared "structural" per A1b but codegen for the nested case may need a Wave 4 sub-step or a follow-up.
- **`history` attribute** (§51.0.N), **`internal:rule=`** (§51.0.O) — out of A1c Wave 4 entirely.
- **Compile-time rule= validation when from-state is statically known** — likely C13 or later (needs context-tracking inside state-child body markup walker).
- **Legacy `<machine>` keyword** — already shipped via `emit-machines.ts`; C12 must NOT regress it. If C12 reuses `emit-machines.ts`, ensure legacy paths still work.
- **`E-ENGINE-INVALID-TRANSITION` compile-time emission** when from-state is known — out per above.

## Spec verification (pa.md Rule 4)

Spec sections to read (verbatim) BEFORE writing any code or test assertions:

- **§51.0.A** (lines ~20195-20218) — engines as singleton; defining traits; component distinction.
- **§51.0.B** (lines ~20220-20264) — declaration syntax; attribute table (for=Type REQUIRED, initial=.Variant REQUIRED on non-derived, derived= mutually exclusive, pinned, var=); state-children shape; canonical Mario worked example.
- **§51.0.C** (lines ~20265-20299) — auto-declared variable; lowercase-first-character derivation rule + table; var= override; E-ENGINE-VAR-DUPLICATE if separately declared; derived engines have read-only variable.
- **§51.0.D** (lines ~20301-20347) — declaration IS mount position; cross-file via `<EngineName/>` (C15 scope, not C12); singleton across mount sites; render-only mount, no body at use-site.
- **§51.0.E** (lines ~20349-20377) — `initial=` REQUIRED on non-derived; W-ENGINE-INITIAL-MISSING + default-to-first; FORBIDDEN on derived (E-DERIVED-ENGINE-NO-INITIAL).
- **§51.0.F** (lines ~20379-20427) — three rule= forms (single-target / multi-target / wildcard); direct-write enforcement via Move 12 (the contract-on-writes part); compile-time known from-state vs. dynamic runtime enforcement; E-ENGINE-INVALID-TRANSITION runtime severity.
- **§51.0.G** (lines ~20429-20455) — `.advance()` semantics. **Read but recognize C13 owns this** — C12's transition-table substrate must be shaped to support C13's .advance integration.

§34 error code rows to confirm:
- **E-ENGINE-INVALID-TRANSITION** (§34 line ~14376) — runtime severity. C12 emits the throw IF direct-write hook is in scope per survey decision.
- **W-ENGINE-INITIAL-MISSING** (§34 line ~14379) — A1b/B14's responsibility; C12 just consumes the resolved initial value.

**Rule 4 enforcement:** if the SCOPE doc or any derived planning artifact contradicts the spec text on any of the above, the SPEC WINS. Quote the spec line in the SURVEY before writing a contradicting test or emission.

## Dispatch protocol

S67 worktree-as-scratch / file-delta landing.

## Authorized decisions

- **File locus (lean):** EXTEND `compiler/src/codegen/emit-machines.ts` if `<engine>` AST already routes through it (survey-confirm). NEW `compiler/src/codegen/emit-engine.ts` only if architecturally justified by the survey (e.g., `<engine>` AST is structurally distinct from `<machine>` AST at the kind level). If NEW: live as sibling of emit-machines.ts, share helper imports.
- **Runtime locus (lean):** if any new helpers needed beyond reactive-cell substrate, add to `compiler/src/runtime-template.js` and gate via NEW `engine` chunk in `runtime-chunks.ts` (chunk #18) keyed on `usage.engines`. If no new helpers needed (substrate carries everything declaratively), no runtime-template.js touches.
- **Test file:** `compiler/tests/unit/c12-engine-state-machine-runtime.test.js`.
- **Naming convention for emitted globals:** `_scrml_engine_<varName>_transitions` for the table; `_scrml_engine_<varName>_initial` if a separate const is needed for initial value (else inline). Survey: align with whatever naming `emit-machines.ts` already uses; consistency over novelty.

## Sibling-dispatch awareness

**No siblings — Wave 4 is strict sequential.** C12 owns the engine codegen surface entirely for this dispatch. C13 / C14 / C15 will dispatch AFTER C12 lands. There are no parallel dispatches running this turn — no sibling-territory-awareness needed.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — **READ BEFORE WRITING ANY CODE** and **REREAD before each subtask** (variant-cell emission, transition-table emission, initial-state wiring, direct-write hook decision). Engine state machines have heavy XState / SCXML / Redux / ngrx-style training-data bias — the scrml shape is `<engine for=Type initial=.X>` with state-children declaring transitions, NOT `createMachine({ ... })` factory with `states: { ... }` config object.

`docs/articles/llm-kickstarter-v1-2026-04-25.md` — **READ IN FULL** before generating any scrml code (test fixtures, code samples, etc.). The kickstarter has the canonical engine + state-machine recipes including the Mario example and Loading.WithCache/NoCache patterns.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-machines.ts` (likely) | Extend for `<engine>` AST emission, OR confirm `<engine>` already routes through it and add C12-specific emission paths |
| `compiler/src/codegen/emit-engine.ts` (POSSIBLE NEW) | Only if survey establishes architectural justification |
| `compiler/src/codegen/emit-client.ts` (likely) | Wire C12 emitter into the per-statement switch (case "engine-decl" or similar) |
| `compiler/src/runtime-template.js` (possible) | If new helpers required beyond reactive-cell substrate — survey decision |
| `compiler/src/codegen/runtime-chunks.ts` (possible) | NEW `engine` chunk (#18) if runtime-template.js touched + gated on `usage.engines` |
| `compiler/src/codegen/emit-logic.ts` (possible) | If engine-decl flows through logic-context emission |
| `compiler/tests/unit/c12-engine-state-machine-runtime.test.js` (NEW) | Unit tests per §scope IN item 7 |
| `compiler/tests/runtime-tree-shaking.test.js` (possible) | If new chunk added, regenerate expectations |
| `docs/changes/phase-a1c-step-c12-engine-state-machine-runtime/{progress,SURVEY}.md` | Crash-recovery + survey output (REQUIRED) |

## Definition of Done

- All §scope IN items shipped (variant cell + transition table + initial-state wiring + AST kind discrimination + same-file mount position emission + tests).
- (If direct-write hook in scope per survey) — direct-write rule validation working with E-ENGINE-INVALID-TRANSITION runtime throw.
- 0 regressions vs baseline (10,308 / 60 / 1 / 0 at S73 close).
- Spec re-verified against §51.0.A through §51.0.G in SPEC.md text, NOT against this brief or SCOPE doc.
- Legacy `<machine>` keyword path not regressed (smoke-test if `emit-machines.ts` was extended).
- C13 unblocked — final report names what C13 needs from C12's output (transition table accessor name, variant cell accessor pattern, write-hook seam if not added in C12).
- SURVEY.md documents:
  - File-locus decision (extend emit-machines.ts vs NEW emit-engine.ts) with reasoning.
  - Direct-write hook decision (in C12 vs deferred to C13) with reasoning.
  - Body-rendering reuse decision (existing `<match>`-shape vs new emission) with reasoning.
  - What B14 (A1b) annotates on engine-decl AST nodes that C12 consumes.
  - Verdict shape: SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER (latter two surface to PA).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<ABSOLUTE-WORKTREE-PATH-PROVIDED-BY-HARNESS>**

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean (or matches the expected pre-snapshot).
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main. The pre-commit hook's `bun test` will fail with "cannot find package 'acorn'" otherwise.
5. Run `bun run pretest` via Bash. This invokes `scripts/compile-test-samples.sh`, which populates `samples/compilation-tests/dist/`. Without it the full suite produces ~130 ECONNREFUSED-shaped failures.
6. Run `bun run test` (the full chained version, NOT `bun test` directly) via Bash to capture the baseline. Confirm 10,308 / 60 / 1 / 0 (or surface mismatch + halt).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe (absolute or relative). Reading from main via absolute path will give you the wrong file content (main may be AHEAD of your worktree).
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT use relative paths like `compiler/SPEC.md` — the harness resolves relative paths against an `Additional working directories` list that may include the main repo, causing silent writes to main's working tree.
- NEVER use absolute paths starting with the main repo root directly — those point to main and will leak your work product into main's working tree.
- If an intake doc / hand-off doc / conversation context references a path like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to `$WORKTREE_ROOT/foo/bar.ts` before writing.

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive the path from WORKTREE_ROOT.

## Crash-recovery protocol

Commit after each meaningful change — don't batch. Update `docs/changes/phase-a1c-step-c12-engine-state-machine-runtime/progress.md` after each step (timestamped append-only lines: what was just done, what's next, any blockers). WIP commits are expected. If you crash, your commits and progress file are how the next agent picks up.

## Final report format (when done)

Report back with:
- WORKTREE_PATH (absolute)
- FINAL_SHA (your branch tip)
- FILES_TOUCHED (list of files modified — for PA's `git diff main..<branch> -- <files>` review)
- VERDICT (SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER)
- TESTS at end: pass / skip / todo / fail counts
- DEFERRED-ITEMS: anything punted to C13 / C14 / C15 / PA-decision with brief reasoning
- SURVEY summary (one paragraph) — file-locus + direct-write-hook + body-rendering reuse decisions
- C13 HANDOFF: what C13 needs from C12 (table accessor name, variant cell accessor, write-hook seam status)
