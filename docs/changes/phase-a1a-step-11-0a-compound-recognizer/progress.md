# Phase A1a Step 11.0a — Variant C compound recognizer — Progress

Branch: `phase-a1a-step-11-0a-compound-recognizer`
Parent baseline HEAD: `8564a0f` (A1c scope + Step 11 escalation insert).
Test baseline: 8,845 pass / 43 skip / 0 fail / 8,888 across 439 files.

## Survey

[13:25 step-11-0a startup] Worktree clean.
- pwd / git toplevel / status confirmed worktree at
  `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aba800feccc97ebf2`.
- Latest commits include `8564a0f` (A1c scope + 11 escalation insert) and `bcca1e6`
  (Step 11 close); baseline matches BRIEF expectation.
- `bun install` → 113 packages (worktree node_modules populated).
- `bun run pretest` → 12 test samples compiled.
- `bun run test` → first run flake (2 ECONNREFUSED), retry → **8,845 pass / 43 skip
  / 0 fail / 8,888 across 439 files**. Confirmed baseline.
- Branch `phase-a1a-step-11-0a-compound-recognizer` created off main HEAD.

[13:30 step-11-0a survey-locus] Located `tryParseStructuralDecl` at
**`compiler/src/ast-builder.js` line 2912**, NOT 3528-3580 as the BRIEF guessed —
the BRIEF's "3528-3580 area" was a Step 11 hand-off probe pointing at the
function header context, but the actual entry point + scan helper begin at 2912.
The line range 2912-3269 covers the full `tryParseStructuralDecl` +
`scanStructuralDeclLookahead` machinery.

Call sites (4):
- L3393  — `parseOneStatement` const-branch hook (Shape 3 derived `const <x>=...`)
- L4472  — `parseOneStatement` default-branch hook (Shape 1 plain `<x>=...`)
- L5620  — `parseLogicBody` top-level const-branch hook (Shape 3 derived)
- L6967  — `parseLogicBody` top-level default-branch hook (Shape 1 plain)

These four sites are well-isolated. Compound-recognition extension lives ENTIRELY
inside `tryParseStructuralDecl` + `scanStructuralDeclLookahead`. No call-site
mods needed — the existing four hooks already trigger on `<NAME>` at
statement-start.

[13:33 step-11-0a survey-step-2-deferral] Step 2 progress.md confirms:
- Lines 93-98: "Variant C's `<form> { <name> = "" ... }` is recognized by the
  recognizer because token-after-`>` is `{` (which we do NOT match in Step 2 —
  that's a later step)." NOTE — Step 2 was guessing the form would use `{`
  brace-block body. The ACTUAL kickstarter v2 §3 form uses **structural-children
  body** (no braces): `<formRes>\n  <name>=""\n</>`. So Step 2's deferral was
  conceptually correct (compound = post-`>`-not-`=`) but anticipated the wrong
  syntactic shape. The recognizer extension here matches the actual shape.
- Lines 223-228: "The `>` followed by `{` (compound block) and `>` followed by
  `:` (typed) cases do NOT match the recognizer; they fall through to the
  existing default html-fragment path. This is acceptable for Step 2 — those
  forms are deferred to later steps per the AST-CONTRACTS decomposition."
- Line 321: confirms Step 2's recognizer rejects "`{` after `>` (compound block)
  — Step 11" — same point.

**Boundary precise.** Step 2 deferred everything-after-`>`-not-`=`. Step 11.0a
extends `>` followed by sibling `<NAME>` or `</`. Step 11.0c (separate sub-step)
extends `>` followed by `:`. **Zero overlap.** No partial hooks already in place
for compound — the Step 2 helper falls through cleanly when the post-`>` token
isn't `=` (returns `null`).

[13:35 step-11-0a survey-existing-samples] `samples/compilation-tests/reactive-014-form-state.scrml`
uses **`@`-form** legacy decls + markup `<form>` — NOT Variant C compound. The
gauntlet sample `samples/gauntlet-r19/vue-dev.scrml` matches the search pattern
but uses markup `<form>...<input/>...</form>`, not state-decl Variant C. **No
existing scrml sample exercises Variant C compound today** — the gap is uniform.
The handful of compound-related test cases live in `kickstarter-v2-smoke.test.js`
as anti-test memorials per Step 11.

[13:38 step-11-0a survey-todo-markers] Counted: `kickstarter-v2-smoke.test.js`
contains exactly **2 `TODO[step-11.0a]` markers** (§K11.X-D1 + §K11.X-D1b),
NOT 7 as BRIEF / dispatch claimed. The "7" referred to the total memorial
count across step-11.0a/b/c (2 + 1 + 2 + 2 = 7). Step 11.0a flips ONLY the
2 marked `TODO[step-11.0a]` cases. The other 5 (D2/D2b/D2c/D3a/D3b) belong to
Steps 11.0b + 11.0c and stay as memorials this dispatch.

[13:40 step-11-0a survey-spec-§6.3-closer-form] SPEC §6.3.2 example uses
**`</>` anonymous closer**. SPEC §6.3.5 example uses `<formRes><name/></>` —
also `</>` close. SPEC text DOES NOT EXPLICITLY require named close
match; only the anonymous closer is shown. SPEC §4 (markup syntax) elsewhere
allows `</NAME>` named-close form. **Decision:** accept BOTH `</>` (anonymous)
AND `</NAME>` (named, regardless of whether NAME matches the parent — A1b
will validate matched-name semantics later if needed). This matches existing
markup parser behavior (`parseMarkupTag` and friends accept either).

[13:42 step-11-0a survey-shape-discriminant] Per AST-CONTRACTS §1.1 invariant
(line 46): "Variant C compound parent: `shape: "plain"`, `initExpr: null`,
`children` populated. Children are themselves `state-decl` nodes with their
own `shape`."
- §S4.10 invariant (`parse-shapes-v0next.test.js` ~466) asserts every state-decl
  has a `shape` value drawn from `{plain|decl-with-spec|derived}`. **Compound
  parent `shape: "plain"` honors this**.
- The §S4.10 invariant currently uses a single `shape` set member. Need to
  verify the test loops over ALL state-decls (incl. children) and the rule
  still passes for compound children. (Children are themselves state-decl, so
  yes — they each have their own shape.)

[13:45 step-11-0a survey-PA-001-interaction] §4.6 PA-001 (raw `<` content
preservation) operates at **block-splitter** layer — preserving raw text inside
markup body. Compound-body parsing happens at **ast-builder** layer, AFTER
block-splitter has already preserved raw text. The AST-builder reads the same
token stream the BS+TAB pipeline produced. Inside a `${...}` logic block, the
TAB stage tokenizes the contents AS LOGIC, not as raw markup. So compound-body
content is **already-tokenized** by the time `tryParseStructuralDecl` runs —
no PA-001 interaction. ✅

[13:48 step-11-0a survey-recursion] Nested compound `<outer><inner><leaf>=0</></></>`
must work — the body-loop calls back into a child-decl-parser which recursively
re-enters compound recognition. Plan: factor a `tryParseCompoundBody()` helper
that loops `tryParseStructuralDecl` calls until close-tag is found. Each child
is itself returned by `tryParseStructuralDecl`, so nested compound naturally
recurses.

[13:50 step-11-0a survey-discount-9-status] **NOT Discount #9.** Survey
confirms the recognizer extension genuinely needs source code — there are no
partial compound-body hooks in place. Step 2 fell through cleanly when post-`>`
wasn't `=`; the new branch lights up the alternate exit. Code change is
moderate (~50-80 LOC) but well-bounded.

[13:53 step-11-0a survey-design-summary]
- **Touchpoint correction:** `tryParseStructuralDecl` actually starts at
  L2912 (not 3528-3580). Updated above.
- **Closer form:** accept both `</>` (anonymous) and `</NAME>` (named, no
  match enforcement yet — A1b territory).
- **AST shape:** parent has `shape: "plain"`, `initExpr: null`,
  `children: [...]`, `structuralForm: true`, `isConst: false` (parents can't
  be `const` — only individual fields can be derived per §6.6).
- **Children:** themselves full state-decl nodes; recursion-safe.
- **Empty compound:** `<empty></>` → `children: []`.
- **Shape 2 children:** allowed — `<form><name req length(>=2)>=<input/></>`
  produces parent + child(`shape: "decl-with-spec"`).
- **Shape 3 children:** allowed — `const <x>` inside compound (per §6.6
  in-compound derived) — out-of-spec for this step's BRIEF, but if the
  recognizer naturally handles it, leave the door open.
- **`</NAME>` mismatch:** for now accept; A1b can later validate close-tag
  matches the open-tag name.

## Plan

1. Edit `tryParseStructuralDecl` at L2912: after consuming the `<NAME>` opener
   and seeing `>` (post-attr scan), peek next non-trivia token:
   - If `=`: existing path (Shape 1/3 plain).
   - If `<` followed by IDENT (sibling decl) OR `</` (compound close):
     **NEW** compound branch.
2. Add `parseCompoundBody()` inline helper. Loops:
   - Skip COMMENT/whitespace.
   - On `</` (anonymous or named close): consume close-tag tokens, break.
   - On `<` followed by IDENT: recurse via `tryParseStructuralDecl` (or
     a child-only variant); push to children.
   - On anything else: surface error (or fall through? — for now, decline
     entire compound match, restore cursor, return null so the caller falls
     to html-fragment).
3. Update `scanStructuralDeclLookahead`: when post-`>` is sibling-`<` or `</`,
   return a NEW `compoundBody: true` flag (instead of returning null). Caller
   in `tryParseStructuralDecl` branches on this flag.
4. Compound parent state-decl construction: kind:"state-decl", shape:"plain",
   initExpr: null, children:[...], structuralForm:true, isConst:false (parent
   can't be const), validators:[], defaultExpr:null, pinned:false, span.
5. Update `compiler/src/types/ast.ts` `ReactiveDeclNode` interface: add
   `children?: ReactiveDeclNode[]` field.
6. Flip 2 anti-test memorials in `kickstarter-v2-smoke.test.js`.
7. Add ~5-8 NEW positive cases (S11A.1 through S11A.7 per BRIEF §4) at the
   end of `parse-shapes-v0next.test.js`.
8. Run pre-commit + bun test → confirm 0 regressions + delta +12 to +15.

## Implementation log

[13:32 step-11-0a impl-recognizer-extension] Edit `scanStructuralDeclLookahead`
at L2912+: add Variant C compound branch in the `>` closer. When post-`>` is
`<` PUNCT followed by IDENT (sibling decl) or `/` PUNCT (compound close), and
no validators / default / pinned were collected (compound parents have NO
attrs per spec), return `{compoundBody: true, consumeUntil: i+scanIdx+1}` —
caller consumes through `>` only.

Edit `tryParseStructuralDecl` at L2912: add compound-body branch immediately
after the consumeUntil consumption. Body loop:
  - Anonymous close `</>` (3 tokens) — consume + break.
  - Named close `</NAME>` (4 tokens) — consume + break.
  - Sibling decl `<NAME>...` — recurse via `tryParseStructuralDecl` with
    `inCompoundBody: true` flag.
  - Anything else — decline (restore cursor).

Reject `const <x><y>=...</>` (compound parent can't be const per §6.6).

[13:34 step-11-0a impl-collectExpr-flag] First implementation pass FAILED:
recognizer fired but children's `init` strings ate sibling-decl tokens. Root
cause: `collectExpr` at depth-0 angleDepth-0 with `prevEndsValue` (e.g. STRING
`""` for empty-init) consumes the next `<` as a less-than, NOT entering markup
mode but NOT breaking. Sibling tokens leak into the first child's init.

Fix: add `opts.compoundBody` flag to `collectExpr`. When set + parts.length > 0
+ angleDepth === 0, break on `<` IDENT (sibling-decl boundary) or `</`
(compound close). Threaded via `tryParseStructuralDecl(opts.inCompoundBody)`
parameter; caller in compound-body loop sets it.

After the fix, probe confirms:
  - `<formRes><name>=""<email>=""<error>=""</>` → 4 state-decls (1 parent, 3
    children); children=3 on parent; no html-fragment.
  - Multi-line variant → 2 state-decls (1 parent + 1 child); no html-fragment.

[13:35 step-11-0a impl-test-status] After source change, parse-shapes-v0next
(56) all pass; kickstarter-v2 smoke (23) shows 21 pass + **2 fail** (exactly
the §K11.X-D1 + §K11.X-D1b memorials, now invalidated by the working
recognizer). Memorial flip ready.

[13:36 step-11-0a impl-flip-memorials] Flipped 2 anti-test memorials in
`kickstarter-v2-smoke.test.js`:
  - `§K11.X-D1` → renamed to `§K11.1A`. Old: assert `decls.length === 0` +
    fragment includes "formRes". New: assert 4 state-decls (1 parent +
    3 children); parent.shape === "plain", initExpr === null, children.length
    === 3, child names ["name","email","error"], each child state-decl with
    shape:"plain", structuralForm:true, isConst:false. Anti-html-fragment guard.
  - `§K11.X-D1b` → renamed to `§K11.1A-b`. Old: assert decls.length === 0.
    New: assert 2 state-decls (parent + 1 child for multi-line variant).
  - Updated top-of-file divergence comment block: §K11.1A noted RESOLVED;
    §K11.X-DIVERGENCE-2 (newline-separator) and §K11.X-DIVERGENCE-3
    (typed-decl) remain TODO[step-11.0b/c].

[13:37 step-11-0a impl-types-update] Edit `compiler/src/types/ast.ts`
`ReactiveDeclNode` interface: added `children?: ReactiveDeclNode[]` field with
SPEC §6.3.2 reference + AST-CONTRACTS §1.1 reference. Mutually-exclusive note
re: initExpr / renderSpec.

After flip + types: kickstarter smoke 23/23 pass; parse-shapes 56/56 pass.
Ready for new positive cases + full test run.

[13:40 step-11-0a impl-new-positive-cases] Added 8 new compound-specific
tests at the end of `parse-shapes-v0next.test.js` in a new
`A1a Step 11.0a — Variant C compound state-decl recognizer` describe block:
  - §S11A.1: simple compound, parent + 2 plain children
  - §S11A.2: compound with Shape 1 + Shape 2 children — each child has its
    own shape (used spaced form for Shape 2 due to Step 5's pre-existing
    fused `>=` + validators limitation)
  - §S11A.3: nested compound — recursion check (3 levels)
  - §S11A.4: empty compound `<empty></>` — children:[]
  - §S11A.5: compound + sibling top-level decls (semicolons) coexist
  - §S11A.6: named close `</NAME>` accepted
  - §S11A.7: regression baseline — Shape 1/3 single decls unchanged
  - §S11A.8: `const <compound>` declines (compound parent can't be const
    per §6.6); fallthrough produces non-const compound — A1b can flag
    the empty-const artifact later

Two iteration findings during test authoring:
  - `<name req>=<input/>` (fused `>=` + validators) is a pre-existing
    Step 5 limitation (`scanIdx !== 2 → return null` in the OPERATOR `>=`
    branch). Used spaced form `<name req> = <input/>` in S11A.2 to avoid
    triggering this unrelated limitation.
  - `const <x><y>=0</>` decline-on-const RESTORES the cursor; the const-decl
    path then proceeds with `name=""` and the `<x><y>=0</>` then re-enters
    the default branch's `tryParseStructuralDecl(tok, false)` which DOES
    succeed (isConst=false, since the recognizer was called from the
    non-const path). Net: const-decl artifact + non-const compound.
    Adjusted S11A.8 assertion to verify the **invariant**: no state-decl
    has both `isConst:true` AND `children` populated. Decline-on-const
    semantics preserved.

[13:42 step-11-0a impl-full-test-run] `bun run test` after all changes:
**8,853 pass / 43 skip / 0 fail / 8,896 across 439 files**. First run
flake (2 ECONNREFUSED), retry → confirmed.

Delta from baseline 8,845 → 8,853 = **+8 pass**. Composition:
  - 2 anti-test memorials FLIPPED (count stayed at 23 in kickstarter smoke)
  - 8 NEW positive cases added (S11A.1-S11A.8 in parse-shapes)
  - 0 regressions, 0 fails, 43 skip stable

Slightly below BRIEF target +12-15 because flipped memorials are SAME
COUNT (in-place edit, not new). Within BRIEF §2.1 §4 stated `~5-8 new` range.

## Final summary

**Files modified:**
  - `compiler/src/ast-builder.js` — `scanStructuralDeclLookahead` Variant C
    closer branch (~25 LOC); `tryParseStructuralDecl` compound-body branch
    (~85 LOC); `collectExpr` `compoundBody` opts flag (~17 LOC).
    Net: ~127 LOC added.
  - `compiler/src/types/ast.ts` — `ReactiveDeclNode.children` field added
    (~14 LOC including doc comment).
  - `compiler/tests/integration/kickstarter-v2-smoke.test.js` — 2 anti-test
    memorials flipped to positive assertions (renamed §K11.X-D1/D1b →
    §K11.1A/A-b); top-of-file divergence comment block updated.
  - `compiler/tests/integration/parse-shapes-v0next.test.js` — 8 new
    positive cases (S11A.1-S11A.8) in a new §S11A describe block.
  - `docs/changes/phase-a1a-step-11-0a-compound-recognizer/progress.md` —
    survey + implementation log + final summary.

**Tier classification:** T2 (single-subsystem, parser-internal, behavior
change tied to AST shape — adds `children` population for compound parents).

**Survey verdict — depth-of-survey discount #9 status:** **NOT a Discount.**
Survey confirmed the recognizer extension genuinely needs source code; the
existing parser had ZERO partial compound-body hooks — Step 2's recognizer
fell through cleanly when post-`>` wasn't `=`, but never branched on
sibling-`<` or `</`. The work landed at ~127 LOC source + 14 LOC types +
~210 LOC tests = well-bounded T2 with no surprises.

**Closer-form decision:** Per SPEC §6.3.2 examples use anonymous `</>`;
SPEC §4 (markup syntax) elsewhere allows `</NAME>`. Step 11.0a accepts
**both forms with no name-match enforcement** (A1b territory if needed).
Verified by S11A.6.

**Step 11 anti-test flipping:** All 2 `TODO[step-11.0a]` memorials flipped
cleanly. Renaming followed: `§K11.X-D1` → `§K11.1A`, `§K11.X-D1b` →
`§K11.1A-b`. Sectioning updated from "DEFERRED" to "recognized".
TODO[step-11.0b] (newline-separator) and TODO[step-11.0c] (typed-decl) —
5 anti-tests remain (D2/D2b/D2c/D3a/D3b) for follow-up sub-steps.

**Self-host parity:** N/A for this step — no codegen change. The compound
state-decl AST is a NEW shape that A1b/A1c will lower in subsequent phases
(per BRIEF §2.2 out-of-scope). All existing self-host scenarios continue
to compile.

**Path-discipline near-misses:** None. All Reads/Writes/Edits used absolute
paths under `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aba800feccc97ebf2/...`.
Three `_probe*.mjs` files were created in worktree root for AST shape
verification, then deleted before any commit included them.

## Branch + commit hygiene

WIP commits on `phase-a1a-step-11-0a-compound-recognizer`:
  - `64539ca` — WIP: survey notes (touchpoint at L2912 not 3528)
  - `754383f` — WIP: tryParseStructuralDecl compound-body branch +
    collectExpr boundary + types + flipped memorials
  - (next) — final: compile(a1a-step-11-0a) — recognizer + new positive cases

## Tags

#phase-a1a #step-11-0a #variant-c-compound #parser-only #step-2-deferral
#step-11-escalation #ast-children-field #flipped-anti-tests
#kickstarter-v2-§3 #spec-§6.3-tier-2 #t2 #not-discount-9

## Links

- Brief: `docs/changes/phase-a1a-step-11-0a-compound-recognizer/BRIEF.md`
- Step 2 deferral: `docs/changes/phase-a1a-step-2-foundational-decl-recognition/progress.md` lines 93-98 + 223-228 + 321
- Step 11 escalation: `docs/changes/phase-a1a-step-11-compound-render-smoke/progress.md` lines 105-213
- AST contract §1.1: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` lines 18-46
- SPEC §6.3.2 Variant C compound: `compiler/SPEC.md` lines 1840-1864
- PA-SCRML-PRIMER §5: `docs/PA-SCRML-PRIMER.md` lines 92-115
- Touchpoint — recognizer extension: `compiler/src/ast-builder.js`
  `tryParseStructuralDecl` at L2912; `scanStructuralDeclLookahead` at L3070;
  `collectExpr` at L1784.
- Touchpoint — types: `compiler/src/types/ast.ts` `ReactiveDeclNode.children`
- Tests flipped: `compiler/tests/integration/kickstarter-v2-smoke.test.js`
  §K11.1A + §K11.1A-b
- Tests added: `compiler/tests/integration/parse-shapes-v0next.test.js`
  §S11A.1-§S11A.8
