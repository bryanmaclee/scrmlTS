# Progress: oq-2-dev-server-bootstrap

- [start] Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a94cd4a36019acf92`
- [start] Branch: `changes/oq-2-dev-server-bootstrap`
- [start] HEAD: `3dab098` (matches main — no rebase needed)
- [step 1] Bootstrapped node_modules at root + compiler. Compiled samples. Baseline `bun test` = 8,196p / 40s / 0f / 385 files. Matches brief expectation.
- [step 2] Reproduced OQ-2 failure. Root cause is identical under `compile` AND `dev` — codegen emits literal `import { ... } from "scrml:auth"` and Bun cannot resolve `scrml:*`. Documented in repro.md and diagnosis.md.
- [step 3] Selected fix shape: **Shape B with hand-written runtime shims**. Reasoning: stdlib `.scrml` source files do NOT compile cleanly via the standard pipeline (`server {}` blocks emit E-SCOPE-001 errors at TS stage — separate compiler gap). Compiling stdlib transitively is therefore out of scope for OQ-2. Smallest path to runnable dispatch: ship hand-written JS implementations for the 4 stdlib functions the dispatch app actually uses (hashPassword, verifyPassword, generateToken, createSessionStore), plus the bundling + import-rewrite infrastructure to wire them in. Future dispatch can replace shims with truly-compiled stdlib once the compiler can lower `server {}` blocks at TS time for stdlib sources.
- [step 4] Committed pre-snapshot + repro + diagnosis (commit e1b285b).
- [step 5] Begin implementation — write runtime shims, bundling pass, import rewriter.
