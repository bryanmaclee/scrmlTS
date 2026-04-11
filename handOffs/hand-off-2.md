# scrmlTS — Session 2 Hand-Off

**Date:** 2026-04-10
**Next hand-off filename:** `handOffs/hand-off-2.md`
**Tests:** 5,542 → **5,606** pass, 2 skip, 0 fail (+64 over baseline)

## Carry-over from Session 1
- Repo split from scrml8 verified working: 5,542 tests pass, example compiles in ~20ms
- pa.md + master-list.md created
- Per-repo PA scope block added to pa.md

## Open from Session 1 "Next up" — ALL RESOLVED
- [x] Non-compliance audit (cleanup docs that don't match spec/code)
- [x] Cold project map (re-enabled with scope discipline)
- [x] Build VS Code extension (`bunx tsc`)
- [x] Verify pre-commit hooks work in new location (installed fresh from scrml8)

## Session 2 Work

### Infrastructure (early S2)

**Non-compliance audit (DONE)** — 13 markdown docs reviewed. 3 dereffed to `scrml-support/archive/`, 3 updated in place, 1 deleted (`shared/` fiction), 6 kept.

**VS Code extension build (DONE)** — added missing `@types/node`, `bunx tsc` clean → `out/extension.js`. `.gitignore` updated.

**Git hooks installed (DONE)** — pre-commit + post-commit + pre-push copied from scrml8 unchanged. Post-commit runs full test + TodoMVC gauntlet + browser validation on every compiler commit. **Caveat:** not versioned — future TODO `scripts/git-hooks/` mirror + install script.

**Cold project map (DONE)** — re-enabled with scope discipline. 10 maps + INDEX + non-compliance at `.claude/maps/`. Zero non-compliance findings post-audit.

**Scripts/ trim (DONE)** — 24 → 8. 16 archived to `scrml-support/archive/scripts/scrmlTS-2026-04-10/` with README + frontmatter.

**pa.md scope clarification (DONE)** — per-repo PA scope is cognitive, not a write firewall. PAs DO write to scrml-support (storage) for user-voice, archive deref, design-insights, resource-mapper increments.

### Pipeline batches (S2, merged to main in order)

1. **meta-fix-batch** — 6 meta `^{}` system bugs. 3 fixed (`for-stmt` serialization, inline-param detection for `reflect()`, DG reactive-decl handling inside runtime meta), 3 verified already fixed by prior S52 work. R18/R19 reports annotated with resolution notes. Tests: 5,542 → 5,549.
2. **websocket-cli-batch** — 6 bugs blocking `<channel>` runtime. Critical: `Bun.readdir()` doesn't exist (replaced with `readdirSync`), server route export was `routes.push({...})` with no `routes` declared (now emits `export const _scrml_route_ws_<name>`). Also `ws://` → protocol-relative, `onclient:*` handler wiring, `close(ws, code, reason)` signature. **DQ-11 unblocked.** Tests: 5,549 → 5,564.
3. **dq12-phase-a** — DQ-12 parenthesized compound `is not`/`is some`. `_rewriteParenthesizedIsOp` in `rewrite.ts` with `genVar()` temp-var single-evaluation per §42.2.4. Phase B (bare compound, no parens) deferred. SPEC.md §42.2.4 implementation note added. Tests: 5,564 → 5,601 (+37).
4. **library-mode-types** — R18 #2 verified already fixed by prior work (regex at `emit-library.ts:160` strips `type X:enum`/`type X:struct` source spans). Added 10 regression tests + sample. No source changes.
5. **dq7-css-scope** — **DQ-7 ratified to Approach B** (native CSS `@scope`). Implemented: `data-scrml` attribute on constructor roots, `@scope (...) to ([data-scrml])` donut, `isFlatDeclarationBlock()` + inline `style=""` for flat-declaration `#{}` blocks. SPEC §9.1 + §25.6 rewritten. SPEC-ISSUE-006 (deep selectors) resolved by donut boundary. Design insight recorded at `scrml-support/design-insights.md` 2026-04-10.
6. **ex13-route-warning-fix** — Example 13 `E-ROUTE-001` failure. Two bugs: (a) missing `severity: "warning"` on RouteWarning push → classifier treated as error; (b) computed member access inside `<program name=...>` worker bodies shouldn't trigger the check at all (workers have no protected state). Added `collectWorkerBodyFunctionIds` + `isWorkerBody` flag in `walkBodyForTriggers`. Tests: 5,601 → 5,606. Example 13 compiles clean in 60.9ms. **13/14 examples clean.**

### Still running at time of hand-off write
- **lin-batch-a** — E-LIN-002 message improvement + `~` double-obligation trap + loop-body carve-out. Branch: `changes/lin-batch-a`. Not yet reported.

### User-Neovim config (off-repo work done S2)
User authorized editing local kickstart nvim config from this PA. Wired up scrml language support:
- `~/.config/nvim/init.lua` — uncommented `{ import = 'custom.plugins' }`
- `~/.config/nvim/lua/custom/plugins/scrml.lua` — filetype detection + `FileType scrml` autocmd starting `bun run /.../lsp/server.js --stdio` with root detection
- `~/.config/nvim/after/syntax/scrml.vim` — minimal syntax highlighting (comments, strings, `@reactive`, keywords, sigils, tags, numbers)
- Smoke-tested headless: `ft=scrml`, `syn=scrml`, 1 LSP client attached. Clean.

### DQ-7 + DQ-11 design decisions recorded
- `scrml-support/design-insights.md` — DQ-7 2026-04-10 entry (full Approach B rationale)
- `scrml-support/docs/remaining-design-questions.md` — DQ-7 marked resolved with pointer to design-insights

## Current main state

- **Tests:** 5,606 pass, 2 skip, 0 fail
- **Examples:** 13/14 clean (only example 12 snippet-slot remains)
- **P1 language completeness:** DQ-7 ✅, DQ-11 ✅, DQ-12 ✅ (Phase A), Lin ⏳ (Batch A in flight)
- **Open blockers:** example 12 (E-COMPONENT-020), mother-app 50/51 (component/slot), meta.* runtime API, tokenizeCSS brace-stripping (DQ-7 agent reported it was already fixed, verify)

## Next up

**Awaiting:**
- Lin Batch A to complete + merge

**Queued (in priority order, not yet dispatched):**
1. **Component/slot system** — example 12 fix + mother-app compatibility. Biggest DX win. Touches `component-expander.ts`, snippet/slot codegen. Intersects with the previously-paused "component interpolations" TAB `collectExpr` bug (#11 in the earlier blocker list).
2. **Lin Batch B** — `lin` function parameters (§35.2 v2 deferred, HIGH priority per friction report). Touches parser + type-system + server function codegen. Depends on Lin Batch A landing first.
3. **Lin Batch C** — `read lin` (borrow-like read, v2). Bigger design surface. Depends on Batch B.
4. **Ghost error patterns** — 10 remaining. Each probably small, total surface moderate.
5. **E-SYNTAX-043 partial** — complex expressions may pass through. Parser tightening.
6. **Skipped tests audit** — 10 skipped tests; catalog and triage.
7. **DQ-12 Phase B** — bare compound expressions (no parens). Requires real expression parsing in `expression-parser.ts`. Larger scope, lower urgency.
8. **Spec-index refresh** — `scripts/update-spec-index.sh` prints stale line numbers; update `compiler/SPEC-INDEX.md` by hand or automate.
9. **`scripts/git-hooks/` versioning** — mirror hooks into repo so fresh clones get them.

## Tags
#session-2 #p1-complete #meta-fix #websocket-cli #dq12 #dq7 #library-mode #ex13 #lin-batch-a #nvim-config

## Links
- [master-list.md](./master-list.md)
- [pa.md](./pa.md)
- [scrml-support/design-insights.md](../scrml-support/design-insights.md)
- [scrml-support/docs/deep-dives/css-scoping-2026-04-02.md](../scrml-support/docs/deep-dives/css-scoping-2026-04-02.md)
- [scrml-support/docs/gauntlets/gauntlet-r18-report.md](../scrml-support/docs/gauntlets/gauntlet-r18-report.md)
- [scrml-support/docs/gauntlets/gauntlet-r19-report.md](../scrml-support/docs/gauntlets/gauntlet-r19-report.md)
