# scrmlTS — Session 40

**Date opened:** 2026-04-24
**Previous:** `handOffs/hand-off-40.md` (S39 closed)
**Baseline entering S40:** **7,562 pass / 40 skip / 0 fail / 354 files** at `b3c83d3`.
**Current:** **7,632 pass / 40 skip / 0 fail / 358 files** at `c9ebc78` (+70 tests, +4 files).

---

## 0. Session-start state

- Repo clean at `b3c83d3` (S39 changelog entry).
- Inbox cleared: 2 stale items (master-readme-giti, giti-009 helper sidecar) moved to `handOffs/incoming/read/` — both already actioned in S39.
- Inbox still has `dist/` artifact pollution (3 files: bugI compiled output + `scrml-runtime.js`). Inbox should not contain build output — flag for user disposition.
- User-voice S39 entries logged.

---

## 1. Work this session

### Bun.SQL Phase 1 — codegen migration to tagged-template (LANDED)

**Commits on main:** `6e21f76` (artifacts) → `55dbcb2` (impl) → `cd8dea1` (scaffolding cleanup) → `fe7eda9` (lift+sql intake).

**Scope:** SPEC §44 alignment for SQLite branch. `?{}` codegen now emits `await _scrml_sql\`...\`` tagged-template form instead of `_scrml_db.query("...").all()`. `.prepare()` now emits E-SQL-006 per §44.3. Implicit `await` insertion per §44.4. `${}` interpolations are bound parameters per §44.5.

**Files (real changes, scaffolding excluded):**
- 7 codegen src: `rewrite.ts`, `emit-logic.ts`, `emit-control-flow.ts`, `emit-server.ts`, `context.ts`, `index.ts`, `emit-client.ts`
- 7 test: `sql-params`, `sql-write-ops`, `sql-loop-hoist-rewrite`, `sql-batching-envelope`, `sql-nobatch`, `sql-client-leak`, `nested-program-db`
- 5 docs in `docs/changes/bun-sql-phase-1/`: impact-analysis, pre-snapshot, design-review, anomaly-report, progress

**Key emission shifts:**
- `_scrml_db` identifier → `_scrml_sql` (codegen rename for grep clarity; user-facing source unchanged)
- Loop hoist (`§8.10`) batch path → `await _scrml_sql.unsafe(rawSql, keys)` because Bun.SQL's SQLite branch rejects array binding
- BEGIN/COMMIT/ROLLBACK envelopes → `await _scrml_sql.unsafe("...")`
- `.prepare()` callsite → E-SQL-006 emission

**Verification:** Full suite 7,565/0 (baseline +3, balanced from new E-SQL-006 tests vs reframed `.prepare()` cases). Recompiled examples 03/07/08 — emission shape verified.

**Cleanup landed:** Agent left 56 scaffolding files in `scripts/` (`_apply_patch.py`, `.patches/01-27_*.txt`, `_probe_sql{,2,3,4}.js`). Removed in `cd8dea1`. API findings preserved in design-review.md.

### Pre-existing lift+sql bug filed (not fixed this session)

Phase 1 verification surfaced an orphan `.all()` emission on `lift ?{`SELECT...`}.all()` in server functions (examples 03/07/08). Phase 1 author verified pre-existing on bare `b3c83d3`. Root cause: `compiler/src/ast-builder.js:2245-2251` lift+BLOCK_REF path doesn't consume trailing chained call. Filed as `docs/changes/fix-lift-sql-chained-call/intake.md` for next session.

### SPEC §8 / §44 reconciliation (LANDED — `74881ea`)

§8 now describes source-language `?{}` method API; §44 owns the codegen target. Specific edits:
- §8.1.1 driver table — clarified "via Bun.SQL"; mongo:// flagged as `^{}`-only
- §8.2 normative — replaced `db.prepare(sql).get(...params)` claim with §44 cross-ref
- §8.3 chaining table — dropped `.prepare()` row, added removed marker
- §8.5.1 `.run()` — return type now `void`; suggest `RETURNING` / `SELECT changes()` for legacy `RunResult` consumers
- §8.5.2 — full rewrite as "Removed", with bulkInsert example showing Bun.SQL's prepare-cache covers the use case
- §8.5.3 transaction — emit shape now `sql.unsafe("BEGIN DEFERRED")`
- §8.6 errors — added E-SQL-006 (`.prepare()` removed) and E-SQL-007 (`?{}` non-async)
- §8.10.1 — clarified `.prepare()` is invalid (E-SQL-006)

### fix-lift-sql-chained-call (LANDED — `15a0698`)

Pipeline agent fix. New `consumeSqlChainedCalls` helper in `ast-builder.js` consumes `.method()` chains after BLOCK_REF (handles both IDENT and KEYWORD method names — `.get()` is KEYWORD, latent bug caught during impl). Updated two `lift KEYWORD + BLOCK_REF` call sites to wrap SQL children as `kind:"sql"`. `emit-logic.ts::case "lift-expr"` extended to recognize the new `kind:"sql"` variant — emits `return await _scrml_sql\`...\`;` (server) or bare `await _scrml_sql\`...\`;` (client). +13 tests. Examples 03/07/08 now compile cleanly.

**Two parallel pre-existing sites flagged** at `ast-builder.js:1918` (parseOneStatement BLOCK_REF) and `:3421` (buildBlock body-loop BLOCK_REF) — same IDENT-only check; bare `?{}.get()` outside `lift` would hit the same orphan bug. Filed as `docs/changes/fix-lift-sql-chained-call-parallel-sites/intake.md`.

### Phase 4d Step 8 — `.expr` field deletion (LANDED — `e478c99`)

Pipeline agent. Deleted `BareExprNode.expr?: string` from `compiler/src/types/ast.ts`. **Hybrid resolution** in consumers — kept `(node as any).expr` fallback reads to avoid breaking 30+ meta-checker tests with synthetic fixtures missing `.exprNode`. 10 source files touched. Tests stayed flat at 7,565/0 (now 7,578/0 after B's contribution).

The hybrid is honest about the contract (TS type cleaned) but defers strict consumer cleanup. Filed strict-deletion follow-up as `docs/changes/expr-ast-phase-4d-step-8-strict/intake.md` (low priority).

### Wave 3 — 4 parallel background agents (all landed)

**fix-lift-sql-chained-call-parallel-sites (LANDED — `06c27f0`)** — extracted `consumeSqlChainedCalls` helper, applied at all 4 BLOCK_REF chained-call sites in `ast-builder.js` (helper kept at `parseLogicBody` scope, not module — closes over per-call `peek`/`consume`). +6 tests. Site B more latent than intake suggested (no plausible runtime trigger without wrapping function, in which case Site A catches first). Agent surfaced `acorn` missing from package.json — filed as `fix-acorn-implicit-dep` intake.

**LSP enhancement scoping (deep-dive LANDED — `ab45ce9`)** — 574-line phased roadmap at `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md`. **L1→L5 phasing, no debate needed:** L1 see-the-file (doc symbols + hover + completion-trigger), L2 see-the-workspace (wire MOD/CE for cross-file go-to-def — single highest-impact gap), L3 scrml-unique completions (SQL column completion is a tiny LSP-side pull because PA already has the data; component prop completion; cross-file completion), L4 standards polish (signature help + code actions), L5 spatial-ready (semantic tokens, defer). No spec changes required. Editor coverage automatic. Surfaced `lsp/server.js:26` still imports retired BPP — filed as `lsp-cleanup-retired-bpp-import` intake.

**Bun.SQL Phase 2 — Postgres support (LANDED — `9ef0ccb`)** — `compiler/src/codegen/db-driver.ts` (151 LOC) + `protect-analyzer.ts` Postgres URI path + RI `Bun.SQL` patterns. Sample compile verifies driver-agnostic emission (Phase 1 made it unified). Negative paths verified (`mongodb://` → E-SQL-005 with `^{}` pointer). +47 tests. **Postgres compile-time introspection deferred** — agent declined async PA migration (would ripple through `api.js` + downstream stages); CREATE-TABLE shadow-DB pattern reused. Phase 2.5 is the natural extension point. Surfaced **pre-existing `/* sql-ref:-1 */` placeholder bug** for `return ?{...}.method()` from server fn — filed as `fix-cg-sql-ref-placeholder` intake.

**expr-ast-phase-4d-step-8-strict (LANDED — `c9ebc78`)** — strict-deleted all 7 `(node as any).expr` fallback reads in `meta-checker.ts`. Updated 13 synthetic test fixtures across 4 test files. **Surfaced + fixed 2 latent bugs** the hybrid was masking: (a) `bodyUsesCompileTimeApis` was using wrong helper for `compiler.*` detection — added `exprNodeContainsIdentNamed`; (b) `exprNodeContainsCompileTimeReflect` had multiple bugs (missing `assign` kind, wrong field names `.operand`→`.argument`, `.test`→`.condition`). Test count flat (no new tests needed; existing tests cover via fixture updates). Phase 4d Step 8 now strictly complete in meta-checker; remaining `.expr` reads in route-inference, body-pre-parser, emit-client are out of scope (Cat B/C).

---

## 2. Next priority

1. **LSP L1 — "See the file"** — implement document symbols + hover signature improvements + completion-trigger fixes per `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md`. Cheapest delight per LOC, pure AST walks, no multi-file work.
2. **fix-cg-sql-ref-placeholder** — `return ?{...}.method()` from server fn emits `/* sql-ref:-1 */` placeholder. Pre-existing on `2e6a42d`. Trace `/* sql-ref:` markers, apply Bun.SQL rewrite at the missed site. Reproducer at `samples/compilation-tests/combined-007-crud.scrml`.
3. **fix-acorn-implicit-dep** — add `acorn` to the right `package.json`, verify with clean `bun install`. Fresh-clone reproducibility issue.
4. **lsp-cleanup-retired-bpp-import** — drop `runBPP` import from `lsp/server.js:26`. Trivial.
5. **Bun.SQL Phase 2.5** — async PA + real `Bun.SQL` Postgres introspection at compile time. The `resolveDb()` extension point is in place. Bigger scope (touches `api.js` + downstream).
6. **LSP L2 — "See the workspace"** — wire MOD + CE into LSP for cross-file go-to-definition + cross-file diagnostics. One-time architectural investment that unblocks every later cross-file feature.
7. **example 05 E-COMPONENT-020** (forward-ref `InfoStep`) — confirmed pre-existing across S39/S40.

### Carried older
- Auth-middleware CSRF mint-on-403 (session-based path, deferred)
- Phase 0 `^{}` audit continuation (4 items)
- `scrml vendor add <url>` CLI (not started)
- Example 05 E-COMPONENT-020 (forward-ref)

---

## 3. Standing rules in force

(Carried — see `handOffs/hand-off-40.md` and earlier for full list.)

---

## 4. Session log

- 2026-04-24 — S40 opened. Rotated S39 hand-off to `handOffs/hand-off-40.md`. Inbox triaged (2 actioned items moved to read/; `dist/` build pollution remains pending user disposition).
- 2026-04-24 — Bun.SQL Phase 1 dispatched via scrml-dev-pipeline (worktree). Returned green: 7,565/0/354. Verified independently. Scaffolding cleanup landed. Merged FF to main at `cd8dea1`. Worktree removed.
- 2026-04-24 — Pre-existing lift+sql AST bug filed as `fix-lift-sql-chained-call` intake. Not regression — verified pre-existing on bare `b3c83d3`.
- 2026-04-24 — SPEC §8/§44 reconciliation done inline. `74881ea`.
- 2026-04-24 — Pipeline agent definition fixed: `~/.claude/agents/scrml-dev-pipeline.md` had stale `/home/bryan-maclee/projects/scrml8/` references at lines 16 + 598. Updated to scrmlTS paths. user-voice path also updated.
- 2026-04-24 — Cherry-pick of `4a5bbf1`+`4df07cf`+`fca0899` (Phase 4d Step 8 work from `changes/render-preprocess-expr-deletion`) attempted onto current main. 62 test failures from auto-merged meta-checker/route-inference. Aborted, dispatched fresh pipeline agent instead.
- 2026-04-24 — Dispatched B (lift+sql fix) and C (Phase 4d Step 8) in parallel — disjoint files (B: ast-builder.js + emit-logic.ts; C: types/ast.ts + 9 TS consumers).
- 2026-04-24 — B returned green: 7,578/0/355 (+13 tests). Latent `.get()` KEYWORD-vs-IDENT bug found and fixed mid-impl. Scratchpad cleanup. Merged FF at `15a0698`.
- 2026-04-24 — Two parallel-site latent bugs filed as `fix-lift-sql-chained-call-parallel-sites` intake (`a1a6dc1`).
- 2026-04-24 — C returned with hybrid resolution (TS field deleted, `(any).expr` fallback kept in consumers). Rebased onto current main, tested green on main (worktree-only env failures). Merged FF at `e478c99`. Worktree removed. Strict-deletion follow-up filed as `expr-ast-phase-4d-step-8-strict` intake (`ca6928a`).
- 2026-04-24 — Wave 3 dispatched: 4 background agents in parallel — Phase 2 (Postgres), parallel-sites (chained-call helper), strict-cleanup (meta-checker `(any).expr`), LSP scoping deep-dive.
- 2026-04-24 — parallel-sites returned green (+6 tests, `06c27f0`). `acorn` missing from package.json filed as intake (`25ce5f1`).
- 2026-04-24 — LSP deep-dive returned (`ab45ce9`, 574 lines). L1→L5 phasing, no debate. Retired BPP import filed as cleanup intake (`7825a83`).
- 2026-04-24 — Phase 2 returned green (+47 tests, `9ef0ccb`). Pre-existing `/* sql-ref:-1 */` bug filed as `fix-cg-sql-ref-placeholder` (`ca5f753`).
- 2026-04-24 — strict-cleanup returned green (`c9ebc78`). Surfaced + fixed 2 latent meta-checker ExprNode-detection bugs the hybrid was masking. Phase 4d Step 8 now strictly complete in meta-checker.
- 2026-04-24 — Final S40 state: **7,632 pass / 40 skip / 0 fail / 358 files** (+70 net, +4 files). 5 user-facing landings + 4 follow-up intakes filed.
- 2026-04-24 — Wave 4 dispatched + landed: parallel-sites refactor pushed already; LSP L1+L2+L3 phased roadmap shipped (`e1827e6`/`14cc1d1`/`24712f5`); fix-cg-sql-ref-placeholder (`2a05585`); fix-cg-cps-return-sql-ref-placeholder (`9d65a46`). 80 commits pushed to origin/main.
- 2026-04-24 — Outbound messages sent to siblings:
  - `giti/handOffs/incoming/2026-04-24-2245-scrmlTS-to-giti-s40-sql-and-lsp-landings.md` — `needs: fyi`. Bun.SQL Phase 1+2 codegen shape change (`_scrml_db`→`_scrml_sql`), `.prepare()`→E-SQL-006, 3 placeholder fixes, LSP L1-L3 capabilities.
  - `6nz/handOffs/incoming/2026-04-24-2245-scrmlTS-to-6nz-s40-lsp-and-bun-sql.md` — `needs: fyi`. LSP L1-L3 architecture + capabilities + sample responses; L5 semantic-tokens decision deferred to 6nz; Bun.SQL change summary.
- 2026-04-24 — fix-cg-mounthydrate-sql-ref-placeholder LANDED (`efcfaf5`, +5 tests). Approach (b) — suppress bare `_scrml_reactive_set` for client-side SQL-init reactive-decls; emit a comment instead of `_scrml_reactive_set("var", )` empty-arg. Closes the SQL placeholder fix arc (4 contexts now all clean).
- 2026-04-24 — LSP L4 LANDED (`c51ad15`, +53 tests, 7,825/0/370). New `lsp/l4.js` (~600 LOC) for signatureHelpProvider + codeActionProvider with quick-fixes for E-IMPORT-004 / E-IMPORT-005 / E-LIN-001 / E-PA-007 / E-SQL-006. Cross-file signature help works (synthesizes function shape from `export-decl.raw`).
- 2026-04-25 — 7 inbox messages received from siblings (replies to S40 wrap):
  - 6nz refile of bugs H/I/J/K — all 4 were FIXED in S39, 6nz tested against stale `9540518`. Reply sent with commit SHAs + retest ask.
  - 6nz L5 deferral confirmation — L5 dropped from active roadmap. `endLine`/`endCol` Span detached as standalone follow-up.
  - giti GITI-009 + GITI-011 verification — both confirmed closed. GITI-011 first message had wrong workaround status; second message confirms fix is in `7a91068`.
  - **2 new bugs from giti**: GITI-012 (`==` in server fn references undefined `_scrml_structural_eq`) + GITI-013 (arrow body returning object literal loses wrapping parens). Both filed as intakes (`fix-server-eq-helper-import`, `fix-arrow-object-literal-paren-loss`) — **awaiting sidecar reproducers** per pa.md cross-repo rule. Reply sent requesting drops.
- 2026-04-25 — Maps refresh agent returned write-blocked but with full content. Applied subset inline (primary.map.md header refreshed to S40 fingerprint + test counts). Full domain/structure/error map content captured but not yet applied.
- 2026-04-25 — Outbound replies sent:
  - `6nz/handOffs/incoming/2026-04-25-2300-scrmlTS-to-6nz-bugs-h-i-j-k-fixed-in-s39.md` — `needs: action`. All 4 bugs fixed S39, please pull + retest.
  - `6nz/handOffs/incoming/2026-04-25-2305-scrmlTS-to-6nz-l5-defer-acked.md` — `needs: fyi`. L5 dropped from roadmap.
  - `giti/handOffs/incoming/2026-04-25-2315-scrmlTS-to-giti-giti-009-011-acked-012-013-need-sidecars.md` — `needs: action`. GITI-009/011 closed; GITI-012/013 received, request sidecars.

---

## Tags
#session-40 #active #bun-sql-phase-1 #bun-sql-phase-2 #spec-44 #lift-sql-fixed #phase-4d-step-8 #phase-4d-strict #parallel-sites #lsp-roadmap #agent-fix

## Links
- [handOffs/hand-off-40.md](./handOffs/hand-off-40.md) — S39 closed
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/changes/bun-sql-phase-1/](./docs/changes/bun-sql-phase-1/) — landed
- [docs/changes/bun-sql-phase-2/](./docs/changes/bun-sql-phase-2/) — landed
- [docs/changes/fix-lift-sql-chained-call/](./docs/changes/fix-lift-sql-chained-call/) — landed
- [docs/changes/fix-lift-sql-chained-call-parallel-sites/](./docs/changes/fix-lift-sql-chained-call-parallel-sites/) — landed
- [docs/changes/expr-ast-phase-4d-step-8/](./docs/changes/expr-ast-phase-4d-step-8/) — landed
- [docs/changes/expr-ast-phase-4d-step-8-strict/](./docs/changes/expr-ast-phase-4d-step-8-strict/) — landed
- [docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md](./docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md) — L1→L5 roadmap
- [docs/changes/fix-cg-sql-ref-placeholder/intake.md](./docs/changes/fix-cg-sql-ref-placeholder/intake.md) — follow-up
- [docs/changes/fix-acorn-implicit-dep/intake.md](./docs/changes/fix-acorn-implicit-dep/intake.md) — follow-up
- [docs/changes/lsp-cleanup-retired-bpp-import/intake.md](./docs/changes/lsp-cleanup-retired-bpp-import/intake.md) — follow-up
