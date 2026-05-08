# A1b Step B22 — `reset(@cell)` target shape validation — Progress

## Startup verification (2026-05-07)

- WORKTREE_ROOT: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1a4d1c891a2c629d`
- `git rev-parse --show-toplevel` matches WORKTREE_ROOT.
- Tree clean at start.
- `bun install` OK (114 packages).
- Baseline test run: **9425 pass / 60 skip / 1 todo / 0 fail / 33180 expect()** (10.30s).
  - Note: brief stated "~9425/49/1/0"; observed 60 skip vs 49 skip. Skip count drift is non-blocking — no failures.
  - First run had 2 flake fails in `serve.test.js` (ECONNREFUSED, network-port-in-use). Re-ran clean.

## Phase 0 — Survey complete (2026-05-07)

Full survey at `docs/changes/phase-a1b-step-b22-reset-target-shape/SURVEY.md`.

Key findings:
- **Canonical name:** `E-RESET-INVALID-TARGET` (no existing reset-target row at §34; new addition).
- **Multi-level compound-nav decision:** ACCEPT when `lookupQualifiedStateCell` resolves the full path. Justification: §6.3.5 recursive composition + B12's lookup-extension already supports arity-N descent uniformly. Alternative (rejection) creates anti-symmetry with READ access. Spec-prose follow-up: §6.8.2 needs amendment to clarify multi-level legality.
- **`.method` form:** N/A — Step 9 only lifts bare-callee `reset(...)`; member calls (`obj.reset(x)`) stay as ordinary `call` (§R9.7 regression test confirms).
- **Existing tests:** Only Step 9 parse tests + tokenizer + at-name-resolution. No `.skip` reset-target tests. B22 coverage is net-new.
- **Walker reuse:** `forEachResetExprInExprNode` already exists in `expression-parser.ts:2538`.
- **Path resolution reuse:** `lookupQualifiedStateCell` already exists, already handles arity-N (post-B12 extension).

## Phase 1 — Implementation (complete)

Commits in branch:
- `090733e` WIP(a1b-b22): Phase 0 survey
- `d6ba46f` WIP(a1b-b22): SYM PASS 14 — walkValidateResetTargets + 25 tests
- `4f2fcd9` WIP(a1b-b22): SPEC §34 row + §6.8.2 multi-level clarification
- `6aee27d` WIP(a1b-b22): PRIMER §13.7 B22 row + B22 specifics block

---

## REPORTING — final report block

### 1. WORKTREE_PATH

`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1a4d1c891a2c629d`

### 2. FINAL_SHA

`9176e8622f2ce549061f17c688664f6b362a2130` (subsequent commits to progress.md after this point are reporting-only and do not affect file-delta).

### 3. FILES_TOUCHED

Files (relative to repo root):
- `compiler/SPEC.md` — §34 row addition (E-RESET-INVALID-TARGET) + §6.8.2 multi-level clarification + §6.8.2 cross-ref update.
- `compiler/src/symbol-table.ts` — SYM PASS 14 walker `walkValidateResetTargets` + helper `validateResetExprTarget` + helper `fireResetInvalidTarget`. Added imports for `ExprNode`, `ResetExpr`, `MemberExpr` types and `forEachResetExprInExprNode` runtime walker. Wired PASS 14 invocation into `runSYM` after PASS 13.
- `compiler/tests/unit/reset-target-shape-b22.test.js` — 25 net-new tests covering all positive shapes (bare/whole-compound/single-level/multi-level), negative shapes (literal/call/binary/ternary/unary/non-`@`-ident/non-`@`-rooted-member/nested-reset), pass-through cases (E-RESET-NO-ARG / member-call), diagnostic message quality, span integrity.
- `docs/PA-SCRML-PRIMER.md` — §13.7 B22 row added to A1b annotation table + new B22 specifics block.
- `docs/changes/phase-a1b-step-b22-reset-target-shape/SURVEY.md` — Phase 0 survey.
- `docs/changes/phase-a1b-step-b22-reset-target-shape/progress.md` — this file.

### 4. TEST_DELTA

Pre-commit subset (matches the brief's noted "pre-commit ~8701/49/1/0" baseline):
- Pre-B22: `8701 pass / 49 skip / 1 todo / 0 fail`.
- Post-B22: `8726 pass / 49 skip / 1 todo / 0 fail`.
- Delta: **+25 pass / 0 skip change / 0 todo / 0 fail**.

Full suite (S68 baseline 9425/60/1/0 in this worktree; brief said 9425/49/1/0 — non-pre-commit suite includes additional skips):
- Pre-B22: `9425 pass / 60 skip / 1 todo / 0 fail / 33180 expect()`.
- Post-B22: `9450 pass / 60 skip / 1 todo / 0 fail / 33229 expect()`.
- Delta: **+25 pass / 0 skip / 0 todo / 0 fail / +49 expect() calls**.

No regressions. All 25 B22 tests passed first run.

### 5. DEFERRED_ITEMS

None for B22 itself. The pa.md Rule 3 question on multi-level compound-nav was surfaced (Phase 0) and resolved deliberately (accept; spec amended in this commit). No `.skip` tests authored — full coverage shipped.

Pre-existing related deferrals (NOT B22's responsibility):
- B3's `_resolvedStateCell: null` markers do not yet fire E-SCOPE-001 at the type-check pass (see primer §13.7 B3 specifics, line 563). When that tightening lands, `reset(@unknownCell)` will fire the resolution diagnostic; today B22 stays silent on resolution issues per its scope contract.
- A1c codegen lowering of `reset-expr` to runtime call is out of scope per BRIEF §"OUT OF SCOPE for B22 (explicit)".
- §55.13 synthesized-property side-effects of reset (`errors`/`touched`/`submitted` clearing) are runtime A1c.

### 6. OPEN_QUESTIONS

None blocking. One advisory note for PA review:

- **Multi-level acceptance was a deliberate Phase 0 choice** (see SURVEY.md §c). The choice is documented as both implementation AND spec amendment. If PA prefers a stricter policy (reject multi-level pending a future spec deliberation), the implementation change is one early-return in `validateResetExprTarget` (reject when `path.length > 1`), and the spec amendment in §6.8.2 should be reverted. Rationale for accept-on-default is in SURVEY.md (anti-symmetry with READ access; recursive-composition invariant from §6.3.5; lookup machinery already arity-N).

### 7. PRIMER §13.7 B22 ROW DRAFT + B22 specifics block

Both shipped in commit `6aee27d`. Row inserted after B17 row at primer line 559+. Specifics block inserted after B17 specifics block at primer line ~705. Verbatim row text:

```
| **B22** | (no new AST field — fires `E-RESET-INVALID-TARGET` diagnostic per SPEC §6.8.2 + §34 on `reset-expr` nodes whose `target` is not one of the canonical shapes) | every `reset-expr` node reachable via any ExprNode-bearing AST field; nodes carrying a parse-time `diagnostic` (E-RESET-NO-ARG path) are SKIPPED to avoid double-fire | — | walker is SYM PASS 14 (`walkValidateResetTargets`). Reuses `forEachResetExprInExprNode` (`compiler/src/expression-parser.ts:2538`) for the reset-expr finder + `lookupQualifiedStateCell` (B12-extended descent) for multi-level compound-nav resolution. Closes A1a Step 9's deferred validation (per `compiler/src/types/ast.ts:1670-1674` docstring). New §34 catalog row added S69 — A1b B22. |
```

Specifics-block highlights (full text in primer):
- Closes A1a Step 9's deferred validation (`reset-expr` AST kind; permissive parser; A1b own validation).
- Three canonical shapes accepted (`@cell`, `@compound`, `@compound.field`).
- Multi-level (`@a.b.c.d`) accepted per Phase 0 decision (§6.3.5 recursive composition + B12 lookup-extension); spec amendment in this commit codifies.
- `@`-prefix is shape-required, leaf-resolution is NOT (B22 stays silent on B3's null markers; surfaces via different code-path when tightening lands).
- Diagnostic-skip on already-diagnosed nodes (no double-fire on E-RESET-NO-ARG path).
- `obj.reset(x)` (member-call) is NEVER a reset-expr (Step 9 §R9.7 regression confirms).
- Optional-chain (`?.`) rejected.
- New §34 row (S69).
- 25 active tests, 0 `.skip` follow-ups.

### 8. SURVEY-NOTE

Full survey at `docs/changes/phase-a1b-step-b22-reset-target-shape/SURVEY.md`. Five Phase 0 questions answered:

- (a) Canonical name: **E-RESET-INVALID-TARGET** (no existing reset-target row at §34; pattern matches E-RESET-NO-ARG).
- (b) Step 9 parser shape: confirmed `ResetExpr { kind, span, target: ExprNode, diagnostic? }` per `ast.ts:1683`. Step 9 docstring explicitly defers shape validation to A1b. Walker `forEachResetExprInExprNode` already exists at `expression-parser.ts:2538` — reused.
- (c) Multi-level compound-nav legality: **ACCEPT** when `lookupQualifiedStateCell` resolves the full path. Justification: §6.3.5 V5-strict recursive composition; B12's lookup-extension is already arity-N; rejection creates anti-symmetry with READ access. Spec-prose follow-up: §6.8.2 amendment shipped in this commit.
- (d) `.method` form: N/A. Step 9 explicitly excludes `obj.reset(x)` from reset-expr lifting (§R9.7 regression test). B22 only sees keyword `reset(...)` calls.
- (e) Existing test coverage: only Step 9 parse tests + tokenizer tests + B3 at-name-resolution tests. NO `.skip` reset-target tests existed pre-B22. NO uses of `reset(@…)` in `examples/` or `samples/`. B22 coverage is net-new.

### 9. SPEC-PROSE FOLLOW-UPS

All changes shipped in this commit (no separate follow-up needed):

1. **§34 catalog row** — new `E-RESET-INVALID-TARGET` row added after `E-RESET-NO-ARG` at line 14223. Cross-refs §6.8.2; severity Error.

2. **§6.8.2 multi-level clarification** — new normative paragraph added under "Compound reset semantics" explicitly stating multi-level paths (`reset(@a.b.c.d)`) are legal when each segment resolves through the compound-scope chain, grounded in §6.3.5 ("V5-strict access forms apply at every level of the compound hierarchy"). Uses the same recursive-composition language as the rest of §6.3.

3. **§6.8.2 target-shape validation paragraph** — new paragraph added explicitly listing the rejected shapes (literal, function-call result, binary / ternary / unary expression, bare identifier without `@`, member chain rooted at non-`@` identifier, computed-index access) cross-ref'd to §34 E-RESET-INVALID-TARGET row.

4. **§6.8.2 cross-references** — added `E-RESET-INVALID-TARGET` to the cross-ref list at line 4872.

No deferred spec edits.

---

## Path discipline check

All Write/Edit operations used absolute paths under `WORKTREE_ROOT = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1a4d1c891a2c629d`. No main-rooted paths leaked. Verified via `git diff 4ac906f HEAD --name-only`:

```
compiler/SPEC.md
compiler/src/symbol-table.ts
compiler/tests/unit/reset-target-shape-b22.test.js
docs/PA-SCRML-PRIMER.md
docs/changes/phase-a1b-step-b22-reset-target-shape/SURVEY.md
docs/changes/phase-a1b-step-b22-reset-target-shape/progress.md
```

All paths are relative to repo root (i.e., live in this worktree). No leakage.
