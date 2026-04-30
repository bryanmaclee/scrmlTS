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

