# progress — ghost-lint-canonical-exempt-2026-06-11

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a2832c0fa6b0646a9
Branch: worktree-agent-a2832c0fa6b0646a9
Base HEAD: cf954570

## Step log (append-only)

- 2026-06-12T03:45:40Z START. Startup verification passed (pwd/toplevel/clean/bun install/pretest). Maps + SCOPE read.
- Reproduced both bugs:
  - FIX A (lint-ghost-patterns.js): snippet-fill `<Card body={ (label) => <p>...} />` fires W-LINT-007 (prop={) + W-LINT-021 (lambda param (label)=) ; with `onPick={` also W-LINT-004 (on[A-Z]=). Corpus samples/snippet-002-parametric fires 007+021.
  - FIX B (lint-w-each-promotable.js): `<tableFor for=Row rows=@rows/>` fires W-EACH-PROMOTABLE on the compiler-generated for-stmt. PROBE-CONFIRMED the synth for-stmt carries `_tableForSynth: true` (emit-table-for.ts:546). Lint runs post-TS on tsResult.files; the marker reaches the walker.
- Offsets traced (FIX A): W-LINT-007 braceOffset=matchEnd-1 (the `{`); W-LINT-004 matchEnd points at `{`; W-LINT-021 Pattern 23 matches ` (label) =` (lambda param), match.index at the leading space.

- 2026-06-12T03:58:46Z FIX B committed (7723e63d): lint-w-each-promotable.js guard `if (forStmt._tableForSynth) return;` + 4-test file. tableFor exempt; genuine for/lift + mixed still fire. Pre-commit full suite green.
- FIX A implemented in lint-ghost-patterns.js:
  - New helper bracedBodyOpensParenArrowLambda(source, braceOffset) — body opens `( params ) => <Tag` (param-balanced + arrow RETURNING MARKUP). The markup-return clause is the discriminator that keeps genuine JSX scalar arrow `onClick={(e) => fn()}` FIRING (R25 Bug 44 §3 — caught a too-broad first cut without it).
  - isSnippetFillAttrAssign (W-LINT-004: locate { after =), isSnippetFillLambdaParam (W-LINT-021: { left of lambda-param ().
  - skipIf disjuncts: W-LINT-007 (braceOffset=matchEnd-1), W-LINT-004 (matchEnd), W-LINT-021 (scan to ( then check).
  - 14/14 genuine+canonical matrix PASS; 225 existing ghost-lint tests PASS; +lint-ghost-snippet-fill-exempt.test.js (16 tests PASS).
  - FIX A commit launched (background pre-commit suite running).
