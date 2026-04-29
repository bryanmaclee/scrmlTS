# Progress: add-w-tailwind-001 — W-TAILWIND-001 warning

## Timeline

- [start] Worktree clean, deps installed.
- [baseline] Unit tests: 6020 pass / 0 fail. Full suite (after `bun run pretest` to compile dist samples): 7954 pass / 40 skip / 0 fail.
- [decision] Detection rule reconciled with task-brief test cases (which expect `md:p-4` and `hover:bg-blue-500` to fire even though the embedded engine has incidental partial support). Rule simplified to **shape-based**: class name contains `:` or `[` → fire W-TAILWIND-001. SPEC §26.3 lists the entire variant + arbitrary-value system as TBD per SPEC-ISSUE-012, so the warning is correct on shape regardless of any incidental implementation that happens to match.
- [step1] Added `findUnsupportedTailwindShapes(source)` to `compiler/src/tailwind-classes.js`. Returns one diagnostic per offending (offset, class) pair with `code`, `severity`, `className`, `message`, `line`, `column`. Committed as WIP `5436318`.
- [step2] Wired into `compiler/src/api.js` next to `lintGhostPatterns`. Diagnostics flow through `lintDiagnostics[]` and print via existing `formatLintDiagnostic` plumbing in `compiler/src/commands/compile.js`. Added 32 unit tests at `compiler/tests/unit/compiler-warnings-tailwind.test.js`. Committed as WIP `e490548`.
- [bug] Real-sample compile of `gauntlet-r10-svelte-dashboard.scrml` showed false positives on dynamic-class expressions like `class="${cond ? 'a' : 'b'}"` — the ternary's `:` was being parsed as a Tailwind variant prefix.
- [step3] Added `maskInterpolations()` helper in `tailwind-classes.js` that brace-balances over `${...}` regions in the attribute value and replaces them with same-length whitespace before the per-class scan runs. Source offsets stay accurate because the mask preserves byte length and newlines. +6 new tests in `§10`. Committed as WIP `cc66ba3`.
- [verify] Real-sample compile no longer reports false positives. Full suite: 7992 pass / 40 skip / 0 fail (was 7954/40/0). +38 tests, 0 regressions.
- [spec] SPEC.md inline amendment (§26.3 paragraph + §34 row) deferred to a follow-up commit because the file is 941KB / 20,442 lines, and the agent's only file-write mechanism is `Write` (no `Edit`); rewriting the entire file for two cosmetic insertions would have consumed a disproportionate share of context budget. Documented at `docs/changes/add-w-tailwind-001/spec-amendment.md` with literal before/after text for both sections, ready to apply.

## Final state

- Branch: `worktree-agent-ae8ce419b48d2d605`
- Test result: 7992 pass / 40 skip / 0 fail (delta vs. pre-change: +38 / 0 / 0).
- Files touched:
  - `compiler/src/tailwind-classes.js` (added detector + interpolation mask)
  - `compiler/src/api.js` (wired detector into pre-BS lint loop)
  - `compiler/tests/unit/compiler-warnings-tailwind.test.js` (new, 38 tests)
  - `docs/changes/add-w-tailwind-001/progress.md`
  - `docs/changes/add-w-tailwind-001/spec-amendment.md` (deferred SPEC.md edit, ready to apply)

## Known follow-ups (out of scope)

- Apply the inline SPEC.md edit per `docs/changes/add-w-tailwind-001/spec-amendment.md`. Pure documentation, no code change.
- Once SPEC-ISSUE-012 closes (Option 3, the actual variant + arbitrary-value implementation), W-TAILWIND-001 should be retired (or scoped down — e.g. fire only on classes that genuinely don't match) and the spec text in §26.3 updated.
- Separate silent bug noted during analysis: `getTailwindCSS('weird:p-4')` returns `.p-4 { padding: 1rem }` (the unprefixed rule). The user-written class `weird:p-4` doesn't match `.p-4`, so no styles apply, but compilers with the variant + arbitrary-value implementation might choose to emit a different CSS rule entirely. Worth fixing alongside SPEC-ISSUE-012.
