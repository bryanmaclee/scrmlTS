# fix-acorn-implicit-dep — Intake

**Surfaced:** S40 2026-04-24, by parallel-sites agent during fix-lift-sql-chained-call-parallel-sites.
**Status:** filed, not started.
**Priority:** medium — fresh-clone reproducibility issue.

## Symptom

`compiler/src/expression-parser.ts` imports from `acorn`, but `acorn` is **not declared** as a dependency in `package.json` (or any workspace `package.json`). The package works locally because someone's `bun install` once pulled it transitively (or it was installed manually long ago and the lockfile hasn't been re-pruned).

A fresh clone + `bun install` would fail to import `acorn` and the compiler would not build/run.

## Reproducer

```bash
git clone <repo>
cd scrmlTS
bun install
bun test compiler/tests/unit/sql-params.test.js   # expects: error importing acorn
```

(Or any test that pulls in `expression-parser.ts`, which is essentially the entire suite.)

## Confirmed by

Parallel-sites agent (worktree-agent-a5537744e8d9f1cba). The agent had to `bun add acorn` in its worktree to get sample compilation working.

## Suggested fix

Add `acorn` to dependencies in the appropriate `package.json`. Likely `compiler/package.json` (since that's where it's imported), but verify the workspace structure to pick the right scope.

```bash
cd compiler && bun add acorn
git diff compiler/package.json compiler/bun.lock
```

Verify with:
```bash
rm -rf node_modules compiler/node_modules
bun install
bun test
```

## Tags
#bug #dependency #reproducibility #fresh-clone #acorn
