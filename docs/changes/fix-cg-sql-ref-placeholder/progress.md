# Progress: fix-cg-sql-ref-placeholder

- [t0] Started — verified worktree at agent-a0962950f82395d66, on `worktree-agent-a0962950f82395d66` branch at base `e1827e6`.
- [t0] Repo state confirmed: tests baseline 7670 pass / 40 skip / 0 fail / 362 files.
- [t0] Pre-snapshot written. Reproducer compiles and shows both bug shapes.
- [t1] Plan: mirror lift-expr SQL fix (S40 commits 4074ea3..baccf56) in two ast-builder return-stmt sites + emit-logic case "return-stmt" — attach `sqlNode` to return-stmt when expr is a `?{...}` BLOCK_REF, route through `case "sql"`.
