# Bug 16 — `import` at v0.3 `<program>`-body top level

## Investigation findings

### Root cause (16a)

`compiler/src/ast-builder.js:327` defines `BARE_DECL_RE`:

```js
const BARE_DECL_RE = /^\s*(?:export\s+)?(server\s+(?:fn|function)\s|type\s+\w|fn\s+\w|function\s+\w|let\s+[A-Za-z_]|const\s+[A-Za-z_])/;
```

It admits `type`, `fn`, `function`, `server fn`, `server function`, `let`, `const`.
It does NOT admit `import`. Under v0.3 default-logic mode (§40.8), `<program>`
body's `liftBareDeclarations` walker (ast-builder.js:718) wraps text blocks
starting with a recognised decl keyword in a synthetic `${ ... }` block so
parseLogicBody can parse them. Bare top-level `import` fails this match.

The cascade is amplified because the block-splitter merges adjacent text
fragments into a single text block. The repro's text block contains BOTH

    import { sortBy } from 'scrml:data'
    type DragPhase:enum = { Idle, Dragging }

— the leading `import` doesn't match BARE_DECL_RE, so the ENTIRE text node
stays as a `text` AST node. `type DragPhase` never reaches the type-decl
parser, so the engine `for=DragPhase` reference fails (E-ENGINE-004).
Variant-ambiguity follow-ons (`.Idle`, `.Dragging`) appear in older heads
because the engine arms lose their match context; current HEAD (post-Bug-18)
short-circuits at E-ENGINE-004 and stops.

### Decision

**Fix 16a.** Admit `import` to `BARE_DECL_RE`. This is a clean structural
fix:
- parseLogicBody already has a complete `import` handler at line 6117
  (kind `import-decl`, full spec compliance including `pinned`, `as`, default).
- The lift wrapping `${ import { x } from 'y' }` is syntactically and
  semantically valid per SPEC §21.3.
- The W-PROGRAM-REDUNDANT-LOGIC lint message's promise about "bare top-level
  declarations auto-lift" becomes truthful for imports.
- The cascade dissolves because the WHOLE merged text becomes a logic body;
  subsequent `type DragPhase` declarations parse correctly.

**Lint message stays unchanged.** After the fix, the message correctly
describes reality.

**`use` is NOT added.** Per SPEC §40.2 `use` lives at file top level OUTSIDE
any `${}`. There is an explicit E-USE-001 rule that fires if `use` appears
inside `${}`. Adding `use` to BARE_DECL_RE would lift it into `${}` and
trigger E-USE-001 against the lift's own output. `use` has its own non-lift
path through gauntlet-phase1-checks.js (Check 1) — not part of this bug.

### 16b — diagnostic clarity

Once 16a lands, the structural cascade is eliminated for the canonical case
(bare `import` at `<program>` body top level). For belt-and-suspenders, I'll
add an explicit fall-through check in gauntlet-phase1-checks.js: if a text
block AT `<program>` / `<page>` / file-root body level begins with literal
`import` keyword AND survives TAB's lift (meaning the regex match was
suppressed by some condition), fire a single clean E-IMPORT-001 variant
pointing at the import site. This protects against future regressions where
the regex doesn't cover an edge case.

## Implementation plan

1. Edit `compiler/src/ast-builder.js:327` BARE_DECL_RE — add `import\s+[\{\w*"']` alternation.
2. Verify the existing W-PROGRAM-REDUNDANT-LOGIC walker (DECL_KINDS at
   line 10898) already includes `import-decl` — no change needed there.
3. Add regression tests under `compiler/tests/integration/`.
4. Run pre-commit gate.

## Per-step changes

### Step 1 — admit `import` to BARE_DECL_RE (commit `0ae0197`)

`compiler/src/ast-builder.js:327` — extended regex with `|import\s+[{a-zA-Z_*"']`
alternation. Comment block updated to explain the why (BS-merged sibling text
fragments + leading-content-gates).

The repro from the brief now compiles cleanly. E-ENGINE-004 cascade gone.
Original cli compile output (post-fix):

    info [W-PROGRAM-SPA-INFERRED]: ...
    Compiled 1 file in 44.3ms

(W-LINT-007 false-positive on `enum = { ... }` is pre-existing and orthogonal
— see DEFERRED below.)

### Step 2 — regression tests (commit `d1633a1`)

`compiler/tests/integration/bug-16-bare-import-autolift.test.js` — 9 cases:

1. Bare `import { x } from 'src'` inside <program> produces import-decl
2. Default import `import name from 'src'` sets isDefault:true
3. BS-merged `import` + `type` text — original cascade trigger; both decls
   reach the AST
4. Bare `import` inside <page> body (symmetric with <program>)
5. End-to-end: full Bug 16 brief reproducer compiles without E-ENGINE-004 /
   E-TYPE-025 / E-VARIANT-AMBIGUOUS cascade
6. Back-compat: explicit `${ import ... }` still produces import-decl
7. Back-compat: explicit `${ import ... }` fires W-PROGRAM-REDUNDANT-LOGIC
8. Negative: `import` keyword in markup prose (`<p>import ...</>`) NOT lifted
9. Negative: `imports` (plural) identifier NOT lifted

All 9 pass. Full pre-commit gate: 12063 / 0 fail (+9 from 12054 baseline).

## 16b — diagnostic clarity outcome

The brief's 16b clause framed the diagnostic-cascade fix as "REGARDLESS of
whether 16a is fixed". On investigation post-16a fix, the cascade precondition
("parser's response to an unhandled top-level construct") no longer applies
for the canonical case — `import` IS handled by the auto-lift after 16a.

Remaining `import`-in-unsupported-position scenarios:
  - Inside function body → E-IMPORT-003 fires (pre-existing, unchanged).
  - Inside markup prose (`<div>import x from 'y'</>`) → suppressed by design;
    parentType==="markup" gates the lift. This is content, not a misplaced
    import. No diagnostic.
  - Bare npm-style specifier → E-IMPORT-005 fires (pre-existing).

I did NOT add a defense-in-depth "residual unlifted import" check because:
- 16a closes the only known root-cause path for the cascade.
- A defense-in-depth check would be permanently dead code (or, if it fires,
  signals a lift-logic regression which is an internal-error class).
- The brief's 16b requirement (clean root-cause diagnostic) is satisfied by
  16a itself — the diagnostic that now fires in the legitimate failure cases
  (E-IMPORT-003, E-IMPORT-005) is already clean and single-cause.

If PA wants the defensive check anyway, it would live in `gauntlet-phase1-
checks.js` walking AST text nodes inside <program>/<page>/<channel> for
leading `\s*import\b` content. Cost: ~20 lines + 1 fixture-based test.
Surface as deferred for PA decision.

## W-PROGRAM-REDUNDANT-LOGIC lint message

NO amendment required. The message accurately describes reality post-fix:
"bare top-level declarations auto-lift to the logic context without explicit
`${...}` wrapping" — `import` is now included in that catalog.

## Tests after

  Pre-commit gate baseline (pre-fix):  12054 pass / 88 skip / 1 todo / 0 fail
  Pre-commit gate after (post-fix):    12063 pass / 88 skip / 1 todo / 0 fail
  Delta: +9 new passing tests (Bug 16 regression suite). Zero new failures.

## DEFERRED items

- **W-LINT-007 false positive on enum literals.** The ghost-pattern lint
  (`lint-ghost-patterns.js:333`) regex `\b(?!value\b)(\w+)\s*=\s*\{` fires
  on `type Foo:enum = { A, B }` because `buildLogicRanges` only knows about
  literal `${ }` ranges; v0.3 default-logic mode is not modeled. This
  predates Bug 16 (visible even in the `${ import }` control case) and is
  orthogonal to the import lift.

- **Defensive "residual unlifted import" gauntlet check.** Not implemented;
  surfaced for PA decision (see "16b — diagnostic clarity outcome" above).
