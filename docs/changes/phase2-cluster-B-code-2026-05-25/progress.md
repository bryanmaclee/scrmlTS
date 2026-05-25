---
session: S130 Phase 2 Cluster B-code (Approach C source cascade per HU-2 Q4)
started: 2026-05-25
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-afe11cc2a05809f34
base-sha: ee0d048e (post-merge main; pre-cleanup)
---

# Progress log

## Phase 0 — Startup verification + root-cause confirmation

- [done] pwd, git status, git merge main, bun install, bun run pretest — all green
- [done] Grep verified all 8 brief'd sites at expected line numbers (no S130 watermark drift)
- [FINDING — partial counter-evidence to brief] `rewriteBunEval` has 8 active callers in compiler/src/:
  - `compiler/src/codegen/emit-html.ts:1692` — user-facing `${ bun.eval(...) }` markup-interpolation path (this IS the §30.2 implementation, RETIRES per SPEC §30.1 retirement note)
  - `compiler/src/meta-eval.ts` lines 267, 272, 277, 326, 336 — wraps user-written `^{}` body content (bare-expr/let-decl/const-decl/return-stmt/html-fragment); calls are no-ops on input that doesn't contain literal `bun.eval(...)` (function early-returns on line 492)
  - `compiler/src/codegen/rewrite.ts:1985` — `clientPasses` Pass 4 of the rewrite pipeline; no-op on input that doesn't contain literal `bun.eval(...)`
- [decision] Brief says STOP if callers exist for Site 1 retirement. Per [[feedback_cookbook_vs_empirical]] (SCOPING/cookbook claims may be empirically wrong), the brief's empirical premise is partially incorrect, but its INTENT (retire user-facing surface) is consistent with SPEC §30. Execution plan:
  - **Sites 2-10**: execute as specified (mechanical cleanups; don't require function to be dead).
  - **Site 9 (emit-html.ts)**: REMOVE the entire `if (/\bbun\s*\.\s*eval/.test(expr))` block (lines 1690-1705), not just the filter — that IS the retired §30.2 user-facing implementation, and per HU brief's framing "the filter has nothing to filter once bun.eval recognition retires" the intent extends to the block.
  - **Site 1 (rewrite.ts function retirement)**: clean up the 7 remaining internal callers first (delete the rewriteBunEval calls in meta-eval.ts × 5 + rewrite.ts:1985 pipeline pass), then retire the function. The calls are provably no-ops on cleansed user input.
  - **Cross-stream meta-checker.ts:117 `META_BUILTINS` set**: still includes `"bun"`, `"process"`, `"Bun"`, `"console"` — STALE relative to SPEC §22.12 line 13826. NOT in the brief's cleanup scope; surface as deferred work.

## Phase 1 — Execution log

### Site 2 — meta-checker.ts:15 doc-comment (DONE, commit 0e13f3f0)
Dropped `bun.eval` from `(reflect, bun.eval, emit) execute at compile time`; new list: `(reflect, emit, emit.raw)`.

### Site 3 — meta-checker.ts:179 regex + ExprNode fallback (DONE, commits 0e13f3f0 + 9ce829ee)
- Removed `/\bbun\s*\.\s*eval\s*\(/` from `COMPILE_TIME_API_PATTERNS` (line 179) — string-path.
- ALSO removed sibling `exprNodeContainsMemberAccess(exprNode, ["bun", "eval"])` from `bodyUsesCompileTimeApis.testExprNode` (line 389) — ExprNode-path. Brief specified Site 3 but the parallel ExprNode-path check was not enumerated; for full Approach C extension closure this had to go too (otherwise `${bare-expr bun.eval()}` still classified compile-time via the ExprNode path).

### Site 4 — meta-checker.ts:1622 E-META-005 error message (DONE, commit 0e13f3f0)
List: `(reflect, emit, bun.eval)` → `(reflect, emit, emit.raw)`.

### Site 5 — meta-checker.ts:1656 E-META-010 sibling error message (DONE, commit 0e13f3f0)
Same replacement.

### Site 6 — constant-folder.ts:13 doc-comment (DONE, commit de771907)
Quote of SPEC §40.9.2 retained verbatim (SPEC text unchanged — the determinism constraint reference is still valid per §30.1 compiler-internal-only retention). Added post-S130 clarifying note explaining the user-facing surface retirement vs. compiler-internal retention.

### Site 7 — collect.ts:446 doc-comment (DONE, commit de771907)
Doc-comment: drop bun.eval from the server-only escapes list. Pattern at line 349 RETAINED as defense-in-depth stale-emission guard (noted in updated comment). The brief said Site 7 is "drop bun.eval from compile-time-only escapes list" but the actual list at line 349 is SERVER-context, not compile-time; conservative approach is to retain the regex as defense-in-depth, update doc-comment.

### Site 8 — tokenizer.ts:719 comment reference (DONE, commit de771907)
Comment example: `bun.eval()` → `Bun.file()`. Added post-S130 retirement note.

### Site 9-10 — emit-html.ts §30.2 user-facing implementation block + comment (DONE, commit 45ef303a)
- REMOVED the entire `if (/\bbun\s*\.\s*eval\s*\(/.test(expr)) { ... }` block at lines 1690-1705 — that IS the former §30.2 user-facing inline-evaluator surface that retires per HU-2 Q4. Replaced with a comment block explaining the retirement.
- REMOVED unused import of `rewriteBunEval` from line 7.
- UPDATED the SPEC §7.4.2 quote in the constant-fold comment block: dropped "`bun.eval()`-produced literal per §30.2" from the verbatim quote (matches the SPEC line 5506 amendment landed in 86a1f815).

### Site 1 — DEFERRED (function retirement)
**Empirical counter-evidence to brief premise.** `rewriteBunEval` has 7 remaining callers in compiler/src/ after Site 9 closure:
- `compiler/src/meta-eval.ts` × 5 (bare-expr/let-decl/const-decl/return-stmt/html-fragment serializers for user `^{}` body content)
- `compiler/src/codegen/rewrite.ts:1985` (clientPasses Pass 4 — runs on EVERY user client expression)
- (emit-html.ts removed per Site 9 — was 8 total pre-cleanup)

These remaining callers are NO-OPS on conformant input (function early-returns on expressions not containing literal `bun.eval(`). Per brief STOP directive ("If callers exist, STOP and report — that breaks the dead-code assumption"), function retirement is deferred. Three sub-tasks blocking full retirement:

1. **META_BUILTINS gap** — meta-checker.ts:117 still includes `"bun"`, `"process"`, `"Bun"`, `"console"` per S114-era contents. Per SPEC §22.12 line 13826 (S130 amendment): these are NOT in the post-S130 META primitive set. Removing `"bun"` from META_BUILTINS would fire E-META-001 on any user `^{}` containing `bun.eval(...)`, neutralizing the meta-eval.ts caller paths. (Surfaced in startup-Phase-0 finding; deferred per brief out-of-scope.)
2. **Defense-in-depth retention rationale** — even after META_BUILTINS gap closes, the rewriteBunEval pipeline pass + meta-eval calls serve as a residual defense-in-depth layer: any literal `bun.eval(...)` that slips through earlier validation would be folded at compile time before reaching client JS (vs. leaking to runtime).
3. **bun-eval.test.js (12 tests)** — directly tests `rewriteBunEval` function shape. Per HU-2 Q4 "Any test files asserting on E-EVAL-001 fire: drop or migrate." This test file would be dropped when Site 1 retirement lands. Currently the tests pass (function still present); not deleted in this dispatch since the function persists.

**Recommendation for follow-on dispatch:**
- Step A: amend SPEC §22.12 + meta-checker.ts META_BUILTINS to remove `bun` / `process` / `Bun` / `console` per ratified §22.12 surface
- Step B: retire `rewriteBunEval` function + remove `clientPasses` Pass 4 + remove meta-eval.ts × 5 calls + drop `bun-eval.test.js`
- Step C: optional — retire `SERVER_CONTEXT_META_PATTERNS[2]` `bun.eval` regex from collect.ts:349 (defense-in-depth dependency on rewriteBunEval going away)

## Phase 2 — Test surface impact (compiled at DONE)

### Pre-existing tests migrated
- `compiler/tests/unit/meta-checker.test.js` — 3 tests updated:
  - §51 — inverted assertion (`bodyUsesCompileTimeApis(bun.eval-body)` now returns `false`)
  - §60 — comment-only clarification (test behavior unchanged)
  - §S48c — dropped bun.eval branch + added emit.raw branch
- `compiler/tests/unit/self-host-meta-checker.test.js` — 1 test inverted + 1 added:
  - "detects bun.eval() in bare-expr" → inverted to "does NOT detect bun.eval() in bare-expr — retired per HU-2 Q4 (F-003)"
  - NEW test: "detects emit.raw() call in bare-expr"

### Tests NOT touched (deferred to Site 1 follow-on)
- `compiler/tests/unit/bun-eval.test.js` — 12 tests, all directly test `rewriteBunEval`. Function persists; tests still pass. Drop when function retires (deferred per Site 1 framing above).
- `compiler/tests/unit/sql-client-leak.test.js` — 2 tests reference bun.eval as server-only signal; still pass because `SERVER_CONTEXT_META_PATTERNS` regex retained for defense-in-depth.

