# scrmlTS — Session 25 Hand-Off

**Date opens:** TBD (whenever S25 starts)
**Previous:** `handOffs/hand-off-24.md`
**Baseline at S24 start:** **6,889 pass / 10 skip / 2 fail** (25,548 expects across 278 files) at commit `e0455b6`.

---

## 0. Cold-start state

(To be populated during S24.)

---

## 1. S24 session summary

### S24 landed: `< machine>` cohesion — ratified, migration deferred

**Final verdict (radical-doubt debate, 2026-04-17):** HYBRID outcome.
See `scrml-support/design-insights.md` line 498+ for the full insight.

- **Decision A (opener):** PROCEED — migrate to `< machine name=X for=Y>` attribute
  form (§5.1 bareword-ident values, not strings). Matches all six other state openers.
- **Decision B (guard keyword):** FLIP — **keep `given`**. Do NOT migrate to `if`.
  Buried reason: scrml's 2026-04-08 machine/contract-unification insight already
  committed to static-analyzable guards as distinct from runtime `if`. Merging would
  collapse the `E-MACHINE-*` static-analysis lane into the runtime-`if` vocabulary.
- **`[label]` suffix:** HOLD — unchanged.
- **Execution:** DEFER — run the parser + fixture + test migration when the next §51
  feature amendment (e.g., §51.9 audit clause, temporal transitions) cuts the parser
  open anyway. Single coordinated commit. §2c match-narrowing keeps S24 priority.

### S24 spec edits (landed this session, not yet committed)

- **`compiler/SPEC.md` §4.11.4** — NEW subsection ratifying `given` as the
  static-predicate keyword, semantically distinct from runtime `if`. Includes
  E-SYNTAX-004 for using `if` in machine rule guard position. Documents the
  compile-time-analysis commitment for future machine-level static analysis.
- **`compiler/SPEC.md` §51.3.2** — NEW "Amendment queued" paragraph documenting the
  opener-migration decision. Parser behavior unchanged until migration executes.

### Deferred migration — full scope (for next amendment window)

**Parser:** `compiler/src/ast-builder.js` (4 references to the sentence form).

**Source `.scrml` fixtures (11 openers across 6 files):**
- `examples/14-mario-state-machine.scrml` (2)
- `docs/tutorial-snippets/02j-machine.scrml` (1), `02l-derived-machine.scrml` (2)
- `samples/compilation-tests/machine-basic.scrml` (1)
- `samples/compilation-tests/machine-002-traffic-light.scrml` (1)
- `samples/rust-dev-debate-dashboard.scrml` (4)

**Inline test fixtures (51 openers across 5 test files):**
- `compiler/tests/unit/machine-declarations.test.js` (11)
- `compiler/tests/unit/bs-machine-program.test.js` (17)
- `compiler/tests/unit/machine-parsing.test.js` (7)
- `compiler/tests/unit/gauntlet-s22/derived-machines.test.js` (8)
- `compiler/tests/unit/gauntlet-s20/machine-or-alternation.test.js` (8)

**Docs:** `compiler/SPEC.md` (~55 `< machine` occurrences in §51 block + §6.1.1),
`docs/tutorial.md` (9), `docs/tutorial-snippets/*`, `docs/changelog.md`,
`docs/SEO-LAUNCH.md`, `README.md`, `DESIGN.md`, `compiler/src/codegen/README.md`.

**Migration recipe when it executes:**
1. Parser: swap positional-ident consumer in `ast-builder.js` for the standard
   attribute tokenizer. Require `name=` and `for=` attributes; reject quoted-string
   values on either.
2. Mechanical rewrite across all 62+ opener sites: `< machine Foo for Bar>` →
   `< machine name=Foo for=Bar>`. Include the `derived from @var` variant for §51.9
   derived machines (`< machine Name for Type derived from @var>` →
   `< machine name=Name for=Type derived=@var>` or retain `derived from @var` as a
   post-attribute clause — decision pending).
3. Rule bodies untouched. `given` untouched. `[label]` untouched.
4. Run full suite + S23-style compile audit. Single commit.

### In progress: nothing (debate paused execution)

### Load-bearing roadmap question (already recorded, user decision captured)

**Does scrml commit to machine-level static analysis?** YES — confirmed by user
2026-04-17 ("keep given"). Preserves reachability, unsatisfiability, totality-with-
guards, and transition-safety analysis as future work. This commitment is now
encoded in SPEC §4.11.4.

**Problem.** The `< machine>` opener landed in a **sentence-structure form** —
`< machine CannonMachine for CannonState>` — which diverges from every other
state opener in scrml. All other state types use attribute syntax
(`< db src="..." tables="...">`). The divergence breaks two invariants:

1. **Multi-line auto-format.** Attribute syntax wraps cleanly because each
   value is labeled. The sentence form has unlabeled positional slots (first
   ident = name, `for TypeName` = prepositional phrase); split across lines
   it loses grammar cues.
2. **Language cohesion.** Each PA session was evaluating the machine opener
   in isolation and reaching for a bespoke shape. The user (S24 2026-04-17)
   flagged this explicitly: "each pa is working with a very limited idea of
   this language. it has to be cohesive." Feedback memory saved at
   `~/.claude/projects/-home-bryan-scrmlMaster-scrmlTS/memory/feedback_language_cohesion.md`.

**Resolution chosen.** Migrate the opener to **attribute syntax using existing
§5.1 grammar**, bareword identifiers (NOT strings):

```scrml
< machine name=CannonMachine for=CannonState>
    .Idle        => .Charging(level: l) given (l >= 0)
    .Charging(n) => .Firing(shot: s)    given (n >= 50)
    .Firing(s)   => .Reloading(reason: r) { log("fired " + s.id) }
</>
```

- `name=` — declaration-site, bareword ident (matches `type Foo`, `function bar`, `@x`)
- `for=` — type reference, bareword ident (matches `@x: Type`, `as Type`, `use { X }`)
- Strings are strings are strings — type references are NEVER stringified.
  Rejected form: `name="CannonMachine" for="CannonState"`.

**Rule body stays unchanged.** Transitions are rules, not state — the
purpose-built DSL (`.From => .To given (...) { effect }`) is justified for
that body and the user confirmed: "transitions arent state, therfore what I
am talking about dosnt apply in the rules."

### Plan

**Phase A — Spec.**
- [ ] SPEC §51.3.2 grammar: change `machine-decl ::= '< machine' MachineName 'for' TypeName '>'`
      to `'< machine' attribute-list '>'` where `name=` and `for=` are required
      attributes with bareword-identifier values.
- [ ] SPEC §51.3.2 normative statements: add `name=` and `for=` attribute rules,
      specify both MUST be unquoted identifiers (error if quoted-string form used —
      new error code, probably E-MACHINE-018 or next free slot).
- [ ] SPEC §51.3.2 worked examples + amendment note 2026-04-17.
- [ ] All other §51 example blocks rewritten to the new opener form.
- [ ] §6.1.1 (Machine-Bound Declaration) examples.

**Phase B — Parser.**
- [ ] Find the function in `compiler/src/type-system.ts` that parses
      `< machine Name for Type>` (grep `parseMachineRules` / machine-decl handling).
- [ ] Replace the positional-identifier parser with the standard attribute
      tokenizer (same path `< db>` etc. use). Require both `name=` and `for=`
      attributes; unknown attributes on `< machine>` fire a clean error.
- [ ] Reject quoted-string values on `name=` / `for=` with a targeted error
      ("machine name and governed type must be bareword identifiers, not strings").
- [ ] Verify the block splitter already treats `machine` as a state type (§4).
      Should be no change there — the `< machine>` prefix is already recognized.

**Phase C — Fixtures + examples + tests (migration).**
Need to grep every site for the old shape and rewrite:
- [ ] `examples/14-mario-state-machine.scrml`
- [ ] `samples/compilation-tests/machine-*.scrml` (count TBD — run grep)
- [ ] `samples/compilation-tests/gauntlet-s22/**/*.scrml`
- [ ] `compiler/tests/unit/gauntlet-s22/*.test.js` — fixtures inline in test files
- [ ] Tutorial §2.10 snippets 02j/02k/02l in `examples/tutorial/`
- [ ] Any `stdlib/` or `self-host/` uses of `< machine>` (likely none, but grep)

**Phase D — Audit + verification.**
- [ ] Run the full test suite: `bun test compiler/tests/` — baseline 6,889 pass.
- [ ] Re-run the S23 compile audit across `samples/` + `examples/` (~796 files)
      to confirm no regressions outside intentional-error fixtures.
- [ ] Confirm Mario still compiles zero-warning with the new shape.

**Phase E — Commit plan.**
One commit for the whole migration (spec + parser + fixtures + tests) —
they all have to land together to keep the test suite green. Message form:
`feat(§51.3.2): migrate machine opener to attribute syntax (cohesion fix)`.

### Out of scope for this fix

- The machine **rule body** stays as-is. Not touching `=>`, `given`, `|`,
  effect blocks, or payload bindings.
- Does NOT introduce new machine features (no initial-state clause, no
  parent-machine, no final set). Those would use the same attribute shape
  if/when added.

---

## 2. Queued for S25

(Carried from S24 brief §2 — updated as S24 lands items.)

---

## Tags
#session-25 #open
