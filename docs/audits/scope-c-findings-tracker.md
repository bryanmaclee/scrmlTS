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

**Recommended order (revised after A5 deep-dive):**
1. **A5 first** (HIGH severity due to silent corruption mode)
2. **A2 + A1** (T1 lint family, single-file batch)
3. **A3** (match-arm component refs)
4. **A4** (lin template-literal interpolation)



### A1. `W-LINT-013` misfires on `@reactive` reads
- **Status:** **intake-filed** at `docs/changes/fix-w-lint-013-context-scope/intake.md` (2026-04-25, S42)
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
- **Status:** **intake-filed** at `docs/changes/fix-w-lint-007-comment-range-exclusion/intake.md` (2026-04-25, S42)
- **Severity:** low (one-line annoyance)
- **Tier:** **T1** (single-file, add comment-range exclusion)
- **Surfaced in:** Stage 1 audit §4 Issue B
- **What:** Lint scans comment regions and flags text patterns like `<Comp prop={val}>` even though they're inside `// comment` lines, which per §27 are universal.
- **Examples affected:** ex 14 line 5 (header comment mentions JSX-style attr brace as Vue example).
- **Source location:** `compiler/src/lint-ghost-patterns.js:244` (W-LINT-007 entry; same family as A1).
- **Root cause:** `lint-ghost-patterns.js` builds `logicRanges` (`buildLogicRanges` at line 93) and `cssRanges` for some patterns, but has no `commentRanges`. The lint scans entire source string including `//` line comments and `/* ... */` blocks.
- **Fix sketch:** add `buildCommentRanges(source)` that scans for `//` (line comments) and `/* */` (block comments). Add `commentRanges` to the `skipIf` callback signature. Update relevant lint entries (W-LINT-007, W-LINT-013, others that scan markup text) to also skip when offset is inside a comment range.
- **Repro (minimal):** any `// ... <Comp prop={x}> ...` comment line in a compilable file.

### A3. `match { .X => { lift <Component> } }` triggers E-COMPONENT-020
- **Status:** not-filed
- **Severity:** medium-high (the documented pattern doesn't compile)
- **Tier:** **T2** (component-expander tree-walk update + AST shape verification)
- **Surfaced in:** Stage 3 — refactor of ex 05.
- **What:** When a component reference (`<InfoStep>`, `<PreferencesStep>`, etc.) appears inside a `match` arm body via `lift`, the compiler reports E-COMPONENT-020 saying the component is undefined — even when it IS defined in an earlier `${...}` block in the same file. The component IS in scope; the error message is wrong.
- **Workaround that works:** `if=`/`else-if=`/`else` chain on the component instances directly (e.g. `<InfoStep if=(@step == .Info)/>`). This compiles clean. Used in ex 05 refresh.
- **Implication for kickstarter v1:** the canonical "render different component per state" pattern is the if-chain, not match-with-lift. v1 reflects this in §3 anti-pattern table + §8 known traps.
- **Examples affected:** ex 05 (was failing pre-S42 audit, fixed via if-chain workaround).
- **Source location:** `compiler/src/component-expander.ts:1411`
  ```ts
  for (const key of ["body", "consequent", "alternate"]) {
    if (Array.isArray(n[key])) {
      const newBody = walkLogicBody(n[key] as unknown[], registry, filePath, counter, ceErrors);
      ...
    }
  }
  ```
- **Root cause:** `walkLogicBody` recurses into nested-body keys `body`, `consequent`, `alternate` for if-stmt / for-stmt / while-stmt. **It does NOT recurse into `match-expr` arms** (which are stored under `arms` array, with each arm having its own body). Component references inside match arm bodies are therefore never visited by the expander, never resolved against the registry, and end up emitting E-COMPONENT-020 from a later pass that finds them still in `isComponent: true` state.
- **Fix sketch:** add match-arm handling to `walkLogicBody`. When `n.kind === "match-expr"`, iterate `n.arms` (or whatever the AST builder names it — verify against `types/ast.ts`), and for each arm recurse into `arm.body` (or `arm.consequent`). This may also need to handle the rawArms string-form (used in expression-form match per type-system.ts:6987) by re-parsing — which is more involved.
- **Repro (minimal):** any file with `${ const Foo = <div>...</> }` followed by `${ match @x { .V => { lift <Foo> } } }` markup.

### A4. `lin` template-literal interpolation `${ticket}` not counted as consumption
- **Status:** not-filed
- **Severity:** medium (forces awkward workaround)
- **Tier:** **T2** (lin-tracker tree-walk update; needs verification of where function-body templates are scanned)
- **Surfaced in:** Stage 3 — writing ex 19.
- **What:** A `lin`-typed parameter referenced inside a template literal (e.g. `\`Redeemed ticket=${ticket} ...\``) is not recognized by §35.3 rule 1 as a consumption event. The compiler emits E-LIN-001 (never consumed) even though the parameter IS being read.
- **Workaround:** explicit `const consumed = ticket` followed by `${consumed}` in the template. The `const` binding IS counted as a consumption.
- **Implication:** §35.3's "any read of `~` as an expression is a consumption" should also apply to lin-typed locals/params, but the lin analyzer doesn't follow into template-literal interpolation positions inside server-fn body returns.
- **Examples affected:** ex 19 (worked around with `const consumed = ticket`).
- **Source location (likely):** `compiler/src/type-system.ts` — `consumeLinRefByTextScan` (line 6265) and `consumeLinRef` (line 6880). The `consumeLinRefByTextScan` uses regex word-boundary matching (`\\b${name}\\b`) which SHOULD match `${ticket}` since `${` and `}` are non-word boundaries. So the regex side works; the missing piece is **whether the function-body return-statement template-literal raw text is being passed to the scanner at all**.
- **Fix sketch:** trace from a server-function-body analysis path (where `lin` parameters are introduced) through to the body's `return-stmt`. Verify the return value's expression node — if it's a `template-literal` kind, the analyzer needs to descend into its interpolations. Most likely the analyzer treats template literals as opaque strings and skips them. Fix: descend into template-literal expressions and call `consumeLinRefByTextScan` on each interpolation segment.
- **Repro (minimal):**
  ```scrml
  server function f(lin t: string) {
    return `value: ${t}`   // E-LIN-001 even though t IS read
  }
  ```

### A5. Markup text starting with `function`/`fn` is auto-promoted to logic block
- **Status:** **intake-filed** at `docs/changes/fix-bare-decl-markup-text-lift/intake.md` (2026-04-25, S42)
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
