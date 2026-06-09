# Tranche 1 — Typed SQL projection rows (SPEC §14.8.7 spec-debt) — change-id: typed-sql-row-tranche1-2026-06-08

Dispatched S175 (2026-06-08) to scrml-js-codegen-engineer, isolation:worktree, model opus, background. Agent id af004eb79c8c26290. Ratified S175 (user-voice scrmlTS S175 — Shape C; this is Tranche 1 = read-site typing only).

You are implementing the read-site typing of SQL query results in the scrml compiler. This is **spec-debt**: SPEC §14.8.7 already mandates the behavior verbatim; the compiler unconditionally discards it. Commit after each meaningful sub-step; update docs/changes/typed-sql-row-tranche1-2026-06-08/progress.md after each step. WIP commits expected.

## MAPS — REQUIRED FIRST READ
Read .claude/maps/primary.map.md in full; follow §"Task-Shape Routing" for a compiler-source feature (type-system + new parser helper + diagnostics). Map currency: HEAD f0b3cb04 as of 2026-06-08; only the docs-only S174 wrap (26b5f1e5) since — current for source. Verify map content via grep/Read. Report maps-consulted feedback line.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S88/S90/S99/S126)
Startup (before any other tool call): pwd MUST start with /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent- (else STOP — S90); git rev-parse --show-toplevel == WORKTREE_ROOT; git status --short clean; bun install; bun run pretest; baseline via `bun run test` not `bun test`. Path discipline: ALL edits via Bash (perl -i/python3/heredoc/cp) on worktree-absolute paths incl. .claude/worktrees/agent-<id>/ segment — NOT Edit/Write tools (S126 #12/#13 leak class). NEVER cd into main/anywhere; use git -C "$WORKTREE_ROOT", bun --cwd "$WORKTREE_ROOT", worktree-absolute paths (S126 #14/#15). First commit message includes verbatim pwd.

## THE TASK
Implement SPEC §14.8.7's promised typed SQL projection rows. READ SPEC §14.8 IN FULL (~7701-7933) + §8.3 first (Rule 4). The gap: type-system.ts:7304-7307 `case "sql": { resolvedType = tAsIs(); break; }` unconditionally discards the row type. generateDbTypes (type-system.ts:4734) already synthesizes nominal per-table struct types (full+client view, SQLite-affinity, nullable→T|not) into <db>-block scope; they're computed then unreachable. SCOPE = READ-SITE typing only; the cross-file prop-contract (Shape C width-subtyping into a declared :struct) is Tranche 2 — DO NOT build here.

### Sub-step A — F-SCHEMA-001: feed <schema> DDL as a 3rd ColumnDef source
protect-analyzer.ts builds ColumnDef[] only from live-DB PRAGMA or harvested CREATE TABLE; does NOT consume <schema> DDL. schema-differ.js parseSchemaBlock/parseColumns already parses <schema> DDL into {name, columns:[{name,type,constraints,references,nullable}]} — survey + reuse. Add <schema> as a 3rd ColumnDef source so generated types exist for DDL-first apps w/o a live DB. Respect existing precedence; document the rule.

### Sub-step B — SELECT-projection extraction
SQL node carries raw query text; NO projection extracted today. Build a helper returning projected columns: explicit lists, qualified (l.id), AS aliases (c.name AS customer_name → customer_name typed as source col), FROM/JOIN table-alias map (FROM loads l LEFT JOIN customers c → l→loads, c→customers). Survey WHERE the query text is reachable at TS stage (the sql AST node) — don't assume parse-sql-body.js; the helper is consumed at type-system.ts case sql. Live pipeline is BS+Acorn; confirm which AST shape reaches the typer (native parser is parallel; check maps parser-path fork).

### Sub-step C — wire the row type at type-system.ts:7305
Replace tAsIs() with a structural projection row: resolve each projected/aliased column against in-scope generated table types; .get()→Row|not, .all()→Row[] (§8.3); thread full/client view (RouteMap per §14.8.4) into projection inference + fire E-PROTECT-001 on a protected column in a client-boundary projection (§14.8.7 last bullet).

### Graceful degradation (ratified v1 SQL surface — NEVER break compilation)
Computed/expression column → that ONE column asIs, rest of row typed, info-lint naming it. SELECT * → single-table expand; JOIN/ambiguous → whole row asIs+lint. CTE/UNION/subquery-in-FROM/unresolvable → whole row asIs+lint (defer long tail). NEW info-lint: survey §34; if none mint W-SQL-ROW-UNTYPED (Info; partitions to result.warnings) + add the §34 row IN THE SAME CHANGE (Rule 4); cross-ref §14.8.7.

### SPEC currency (same arc)
Flip §14.8.7 "as if implemented" → implemented where connected (note the fallback). Grep §14.8 for residual `any` type-token (DD flagged §14.8.3/.5; my read shows asIs — verify) → fix to asIs if found (any hard-rejected S174).

## PHASE 0 — SURVEY-CONFIRM GATE (before implementing)
Survey + REPORT before code: type-system.ts:7304-7307 + resolvedType flow + how .get()/.all() reaches the typer; generateDbTypes:4734 output + scope insertion (§14.8.4); where the sql node query text+chained calls live on the AST reaching the typer (live BS+Acorn — confirm via maps); schema-differ.js parseSchemaBlock/parseColumns (reuse for A); protect-analyzer.ts ColumnDef sources + precedence; §34 for an existing untyped-row lint. Depth-of-survey discount applies — if the brief is off (wrong file, infra already covers, cheaper path) STOP + report; you are AUTHORIZED to correct touchpoints.

## COMMIT DISCIPLINE (S83 two-sided)
After every edit: git -C "$WORKTREE_ROOT" diff/add, commit immediately, per sub-step. Code + coupled test = ONE commit. Before DONE: git status --short clean.

## PHASE 3 — R26 EMPIRICAL VERIFICATION (MANDATORY — S138)
Re-compile examples/23-trucking-dispatch on post-fix baseline:
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/examples/23-trucking-dispatch --output-dir /tmp/r26-tsql-verify > /tmp/r26-tsql-verify.log 2>&1
Checks: board.scrml + load-detail.scrml queries produce a typed projection row (NOT asIs) — show it; .get()/.all() field access type-checks; c.name AS customer_name → customer_name: string; node --check exit 0; no new full-suite regressions (bun run test vs S174 baseline 23,484 pass/0 fail). DO NOT mark DONE without R26 passing.

## OUT OF SCOPE
Tranche-2 cross-file :struct prop contract + width-subtyping (Shape C). A full SQL parser (CTE/UNION/window/expression typing) — graceful-degrade.

## FINAL REPORT
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (worktree-absolute), inferred row type for board.scrml query (proof), R26 results (greps + full-suite counts), §34 lint code added, Phase-0 SCOPE corrections, deferred items, MAPS feedback line.
