# DISPATCH CONTEXT
scrml compiler feature: R28-7 (HIGH) — gauntlet R28 fix-wave tail, S143. Baseline HEAD `6507f596` (v0.6.11; emitted-JS parse gate DEFAULT-ON). `isolation: "worktree"`.

# MAPS
`.claude/maps/primary.map.md` is ~17 commits stale (watermark `9ab7aa38`). Read §Task-Shape Routing (new feature) as a STARTING HYPOTHESIS; verify against current source via grep/Read.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo → STOP and report. Save as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" status --short` clean; then `git -C "$WORKTREE_ROOT" merge main` (fast-forward expected).
4. `cd "$WORKTREE_ROOT" && bun install`; then `bun run pretest`.
5. First commit message MUST include verbatim `pwd`: `WIP(r28-7): start at <pwd>`.
## Path discipline (S126): edit ALL files (incl. SPEC.md) via Bash (`perl -i` / `python3` / heredoc) on WORKTREE-ABSOLUTE paths containing `.claude/worktrees/agent-<id>/`. NO Edit/Write tool for source/SPEC. NEVER `cd` into main. `git -C "$WORKTREE_ROOT"` / `bun --cwd "$WORKTREE_ROOT"`. Reading R28 dev sources from scrml-support is READ-ONLY/fine.

# COMMIT DISCIPLINE (S83): commit per change; clean `git status` before DONE; no `--no-verify` (STOP+report on env race).

# THE FEATURE — R28-7: schemaFor + tableFor must map `T | not` (nullable) optional struct fields
**Symptom (PA-verified, 5/5 R28 devs):** a struct field typed `string | not` / `integer | not` (the canonical scrml optional/nullable shape, §42) is rejected by BOTH L22 members — `E-SCHEMAFOR-NO-SQL-MAPPING` / `E-TABLEFOR-NO-DISPLAY-MAPPING` — lumped with arbitrary unions. Adopters must `omit=` every nullable field, breaking the L22 "define once, derive everywhere" promise on the MOST COMMON DB shape.

**Rule-4 grounding (this is a real gap, NOT a deferral):** SPEC §14.8.3 (lines ~7688-7696) normatively ties nullable↔`T | not` in the DB-introspection direction: "A `ColumnDef` with `nullable: true` SHALL produce a field type of `T | not`." The INVERSE — schemaFor lowering `T | not` → a nullable column — is the natural completion and is NOT in any v1.0 scope-out list (§41.15.8/§41.16.6 unmappable sets list fn/Promise/snippet/foreign/proxy/opaque — NOT unions-with-`not`). `T?` is sugar for `T | not` (§5721) → rides the same fix.

## What to build (4 parts):

**1. SPEC amendment — §41.15 (schemaFor) + §41.16 (tableFor).** Add normative statements: a struct field typed `T | not` (or `T?`) where `T` is a v1.0-mappable base type (string/integer/real/boolean/timestamp/bare-variant-enum) maps to a NULLABLE column (schemaFor: the base `T` column type, WITHOUT the `NOT NULL` / `req` constraint) and a NULLABLE cell (tableFor: render base `T`'s value when present, an EMPTY `<td>` when `not`). Clarify the §41.15.8 / §41.16.6 union-exclusion to mean **non-`| not` unions only** (e.g. `string | integer` stays unmappable). Cross-ref §14.8.3 (the inverse). Update the `E-SCHEMAFOR-NO-SQL-MAPPING` / `E-TABLEFOR-NO-DISPLAY-MAPPING` §34 + §41 prose so the error fires only for genuinely-unmappable types, not `T | not`.

**2. schemaFor impl** — `compiler/src/codegen/emit-schema-for.ts` (+ the type-classification in `compiler/src/type-system.ts` where the field type is classified mappable-vs-no-mapping; see emit-schema-for.ts:256 "union, not — no v1.0 mapping" + the `_processSchemaForCallInSchemaContext`/walker). Detect a union ResolvedType (kind:"union") that is exactly `[T, not]` (one member `not`, the other a mappable base type) → emit the base `T`'s SQL column, NULLABLE (omit `NOT NULL`; a `req` validator on the field is a CONFLICT — surface or ignore per existing precedence). Enum base → the existing `text req oneOf([...])` lowering MINUS the `req` (nullable enum column).

**3. tableFor impl** — `compiler/src/codegen/emit-table-for.ts` (+ type-system classification; emit-table-for.ts:622). Detect `[T, not]` union → render base `T`'s default per-cell rendering (§41.16.6) guarded so an absent (`not`) value yields an EMPTY `<td>` (NOT the literal string "null"/"undefined" — guard with a not-check / `?? ""`). The DESIGN CHOICE IS SETTLED: **empty `<td>` for the absent case** (no "—"; adopters override via a `<column>` slot).

**4. Tests** — schemaFor: `subtitle: string | not` → nullable `text` column (no NOT NULL); `publishedAt: integer | not` → nullable integer; enum `| not` → nullable oneOf. tableFor: `T | not` cell renders the value when present, empty `<td>` when not; `T?` sugar rides the same. REGRESSION: non-nullable unions (`string | integer`) STILL fire the no-mapping error; payload-bearing-enum / nested-struct rejections unchanged.

# PHASE 3 — R26 EMPIRICAL VERIFICATION (S138 — MANDATORY before DONE)
Re-compile the R28 dev sources from scrml-support (READ-ONLY) after REVERTING their `omit=` workarounds for the `T | not` fields back to including those fields:
- DEV_SOURCES (use a tiny press.db where they need `<db>` introspection): SS/dev-1-react.scrml, SS/dev-2-go.scrml, SS/dev-5-pascal.scrml (they declared `subtitle: string | not` / `publishedAt: integer | not` then omitted them from schemaFor/tableFor).
- Confirm: with the `T | not` fields INCLUDED in schemaFor/tableFor, compile is clean (no E-SCHEMAFOR-NO-SQL-MAPPING / E-TABLEFOR-NO-DISPLAY-MAPPING); schemaFor emits a nullable column (grep the emitted DDL — no `NOT NULL` on the nullable field); tableFor emits an empty-guarded cell; node --check passes.
- Build minimal repros for both members + the `T?` sugar form + the non-nullable-union regression.
DO NOT mark DONE without R26 passing.

# REPORT
WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED · REGRESSION-TESTS-ADDED · R26-RESULT · STOPPED? (if the type-classification refactor is larger than expected, land schemaFor first + STOP-report tableFor) · MAPS-FEEDBACK.
