# Progress: p3-follow

## Started
- [00:00] Worktree verified at /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aba4ab44f8623f76d
- [00:00] Branch changes/p3-follow created from 00c533a (P3.A merge / S53 main tip)
- [00:01] Dependencies installed (root + compiler)
- [00:01] pretest sample compilation completed
- [00:02] Baseline test: 8539 pass / 40 skip / 0 fail / 424 files (matches dispatch expected)
- [00:02] Pre-snapshot written; isComponent references: 103 in src across 11 files, 154 in tests across 20 files

## Phase 2 — Migration

- [00:05] Phase 2.5 type-system.ts: §35 attribute validation gate flipped to resolvedCategory. 1 ref. Commit fd31614. 8539/0.
- [00:15] Phase 2.7 validators/post-ce-invariant.ts: VP-2 gate flipped to resolvedKind + uppercase-first-char heuristic. NR walker extended to traverse lift-expr.expr.node (gap closed — fills coverage that VP-2 needed). VP-2 test calls runNR pre-CE (production ordering). Commit 731f3e7. 8539/0.
- [00:35] Phase 2.4 + 2.6 component-expander.ts + module-resolver.js: CE Phase 1 routing migrated via isUserComponentMarkup() helper (NR-prefer-with-fallback pattern). MR vocabulary aligned with NR (`category: "user-component"` was `"component"`). 8539/0. Commit 859fd51.
- [00:45] Phase 2.10 + 2.11 name-resolver.ts + LSP handlers/workspace: imported registry derivation prefers info.category. 8539/0. Commit 45430dc.
- [00:50] Phase 3 state-type-routing.ts: deleted (zero in-tree consumers; transitional file disposed). 8539/0. Commit 54fcdb1.
- [00:55] Phase 4 SPEC §15.15.6 + PIPELINE Stage 3.05: NameRes status changed from "Shadow Mode" to "AUTHORITATIVE". Routing-table contract section rewritten. 8539/0. Commit b40e752.
- [01:00] Phase 5 types/ast.ts deprecation note + grep-assertion test (4 new tests). 8543/0. Commit a2537cc.

## Final state

- Tests: 8543 pass / 40 skip / 0 fail / 425 files (8539 baseline + 4 new from p3-follow-no-isComponent-routing.test.js).
- isComponent references: 78 in compiler/src/ (was 103) — distributed across 10 files, all WRITE-side stamps + intra-stage syntactic predicates + doc comments.
- state-type-routing.ts deleted.
- 8 WIP commits on changes/p3-follow.

## Phases complete
- [done] Phase 2.1 BS — no behavior change needed (write-side only)
- [done] Phase 2.2 ast-builder — no behavior change needed (write-side + intra-stage syntactic predicates)
- [done] Phase 2.3 module-resolver.js — vocabulary aligned with NR
- [done] Phase 2.4 component-expander.ts — CE Phase 1 routes NR-authoritative via isUserComponentMarkup()
- [done] Phase 2.5 type-system.ts — §35 attr validation flipped
- [done] Phase 2.6 codegen — N/A (no isComponent routing reads found in compiler/src/codegen/)
- [done] Phase 2.7 validators/post-ce-invariant.ts — VP-2 flipped
- [done] Phase 2.8 gauntlet-phase1-checks.js — pre-NR check; doc comment retains, no migration needed
- [done] Phase 2.9 api.js — doc comments referencing historical path; no behavior change
- [done] Phase 2.10 name-resolver.ts — importedRegistry derivation flipped
- [done] Phase 2.11 lsp/handlers.js + workspace.js — flipped
- [done] Phase 2.12 tests — p3a-mod-channel-registry.test.js updated for "user-component" vocabulary
- [done] Phase 3 state-type-routing.ts — deleted
- [done] Phase 4 SPEC §15.15.6 + PIPELINE Stage 3.05 — AUTHORITATIVE
- [done] Phase 5 grep-assertion test + types/ast.ts deprecation note + final commit

## Surprising findings worth noting

1. **Vocabulary divergence between NR and module-resolver.** NR uses `resolvedCategory: "user-component"` for components. Module-resolver was using `category: "component"`. The two were never aligned in P3.A. P3-FOLLOW unifies them; module-resolver now emits `"user-component"` to match NR. This is a behavior change to MR's exportRegistry shape — caught one P3.A test (p3a-mod-channel-registry.test.js) which was updated.

2. **NR walker did not traverse lift-expr expressions.** VP-2's `walkFileAst` in validators/ast-walk.ts DID traverse `lift-expr.expr.node` but NR's own walker did not. This was a coverage gap that broke the migration plan: VP-2 could see the residual `<UserBadge>` markup inside `lift <li><UserBadge/></li>` but it lacked NR's resolvedKind stamp. P3-FOLLOW extends NR's walker to mirror walkFileAst's lift-expr handling. This is a small behavior change to NR but properly localized.

3. **VP-2 semantic widening.** The original VP-2 fired on `n.isComponent === true` (any uppercase-tagged markup that survived CE). The migration to NR is not a literal one-to-one swap — NR resolves an unknown identifier as `resolvedKind: "unknown"` (NOT `"user-component"`). For F-COMPONENT-001 reproducer (e.g. `<UserBadge/>` from a missing import) to still trigger VP-2, the gate widens to: `resolvedKind === "user-component" OR (resolvedKind === "unknown" AND uppercase-first-char tag)`. The latter mirrors BS's isComponentName predicate without reading `isComponent`. The semantic "this looks like an unresolved component" is preserved.

4. **NR-prefer-with-fallback pattern.** Many CE unit tests bypass NR (call `runCE` directly without `runNR`). A pure NR-only routing read would have broken those. The implemented pattern is `resolvedKind === "user-component" OR (resolvedKind === undefined AND isComponent === true)`. NR wins when present (authoritative); legacy fallback for direct unit-test paths. The dispatch's "AUTHORITATIVE" goal is preserved (NR's classification trumps the BS heuristic when both are present), but unit-test backwards compat is preserved.

5. **The 75-reference estimate from the dive was low.** Actual was 103 (compiler/src/) + 154 (compiler/tests/). Most of the gap was in BS/ast-builder write-side stamps and parseAttributes parameters that don't need migration. Read-site count is closer to ~25.
