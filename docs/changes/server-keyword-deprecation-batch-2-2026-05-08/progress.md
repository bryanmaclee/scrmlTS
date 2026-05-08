# Progress: server-keyword-deprecation-batch-2

- [start] Worktree verified — base SHA 479ec1a + Batch 1 SHIP ea0ee5b confirmed.
- [start] `bun install` clean.
- [start] `bun run pretest` clean.
- [start] Baseline: 9822 / 64 / 1 / 3 — matches brief.
- [start] §52 Tier 1 vs Tier 2 vs §52.10 disambiguation verified — `server @var` (cell authority modifier) and `server function` (function modifier) are distinct constructs; deprecation applies ONLY to `server function`.
- [start] §47.10 in Insight 26 amendment list is a typo — §47.10 is "Relative Import Path Rewrites", unrelated to `server function`. Treating as: amend §52.10 (canonical interaction section) + §13 (async server function composition).
- [start] pre-snapshot.md committed.

## Plan (executed)

D1 — Spec amendments — DONE (commit 44869ed):
- §52.10: deprecation note + migration note + warn-then-error cycle wording
- §52.4.1: cross-reference to §52.10 updated to parallels-but-distinct
- §12.2: Trigger 5 (caller-context propagation) + Trigger 6 (dead-code unreached-warn) + Trigger 4 marked DEPRECATED + Trigger 3 prose expanded
- §34: W-DEPRECATED-SERVER-MODIFIER + E-DEPRECATED-SERVER-MODIFIER + W-DEAD-FUNCTION rows added

D2 — §8.4.1 fragment-reuse paragraph — DONE (commit 4a34fb5):
- Inserted between §8.4 worked-examples and §8.5
- Documents call-graph extraction as canonical idiom
- Three normative statements
- Cites Insight 27 + the gauntlet ≥3-adopter re-evaluation gate

D3 — Stdlib cleanup — DONE (commit 962180a):
- 36 decorative `server { body }` blocks stripped across 8 files
- safeCompare reclassified `fn` (D3b)
- Module headers updated to explain route-inference classification
- ~{} test added for safeCompare in stdlib/crypto/index.scrml

D3+ — Stdlib docstring cleanup — DONE (commit e2d3458):
- 8 files updated to drop `server` keyword from example code in docstrings
- Pure-prose changes; no code paths affected

D4 — Tests — DONE (commit 7ddd471):
- compiler/tests/unit/spec-server-deprecate-batch-2.test.js (12 tests)
- compiler/tests/unit/stdlib-server-block-cleanup.test.js (4 tests)
- Existing route-inference.test.js §29/§30 already covered diagnostic firing

## Test results

- Pre-Batch-2 baseline: 9822 / 64 / 1 / 3
- Post-Batch-2: 9838 / 64 / 1 / 3 (delta: +16, matches D4's 12 + 4 new tests)
- Zero regressions
- Pre-existing self-host parity fails (3) preserved out-of-scope
- Pretest: 12 compilation-test samples compile clean

## §52.10 verification (per brief)

Brief required: "VERIFY: §52 Tier 2 `server @var` is the authority modifier
for state cells, NOT the same as `server function` modifier. Confirm both
have distinct semantics per §52.2. The deprecation applies to `server function`
(function modifier); `server @var` (cell authority modifier) stays."

Verification result: DISAMBIGUATION CLEAR.

- §52.4 (Tier 2 — Instance-Level Authority) defines `server @var = expr` as
  the cell authority modifier with semantics: initial load on mount,
  optimistic update, rollback on error, re-fetch on success, SSR pre-render.
  EBNF: `state-decl ::= (server-modifier ws)? "@" identifier ws "=" ws expr`.
- §52.10 (post-amendment) explicitly preserves this: "The `server` modifier
  on reactive variable declarations (`server @var`, §52.4) is unaffected
  by this deprecation. It is a distinct construct that names a state
  authority contract..."
- Parser disambiguation rule unchanged: token following `server` decides —
  `function` or `fn` → (deprecated) function declaration; `@` → reactive
  variable declaration.

The deprecation applies ONLY to `server function`. `server @var` is
canonical and load-bearing.

## W-DEPRECATED-SERVER-MODIFIER fire counts

- stdlib: 0 fires (target met). Stdlib never had `server function` declarations
  — only `server { body }` body wraps. The wraps are stripped in D3; no
  declarations existed to fire the warn.
- examples: not measured E2E (no compile-all-examples test infra in tree).
  Brief estimated 6 fires from contact-book / admin-dashboard / state-authority.
  These remain unchanged (Batch 2 did not modify examples/) and are the
  intended adopter-migration territory the deprecation cycle communicates to.

## Surprises

1. **§47.10 in Insight 26 amendment list is unrelated to server functions.**
   §47.10 is "Relative Import Path Rewrites". The amendment list cited it,
   probably copy-paste from a different section number. The actual surface
   that needed amending was §52.10 (canonical post §11 fold). Treated as a
   typo and proceeded with §52.10 amendments.
2. **stdlib has 36 `server { }` blocks, not ~12.** The brief estimated ~12
   sites; the audit cataloged ~12 representative ones. Actual count is 36
   across 8 files — the audit didn't enumerate every fs/path/process
   utility wrapper. All 36 stripped.
3. **Compile-time isolation of stdlib files surfaces 7 pre-existing errors.**
   `try/catch/finally`, `!==`, undeclared `Bun` — these are stdlib bugs
   unrelated to Batch 2 (they exist on main too). Stdlib is normally not
   compiled via the standard pipeline; runtime resolution is via hand-written
   ES module shims (compiler/runtime/stdlib/*.js, see compiler/src/api.js:51).
   Out-of-scope for Batch 2.
4. **Batch 1's W-DEPRECATED-SERVER-MODIFIER was already named correctly.**
   Brief said "REPLACE W-SERVER-REDUNDANT (introduced Batch 1) with
   W-DEPRECATED-SERVER-MODIFIER" — but Batch 1 (commit ea0ee5b) already
   used the W-DEPRECATED-SERVER-MODIFIER name. No replacement needed; just
   spec catch-up to add the §34 row.
5. **Wrong-cwd file edits early in the session.** Initial Edit calls used
   `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` (main repo) instead
   of the worktree path. Caught when `git status` showed clean. Reverted
   main repo and redid in worktree. F4 path discipline lesson re-confirmed.
