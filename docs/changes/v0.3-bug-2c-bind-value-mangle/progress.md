# Bug 2c — bind:value=@x HTML serialization mangle in expanded component bodies

## Progress log (append-only)

### 2026-05-12 — Startup

- Verified worktree root: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af755e362a047a454`
- `bun install` + `bun run pretest` both pass.
- Read maps + briefings + primer §4/§13.7/§13/L17 + SPEC §5.4.1 bind-dispatch table.
- Pre-existing observation: worktree base is `7a00b1b` (S86 wrap). The Bug 2a if-chain fix (`547566a`) is NOT on this branch. main has it. To reproduce Bug 2c via 05-multi-step-form requires Bug 2a's expansion fix to be active. Approach: build a minimal repro that triggers component expansion via a DIRECT `<MyComp/>` call (no if-chain), which is unaffected by Bug 2a.

### 2026-05-12 — Bug isolated

- Built minimal repro `docs/changes/v0.3-bug-2c-bind-value-mangle/repro.scrml`: component
  body with `<input type="text" bind:value=@firstName/>`, instantiated with `<InfoStep/>`.
  Compiled HTML emits `<input type="text" bind value="firstName" />` — colon dropped,
  `@` dropped, value mangled to static string. Bug 2c reproduced.
- Built `repro-direct.scrml` for control: same `bind:value=@firstName` OUTSIDE any
  component body. Compiles cleanly to `<input ... data-scrml-bind-value="_scrml_bind_..."/>`.
  Confirms the bug is specific to the component-expansion path.
- Built `inspect.js` harness — dumps component-def `raw` and post-CE expanded markup.
  Findings:
  - `raw` field of `InfoStep` is the logic-tokenizer space-joined token stream:
    `< input type = "text" bind : value = @firstName / >`. Colon is a separate PUNCT
    token with surrounding whitespace.
  - After `normalizeTokenizedRaw`: `<input type="text" bind : value=@firstName/>`. Steps
    1, 1c, 5 collapse `<`-tag-name, `/>`-self-close, `=`-attribute-assign whitespace.
    Step 4 collapses hyphen-separator. Step 4b collapses `?:` optional marker. **No step
    collapses `:`-separator directive prefixes.**
  - The markup tokenizer's `tokenizeAttributes` (compiler/src/tokenizer.ts:248) reads
    ATTR_NAME via `[A-Za-z0-9_:\-@]` regex — consumes no whitespace. Sees `bind`,
    emits ATTR_NAME `bind` (boolean attr, no `=` follows). Skips `:` as unexpected
    char. Reads `value`, emits ATTR_NAME `value`. Reads `=`, then `@firstName` as
    ATTR_IDENT. Result: `bind` + `value=@firstName` as TWO attributes.
  - Post-CE AST confirms: `attrs = [{name:"bind", value:absent}, {name:"value",
    value:variable-ref @firstName}, ...]`. emit-html (line 1219, val.kind ===
    "variable-ref" branch) for non-`if`/`show` attrs strips the `@` and emits
    `value="firstName"` as a plain HTML attribute. The `bind` boolean attr is emitted
    as `bind`. Net: `bind value="firstName"`.

### 2026-05-12 — Fix applied + verified

- Fix at `compiler/src/component-expander.ts` — added Step 4c symmetric to Step 4 (hyphen):
  `s = s.replace(/(\w)\s+:\s+(\w)/g, "$1:$2");`
- Recompiled repro: HTML now emits `<input type="text" data-scrml-bind-value="_scrml_bind_bind_value_3"/>`.
  Identical to non-component path. Reactive wiring in client.js: `querySelector` +
  `addEventListener("input", ...)` + `_scrml_reactive_set("firstName", ...)` — all present.
- Test surface: 9124 → 9130 unit pass (+6 from new test file
  `compiler/tests/unit/bind-value-component-expansion.test.js`); 1414 integration pass; 313
  conformance pass; 0 fail across all three suites.
- Acceptance criteria: ALL MET.
  - #1 (HTML preserves bind:value semantics): ✓ — emits `data-scrml-bind-value` placeholder
    matching the non-expanded canonical form.
  - #2 (reactive write-on-input wiring works): ✓ — addEventListener("input") +
    _scrml_reactive_set wired in client.js.
  - #3 (+3 to +6 unit tests): ✓ — 6 new tests in
    `compiler/tests/unit/bind-value-component-expansion.test.js`.
  - #4 (regression guard): ✓ — 0 test failures across full unit + integration + conformance.
  - #5 (recompile 05-multi-step-form): ✓ — compiles. NOTE: components remain unexpanded
    in dist HTML on this branch because Bug 2a if-chain fix (`547566a`) is NOT on the
    worktree base (`7a00b1b`); on main where Bug 2a IS landed, the InfoStep/PreferencesStep/
    ConfirmStep would expand inline and the bind:value attrs would correctly emit
    `data-scrml-bind-value` placeholders post-Bug-2c-fix.
  - #6 (idiomatic-examples styling rule): N/A — no fixture file edited; only test sources
    written, which use V5-strict `<varname>` decl form per primer §4 Shape 1/2.

### Files touched

- `compiler/src/component-expander.ts` (+22 LOC, -0): added Step 4c colon-collapse with
  doc comment explaining safety profile and tokenizer interaction.
- `compiler/tests/unit/bind-value-component-expansion.test.js` (+228 LOC, NEW): 6 tests.
- `docs/changes/v0.3-bug-2c-bind-value-mangle/progress.md` (this file).
- `docs/changes/v0.3-bug-2c-bind-value-mangle/repro.scrml` (repro fixture).
- `docs/changes/v0.3-bug-2c-bind-value-mangle/repro-direct.scrml` (control fixture).
- `docs/changes/v0.3-bug-2c-bind-value-mangle/repro-props.scrml` (props-block check).
- `docs/changes/v0.3-bug-2c-bind-value-mangle/inspect.js` (diagnostic harness).

### Surfaced findings (none — fix is local)

- The fix is a 22-LOC addition with the same safety profile as the pre-existing Step 4
  (hyphen) and Step 5 (equals) collapses. No upstream tokenizer or downstream emitter
  changes required. The bug class is "tokenize-then-detokenize round-trip loses
  whitespace context" — same family as the Step 4 (hyphen) precedent.
- Walltime: well within 2-4h band.
