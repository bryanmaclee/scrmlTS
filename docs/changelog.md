# scrml — Recent Fixes & Work In Flight

A rolling log of what just landed and what's actively underway in the compiler. For the full spec and pipeline docs see `compiler/SPEC.md` and `compiler/PIPELINE.md`.

Baseline (2026-04-19 after S28 — validation elision + 5 adjacent fixes): **7,183 tests passing / 10 skipped / 2 failing** (26,415 expects across 315 files). Same 2 pre-existing self-host fails since S18, deferred for the next deep-arc session.

---

## Recently Landed

### 2026-04-19 (S28 — validation elision arc + 5 adjacent fixes)

The S27-queued static-elision deep-dive shipped end-to-end across four
codegen slices plus a §51.5.2 spec amendment. Five additional gaps closed
on the warm context: §51.13 phase 7 (guarded projections), §51.14
E-REPLAY-003 (cross-machine replay), two long-standing parser bugs,
test-helper centralization, and §19 error-arm scope-push (S25-queued).
Suite 7,126 → 7,183 pass (+57 new tests). Dual-mode parity verified
(default vs. `SCRML_NO_ELIDE=1`).

- **§51.5 validation elision (4 slices + spec).** `classifyTransition` +
  `emitElidedTransition` in `emit-machines.ts` drop variant extraction,
  matched-key resolution, and the rejection throw for transitions the
  compiler can prove legal at compile time. Side-effect work — §51.11
  audit push, §51.12 timer arm/clear, §51.3.2 effect block, §51.5.2(5)
  state commit — is preserved on every elided site (spec normative).
  Coverage: Cat 2.a/2.b literal unit-variant against unguarded wildcard
  rule with no specific shadow; Cat 2.d payload constructors via
  balanced-paren scanner; Cat 2.f trivially-illegal target → compile-
  time **E-MACHINE-001** (closes §51.5.1's symmetric obligation). Slice
  4 adds `setNoElide()` / `SCRML_NO_ELIDE=1` env var for CI dual-mode
  parity. §51.5.1 illegal detection runs BEFORE the no-elide gate
  (normative obligation, not optimization). Spec §51.5.2 normative
  bullets rewritten to clarify "runtime guard" = validation work
  specifically. Commits `01f5847` `cb25aaa` `59b35a1`. Backed by
  `scrml-support/docs/deep-dives/machine-guard-static-elision-2026-04-19.md`.
- **§51.13 phase 7 — guarded projection-machine property tests.** Mirrors
  phase 2's parametrization model. Inlined projection harness takes a
  `guardResults` map keyed on rule label; generator walks each source
  variant's rules in declaration order emitting one test per guarded
  rule (truthy case) plus a terminal test (unguarded fallback or
  `undefined` when all-guarded). Same labeled-guards constraint carries
  over from phase 2. Commit `2f3f95e`.
- **§51.14 E-REPLAY-003 — cross-machine replay rejection.** §51.14.6
  non-goal lifted. Reverse map `auditTarget → machineName` via existing
  `machineRegistry` lets the compile-time validator detect when `@log`
  is the audit target of machine A and `@target` is governed by
  machine B. Synthetic-log replays (logs not declared as any machine's
  audit target) still permitted — user-managed. No audit-entry-shape
  change required. Commit `6c1dfe7`.
- **§51.3 multi-statement effect bodies.** `parseMachineRules` previously
  split rule lines on `raw.split(/[\n;]/)`, which fragmented effect
  bodies containing `;` like `.A => .B { @x = 1; @y = 2 }` into three
  broken lines (silent — first rule had unterminated brace, second was
  dropped). Replaced with depth-tracking `splitRuleLines` that respects
  `{}` / `()` / `[]` depth, strings (single/double/backtick), and
  comments (line/block). Surfaced in S27 wrap. Commit `17b8972`.
- **§14.4 single-line payload enums.** `parseEnumBody` split the variants
  section on `\n` only, so a declaration like
  `{ Pending, Success(value: number), Failed(error: string) }` collapsed
  into one "line" that the payload branch silently rejected, registering
  zero variants. Downstream symptom: any `< machine for=Result>` reference
  fired E-MACHINE-004 "Valid variants: ." (empty list). Fixed by splitting
  on `["\n", ","]` at top level — `splitTopLevel` already tracks `()`
  depth so payload field commas stay with their variant. Backfilled the
  slice-2 runtime-E2E tests deferred earlier in the session. Commit `fdb43f0`.
- **§19 error-arm handler scope-push (S25 queue).** Pre-S28 the
  `guarded-expr` case in `type-system.ts` did exhaustiveness analysis on
  `!{}` arms but never walked arm.handlerExpr through the scope checker —
  undeclared idents in handlers compiled cleanly, and the caught-error
  binding (`::X(e) -> use(e)`) was invisible. Symmetric with propagate-
  expr's binding push: enter a child scope per arm, bind `arm.binding`,
  walk the handler, pop. Commit `a15cdb6`.
- **Test-helper centralization + bare-keyword gotcha.** New
  `compiler/tests/helpers/extract-user-fns.js` replaces 8 duplicated
  `knownInternal` regexes across S27/S28 test files. Bare-word entries
  (`effect`, `lift`, `replay`, `subscribe`, etc.) gain `(?!_\d)` negative
  lookahead so a user fn named `effect` (which mangles to `_scrml_effect_5`)
  no longer gets filtered as the internal `_scrml_effect` helper. Doc
  comment in `var-counter.ts` documents the `_scrml_<safe>_<N>` mangle
  convention. Commit `5c61438`.
- **Regression tests (+64).** New `compiler/tests/unit/gauntlet-s28/`
  with 6 files: elision slice-1 (22 tests), slices 2-4 (17 tests),
  multi-stmt effect body (6), payload-enum comma-split (5), projection-
  guard phase-7 (8), error-arm scope (6). Plus 8 S27 test files refactored
  to use the shared helper, 3 S25 temporal tests retargeted (assignments
  to undeclared targets are now compile-errors), 1 S26 phase-6 test
  retargeted (unlabeled vs labeled-guarded projection), 1 S27 cross-
  machine replay test flipped to assert E-REPLAY-003.

### 2026-04-19 (S27 — §2b G free audit/replay shipped + 4 silent runtime fixes)

Single-arc session: §2b G (the audit/replay deep-dive item) shipped end-
to-end across two slices, but the real story was the four pre-existing
silent-runtime bugs that surfaced during testing. S26's auto-property-
test harness synthesized its own `{variant, data}` objects which
ironically masked the fact that the real transition guard was broken
for unit-variant enums. Suite 7,069 → 7,126 pass (+57 new tests).

- **§51.11.4 audit entry shape extension.** Audit entries gain `rule` +
  `label` fields alongside `from` / `to` / `at`. `rule` is the canonical
  wildcard-fallback-resolved table key (`"A:B"` exact, `"*:B"` wildcard
  target, etc.); `label` is the identifier from a `[label]` clause on the
  matched rule. `emitTransitionTable` bakes labels into table entries
  (`{ guard: true, label: "foo" }`); `emitTransitionGuard` computes
  `__matchedKey` alongside `__rule` via a parallel ternary fallback chain.
  Commit `224847d`.
- **§51.11 audit completeness — timer transitions + freeze.**
  `_scrml_machine_arm_timer` signature extended with a `meta` payload
  carrying `auditTarget` + `rulesJson`. Timer expiry now both pushes the
  audit entry AND re-arms downstream temporal rules so chained temporals
  (A after 1s => B, B after 1s => C) cascade automatically. Every audit
  entry is `Object.freeze`'d on both push paths (transition guard and
  timer expiry) per §51.11.4. Commit `267ed61`.
- **§51.14 replay primitive — `replay(@target, @log[, index])`.** New
  spec section (~210 lines). Function-call syntax (no new keyword);
  target is name-string via @-ref, log is reactive_get, index is any
  integer expression. Runtime helper `_scrml_replay(name, log, endIdx?)`
  bypasses transition guard, audit push, and clears pending temporal
  timers; fires subscribers + derived propagation + effects normally.
  Compile-time recognition in `emit-expr.ts` structured-call path +
  fallback `rewriteReplayCalls` pass for non-structured contexts.
  Commit `00ba7d3`.
- **§51.14 replay compile-time validation (G2 slice 2).** **E-REPLAY-001**
  (target must be machine-bound reactive) and **E-REPLAY-002** (log must
  be declared reactive) via duck-typed recursive AST walker that visits
  every `CallExpr` whose callee is `ident "replay"`. Two sub-messages
  for E-REPLAY-001 distinguish "declared but not machine-governed" from
  "undeclared in scope". Commit `2453062`.
- **§51.5 unit-variant transitions crash at runtime — fix.** Pre-S27
  `__prev.variant` extraction fell back to `"*"` for bare-string unit
  variant values, producing key `"*:*"` that missed every declared rule
  and threw E-MACHINE-001-RT. Every machine-governed unit-variant enum
  was unusable in practice. Hidden by shape tests + the S26 property-
  test harness that synthesized its own variant objects. Three real
  end-to-end tests now compile + execute the guard via SCRML_RUNTIME in
  a `Function()` sandbox. Commit `eff8188`.
- **§51.5 guarded wildcard rules fire guard + effect — fix.** `* => .X
  given (…)` was treated as unguarded at runtime because the guard /
  effect comparisons keyed on `__key` (literal `prev:next`) instead of
  the `__matchedKey` the runtime actually resolved to. One-line fix in
  each branch. Commit `abfe637`.
- **§51.5 effect-body @-refs compile through `rewriteExpr` — fix.** Effect
  bodies like `{ @trace = @trace.concat(["x"]) }` emitted literal `@`
  tokens (invalid JS) because emit-machines inserted `rule.effectBody`
  raw. Wrapped in `rewriteExpr` so effect bodies behave like any other
  bare statement. Commit `73225f7`.
- **§18 match-arm expression-only form on a single line — fix.**
  `match x { .A => 1 .B => 2 }` triggered E-TYPE-020 because
  `splitMatchArms` only split on newlines, hiding B and later arms from
  the exhaustiveness checker. Replaced with a char-level scanner that
  tracks brace/paren/bracket depth, strings, and comments, recognizing
  arm-header starts inline. Defensive `collectExpr` tightening in
  `ast-builder.js` as a second layer. Commit `5d0bdc6`.
- **Runtime-test convention established.** Several S27 tests execute
  compiled output via `SCRML_RUNTIME` in a `Function()` sandbox to catch
  silent-runtime bugs. Pattern: regex-extract user fn names from compiled
  JS, closure-capture them into a `userFns` object. New compiler features
  that claim runtime behavior should use this pattern rather than shape-
  only assertions — every pre-existing bug closed in S27 went undetected
  for months under shape-only testing.

### 2026-04-18 (S26 — §2b F: auto-generated machine property tests, phases 1-6)

§51.13 `--emit-machine-tests` shipped end-to-end across six phases in a
single session. Slogan: **machine = enforced spec**. The declared
transition table IS the oracle; generated tests confirm the compiled
machine refuses everything the table doesn't allow. Suite 7,006 → 7,069
pass (+63 new tests).

- **§51.13 phase 1 — exclusivity (property a).** Generator emits a bun:test
  suite per `< machine>` declaration: for every reachable variant V and
  every variant W in the governed enum, declared `(V → W)` pairs SHALL
  succeed and undeclared pairs SHALL throw E-MACHINE-001-RT. New
  `compiler/src/codegen/emit-machine-property-tests.ts` (425 LOC) +
  CLI flag `--emit-machine-tests` writes `<base>.machine.test.js`
  alongside the user-test `<base>.test.js`. Inlined `tryTransition`
  harness uses `globalThis._scrml_reactive_store` so tests don't bleed
  into the real reactive runtime. Commit `24089c5`.
- **Machine guard rewriteExpr fix.** `< machine>` rule guards captured raw
  scrml text but emitted unmodified, so guards referencing `@reactive`
  refs emitted invalid JS (raw `@name` token). Now run through `rewriteExpr`
  before emission. Same root cause that S27 found in effect bodies.
  Commit `b84dadf`.
- **Parser fix — typed `const @name:` decls preserve initializer.** Pre-
  S26 `const @gate: boolean = true` lost its `= true` initializer because
  the typed-const parser branched into a path that didn't capture the
  RHS. Surfaced while writing phase-1 tests that needed reactive-bound
  gate vars. Commit `19e8b29`.
- **§51.13 phase 2 — guard coverage (property c).** Each LABELED `given`
  guard SHALL receive one passing test (truthy → succeeds) and one
  failing test (falsy → E-MACHINE-001-RT). Tests parametrize the guard
  result rather than evaluating the real expression — harness takes a
  `guardResults: Map<ruleKey, boolean>` and dispatches on it. Real-
  expression evaluation deferred to a future phase that needs input
  synthesis. Unlabeled guards skip the enclosing machine entirely so
  every guard in a generated suite has a human-readable identifier.
  Commit `81d6d5c`.
- **§51.13 phase 3 — payload-bound rule support.** §51.3.2 binding-group
  rules now in scope. The harness is binding-transparent — it never
  invokes the real machine IIFE, so declared destructuring is never
  executed in generated tests. Filter relaxed accordingly. Commit `4bd9ca6`.
- **§51.13 phase 4 — wildcard rule support.** `*` as the from-variant
  matches any already-reachable variant; `*` as the to-variant expands
  the reachable set to every variant declared on the governed enum.
  Pair resolution follows the four-step fallback chain used by
  `emitTransitionGuard`: exact → `*:To` → `From:*` → `*:*`. Harness
  tracks the matched table key so `guardResults` keys on the matched
  (possibly-wildcard) rule rather than the concrete input pair. Commit
  `3156b5d`.
- **§51.13 phase 5 — temporal rule support.** §51.12 temporal rules
  contribute exclusivity + guard-coverage tests just like non-temporal
  rules — the `(.From, .To)` pair is a declared transition regardless of
  how it fires. Test titles get an `(after Nms)` annotation so temporal
  rules are visible in the suite. EXPLICITLY OUT OF SCOPE: timer lifecycle
  itself (arm/clear/reset on variant entry/exit/reentry). Verifying that
  needs a live runtime with fake-timer control; the self-contained
  harness doesn't invoke runtime code. Generated file emits a header
  comment surfacing this scope boundary so users cover timer lifecycle
  with hand-written integration tests. Commit `eecaa89`.
- **§51.13 phase 6 — projection machine support.** §51.9 derived
  machines emit through a distinct path. No transition table; reading
  `@projected` delegates through `_scrml_project_<Name>(source)`. The
  property under test is **(d) Projection correctness** — for every
  source variant V, the projection function returns the target variant
  declared by the first matching rule. Generated suite inlines a minimal
  copy of the projection function (mirroring `emitProjectionFunction`)
  and emits one test per source variant. Phase 6 covered unguarded
  projections only; guarded projections deferred to phase 7 (shipped
  S28). Commit `0af336e`.

### 2026-04-18 (S25 — §2h lin redesign cleanup + §51.12 temporals + §51.11 audit clause)

Two arcs in one session: closing the lin redesign work (Approach B —
restricted intermediate visibility) and shipping §51.12 temporal
transitions (`.From after Ns => .To`). Plus the §51.11 `audit @log`
clause that S27 would later build replay on top of. Suite 6,949 →
7,006 pass (+57 new tests).

- **§35.5 E-LIN-005 — reject let/const/lin shadowing an enclosing lin.**
  Per Approach B, intermediate visibility means a lin in an outer scope
  is visible (and consumable) by inner scopes, but cannot be SHADOWED
  by an inner declaration of the same name. New error fires for `let x`,
  `const x`, and `lin x` declarations that would shadow an enclosing
  `lin x`. Commit `6f5b90c`.
- **§35.5 push scope for while-stmt so E-LIN-005 fires in while bodies.**
  Companion fix — without scope-push, while-body declarations weren't
  checked against the enclosing lin. Commit `b6c4f5d`.
- **§51 emit effect blocks for rules without a `given` guard — fix.**
  Pre-S25 the effect-block emission filter ran over `guardRules`, which
  silently dropped effect-only rules (no guard). Now uses `effectRules`.
  Commit `3556b22`.
- **§35.1 / §35.2 wording — Approach-B restricted intermediate visibility.**
  Spec text aligned with the implemented semantics: lin variables are
  visible across all sibling and child scopes within the same `${}`
  block, but shadowing is rejected. Companion §35.2.2 ratifies cross-
  `${}` block lin via the same model. Commits `0e52306` `83101c7`.
- **§2a scope push for match-arm-block + if-stmt branches.** Match arms
  and if branches each get a fresh child scope so declarations inside
  one branch don't leak into siblings. E-SCOPE-001 now fires correctly
  for refs inside an arm body that don't resolve up the chain. Commits
  `5ab63ac` `4b1e8b2`.
- **§35.5 E-LIN-006 — reject lin consumption inside `<request>` /
  `<poll>` body.** Async lifecycle elements re-execute their body on
  every refresh cycle, which would consume the lin multiple times.
  Compile-time check + diagnostic naming the lin and the lifecycle
  element. Commit `e171e33`.
- **`docs/lin.md` how-to guide.** User-facing walkthrough of the lin
  keyword: declaration, consumption, scope visibility, shadowing rules,
  E-LIN-005/006 examples. Commit `3b8f2db`.
- **§51.3.2 machine opener migration — sentence form → attribute form.**
  `< machine OrderFlow for OrderStatus { ... } /` (sentence form)
  migrated to `< machine name=OrderFlow for=OrderStatus> ... </>`
  (attribute form). The attribute form aligns with how every other
  custom-element opener parses. The old sentence form stays parseable
  for back-compat but the canonical form is now the attribute one.
  Touched all examples, docs, and the spec. Commit `347ac02`.
- **§51.12 temporal machine transitions — `.From after Ns => .To`.** New
  rule grammar: `after Ns` (or `0.5s`, `500ms`, `3m`, `1h`) between
  `.From` and `=>`. Wildcard `from` rejected at parse time
  (E-MACHINE-021); concrete from-variant only. Each temporal rule arms
  a timer when the machine enters its from-variant; on expiry the
  timer commits the transition and re-arms downstream temporals.
  `_scrml_machine_arm_timer` / `_scrml_machine_clear_timer` runtime
  helpers. Cross-cutting interaction with §51.11 audit (S27 closed
  the audit-completeness gap for timer-fired transitions). Commit
  `7305ac1`.
- **§51.11 audit @varName clause.** New machine-body clause `audit @log`
  declares a reactive array as the destination for transition entries.
  Each successful transition appends `{from, to, at}` (extended to
  `{from, to, at, rule, label}` in S27). Foundation for S27's `replay`
  primitive. Commit `c5e41b3`.
- **Parser fix — statement boundary on `@name:`.** S22 had a known
  pre-existing BPP bug where two consecutive `@foo: SomeMachine = ...`
  reactive-decls on adjacent lines silently dropped the second one. S25
  fixed it: the boundary detector now recognizes `@<ident>:` as a
  statement start. Commit `e37a6fd`.

### 2026-04-18 (S24 — §2a E-SCOPE-001 coverage sweep + §2b/c/d/e/f/g fixes)

§2a scope-checker rolled out across the full statement / expression
surface in nine slices. Plus a clutch of small §2b–§2g fixes from a
gauntlet pass. Suite 6,889 → 6,949 pass (+60 new tests).

- **§2a E-SCOPE-001 sweep — nine slices.** Pre-S24 `E-SCOPE-001`
  (undeclared identifier in logic expression) only fired in a few
  expression contexts. S24 extended coverage to: let/const initializers
  (`9e06884`), reactive-decl initializers (`234f116`), loop-scope
  plumbing + if/return/match-subject/propagate (`e1e21a5`), lin / tilde
  / reactive-derived decls (`ec26c63`), structured assignment RHS
  (`740de7d`), throw / fail / debounced / value-lift (`a758fe1`), and
  bare-expr statements + two supporting fixes (`bb01644`). Each slice
  shares the same pattern: walk the expression's ExprNode (or string
  fallback) through `checkLogicExprIdents` against the current scope
  chain, raising E-SCOPE-001 with a context-specific suggestion.
- **§2b/d phase separation + nested `^{}` at checker-time.** Two meta-
  context fixes: (b) the phase-separation check (compile-time `^{}` vs
  runtime `^{}` content) now runs at meta-checker time instead of eval-
  time, catching the error before it'd crash the eval; (d) nested `^{}`
  in compile-time meta no longer crashes — it's flagged as a clear
  E-META error. Commit `9f2a247`.
- **§2c match subject narrowing for local let/const + function params.**
  Match expression subject narrowing previously only worked for top-
  level reactives. Extended to let/const-bound locals and function
  parameters via the same scope-chain lookup. Commit `c1d71dd`.
- **§2c/§2a meta DG fixes.** Dependency graph credits `meta.get` /
  `meta.bindings` reads as @var consumers (so the dep-graph properly
  tracks reactive dependencies through compile-time meta plumbing); lin
  consumption is now counted at `^{}` capture time rather than later.
  Commit `8711056`.
- **§2d DG credits @var refs in compound `if=(...)` attributes.** Custom-
  element `if=(@a + @b > 5)` previously credited only the leftmost @ref
  (S22 regression). Now every @ref in the parenthesized expression is
  added to the dep-graph so changes propagate correctly. Commit `e377223`.
- **§2e DG credits @var refs inside runtime `^{}` meta html-fragment
  content.** When meta html-fragment content references reactives
  (`^{ <p>${@count}</p> }`), every @ref is added to the dep-graph.
  Commit `ccfc0c0`.
- **§2f trim whitespace after variant-ref prefix in in-enum transitions.**
  `transitions { . Pending => .Processing }` (space after the dot)
  previously fired E-MACHINE-004 against a variant called `" Pending"`.
  Variant-ref normalization now trims whitespace between the prefix and
  variant name. Commit `4f72a45`.
- **§2g extension-less relative imports.** `import { x } from "./foo"`
  now resolves to `./foo.scrml` if the bare path doesn't exist. Aligns
  with TS / JS convention while keeping the explicit `.scrml` form valid.
  Commit `9da03a7`.
- **§4.11.4 / §51.3.2 spec ratification — machine cohesion.** After
  debate the team kept `given` (vs. moving guards to a separate `where`
  clause) and queued the machine-opener migration to attribute form for
  S25. Commit `d2bee47`.

### 2026-04-17 (S23 — meta-checker debt cleanup + DOM read-wiring + tutorial revamp)

Tighter session focused on closing meta-checker debt items, adding the
last piece of §51.9 derived machines (DOM read-wiring), and a tutorial
content sweep. Suite 6,875 → 6,889 pass (+14 new tests).

- **§51.9 DOM read-wiring for projected vars (`${@ui}`).** S22 slice 2
  shipped projection runtime but reading `@ui` in markup left the
  display element unwired because the dep-graph didn't know `@ui` was
  reactive. S23 synthesizes a reactive-decl-like AST node for the
  projected var during annotation so the dep-graph treats it as a
  consumer of the source @order. Reading `${@ui}` now updates correctly
  on @order writes. Closes the S22 known-blocker. Commit `5b5d636`.
- **Meta-checker fixes (4 items).** Phase separation runs at checker time
  (was eval time); nested `^{}` doesn't crash; DG credits `meta.get` /
  `meta.bindings` reads as @var consumers; lin captured by `^{}` is
  counted as consumed. Companion to S24's broader §2a coverage sweep.
  Commits `9f2a247` `8711056`.
- **Examples + tutorial refresh.** `examples/14-mario-state-machine.scrml`
  rewritten to showcase S22 §1a payload variants + §51.9 derived
  machines (the deferred S22 example update). All non-gauntlet sample
  files brought up to current idiomatic scrml. Tutorial §2.3/§2.4 updated
  to canonical syntax + new §2.10 state machines section. Commits
  `7045adf` `2ba4ccd` `e0455b6`.
- **MIT license + GitHub Pages landing.** scrmlTS went public under MIT.
  GitHub Pages landing page at `docs/landing/index.html` + SEO checklist
  in `docs/SEO-LAUNCH.md`. Custom domain CNAME set/unset cycle as the
  domain config landed. user-voice relocated out of the public repo to
  `scrml-support/user-voice-scrmlTS.md` (verbatim history split:
  pre-public archived, post-public continues in scrml-support per the
  per-repo PA scope rules). Commits `427b9ec` `46f007a` `99d9286`
  `5811ed2` `0801d98` `3e8f545`.

---

### 2026-04-17 (S22 — §51.9 slice 2: derived machines runtime + write rejection)

- **Projection function codegen.** `emit-machines.ts` now exports `emitProjectionFunction(machine)` producing `function _scrml_project_<M>(src) { ... }` that walks the projection rules top-to-bottom, dispatches on `src.variant ?? src`, and emits the destination variant as a plain string. Guarded rules emit `if (tag === X && (guard)) return Y;` so `given` clauses run at read time. Rules after an unguarded match are unreachable per §51.9.3 (unguarded terminates the alternation group).
- **Derived reactive registration.** `emitDerivedDeclaration(machine)` emits `_scrml_derived_fns["ui"] = () => _scrml_project_UI(_scrml_reactive_get("order"));` + dirty flag + downstream subscription. Reuses the existing §6.6 infrastructure: `_scrml_reactive_get("ui")` already delegates to `_scrml_derived_get` when the name is in `_scrml_derived_fns`, and writes to `@order` propagate a dirty flag via `_scrml_propagate_dirty` so DOM bindings on `@ui` re-read the projection.
- **emit-reactive-wiring.ts** routes derived machines past the transition-table emit (they have no runtime transitions to enforce) and into the new projection + declaration path. Transition tables are only emitted for non-derived machines.
- **E-MACHINE-017 write rejection** (type-system.ts `rejectWritesToDerivedVars`). Walks the AST once after `validateDerivedMachines`, flagging two kinds of writes: (a) a `reactive-decl` whose name is a projected var (someone wrote `@ui: UI = X`) and (b) a `bare-expr` starting with `@ui = X` or any compound assignment (`@ui += X`). Messages name both the source var and the machine so the user knows where to assign instead.
- **SPEC §51.9** flipped from `(parser + validator landed S22, runtime codegen pending)` to `(landed S22)`, with implementation notes on the runtime wiring added.
- **Regression tests (+10)**. Slice 2 additions to `compiler/tests/unit/gauntlet-s22/derived-machines.test.js`: projection-function shape + runtime round-trip (guarded + unguarded dispatch), derived-declaration shape + dirty-propagation end-to-end, E-MACHINE-017 on reactive-decl + `=` + `+=` + non-projected-vars-untouched, full-file compile + shadow-boolean-collapse example.
- **Known blockers (tracked for follow-up):**
  - Pre-existing BPP statement-boundary bug: two consecutive `@foo: SomeMachine = ...` reactive-decls on adjacent lines can silently drop the second one. Not new in this slice — exposed while writing the end-to-end write-rejection test. The test now sidesteps by splitting the two decls into separate `${}` blocks; a proper fix belongs in the body-pre-parser.
  - Reading `@ui` in markup (`${@ui}`) inserts a `<span data-scrml-logic>` placeholder but the reactive display wiring is not yet emitted because the dep-graph doesn't know `@ui` is reactive. Fix: synthesize a reactive-decl-like AST node for the projected var during annotation so the dep-graph treats it as a consumer of `@order`. Deferred to a follow-up slice.

### 2026-04-17 (S22 — §51.9 slice 1: derived/projection machines — parser + validator)

- **§51.9 derived machine syntax parsed.** `< machine UI for UIMode derived from @order>` — the `derived from @SourceVar` clause is now recognized by the ast-builder, captured into the machine-decl node's new `sourceVar` field, and registered as a derived machine in the type system with `{ isDerived: true, sourceVar, projectedVarName }`. The projected variable name is the machine name with its leading uppercase run lowercased (`UI` → `ui`, `OrderStatus` → `orderStatus`, `HTTPStatus` → `httpStatus`).
- **E-MACHINE-018 exhaustiveness** validated after type annotation finishes: for every derived machine, the compiler looks up the source reactive's governed enum and confirms every variant has at least one unguarded projection rule covering it. Missing variants produce one error each, naming the variant and the source enum.
- **Source-var resolution.** `E-MACHINE-004` fires when `derived from @order` names a reactive that doesn't exist or isn't machine-bound, and a second form of `E-MACHINE-004` rejects transitive projections (source is itself a derived machine — deferred to §51.9.7 future work).
- **Projection RHS still validated** against the projection enum (`E-MACHINE-004` on unknown projection variants); LHS (source variants) intentionally skipped in `parseMachineRules` since the source enum isn't known at that point.
- **SPEC §51.9.6** naming rule tightened: "named by the machine's governed TypeName" → "named by the machine name with its leading uppercase run lowercased" (matches the worked example `< machine UI ... > → @ui`).
- **Deferred to slice 2** (this commit NOT runtime-ready):
  - Runtime codegen — projection function (`_scrml_project_<M>`), `_scrml_derived_declare` wiring, dep-graph edges from derived vars to source. Reading `@ui` at runtime today will see `undefined` from the reactive store; compile-time exhaustiveness catches the design error but doesn't yet produce running code.
  - **E-MACHINE-017** on writes to the projected var — user code that writes `@ui = X` is not yet rejected. Will land with codegen.
  - Projection `given` guards at read time (rules table still records the guard expression, codegen for evaluating it at read time lives in slice 2).
- **Regression tests (+9).** `compiler/tests/unit/gauntlet-s22/derived-machines.test.js`: registration of derived machines with correct projected var naming, LHS-not-validated-as-projection-enum, RHS validated, E-MACHINE-018 on missing variants, exhaustive passes, source-var-not-bound, transitive-projection rejected, guarded-without-unguarded-sibling.

### 2026-04-17 (S22 — §1b payload binding in machine rules)

- **§51.3.2 payload bindings in machine transition rules.** The `variant-ref` grammar now accepts an optional `(binding-list)` on either side of `=>`. On the `From` side, bindings expose the pre-transition variant's payload fields as locals inside the rule's `given` guard and effect block; on the `To` side, they expose the incoming variant's payload. Positional bindings (`.Charging(n)`) resolve to declared field order at parse time; named bindings (`.Reloading(reason: r)`) name the field directly; `_` discards drop a positional slot. The resolved bindings emit as `var <local> = __prev.data.<field>;` (from) or `var <local> = __next.data.<field>;` (to) inside the keyed `if (__key === "From:To") { ... }` block — rule-local scope, no leakage to sibling rules. Parser in `type-system.ts:parseMachineRules` + helper `resolveRuleBindings`; emitter in `emit-machines.ts:emitTransitionGuard` with new `buildBindingPreludeStmts` helper exported for tests.
- **E-MACHINE-015** fires on three cases: binding against a unit variant, a named binding of a non-existent field, and more positional bindings than declared fields. Message names the variant and lists the declared fields.
- **E-MACHINE-016** fires when `|` alternation alternatives disagree on binding shape (either all alternatives bind the same names, or none bind). Detection uses a sort-stable signature of each alternative's binding group.
- **`expandAlternation` rewritten** to respect paren-balanced variant refs: the `|` splitter now tracks paren depth so `.Charging(n)` is not split at internal binding parens, and the suffix-detector (identifies where the `given`/`[`/`{` suffix starts on the RHS) scans at depth 0 rather than using a naive regex — otherwise `given (n > 0)` could be cut off mid-expression by a binding-list that happens to contain `(`.
- **Rule regex tightened.** The old `(\w+|\*)?` variant-name capture backtracked correctly for the original grammar but produced wrong captures once optional binding-groups were added (`given` would be greedily captured as a variant name). Narrowed to `([A-Z][A-Za-z0-9_]*|\*)?` — variants are PascalCase per §14.4, keywords are lowercase.
- **Regression tests (+15).** `compiler/tests/unit/gauntlet-s22/machine-payload-binding.test.js`: positional, named, `_` discard, E-MACHINE-015 (unit variant / unknown field / overflow), E-MACHINE-016 (mismatched alternation / some-bind-some-don't), wildcard `* => *` passes through unaffected, `buildBindingPreludeStmts` standalone helper, and the emitter asserts that bindings land inside the keyed block (not outside).
- **Deferred:** rewriting `examples/14-mario-state-machine.scrml` to demonstrate a payload variant. Mario's current machine-guard runtime wiring has a pre-existing gap (assignments inside function bodies don't go through `emitTransitionGuard`), and changing `MarioState` from unit-only to a payload variant would break its equality checks (`@marioState == MarioState.Small`) and string interpolations. Tracked for a later slice that fixes the wiring gap first.

### 2026-04-17 (S22 — §1a enum payload variants: construction + match destructuring)

- **Enum payload variant construction (prereq for §51.3.2 payload binding in machine rules).** Before S22, `Shape.Circle(10)` threw `TypeError: Shape.Circle is not a function` because `emitEnumVariantObjects` only emitted string entries for unit variants and short-circuited entirely when an enum had zero unit variants. Now `emit-client.ts:emitEnumVariantObjects` iterates every variant and emits a constructor function for each payload variant: `Shape.Circle(10) === { variant: "Circle", data: { r: 10 } }`. Unit variants still emit as strings (`Shape.Square === "Square"`). The tagged-object shape aligns with §19.3.2 `fail` (minus the `__scrml_error` sentinel) so one runtime dispatches both error and regular variants by inspecting `.variant`. The inline `EnumType.Variant(args) → { variant, value: (args) }` rewrite in `rewrite.ts:rewriteEnumVariantAccess` was removed — the constructor function is now the single source of truth, and the old shape (`value` vs the correct `data`) couldn't carry multi-field / named-field payloads anyway. SPEC §51.3.2 prereq text flipped from "blocked" to "landed S22". Commit `2fbc332`.
- **Match destructures tagged-object payload variants.** Before S22, `.Circle(r) => r * r` parsed the binding but the emitter dropped it; `r` was referenced undeclared in the generated JS. Multi-arg `.Rect(w, h)` wasn't parsed at all. Now `parseMatchArm` captures the raw paren contents; a new `parseBindingList` splits on commas and recognizes positional (`r`), named (`reason: r`), and `_` discard forms. `emitMatchExpr` + `emitMatchExprDecl` emit `const __tag = (v && typeof v === "object") ? v.variant : v;` when at least one arm needs tagged dispatch (unit-only and scalar matches stay on the plain `tmpVar === "X"` path). Variant arms with bindings emit `const loc = tmp.data.<field>;` — positional bindings resolve via a per-file variant-fields registry (`buildVariantFieldsRegistry(fileAST)` populates it at the top of `generateClientJs`, clears after), named bindings use the field name directly. Collisions / unknown variants produce a diagnostic comment instead of a runtime `ReferenceError`. A `splitMultiArmString` bug was also fixed — the §42 presence-arm detector was splitting `.Circle(r) =>` at the `(` because it didn't notice the paren belonged to a variant binding. Commit `d8ebfb3`.
- **Regression tests (13 new, 2 updated).** New `compiler/tests/unit/gauntlet-s22/payload-variants.test.js` (6 tests: all-payload, mixed unit/payload, single- and multi-field round-trip, `.variants` ordering, §19.3.2 `fail` alignment). New `compiler/tests/unit/gauntlet-s22/payload-variants-match.test.js` (7 tests that compile + execute the emitted client JS: positional, multi-field, named, mixed unit/payload, `_` discard, scalar, unit-only). `emit-match.test.js:45` flipped from "binding ignored" to registry-aware positional and named destructuring. Existing `enum-variants.test.js` §6–§13b and `codegen-struct-rewrite.test.js` "enum variant in chain" updated to the constructor-function model (calls are preserved by rewrite, shape is asserted via `emitEnumVariantObjects` eval).
- **Known limitation, deferred.** Short-form `.Circle(10)` in a typed-annotation context `let s:Shape = .Circle(10)` still lowers to `"Circle"(10)` by the standalone-dot pass (a type-inference concern, not codegen). Fully qualified `Shape.Circle(10)` works. Live repro remaining at `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-match-payload-positional-031.scrml` — match destructures correctly now, only the construction line is still broken.

### 2026-04-17 (S21 — §19 codegen, §21 imports, §51 alternation, README/tutorial polish)

- **§51 `|` alternation in machine transition rules.** Grammar extended: `machine-rule ::= variant-ref-list '=>' variant-ref-list guard? effect?`, where `variant-ref-list ::= variant-ref ('|' variant-ref)*`. Both sides of `=>` may list variants; the rule desugars to the cross-product of single-pair rules before the type checker (`expandAlternation` at `type-system.ts:1902`). Any guard or effect block attaches to every expansion. Duplicate `(from, to)` pairs — within a line or across lines — emit new **E-MACHINE-014**. Mario example collapses from 8 lines to 3. Commit `eef7b5e`.
- **§19 error handling codegen rewrite.** `fail E.V(x)` now parses and emits a tagged return object inside nested bodies (if/for/function); `?` propagation works in nested bodies; `!{}` inline catch checks `result.__scrml_error` and matches on `.variant` rather than using try/catch (per §19.3.2 "fail does not throw"). E-ERROR-001 (fail in non-failable function) now fires — was unreachable before because `fail` never parsed inside function bodies. Parser also accepts canonical `.` separator alongside `::` alias. `ast-builder.js` parseFailStmt + parseOneStatement dispatch; `emit-logic.ts` guarded-expr rewrite. Commit `37049be`.
- **E-IMPORT-006 on missing relative imports.** Module resolver previously resolved the absolute path but never checked `existsSync`, so `import { x } from "./missing.scrml"` compiled clean. `buildImportGraph` now flags E-IMPORT-006 when the target is not a `.js` specifier, not in the compile set, and absent on disk; synthetic test-path importers are skipped so self-host / resolver unit tests stay green. Commit `86b5553`.
- **README "Why scrml" rewrites.** "State is first-class" redefined from "@var reactivity" to "state is named, typed, instantiable" per the S10/S11 memory. "Mutability contracts" rescoped from a machine-only paragraph to an opt-in three-layer story: value predicates (§53) + presence lifecycle (`not`/`is some`/`lin`) + machine transitions. Features-section bullet that still held the `server @var`/`protect` grab-bag renamed to "Server/client state." Commits `d802707` and the preceding §51 commit.
- **Tutorial v2 promoted.** `docs/tutorial.md` now contains the former v2 content (v1 deleted). Snippets renamed `docs/tutorialV2-snippets/` → `docs/tutorial-snippets/`. Commit `41e4401`.
- **Regression tests (3 new files, 22 tests).** `compiler/tests/unit/gauntlet-s20/error-handling-codegen.test.js` (11), `.../import-resolution.test.js` (3), `.../machine-or-alternation.test.js` (8). Updated `emit-logic-s19-error-handling.test.js` (14 tests) to the new return-value model.

### 2026-04-16 (S20 — gauntlet phases 5-12)

Executed gauntlet phases 5-12 against SPEC.md: meta, SQL, error/test, styles, validation/encoding, channels, integration apps, error UX. Fixed 5 compiler bugs, documented 11 more for batch treatment.

- **Bugs fixed (5).** `reflect(@var)` misclassified (now runtime per §22.4.2); E-META-008 now fires for `reflect()` outside `^{}`; E-META-006 now catches `lift <tag>` inside `^{}`; no spurious E-META-001/005 alongside E-META-003 on unknown types in `reflect()`; E-FN-003 now catches `@var = …` / `@var += …` inside `fn` bodies.
- **Bugs documented for future batch.** `fail` compiles to bare `fail;` (fixed in S21); E-ERROR-001 not enforced (fixed in S21); `?` emits as literal `?;` (fixed in S21); `!{}` try/catch vs `fail` return mismatch (fixed in S21); `lin + ^{}` capture not counted as consumption; phase separation detected at eval-time; DG false-positive for `@var` via `meta.get()`/`meta.bindings`; nested `^{}` in compile-time meta crashes eval; E-SCOPE-001 doesn't fire for undeclared variables in logic blocks; **E-IMPORT-006** for missing modules (fixed in S21).
- **Test artifacts.** 80 fixture files under `samples/compilation-tests/gauntlet-s20-{channels,error-test,error-ux,meta,sql,styles,validation}/` and 16 regression tests under `compiler/tests/unit/gauntlet-s20/`. End-of-S20 baseline: 6,802 pass / 10 skip / 2 fail.

### 2026-04-14–15 (S19 — gauntlet phases 1-4)

Language gauntlet across declarations, control-flow, operators, and markup. Multiple bug fixes + fixture additions across commits `8e95226` (error-system §19 compliance), `dd25311` (reject JS-reflex keywords), `cf426a1` (animationFrame + `ref=`), `36a99bd` (loops/labels/assignment-in-condition), `a9ab734` (`_` wildcard alias + E-LOOP-003 disable), `cee9fc1` (markup fixture corpus). Full Phase 2 triage documented under `docs/changes/gauntlet-s19/` (pending archival to scrml-support/archive).

### 2026-04-14 (S18 — public-launch pivot)

- **README SQL-batching expansion.** Five new Server/Client bullets (Tier 2 N+1 rewrite, Tier 1 envelope, mount coalescing, `.nobatch()` opt-out, batch diagnostics) plus a sharper "Why scrml" paragraph (adds `D-BATCH-001` near-miss + `.nobatch()` escape hatch) plus `?{}` row in the Language Contexts table noting auto-batching. Commit `d20ffa4`.
- **Lift Approach C Phase 2c-lite — drop dead BS+TAB re-parse block.** The inline re-parse fork inside `emitLiftExpr` (~50 LOC) that normalized tokenizer-spaced markup and rebuilt a MarkupNode via `splitBlocks` + `buildAST` was confirmed dead by S14 instrumentation (0 hits across 14 examples + 275 samples + compilation-tests). Deleted. Commit `f5d78df`. Full Phase 2 deferred (helpers still reached via `emitConsolidatedLift` for fragmented bodies).
- **Bug fix: `export type X:enum = {...}` misparsed.** `ast-builder.js` `collectExpr` treated `:` + IDENT + `=` as a new assignment-statement boundary, breaking the decl because `enum`/`struct` tokenize as IDENT (not KEYWORD). The leftover `enum = {...}` was reparsed as a standalone let-decl, firing `E-MU-001` on `enum`. Fix: added `:` to the lastPart skip-list alongside `.` and `=`. Commit `b123ed1`. **Affects any user writing an exported named-kind type — high public impact.**
- **Bug fix: reactive-for `innerHTML = ""` destroys keyed reconcile wrapper.** `emit-reactive-wiring.ts` unconditionally emitted the clear inside `_scrml_effect`, so every re-run destroyed the `_scrml_reconcile_list(` wrapper before the diff could run. Fix: skip the clear when `combinedCode` contains `_scrml_reconcile_list(` (mirrors the existing single-if branch guard). Commit `b123ed1`.
- **Test fixture: `if-as-expr` write-only-let.** Not a compiler bug — MustUse correctly flagged `let x = 0; if (true) { x = 1 }` (no read of `x`). Test intent was if-stmt codegen, not MustUse semantics — fixture updated to `log(x)` after the if-stmt. Commit `b123ed1`.
- **8 TodoMVC happy-dom tests skipped with notes.** The harness wraps the runtime in an IIFE, scoping `let _scrml_lift_target = null;` to that IIFE; client-JS IIFE can't see it, throws `ReferenceError: _scrml_lift_target is not defined`. Real browsers share global lexical env between classic `<script>` tags — works there. Puppeteer e2e (`examples/test-examples.js`) covers 14/14 examples. Tests marked `test.skip` with top-of-file annotation documenting root cause and unskip condition. Commit `b123ed1`.
- **S19 gauntlet plan queued.** Full 12-phase language gauntlet plan (decls, control-flow, operators, markup, meta, SQL, error/test, styles, validation/encoding, channels, integration apps, error UX) left at `handOffs/incoming/2026-04-14-2330-scrmlTS-to-next-pa-language-gauntlet-plan.md`. 31 agents identified from `~/.claude/agentStore/` with wave-staging recommendation.

### 2026-04-14 (S17)

- **SQL batching Slice 6 — §8.11 mount-hydration coalescing.** When ≥2 `server @var` declarations on a page have callable initializers (loader functions), the compiler emits one synthetic `POST /__mountHydrate` route whose handler runs every loader via `Promise.all` and returns a keyed JSON object. The client replaces per-var `(async () => { ... })()` IIFEs with one unified fetch that demuxes results via `_scrml_reactive_set`. Non-callable placeholders (literal inits, `W-AUTH-001`) are excluded; writes stay 1:1 per §8.11.3. Route export follows the existing `_scrml_route_*` convention. Tier 1 coalescing (§8.9) applies automatically inside the synthetic handler because loaders are sibling DGNodes.
- **SQL batching Slice 5b remainder — §8.10.7 guards.** `E-PROTECT-003` fires when a Tier 2 hoist's `SELECT` column list overlaps any `protect`-annotated column on the target table — the hoist is refused and CG falls back to the unrewritten for-loop. `SELECT *` expands to every protected column on the table. New exported `verifyPostRewriteLift` runs after Stage 7.5 and emits `E-LIFT-001` if any hoist's `sqlTemplate` contains a `lift(` call (defensive — §8.10.1 construction makes this unreachable today, but the pass is the spec's required re-check gate).
- **SQL batching microbenchmark.** New `benchmarks/sql-batching/bench.js` measures the exact JS shapes the compiler emits before/after the batching passes on on-disk WAL `bun:sqlite` (synchronous=NORMAL). Results in `benchmarks/sql-batching/RESULTS.md`. Headline: Tier 2 loop-hoist speedup is **1.91× at N=10, 2.60× at N=100, 3.10× at N=500, 4.00× at N=1000**. Tier 1 shows ~5% on read-only handlers — the envelope's real value is snapshot consistency and contention amplification under concurrent writers.
- **README promotion.** "Why scrml" now states "the compiler eliminates N+1 automatically" with a link to the measured results.

### 2026-04-14 (S16)

- **SQL batching Tier 1 + Tier 2 end-to-end** — spec §8.9 / §8.10 / §8.11 + PIPELINE Stage 7.5 + CG emission all landed (11 commits on `main`).
  - **Tier 1 per-handler coalescing (§8.9)**: independent `?{}` queries in a single `!` server handler execute under an implicit `BEGIN DEFERRED..COMMIT` envelope with catch-`ROLLBACK`. One prepare/lock cycle instead of N. `.nobatch()` chain method opts out of any site. `E-BATCH-001` fires on composition with explicit `transaction { }`; `W-BATCH-001` warns when `?{BEGIN}` literals suppress the envelope.
  - **Tier 2 N+1 loop hoisting (§8.10)**: `for (let x of xs) { let row = ?{... WHERE col = ${x.field}}.get() }` rewrites to one `WHERE IN (...)` pre-fetch + `Map<key, Row>` + per-iteration `.get(x.id) ?? null`. `.all()` groups into `Map<key, Row[]>`. Positional `?N` placeholders preserve parameter safety. `D-BATCH-001` informational diagnostic on near-miss shapes (`.run()`, tuple WHERE, multiple SQL sites, no match). `E-BATCH-002` runtime guard on `SQLITE_MAX_VARIABLE_NUMBER` overflow.
  - **CLI**: `scrml compile --emit-batch-plan` prints the Stage 7.5 BatchPlan as JSON.
- **`.first()` → `.get()` reconciliation (§8.3)** — 17 occurrences renamed in SPEC. `.get()` matches bun:sqlite convention; `.first()` dropped.
- **README refinements** — new "Free HTML Validation" subsection explains predicate → HTML attr derivation; "Variable Renaming" rewritten with real §47 encoding (`_s7km3f2x00`) + tree-shakeable decode table story.

### 2026-04-14 (S14)

- **Match-as-expression (§18.3)** — `const x = match expr { .A => v else => d }` now works end-to-end. Follows the same pattern as `if`/`for` as expressions.
- **`:>` match arm arrow** — codegen support complete. Both `=>` and `:>` are canonical; `->` retained as a legacy alias. `:>` avoids overloading JS arrow-function syntax and reads as "narrows to."
- **`</>` closer propagation** — the 2026-04-09 spec amendment (bare `/` → `</>`) was incompletely applied; the AST builder still accepted bare `/` as a tag closer. Now uniformly enforced across parser, codegen, and all 11 affected sample files.
- **Lift Approach C Phase 1** — `parseLiftTag` produces structured markup AST nodes directly during parsing. Previously 0% of real inline lift markup went through the structured path; now it's 100%. The fragile markup re-parse path is dead in production (retained only for legacy test fixtures pending Phase 3).
- **Phase 4d (ExprNode-first migration)** — all compiler consumers now read structured `ExprNode` fields first, with string-expression fields deprecated across 20+ AST interfaces. Expression handling is now AST-driven end-to-end.

---

## In Flight

- **Phase 3 — Legacy test fixture migration.** ~21 fixtures still use the old `{kind: "expr", expr: "..."}` shape. Rewriting them unlocks deletion of ~250–300 LOC of dead string-parsing fallback code in `emit-lift.js`.
- **Lin Approach B (discontinuous scoping).** Design complete, spec amendments drafted. Multi-session work to land an enriched `lin` model beyond Rust-style exact-once consumption.
- **SPEC sync.** Formalizing the `:>` match arm, match-as-expression, and Lift Approach C changes in `compiler/SPEC.md`.

---

## Queued

- **Phase 2 reactive effects** — two-level effect separation for `if`/`lift`. Design settled; will land when a concrete example drives the need.
- **SQL batching (compiler-level).** Two wins on the table:
  - *Per-request coalescing* — independent `?{}` queries in one server function get emitted together, one prepare/lock cycle instead of N.
  - *N+1 loop hoisting* — detect `for (let x of xs) { ?{...WHERE id=${x.id}}.get() }` and rewrite to a single `WHERE id IN (...)` fetched once before the loop. This is only tractable because the compiler owns both the query context and the loop context.
  - Cross-call DataLoader-style batching is parked until beta.
- **Remaining 14 test failures** — triaged, pre-existing, none block beta.
