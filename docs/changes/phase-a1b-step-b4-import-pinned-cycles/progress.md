# Progress: A1b Step B4 — Import binding registration + pinned forward-ref check

**Re-scoped per S66 Phase 0 STOP findings.** Two PA-brief corrections govern this re-dispatch:

1. Algorithm is a SOURCE-POSITION forward-reference rule (NOT cycle/SCC detection). Spec §6.9.3, §6.10.2, §6.10.5, §7.6.1, §21.8.1 are uniform on this.
2. E-IMPORT-PINNED-INVALID best-effort scope (Option A): fire on `pinned` imports of definitively-not-cell-not-engine kinds (function/fn/type/channel); accept const/let with deferral comment for B14.

Path note: directory name retained from original brief framing for traceability; content describes the actually-shipped source-position rule.

---

## Plan

- Phase 1 — `importBindings` per-scope registry; SYM PASS-1 extension. WIP commit.
- Phase 2 — Source-position forward-ref check in SYM PASS-3 (extends B3 walker). WIP commit.
- Phase 3 — E-IMPORT-PINNED-INVALID best-effort fire (Option A). WIP commit.
- Phase 4 — Primer §13.7 update + this progress.md final state.
- Phase 5 — Final verification (full `bun run test`).

## Baseline

- Branch: `changes/phase-a1b-step-b4-import-binding-pinned-forward-ref`
- Pre-snapshot: `bun run test` baseline 9018-9019 pass / 44 skip / 1 todo / 0 stable fail (2 transient ECONNREFUSED, network-flaky, pre-existing).

## Log

- [start] Branch created. Baseline test run captured. Worktree clean. `bun install` + `bun run pretest` complete.
