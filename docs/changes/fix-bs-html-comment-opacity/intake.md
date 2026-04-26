# fix-bs-html-comment-opacity — Intake

**Surfaced:** 2026-04-26 (S44), by the Bug O dispatch agent (`worktree-agent-afa8f0d07540f0697`) during investigation of the duplicate-`_scrml_meta_effect` anomaly in 6nz Bug O's repro.
**Status:** RECEIVED with reproducer; verified reproducing on main. Queued for triage.
**Source dispatch:** `docs/changes/fix-meta-effect-loop-var-leak/bonus-bug-html-comment-meta-leak.md` (the agent's discovery doc, preserved in O's change dir as the audit-trail record).
**Tier:** **T2** (BS / block-splitter — same family as Bug L `fix-bs-string-aware-brace-counter`).
**Priority:** medium-low — phantom side-effect on module load. Severity is now low *because Bug O's fix landed*: the captured-scope object has clean bindings, so the phantom emission no longer crashes. **But** any HTML comment containing `^{ throw new Error(...) }` or any other side-effecting meta block would silently execute at module load. That's a real correctness gap — visible only when comments contain side-effecting sigils.

---

## Symptom

The block-splitter (`compiler/src/block-splitter.js`) treats HTML `<!-- ... -->` comments as plain text rather than as opaque comment spans. When the comment text contains a meta-sigil (`^{`, `?{`, `_ {`, `${`), the BS opens a real block context and emits a phantom block of the corresponding type.

### Verified case (Bug O dispatch's discovery)

The Bug O intake repro `2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml` ends with an explanatory `<!-- ... -->` comment containing the literal text `^{ init() }`. The compiler emits TWO `_scrml_meta_effect(...)` calls where the source has only ONE `^{ init() }` block — the second corresponds to the text inside the trailing HTML comment.

Variants confirming the diagnosis:
- `bug-o-no-trailing-comment.scrml` (source minus the trailing HTML comment) → exactly ONE `_scrml_meta_effect`.
- `bug-o.scrml` with the HTML comment preserved but its inner `^{ init() }` literal removed → exactly ONE `_scrml_meta_effect`.

### Generalization

Reproduces for ALL meta sigils inside HTML comments:
- `<!-- ^{ stuff } -->` → phantom meta block
- `<!-- ?{ select 1 } -->` → phantom sql block (suspected; needs verification)
- `<!-- _ { wasm } -->` → phantom foreign block (suspected)
- `<!-- ${ logic } -->` → phantom logic block (suspected)

## Trigger condition

HTML `<!-- ... -->` comment in source AND comment text contains a meta-sigil.

## Workaround

None at source-author level beyond "don't put scrml-sigil-shaped strings in HTML comments." Brittle and easy to violate (the Bug O repro's trailing `<!-- Tested against scrmlTS HEAD c51ad15... -->` comment block is a perfectly normal documentation pattern).

## Root-cause hypothesis (per source dispatch)

`compiler/src/block-splitter.js` handles `//` line comments (per §4.7 / PA-002 family) but does NOT handle `<!-- ... -->` HTML comments. HTML comment text is processed as ordinary character data. When BS encounters `^` (or any other meta-sigil) inside that text, it treats it as block entry.

Same family as Bug L (`fix-bs-string-aware-brace-counter`): BS isn't context-aware enough about opaque spans (strings, comments). A broader "BS opacity sweep" — string-aware + HTML-comment-aware + regex-aware + template-aware — might be the right scope rather than a one-off HTML-comment patch.

## Suggested fix scope (T2)

1. Locate the BS comment-handling code (`compiler/src/block-splitter.js` — search for "comment", `//`, line-comment-skipping).
2. Extend the same skip-mechanism to recognize `<!-- ... -->` and treat the entire span (including any nested-looking sigils) as opaque.
3. Decide whether comment content survives into the AST (as a `comment`-type block) or is stripped. Either is acceptable as long as the internal sigils do NOT open contexts.
4. Regression tests:
   - `<!-- ^{ stuff } -->` → NO phantom meta block
   - `<!-- ?{ select 1 } -->` → NO phantom sql block
   - `<!-- _ { wasm } -->` → NO phantom foreign block
   - `<!-- ${ logic } -->` → NO phantom logic block
   - `<!-- side-effect: ^{ throw new Error('boom') } -->` does NOT throw at module load
   - Standard HTML-comment edge cases: `<!-- <!-- -->` follows HTML semantics
   - Multi-line HTML comments
   - HTML comment immediately adjacent to a real meta block
5. Coordinate with Bug L's widened-scope plan if scoping a unified "BS opacity sweep" instead of a narrow HTML-comment patch.

## Reference

- Source dispatch's discovery doc: `docs/changes/fix-meta-effect-loop-var-leak/bonus-bug-html-comment-meta-leak.md`
- Repro fixture: `handOffs/incoming/read/2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml` (the trailing comment is the trigger)
- Bug O dispatch's anomaly-report: `docs/changes/fix-meta-effect-loop-var-leak/anomaly-report.md`
- Adjacent BS-context-awareness bug: `docs/changes/fix-bs-string-aware-brace-counter/` (Bug L family)

## Tags
#bug #compiler #block-splitter #html-comment #opacity #meta-block #t2 #surfaced-by-bug-o-dispatch #adjacent-to-bug-l
