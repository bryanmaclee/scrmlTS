# scrmlTS — Session 2 Hand-Off (FINAL)

**Date:** 2026-04-10
**Next session rotation target:** `handOffs/hand-off-2.md`
**Tests:** 5,542 → **5,691** pass, 2 skip, 0 fail (+149 over baseline)
**Examples:** 12/14 → **14/14** compile clean

## Session 2 at a glance

Nine pipeline batches merged to main. All P1 language-completeness items resolved. Both previously-broken examples fixed. Ghost-error lint landed. DQ-7 design decision ratified and implemented. Local Neovim config wired up for the user.

## Pipeline batches merged (in order)

| # | Branch | Summary | Tests Δ |
|---|---|---|---|
| 1 | `meta-fix-batch` | 3 real meta/`^{}` fixes (serializeNode `for-stmt`, inline-param detection, DG reactive-decl); 3 verified already-fixed | +7 |
| 2 | `websocket-cli-batch` | 6 bugs in dev.js/build.js/emit-channel.ts — `<channel>` runtime unblocked end-to-end (**DQ-11**) | +15 |
| 3 | `dq12-phase-a` | Parenthesized compound `is not`/`is some` — `_rewriteParenthesizedIsOp` with `genVar()` temp-var single-evaluation | +37 |
| 4 | `library-mode-types` | R18 #2 verified already fixed; +10 regression tests | +10 |
| 5 | `dq7-css-scope` | **DQ-7 ratified to Approach B** (native CSS `@scope`), implemented + SPEC §9.1 + §25.6 rewrite | (included in #3) |
| 6 | `ex13-route-warning-fix` | E-ROUTE-001 severity missing + worker-body suppression; **example 13 fixed** | +5 |
| 7 | `lin-batch-a` | Lin-A1 lift-as-move message, Lin-A2 investigated, Lin-A3 loop-body carve-out + SPEC §34.4.4 | +11 |
| 8 | `ghost-lint-prepass` | New `compiler/src/lint-ghost-patterns.js` (334 lines) — 10 W-LINT-* patterns, wired into `api.js` | +71 |
| 9 | `ex12-component-normalize` | `normalizeTokenizedRaw` missed bare closers `</>` + open-tag trailing whitespace; **example 12 fixed**, 14/14 clean | +3 |

Plus several docs-only merges: meta resolution notes, DQ-7/DQ-11 bookkeeping, bookkeeping updates.

## Infrastructure work (early S2)

- **Non-compliance audit** — 13 docs reviewed, 3 dereffed to `scrml-support/archive/`, 3 updated in place, 1 deleted (`shared/` fiction), 6 kept
- **VS Code extension built** — added `@types/node`, `bunx tsc` clean → `out/extension.js`; `.gitignore` updated
- **Git hooks installed** — `pre-commit` + `post-commit` + `pre-push` copied from scrml8 (repo-relative paths work). **Caveat:** not versioned, fresh clones need reinstall
- **Cold project map** — re-enabled with scope discipline; 10 maps + INDEX + non-compliance at `.claude/maps/`; ~30 file reads, sustainable
- **Scripts trim** — 24 → 8; 16 archived to `scrml-support/archive/scripts/scrmlTS-2026-04-10/`
- **pa.md scope clarification** — per-repo PA scope is cognitive, not a write firewall; PAs DO write to scrml-support (storage) for user-voice, archive deref, design-insights, resource-mapper increments

## Off-repo work (user authorized)

Wired up scrml language support in user's local kickstart nvim config:
- `~/.config/nvim/init.lua` — uncommented `{ import = 'custom.plugins' }`
- `~/.config/nvim/lua/custom/plugins/scrml.lua` — filetype detection + `FileType scrml` autocmd starting `bun run /.../lsp/server.js --stdio` with root detection + error guards
- `~/.config/nvim/after/syntax/scrml.vim` — minimal syntax highlighting (comments, strings, `@reactive`, keywords, sigils, tags, numbers)
- Smoke-tested headless: `ft=scrml`, `syn=scrml`, 1 LSP client attached

## Design records

- **DQ-7 (CSS scoping)** — ratified native CSS `@scope` (Approach B); full rationale at `scrml-support/design-insights.md` 2026-04-10 entry
- **DQ-11 (WebSocket)** — CLI implementation complete, spec §38 already existed
- **DQ-12 (compound `is not`/`is some`)** — Phase A (parenthesized form) implemented; Phase B (bare compound) deferred as future work

## Current main state

- **Tests:** 5,691 pass, 2 skip, 0 fail
- **Examples:** 14/14 clean
- **Section O (post-split cleanup):** COMPLETE
- **Section N P1 (language completeness):** DQ-7 ✅, DQ-11 ✅, DQ-12 ✅ (Phase A), Lin Batch A ✅; Lin B/C pending
- **Section M (known bugs):** 1, 2, 3, 4, 8, 9, 10 resolved; 5 (skipped tests), 6 (E-SYNTAX-043), 7 (marked but WS CLI actually fixed) remain

## What's loaded and ready in "next wave candidates"

1. **Mother-app 50/51 fails** — bigger component/slot surface, ~50 files in the R17 report
2. **Lin Batch B** — `lin` function parameters (§35.2 v2, HIGH priority per friction report). T2. Parser + type-system + server-function codegen.
3. **Lin Batch C** — `read lin` borrow-like read. T2. Depends on Batch B.
4. **Skipped tests unblock** — 2 tests in `callback-props.test.js` §I blocked on lack of inline-source compile API. Option B: lightweight temp-file harness inside the test (~30 min).
5. **E-SYNTAX-043 parser tightening** — complex expressions may pass through. Parser work.
6. **Ghost-lint Solution #1** — edit `.claude/agents/scrml-developer.md` to add a "GHOST PATTERNS — DO NOT WRITE THESE" section (complements the lint pre-pass). Inline task, ~1 hour.
7. **`meta.*` runtime API** — `meta.types.reflect()`, `meta.get()`, `meta.emit()`. Feature, not bug.
8. **DQ-12 Phase B** — bare compound expressions (no parens). Requires real expression parsing in `expression-parser.ts`. Larger scope, deferred.
9. **`scripts/git-hooks/` versioning** — mirror `.git/hooks/` into repo so fresh clones get them automatically.
10. **Spec-index refresh** — `scripts/update-spec-index.sh` prints stale line numbers; `compiler/SPEC-INDEX.md` needs manual or automated update.

## Gotchas to remember

- **Pipeline agents have git blocked often.** Every batch in this session except meta-fix-batch had to commit manually from main PA after reading the agent's anomaly report. Pattern: agent writes files to main tree (or leaves patch.mjs), PA runs tests, PA commits on a branch, PA merges ff to main.
- **Pipeline agent isolation: worktree is unreliable.** Several batches wrote to the main tree instead of their assigned worktree. Main PA has to stage files carefully to avoid cross-contamination when multiple agents run in parallel.
- **Two agents wedged in the last wave** (Example 12 Pipeline + Ghost Lint Pipeline) — 80+ minutes idle, 0 writes after launch. User had to tell me to verify; I killed the worktrees and finished both inline. **Moral:** check worktree mtimes + output file sizes periodically when running many parallel agents, don't trust "running in background" status alone.
- **Long pipeline briefs get rejected.** Keep briefs tight — reference the authoritative docs (gauntlet reports, deep-dives, design-insights) instead of inlining details.

## Tags
#session-2 #final #all-p1-complete #14-of-14 #meta-fix #websocket-cli #dq7 #dq11 #dq12 #library-mode #ex12 #ex13 #lin-batch-a #ghost-lint #nvim-config

## Links
- [master-list.md](./master-list.md) — current inventory
- [pa.md](./pa.md) — PA directives
- [handOffs/hand-off-1.md](./handOffs/hand-off-1.md) — S1 split hand-off
- [scrml-support/design-insights.md](../scrml-support/design-insights.md) — DQ-7 2026-04-10 entry
- [scrml-support/docs/deep-dives/css-scoping-2026-04-02.md](../scrml-support/docs/deep-dives/css-scoping-2026-04-02.md)
- [scrml-support/docs/gauntlets/gauntlet-r18-report.md](../scrml-support/docs/gauntlets/gauntlet-r18-report.md) — annotated with S2 resolution notes
- [scrml-support/docs/gauntlets/gauntlet-r19-report.md](../scrml-support/docs/gauntlets/gauntlet-r19-report.md) — annotated with S2 resolution notes
- [scrml-support/docs/ghost-error-mitigation-plan.md](../scrml-support/docs/ghost-error-mitigation-plan.md) — Solution #2 landed S2
