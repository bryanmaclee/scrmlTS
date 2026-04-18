# scrmlTS — Session 24 Hand-Off

**Date opens:** 2026-04-18 (or whenever S24 starts)
**Previous:** `handOffs/hand-off-23.md`
**Baseline at last wrap:** **6,889 pass / 10 skip / 2 fail** (25,548 expects across 278 files) at commit `e0455b6`.

---

## 0. Cold-start state

### Recent pushes (all on origin/main, in order)

- `e0455b6` **docs(tutorial): update §2.3/§2.4 to canonical syntax + add §2.10 state machines** — bare variant names + `=>` arm separator + typed-reactive annotation rule for match narrowing; ~70-line new section on `< machine>` + payload bindings + derived machines; 3 new snippets 02j/02k/02l.
- `2ba4ccd` **samples,examples: bring non-gauntlet files up to current idiomatic scrml** — 19 stale fixtures rewritten. Full triage at `/tmp/s23-audit/triage.md` (may be gone on next shell).
- `7045adf` **examples: rewrite 14-mario** — showcase §1a payload variants + §1a match destructuring + §51.9 derived machines. Compiles zero-warning.
- `9f2a247` **fix(meta): 2b + 2d** — phase separation and nested `^{}` at checker-time. html-fragment content scanning added to meta-checker + meta-eval.
- `8711056` **fix(meta): 2c + 2a** — DG credits meta.get/bindings reads; lin consumed at ^{} capture per §22.5.3.
- `5b5d636` **feat(§51.9): DOM read-wiring for projected vars (${@ui})** — two minimal compile-time patches; runtime was already correct.
- `0801d98` **docs(post-scrub):** commit-SHA refresh (pre-S23 baseline).

All on origin/main. No unpushed commits.

### Cross-repo state

- **scrml-support**: uncommitted S21 archive files still pending there. The S23 session didn't drop any new messages. Check `git status` in scrml-support at S24 start.
- **No new handOffs/incoming messages** for scrmlTS as of S23 wrap.

### Incoming messages

- `handOffs/incoming/`: empty (only `read/` archive).

### Repo publicity

Still public with MIT license. No distribution concerns.

---

## 1. S23 session summary (for context)

### What shipped (6 commits, all pushed)

**§51.9 DOM read-wiring (`5b5d636`):** `${@ui}` in markup now emits an `_scrml_effect` wrapper so writes to `@order` flow to the DOM. Two minimal compile-time patches — **no AST synthesis, no runtime changes**:
- `compiler/src/codegen/reactive-deps.ts:112` — `collectReactiveVarNames` now includes projected-var names from `fileAST.machineRegistry`. Projected vars have no `reactive-decl` node (they live in `_scrml_derived_fns` at runtime), which is why the old code filtered `@ui` out of the logic binding's `reactiveRefs` set and `emit-event-wiring.ts:417-424` skipped effect emission.
- `compiler/src/dependency-graph.ts:1264-1296` — `sweepNodeForAtRefs` now routes `@projectedVar` reads through to the source var via a per-file `projectedToSource` map. Suppresses false-positive E-DG-002 on `@order`. machineRegistry is accessed via the outer `rawFile` wrapper because `resolveFileAST` returns the inner `.ast` which doesn't carry it.
- Tests: `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` — compile-time guard + happy-dom E2E driving `@order` through transitions, asserting DOM text flips through `Editable → ReadOnly → Terminal → Editable`.

**S20 meta bugs — all 4 landed (`8711056` + `9f2a247`):**

- **2c** — DG E-DG-002 false-positive for `@var` via `meta.get("name")` / `meta.bindings.name`. Fix: `collectMetaVarRefsFromExprNode` helper in `dependency-graph.ts` + string-regex fallback, wired into `sweepNodeForAtRefs`. Both patterns now credit the referenced var as read.
- **2a** — lin consumed-at-capture not detected for hidden refs (§22.5.3). Fix: dedicated `case "meta"` branch in `walkNode` (`type-system.ts:5176`) that unions ExprNode ident walks with a raw-string fallback collecting escape-hatch raws + `c.expr/init/condition/value/test/content`. Consumes each matched lin name once against the outer tracker.
- **2b** — phase-mixing crashed at ME ("Invalid character: '@'") instead of firing E-META-005 at MC. Fix: scan html-fragment content for `@varName` in `bodyMixesPhases` + `bodyReferencesReactiveVars`; treat `reactive-decl`/`sql` in meta body as runtime shapes. Result: E-META-005 fires at MC; ME skips the block.
- **2d** — nested `^{}` crashed at ME. Fix: exported `bodyContainsNestedMeta` helper used at MC (fire clean E-META-009) and ME (skip eval). Full nested-meta support is out of scope for this revision.
- Tests: 3 in `compiler/tests/unit/dependency-graph.test.js` (2c) + 9 in new `compiler/tests/unit/gauntlet-s23/meta-bugs.test.js` (2a/2b/2d).

**Mario rewrite (`7045adf`):** `examples/14-mario-state-machine.scrml` now uses `PowerUp.Mushroom(coins: number)` payload variants + match destructuring + a `HealthMachine` derived machine projecting `@marioState` to `HealthRisk`. Banner reads `@healthMachine == HealthRisk.AtRisk` directly — runtime dirty-propagates the projection on each write to `@marioState`. Cleaned up pre-existing E-MU-001 + W-PROGRAM-001 + compound-if-attr E-DG-002 noise while there. Zero warnings now.

**Samples + examples audit (`2ba4ccd`):** 796 .scrml files compiled; 19 files outside gauntlet dirs had real errors. All fixed. Most were stale JS-isms or pre-S22 syntax. Full triage at `docs/` was not persisted — the trail is in the commit message.

**Tutorial update (`e0455b6`):** §2.3 (enum) flipped to bare variant names; §2.4 (match) flipped to canonical `=>` + canonical `.Success(data)` payload-destructure parens form. Added `§2.10 State machines` — ~70-line new section covering `< machine>` with payload bindings in rules (§1b) and derived machines (§51.9). Three new snippets 02j/02k/02l, all compile clean.

### Suite trajectory

- Session start: 6,875 pass (S22 baseline).
- After §51.9: 6,877 (+2 DOM-wiring tests).
- After S20 meta bugs: 6,889 (+3 DG regression + 9 meta-bugs).
- After Mario/audit/tutorial: 6,889 (source-only changes, no new tests).

---

## 2. Queued for S24 — pick priority

### 2a. E-SCOPE-001 in logic blocks (deferred from S20, carried through S23)

**Still the same as the S22/S23 brief §3 description.** Currently E-SCOPE-001 only fires for unquoted markup attribute identifiers (`type-system.ts:3254`). It does NOT fire for undeclared identifiers inside `${}` logic expressions.

**Existing fixture:** `samples/compilation-tests/gauntlet-s20-error-ux/err-scope-001-undeclared.scrml`:
```scrml
${
  let x = undeclaredVar + 1
}
```
Current: compiles clean. Expected: E-SCOPE-001 on `undeclaredVar`.

**Implementation scope:** medium-large. Walk every expression AST in logic context, resolve each identifier reference against the scope chain. Infrastructure pieces:
- `type-system.ts:1567 Scope` / `:1596 ScopeChain` (may have shifted — grep `class ScopeChain`).
- Builders at `~type-system.ts:2278 checkNodesInScope` already traverse nodes for binding but don't validate every ident reference.

**The walker needs to:**
1. For each `ident` node in an expression, look up against the scope chain.
2. Skip DOM globals (`document`, `window`, etc.), runtime helpers (`_scrml_*`), JS builtins (`Math`, `JSON`, `Array`, `Object`, `Number`, `String`, `Boolean`, `Date`, `Promise`, `Set`, `Map`, `parseInt`, `parseFloat`, `isNaN`, `console`), and imported names.
3. Emit E-SCOPE-001 with a helpful message — variable name, and a suggestion if there's a close lexical match via Levenshtein/edit-distance.

**Seed lists to use:**
- `compiler/src/html-elements.js` for HTML tag names.
- Runtime helpers all match `_scrml_*`.
- JS built-ins: hardcoded allow-list.

**Start narrow:** only client-side logic-block expressions. Grow coverage from there.

**Test target:** extend existing `samples/compilation-tests/gauntlet-s20-error-ux/err-scope-001-undeclared.scrml` to actually fail + a unit test that uses the fixture.

### 2b. Deep-dive followups C / F / G (unblocked since S22)

From `scrml-support/docs/deep-dives/machine-cluster-expressiveness-2026-04-17.md`:

**C — Temporal transitions (`.Loading after 30s => .TimedOut`).** Prior art: XState `after:`, SCXML `<send delay>`, Erlang `gen_statem` state timeouts. Small grammar addition; runtime layers on §6.7.8 `<timeout>`. Open question to resolve before the spec amendment: on re-entry to `From` during the timer window, does the clock reset or is it cumulative? Default recommendation: **reset** (matches XState).

**F — Auto-generated property tests from machine declarations.** Given a machine decl, emit a `~{}` suite that asserts (a) only declared transitions succeed, (b) terminals reject all transitions, (c) each labeled guard has both passing and failing coverage somewhere in the corpus. No grammar change — compile-time test-gen pass behind a `--emit-machine-tests` flag.

**G — Free audit/replay/time-travel.** Grammar: one new optional clause at the end of `< machine>` body: `audit @varName`. Emits one additional reactive-set per transition into the audit var. Opt-in (memory cost).

### 2c. Type system bug: match subject loses parameter/local type annotation

**Discovered while rewriting Mario + example 05 + tutorial snippets.** A `match` subject inside a function body doesn't see the function parameter's type annotation OR a `let p: SomeType = ...` annotation on a local binding. E-TYPE-025 fires even when the annotation should clearly narrow.

**Repro:**
```scrml
${
  type PowerUp:enum = { Mushroom(n: number), Flower(n: number) }
  function eat(powerUp) {
    let p: PowerUp = powerUp  // Should narrow — doesn't.
    match p {                 // E-TYPE-025 fires here.
      .Mushroom(n) => ...
      .Flower(n) => ...
    }
  }
}
```

A **file-scope** `let` DOES work:
```scrml
let sample: PowerUp = PowerUp.Mushroom(1)
function probe() { match sample { ... } }   // works
```

And a **typed reactive** DOES work:
```scrml
@current: PowerUp = PowerUp.Mushroom(1)
function dispatch() { match @current { ... } }   // works
```

**Current workaround used in Mario and tutorial:** route through a typed reactive + a wrapper function that assigns before dispatching:
```scrml
@currentPowerUp: PowerUp = PowerUp.Mushroom(0)
function applyPowerUp() { match @currentPowerUp { ... } }
function eatPowerUp(powerUp) { @currentPowerUp = powerUp; applyPowerUp() }
```

**Fix location:** `compiler/src/type-system.ts` — scope-visit function parameters and local `let`/`const` type annotations such that subsequent match subjects see the narrowed type. The `nodeTypes` map should carry the annotation into the param binding.

**Priority:** medium. The workaround is documented in Mario and the tutorial's §2.4, so it's not blocking users — but the ergonomics are bad and new scrml writers hit it within the first hour.

### 2d. DG false-positive on compound `if=(...)` attribute expressions

**Discovered during the audit.** When an attribute value is a compound expression like `if=(@vulnerable && @gameOver == false)`, the DG's attribute-value scan only picks up the FIRST `@var` reference, OR fails entirely on more complex shapes. Reactive vars that appear only inside compound `if=` conditions get a false-positive E-DG-002 "never consumed."

**Locations affected (observed during audit):**
- Original Mario had this on `@vulnerable`.
- 02h-presence-checks had it on `@email` / `@loggedIn`.
- Worked around by adding an extra `${@var}` read in text somewhere.

**Fix location:** `compiler/src/dependency-graph.ts:1313-1338` — the attribute-value scan branch. Currently matches `@\w+` via regex. Needs a proper scanner that handles compound expressions (`&&`, `||`, `==`, parens, function calls) and credits every `@var` reference.

**Priority:** low (cosmetic — warnings don't block compile, and users can work around). But it's annoying to hit.

### 2e. DG false-positive on `@var` inside runtime html-fragment meta bodies

**Flagged in S23 §2b notes.** A runtime `^{}` meta block whose body is parsed as html-fragment with raw `.content` containing `@counter += 1` will trigger E-DG-002 on `@counter` — the DG sweep doesn't see the `@var` reference inside html-fragment content at runtime context (the S23 fix was only for compile-time meta at MC stage).

**Fix:** extend `dependency-graph.ts:sweepNodeForAtRefs` meta branch — when scanning a meta body, also regex-scan each child's `.content` string for `@varName` patterns. Similar to the S23 fix for the html-fragment case.

**Priority:** low.

### 2f. Machine + in-enum `transitions {}` combo parser bug

**Discovered during audit (fixed at source, not in compiler).** When an enum declares its OWN `transitions {}` AND an external `< machine>` references it, the external machine's rule parser includes a leading space in variant names ("unknown variant '. Pending'"). Affects `machine-basic.scrml` and `machine-002-traffic-light.scrml` — worked around by removing the in-enum transitions block.

**Fix location:** `compiler/src/type-system.ts:parseMachineRules`. Probably a string-split issue where the pre-machine pass leaves leading whitespace on RHS variants.

**Priority:** low. The co-existence of both forms is redundant anyway; the audit already dropped the redundant form from both files. Worth a proper fix if anyone legitimately needs both.

### 2g. Import resolver requires explicit `.scrml` extension

**UX issue discovered during audit.** `import { x } from './helpers/foo'` (no extension) emits E-IMPORT-006 "no file found at .../foo". The file IS at `.../foo.scrml`. Users expect extension-optional imports like Node/Bun/Deno.

**Fix location:** `compiler/src/module-resolver.js` — add extension-less resolution (try `.scrml` fallback before failing).

**Priority:** medium-low. Current fixtures `modern-006/007-with-helpers.scrml` were updated to use explicit `.scrml`. But it's friction for new users.

### 2h. `lin` redesign (still queued from S18)

User's original vision for `lin` is discontinuous scoping, not Rust-style linear types. Deep-dive + debate still queued per memory entry `project_lin_redesign.md`. Out of scope until the user re-prioritizes; the current lin implementation works within its (narrower) semantics.

### 2i. Self-host completion + 2 known-fail tests (deferred since S18)

Same 2 pre-existing self-host bootstrap parity failures still red:
- `Bootstrap L3: self-hosted API compiles compiler > self-hosted api.js exports compileScrml`
- `Self-host: tokenizer parity > compiled tab.js exists`

Deferred per user direction S18; part of the §5-era backlog. Self-hosting as a whole is the parity target with `~/scrmlMaster/scrml/`.

### 2j. Older §5-era backlog (carried from S22)

From `handOffs/hand-off-22.md` §6:
- P3 self-host completion + idiomification.
- P5 TS migrations — `ast-builder.js`, `block-splitter.js` still `.js`.
- P5 ExprNode Phase 4d + Phase 5 — additional coverage, then retire legacy string-form fields.
- Full Lift Approach C Phase 2 — `emitConsolidatedLift` refactor for fragmented bodies.
- Async loading stdlib helpers.
- DQ-12 Phase B — diagnostic quality work.

---

## 3. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh` compiles 12 browser test samples.
- Gauntlet regression trees:
  - `compiler/tests/unit/gauntlet-s20/` — 5 files, S20 bugs.
  - `compiler/tests/unit/gauntlet-s22/` — 4 files, 45 tests. Includes the 2 new S23 DOM-wiring tests in `derived-machines.test.js`.
  - `compiler/tests/unit/gauntlet-s23/meta-bugs.test.js` — new, 9 tests covering S20 meta bugs 2a/2b/2d.
- Full test run: ~4.5s at S23 scale (6,889 tests across 278 files).
- Side-effect regeneration: `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` still regenerates on every run (untracked in git; safe to leave).

---

## 4. Agents available (no staging needed)

Same primary roster as S22/S23 — see `/.claude/agents/`:

PA (this), Explore, Plan, general-purpose, scrml-project-manager, scrml-language-design-reviewer, scrml-integration-pipeline-reviewer, scrml-diagnostics-quality-reviewer, scrml-compiler-diagnostics-engineer, scrml-token-and-ast-engineer, scrml-type-system-{engineer,reviewer,tester}, scrml-end-to-end-compiler-tester, scrml-language-conformance-tester, scrml-linear-type-{specialist,tester}, scrml-html-codegen-{engineer,reviewer}, scrml-html-output-tester, scrml-js-codegen-{engineer,reviewer}, scrml-js-output-tester, scrml-css-compilation-{engineer,reviewer}, scrml-css-output-tester, scrml-server-boundary-{analyst,tester}, scrml-state-inference-engineer, scrml-block-split-parser-engineer, scrml-parser-architecture-reviewer, scrml-macro-system-{engineer,reviewer,tester}, scrml-exhaustiveness-{checker-engineer,tester}, scrml-pipeline-correctness-tester, scrml-ast-correctness-tester, scrml-deep-dive, debate-curator, debate-judge, scrml-developer, scrml-scribe, project-mapper, resource-mapper, gauntlet-overseer, agent-forge, agent-registry, claude-code-guide.

No staging required for any queued item.

---

## 5. Recommended S24 opening sequence

1. Check `handOffs/incoming/` for new messages.
2. Prompt user priority across queued items:
   - **§2a E-SCOPE-001 in logic blocks** (medium-large, improves diagnostics — touches the whole type system).
   - **§2c Match type narrowing for function params + local lets** (medium, ergonomics fix affecting every enum workflow).
   - **§2b Deep-dive followups C/F/G** — temporal transitions / property tests / audit-replay (each small-to-medium, different flavors).
   - **§2d/2e/2f/2g low-priority cleanups** (each trivial, 10-30 min).
3. If the user picks §2c (type-narrowing): my recommendation for sequencing is to start with the simplest case (file-scope `let` with annotation — already works) and trace what TS pass sees the annotation; then extend to function-param types; then to local `let`/`const` inside functions. Add a test for each pattern.
4. If the user picks §2a (E-SCOPE-001): start with a minimal scope-walker MVP on the existing `err-scope-001-undeclared.scrml` fixture. Grow coverage incrementally.
5. If the user picks §2b (deep-dive followups): recommend starting with **G (audit/replay)** — smallest grammar change, biggest debuggability win.

### Explicit non-goals for S24 opening

- **Do not** rewrite more examples to showcase features until there's a concrete user request or a gauntlet run produces one. Mario already serves as the flagship.
- **Do not** batch two queued items in one commit. They are independent.
- **Do not** push on landing — the S23 one-time auth was per-push; each S24 push needs its own auth or a master-PA needs:push message.

---

## 6. Audit state (persistent)

S23 ran a compile audit across all 796 .scrml files under `samples/compilation-tests/` and `examples/`. Final state:
- **256 clean**
- **406 warns** (most are W-PROGRAM-001 noise on minimal snippets — intentional for test fixtures that don't need a root program)
- **134 errors** — **all of them intentional-error fixtures** in `gauntlet-*-error-*`, `phase1-fn-prohibition-*`, `*-type-mismatch-*`, `*-bad-*` directories. Plus `samples/compilation-tests/lin-002-double-use.scrml` which its own header flags as "should reject with E-LIN-002".

**If S24 introduces a feature that would break a fixture, re-run the audit script:** `/tmp/s23-audit/compile-all.sh` (may need recreating — it was a tmp-dir script). The logic is simple: `find samples examples -name '*.scrml' | while read f; do scrml compile ...`. The audit should stay at ~256 clean / ~134 intentional-error.

---

## 7. Known compiler bugs (documented, NOT fixed)

Catalogued explicitly so S24 can decide whether to address them:

1. **Match subject loses param/local type annotation** → §2c above. Workaround in Mario + tutorial.
2. **Compound `if=(...)` attribute expressions → false-positive E-DG-002** → §2d above.
3. **`@var` in runtime html-fragment meta body → false-positive E-DG-002** → §2e above.
4. **Machine + in-enum `transitions {}` combo → variant-name whitespace leak** → §2f above.
5. **Import resolver requires explicit `.scrml` extension** → §2g above.
6. **Pre-existing parser bug (S22 §6): body-pre-parser statement-boundary between two consecutive `@name: SomeMachine = X` reactive-decls** — still open from S22. Workaround: separate `${ }` blocks.

---

## Tags
#session-24 #open #queue-scope-001 #queue-type-narrowing #queue-deep-dive-followups #s23-complete
