# Scope C — Findings Tracker (bugs, anomalies, spec gaps)

**Opened:** 2026-04-25 (S42)
**Purpose:** Single source of truth for everything the Scope C docs audit surfaced as a real issue (compiler bug, spec gap, scaffold-only feature, documentation drift). Each entry has a stable ID for cross-reference + a status field. When an entry becomes a real intake, point at the intake from here.

**How this differs from `docs/pinned-discussions/`:** pinned-discussions are decisions the user has parked for later conversation. This tracker is for raw findings that need to land somewhere (intake / spec PR / docs update / accepted as-is) — not opinion, not decision-needed, just "we noticed this is broken or missing."

---

## Status legend

- **not-filed** — surfaced here, no intake/PR opened yet
- **intake-filed** — `docs/changes/<id>/intake.md` exists, work scheduled
- **in-flight** — being worked on
- **fixed** — landed, tests added, closed
- **wontfix** — deliberately deferred

---

## §A. Compiler bugs

Real compiler defects: input is valid scrml, output is wrong (false-positive lint, phantom error, missing analysis).

### Tier summary + recommended intake order

| ID | Title | Tier | Files touched | Why this order |
|---|---|---|---|---|
| A2 | W-LINT-007 misfires on comment text | T1 | `lint-ghost-patterns.js` | Smallest fix. Adds `buildCommentRanges` helper. Same family as A1 — landing A2 first sets up the comment-range infrastructure that A1 also benefits from. |
| A1 | W-LINT-013 misfires on `@reactive` reads | T1 | `lint-ghost-patterns.js` | Two-line regex tweak (`=(?!=)` lookahead) + reuse A2's comment-range exclusion + extend logic-range to cover `~{}` and `if=()`. Cleans up examples 10 + 14 + 4 samples. |
| A3 | match-arm component refs not expanded | T2 | `component-expander.ts` (+ AST verification) | Fixes the documented "render component per state" pattern. Higher impact than A1/A2 but needs more care because the AST shape for match arms isn't immediately obvious from the file (need to read `types/ast.ts` first). |
| A4 | `lin` template-literal interpolation skipped | T2 | `type-system.ts` | Localized to the lin tracker. Less common code path — affects only `lin` users. Lower priority than A3 but still real. |
| A5 | `function`/`fn` in markup text auto-promoted to logic | **T1** (post-deep-dive) | `ast-builder.js:235-260` | After S42 deep-dive: bug located in `liftBareDeclarations` recursing into markup children. ~5-line fix: stop recursing into `markup` blocks (only state). Reclassified from T2/T3. **Severity escalated to HIGH** — silent text corruption mode discovered (short-form lifted text compiles clean but loses prose from output). Move ahead of A3/A4 in priority. |

**Recommended order (all original §A items now FIXED; remaining are post-A3-trace follow-ups):**
1. ~~A5~~ ✅ **FIXED** (commit `284c21d` 2026-04-25)
2. ~~A2 + A1~~ ✅ **FIXED** (commit `9a07d07` 2026-04-25)
3. ~~A6~~ ✅ **FIXED** (commit `9ca9c3f` 2026-04-25)
4. ~~A3~~ ✅ **FIXED** (commit `bcd4557` 2026-04-25)
5. ~~A4~~ ✅ **FIXED** (commit `330fd28` 2026-04-25)
6. **A7** — `${@reactive}` BLOCK_REF interpolation in component def (T2, surfaced by A3's bonus-signal trace). Same family as A3.
7. **A8** — `<select><option>` children in component def (T2, surfaced by A3's bonus-signal trace). Same family.

**Status as of S42 (2026-04-25):**
- **6 fixed** (A1, A2, A3, A4, A5, A6)
- 2 newly-surfaced not-yet-filed (A7, A8 — post-A3 trace findings, both T2 same parser family)
- Test suite: **7906 pass / 40 skip / 0 fail / 378 files**
- All 22 examples compile; ex 10 / ex 14 lints 0; ex 18 W-AUTH-001 (scaffold C2). ex 19 can revert workaround post-A4. ex 05 InfoStep can revert post-A3 (PreferencesStep + ConfirmStep blocked on A7/A8).
- Sample-corpus failure count: 23 / 275 (down from 24 via A5; possibly more drops post-A3 — needs re-classify)



### A1. `W-LINT-013` misfires on `@reactive` reads
- **Status:** **FIXED** — landed on main at commit `9a07d07` (2026-04-25, S42). Combined with A2 in single pipeline run. `(?!=)` lookahead added to W-LINT-013 regex; comment-range exclusion via A2's `buildCommentRanges`. Ex 14 misfire on line 144 resolved (2 lints → 0). Ex 10 partially fixed (14 → 8); the 8 remaining are a separate misfire class — see **A6**.
- **Severity:** medium (noisy, doesn't block compiles, but pollutes diagnostics)
- **Tier:** **T1** (single-file, two changes)
- **Surfaced in:** Stage 1 audit §4 Issue A (`docs/audits/scope-c-stage-1-2026-04-25.md`)
- **What:** The lint claims "Found `@click="handler" (Vue event shorthand)' — scrml uses `onclick=handler()`" — but fires on legitimate `@reactive` reads in:
  - `~{}` test sigil bodies (`assert @count == 0`)
  - `if=()` attribute expressions (`if=(@healthMachine == HealthRisk.AtRisk)`)
- **Examples affected:** ex 10 (14 misfires), ex 14 (1 misfire)
- **Sample audit reach:** also fires on 4 top-level samples (`docs/audits/scope-c-stage-1-sample-classification.md`)
- **Source location:** `compiler/src/lint-ghost-patterns.js:316`
  ```js
  regex: /\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=/g
  ```
- **Root cause:** two compounding issues:
  1. The trailing `\s*=` matches the FIRST `=` of `==` (no negative lookahead). So `@count == 0` matches because the regex captures `\s@count <space>=` (the first `=` of `==`).
  2. The `skipIf` excludes `${}` logic ranges only — `~{}` test sigil ranges and `if=()` attribute-expression positions are NOT excluded.
- **Fix sketch:** change regex to `\s@[a-z][a-zA-Z0-9]*(?:\.[a-z]+)*\s*=(?!=)/g` (negative lookahead) AND extend `buildLogicRanges` (or add a parallel `buildTildeBlockRanges` + attribute-expression detection) to cover `~{}` and `if=(...)` positions.
- **Repro (minimal):** any `${assert @x == 0}` or `<div if=(@x == 0)/>` in a compilable file.

### A2. `W-LINT-007` misfires on comment text
- **Status:** **FIXED** — landed on main at commit `9a07d07` (2026-04-25, S42). Combined with A1 in single pipeline run. Added `buildCommentRanges` helper (line/block comments), threaded 4th arg through skipIf signature, updated W-LINT-007 (and W-LINT-013) skipIfs to skip comment regions. Ex 14 line-5 misfire resolved.
- **Severity:** low (one-line annoyance)
- **Tier:** **T1** (single-file, add comment-range exclusion)
- **Surfaced in:** Stage 1 audit §4 Issue B
- **What:** Lint scans comment regions and flags text patterns like `<Comp prop={val}>` even though they're inside `// comment` lines, which per §27 are universal.
- **Examples affected:** ex 14 line 5 (header comment mentions JSX-style attr brace as Vue example).
- **Source location:** `compiler/src/lint-ghost-patterns.js:244` (W-LINT-007 entry; same family as A1).
- **Root cause:** `lint-ghost-patterns.js` builds `logicRanges` (`buildLogicRanges` at line 93) and `cssRanges` for some patterns, but has no `commentRanges`. The lint scans entire source string including `//` line comments and `/* ... */` blocks.
- **Fix sketch:** add `buildCommentRanges(source)` that scans for `//` (line comments) and `/* */` (block comments). Add `commentRanges` to the `skipIf` callback signature. Update relevant lint entries (W-LINT-007, W-LINT-013, others that scan markup text) to also skip when offset is inside a comment range.
- **Repro (minimal):** any `// ... <Comp prop={x}> ...` comment line in a compilable file.

### A3. Component-def with `<wrapper>{text}+<element with onclick=fn()>` shape fails to register
- **Status:** **FIXED** — landed on main at commit `bcd4557` (2026-04-25, S42). Trace proved BOTH prior hypotheses wrong (the original walker-gap and the intake's raw-normalization-regex one). **Real bug** was in `ast-builder.js` `collectExpr`'s angle-bracket tracker using delimiter-nesting (`>` decrements). After consuming `<div>`'s `>`, angleDepth dropped to 0; the next `<` was gated by Bug-3 prevEndsValue guard; with angleDepth==0, `onclick =` then tripped the IDENT-`=` statement-boundary check at line 1203-1211 and `collectExpr` returned mid-stream. **Fix:** switch to element-nesting semantics matching `collectLiftExpr` (`<` IDENT/KEYWORD increments; `</` and `/>` decrement; plain `>` does NOT decrement). 6 new tests + 8/8 generalization sweep cases pass. Test suite: 7894 → 7900 pass / 40 skip / 0 fail / 377 files. **Bonus signal partial:** `examples/05-multi-step-form.scrml` `InfoStep` reverts cleanly to match-with-lift form; `PreferencesStep` (contains `<select><option>`) and `ConfirmStep` (contains `<dl>` with `${@...}` BLOCK_REF interpolations) still fail E-COMPONENT-020 — **different parser shapes, separate bugs.** Filed below as A7 (BLOCK_REF interpolation in component def) and A8 (`<select><option>` children in component def).
- **Severity:** medium-high (the canonical "render component per state" pattern hits this when the component contains common UI shapes like `<div>label <button onclick=fn()>x</button></div>`)
- **Tier:** **T2** (component-expander or component-def parser — needs further trace to locate the exact failure path)
- **Surfaced in:** Stage 3 — refactor of ex 05.
- **What:** When a component reference (`<InfoStep>`, `<PreferencesStep>`, etc.) appears inside a `match` arm body via `lift`, the compiler reports E-COMPONENT-020 saying the component is undefined — even when it IS defined in an earlier `${...}` block in the same file. The component IS in scope; the error message is wrong.
- **Workaround that works:** `if=`/`else-if=`/`else` chain on the component instances directly (e.g. `<InfoStep if=(@step == .Info)/>`). This compiles clean. Used in ex 05 refresh.
- **Implication for kickstarter v1:** the canonical "render different component per state" pattern is the if-chain, not match-with-lift. v1 reflects this in §3 anti-pattern table + §8 known traps.
- **Examples affected:** ex 05 (was failing pre-S42 audit, fixed via if-chain workaround).
- **S42 keyword sweep — verified triggers:**
  - `<div>{text}+<button onclick=fn()>x</button></div>` component def → **FAIL E-COMPONENT-020**
  - `<div><button onclick=fn()>x</button></div>` (no leading text) → OK
  - `<div>{text}<span>more</span></div>` (no event handler) → OK
  - `<button onclick=fn()>x</button>` (single-element root, no wrapper) → OK
  - Direct `<Foo/>` use OR match-with-lift `${match @x { .V => { lift <Foo> } } }` — both fail equally when the def hits the trigger shape
- **The trigger is in component DEFINITION parsing, not USAGE.** Component-def with a `<wrapper>` containing `{text} + <child with onclick handler>` fails to register in the component registry. Once not registered, any reference to it produces E-COMPONENT-020 — whether direct (`<Foo/>`) or under match-with-lift. The original failing example (ex 05's InfoStep with `<div>...<button onclick=next()>Next</button></div>`) hit this. The match-with-lift in the audit was incidental.
- **Hypothesis (NEW):** the component-def parser (`parseComponentDef` in `component-expander.ts` around line 356, or AST builder's component-def handling in `ast-builder.js`) likely fails when the def's body contains text-then-element-with-event-handler. Maybe the BS-stage `raw` collection for the def includes the `onclick=fn()` attribute in a way that breaks the re-parse step (component-expander.ts:301 mentions "raw is a space-joined logic token stream" needing normalization).
- **Source location candidates (need trace):**
  - `compiler/src/component-expander.ts:222-461` (parseComponentDef + raw normalization)
  - `compiler/src/ast-builder.js` component-def collection logic
- **Fix sketch (DEFERRED — needs deeper trace):** find where the def's body parse fails. Likely the `raw` normalization in `component-expander.ts:301-355` doesn't handle the `text + <elem onclick=...>` shape. May need to fix the re-parse OR change how the raw is collected so the re-parse sees parseable input.
- **Repro (minimal — verified S42):**
  ```scrml
  <program>
  ${ function fn() { } }
  ${ const Foo = <div>label <button onclick=fn()>x</button></div> }
  <div><Foo/></div>
  </program>
  ```
  Compiles with E-COMPONENT-020 even though `Foo` IS defined.

### A4. `lin` template-literal interpolation `${ticket}` not counted as consumption
- **Status:** **FIXED** — landed on main at commit `330fd28` (2026-04-25, S42). **Intake hypothesis was INCOMPLETE** (third hypothesis revision in a row — A3, A5, now A4). Real chain was multi-layer: tokenizer strips backticks → `reemitJsStringLiteral` JSON-stringifies the template → multi-quasi templates emit as `escape-hatch` (not `lit/template`) → walker never sees a template literal. Walker-only fix could not work alone. **Fix spans 4 source files:** (1) `tokenizer.ts` adds `Token.isTemplate` flag; (2) `ast-builder.js` 8 re-emit sites preserve backticks for template tokens; (3) `expression-parser.ts` adds `walkTemplateInterpolations` helper + `TEMPLATE_INTERP_CACHE` WeakMap memoization, multi-quasi templates now emit as `lit/template`; (4) `type-system.ts` `checkLogicExprIdents` consults `fnAllDeclared` to avoid false E-SCOPE-001 on now-visible self/forward function refs. **Two side-bugs surfaced and fixed in the same commit:** (a) `function-decl` binds name AFTER walking body, broke self-recursion across newly-visible template interpolations; (b) multi-quasi template round-trip silently broken (escape-hatch carried OUTER expression source). Test suite: 7900 → **7906 pass / 40 skip / 0 fail / 378 files**. **Bonus signal confirmed:** `examples/19-lin-token.scrml` can drop the `const consumed = ticket` workaround and use `\`Redeemed: ${ticket}\`` directly (verified by compile-test).
- **Severity:** medium (forces awkward workaround)
- **Tier:** **T2** (lin-tracker tree-walk update; needs verification of where function-body templates are scanned)
- **Surfaced in:** Stage 3 — writing ex 19.
- **What:** A `lin`-typed parameter referenced inside a template literal (e.g. `\`Redeemed ticket=${ticket} ...\``) is not recognized by §35.3 rule 1 as a consumption event. The compiler emits E-LIN-001 (never consumed) even though the parameter IS being read.
- **Workaround:** explicit `const consumed = ticket` followed by `${consumed}` in the template. The `const` binding IS counted as a consumption.
- **Implication:** §35.3's "any read of `~` as an expression is a consumption" should also apply to lin-typed locals/params, but the lin analyzer doesn't follow into template-literal interpolation positions inside server-fn body returns.
- **Examples affected:** ex 19 (worked around with `const consumed = ticket`).
- **Source location (located S42 deep-dive):**
  - `compiler/src/expression-parser.ts:1598-1604` — `forEachIdentInExprNode` treats `lit` ExprNodes (which include template literals per `:745-759`, `litType: "template"`) as **leaf nodes**: "Leaf nodes with no sub-expressions. Nothing to walk." No descent into template-literal interpolations.
  - `compiler/src/type-system.ts:7060-7073` — the lin-tracking code calls `forEachIdentInExprNode(field, callback)` on each ExprNode field of a node (return-stmt's `exprNode`, etc.). When the return value is `` `Redeemed ${ticket}` ``, the entire template literal is a single `lit` node with `raw: "\`Redeemed ${ticket}\`"`. The walker doesn't see `ticket` because lit is a leaf.
  - **Same gap affects `scanLambdasInExpr` (`type-system.ts:6936`)** — it walks fields recursively but stops at lit nodes too.
- **Root cause:** template-literal interpolations are not represented as structured ExprNode children. They're embedded in the opaque `raw` string of a single lit node. Any analysis that walks IdentExprs misses identifiers inside `${...}` interpolations.
- **Fix sketches (two paths):**
  1. **Surgical (T2):** in `forEachIdentInExprNode`'s `lit` case, when `node.litType === "template"`, regex-extract `${...}` interpolation segments from `node.raw` and either parse each segment to an ExprNode and walk it, or text-scan for identifiers and synthesize IdentExpr objects with approximate spans.
  2. **Structural (T3):** change the AST builder so template-literal interpolations are parsed into structured ExprNode children at parse time (a new `template-literal` ExprNode kind with `quasis: string[]` and `expressions: ExprNode[]`). Walker then descends naturally. Bigger change but eliminates the impedance mismatch for ALL analyses (lin, type narrowing, dep-graph, etc.).
- **Recommendation:** Path 1 (surgical) for the lin tracker specifically. Path 2 is right structural shape but invasive.
- **Repro (minimal — verified S42):**
  ```scrml
  server function f(lin t: string) {
    return `value: ${t}`   // E-LIN-001 even though t IS read
  }
  ```
- **Repro (minimal):**
  ```scrml
  server function f(lin t: string) {
    return `value: ${t}`   // E-LIN-001 even though t IS read
  }
  ```

### A6. `W-LINT-013` misfires on `@var = N` single-`=` assignments inside `~{}` test sigil bodies
- **Status:** **FIXED** — landed on main at commit `9ca9c3f` (2026-04-25, S42). Added `buildTildeRanges` helper (analogous to A2's `buildCommentRanges`), extended skipIf signature to 5 args, W-LINT-013's skipIf now excludes tilde ranges. Effect: ex 10 drops from 8 W-LINT-013 lints to 0. Test suite: 7889 → 7894 pass / 40 skip / 0 fail / 376 files.
- **Severity:** low (cosmetic — example 10 still emits 8 lints after A1's `(?!=)` fix; doesn't block anything)
- **Tier:** **T1** (single helper added — `buildTildeRanges` analogous to `buildCommentRanges`)
- **Surfaced in:** A1+A2 pipeline run (S42). A1's `(?!=)` lookahead caught 6 of 14 misfires in ex 10 (the `assert @x == N` cases) but 8 cases remained: `@count = 0` / `@step = 1` etc. inside `~{}` test bodies. These are LEGITIMATE single-`=` assignments to reactives — the `(?!=)` lookahead correctly does NOT exclude them, but they're still not Vue ghost shorthand.
- **What:** test bodies inside `~{ "name" test "case" { @count = 0; ... } }` blocks contain reactive assignments that look identical to attribute-position `@click=` ghost patterns from W-LINT-013's perspective. The lint can't distinguish "assignment to `@var` inside a test body" from "Vue `@click=` attribute".
- **Repro (verified S42):**
  ```scrml
  ~{ "x"
    test "y" {
      @count = 0   // W-LINT-013 misfires here
    }
  }
  ```
- **Fix sketch:** add `buildTildeRanges(source)` helper in `lint-ghost-patterns.js` (analogous to `buildLogicRanges` / `buildCommentRanges` / the new `buildCommentRanges` from A2). Extend skipIf signature to take a 5th `tildeRanges` arg. Update W-LINT-013's skipIf to skip tilde ranges. Possibly other lint patterns benefit too — audit during the fix.
- **Anticipated by A1's intake** ("Step 3 (optional, deferred): `~{}` test sigil exclusion"). The pipeline confirmed it's needed.
- **Examples affected:** ex 10 (8 remaining lints post-A1+A2).

### A7. Component-def with `${@reactive}` BLOCK_REF interpolation in body fails to register
- **Status:** **intake-filed** at `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md` (2026-04-25, S42)
- **Severity:** medium (blocks a common pattern — components that render a reactive value inline)
- **Tier:** **T2** (parser-level — same family as A3 but different parser shape)
- **Surfaced in:** A3 fix verification (S42). After A3 landed, `examples/05-multi-step-form.scrml` `InfoStep` reverts cleanly to `match { .Variant => { lift <Comp> } }` form. But `ConfirmStep` (contains `<dl>` with `${@firstName}`/`${@email}` BLOCK_REF interpolations in body) still fails E-COMPONENT-020 — different parser shape than A3's text-plus-handler-child trigger.
- **What (likely cause):** the same `collectExpr` angle-tracker that A3 fixed for text-plus-handler-child shape may have a similar gap when the component body contains `${@reactive}` BLOCK_REF interpolations. The interpolation may interact with angleDepth tracking similarly to how `onclick=` tripped the IDENT-`=` boundary in A3.
- **Repro (extracted from ex 05 ConfirmStep, untested as standalone — needs minimal repro work):**
  ```scrml
  ${ const ConfirmStep = <div class="step">
       <dl><dt>Name</dt><dd>${@firstName} ${@lastName}</dd></dl>
     </div>
  }
  <ConfirmStep/>
  ```
- **Fix sketch:** trace the `collectExpr` behavior on the BLOCK_REF interpolation case. The fix may share infrastructure with A3 (element-nesting semantics) but the trigger is different. Likely needs another small extension to the angle/brace tracker.
- **Examples affected:** ex 05 (ConfirmStep remains in if-chain workaround form post-A3).

### A8. Component-def with `<select><option>` children fails to register
- **Status:** **intake-filed** at `docs/changes/fix-component-def-select-option-children/intake.md` (2026-04-25, S42)
- **Severity:** medium (blocks form-shaped components — a `<form>` with a `<select>` is a common pattern)
- **Tier:** **T2** (parser-level — same family as A3, possibly same family as A7)
- **Surfaced in:** A3 fix verification (S42). `PreferencesStep` (contains `<select bind:value=@theme><option>...</option></select>` + checkbox `<input type="checkbox" bind:value=@newsletter>`) still fails E-COMPONENT-020 post-A3.
- **What (likely cause):** the `<select><option>` nesting + `bind:value=@reactive` attributes interact with the angle/brace tracker in a way that's still defective post-A3. Could be that `<option>` is treated as void-element in HTML registry but content-element in scrml, OR the `bind:value=@x` syntax has a different angle-tracker interaction than `onclick=fn()`.
- **Repro (extracted from ex 05 PreferencesStep — needs minimal repro work):**
  ```scrml
  ${ const PrefStep = <div class="step">
       <select bind:value=@theme>
         <option value="light">Light</option>
         <option value="dark">Dark</option>
       </select>
     </div>
  }
  <PrefStep/>
  ```
- **Fix sketch:** trace + bisect to identify the exact trigger element/attribute pair. The fix may share infrastructure with A3 + A7. May resolve as part of A7's investigation.
- **Examples affected:** ex 05 (PreferencesStep remains in if-chain workaround form post-A3).

### A5. Markup text starting with `function`/`fn` is auto-promoted to logic block
- **Status:** **FIXED** — landed on main at commit `284c21d` (2026-04-25, S42). Approach: Option 2 fallback (`parentType` flag form, `<program>` carved out as decl-site) — Option 1 broke 7 tests in `top-level-decls.test.js` because `<program>` is a markup-typed block that needs to retain the lift for top-level bare decls. **Bonus:** `samples/compilation-tests/func-007-fn-params.scrml` flipped FAIL → PASS (same bug class). Sample-corpus failure baseline 24 → 23. Test suite post-fix: 7878 pass / 40 skip / 0 fail / 373 files.
- **Severity:** **HIGH** (post-deep-dive). Two failure modes from the same root cause:
  1. Long enough lifted text → phantom E-SCOPE-001 (visible compile error)
  2. Short lifted text → silent text loss (compiles clean, output is wrong)
  The silent-corruption mode is the dangerous one — could ship unnoticed.
- **Tier:** **T1** (after deeper investigation — single-file, single function, ~5-line change)
- **Surfaced in:** Stage 3 — writing ex 20 middleware. Original tracker entry wrongly blamed HTML entities + nested `<code>`. S42 deep-dive bisection located the real trigger; S42 deep-dive Phase 2 located the source code path.

**What:** Text inside markup elements (`<p>`, `<div>`, `<h1>`, etc.) that begins with `function <ident>`, `fn <ident>`, `type <ident>`, or `server fn|function <ident>` gets silently promoted to a `${...}` logic block by the bare-declaration lifter. A `<p>function adds a request.</p>` becomes a `${ function adds a request. }` logic block, which downstream passes try to interpret as a JS function declaration — producing phantom E-SCOPE-001 errors referencing tokens inside the prose.

**Keyword sweep (S42 testing):** of 15 keywords tested in `<p>KW adds a request.</p>` form, only `function` and `fn` trigger the leak. `let`, `const`, `if`, `for`, `while`, `return`, `import`, `export`, `class`, `server`, `type` (alone — `type X` would trigger), `async`, `await` all pass through as text. The match is keyword-specific to scrml's function-declaration starters.

**Bisected minimal repro:**
```scrml
<program>
${ @x = 0 }
<p>function adds a request.</p>
</program>
```
Compiles with `E-SCOPE-001: Undeclared identifier 'a' in logic expression`.

**Source location:** `compiler/src/ast-builder.js`
- Line 211 — `BARE_DECL_RE = /^\s*(server\s+(?:fn|function)\s|type\s+\w|fn\s+\w|function\s+\w)/;`
- Lines 235-260 — `liftBareDeclarations(blocks)`:
  ```js
  function liftBareDeclarations(blocks) {
    return blocks.map(block => {
      // Recursively process children of markup/state contexts
      if (block.type === "markup" || block.type === "state") {
        const newChildren = liftBareDeclarations(block.children || []);
        return { ...block, children: newChildren };
      }
      // Convert text blocks that start with a bare declaration keyword
      if (block.type === "text" && BARE_DECL_RE.test(block.raw)) {
        return { type: "logic", raw: "${" + block.raw + "}", ... };
      }
      return block;
    });
  }
  ```

**Root cause:** `liftBareDeclarations` recurses into both `markup` and `state` block children (line 238). The lift is intended for **file-level** bare declarations — letting developers write `function foo() {...}` at the top of a file without wrapping in `${...}`. But the recursive descent into markup children means TEXT inside `<p>`/`<div>`/etc. gets the same treatment. Recursion into **state** blocks is legitimate (server functions inside `< db>` blocks are real declarations); recursion into **markup** blocks is the bug.

**Fix sketch:** track context during recursion. Either:
1. **Simplest:** stop recursing into markup blocks — text inside markup never auto-lifts.
   ```js
   if (block.type === "state") {  // only state, not markup
     const newChildren = liftBareDeclarations(block.children || []);
     ...
   }
   if (block.type === "markup") {
     return block;  // pass through unchanged
   }
   ```
2. **Safer (preserves more existing behavior):** add an `isMarkupContext` flag that suppresses the lift when set, and pass `true` when recursing into markup, `false` when recursing into state.

Option 1 is mechanically simpler. Option 2 leaves room for future edge cases. Either is a single-file change of ~5 lines. **The lin-A5 reclassification from T2/T3 to T1 reflects this localization.**

**Bisected NON-error-triggers (but still buggy):**
- `<p>The function adds a request.</p>` (leading word) → COMPILES CLEAN, output preserved — `BARE_DECL_RE` requires the function keyword at start of `\s*` (start of trimmed text), so leading words avoid the lift entirely
- `<p>function adds.</p>` (short form) → **COMPILES CLEAN BUT OUTPUT IS CORRUPTED.** Verified at S42 deep-dive: HTML output shows `<span data-scrml-logic="_scrml_logic_1"></span>` in place of the paragraph text. The `<p>` text was silently lifted into a logic block, parsed as a (zero-statement) function declaration, and the original prose is gone from output. **This is the most dangerous shape of the bug — silent text loss with no diagnostic.** Reader of the rendered page sees an empty paragraph.
- `<p>let adds a request.</p>` → COMPILES, output preserved — `let` is not in `BARE_DECL_RE`

**Severity escalation:** the bug is not just "phantom errors on certain prose" — for short-enough lift targets the lifted code happens to parse without error and the original text vanishes from output silently. **Both error-emitting and silent-corrupting variants are produced by the same root cause.** Output corruption is harder to notice than compile errors and could ship to production unnoticed.

**Tests to add when filing intake:**
- Existing test: bare `function foo() {...}` at file top level — must continue to compile (lift behavior preserved at top level)
- Existing test: bare `function foo() {...}` inside a state block — must continue to compile (lift behavior preserved in state context)
- New test: `<p>function adds a request.</p>` text inside markup — must compile clean as plain text content
- New test: same for `fn`, `type`, `server function`, `server fn` keywords

**Workaround (until intake lands):** rephrase prose so `function`/`fn` is preceded by a non-keyword word (e.g. "The function …") or use a different word entirely. Used in ex 20.

**Examples affected:** ex 20 (worked around by rephrasing).

---

## §B. Spec gaps

Where the compiler ships a feature but the spec doesn't document it, or vice versa.

### B1. `<program auth="required">` undocumented
- **Status:** not-filed (worth a spec PR)
- **Surfaced in:** Stage 2 §3.1 (`docs/audits/kickstarter-v0-verification-matrix.md`)
- **What:** The compiler implements `<program auth="required">` (and auto-injects it when `protect=` is present). Verified at `compiler/src/route-inference.ts:113,1611-1648`. Spec §40 lists CORS/log/csrf/ratelimit/headers attributes on `<program>` but does NOT include `auth=`.
- **Action:** add `auth=` to §40.2 attribute table with `"required" | "optional"` value form + auto-inject behavior described.

### B2. `csrf="auto"` value undocumented
- **Status:** not-filed (worth a spec PR)
- **Surfaced in:** Stage 2 §2.7
- **What:** The compiler emits `csrf="auto"` when auto-injecting (per `route-inference.ts:1660-1662` W-AUTH-001 message). Spec §39.2.3 only documents `csrf="on"` and `csrf="off"`. The `"auto"` value is a real shipping behavior the spec doesn't acknowledge.
- **Action:** add `"auto"` to §39.2.3 / §40 csrf value form with the auto-injection trigger described.

### B3. CSRF mint-on-403 retry undocumented in §39
- **Status:** not-filed (low — implementation is right, spec is incomplete)
- **Surfaced in:** Stage 2 §3.4
- **What:** `_scrml_fetch_with_csrf_retry` (per `compiler/src/codegen/emit-client.ts:504`) plus server-side mint-on-403 (per `emit-server.ts:332,379,545`, GITI-010) implement automatic retry-after-mint. §39.2.3 documents validation + 403 response but doesn't describe the auto-retry. Implementation works; spec is missing the section.
- **Action:** add a §39.2.3 subsection (or §40) describing the client-side retry behavior + server-side mint-on-403 cookie handshake.

### B4. `<for each= in=>` and `<if test=>` markup tags don't exist
- **Status:** N/A — kickstarter v0 documentation drift, not a spec gap. Spec is correct (§17 uses `if=` attribute + `${ for ... lift }`); only kickstarter is wrong. Tracked in matrix §2.1 + §2.2.

---

## §C. Scaffold-only features (ship in compiler but incomplete)

Compiler accepts the syntax + runs the parser/early passes but the full code-generation or runtime support isn't there yet.

### C1. §52 Tier 1 (`< TypeName authority="server" table="...">`) auto-SELECT not emitting
- **Status:** scaffold-only (per existing test contract)
- **Surfaced in:** Stage 3 — first attempt at ex 18.
- **What:** `< Card authority="server" table="cards">` parses (no crash) but the type-system pass treats field names as undeclared identifiers, AND the auto-SELECT codegen is explicitly NOT emitted. Source: `compiler/tests/unit/state-authority-codegen.test.js:464-487` test § titled "Tier 1 — authority="server" + table= (scaffold: no crash, no SELECT yet)" with explicit comment "Tier 1 auto-SELECT is a follow-up implementation task."
- **Status reconciliation:** test contract acknowledges this. So it's KNOWN scaffold-only, not a bug. ex 18 uses Tier 2 (`server @var`) instead.

### C2. §52 Tier 2 `server @var` auto-detection (Pattern A + B) not detecting
- **Status:** scaffold-only
- **Surfaced in:** Stage 3 — ex 18 retry.
- **What:** §52.6.5 describes two patterns for the compiler to detect the initial-load function:
  - Pattern A: `@var = serverFn()` assignment — compiler should pick up `serverFn` as mount fetch
  - Pattern B: `on mount { @var = serverFn() }` block
- Both patterns emit W-AUTH-001 ("'server @tasks' has no detected initial load") even when the documented form is followed. The variable still works (the assignment runs on mount); the warning just always fires.
- **Implication:** ex 18 is "best-effort canonical" — it follows §52.6.5 Pattern B but accepts the warning. When detection lands, ex 18 should compile clean.

### C3. W-PROGRAM-001 fires on syntax-fragment samples
- **Status:** PINNED (`docs/pinned-discussions/w-program-001-warning-scope.md`)
- **Surfaced in:** Stage 1 §6.
- **What:** W-PROGRAM-001 fires on 224/229 warn-only samples (~98%) — every fragment file in `samples/compilation-tests/` lacking a `<program>` root.
- **Disposition:** option 1 (path-based suppression in `samples/compilation-tests/`) chosen as working assumption. NOT compiler-change-authorized. See pinned discussion.

---

## §D. Documentation drift (kickstarter v0 vs spec/code)

Kickstarter v0 claims that conflict with spec and/or compiler source. **All have correction in the verification matrix `docs/audits/kickstarter-v0-verification-matrix.md`.** Listing here for completeness; no separate intake needed — the matrix IS the patch list.

| Claim | Severity | Matrix § |
|---|---|---|
| `<if test=cond>` markup tag doesn't exist (use `if=` attribute) | HIGH | §2.1 |
| `<for each= in=>` markup tag doesn't exist (use `${for ... lift}`) | HIGH | §2.2 |
| `~name = expr` derived-decl doesn't exist (use `const @name = expr`) | CRITICAL | §2.3 |
| Real-time recipe wrong on 4 axes (room=, onmessage="...", missing @shared, .send()) | CRITICAL | §2.4 |
| `signJwt({email})` missing required secret + expiresIn args | HIGH | §2.5 |
| `<request url= into=>` invented (use `id=` + `deps=[]` + body) | CRITICAL | §2.6 |
| `protect=` should be COMMA-separated, kickstarter says space | HIGH | §3.7 |
| `prop:Type` annotation form doesn't exist (only `props={...}`) | LOW | §3.5 |
| `.debounced(ms)` postfix wrong; actual is `@debounced(N) name = expr` modifier | HIGH | §3.2 |
| Slots claim incomplete (missing `slot="name"` + `${render slotName()}`) | LOW | §2.8 |

---

## §E. Sample-corpus debt (not bugs, but tracked for visibility)

Findings from sample classification (`docs/audits/scope-c-stage-1-sample-classification.md`) that aren't compiler bugs but represent corpus debt.

### E1. 12 of 24 failing samples share post-S20 strict-scope drift (missing `@` sigil)
- **Status:** not-filed (refresh-batch candidate)
- **Affected files:** `combined-012-login`, `comp-004-modal`, `comp-006-alert`, `comp-009-dropdown`, `comp-013-tooltip`, `component-scoped-css`, `css-scope-01`, `func-007-fn-params`, `protect-001-basic-auth`, `modern-006-canvas-with-helpers`, plus 7 `gauntlet-r10-*` (some of which may have other issues).
- **Action:** single batch refresh against current scope rules would clear most. Mechanical work; low risk.

### E2. 23 of 24 failing samples are stale (only 1 is intentional negative test)
- **Status:** classification only
- **What:** Only `lin-002-double-use.scrml` (E-LIN-002) is a real negative test. The other 23 are stale code from S20 / older. The "24 failing samples" number is misleading — it suggests a bug-tracking corpus when in reality it's mostly orphaned drift.
- **Action:** consider promoting stale samples to either (a) refresh against current spec, or (b) delete if the feature being tested has changed shape entirely.

---

## §F. Audit-process notes (meta)

### F1. Examples 10, 14 will keep emitting WARN until A1 + A2 are filed/fixed
- **Status:** living state
- **What:** ex 10 + ex 14 each emit known W-LINT-013 / W-LINT-007 misfires that are NOT bugs in the example source — they're compiler-side false positives. Until A1 + A2 land, both examples will continue to emit those warnings on every compile. Treat as expected.

### F2. Example 18 will keep emitting W-AUTH-001 until C2 is filed/fixed
- **Status:** living state
- **What:** Same family as F1 — ex 18 demonstrates §52 Tier 2 correctly per spec, but the auto-detection scaffold-only state means W-AUTH-001 will fire forever from this example until the detection lands. Treat as expected.

### F3. Compile-test workflow for new examples requires DB files
- **Surfaced in:** Stage 3 — ex 17, ex 18 first compiles failed E-PA-002 (DB doesn't exist + no CREATE TABLE in `?{}`).
- **What:** The compiler reads schema at compile time from `examples/<name>.db` for `< db src=...>` blocks. Examples shipping `<schema>` or `< db>` need a corresponding `.db` file in `examples/` already.
- **Files added during S42:** `examples/notes.db`, `examples/tasks.db` (created via `bun:sqlite` Database constructor with matching CREATE TABLE statements).
- **Implication for future example writers:** when introducing a new DB-backed example, create the `.db` file at the same time. Document the schema in a comment so the file can be recreated.

### F4. Agent tool-routing leak — `isolation: "worktree"` agents sometimes write to main checkout
- **Status:** living issue, recurring; mitigation in place; root cause unfixed (likely a platform-level bug)
- **Severity:** medium-high (data-loss class — when paired with a stall, work product can be silently lost or commit-target ambiguity arises)
- **Surfaced in:** Recurred 3 times during S42:
  1. **A5 first attempt** — Agent's Read/Write/Edit tool calls landed in main checkout (`/home/.../scrmlTS/`) instead of the assigned worktree (`/home/.../scrmlTS/.claude/worktrees/agent-<id>/`). Agent self-recovered by `mv`-ing files into the worktree before committing. No data loss.
  2. **A6 stall** — Same routing as A5. Agent did the work in main checkout, then the stream watchdog stalled before the agent's commit step. Files were left in main's working tree (uncommitted, would have been lost on next reset). PA salvaged by committing main's working tree directly to main (work was verified-correct via `bun test`).
  3. **A4 leak during A3 cherry-pick** — A4 was running in background while PA cherry-picked A3. A4's leaked progress.md/pre-snapshot.md files in main's working tree caused the A4 cherry-pick to conflict on add/add when it later landed.
- **Symptoms:** background agents dispatched with `isolation: "worktree"` end up making file modifications to the parent's main checkout (not the worktree). The agent's `git status` / `git log` / etc. operations correctly target the worktree (so commits land on the right branch), but `Read`/`Write`/`Edit` tool calls land in the parent checkout.
- **Root cause (CONFIRMED via diagnostic dispatch S42):** **NOT a harness routing bug — an agent-discipline bug.** Tool calls follow CWD when paths are relative; resolve literal absolute paths when given one. There is NO worktree-boundary enforcement at the tool layer. The leak vector: when a dispatched agent constructs an absolute path that points at the main repo root (`/home/bryan-maclee/scrmlMaster/scrmlTS/...`) — typically by copy-pasting a path from intake docs / hand-off references / conversation context, or by hardcoding the canonical repo path from training-data convention — the Write/Edit tool obediently writes to main. CWD-relative paths and worktree-rooted absolute paths both stay in the worktree; main-rooted absolute paths are the failure mode.
- **Diagnostic evidence (read-only forensic dispatch `a1ce9f7446b09c058`):** ran a 6-step matrix across (Read vs Write) × (relative vs absolute-worktree vs absolute-main) paths. All 6 tool invocations were deterministic. Read with relative path → worktree's pa.md (263 lines). Read with absolute-main path → main's pa.md (288 lines, leaked). Write with relative path → worktree. Write with absolute-main path → main (leaked). Same behavior for Read and Write. Hypotheses H1 (universal main routing) / H3 (intermittent) / H4 (tool-specific) all rejected. H2 (CWD-honoring) + H5 (absolute paths are the leak vector) confirmed.

#### Recovery patterns (catalogued from S42)

When the leak occurs:

| Symptom | Recovery |
|---|---|
| Agent self-detects mid-flight + manually `mv`s files into worktree before commit | None needed — agent recovers itself (A5 first attempt). |
| Agent stalls before self-recovery; main has uncommitted work | If the work is verified correct (run tests yourself), commit main's working tree directly to main with explicit user authorization. Note in commit message that the dispatch leaked + work was salvaged (A6 path). |
| Background agent leaks files into main while PA does unrelated work | `git status --short` in main BEFORE any cherry-pick. Reconcile leaked files first — either commit them as the leaked agent's work, or stash aside. Don't cherry-pick over a dirty tree (A4 path). |

#### Mitigation: agent-discipline template (revised post-diagnostic)

The CWD-check template is **necessary but NOT sufficient** — it confirms the agent starts in the worktree, but doesn't prevent the agent from later constructing a main-rooted absolute path. Per diagnostic findings, the actual rules are:

1. **Verify worktree at startup** (catches harness-level mis-dispatch, even if rare per H1 rejection).
2. **Derive worktree root from `pwd` and store it as a variable** — never hardcode the canonical repo path (`/home/bryan-maclee/scrmlMaster/scrmlTS/`).
3. **Prefer relative paths or `$WORKTREE_ROOT/...` for all Write/Edit operations.** Relative paths are CWD-resolved (CWD = worktree, since startup check confirmed it).
4. **Forbid hardcoded main-repo absolute paths** in any Write/Edit call. If an intake or hand-off doc references such a path, translate it to `$WORKTREE_ROOT/<relative-suffix>` before writing.

Template (paste into `pa.md` or inline in every dispatch with `isolation: "worktree"`):

```
# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: <ABSOLUTE-WORKTREE-PATH>

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the
   output as your `WORKTREE_ROOT` for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean (or matches the
   expected pre-snapshot).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: relative paths or paths under WORKTREE_ROOT are safe. Reading
  from main via absolute path will give you the wrong file content (main is
  AHEAD of your worktree on the same branches, but parallel-different on
  in-flight work).
- For Write/Edit: ONLY use paths under WORKTREE_ROOT. NEVER use absolute paths
  starting with `/home/bryan-maclee/scrmlMaster/scrmlTS/` directly — those
  point to main and will leak your work product into main's working tree
  (the bug that this rule prevents — see findings tracker §F4).
- If an intake doc / hand-off doc / conversation context references a path
  like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to
  `$WORKTREE_ROOT/foo/bar.ts` (or the relative equivalent) before writing.

If you find yourself about to write to a path starting with the main repo
root, STOP. Re-derive the path from WORKTREE_ROOT.
```

#### PA-side mitigations (carried)

- Before any cherry-pick from a worktree branch, run `git status --short` in main and reconcile any unexpected uncommitted files — they may be in-flight agent leaks.
- When dispatching, paste the absolute worktree path into the prompt as a literal value (the agent will be told its WORKTREE_ROOT). Don't expect the agent to derive it on its own from the agent ID.

#### Platform-level defense (recommended, not yet scoped)

The diagnostic agent's recommendation: a settings.json **PreToolUse hook** that rejects Write/Edit calls whose absolute path starts with the main repo root but not the active worktree subtree. Hard-fail at the tool layer rather than relying on agent discipline.

- **Pro:** closes the leak entirely. Agent prompt discipline has already failed 3 times this session.
- **Con:** the hook must be context-aware — the PA itself NEEDS to write to main paths; only sub-dispatched agents under `isolation: "worktree"` should be blocked from main-path writes. The hook needs a signal (env var? hook context?) to distinguish.
- **Status:** not yet scoped. Filed as a follow-up to F4. Could be drafted via the `update-config` skill if/when the agent-discipline template proves insufficient.

#### Diagnostic dispatch (completed)

`a1ce9f7446b09c058` ran a 6-step forensic matrix and reported the verdict above. Logs preserved in the dispatch's notification record (read-only — no production code touched, all 3 marker files cleaned up).

#### Cross-references
- A5 progress notes: `docs/changes/fix-bare-decl-markup-text-lift/progress.md` ("Initial Read/Write tool calls accidentally landed in the main checkout...").
- A6 leak commit: `9ca9c3f` (committed directly to main; commit message documents the salvage).
- A4 leak observed during cherry-pick of A3 (PA's session log entry).

---

## How to update this tracker

When something here becomes a real intake or fix:

1. Change **Status** from `not-filed` to `intake-filed` and link the intake path
2. Once landed, change to `fixed` and link the commit + test reference
3. Don't delete entries — keep history. `fixed` items can move to a "Resolved" appendix later.

When new findings emerge during ongoing audit work:

1. Add to the appropriate section (§A compiler bugs / §B spec gaps / §C scaffold / §D doc drift / §E corpus debt / §F process)
2. Assign a stable ID (next number in the section)
3. Cross-reference from the audit doc that surfaced it

---

## Tags
#scope-c #findings-tracker #compiler-bugs #spec-gaps #scaffold-only #documentation-drift #stage-1 #stage-2 #stage-3

## Links
- [docs/audits/scope-c-stage-1-2026-04-25.md](./scope-c-stage-1-2026-04-25.md)
- [docs/audits/scope-c-stage-1-sample-classification.md](./scope-c-stage-1-sample-classification.md)
- [docs/audits/kickstarter-v0-verification-matrix.md](./kickstarter-v0-verification-matrix.md)
- [docs/pinned-discussions/w-program-001-warning-scope.md](../pinned-discussions/w-program-001-warning-scope.md)
- [hand-off.md](../../hand-off.md) — S42 active
- [master-list.md](../../master-list.md)
