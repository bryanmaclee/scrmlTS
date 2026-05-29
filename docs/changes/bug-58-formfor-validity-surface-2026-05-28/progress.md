# progress — bug-58-formfor-validity-surface-2026-05-28

(append-only, timestamped. Agent updates after each step. WIP commits expected.)

- DISPATCH (S140, baseline c4d5ef96): brief at BRIEF.md. Agent has not yet started.

## S140 agent execution (worktree agent-a47bb67a51eee3412)

- 2026-05-28 STARTUP: pwd=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a47bb67a51eee3412; toplevel matches; merged main FF e1630e93->73162ef9 (baseline incl BRIEF); status clean; bun install + pretest OK.
- READING done: BRIEF, audit §3.2, anti-patterns, kickstarter §formFor, SPEC §41.14 (full) + §55.1-§55.10 (full), primary.map.
- REPRO CONFIRMED (pre-fix). Compiled canonical formFor `/tmp/bug58/formfor.scrml`:
    - client.js `_scrml_reactive_declare`/`_scrml_derived_declare` count = 0; `_scrml_validator_fire` = 0; `submitted` = 0.
    - Markup half WIRED (signup-qualified bind sites, errors anchors, disabled-button gate) but reads `_scrml_reactive_get("signup")` which nothing declares.
    - E-DG-002 (W-DG-002 class) x3 orphan warnings for @name/@email/@agree.
    - onsubmit emits `function(event){ event.preventDefault(); _scrml_fetch_persistSignup_14(); }` — NO values arg; submitted never set.
- CONTROL CONFIRMED: hand-written `${ <signup>...</> }` compound `/tmp/bug58/handwritten.scrml` emits the FULL §55 surface (per-field+compound errors/isValid/touched/submitted + validator runners). Proves §55 machinery works for `${...}`-declared compounds.
- ROOT CAUSE confirmed: `collectTopLevelLogicStatements` (collect.ts:200) only yields state-decls inside `kind:"logic"` nodes. spliceFormFor (type-system.ts:11113) splices compound decl into markup-children (program.children) — never inside a logic node → never collected → validity surface dead. buildCompoundStateDecl (emit-form-for.ts:523) also omits `_cellKind:"compound-parent"` (the `Array.isArray(children)` fallback covers most consumers, but usage-analyzer.ts:587 keys strictly on the tag).
- FIX PLAN: (A) route synth compound decl into a synthetic top-level `logic` node prepended to fileAST.nodes (so collectTopLevelLogicStatements finds it); splice ONLY formElement into markup. (B) tag `_cellKind:"compound-parent"` in buildCompoundStateDecl. (C) submit wiring: pass collected values + set `@cell.submitted=true` before handler.

## S140 agent execution — FIX COMPLETE

Fixes landed (5 source files + 2 test files), each commit gated by the full
pre-commit suite (unit+integration+conformance, 0 fail):
1. `2bf0f8ed` ROUTING — type-system.ts spliceFormFor splices ONLY the <form>
   markup; the synth compound decl is collected + routed into a synthetic
   top-level `logic` node (so collectTopLevelLogicStatements → emit-logic →
   §55 validity-surface pass processes it). + emit-form-for buildCompoundStateDecl
   tags `_cellKind:"compound-parent"`. + submit wiring threads the cell name
   (emit-html → binding-registry → emit-event-wiring) so onsubmit sets
   `@signup.submitted=true` BEFORE invoking + passes the collected `values`.
2. `1b24d683` VALIDATOR ARGS — emit-form-for decorates synth validators via the
   canonical decorateValidatorsWithExprNodes so `length(>=2)`/`pattern(/.../)`
   emit structured args (was arg-less → runtime threw on relPred.value). + updated
   the 2 locked expander assertions (coupled code+test).
3. `0ea9005e` BIND→SURFACE — formFor's per-field bind:value uses a `_flatBindKey`
   marker so the write targets the dotted reactive cell `signup.name` directly
   (was deep-set on the derived `signup` parent = no-op → typed input never
   reached validators). Marker is formFor-local; generic compound bind unchanged.

Tests:
- `775c5204` conformance emit-regression (12 assertions; PROVEN fails-before
  10/12 fail on pre-fix source / passes-after 12/12). Runs in the pre-commit gate.
- `48fae25e` happy-dom runtime drive (9 tests; drive via real DOM inputs).
  Full browser suite 231 pass / 0 fail.

R26 EMPIRICAL (final baseline): canonical formFor recompiled — W-DG-002/E-DG-002
orphans GONE; all emitted JS `node --check` OK; validity surface fully emitted
(10 derived_declare, 5 validator_fire); submitted set + values forwarded; flat
bind write present. SECURITY: no _scrml_sql / server-fn body / SQL in client.js
(only the PE fetch wrapper).

DEFERRED (surfaced to PA — OUT OF SCOPE for Bug 58):
- `@compound.isValid` synthesized-property READ-path defect: the disabled-gate
  `disabled=!@signup.isValid` emits `!_scrml_reactive_get("signup").isValid`
  (member access on the compound PROXY object, which has no `.isValid`) instead
  of `_scrml_derived_get("signup.isValid")` (the dotted synth cell). Affects
  hand-authored compounds IDENTICALLY (verified) — a general §55.5/§55.7
  synthesized-property read-resolution bug, NOT formFor-specific, NOT introduced
  by Bug 58. Net effect: the default submit button stays disabled even when the
  form is valid. The happy-dom test documents this + asserts only the
  enabled-by-Bug-58 behavior (surface emitted + reactive + submit values/submitted).
- The generic compound-child bind-write (emit-bindings deep-set on the parent)
  is wrong for the derived-parent storage model generally; Bug 58 fixed it
  formFor-locally via `_flatBindKey`. A general fix would also let hand-authored
  `bind:value=@compound.field` feed the validity surface.
