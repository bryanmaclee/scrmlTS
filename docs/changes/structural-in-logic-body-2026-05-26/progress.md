# Structural-element silent-swallow in `${...}` logic-body — progress log

## Dispatch context

WORKTREE_PATH: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189
BRANCH: worktree-agent-a15f9bf0d9cccb189
BASE_SHA: 3a660c7c

## Phase 0 — empirical verify (DONE 2026-05-26)

Bug confirmed. 10 structural element kinds (schema, engine, channel, page, auth, errors, onTransition, onTimeout, onIdle, match) inside `${...}` logic body all produce **0 errors / 0 structural diagnostics** today. They are silently swallowed.

5 negative regression cases produce 0 structural errors as expected (only unrelated W-PROGRAM-SPA-INFERRED / E-DG-002 / W-PROGRAM-REDUNDANT-LOGIC noise).

**Phase 0 surfaced TWO discoveries beyond the brief:**

1. **Two fallback fire sites.** The brief named the inner `parseOneStatement` html-fragment fallback at line ~6444-6464. PROBE-INSTRUMENTED runtime showed the silent-swallow at the program-body level actually fires through the **OUTER `parseLogicBody` top-level loop fallback at line ~9670** — not the inner one. Both fallbacks share the same `isHtmlFragment(expr)` classifier and need the fix. The inner fallback fires only on nested structures (e.g. `${ if (true) { ${...} } }`).

2. **`tryParseStructuralDecl` mis-recognizes `<schema><users>...`.** The compound state-decl lookahead (Variant C, §6.3.2) matches `<NAME>` followed by `<...>` as a sibling-decl pattern, so `<schema><users>id int</></>` enters the compound branch. The recursive child decl on `<users>` fails (no `=` shape), so the parent declines and rewinds — falling through to the OUTER html-fragment fallback at line 9670.

Probe location: `/tmp/phase0-probe-structural/probe.mjs` (transient — not committed; results captured here + in commit messages).

## Phase 1 — architecture decisions (DONE 2026-05-26)

**Diagnostic code:** REUSE `E-STRUCTURAL-ELEMENT-MISPLACED` per PA lean. Per SPEC §34 row at line 16322, the code's documented semantic is "A scrml-defined structural element is used outside its owning locus" — exactly fits the parseLogicBody fallback case. SPEC update extends the row's "Specific cases" enumeration to include the new logic-body context.

**Detection site:** `compiler/src/ast-builder.js` parseLogicBody's two html-fragment fallback sites (inner `parseOneStatement` at line ~6503 + outer top-level loop at line ~9670). Tag-name extraction via regex on the collected `expr` string: `/^\s*<\s*([A-Za-z][A-Za-z0-9_-]*)\b/` matches the leading tag opener.

**Match table (9 entries, case-sensitive per §4.15):**
- `schema` (program-child; §39.2 / §39.12)
- `engine` (file top-level or state-child; §51 / §51.0)
- `channel` (program-child sibling of `<page>`; §38.1 / §38.3)
- `page` (program-child in multi-page apps; §40 / §40.8)
- `auth` (child of `<program>` / `<page>` / `<channel>`; §40.9.5 / §40.1.1)
- `errors` (parent supports it; §55.8)
- `onTransition` (child of `<engine>`; §51.0.H)
- `onTimeout` (engine state-child; §51.0.M)
- `onIdle` (engine root; §51.0.R)

**`<match>` is intentionally EXCLUDED** (post Phase-2 empirical scope-correction — see Phase 2 note).

**Negative-case guards confirmed:**
- HTML elements (`div`, `p`, `span`, …) — leading tag-name not in registry → no fire.
- Reactive-decl `<NAME> = expr` — caught upstream at `tryParseStructuralDecl` (line ~6440 / ~9645); never reaches fallback.
- Component element `<MyComponent>` — capitalized, registry uses lowercase scrml-defined names. Per SPEC §4.15: "Component names (PascalCase user types) and these scrml-defined element names are disjoint." No fire.
- Render-by-tag `<varname/>` — self-closing reactive cell render; lowercase but not in registry → no fire.
- Structural at canonical position — fallback only runs in `${...}` body; canonical placements use the markup-element / structural-decl path → no fire.
- Capitalized `<Schema>` — case-sensitive registry. No fire.
- Block-form `<match>` inside `${...}` markup-emit — explicitly excluded from kill-list per §1.4 L1 pillar. No fire.

**Message shape:** Per-element-kind specific message with the canonical placement cited from SPEC. Better adopter ergonomics than a generic message.

**AST shape stability:** After pushing the error, RETURN the html-fragment node anyway (so downstream stage shapes don't blow up). The error in `errors` carries the diagnostic.

## Phase 2 — impl (DONE 2026-05-26)

**Commit:** `601521ed` — fix(ast-builder): E-STRUCTURAL-ELEMENT-MISPLACED in `${...}` logic-body — closes silent-swallow.

**Implementation:**

1. Added module-level `STRUCTURAL_ELEMENT_PLACEMENT` table (9 entries) at `compiler/src/ast-builder.js:183` mapping each structural-declaration element name → canonical-placement message.
2. Added module-level `leadingTagName(expr)` helper at `compiler/src/ast-builder.js:214` returning the leading tag-opener name or null.
3. Gated the INNER fallback (`parseOneStatement`, line ~6503) with `leadingTagName(expr) in STRUCTURAL_ELEMENT_PLACEMENT` → push `E-STRUCTURAL-ELEMENT-MISPLACED` then continue to emit html-fragment node.
4. Gated the OUTER fallback (`parseLogicBody` top-level, line ~9720) with the same check.

**SCOPE CORRECTION SURFACED EMPIRICALLY (recorded in commit message):**

The brief's PA-lean kill-list included `<match>` (the 10th §4.15 entry). On initial impl run with `<match>` in the table, the **promote-safety-harness** test suite (`compiler/tests/unit/promote-safety-harness.test.js`) failed 3 tests. The `bun scrml promote --match` command (S66 SHIPPED) rewrites `if/else if` chains inside `${...}` to `<match>` blocks IN THE SAME `${...}` — the rewritten file failed sanity-check parsing because my fix flagged the legitimate post-rewrite shape as misplaced.

Per SPEC §1.4 (L1 pillar) + §18.0.1, **block-form `<match>` is markup-as-value** — grammatical wherever a value-yielding expression sits, including `${...}` markup-emit contexts. The 9 other §4.15 entries are declaration-shapes (state-machine def, channel/page/schema/auth decl, errors template, lifecycle handlers) — not markup-as-value.

`<match>` was removed from `STRUCTURAL_ELEMENT_PLACEMENT` with an inline NOTE comment + a doc-comment update clarifying the placement table covers 9 declarations (not 10 entries). The brief's kill-list of 10 collapsed to 9. Surfaced explicitly in both the impl commit message and the SPEC §34 row.

**Empirical verification post-fix:**
- 9 structural-declaration kinds in `${...}` body: all fire `E-STRUCTURAL-ELEMENT-MISPLACED` with element-specific canonical-placement messages.
- Inner-fallback fire (nested `${ if (...) { ${...} } }`): correctly fires (verified via deep-nested probe).
- 8 negative-regression cases: HTML elements, reactive-decl, PascalCase component, render-by-tag, canonical placement, capitalized `<Schema>`, block-form `<match>` in markup-emit — all produce 0 structural-element diagnostics.

## Phase 3 — tests (DONE 2026-05-26 — co-committed with impl per S113 coupled-code-test rule)

**File:** `compiler/tests/unit/structural-in-logic-body.test.js` — 19 tests.

**Layout:**
- §1.1-§1.9 — 9 structural kinds (schema/engine/channel/page/auth/errors/onTransition/onTimeout/onIdle) each fire `E-STRUCTURAL-ELEMENT-MISPLACED` with correct element name + §-anchor in the message.
- §1.10 — REMOVED + replaced with an inline comment explaining `<match>` is NOT in the kill-list (§3.8 carries the negative-regression).
- §2.1 — Inner-fallback fire (nested `${...}` inside an `if (true) {...}` body).
- §3.1-§3.8 — 8 negative regressions: HTML `<div>`, HTML `<p>`, reactive-decl, PascalCase `<MyComponent>`, render-by-tag, canonical `<schema>` at `<program>` child, capitalized `<Schema>`, block-form `<match>` in markup-emit.
- §4.1 — Multi-fire (two structural elements in separate `${...}` blocks each fire independently).

**Result:** 19 pass / 0 fail / 41 expect() calls.

## Phase 4 — SPEC update (DONE 2026-05-26)

**Commit:** `8af9bbf8` — docs(spec): §34 row for E-STRUCTURAL-ELEMENT-MISPLACED.

Extended the §34 row's "Specific cases" enumeration to include:
- "A structural-DECLARATION element (`<schema>` / `<engine>` / `<channel>` / `<page>` / `<auth>` / `<errors>` / `<onTransition>` / `<onTimeout>` / `<onIdle>`) appears inside a `${...}` logic body (S135 — silent-swallow class)"
- Explicit note that `<match>` is the 10th §4.15 entry but is intentionally NOT covered by this code in `${...}` context — block-form `<match>` is markup-as-value (§18.0.1 + §1.4 L1 pillar) and is canonical inside `${...}` markup-emit contexts.
- Sourcing annotation: "S135 amendment — `${...}` logic-body silent-swallow class closed; emitted at `compiler/src/ast-builder.js:parseLogicBody` html-fragment fallback sites."

No row-rename; reusing the existing code per its documented "used outside its owning locus" semantic. No new SPEC section added; the new fire condition is enumerated under the existing row's "Specific cases" pattern.

## Phase 5 — report

**FILES_TOUCHED:**
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189/compiler/src/ast-builder.js` — detection logic + STRUCTURAL_ELEMENT_PLACEMENT table + leadingTagName helper + gates at two fallback sites (+74 lines).
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189/compiler/tests/unit/structural-in-logic-body.test.js` — NEW; 19 tests covering 9 fires + inner-fallback + 8 negatives + multi-fire (+469 lines).
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189/compiler/SPEC.md` — §34 row extension for E-STRUCTURAL-ELEMENT-MISPLACED.
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a15f9bf0d9cccb189/docs/changes/structural-in-logic-body-2026-05-26/progress.md` — this forensic log.

**FINAL_SHA on worktree branch:** (see git status after Phase 5 commit)

**TESTS_BEFORE:** 14682 pass / 88 skip / 1 todo / 0 fail (S135 post-cherry-pick baseline, pre-commit gate scope).

**TESTS_AFTER:** 14701 pass / 88 skip / 1 todo / 0 fail (+19 new unit tests; zero pre-existing regressions).

**Architecture decision:** REUSE `E-STRUCTURAL-ELEMENT-MISPLACED` per PA lean (no new code needed).

**Maps consulted:** `.claude/maps/primary.map.md` — load-bearing finding: NOT load-bearing for this dispatch. The map's task-shape routing pointed at "Compiler-source bug fix" but the actual fix sites (parseLogicBody two fallbacks) were specified directly in the brief with exact line anchors. The map's stale-watermark advisory (HEAD `3a660c7c`, S135 has +8 commits since) matched the brief's note; ast-builder.js was unchanged in the +8 commits so line anchors held.

**STATUS:** COMPLETE.

**DEFERRED_ITEMS:** None surfaced; the bug class is closed for the named 9 elements. (See "Follow-ups surfaced" below for two related observations that do NOT belong to this dispatch.)

**Follow-ups surfaced but out-of-scope:**

1. **`${...}` inside `function probe() { ${...} }` parses differently** — Phase 0 probe ran into a separate issue where `${...}` inside a function body produces an E-SCOPE-001 for `$` (the `${` is being preprocessed to `$ {`). This is unrelated to the silent-swallow class and was not in the brief's scope. May warrant a separate investigation if adopters hit it.

2. **`tryParseStructuralDecl` compound-decl mis-recognition.** For `<schema><users>id int</></>` the lookahead enters the compound branch (Variant C) because `<schema>` followed by `<users>` matches the sibling-decl pattern. The recursive child parse declines (no `=` on `<users>`) so the parent rewinds and the html-fragment fallback catches it (where my fix lives). This works fine for the silent-swallow class but is mildly surprising — the compound-decl path is doing extra lookahead work for what's clearly a structural-element opener. Filing as a possible LOW-priority cleanup: short-circuit `tryParseStructuralDecl` early when the leading name is in the structural-element registry (saves the compound-decl exploration). Not done here per scope.

**NOTES:**

- The brief's specified line anchor (~line 6444-6464) was for the INNER `parseOneStatement` fallback. The empirical silent-swallow at program-body level fires through the OUTER `parseLogicBody` top-level loop fallback at line ~9670. Both sites needed the fix; both were patched.
- The brief's PA-lean kill-list of 10 included `<match>`. Per SPEC §1.4 + §18.0.1, block-form `<match>` is markup-as-value and canonical inside `${...}` markup-emit contexts (the `promote --match` canonical output, S66 SHIPPED). The 3 promote-safety-harness test failures empirically surfaced this; `<match>` was removed from the kill-list. The 9 remaining entries (declaration-shapes) are correctly classified.
- Per `feedback_coupled_code_test_commit` (S113): impl + tests landed in one commit (`601521ed`) since they're one logical unit. SPEC update is a separate commit (`8af9bbf8`) — separable from impl per its normative-doc nature.
- Maps consulted: `primary.map.md` (see Phase 5 STATUS block).
