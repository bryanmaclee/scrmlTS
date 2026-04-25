# scrmlTS — Session 40

**Date opened:** 2026-04-24
**Previous:** `handOffs/hand-off-40.md` (S39 closed)
**Baseline entering S40:** **7,562 pass / 40 skip / 0 fail / 354 files** at `b3c83d3`.
**Current:** **7,578 pass / 40 skip / 0 fail / 355 files** at `ca6928a` (+16 tests, +1 file).

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

---

## 2. Next priority

1. **Bun.SQL Phase 2 (Postgres)** — parse `postgres://` URI, Postgres schema introspection, runtime smoke against a postgres instance. Phase 1 emission (`await _scrml_sql\`...\``) already works for any Bun.SQL-supported driver — Phase 2 is mostly about driver resolution + schema-differ Postgres path.
2. **LSP enhancement** — diagnostics on save + document symbols + go-to-definition. Highest-leverage DX investment per S39 user-voice signal.
3. **fix-lift-sql-chained-call-parallel-sites** — extract `consumeSqlChainedCalls` to shared module-scope; apply at 2 latent sites (`ast-builder.js:1918`, `:3421`). Low priority — no current fixture exercises.
4. **expr-ast-phase-4d-step-8-strict** — remove `(node as any).expr` fallback reads in meta-checker (10 sites) by updating synthetic test fixtures. Tech debt cleanup.
5. **example 05 E-COMPONENT-020** (forward-ref `InfoStep`) — confirmed pre-existing across S39/S40, nobody's looked at it yet.

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

---

## Tags
#session-40 #active #bun-sql-phase-1 #spec-44 #lift-sql-fixed #phase-4d-step-8 #agent-fix

## Links
- [handOffs/hand-off-40.md](./handOffs/hand-off-40.md) — S39 closed
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/changes/bun-sql-phase-1/](./docs/changes/bun-sql-phase-1/) — Phase 1 artifacts
- [docs/changes/fix-lift-sql-chained-call/](./docs/changes/fix-lift-sql-chained-call/) — landed
- [docs/changes/expr-ast-phase-4d-step-8/](./docs/changes/expr-ast-phase-4d-step-8/) — landed
- [docs/changes/fix-lift-sql-chained-call-parallel-sites/intake.md](./docs/changes/fix-lift-sql-chained-call-parallel-sites/intake.md) — follow-up
- [docs/changes/expr-ast-phase-4d-step-8-strict/intake.md](./docs/changes/expr-ast-phase-4d-step-8-strict/intake.md) — follow-up
