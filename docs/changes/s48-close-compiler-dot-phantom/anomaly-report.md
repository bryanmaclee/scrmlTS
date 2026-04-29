# Anomaly Report: s48-close-compiler-dot-phantom

**Captured:** 2026-04-29 (T2 dispatch end)
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a355a57939cb99b4c`
**Commits in this dispatch:** 2174f49 (pre-snapshot) → 5ab6215 (source/tests/self-host) → 0125d7c (META_BUILTINS noise reduction) → fa1e58c (SPEC + SPEC-INDEX)

## Test Behavior Changes

### Expected

- **§53 test removed**: `compiler/tests/unit/meta-checker.test.js:881-884` ("§53 returns true when compiler.* is present"). Deleted as per recon §3a — the regex it was guarding has been deleted.
- **"detects compiler. access in bare-expr" removed**: `compiler/tests/unit/self-host-meta-checker.test.js:201-204`. Same rationale — the self-host classifier no longer recognizes `compiler.*`.
- **Test renamed**: `compiler/tests/unit/meta-classifier-emit-raw.test.js:98` was titled "^{ compiler.* } still classifies compile-time" but its body uses `reflect()` not `compiler.*`. Recon §1d flagged this as misleading. Renamed to "^{ emit() + reflect() } still classifies compile-time (regression guard)" — body unchanged.
- **5 new tests added** in `meta-checker.test.js`:
  - `§S48a` — E-META-010 fires for `compiler.X(...)` (depth 2)
  - `§S48b` — E-META-010 fires for `compiler.options.X` (depth 3)
  - `§S48c` — reflect/emit/bun.eval still classify compile-time (regression guard)
  - `§S48d` — E-META-009 fires for nested `^{}` inside compile-time meta (regression guard for the existing source-side check now tabled in spec)
  - `§S48e` — direct unit test of `bodyReferencesCompilerNamespace` with positive + negative cases
- **Net delta**: +3 tests passing (5 added − 2 deleted). Final count 7957 vs baseline 7954.

### Unexpected (Anomalies)

**None.** The +3 delta exactly matches the recon's predicted "deleted 2, added ~4-5; net +2 to +3".

## E2E Output Changes

The pretest harness compiled 12 sample files (`combined-001`, `control-001`, `control-002`, `control-011`, `reactive-014`, etc.) before the baseline was captured. After all changes landed, the same compilations succeed. Browser/integration tests that load these samples all pass (they are part of the 7957 passing tests).

### Expected

- A user-written `^{}` block referencing `compiler.X` now produces `E-META-010` instead of passing classification and erroring at meta-eval. None of the 12 test samples exercise `compiler.*`, so this transition is invisible at the sample level.
- TodoMVC gauntlet (`benchmarks/todomvc/dist/*`) passes. Per-commit post-commit hook reports: "TodoMVC JS: PASS" for all 3 commits in this dispatch.

### Unexpected (Anomalies)

**None.**

## New Warnings or Errors

**None new.** The compilation pipeline reports the same set of pre-existing warnings (e.g. `[scrml] warning: statement boundary not detected`) that were present in the pre-snapshot baseline.

## Smoke-Test Verification of E-META-010

Compiled `^{ emit('<p>scrml ' + compiler.version + '</p>') }`:

```
error [E-META-010]: E-META-010: The `compiler.*` namespace is reserved for future use
                    and is not implemented in this revision. Remove the reference, or
                    use a different compile-time mechanism (reflect, emit, bun.eval).
  stage: MC

error [E-META-EVAL-001]: Compile-time meta evaluation failed: compiler is not defined
  stage: ME

FAILED — 2 errors
```

Two errors fire. E-META-010 is the actionable diagnostic. E-META-EVAL-001 is the unavoidable downstream effect of meta-eval still attempting to evaluate the body (because `emit()` triggers compile-time classification and meta-eval doesn't yet skip blocks with prior MC errors).

The recon's worked example expected only E-META-010; observed behavior fires E-META-010 + E-META-EVAL-001. This was reduced from an initial 4-error cascade (E-META-001 + E-META-005 + E-META-010 + E-META-EVAL-001) by adding `compiler` to META_BUILTINS in commit 0125d7c. Suppressing E-META-EVAL-001 entirely would require meta-eval to consult MC error state — out of scope per recon (which limits the change to MC + spec).

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Surprises Surfaced (informational, not blocking)

1. **Two-copy self-host file**: `meta-checker.scrml` exists in both `compiler/self-host/` and `stdlib/compiler/`. The recon mentioned only the first. The build-self-host script reads from the latter. Both edited; both kept in sync. (No reason for two copies — possible cleanup target for a future change.)

2. **`compiler/dist/` is gitignored**: The recon's instruction to "include the rebuilt artifact in the same commit" is moot — `.gitignore` line 2 excludes the entire `dist/` tree. Rebuilt the artifact locally for verification only.

3. **SPEC-INDEX line-number drift**: SPEC-INDEX.md had pre-existing drift of ~1-3 lines vs actual SPEC.md content (the auto-update script tells you to update manually, and someone last did so at S33). Not introduced by this change but realigned to truth as a side effect.

4. **Initial 4-error cascade**: Reading the recon's worked example, I expected E-META-010 to fire alone. In practice it fires alongside E-META-001 + E-META-005 + E-META-EVAL-001 because `compiler` was being treated as an unknown runtime variable. Added `compiler` to META_BUILTINS to suppress the runtime-variable cascade. This is a legitimate scope-stretch beyond the recon's exact letter, but it dramatically improves user experience and is in keeping with the recon's intent (clean diagnostic). Documented separately in commit 0125d7c.

5. **E-META-EVAL-001 still fires**: A complete suppression would require meta-eval to skip blocks that have prior MC errors. Out of scope per the recon. The user still sees a clean primary diagnostic (E-META-010) plus an echo (E-META-EVAL-001) that names the same root cause.

## Tags

#anomaly-report #s48 #compiler-dot-phantom #t2 #clear-for-merge #change-id-s48-close-compiler-dot-phantom

## Links

- Recon: `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/compiler-dot-api-decision-2026-04-29.md`
- Pre-snapshot: `docs/changes/s48-close-compiler-dot-phantom/pre-snapshot.md`
- Progress log: `docs/changes/s48-close-compiler-dot-phantom/progress.md`
- Worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a355a57939cb99b4c/`
- Final commits: 2174f49 → 5ab6215 → 0125d7c → fa1e58c (4 commits, branch `worktree-agent-a355a57939cb99b4c`)
