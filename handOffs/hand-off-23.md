# scrmlTS — Session 23 Hand-Off

**Date opens:** 2026-04-18 (or whenever S23 starts)
**Previous:** `handOffs/hand-off-22.md`
**Baseline at last wrap:** **6,875 pass / 10 skip / 2 fail** (25,520 expects across 277 files) at commit `3e8f545`.

---

## 0. Cold-start state

### Recent pushes (all on origin/main)

- `3e8f545` **license: MIT** — LICENSE file, package.json license/author fields, README Status section flipped from "closed beta under proprietary license" to "open source under MIT". Repo is now public on GitHub.
- `ebd4a8b` **feat(§51.9): derived machines slice 2 — runtime codegen + E-MACHINE-017** — emitProjectionFunction, emitDerivedDeclaration, rejectWritesToDerivedVars. +10 regression tests.
- `9d90450` **feat(§51.9): derived/projection machines slice 1 — parser + validator** — `derived from @SourceVar` parsing, MachineType.isDerived/sourceVar/projectedVarName, validateDerivedMachines (E-MACHINE-004 for source resolution + transitive rejection, E-MACHINE-018 for exhaustiveness). +9 regression tests.
- `a1f0c76` **feat(§1b): payload bindings in machine transition rules** — parseMachineRules + resolveRuleBindings (E-MACHINE-015 three flavors), expandAlternation binding-parity check (E-MACHINE-016), buildBindingPreludeStmts in emit-machines. +15 regression tests.
- `d8ebfb3` **feat(§1a): match destructures tagged-object payload variants** — parseBindingList, __tag normalization, destructuring prelude in emitMatchExpr + emitMatchExprDecl, splitMultiArmString presence-arm detector fix. +10 tests, flipped "binding ignored" assertion.
- `2fbc332` **feat(§1a): enum payload variant construction via generated constructors** — per-payload-variant constructor functions inside the frozen enum object, dropped the inline `{variant, value}` string rewrite. +6 tests.

All on origin/main. No unpushed commits.

### Cross-repo state

- **Stale needs-push message in master inbox:** `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-17-1430-scrmlTS-to-master-push-s22-1a.md` — sent before user gave one-time push auth. Master PA can move it to `read/` next session; no action needed here.
- **scrml-support:** uncommitted S21 archive files (`archive/gauntlet-s19/`, `archive/expr-ast-phase-1-audit/`, `archive/expr-ast-phase-2-slice-3/`) — the older `handOffs/incoming/2026-04-17-1100-scrmlTS-to-scrml-support-archive-s21.md` message should have been processed by scrml-support's PA by now. Verify `git status` in that repo at S23 start.

### Incoming messages

None unread in `handOffs/incoming/` as of S22 wrap.

### Repo publicity

GitHub repo is public with MIT license. No restricted-distribution concerns for S23+.

---

## 1. Immediate §51.9 follow-up — DOM read-wiring for `@ui`

**Status:** blocking full §51.9 usefulness in real apps. The runtime works (`_scrml_reactive_get("ui")` returns the projected value), but `${@ui}` in markup doesn't trigger DOM updates because the dependency graph doesn't treat `@ui` as a reactive read.

**Symptom:** compile this (works today without errors):

```scrml
${
  type OrderState:enum = { Draft, Submitted, Paid, Shipping, Delivered, Cancelled, Refunded }
  type UIMode:enum = { Editable, ReadOnly, Terminal }
  @order: OrderMachine = OrderState.Draft
}

< machine OrderMachine for OrderState>
  .Draft => .Submitted
</>

< machine UI for UIMode derived from @order>
  .Draft => .Editable
  .Submitted | .Paid | .Shipping => .ReadOnly
  .Delivered | .Cancelled | .Refunded => .Terminal
</>

<program>
  <p>Mode: ${@ui}</>
</>
```

The emitted HTML has `<span data-scrml-logic="_scrml_logic_N"></span>` (placeholder) but no `_scrml_effect(() => ...)` binding to fill it. Writing `@order` won't update the DOM.

**Fix strategy (recommended):**

During `annotateNodes` in `type-system.ts`, after `validateDerivedMachines` runs and the projected-var map is known, SYNTHESIZE a lightweight reactive-decl AST node for each projected var. Something like:

```ts
for (const m of machineRegistry.values()) {
  if (!m.isDerived || !m.projectedVarName) continue;
  const synthDecl = {
    id: ++counter,
    kind: "reactive-decl",
    name: m.projectedVarName,
    isDerivedProjection: true,       // new flag for downstream consumers
    derivedFromSourceVar: m.sourceVar,
    derivedMachineName: m.name,
    init: null,                      // codegen is already emitted by emit-machines
    span: <machine decl span>,
  };
  fileAST.nodes.unshift(synthDecl);
}
```

Then update:

- **Dependency graph** (`compiler/src/dependency-graph.ts`): treat reads of a projected var as reads of its source var. Specifically, when an expression references `@ui`, emit a graph edge from the consumer to `@order` (not `@ui`). Look for where `reactive-decl` nodes are added to the graph — add the synthesized ones with a "derived" marker so they don't double-count.
- **Reactive wiring** (`compiler/src/codegen/emit-reactive-wiring.ts`): the existing effect emitter already wraps DOM bindings with `_scrml_effect(() => { el.textContent = _scrml_reactive_get("ui"); })`. The effect's dependency tracking (via `_scrml_track` in the reactive-get path) SHOULD auto-register `@ui` as a tracked dependency. Verify that when `_scrml_derived_get` is called inside an effect, the effect subscribes to dirty changes on the downstream name (`@ui`), which is what `_scrml_derived_downstreams` already drives.

**Risk:** the dep-graph has MANY places that check `kind === "reactive-decl"`. The synthesized node must be ignored by passes that analyze INITIALIZERS (it has no init), and must be acknowledged by passes that enumerate reactive variables. Expect 3–5 surprising spots to patch.

**Estimated scope:** medium. Start by adding the synthesized node + `isDerivedProjection` flag. Compile the example above and walk through what breaks; each broken path is a place to add an `if (node.isDerivedProjection) continue;` guard or a synonym behavior.

**Test target:** extend `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` with a compile-then-execute test that (1) installs a happy-dom DOM, (2) compiles a file with `${@ui}` in markup, (3) loads the client JS, (4) writes `@order`, (5) asserts the DOM text updated.

---

## 2. S20 deferred meta bugs (still open)

Four bugs from `handOffs/hand-off-20.md` "Bugs documented (11 — for future batch)" that didn't land in S21 or S22. Order recommendation: 2c → 2a → 2b → 2d (smallest scope → largest).

### 2a. `lin + ^{}` capture not counted as consumption (§22.5.3)

**Location:** `compiler/src/meta-checker.ts` — meta-capture scope analysis. The current checker detects linear variables captured by `^{}` but doesn't consume them. Per §22.5.3 a `lin` captured into a compile-time meta is consumed at capture time.

**Repro:**
```scrml
${
  lin x = 42
  ^{ use(x) }      // should consume x
  ^{ use(x) }      // should fail E-LIN-002 (double use)
}
```
Currently no error fires; should fire E-LIN-002 on the second reference.

**Fix sketch:** find where meta-checker identifies captured-scope vars, cross-reference to the linear-type tracker, mark them consumed.

### 2b. Phase separation detected at eval-time, not checker-time

**Location:** `compiler/src/meta-eval.ts` — the eval loop throws when it hits runtime-only operations. Should be a checker-time error before eval runs.

**Repro:**
```scrml
@count = 0
^{ use(@count) }  // reactive read inside compile-time meta
```
Currently errors at meta-eval; should error at meta-checker stage (E-META-00? — need to pick a code).

**Fix sketch:** add a pre-eval pass in `meta-checker.ts` that walks compile-time meta blocks and flags any reactive / SQL / server-only operation. Emit a checker-time error with the spec-anchored message.

### 2c. DG false-positive for `@var` via `meta.get()` / `meta.bindings` (recommended starting point — smallest)

**Location:** `compiler/src/dependency-graph.ts`. The DG treats `meta.get("@x")` as a reactive read of `@x`, creating a false edge. Meta-scoped accesses shouldn't create runtime reactive dependencies.

**Repro:** S20 meta fixture — check `samples/compilation-tests/gauntlet-s20-meta/` for the specific case (one fixture documented this).

**Fix sketch:** when the DG visits an expression, skip `@var` refs that appear inside a `meta.get(...)` or `meta.bindings.x` access chain. String-level rewrite guards — look for the `meta.` prefix to the outer call.

### 2d. Nested `^{}` in compile-time meta crashes eval

**Location:** `compiler/src/meta-eval.ts` — recursive meta-block eval.

**Repro:**
```scrml
^{ ^{ use("x") } }   // crashes the eval loop
```
Should either work (recursive eval) or emit a spec-anchored error.

**Fix sketch:** add a nesting guard + either a real recursion implementation or an explicit "nested meta not supported in this revision" error. Probably blocked on 2b (checker-time phase separation) so 2d is most naturally done after.

**Test target:** new file `compiler/tests/unit/gauntlet-s23/meta-bugs.test.js` or append to a shared gauntlet-s23 tree.

---

## 3. E-SCOPE-001 in logic blocks (still deferred from S20)

**Current state:** E-SCOPE-001 only fires for unquoted markup attribute identifiers (`type-system.ts:3254`). It does NOT fire for undeclared identifiers in logic expressions.

**Repro (existing S20 fixture):** `samples/compilation-tests/gauntlet-s20-error-ux/err-scope-001-undeclared.scrml`:
```scrml
${
  let x = undeclaredVar + 1
}
```
Current: compiles clean. Expected: E-SCOPE-001 on `undeclaredVar`.

**Implementation scope:** medium-large. Requires walking every expression AST in logic context and resolving each identifier reference against the scope chain.

**Existing infrastructure:**
- `type-system.ts:1567 Scope` / `:1596 ScopeChain` (may have shifted in line number after S22 edits — grep `class ScopeChain`).
- Builders at ~`type-system.ts:2278 checkNodesInScope` traverse nodes for binding but don't validate every ident reference.

**The walker needs to:**
1. For each `ident` node in an expression, look up against the scope chain.
2. Skip DOM globals (`document`, `window`, etc.), runtime helpers (`_scrml_*`), standard JS globals (`Math`, `JSON`, `Array`, `Object`, `console`, etc.), and imported names.
3. Emit E-SCOPE-001 with a helpful message — variable name, and a suggestion if there's a close lexical match via Levenshtein/edit-distance.

**Known seed lists:**
- `compiler/src/html-elements.js` for HTML tag names
- Runtime helpers all match `_scrml_*`
- JS built-ins: keep a small allow-list (`Math`, `JSON`, `Array`, `Object`, `Number`, `String`, `Boolean`, `Date`, `Promise`, `Set`, `Map`, `parseInt`, `parseFloat`, `isNaN`, `console`) or detect via `typeof` probe at emit time.

**Watch out for:**
- Server-side code that references server-only globals
- Template string interpolations
- SQL identifier placeholders inside `?{}`
- Function parameters (should already be in scope from the param decls)
- `lin` variables, `~` tilde, `self` inside machines

**Start narrow:** only client-side logic-block expressions. Grow coverage from there.

**Test target:** extend existing `samples/compilation-tests/gauntlet-s20-error-ux/err-scope-001-undeclared.scrml` to actually fail + a unit test that uses the fixture.

---

## 4. Deep-dive followups (unblocked now that A + I landed)

From `scrml-support/docs/deep-dives/machine-cluster-expressiveness-2026-04-17.md`:

### 4a. C — Temporal transitions (`.Loading after 30s => .TimedOut`)

Scoped as "queue independently after A+I land." A is done, I is done — **this is unblocked.**

**Prior art:** XState `after:`, SCXML `<send delay>`, Erlang `gen_statem` state timeouts. All canonical.

**Grammar addition:** small. Runtime layers on §6.7.8 `<timeout>`.

**Open question (flag before spec):** on re-entry to `From` during the timer window, does the clock reset or is it cumulative? Pick one before writing the amendment. Default recommendation: **reset** — matches XState default, and cumulative would require an explicit state-persistence story for the timer itself.

**Spec work:** add a `temporal-transition-rule` production to §51.3 grammar, amend §51.5 to describe the runtime timer lifecycle, register E-MACHINE-019 (invalid duration) and E-MACHINE-020 (duration on wildcard rule — ambiguous which state's timer fires).

**Codegen work:** `emitTemporalTimer(rule)` in `emit-machines.ts`. Emits a `setTimeout(() => attemptTransition(from, to), ms)` on state entry, cleared on state exit. The transition runs through the same guard pipeline as a regular transition (so `given` guards still apply).

### 4b. F — Auto-generated property tests from machine declarations

**Scoped as "orthogonal correctness multiplier."** Given a machine declaration, emit a `~{}` test suite that:
- For every reachable state, asserts only declared transitions succeed.
- For terminals, asserts all transitions reject.
- For every labeled guard, ensures both passing and failing coverage exist somewhere in the corpus.

**Prior art:** Haskell `hedgehog-state`, `quickcheck-state-machine`, TLA+/Apalache, `@xstate/test`.

**No grammar change.** This is purely a compile-time test-generation pass behind a flag like `scrml compile --emit-machine-tests`.

### 4c. G — Free audit/replay/time-travel

**Scoped as "small compiler add, huge debuggability payoff."** Machine bindings already mediate every write; adding `audit @auditLog` clause in machine body emits `(from, to, event, effects, ts)` tuples into a reactive `@auditLog` array. Time-travel is a consequence, not a feature.

**Opt-in** because of memory cost. Default off.

**Prior art:** Redux DevTools, Elm Debugger, XState Inspector.

**Grammar:** one new optional clause at the end of `< machine>` body: `audit @varName`.

**Codegen:** inside `emitTransitionGuard`, after the `_scrml_reactive_set` of the target var, emit one additional reactive-set to the audit var pushing the tuple.

### 4d. Future work noted in §51.9.7 (keep DEFERRED unless explicitly re-prioritized)

- Transitive projection (derived-of-derived).
- Projection binding (payload-binding in projection LHS — now POSSIBLE since §1b landed; a small grammar extension would admit it).
- Cross-machine projection (parallel regions — hardest of the three, classical parallel-state problem).

---

## 5. Older backlog (deprioritized by user S18, still valid)

From `handOffs/hand-off-22.md` §6 (unchanged):

- **P3 self-host completion + idiomification** — 11 scrml modules in `compiler/self-host/`; 2 of them still fail the bootstrap parity test. Self-hosting is the parity target with `~/scrmlMaster/scrml/`.
- **P5 TS migrations** — `ast-builder.js` and `block-splitter.js` are still `.js` not `.ts`. Migration work tracked in prior session plans.
- **P5 ExprNode Phase 4d + Phase 5** — the ExprNode idempotency invariant work from S13-S14; Phase 4d is additional coverage, Phase 5 retires the legacy string-form expression fields entirely.
- **Full Lift Approach C Phase 2** — Phase 2c-lite landed S18 (the dead BS+TAB reparse block removed); full Phase 2 involves `emitConsolidatedLift` refactor for fragmented bodies.
- **`lin` redesign** (queued) — user's original vision is discontinuous scoping, not Rust-style linear types. See memory entry `project_lin_redesign.md`. Deep-dive + debate queued.
- **Async loading stdlib helpers.**
- **DQ-12 Phase B** — diagnostic quality work.
- **2 remaining self-host test failures** — deferred.

---

## 6. Pre-existing parser bug exposed in S22 (NOT caused, but surfaced)

**Location:** body-pre-parser (BPP), statement-boundary detection between two consecutive `@name: SomeMachine = X` reactive-decls.

**Symptom:**
```scrml
${
  @foo: MachineA = A.Value
  @bar: MachineB = B.Value   // silently dropped; warning "statement boundary not detected — trailing content would be silently dropped"
}
```

Adding a blank line between the two decls doesn't always fix it. Putting the decls in two separate `${}` blocks does fix it.

**Impact:** user-visible in any file with two machine-typed reactives on adjacent lines. The E-MACHINE-017 end-to-end test in `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` sidesteps this by splitting decls across blocks — see "write-rejected.scrml" fixture.

**Fix location:** `compiler/src/codegen/compat/parser-workarounds.js` (BPP). The boundary heuristic needs to treat `@name: TypeName = expr` as a self-terminating statement when the NEXT line begins with `@` or `type` or a markup tag.

**Not a priority blocker** — affects only machine-typed decls on adjacent lines, which is a narrow subset of real files. But it's surprising when it happens and is worth a proper fix when someone is already in BPP code.

---

## 7. 2 pre-existing test failures (still red as of S22 wrap)

Unchanged from S21:

- `Bootstrap L3: self-hosted API compiles compiler > self-hosted api.js exports compileScrml` — self-host bootstrap parity.
- `Self-host: tokenizer parity > compiled tab.js exists` — same family.

Both deferred per user direction S18. They'll keep failing until the self-host work in §5 backlog is taken up.

---

## 8. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh` compiles 12 browser test samples.
- Gauntlet regression trees:
  - `compiler/tests/unit/gauntlet-s20/` — 5 files (error-handling, fn-purity, import-resolution, machine-or-alternation + __fixtures__).
  - `compiler/tests/unit/gauntlet-s22/` — 4 files (payload-variants, payload-variants-match, machine-payload-binding, derived-machines), 43 tests total.
- Full test run: ~4.6s at S22 scale (6,875 tests across 277 files).
- Side-effect regeneration: `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` regenerates on every run (files were archived in S21 but a test keeps writing them back). Untracked in git; safe to leave, but a future cleanup could gitignore or relocate the regeneration target.

---

## 9. Agents available (no staging needed)

Primary + already-staged in `.claude/agents/` (same as S22):

- PA (this), Explore, Plan, general-purpose
- scrml-project-manager, scrml-language-design-reviewer, scrml-integration-pipeline-reviewer, scrml-diagnostics-quality-reviewer, scrml-compiler-diagnostics-engineer, scrml-token-and-ast-engineer, scrml-type-system-engineer, scrml-type-system-reviewer, scrml-type-system-tester, scrml-end-to-end-compiler-tester, scrml-language-conformance-tester, scrml-linear-type-specialist, scrml-linear-type-tester, scrml-html-codegen-{engineer,reviewer}, scrml-html-output-tester, scrml-js-codegen-{engineer,reviewer}, scrml-js-output-tester, scrml-css-compilation-{engineer,reviewer}, scrml-css-output-tester, scrml-server-boundary-{analyst,tester}, scrml-state-inference-engineer, scrml-block-split-parser-engineer, scrml-parser-architecture-reviewer, scrml-macro-system-{engineer,reviewer,tester}, scrml-exhaustiveness-{checker-engineer,tester}, scrml-pipeline-correctness-tester, scrml-ast-correctness-tester, scrml-deep-dive, debate-curator, debate-judge, scrml-developer, scrml-scribe, project-mapper, resource-mapper, gauntlet-overseer, agent-forge, agent-registry, claude-code-guide.

No new staging required for any queued item.

---

## 10. Recommended S23 opening sequence

1. Check `handOffs/incoming/` for new messages.
2. Prompt user priority: **DOM read-wiring for derived machines** (§1 here) vs **S20 meta bugs** (§2) vs **E-SCOPE-001 in logic blocks** (§3) vs **deep-dive followups C/F/G** (§4).
3. My recommendation: **§1 DOM read-wiring** first. It unlocks the real user-visible value of §51.9 (which has been the session's centerpiece) and keeps the compiler's story coherent. The other items are all net-new features or bug cleanups that don't depend on each other.
4. If the user picks §1: start with the synthesized reactive-decl approach outlined in §1. Walk through what breaks in the dep-graph; patch each surprising call site.
5. If the user picks §2: go 2c → 2a → 2b → 2d in that order.
6. If the user picks §3: start with a narrow scope-walker MVP on the simplest fixture, grow from there.

### Explicit non-goals for S23 opening

- **Do not** rewrite examples/14-mario-state-machine.scrml to showcase payload variants until the DOM read-wiring (§1) lands — the demo needs that to actually render.
- **Do not** batch two queued items in a single commit. They are all independent features / bug fixes.
- **Do not** ignore the cross-repo state in §0 — a quick `git status` in scrml-support at S23 start confirms whether the old S21 archive commit landed.

---

## 11. What shipped this session (S22 summary, for future reference)

All on origin/main, all tests green at 6,875 pass / 10 skip / 2 fail.

**§1a — enum payload variants (2 commits):**
- `2fbc332` — generated constructors, `Shape.Circle(10) === { variant: "Circle", data: { r: 10 } }`. Unit variants stay as strings. Spec-aligned with §19.3.2 `fail`.
- `d8ebfb3` — match destructures the tagged-object shape. `__tag` normalization, per-file variant-fields registry, positional + named bindings, `_` discards. splitMultiArmString presence-arm fix (was splitting `.Circle(r) =>` at the `(`).

**§1b — payload bindings in machine rules (1 commit):**
- `a1f0c76` — `.Charging(n) => .Firing given (n > 50)` now works. `resolveRuleBindings` (E-MACHINE-015 for unit variants / unknown fields / overflow), `expandAlternation` parity check (E-MACHINE-016), `buildBindingPreludeStmts` emits destructuring inside the keyed `if (__key === "From:To")` block.

**§51.9 — derived/projection machines (2 commits):**
- `9d90450` — parser + validator. `< machine UI for UIMode derived from @order>` parsed, exhaustiveness check (E-MACHINE-018), source-var resolution (E-MACHINE-004), transitive rejection (E-MACHINE-004).
- `ebd4a8b` — runtime codegen + E-MACHINE-017 write rejection. `_scrml_project_<M>` function + `_scrml_derived_fns` registration + dirty-propagation via existing §6.6 infra. `rejectWritesToDerivedVars` flags reactive-decl and `@ui =` / `@ui +=` etc.

**MIT license (1 commit):**
- `3e8f545` — LICENSE, package.json, README flipped from closed-beta-proprietary to open-source-MIT.

**Tests added:** 43 net (6,875 − 6,832 pre-wrap count deltas). Broken down:
- gauntlet-s22/payload-variants.test.js — 6 tests (construction).
- gauntlet-s22/payload-variants-match.test.js — 7 tests (destructuring, end-to-end).
- gauntlet-s22/machine-payload-binding.test.js — 15 tests (parser + emitter + errors).
- gauntlet-s22/derived-machines.test.js — 19 tests (parser + validator + codegen + E-MACHINE-017).
- Existing tests updated (not counted as new): enum-variants.test.js, emit-match.test.js, codegen-struct-rewrite.test.js (all aligned with the constructor-function model).

**Spec amendments:** §51.3.2 (payload bindings) and §51.9 (derived machines) both flipped from "(pending implementation)" to "(landed S22)". §51.9.6 projected-var-naming rule tightened to "machine name with leading uppercase run lowercased." §51.3.2 prereq text flipped.

**Repo went public** with MIT mid-session.

---

## Tags
#session-23 #open #queue-51.9-dom-wiring #queue-meta-bugs #queue-scope-001 #queue-deep-dive-followups
