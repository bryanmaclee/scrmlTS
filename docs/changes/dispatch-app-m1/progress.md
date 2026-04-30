# Dispatch App — M1 (Schema + Auth scaffold) — Progress Log

Append-only timestamped log. Every meaningful step writes a line.

## 2026-04-29 — Startup

- pwd verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a9c649665bded2909`
- `git rev-parse --show-toplevel` matches; tree clean.
- `bun install` ran (224 packages); fresh worktree had no node_modules.
- `bun test` baseline: **7961 pass / 40 skip / 134 fail / 28299 expect calls / 8135 tests across 383 files**.
  - Pre-existing failures are environment-only (browser tests need pre-built `samples/compilation-tests/dist/*.html` artifacts that don't exist in this fresh worktree).
  - Prompt's stated baseline (8125/40/0/384) is from main with the dist built. M1 cannot affect these — adding an example dir is purely additive.
- Read kickstarter v1, scoping doc (from main, since worktree mirror not synced), examples/22-multifile/, 17-schema-migrations.scrml, 18-state-authority.scrml, 19-lin-token.scrml, 21-navigation.scrml, stdlib/auth/{index,jwt,password}.scrml, stdlib/crypto/index.scrml, stdlib/store/{index,kv}.scrml.

## Plan — file shapes

```
examples/23-trucking-dispatch/
├── README.md                  scope statement + run instructions + auth gate gap callout
├── app.scrml                  <program auth="required" db="./dispatch.db"> + <schema> + nav shell stub
├── schema.scrml               <db> + table aliases — actually merged into app.scrml since <schema> needs <program> sibling
├── models/
│   └── auth.scrml             pure-fn file: getCurrentUser, checkRole, hashPassword/verifyPassword wrappers, login/logout/register server fns
├── pages/
│   └── auth/
│       ├── login.scrml        form posting to login()
│       └── register.scrml     form posting to register()
└── seeds.scrml                INSERT ... ON CONFLICT DO NOTHING data
```

Decision: `app.scrml` carries `<program db="...">` + `< schema>` + `< db>` blocks all in one file (per the §39 rule that `<schema>` requires `<program db=...>`). `schema.scrml` will be a co-resident reference if we want pure schema separation; but cleaner to keep schema declaration alongside the program root. I'll put schema in `schema.scrml` as a pure-type/include file IF the compiler allows cross-file `<schema>`; if not, fold it into app.scrml.

Investigating: §39 in kickstarter says schema needs `<program db="...">` sibling — so likely needs to be in same file. Plan is to keep schema co-located in `app.scrml` alongside the program root, BUT the spec said "schema.scrml" file. Compromise: keep `schema.scrml` as a pure-data file with a giant comment + the canonical schema as a string constant for documentation, and put the actual `< schema>` block in app.scrml. Will adjust if this turns out workable differently.

(Update post-implementation: see commit log for what shipped.)

## Steps

- 2026-04-29 T+10min — schema.scrml committed (pure-type file, 203 LOC).
- 2026-04-29 T+25min — models/auth.scrml drafted; first compile failed with E-EQ-004 (=== ban), E-SCOPE-001 (destructuring inside for-of), E-SQL-004 (cross-file SQL access), and E-CG-006 (server pattern leaked). Rewrote auth.scrml as pure-helper file (no SQL, no server fns) — exports cookie helpers, role checks, constants, and re-exports UserRole.
- 2026-04-29 T+30min — FRICTION.md drafted with F-AUTH-001 (P0, role gate inert), F-AUTH-002 (P0, cross-file SQL), F-EQ-001 (P2, === paper cut), F-DESTRUCT-001 (P2).
- 2026-04-29 T+45min — app.scrml drafted with `<program db= auth=>` + full `<schema>` (9 tables) + `<db>` block holding inlined login/register/logout/getCurrentUser server fns + on-mount runSeeds() hook. Tailwind nav shell.
- 2026-04-29 T+50min — seeds.scrml drafted with realistic NE Utah oil/gas data: 3 customers, 4 drivers, 3 tractors, 4 trailers, 8 loads. Idempotent INSERTs via ON CONFLICT DO NOTHING + NOT EXISTS guards. Initial `export server function runSeeds()` failed E-IMPORT-004 → switched to `export function runSeeds() { server { ... } }`. Logged as F-EXPORT-001.
- 2026-04-29 T+55min — pages/auth/login.scrml + register.scrml drafted as standalone `<program auth="optional">` files with their own `<db>` blocks containing duplicated server fn bodies (per F-AUTH-002 inability to share). Tailwind utility CSS.
- 2026-04-29 T+60min — first full-dir compile: hit E-PA-002 (dispatch.db doesn't exist + < schema> not consulted by PA) → bootstrapped dispatch.db with bun -e + raw CREATE TABLE IF NOT EXISTS. Logged as F-SCHEMA-001 (P1).
- 2026-04-29 T+65min — W-TAILWIND-001 fired on focus:outline-none / focus:ring-2 / focus:ring-blue-500 — stripped focus: variants from auth pages. Note: W-TAILWIND-001 message says focus: variant IS supported but the underlying utilities (outline-none, ring-2, ring-blue-500) are not in the embedded engine yet (SPEC-ISSUE-012).
- 2026-04-29 T+70min — W-AUTH-001 fires even when auth="optional" is explicit on `<program>`. Logged as F-AUTH-003 (P2).
- 2026-04-29 T+75min — final dir compile clean (5 expected warnings: 3 W-PROGRAM-001 on module files, 2 W-AUTH-001 false positive on auth pages).
- 2026-04-29 T+80min — README.md drafted with run instructions + seeded creds + friction summary.

## Final state

Compile output (full dir): 6 files compiled, 5 warnings, 0 errors.

LOC:
- app.scrml          301 (~93 comments)
- schema.scrml       203 (~154 comments — mostly DDL reference)
- seeds.scrml        370 (~76 comments — bulk is seed-data tables)
- models/auth.scrml  110 (~47 comments)
- pages/auth/login.scrml     133
- pages/auth/register.scrml  170
- README.md          128
- FRICTION.md        157
TOTAL                1572

Net code (non-comment, non-blank): ~844 LOC. Over the ~700 budget primarily because:
1. The 9-table `<schema>` block is ~110 lines of DDL.
2. seed-data tables are ~140 lines of object literals (3 customers + 4 drivers + 3 tractors + 4 trailers + 8 loads).
3. Two auth pages each duplicate the login/register server fn body per F-AUTH-002 (not factorable until that gap is fixed).

Friction findings (all logged in FRICTION.md):
- F-AUTH-001 (P0) — `auth="role:X"` is silently inert on pages.
- F-AUTH-002 (P0) — cross-file `server function` with `?{}` SQL hits E-SQL-004; can't share login() between pages.
- F-SCHEMA-001 (P1) — `<schema>` block doesn't satisfy E-PA-002; adopters must pre-create the DB.
- F-EXPORT-001 (P1) — `export server function` is silently unrecognized (E-IMPORT-004 in importer).
- F-AUTH-003 (P2) — W-AUTH-001 fires even when `auth=` IS explicit.
- F-EQ-001 (P2) — `===` ban paper cut (well-handled; no action).
- F-DESTRUCT-001 (P2) — array destructuring inside for-of confuses type-scope (needs isolated repro).

Pre-commit test suite (post-final-commit): the full `bun test` baseline at HEAD before M1 was 7961 pass / 40 skip / 134 fail (browser-test artifacts missing in fresh worktree). Pre-commit hook in this worktree runs the unit/integration/conformance subset (excluding browser): 7371 pass / 30 skip / 0 fail / 355 files at the schema.scrml commit. M1 is purely additive (new example dir) — cannot regress compiler behavior.

Status: READY FOR MERGE.
