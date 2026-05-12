# Wave 3 Dispatch 3 — Phase B Benchmarks Refresh

## Progress log (append-only)

### 2026-05-12 — Startup

- WORKTREE_ROOT = `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afa1b84a0999559d9`
- HEAD = `23e6265` (post-S85 wrap, v0.2.6 tagged)
- `bun install` (root) — 117 packages installed
- `bun run pretest` — sample compile OK
- `git config core.hooksPath scripts/git-hooks` — set
- Baseline test run: **11511 pass / 96 skip / 1 todo / 0 fail / 557 files** (first run had 2 transient ECONNREFUSED failures from network tests; second run clean). Note: dispatch prompt's expected `11580/114/1/0/562` is stale — actual HEAD baseline is 11511/96/1/0/557. Treating actual HEAD numbers as TESTS_BEFORE.

### 2026-05-12 — Comparator app refresh + rebuild

- Re-ran `bun install` in `benchmarks/todomvc-react/`, `-svelte/`, `-vue/` (worktrees don't auto-inherit node_modules from parent).
- React: vite@6.4.1 + react@19.2.4 + react-dom@19.2.4
- Svelte: svelte@5.55.1 + @sveltejs/vite-plugin-svelte@5.1.1 + vite@6.4.1
- Vue: vue@3.5.32 + @vitejs/plugin-vue@5.2.4 + vite@6.4.1
- Rebuilt scrml TodoMVC dist: `bun run compile benchmarks/todomvc/` — compiled in 197.8ms (single warm run, NOT the median; full 10-run median measured below).
- Comparator dist builds (first run): React 956ms, Svelte 719ms, Vue 735ms.
