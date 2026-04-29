# Progress: s48-close-compiler-dot-phantom

- [00:00] Started — verified worktree, pwd OK, git toplevel OK, clean tree.
- [00:01] Read recon doc at `docs/recon/compiler-dot-api-decision-2026-04-29.md` (520 lines).
- [00:02] Inspected meta-checker.ts (lines 12, 165-170, 367-388, 397, 1554, 1568) — all `compiler.*` sites match recon.
- [00:03] Inspected SPEC.md §22.4 (10461, 10465-10466), §22.8 (10978), §22.11 (11048-11054), §34 (12045+) — all match recon.
- [00:04] Inspected tests at meta-checker.test.js:881, self-host-meta-checker.test.js:201, meta-classifier-emit-raw.test.js:98 — all match recon.
- [00:05] DISCOVERY: there are TWO copies of `meta-checker.scrml` — one in `compiler/self-host/` (recon mentioned), one in `stdlib/compiler/` (recon missed). They are byte-identical. The build-self-host script reads from the stdlib copy (line 51). Both must be edited.
- [00:06] DISCOVERY: `compiler/dist/` is gitignored (.gitignore:2). The recon's "include rebuilt artifact in same commit" instruction is moot — dist files are never committed. Rebuilt locally for verification.
- [00:07] Ran `bun install`, `bun run pretest`, `bun run compiler/scripts/build-self-host.js` to bring worktree to a testable state.
- [00:10] Pre-snapshot baseline: **7954 pass / 40 skip / 0 fail** (better than recon's expected 7941/40/2).
- [00:11] Wrote pre-snapshot.md, committed (2174f49).
- [00:12] Edits to `compiler/src/meta-checker.ts` (committed at 5ab6215):
  - Doc comment line 12 — drop `compiler.*` mention
  - Delete `\bcompiler\s*\.` regex from `COMPILE_TIME_API_PATTERNS`
  - Delete `exprNodeContainsIdentNamed` helper + wire-up at testExprNode
  - Drop `compiler.*` from E-META-005 message text
  - Add `bodyReferencesCompilerNamespace` helper (ExprNode primary path + string fallback)
  - Wire E-META-010 into `runMetaChecker` per-meta-block loop after E-META-009
  - Update module-level doc comment with E-META-009 + E-META-010 entries
- [00:13] Edits to test files:
  - `compiler/tests/unit/meta-checker.test.js`: deleted §53 test + header doc; added 5 new tests in §22.4/S48 describe block; added `bodyReferencesCompilerNamespace` to imports
  - `compiler/tests/unit/self-host-meta-checker.test.js`: deleted "detects compiler. access in bare-expr"
  - `compiler/tests/unit/meta-classifier-emit-raw.test.js`: renamed misleading test (body uses `reflect()` not `compiler.*`)
- [00:14] Edits to self-host scrml files (BOTH copies):
  - Doc comment line 11 — drop `compiler.*`
  - Line 120 — delete `\bcompiler\s*\.` regex
- [00:15] Rebuilt `compiler/dist/self-host/meta-checker.js` (gitignored, local verification only).
- [00:16] Test suite: **7957 pass / 40 skip / 0 fail** (+3 net: 5 added, 2 deleted).
- [00:17] Edits to SPEC.md (committed below):
  - §22.4: delete `compiler.*` bullet; rephrase prose (drop "via the compiler.* API" / add "via reflect()"); append paragraph on E-META-010 reservation
  - §22.8: drop `compiler.*` from phase-separation example (replaced with `bun.eval()`)
  - §22.11: append E-META-009 and E-META-010 rows
  - §34: append E-META-009 and E-META-010 entries (after E-META-001)
- [00:18] Updated SPEC-INDEX.md line numbers via in-tree script (73 replacements). Header updated. Removed temp script after run.
- [00:19] Smoke-tested with two fixtures (now deleted):
  - `compiler.version` reference: BEFORE my changes would have produced E-META-EVAL-001 only (cryptic). AFTER my changes produces E-META-010 (helpful) + E-META-EVAL-001 (consequence). 4 cascading errors initially observed (E-META-001 + E-META-005 + E-META-010 + E-META-EVAL-001).
  - Decided to reduce noise by adding `compiler` to META_BUILTINS — this avoids E-META-001 and E-META-005 piling on top of E-META-010. Net diagnostic: just E-META-010 + E-META-EVAL-001 (the latter is a downstream consequence; E-META-010 carries the actionable advice).
- [00:20] Mirrored META_BUILTINS update to BOTH self-host scrml copies. Rebuilt dist. Re-ran tests: **7957 pass / 40 skip / 0 fail** (no regression).
- [00:21] Cleaned up temp `_fixture.scrml` files and their `dist/` output subdirectory.
- [00:22] Final tests pass. Ready for clean final commit + report.

## Net summary

- Source (compiler/src/meta-checker.ts): +91 / -27 lines (helper added, classifier deleted, META_BUILTINS extended)
- Self-host scrml (both copies): +6 / -1 each (regex deleted, META_BUILTINS extended, doc comment updated)
- Spec (compiler/SPEC.md): +10 / -4 lines (§22.4 amend, §22.8 example, §22.11 +2 rows, §34 +2 rows)
- Spec index (compiler/SPEC-INDEX.md): +1 / -1 header + 73 line-range updates
- Tests: 5 added, 2 deleted, 1 renamed; net +3 tests; final count 7957 vs baseline 7954
- Dist artifact (gitignored, local only): rebuilt
