# Anomaly Report: fix-acorn-implicit-dep

## Summary

**Status: CLEAR — NO ACTION TAKEN. Intake premise is incorrect.**

The intake claims `acorn` is not declared as a dependency in any `package.json`. This is **factually incorrect**. Acorn is properly declared in `compiler/package.json` and has been since the initial split commit (44c1054).

## Evidence

### 1. Acorn IS declared

`compiler/package.json` (line 8-11):
```json
"dependencies": {
    "acorn": "^8.16.0",
    "astring": "^1.9.0"
}
```

### 2. Acorn IS in lockfile

`bun.lock` contains:
```
"acorn": ["acorn@8.16.0", "", { "bin": { "acorn": "bin/acorn" } }, "sha512-..."]
```

And the compiler workspace entry references it:
```
"compiler": {
  "name": "compiler",
  "version": "0.1.0",
  "dependencies": {
    "acorn": "^8.16.0",
    "astring": "^1.9.0",
  }
}
```

### 3. Fresh install resolves acorn correctly

Performed in this worktree (no pre-existing `node_modules`):
1. `bun install` — completed in 87ms, installed 224 packages
2. `ls compiler/node_modules/acorn/package.json` — exists (acorn 8.x)
3. `bun run test` (triggers `pretest` to compile samples) — **7670 pass / 40 skip / 0 fail / 362 files** — matches the stated baseline exactly.
4. Direct CLI compile of `samples/compilation-tests/control-001-if-basic.scrml` — succeeds (only the expected `W-PROGRAM-001` warning).

### 4. Workspace placement is correct

- Only `compiler/src/expression-parser.ts` imports from acorn (verified via grep across `compiler/`, `lsp/`, `scripts/`, `samples/`, `stdlib/`, `editors/`, `benchmarks/`).
- No consumer outside the `compiler` workspace touches acorn.
- Bun's standard module resolution (file location → walk up → `node_modules`) finds `compiler/node_modules/acorn` from any caller within `compiler/src/`, including invocations from the root such as `bun run compiler/src/cli.js compile X`.
- Placement matches the project's pattern: deps live where they're used (`vscode-languageserver` at root because `lsp/server.js` lives at root; `acorn`/`astring` in `compiler/` because they're used only by compiler sources).

## Why the parallel-sites agent reported needing `bun add acorn`

Cannot reproduce. Possibilities:
1. The parallel agent's worktree had a partially-installed state where `compiler/node_modules` was missing while root `node_modules` existed (e.g., the agent had run `bun install` from inside `compiler/` in a way that didn't trigger workspace symlinking, or the worktree was created from a state where deps were missing).
2. The parallel agent ran `bun install` in a non-workspace mode by accident.
3. The parallel agent misread an unrelated import error (e.g., a path-resolution problem from a different change) as an "acorn missing" error and applied a workaround that happened to coincide with re-running `bun install`.

In any case, the intake's described root cause — undeclared dependency — is not present in the current main (`e1827e6`).

## Recommended action

- **No package.json change.** Adding acorn to the root would duplicate an existing correct declaration and violate the project's "deps live where they're used" pattern.
- **Recommend closing the intake.** Update the intake's status to `closed: false-positive` with a pointer to this report.
- **If reproducibility is still a concern,** add a smoke test: a CI job that does `rm -rf node_modules compiler/node_modules && bun install && bun run test` periodically to catch any future drift between `package.json` declarations and actual import surface.

## Verification commands (re-runnable)

```bash
# From repo root
grep -n "acorn" compiler/package.json bun.lock | head
rm -rf node_modules compiler/node_modules
bun install
ls compiler/node_modules/acorn  # exists
bun run test                    # 7670 pass / 0 fail
```

## Test result

```
7670 pass
40 skip
0 fail
27589 expect() calls
Ran 7710 tests across 362 files. [6.85s]
```

(Matches stated baseline of 7,670 pass / 40 skip / 0 fail / 362 files.)

## Anomaly Count: 0
## Status: CLEAR — NO CODE CHANGE REQUIRED

## Tags
#acorn #dependency #false-positive #no-action #cleared

## Links
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/docs/changes/fix-acorn-implicit-dep/intake.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/docs/changes/fix-acorn-implicit-dep/progress.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/compiler/package.json
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a55e320d155fd930e/bun.lock
