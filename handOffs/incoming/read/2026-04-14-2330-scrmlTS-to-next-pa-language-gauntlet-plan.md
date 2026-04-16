---
from: scrmlTS-S18
to: scrmlTS-S19
date: 2026-04-14
subject: Language gauntlet — full bug-hunt plan (every feature, every way)
needs: action
status: unread
---

# Language Gauntlet — Full Plan

## Why this is the next priority

S18 found 3 real compiler bugs with minimal poking (`export type X:enum`
misparse, reactive-for stray innerHTML clear, test fixture regressing on
E-MU-001). All three had been sitting in production unnoticed because the
existing test suite, while large, hasn't been designed as an exhaustive
feature × shape matrix. User went public between S16 and S18 — the bar is
now "first real user shouldn't hit a compiler bug."

The plan below is exhaustive because user explicitly asked:
> "its time for a bug hunt. lets do a big gauntlet testing every lang
>  feature, every way we can think of."

Don't trim this plan. Execute it in phases, commit per phase.

---

## Methodology

Three parallel tracks. Pick per feature category:

### Track A — Fixture-driven (compiler-centric)
For features where shape-correctness is testable without a browser: parse,
type-check, codegen. Build `.scrml` fixture files under
`samples/compilation-tests/gauntlet-s19-<category>/`. Each fixture is a
minimal program exercising ONE feature + ONE shape. Run `scrml compile`,
assert stdout/stderr + generated JS matches expected shape.

Good for: type-decl shapes, lin enforcement, protect rules, match
patterns, batch planner outputs, SQL parsing variants, diagnostics.

### Track B — Gauntlet-dev personas (end-to-end)
Per `pa.md` §PA + `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`,
dispatch `scrml-dev-pipeline` agents under personas (React-minded, Vue-minded,
TS-minded, Elixir-minded, etc.) to build small feature-targeted apps. Each
persona builds 2–3 small apps exercising a feature cluster. Overseer
(`gauntlet-overseer`) then recompiles the output to classify PASS/FAIL/
compiler-bug vs dev-error.

Good for: features most exposed to training-data ghost-pattern bias —
components, event wiring, match/enum, state machines, CSS scoping, error
handling, server/client split.

### Track C — Property-based probing (edge cases)
Scripted generation of borderline shapes: deeply-nested interpolations,
long identifier names, edge-case Unicode, whitespace variations, comment
placement, operator combinations. These are where ast-builder heuristics
(`collectExpr` line-boundary, `:` as lastPart, etc.) can miss.

Good for: ast-builder + tokenizer + block-splitter edge cases.

---

## Phase breakdown

Each phase is its own commit boundary. If a phase turns up >3 bugs, split
the fix commits out of the gauntlet commit.

### Phase 1 — Declarations + Scoping (Track A + C)

Feature surface:
- `const`, `let` (with and without init; type annotations)
- `fn` (pure function — verify all 5 prohibitions fire)
- `function` (general callable)
- `lin` (linear types — §35.2; declare/consume/double-consume/branch)
- `@reactive`, `@debounced`, `@throttled`
- `server @var` (initial load, optimistic write, sync stub)
- `type X:enum = {...}`, `type X:struct = {...}`, `type X:union`
- `type X = ...` (without kind — is that legal?)
- `import`, `export` (named, default, re-export, aliased, stdlib `scrml:`,
  vendor `vendor:`)
- `use`, `using`, `with`, `navigate`

Fixture shapes per feature (multiply every feature × every shape):
- bare form
- with `@` sigil
- inside `<program>`
- inside markup `<tag>` body
- inside `${}` logic block
- inside function body
- inside meta `^{}` block
- inside error arm `!{}`
- inside test block `~{}`
- after `export`
- after comment
- with multi-line body
- with chained ops (`.get()`, `.map()`, etc.)
- adjacent to another decl (ASI boundary stress)

For each → assert zero errors OR expected error code.

Known traps:
- `export type X:enum` (fixed S18, keep regression test)
- `:enum`, `:struct`, `:union` kinds — every kind × every annotation placement
- `const x:number = 5` vs `type x:number = 5` (type-annotation vs type-decl)
- `lin` as variable name (backwards-compat legal?) vs `lin` as keyword
- `fn` vs `function` differentiation (pure analyzer: E-FN-*)

### Phase 2 — Control flow (Track A)

Feature surface:
- `if`/`else`/`else if` chains (stmt form)
- `if` as expression (after `=`): `let x = if (cond) { lift val }`
- `if=` markup attribute
- `match` with `=>`, `:>`, `->` arrows (all three accepted as canonical)
- `partial match` (§18.18)
- `match` with guard clauses (if supported per spec)
- `for (x of xs)`, `for (let x of xs)`, `for (const x of xs)`
- C-style for `for (let i = 0; i < n; i++)`
- `while`/`do-while`
- `switch`/`case`/`default`/fallthrough
- `try`/`catch`/`finally`
- `fail` / `throw` / `return` / `break` / `continue`
- `when @var changes { ... }` — reactive effect
- `given (x) => { ... }` — presence guard (§42.2.3)
- `animationFrame` lifecycle

Shapes per feature:
- bare (no body)
- single-stmt body
- multi-stmt body
- nested (if-in-for-in-while, etc.)
- as logic child of markup
- as logic child of lift
- with early return/break
- with side-effectful body (SQL call, DOM mutation)
- with reactive writes in body (E-TYPE-* ?)

Known traps:
- `if (true) { x = 1 }` on write-only var → E-MU-001 (semantically correct; fixture caution)
- `match` with mixed arrows (`=>` and `:>` in same match)
- `for/lift` keyed vs non-keyed reconciliation (§6.5.3)
- ASI boundary between `match { ... }` and next statement
- `while ((x = 1))` vs `while (x = 1)` → W-ASSIGN-001

### Phase 3 — Operators & Expressions (Track A + C)

Feature surface:
- `is`, `is not`, `is some`, `is none` (§42)
- Parenthesized compound `is not`/`is some` (§42.2.4 — DQ-12 Phase A shipped; Phase B bare compound deferred)
- `==`, `!=` — E-EQ-004 rejects `===`/`!==`; E-EQ-002 rewrites `== not` → `is not`
- `not` as absence value (§42)
- Ternary `a ? b : c`
- Optional chaining `?.`
- Nullish coalescing `??`
- Standard arithmetic, comparison, logical
- String concat, template literals
- Array literals, object literals
- Spread `...`
- Arrow `() => expr` vs `() => { ... }`
- `:>` match arm narrowing
- Assignment chains (§50)
- Property access (dotted, computed)
- Method call (`.get()`, `.all()`, `.map()`, etc.)

Shapes:
- in attribute value (quoted, unquoted)
- in `${}` interpolation
- in SQL `?{}` placeholder
- in match arm condition
- in match arm body
- in `if` condition
- in `for` iterable
- as return value
- as function argument
- chained (deep dot access, method chains)

Known traps:
- `===` / `!==` — E-EQ-004 rewriter
- `== not` / `!= not` — E-EQ-002 rewriter
- Arrow `=>` ambiguity with match arm arrow (`=>` alias for `:>`)
- `is not` on parenthesized compound with `@var`
- Optional chaining on reactive var

### Phase 4 — Markup & Components (Track B primary, A secondary)

Feature surface:
- Plain tags: `<div>`, `<section>`, `<span>` (common), `<canvas>`,
  `<template>` (uncommon)
- Self-closer `</>` (replaces bare `/` per S4.4.2)
- Component definition: `const Card = <div>...`
- Component invocation: `< Card prop = value />`
- Slots: named + default
- Props: static, interpolated, event handlers, class objects, `bind:value`
- Void elements (`<img>`, `<input>`, `<br>`, etc.)
- Boolean attrs (`disabled`, `checked`, `readonly`)
- Class objects `class:active = @isSelected`
- Style objects
- `if=` attribute conditional
- `for=` attribute iteration (if supported)
- Lift `lift <tag>...</>` inline markup
- Lift value `lift expr` (non-markup)
- Nested lift (inner lift targets nearest ancestor per §10.6)
- Keyed reconciliation via `for/lift over @array`
- Dynamic attributes with reactive `@var`
- HTML entities, attribute special chars

Shapes:
- simple (single tag)
- nested (component trees)
- with interpolation in content
- with interpolation in attribute
- with handler (`onclick`, `oninput`, `onchange`, `onsubmit`)
- fragmented (attribute split across nodes — BPP stress)
- with comment inside
- with whitespace-only content
- after non-markup (logic → lift)
- after markup (markup → lift — §10.6)
- with void element containing content (should error or be ignored)

Known traps:
- BLOCK_REF splits in attribute values (fragmented lift body)
- `onclick` / `onchange` tokenization (attribute vs tilde-decl)
- `</>` self-closer at end of line vs mid-content
- Component name vs HTML tag disambiguation (capitalization)
- Void element + content combinations

### Phase 5 — Meta (`^{}`) & Reflection (Track A)

Feature surface:
- Compile-time meta (auto-classified: no `@var` reference)
- Runtime meta (auto-classified: references `@var`)
- `reflect(Type)` — type introspection
- `reflect(variableName)` — runtime type descriptor
- `emit(html)` — source emission into AST
- `compiler.register*` — macro registration
- Meta block placement: before markup, after markup, inside markup,
  inside function, inside component
- Meta blocks with destructuring params
- Meta blocks with rest params
- Meta blocks with default params
- Nested meta blocks
- `^{}` referencing other meta-defined types

Known traps:
- `^{}` referencing `@var` must reclassify as runtime
- `reflect()` decode table tree-shaking (runtime cost = 0 when no runtime meta)
- `emit()` newline handling (BUG-R15-005 regression)
- E-META-001 false-positives (destructuring/rest/defaults — fixed, keep regression)

### Phase 6 — SQL & Server/Client Split (Track A + B)

Feature surface:
- `?{SELECT ... FROM ... WHERE ...}.get()`
- `?{SELECT ... }.all()`
- `?{INSERT / UPDATE / DELETE}.run()`
- `?{}.get()` / `.all()` / `.run()` inside `for` loop (Tier 2 hoist)
- `?{}.nobatch()` opt-out (§8.9.5)
- `?{}` inside `!` handler (Tier 1 envelope)
- `?{}` with protected field in SELECT column list (E-PROTECT-003)
- `?{}` with `SELECT *` over protected table (expansion + overlap check)
- `server function server_fn() { ... }` — explicit server
- `server @var = fetch()` — server reactive (mount-hydration candidate)
- Multiple `server @var` on same page (F9.C coalescing via `__mountHydrate`)
- Explicit `transaction { ... }` blocks (suppress implicit envelope)
- Mixed: Tier 1 + Tier 2 + explicit transaction in same handler
- `?{}.nobatch()` siblings (E-BATCH-001 if with a batched query)
- N > 32766 hoist (E-BATCH-002 runtime guard)
- Post-rewrite E-LIFT-001 check (§8.10.7) — hoist sqlTemplate must not
  contain `lift(` after rewrite

Shapes per query:
- single expression
- chained (with `.where().limit()` etc.)
- parameterized (`?0`, `?1`, named)
- with quoted string containing `?`
- with multi-line formatting
- inside component props (should the component ship SQL? No — should error)
- inside meta block (should the meta eval the SQL? Probably not)

Known traps:
- `.get()` vs `.first()` (S16 canonicalized to `.get()`)
- Column list parsing for protected-field overlap
- `SELECT *` expansion correctness (should expand to all columns, check each)
- Composition: `.nobatch()` + batched siblings
- Tuple-WHERE inference (deferred in master-list log)

### Phase 7 — Error handling (`!{}`) & Testing (`~{}`) (Track A)

Feature surface:
- Typed error context `!TypeName { ... }`
- Error arm with pattern match `.Variant => ...`
- Error arm body (block, single expr)
- Error propagation inferred automatically
- `fail` keyword
- `throw` (JS interop) — is it still valid or discouraged?
- `try`/`catch`/`finally` interaction with `!{}`
- Inline tests `~{}` — stripped from production
- Test assertions (if any built-in) vs freeform expressions
- Test names, describe groups
- Tests inside functions (should strip), tests inside components

Known traps:
- E-META-001 false-positives near error arms (fixed, keep regression)
- Error arm block handler brace stripping (Phase 4b fix)
- Test blocks in server functions (should still strip for production)

### Phase 8 — Styles & CSS (`#{}`) (Track A + B)

Feature surface:
- Scoped CSS via native `@scope` (Approach B shipped S2)
- `#{}` block placement
- Flat `#{...}` declaration → inline style (donut scope)
- Tailwind utility classes
- Tailwind engine usage (embedded registry, scans HTML, emits only used CSS)
- Mixing `#{}` and Tailwind in same component
- CSS custom properties
- `@media`, `@supports` inside `#{}`
- Nested selectors inside `#{}`

Known traps:
- `data-scrml` attribute emission
- Donut scope semantics
- Unused Tailwind class purging

### Phase 9 — Runtime type validation & Encoded names (§47, §53) (Track A)

Feature surface:
- Validation zones (3-zone classification)
- 7 named shapes: email, url, uuid, phone, date, time, color
- Predicate → HTML attrs (Free HTML Validation)
- Boundary check semantics (E-CONTRACT-001-RT)
- `encoding: true` (opt-in) vs default off
- `_s7km3f2x00` encoded name shape
- Debug build `$originalName` append
- Production build rejects `$originalName` as hard error
- `reflect()` decode table tree-shaking

Known traps:
- Client schema excludes protected fields by construction
- Encoding on reactive vs non-reactive
- Debug vs prod build toggle

### Phase 10 — Channels (`<channel>`) & WebSockets (Track B)

Feature surface:
- `<channel name="X">` declaration
- `broadcast`, `disconnect` built-ins
- `when @channelEvent changes { ... }` subscription
- Server-push flow
- Multiple channels in one app

Known traps:
- DQ-11 fix landed S2 — regression test for the 6 CLI bugs
- Channel runtime wiring

### Phase 11 — Full-stack integration apps (Track B)

End-to-end mini apps — each exercises a cluster:
- Blog (markup + components + SQL + server @var)
- Counter with history (reactive + machine + meta reflection)
- Multi-step form (components + validation + protect fields)
- Real-time chat (channel + SQL + server/client split)
- Gallery (keyed reconcile + lift + server @var + Tier 2 batching)

Overseer-classified. Compare compile → puppeteer → interact → expected state.

### Phase 12 — Error messages UX pass (Track A + C)

This is its own phase because "compiler is functional" includes "errors
guide the user." Run every known error code at least once; assert the
message:
- Names the offending construct
- Points to the span (line, col correct)
- Suggests a fix when possible

Error codes to exercise (non-exhaustive):
- E-SYNTAX-*
- E-TYPE-*
- E-LIN-001/002/003
- E-PROTECT-001/002/003
- E-LIFT-001
- E-BATCH-001/002
- E-MU-001
- E-DG-001/002
- W-ASSIGN-001
- D-BATCH-001
- W-BATCH-001
- W-LINT-*
- E-EQ-002/004
- E-COMPONENT-*
- E-SCOPE-001
- E-META-001
- E-TYPE-041/043/081
- E-ROUTE-001
- E-CONTRACT-001-RT
- E-IO-* (if any)

---

## Agent staging — FULL LIST (31 agents from ~/.claude/agentStore/)

Stage via master PA (per pa.md agent-staging protocol). User may want to
stage in waves (phases 1–3 first) rather than all 31 at once to keep
`.claude/agents/` manageable during dispatch.

### Testers (12)
- `scrml-ast-correctness-tester.md`
- `scrml-pipeline-correctness-tester.md`
- `scrml-language-conformance-tester.md`
- `scrml-end-to-end-compiler-tester.md`
- `scrml-linear-type-tester.md`
- `scrml-exhaustiveness-tester.md`
- `scrml-type-system-tester.md`
- `scrml-html-output-tester.md`
- `scrml-js-output-tester.md`
- `scrml-css-output-tester.md`
- `scrml-server-boundary-tester.md`
- `scrml-macro-system-tester.md`

### Engineers (11)
- `scrml-developer.md`
- `scrml-token-and-ast-engineer.md`
- `scrml-block-split-parser-engineer.md`
- `scrml-type-system-engineer.md`
- `scrml-linear-type-specialist.md`
- `scrml-exhaustiveness-checker-engineer.md`
- `scrml-state-inference-engineer.md`
- `scrml-html-codegen-engineer.md`
- `scrml-css-compilation-engineer.md`
- `scrml-compiler-diagnostics-engineer.md`
- `scrml-macro-system-engineer.md`

### Reviewers (8)
- `scrml-parser-architecture-reviewer.md`
- `scrml-diagnostics-quality-reviewer.md`
- `scrml-type-system-reviewer.md`
- `scrml-html-codegen-reviewer.md`
- `scrml-js-codegen-reviewer.md`
- `scrml-css-compilation-reviewer.md`
- `scrml-macro-system-reviewer.md`
- `scrml-integration-pipeline-reviewer.md`

### Coordination (1 — optional)
- `scrml-project-manager.md` (if user wants a coordination layer)

### Already primary / staged in scrmlTS (do NOT copy)
- `scrml-js-codegen-engineer.md` (primary — verify in `.claude/agents/`)
- `gauntlet-overseer.md` (primary — verify)
- `debate-curator.md` (staged S16)
- `debate-judge.md` (staged S16)
- `scrml-language-design-reviewer.md` (staged S16)
- `scrml-server-boundary-analyst.md` (staged S16)

### Wave-staging recommendation
- **Wave 1 (Phases 1–3 — decls/control-flow/operators):** developer,
  ast-correctness-tester, pipeline-correctness-tester, token-and-ast-engineer,
  block-split-parser-engineer, type-system-tester/engineer/reviewer,
  linear-type-tester/specialist, exhaustiveness-tester/checker-engineer,
  language-conformance-tester, parser-architecture-reviewer,
  compiler-diagnostics-engineer, diagnostics-quality-reviewer (~15 agents)
- **Wave 2 (Phases 4, 6 — markup + SQL):** html-codegen-engineer/reviewer/tester,
  js-output-tester, server-boundary-tester (scrmlTS already has analyst),
  end-to-end-compiler-tester (~6 agents)
- **Wave 3 (Phases 5, 7, 8 — meta, error, styles):** macro-system-*
  (tester/engineer/reviewer), css-compilation-*, integration-pipeline-reviewer
  (~7 agents)
- **Wave 4 (Phases 9–12):** state-inference-engineer (if state machine bugs),
  project-manager (optional) (~1–2 agents)

Confirm `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` is
referenced in every dev dispatch (ghost-pattern mitigation — required per
pa.md §PA).

---

## Outputs

For each phase, produce:

1. **Fixture corpus**
   - `samples/compilation-tests/gauntlet-s19-<phase>/*.scrml`
   - `.expected.json` (expected errors, warnings, codegen shape)
2. **Bug list**
   - `docs/changes/gauntlet-s19/bugs.md` — per-bug: title, repro, root cause,
     fix, commit hash
3. **Non-regression tests** — migrate repro fixtures into
   `compiler/tests/unit/gauntlet-s19/`
4. **Error-message audit** — `docs/changes/gauntlet-s19/error-messages.md`
   for Phase 12

---

## Deliverables at end of gauntlet

- All 12 phases executed (may take multiple sessions)
- Bug list published, each bug → fix commit
- Fixture corpus in samples/
- Regression tests under `compiler/tests/unit/gauntlet-s19/`
- README "Why scrml" section gets a line: "Every language feature covered
  by N fixtures across 12 shape axes"
- Master-list master-list.md §A test count updated
- `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` updated if new
  ghost patterns emerge

---

## Execution order recommendation

The phases are independent but some cross-cutting bugs will surface
better if earlier phases are done first:

Priority order:
1. Phase 1 (declarations) — blocks everything else
2. Phase 3 (operators) — blocks Phase 4+
3. Phase 2 (control flow)
4. Phase 4 (markup) — most ghost-pattern exposure; dev-persona track
5. Phase 6 (SQL) — high user-impact, recently shipped
6. Phase 5 (meta)
7. Phase 7 (error/test)
8. Phase 8 (styles)
9. Phase 9 (validation/encoding)
10. Phase 10 (channels)
11. Phase 12 (error UX) — can be interleaved; each bug fix should check error
12. Phase 11 (integration apps) — after 1–10 stable

---

## Starting hand-off from S18

S18 final state:
- 4 commits on main (S18): README polish (d20ffa4), lift cleanup (f5d78df),
  housekeeping (a55ac8e), 3 bug fixes (b123ed1)
- 6,228 pass / 8 skip / 2 fail — best baseline since split
- 8 skipped happy-dom TodoMVC tests documented as harness-only (Puppeteer covers)
- 2 remaining fails: self-host tests (deferred per user S18)
- 1 commit unpushed (b123ed1 at session wrap — check whether master pushed)

Known bugs fixed this session (regression tests exist):
- `export type X:enum = {...}` — collectExpr :/IDENT/= boundary (ast-builder.js)
- Reactive-for stray innerHTML clear — emit-reactive-wiring.ts
- if-as-expr test fixture E-MU-001 correctness (test-only change)

S18 session-start rotation created handOffs/hand-off-17.md with addendum
reconstructing S17's power-outage-interrupted work from git log.

---

## Tags

#session-19 #gauntlet #bug-hunt #language-coverage #post-public
