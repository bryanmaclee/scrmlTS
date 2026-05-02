# Progress: p2-wrapper

Fix `export <ComponentName>` desugaring to be byte-equivalent to `export const ComponentName = <markup>`.

## Pre-snapshot

- Branch: `changes/p2-wrapper` (from `changes/p2`, off `main`)
- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1a5ade61ee6b2c5e`
- P2 base commit: `e02f0e1 fix(p2): state-as-primary Phase P2 — export <ComponentName> direct grammar`
- Baseline tests: **8462 pass / 40 skip / 0 fail / 408 files** (post-pretest)

## Plan

1. WIP: pre-snapshot (this file + commit)
2. WIP: ast-builder desugaring — body-root absorbs outer attrs (replace wrapper synthesis with body-root extraction)
3. WIP: E-EXPORT-002 + E-EXPORT-003 emission
4. WIP: tests — AST equivalence + HTML equivalence + new error emissions
5. WIP: SPEC §21.2 + §21.6 — drop deferred-refinement caveat; add new error codes
6. WIP: update prior P2 tests that asserted wrapper presence
7. Final: fix(p2-wrapper)

## Log

- [start] Worktree verified, P2 merged, deps installed, pretest run, baseline 8462p/0f/40s confirmed.
- [step 2] ast-builder.js: added 5 helpers (scanOpenerForAttrs, extractOuterAttrSource, parseAttrNames, findSingleBodyRoot, spliceAttrsIntoBodyRoot) + new desugaring path that extracts body root, splices outer attrs onto body root, and emits E-EXPORT-002 (empty/multi-rooted body) or E-EXPORT-003 (attr-name conflict). Threaded errors[] + filePath through liftBareDeclarations. Tests pass at 8462/0f/40s — but probe revealed `${name}` in the synthesized raw was being broken into separate tokens.
- [step 2.5] ast-builder.js: switched synthesis from raw-string-only to re-invoking splitBlocks on the synthesized raw, then shifting all spans by `block.span.start - reLogic.span.start`. This produces a logic block with proper nested children (logic blocks for ${...}, sql for ?{...}, etc.) — exactly what tokenizeLogic expects. Verified Form 1 == Form 2 export-decl raw via probe. Tests at 8462/0f/40s after fixing X2 test (parity assertion replaces buggy zero-error assertion).
- [step 2.5 commit] dc095c9 — re-BS approach + X2 test update.

## Findings (notable)

- The ORIGINAL P2 wrapper desugaring not only produced an extra `<ComponentName>` outer wrapper at render time — it ALSO broke `${name}` interpolation inside the body by converting it into broken text `$ { name }` (with spaces) that no longer matched BS's `${`-pattern. The X2 test passed because the broken text didn't trigger any logic-scope check, AND the test only verified `errors == []` and a CSS class string presence — not actual prop substitution.
- Pre-existing CE limitation: prop substitution in component-expander only handles text-content `${prop}` substitution. Logic-block `${prop}` references (which are now correctly produced by both Form 1 and Form 2) are NOT substituted, so they error out as undeclared identifiers in TS. This is out of scope for this fix; the parity assertion in X2 documents that Form 1 and Form 2 share this limitation equally.
