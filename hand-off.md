# scrmlTS — Session 40

**Date opened:** 2026-04-24
**Previous:** `handOffs/hand-off-40.md` (S39 closed)
**Baseline entering S40:** **7,562 pass / 40 skip / 0 fail / 354 files** at `b3c83d3`.
**Current:** **7,565 pass / 40 skip / 0 fail / 354 files** at `fe7eda9` (+3 tests, +1 file in `docs/changes/`).

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

---

## 2. Next priority

1. **fix-lift-sql-chained-call** — bug filed in `docs/changes/fix-lift-sql-chained-call/intake.md`. AST builder fix in `compiler/src/ast-builder.js:2245-2251` + regression test. Unblocks examples 03/07/08 runtime.
2. **SPEC §8/§44 reconciliation** — Phase 1 has landed; §8 still describes `.all()/.get()/.run()` against `bun:sqlite`. §8 either becomes a §44 cross-ref or describes the source-language method-chain syntax (what users write) while §44 describes the codegen target.
3. **Phase 4d Step 8 completion** — CE structural matching + `.expr` field deletion. Render preprocessor is landed. Prior agent's work needs clean re-dispatch from current main.
4. **Bun.SQL Phase 2 (Postgres)** — parse `postgres://` URI, add Postgres schema introspection.
5. **LSP enhancement** — diagnostics on save + document symbols + go-to-definition (highest-leverage DX).

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

---

## Tags
#session-40 #active #bun-sql-phase-1 #spec-44 #lift-sql-bug

## Links
- [handOffs/hand-off-40.md](./handOffs/hand-off-40.md) — S39 closed
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/changes/bun-sql-phase-1/](./docs/changes/bun-sql-phase-1/) — Phase 1 artifacts
- [docs/changes/fix-lift-sql-chained-call/intake.md](./docs/changes/fix-lift-sql-chained-call/intake.md) — next-up bug
