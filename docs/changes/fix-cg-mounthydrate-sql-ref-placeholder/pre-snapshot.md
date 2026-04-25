# Pre-snapshot: fix-cg-mounthydrate-sql-ref-placeholder

**Branch:** `changes/fix-cg-mounthydrate-sql-ref-placeholder` (from local `main` at `7a91068`)
**Date:** 2026-04-24

## Tests (3 baseline runs from `compiler/`)

- Run 1: 7766 pass / 40 skip / 2 fail / 7808 total — 2 failures both ECONNREFUSED in network test (flaky — unrelated to this fix)
- Run 2: 7767 pass / 40 skip / 0 fail / 7807 total
- Run 3: 7767 pass / 40 skip / 0 fail / 7807 total

**Stable baseline:** 7767 pass / 40 skip / 0 fail / 7807 total. The 2-fail run is flaky network noise; ignore.

## Sample compilation (275 .scrml inputs)

- ok=251 fail=24 — pre-existing failures, characterized in parent fix anomaly report; not a target of this change.

## Reactive-set / sql-ref placeholder leak baseline

Scan via `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/scan-dist.mjs`:

| Pattern | Count |
|---|---|
| `_scrml_reactive_set("name", )` (empty arg) | **1** |
| `/* sql-ref:N */` (pre-existing leak) | 21 |

### Empty-arg sites (in scope)

| File | Line | Code |
|---|---|---|
| `combined-007-crud.client.js` | 55 | `_scrml_reactive_set("users", );` |

### sql-ref placeholder sites (out of scope — sibling intakes)

All in `let x = ?{...}` shape (sibling intake `fix-cg-let-decl-sql-ref-placeholder`):

| File | Line | Pattern |
|---|---|---|
| `combined-004-data-table.client.js` | 5 | `let users = /* sql-ref:-1 */;` |
| `combined-013-blog.client.js` | 5 | `let posts = /* sql-ref:-1 */;` |
| `edge-009-nested-sql-in-logic.client.js` | 5,6 | `let count = /* sql-ref:-1 */;` |
| `gauntlet-r10-elixir-chat.server.js` | 67,94,198 | `let rows = /* sql-ref:-1 */...` |
| `gauntlet-r10-go-contacts.server.js` | 82 | `let rows = /* sql-ref:-1 */...` |
| `gauntlet-r10-rails-blog.server.js` | 68,122,148,186 | `let rows/tags/newPost = /* sql-ref:-1 */...` |
| `protect-001-basic-auth.server.js` | 69 | `let user = /* sql-ref:-1 */;` |
| `sql-001..sql-009` (client.js, 7 files) | 5 (and 6,7 for sql-009) | `let X = /* sql-ref:-1 */;` |

These will remain unchanged after this fix — they are NOT the target.

## Source-file context (relevant to this change)

- `compiler/src/codegen/emit-logic.ts` lines 562-638 — `case "reactive-decl"` already has the server-boundary SQL handler (S40 `9d65a46`); client falls through to legacy emitter on lines 590-637. The S40 fix added the comment "the semantically-correct client-side fix (mountHydrate routing) is sibling work" — **this** is the sibling.
- `compiler/src/codegen/emit-sync.ts` lines 181-197 — `emitUnifiedMountHydrate` exists and works for `server @var` decls.
- `compiler/src/codegen/emit-server.ts` lines 754-793 — synthetic `__mountHydrate` route handler.
- `compiler/src/codegen/collect.ts` lines 449-482 — `collectServerVarDecls` only matches `isServer === true` (`server @var`), so plain `@var = ?{...}` is excluded.

## Reproducer

`samples/compilation-tests/combined-007-crud.scrml` line 6:
```scrml
@users = ?{`SELECT id, name, email FROM users`}
```
Compiles to `_scrml_reactive_set("users", );` on the client (line 55 of `.client.js`).

## Tags
#pre-snapshot #fix-cg-mounthydrate-sql-ref-placeholder #s40-followup #sql #client-side

## Links
- intake: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/intake.md`
- scan helper: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/scan-dist.mjs`
- compile helper: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/compile-all.mjs`
- baseline json: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/scan-baseline.json`
- parent anomaly report: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/anomaly-report.md`
