# Phase A1a Step 11.0b — Newline-as-statement-separator — Progress

Branch: `phase-a1a-step-11-0b-newline-separator`
Parent baseline HEAD: `14ebbe9` (s60 close: hand-off + master-list + changelog).
Test baseline: 8,853 pass / 43 skip / 0 fail / 8,896 across 439 files.

## Survey

[step-11-0b startup] Worktree clean. `pwd` / git toplevel match. `git log -7`
shows `14ebbe9 docs(s60-close)` near HEAD and `6d51d00 compile(a1a-step-11-0a)`
just below — baseline parent matches BRIEF expectation. `bun install` → 113
packages. `bun run pretest` → 12 samples compiled. `bun run test` first run
flake (2 ECONNREFUSED), retry → **8,853 pass / 43 skip / 0 fail / 8,896
across 439 files**. Confirmed baseline. Branch
`phase-a1a-step-11-0b-newline-separator` created.

[step-11-0b survey-locus] Located key call sites in
`compiler/src/ast-builder.js`:
- `parseLogicBody` at L1699 (entry point for `${...}` logic blocks).
- `collectExpr` at L1784 — the RHS-collection helper. Already has
  `compoundBody` opt flag (Step 11.0a) at L1790 + boundary at L1993-2001.
- `tryParseStructuralDecl` at L2934 — recognizes `<NAME>` state-decl shape.
  Calls `collectExpr` at L3156, threading `inCompoundBody`.
- `scanStructuralDeclLookahead` at L3203 — pure lookahead for state-decl
  shape (returns null if not a state-decl). USES `tokens[i + scanIdx]`,
  not `peek()`, so it requires `peek(0)` = `<` and `peek(1)` = IDENT.
- `tryParseStructuralDecl` call sites (4 total):
  - L3557 in `parseOneStatement` const-branch (Shape 3 derived)
  - L4636 in `parseOneStatement` default-branch (Shape 1 plain)
  - L5784 in `parseLogicBody` const-branch (Shape 3 derived)
  - L7131 in `parseLogicBody` default-branch (Shape 1 plain)

[step-11-0b survey-collectExpr-boundary-rules] Today's `collectExpr`
boundaries at depth 0 (in source order):
- L1812 `stopAt`-match
- L1817 `BLOCK_REF` at depth 0 (after consuming some tokens)
- L1820 `;` PUNCT — break + consume
- L1824 `}` PUNCT — break (no consume)
- L1834 `startsArmPattern` (match-arm patterns)
- L1902 STMT_KEYWORDS (function/const/let/etc. — except function-as-RHS)
- L1930 BUG-R14: `@name =` or bare-IDENT `=` at depth 0 (assignment opener)
  + isTypedReactive `@name :`
- L1959 BUG-ASI-NEWLINE: `lastEndsValue + tok.line > lastTok.line +
  tokStartsStmt(IDENT or KEYWORD-not-STMT)` — break
- L1993 (Step 11.0a) compoundBody: `<` IDENT or `</` — break

[step-11-0b survey-step-11-0a-compoundBody-mechanism] Step 11.0a's
`compoundBody` flag is enabled ONLY when `tryParseStructuralDecl` is invoked
recursively from inside a Variant C compound body. The flag forces
`collectExpr` to break on `<` IDENT (sibling decl) or `</` (compound close)
at parts.length > 0, angleDepth 0. **No newline gate** — fires same-line.
This works for compounds because compound-children RHS are typically simple
literals (no `a < b` comparisons). Top-level state-decl RHS can have
arbitrary expressions, so reusing the compoundBody flag at top-level WOULD
regress `<x> = a < b ? 1 : 2` (at `<b`, the same-line boundary fires →
truncates RHS at `a`).

[step-11-0b survey-failure-shapes] Probe (`_probe_step11_0b.mjs`)
confirms 7 distinct failure shapes today:
1. `${ <count>=0\n<name>=""\n<items>=[] }` → 1 state-decl, init eats sibs.
2. `${ <a>=0\n<b>=1; <c>=2\n<d>=3 }` → 2 state-decls (a + c), both with
   eaten siblings.
3. `${ <count>=0\n const <doubled>=@count*2\n<name>="" }` → 2 state-decls
   (count parses OK because `const` STMT_KEYWORD breaks; doubled then
   eats `<name>` because `tryParseStructuralDecl` for derived calls
   `collectExpr` without compoundBody flag).
4. `${ <items>=[1,2,3]\n<count>=0 }` → array literal + sibling eaten.
5. `${ <data>={a:1,b:2}\n<count>=0 }` → object literal + sibling eaten.
6. `${ <result>=compute(\n a,b\n)\n<count>=0 }` → multiline call + eaten.
7. `${ let x=1\n<y>=0 }` → let-decl init eats `<y>`.

[step-11-0b survey-non-regression-cases] These MUST remain working:
1. `${ <count>=0; <name>=""; <items>=[] }` — semicolons (works today).
2. `${ <userName>=<input\n type="text"/> }` — Shape 2 markup multi-line
   (works because `parseLiftTag` handles markup — collectExpr never sees it).
3. `${ <x>=@a +\n@b }` — multi-line legitimate expression (`+` does not
   end a value, lastEndsValue=false, ASI-NEWLINE doesn't fire).
4. `${ <x>=a < b ? 1 : 2 }` — same-line comparison (no newline crossed).
5. `${ <name req>=<input/>\n<count>=0 }` — Shape 2 + sibling decl (Shape 2
   uses parseLiftTag — markup ends correctly; siblings are then on a new
   line in the SHAPE 1 path).

[step-11-0b survey-design-decision] **Approach: extend the existing
ASI-NEWLINE rule (L1959-1985) to also fire on `<` PUNCT followed by IDENT
when `scanStructuralDeclLookahead()` confirms state-decl shape.**

Why this approach:
- Fires ONLY on cross-line newline (`tok.span.line > lastTok.span.line`),
  preserving same-line `a < b` comparisons.
- Requires `lastEndsValue` (last token ends a value), so multi-line
  expressions like `@a +\n@b` are not truncated.
- Uses `scanStructuralDeclLookahead()` to confirm the `<` truly opens a
  state-decl — preventing premature break on `<` followed by something
  unrelated (e.g., text content `<` from an html-fragment leak).
- Generalizes to ALL collectExpr call sites (let-decl, fn-body, if-body,
  etc.), not just state-decl RHS — fixing the broader ASI gap as a
  free side-benefit.

Why NOT extend `compoundBody` to top-level:
- compoundBody fires same-line; would break `a < b` comparisons.

Why NOT thread a new top-level-only flag:
- Cleanly works for state-decl RHS but doesn't fix the let-decl /
  bare-expr gap (probe Tests 1+7 from `_probe_let.mjs`).

[step-11-0b survey-discount-9-status] **NOT discount #9.** Survey
confirms genuine source change required — `collectExpr` boundary
extension. The Step 11.0a `compoundBody` mechanism is RELATED but NOT
identical (no newline gate, fires inside compounds only). The new rule
is independent — it lives in the ASI-NEWLINE branch, requires newline-cross,
and uses `scanStructuralDeclLookahead` for shape confirmation.

[step-11-0b survey-call-site-impact] All 4 `tryParseStructuralDecl` call
sites benefit automatically — they all eventually call `collectExpr` for
Shape 1/3 RHS at L3156. Top-level Shape 3 (const) RHS collection: fixed.
Top-level Shape 1 (plain) RHS collection: fixed. parseOneStatement
(function-body) Shape 3/1 RHS: fixed. The fix is universal.

## Plan

1. Extend `collectExpr`'s ASI-NEWLINE branch (L1959-1985) to also detect
   `<` PUNCT + IDENT at start-of-newline as a state-decl boundary. Use
   `scanStructuralDeclLookahead()` for shape confirmation.
2. Add ~8 positive test cases covering:
   - Shape 1 multi-decl newline-separator (kickstarter §3.1)
   - Shape 3 const + Shape 1 mixed
   - Shape 1 with array/object/multiline-call init + sibling
   - mixed `;` + newline separators
   - let-decl + state-decl newline (broader ASI fix)
3. Add regression-baseline assertions:
   - multi-line legit expr `<x> = @a +\n@b` (still ONE decl)
   - Shape 2 markup-RHS multi-line (still works via parseLiftTag)
   - same-line `a < b` comparison inside RHS (no false break)
4. Anti-html-fragment guard on every positive case.
5. Flip Step 11 anti-test memorials with `TODO[step-11.0b]` markers in
   `kickstarter-v2-smoke.test.js`.

## Implementation log

[step-11-0b impl-collectExpr-extension] Edit
`compiler/src/ast-builder.js` `collectExpr` (around L1985, immediately
after the existing ASI-NEWLINE branch). New branch fires on:
  - `lastEndsValue` (set by the existing ASI-NEWLINE block above)
  - tok is `<` PUNCT followed by IDENT
  - `scanStructuralDeclLookahead()` returns non-null (state-decl shape)
On match → break. Implementation: ~30 LOC + extensive comments
explaining disambiguation cases.

The lookahead delegate `scanStructuralDeclLookahead()` handles:
  - Shape 1/2/3 (`<NAME validators? default? pinned?> =`)
  - Variant C compound (`<NAME>` + `<` IDENT or `</`)
  - Fused `<NAME>=` (no-whitespace form)

Net change: 1 file modified, ~30 LOC added in `collectExpr`. NO change
to call sites or `tryParseStructuralDecl` — fix is universal across
all `collectExpr` callers.

[step-11-0b impl-test-status] After source change, probes confirm:
  - 7 of 7 target failure shapes from survey now produce expected
    multi-decl AST shapes.
  - 5 of 5 regression cases (Shape 2 multi-line, multi-line legit
    expr, same-line `a < b`, etc.) preserved.
  - Pre-existing limitation: compound-child Shape 1 RHS with same-line
    `a < b` comparison still declines (Step 11.0a's compoundBody flag
    has a same-line gate, not changed by 11.0b). Not in scope.

[step-11-0b impl-flip-memorial] Flipped `§K11.X-D2 →
§K11.2A` (1 anti-test memorial in `kickstarter-v2-smoke.test.js`).
Baseline `§K11.X-D2b` and `§K11.X-D2c` renamed to `§K11.2A-b` and
`§K11.2A-c`. Top-of-file divergence comment block updated to mark
§K11.2A as RESOLVED. Three internal comment refs to
`§K11.X-DIVERGENCE-2` updated to point to `§K11.2A`.

After flip: kickstarter smoke 23/23 pass; full bun test 8853/8896
(no delta because flipped memorial replaces the old test 1:1).

[step-11-0b impl-positive-cases] Added 11 new positive + regression
cases to `parse-shapes-v0next.test.js` in a new
`A1a Step 11.0b — newline-as-statement-separator` describe block:
  - §S11B.1: 2 Shape 1 decls newline-separated (kickstarter §3 form)
  - §S11B.2: 4-decl block mixing Shape 1 + Shape 3 derived
  - §S11B.3: mixed `;` + newline separators
  - §S11B.4: REGRESSION — Shape 2 markup-RHS multi-line preserved
  - §S11B.5: REGRESSION — multi-line legit expr `@a +\n@b` preserved
  - §S11B.6: REGRESSION — same-line `a < b` comparison preserved
  - §S11B.7: Shape 1 with array-literal init + sibling decl
  - §S11B.8: Shape 1 with multiline call init + sibling decl
  - §S11B.9: REGRESSION — single Shape 1 plain decl unchanged
  - §S11B.10: Shape 2 + validators + newline + Shape 1 sibling
  - §S11B.11: let-decl + state-decl newline (broader ASI-fix benefit)

Every positive case fires `assertNoHtmlFragmentMatching` per BRIEF §5
DoD §6.

[step-11-0b impl-full-test-run] `bun run test` after all changes:
**8,864 pass / 43 skip / 0 fail / 8,907 across 439 files**. Delta
from baseline 8,853 → 8,864 = **+11 pass**. Composition:
  - 1 anti-test memorial FLIPPED (count stayed at 23 in kickstarter
    smoke — in-place edit, not new). The flipped test now ALSO has
    additional positive assertions (init values, shape, anti-html-
    fragment guard), so its expect() count went from 4 → 8.
  - 11 NEW positive cases added (S11B.1-S11B.11 in parse-shapes).
  - 0 regressions, 0 fails, 43 skip stable.

Within BRIEF target of +6-10 pass + memorial flips (slightly above).

## Final summary

**Files modified (1 source + 2 tests):**
  - `compiler/src/ast-builder.js` — `collectExpr` ASI-NEWLINE
    state-decl-shape boundary extension (~30 LOC).
  - `compiler/tests/integration/kickstarter-v2-smoke.test.js` — 1
    anti-test memorial flipped to positive assertion (renamed
    `§K11.X-D2/D2b/D2c` → `§K11.2A/A-b/A-c`); top-of-file divergence
    comment block updated; 3 in-file comment refs updated.
  - `compiler/tests/integration/parse-shapes-v0next.test.js` — 11
    new positive + regression cases (§S11B.1-§S11B.11) in a new
    §S11B describe block.
  - `docs/changes/phase-a1a-step-11-0b-newline-separator/progress.md`
    — survey + implementation log + final summary.

**Tier classification:** T2 (single-subsystem, parser-internal,
behavior change tied to AST shape — extends statement-boundary
detection in `collectExpr`).

**Survey verdict — depth-of-survey discount #9 status:** **NOT a
Discount.** Survey confirmed the boundary extension genuinely needed
source code; the existing `compoundBody` flag (Step 11.0a) covered
only inside-compound-body recursive calls — top-level `${...}` body
state-decl RHS collection had NO boundary on `<` IDENT after newline.
The fix landed at ~30 LOC source + ~225 LOC tests.

**Step 11.0a interaction:** `compoundBody` flag (Step 11.0a) and
`ASI-NEWLINE state-decl shape extension` (Step 11.0b) coexist and
do not overlap. compoundBody fires same-line, no newline gate, ONLY
inside compound bodies. The new ASI-NEWLINE extension fires only
across newlines, EVERYWHERE, gated on `lastEndsValue`. The two are
complementary — together they cover compound and top-level decl
boundaries.

**Multi-line legitimate expression preservation:** confirmed via
§S11B.5 (`<x> = @a +\n@b` remains ONE decl). The `+` operator does
not satisfy `lastEndsValue`, so the new boundary check does not
fire.

**Markup-RHS angleDepth preservation:** confirmed via §S11B.4 (Shape
2 `<x> = <input\n type="text"/>` remains ONE decl-with-spec). Markup
is parsed by `parseLiftTag`, not `collectExpr`; the parser correctly
handles multi-line markup attributes.

**Memorial flips:** 1 `TODO[step-11.0b]` marker flipped in
`kickstarter-v2-smoke.test.js`. The marker's positional anti-test
became a positional positive assertion + 4 added behavioral checks +
anti-html-fragment guard. The 4 remaining `TODO[step-11.0c]` markers
(D3a/D3b for typed-decl recognizer) stay as memorials — Step 11.0c
territory.

**Self-host parity:** N/A — no codegen change. The state-decl AST
shape is unchanged (init field still strings, all existing fields
preserved). Compiled JS output for any sample using only semicolon
separators is identical. Samples using newline separators previously
had subsequent decls eaten as text — now they parse to multiple
state-decl AST nodes, which downstream stages handle uniformly.

**Path-discipline near-misses:** None. All Reads/Writes/Edits used
absolute paths under
`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac614d408e5dac169/...`.
Three `_probe_*.mjs` files were created in worktree root for AST
shape verification, then deleted before any commit included them.

## Branch + commit hygiene

WIP commits on `phase-a1a-step-11-0b-newline-separator`:
  - `dc74cb3` — WIP: survey notes (collectExpr ASI-NEWLINE extension)
  - `cad7e8a` — WIP: collectExpr ASI-NEWLINE state-decl boundary +
    flip K11.X-D2 memorial
  - (next) — WIP: §S11B positive + regression cases (11 tests)
  - (next) — final: compile(a1a-step-11-0b) — newline-as-stmt-sep
    for state-decls

## Tags

#phase-a1a #step-11-0b #newline-separator #collectExpr #ASI-NEWLINE
#parser-only #t2 #not-discount-9 #flipped-anti-test
#step-11-escalation #kickstarter-v2-§3

## Links

- Brief: `docs/changes/phase-a1a-step-11-0b-newline-separator/BRIEF.md`
- Step 11 escalation context: `docs/changes/phase-a1a-step-11-compound-render-smoke/progress.md` lines 105-213
- Step 11.0a predecessor: `docs/changes/phase-a1a-step-11-0a-compound-recognizer/progress.md`
- AST contract §1.1: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` lines 18-46
- SPEC §6.1 V5-strict: `compiler/SPEC.md`
- SPEC §6.3 Variant C compound: `compiler/SPEC.md` lines 1828-1894
- Kickstarter v2 §3: `docs/articles/llm-kickstarter-v2-2026-05-04.md` lines 132-249
- Touchpoint — boundary extension: `compiler/src/ast-builder.js`
  `collectExpr` at L1784 (ASI-NEWLINE branch around L1985-2030)
- Touchpoint — lookahead reuse: `compiler/src/ast-builder.js`
  `scanStructuralDeclLookahead` at L3203
- Tests flipped: `compiler/tests/integration/kickstarter-v2-smoke.test.js`
  §K11.2A + §K11.2A-b + §K11.2A-c (was §K11.X-D2/D2b/D2c)
- Tests added: `compiler/tests/integration/parse-shapes-v0next.test.js`
  §S11B.1-§S11B.11
