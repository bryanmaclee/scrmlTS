# scrmlTS — Session 22 Hand-Off

**Date opens:** 2026-04-18 (or whenever S22 starts)
**Previous:** `handOffs/hand-off-21.md`
**Baseline at last wrap:** 6,824 pass / 10 skip / 2 fail (25,375 expects across 273 files) at commit `c41c940`.

---

## 0. Cold-start state

### Unpushed commits on local main

Two S21 commits land on origin/main as soon as you get a one-time push auth from the user (or send `needs: push` to master):

- `8cbea71` **spec(§51): draft A (payload-binding) + I (derived machines) + doc refresh** — SPEC.md + SPEC-INDEX.md + docs/changelog.md + master-list.md + .claude/maps/*.
- `c41c940` **chore(docs): archive stale change docs to scrml-support/archive** — deletes `docs/changes/{gauntlet-s19, expr-ast-phase-1-audit, expr-ast-phase-2-slice-3}/` in scrmlTS; corresponding copies dropped into scrml-support/archive/ with README.md provenance files (not yet committed in that repo).

### Cross-repo pending

- **scrml-support** has uncommitted files in `archive/gauntlet-s19/`, `archive/expr-ast-phase-1-audit/`, `archive/expr-ast-phase-2-slice-3/` (each with a README.md). A message explaining this is queued at `/home/bryan/scrmlMaster/scrml-support/handOffs/incoming/2026-04-17-1100-scrmlTS-to-scrml-support-archive-s21.md` — the sibling Claude session will commit those when it opens.
- Once scrmlTS is pushed AND scrml-support has committed, send `needs: push` to master to push scrml-support too.

### Incoming messages

None in `handOffs/incoming/` as of S21 wrap.

---

## 1. Top priority — implement spec A (§51.3.2 payload binding in machine rules)

**Spec status:** drafted and committed in `8cbea71` under §51.3.2 "Amended (pending implementation): §51.3.2 payload binding in machine rules."

### 1a. Prerequisite (must land first): enum payload variant construction

`Shape.Circle(10)` currently throws `TypeError: Shape.Circle is not a function` — the codegen only emits unit variants into the frozen enum table. Verified S21:

```
$ bun run compiler/src/cli.js compile <file containing Shape.Circle(10)>
const Shape = Object.freeze({ Square: "Square", variants: ["Circle", "Square"] });
_scrml_reactive_set("s", Shape.Circle(10));  // Shape.Circle is undefined → runtime crash
```

**Target runtime shape** (matches §19.3.2 `fail` format so `!{}` + machine guards share one representation):

```js
// Unit variant — keep current string
Shape.Square   === "Square"
// Payload variant — tagged object
Shape.Circle(10) === { variant: "Circle", data: { radius: 10 } }
```

**Files to edit:**

- `compiler/src/codegen/emit-client.ts:682-699` — enum constructor emission. Currently emits `Object.freeze({ Variant: "Variant", ... })`. Extend: for payload variants, emit a constructor function that returns `{ variant: name, data: {...} }`. Named-field payloads use positional or named args — field order is the decl order.
- `compiler/src/codegen/emit-logic.ts` — match compilation already handles destructuring on tagged-object shape per §18.7 (verify against gauntlet-s20 meta fixture that uses payloads; may be partially implemented).
- `compiler/src/type-system.ts` — variant payload registry may already exist for match destructuring; if so, A piggybacks on it. Grep `variant.*fields\|payloadFields\|variantPayload` to locate.

**Test fixture seed:** `samples/compilation-tests/match-001-nested-with-call.scrml` already uses payload-free variants; add a new fixture exercising `Shape.Circle(10)` + `match s { .Circle(r) => r * 2 else => 0 }` at `samples/compilation-tests/payload-variants-001.scrml` and verify execution.

**Regression tests:** add at `compiler/tests/unit/gauntlet-s22/payload-variants.test.js` — construct + match round-trip, destructuring bindings, unit-variant still emits string.

**Bug breadcrumbs:** S20 hand-off notes §19 `fail` uses `{ __scrml_error, type, variant, data }` — payload variants should use the same shape minus the `__scrml_error` sentinel so a single runtime can dispatch both error and regular variants by inspecting `.variant`.

### 1b. A implementation — payload binding in machine rules

Only start after 1a is green.

**Spec:** `compiler/SPEC.md` §51.3.2, search for "Amended (pending implementation): §51.3.2 payload binding in machine rules." The worked example (`CannonMachine for CannonState`) is the first test target.

**Files to edit:**

- `compiler/src/type-system.ts:1902 expandAlternation` — current regex-based rule parser splits `|` and extracts `.VariantName`. Extend to accept `.VariantName(binding-list)` on either side. The binding-list format matches §18.7 — look at how ast-builder.js parses match variant-patterns (search `variant-pattern\|binding-list`) and reuse or mirror.
- `compiler/src/type-system.ts:255 TransitionRule` — add `fromBindings: BindingList | null` and `toBindings: BindingList | null`. Wire through `parseMachineRules` (line ~1906) and the rest of the rule pipeline.
- `compiler/src/codegen/emit-machines.ts:91 emitTransitionGuard` — the runtime guard currently reads `__prev.variant` only. For rules with bindings, emit `var <name> = __prev.data.<field>` (or `__next.data.<field>`) before the guard + effect evaluation.
- `compiler/src/codegen/emit-machines.ts:43 emitTransitionTable` — no changes needed; table still keyed by `From:To`.

**New error codes already registered in SPEC:** E-MACHINE-015 (invalid field binding), E-MACHINE-016 (mismatched alternation bindings). Implement the validators in `parseMachineRules` against the variant registry built by the type system.

**Regression tests target:** `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js`. Cover:
- Positional binding `.Charging(n) => .Firing given (n > 50)`
- Named binding `.Reloading(reason: r) { log(r) }`
- Mixed + `_` discard
- E-MACHINE-015 on invalid field name
- E-MACHINE-015 on binding attempted against unit variant
- E-MACHINE-016 on mismatched alternation
- Interaction with `|` alternation on the other side of `=>`

**Mario example update:** once working, rewrite `examples/14-mario-state-machine.scrml` with one real payload variant (e.g., `Big(coinsCollected: number)` or similar) so the example demonstrates the new feature.

---

## 2. Top priority (parallel to A) — implement spec I (§51.9 derived/projection machines)

**Spec status:** drafted and committed in `8cbea71` under new §51.9. `#51.9.1`-`51.9.7` inclusive.

### Architecture decision point first

Before coding, decide: is the projected variable a synthesized `@name` binding (spec's current stance — `@ui` appears without explicit declaration), OR does the developer still declare `@ui: UI = derivedInit` and the machine intercepts writes? The spec currently says synthesize, but `type-system.ts` scope registration assumes explicit declaration. Pick one, update spec if needed.

**Recommendation (supported by deep-dive):** synthesize. Developer writes `< machine UI for UIMode derived from @order>` and reads `@ui` anywhere — no parallel declaration. Reserves the binding name against writes (E-MACHINE-017).

### Files to edit

- `compiler/src/ast-builder.js:5454 buildBlock (machine case)` — detect the `derived from @source` clause in the header. Current parser slices `< machine MachineName for TypeName>`; extend to `< machine MachineName for TypeName derived from @SourceVar>`. Add `sourceVar` to the machine-decl AST node.
- `compiler/src/type-system.ts parseMachineRules` — if machine has `sourceVar`, rules are projections not transitions:
  - Each rule is `variant-ref-list => variant-ref` (single RHS; no alternation on RHS).
  - Validate exhaustiveness over source enum (E-MACHINE-018).
  - `given` clause on projection rule is evaluated at read time, not transition time.
- `compiler/src/type-system.ts` — add a **virtual reactive declaration** for the projected variable. In the scope chain, bind the projected name with a flag `isDerived: true, sourceVar, machineName`.
- `compiler/src/type-system.ts` assignment checker — for any `@ui = ...` where `ui` resolves to a derived projection, emit E-MACHINE-017.
- `compiler/src/dependency-graph.ts` — when building the dep graph, edges pointing at a derived var resolve to edges pointing at the source var (the projection has no independent value source).
- `compiler/src/codegen/emit-reactive-wiring.ts` — when emitting the reactive read for a derived var, emit a projection function call: `_scrml_project_<machineName>(_scrml_reactive_get("<source>"))`.
- `compiler/src/codegen/emit-machines.ts` — new emitter `emitProjection(machineName, rules)` producing the projection function. Takes the current source variant, walks rules top-to-bottom, returns the destination variant.

### New error codes already registered in SPEC: E-MACHINE-017 (write to derived), E-MACHINE-018 (non-exhaustive projection).

### Regression tests target: `compiler/tests/unit/gauntlet-s22/derived-machines.test.js`. Cover:
- Basic projection + read-through
- Write to projected var → E-MACHINE-017
- Non-exhaustive projection → E-MACHINE-018
- Projection with `given` runtime guard
- The rust-state-machine shadow-boolean collapse case (spec example in §51.9.5)

---

## 3. S20 deferred meta bugs (4 specific items — not touched in S21)

From `handOffs/hand-off-20.md` "Bugs documented (11 — for future batch)":

### 3a. `lin + ^{}` capture not counted as consumption (§22.5.3)

**Location:** `compiler/src/meta-checker.ts` meta-capture scope analysis. The current checker detects linear variables captured by `^{}` but doesn't consume them. Per §22.5.3 a `lin` captured into a compile-time meta is consumed at capture time.

**Repro:** write `lin x = ...` then reference `x` inside a `^{}` block twice — currently no error; should be E-LIN-002 on second reference.

### 3b. Phase separation detected at eval-time, not checker-time

**Location:** `compiler/src/meta-eval.ts` — the eval loop throws when hit runtime-only operations. Should be a checker-time E-META-00? before eval.

**Repro:** put a reactive `@var` read inside a compile-time `^{}` context — current error appears only when meta-eval runs, not during the check phase.

### 3c. DG pass false-positive for `@var` via `meta.get()`/`meta.bindings`

**Location:** `compiler/src/dependency-graph.ts`. The DG treats `meta.get("@x")` as a reactive read of `@x`, creating a false edge. Meta-scoped accesses shouldn't create runtime reactive dependencies.

**Repro:** S20 meta fixture — check `samples/compilation-tests/gauntlet-s20-meta/` for the specific case; one of the fixtures documented this.

### 3d. Nested `^{}` in compile-time meta crashes eval

**Location:** `compiler/src/meta-eval.ts` — recursive meta-block eval. Need a guard or an actual recursion implementation.

**Repro:** `^{ ^{ ... } }` crashes — should either work or emit a spec-anchored error.

### Recommended approach

Fix 3c first (DG false-positive) — smallest scope, clearest test. Then 3a (lin + meta capture) which uses the linear type infrastructure. Then 3b (checker-time phase separation) — requires a checker pass before meta-eval. 3d (nested eval) last; might be blocked on 3b.

---

## 4. E-SCOPE-001 in logic blocks (still deferred from S20)

Current state: E-SCOPE-001 only fires for unquoted markup attribute identifiers (`type-system.ts:3254`). It does NOT fire for undeclared identifiers in logic expressions.

**Repro (S20 fixture):** `samples/compilation-tests/gauntlet-s20-error-ux/err-scope-001-undeclared.scrml`:
```scrml
${
  let x = undeclaredVar + 1
}
```
Current: compiles clean. Expected: E-SCOPE-001 on `undeclaredVar`.

**Implementation scope:** medium-large. Requires walking every expression AST in logic context and resolving each identifier reference against the scope chain. Existing scope infrastructure is at `type-system.ts:1567 Scope` / `:1596 ScopeChain`. Builders at `type-system.ts:~2278 checkNodesInScope` traverse nodes for binding but don't validate every ident reference. The walker needs to:
1. For each `ident` node in an expression, look up against the scope chain.
2. Skip DOM globals (document, window, etc.), runtime helpers (`_scrml_*`), standard JS globals (Math, JSON, Array, etc.), and imported names.
3. Emit E-SCOPE-001 with a helpful message (variable name, suggestion if there's a close lexical match via edit distance).

**Known seed lists:** `compiler/src/html-elements.js` for HTML tag names; runtime helpers are named `_scrml_*`; JS built-ins: keep a small allow-list or detect via typeof probe at emit time.

**Watch out for:** false positives from server-side code that references server-only globals, template strings, SQL identifier placeholders. Start with ONLY logic-block expressions on the client side.

---

## 5. Queued from deep-dive (scrml-support/docs/deep-dives/machine-cluster-expressiveness-2026-04-17.md)

### 5a. C — Temporal transitions (`.Loading after 30s => .TimedOut`)

**Scoped as "queue independently after A+I land."** Doesn't compete for §51 real estate. Prior art: XState `after:`, SCXML `<send delay>`, Erlang `gen_statem` state timeouts — all canonical. Grammar addition is small; runtime layers on §6.7.8 `<timeout>`. Specifies a compiler-synthesized timer scoped to the `From` variant that fires the transition on expiry.

**Open question (flag before spec):** what happens on re-entry to `From` during the timer window? Reset the clock or cumulative? Pick one.

### 5b. F — Auto-generated property tests from machine declarations

**Scoped as "orthogonal correctness multiplier."** Given a machine declaration, emit a `~{}` test suite that:
- For every reachable state, asserts only declared transitions succeed.
- For terminals, asserts all transitions reject.
- For every labeled guard, ensures both passing and failing coverage exist somewhere in the corpus.

Prior art: Haskell `hedgehog-state`, `quickcheck-state-machine`, TLA+/Apalache, `@xstate/test`.

### 5c. G — Free audit/replay/time-travel

**Scoped as "small compiler add, huge debuggability payoff."** Machine bindings already mediate every write; adding `audit @auditLog` clause in machine body emits `(from, to, event, effects, ts)` tuples into a reactive `@auditLog` array. Time-travel is a consequence, not a feature. Opt-in because of memory cost.

Prior art: Redux DevTools, Elm Debugger, XState Inspector.

### 5d. Future work noted in §51.9.7

- Transitive projection (derived-of-derived).
- Projection binding (payload-binding in projection LHS — depends on A).
- Cross-machine projection (parallel regions).

Don't touch until A and I are both live.

---

## 6. Older backlog (deprioritized by user S18, still valid)

From `handOffs/hand-off-20.md`:

- **P3 self-host completion + idiomification** — 11 scrml modules in `compiler/self-host/`; 2 of them still fail the bootstrap parity test. Self-hosting is the parity target with `~/scrmlMaster/scrml/`.
- **P5 TS migrations** — `ast-builder.js` and `block-splitter.js` are still `.js` not `.ts`. Migration work tracked in prior session plans.
- **P5 ExprNode Phase 4d + Phase 5** — the ExprNode idempotency invariant work from S13-S14; Phase 4d is additional coverage, Phase 5 retires the legacy string-form expression fields entirely.
- **Full Lift Approach C Phase 2** — Phase 2c-lite landed S18 (the dead BS+TAB reparse block removed); full Phase 2 involves `emitConsolidatedLift` refactor for fragmented bodies.
- **`lin` redesign** (queued) — user's original vision is discontinuous scoping, not Rust-style linear types. See memory entry `project_lin_redesign.md`. Deep-dive + debate queued.
- **Async loading stdlib helpers.**
- **DQ-12 Phase B** — diagnostic quality work.
- **2 remaining self-host test failures** — deferred.

---

## 7. 2 pre-existing test failures (still red as of S21 wrap)

- `Bootstrap L3: self-hosted API compiles compiler > self-hosted api.js exports compileScrml` — self-host bootstrap parity.
- `Self-host: tokenizer parity > compiled tab.js exists` — same family.

Both deferred per user direction S18. They'll keep failing until the self-host work in §6 Older backlog is taken up.

---

## 8. Test infrastructure reminders

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh` compiles 12 browser test samples. Some tests write side-effect files (`docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` was regenerating on every run — those files are now archived, so the regen should produce new files in a different location or stop regenerating entirely; watch for this).
- Gauntlet regression tree: `compiler/tests/unit/gauntlet-s20/` — 5 files, 38 tests. Use the same pattern (`__fixtures__/` subdir created in beforeAll / torn down in afterAll) for new S22 gauntlet regressions.
- Full test run: ~4.5s at S21 scale (6,824 tests).

---

## 9. Agents available (no staging needed)

Primary + already-staged in `.claude/agents/`:
- PA (this), Explore, Plan, general-purpose
- scrml-project-manager, scrml-language-design-reviewer, scrml-integration-pipeline-reviewer, scrml-diagnostics-quality-reviewer, scrml-compiler-diagnostics-engineer, scrml-token-and-ast-engineer, scrml-type-system-engineer, scrml-type-system-reviewer, scrml-type-system-tester, scrml-end-to-end-compiler-tester, scrml-language-conformance-tester, scrml-linear-type-specialist, scrml-linear-type-tester, scrml-html-codegen-{engineer,reviewer}, scrml-html-output-tester, scrml-js-codegen-{engineer,reviewer}, scrml-js-output-tester, scrml-css-compilation-{engineer,reviewer}, scrml-css-output-tester, scrml-server-boundary-{analyst,tester}, scrml-state-inference-engineer, scrml-block-split-parser-engineer, scrml-parser-architecture-reviewer, scrml-macro-system-{engineer,reviewer,tester}, scrml-exhaustiveness-{checker-engineer,tester}, scrml-pipeline-correctness-tester, scrml-ast-correctness-tester, scrml-deep-dive, debate-curator, debate-judge, scrml-developer, scrml-scribe, project-mapper, resource-mapper, gauntlet-overseer, agent-forge, agent-registry, claude-code-guide.

No staging required for the A/I implementations or meta bugs.

---

## 10. Recommended S22 opening sequence

1. Push commits 8cbea71 + c41c940 (ask user for one-time auth, or master PA).
2. Check `handOffs/incoming/` for new messages (none as of wrap).
3. Prompt user: "A+I implementation this session, or other priority?" — if A+I, start with §1a (enum payload construction prereq) since A depends on it.
4. If meta bugs instead: start with 3c (DG false-positive via meta.get) — smallest.
5. If E-SCOPE-001 in logic blocks: start with a scope-walker MVP on the simplest fixture only, grow from there.

Do NOT:
- Jump straight to A's machine rule parsing without 1a — you'll build surface pointing at an unreachable runtime shape.
- Batch A and I implementation in one commit; they touch overlapping files but are independent features and should land separately.
- Ignore the cross-repo archive message — if scrml-support PA doesn't commit, the archive files remain untracked.

---

## Tags
#session-22 #open #queue-implement-A #queue-implement-I #queue-meta-bugs #queue-scope-001 #deep-dive-followups
