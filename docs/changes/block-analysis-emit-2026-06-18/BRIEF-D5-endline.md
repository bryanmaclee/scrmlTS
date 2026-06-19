# TASK: block-analysis-emit D5 — fix the `span.endLine` collapse in the emitted artifact

**Change-id:** `block-analysis-emit-2026-06-18` (same arc; this is the D3-emit follow-on). progress.md + commits reference it.

## The bug (PA-verified on current HEAD — REAL)
D3 wired `--emit-block-analysis` to emit `<base>.block-analysis.json` per file. But every block's `span.endLine` COLLAPSES to `== span.line`. The BYTE span (`span.start`/`span.end`) is CORRECT; only the LINE-level `endLine` is wrong.

**Verified repro:** a 6-line `function bigFn() { ... }` (source lines 1–6) emits `span.line=1, endLine=1, bytes=0..77` — bytes 0..77 correctly cover the whole function, but `endLine` should be `6`, not `1`.

**Root (from the D4 consumer's diagnosis — verify it):** `api.js:2564` `blockAnalyses: () => buildBlockAnalysis(metaFiles)` → `buildBlockAnalysis(files)` (block-analysis.ts:434) maps `buildBlockAnalysisForFile(file)` **WITHOUT a `source` arg**. `buildBlockAnalysisForFile(file, source?)` (block-analysis.ts:396) derives `effectiveSource = source ?? fileAST.source ?? fileAST.preprocessedSource`; when none is present its `projectSpan` line-extent derivation hits the `endLine = line` fallback. The builder ALREADY derives `endLine` from a source slice (counting newlines across `span.start..span.end`) — it's just **not being fed the source**.

## The fix
Thread the per-file source so `buildBlockAnalysisForFile` derives `endLine` correctly from the byte span. INVESTIGATE the exact plumbing (don't guess):
- Check what the `metaFiles` file objects actually carry. `buildBlockAnalysisForFile` looks for `fileAST.source` / `fileAST.preprocessedSource`. If those fields exist on the metaFiles objects under a DIFFERENT name (or `api.js` has the per-file source elsewhere at the metaFiles stage), thread it through `buildBlockAnalysis(files)` → `buildBlockAnalysisForFile(file, source)`.
- The cleanest fix is the one that makes `effectiveSource` resolve to the file's real (preprocessed or raw) source at the point `projectSpan` runs. Whether that's "attach source to the metaFiles objects," "pass a source map into `buildBlockAnalysis`," or "fix the field-name the fallback reads" — pick what the actual code shows, and explain it in your report.
- **Which source — raw vs preprocessed?** `span.line`/`span.start` are positions in a SPECIFIC source text. The endLine MUST be derived from the SAME text the spans are positions in (so line counting agrees). Verify which source the AST spans are relative to (raw vs preprocessed) and feed THAT one, or the endLine will be off-by-lines. Test on a file where raw and preprocessed differ in line count (a file with `${...}`/BS-rewrites) to be sure.

## STRENGTHEN THE TEST (the gap that let this through)
D3's integration test (`compiler/tests/integration/emit-block-analysis-integration.test.js`) asserted `endLine` was PRESENT, not CORRECT. Add/strengthen an assertion: for a KNOWN MULTI-LINE block (a function with a multi-line body, an engine with state-children, etc.), assert `endLine > line` AND `endLine` equals the block's real last source line. This is the regression guard.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow §"Task-Shape Routing" (compiler-source). Maps reflect HEAD `d12fdef7` (behind HEAD); `block-analysis.ts` + the api.js wiring are NEWER — verify against live source. Report maps feedback.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
Worktree under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.
1. `pwd` MUST start with that prefix; else STOP (S90). Save `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git log -1 --oneline` — base should descend from `447f5244` (the D4 landing, which has D1/D2/D3/D4). If BEHIND, `git merge main`. Confirm: `grep -c "blockAnalyses" compiler/src/api.js` ≥1 and `ls compiler/src/block-analysis.ts`.
4. `bun install`; 5. `bun run pretest`.
6. REPRODUCE FIRST: write a multi-line-function .scrml, compile with `--emit-block-analysis`, confirm `endLine == line` (the before-state).
If ANY check fails: STOP and report.

## Path discipline (EVERY edit)
- ALL edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths including `.claude/worktrees/agent-<id>/` — NOT Edit/Write. Echo path before, `git diff` after.
- NEVER `cd` into main. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths.

# COMMIT DISCIPLINE
- Commit after each edit; first message embeds startup `pwd`. `git status` clean before DONE. Update progress.md each step. Never `--no-verify`.

# DO NOT TOUCH
- `scripts/dock.ts` (D4 — already landed; it consumes your output, don't edit it). `compiler/src/codegen/emit-each.ts` (a sibling dispatch owns it). `docs/known-gaps.md`.

---

# PHASE 3 — MANDATORY R26 VERIFICATION (do NOT mark DONE without)
1. **Artifact endLine now correct:** compile the multi-line repro → `span.endLine` is the block's REAL last line (e.g. bigFn lines 1–6 → `endLine=6`), `endLine > line` for multi-line blocks, `endLine == line` only for genuine single-line blocks. Paste before (`endLine=1`) / after (`endLine=6`).
2. **Cross-check on a real adopter file with `${...}`/BS rewrites** (raw≠preprocessed line counts) — confirm endLine maps to the correct RAW source line (open the file at that line, confirm it's the block's real end). This is the raw-vs-preprocessed correctness check.
3. **The arc payoff — dock now shows true extents.** Run `bun scripts/dock.ts --units <a real multi-def .scrml>` (e.g. the trucking `messages.scrml`) and confirm blocks now show their REAL multi-line extents `[N..M]` (M>N), NOT the collapsed `[N..N]`. This proves the full block-analysis-emit arc payoff. Paste it.
4. **Strengthened test** passes; **FULL suite green** (`bun --cwd "$WORKTREE_ROOT" run test`) — record pass/skip/fail.

End: DO NOT mark DONE without the before/after endLine (1→6) + the raw-source cross-check + dock true-extents + full suite green.

# FINAL REPORT
- `WORKTREE_PATH:` / `FINAL_SHA:` / `BASE_SHA:` (+ merged main?)
- `FILES_TOUCHED:` (expect `compiler/src/api.js` and/or `compiler/src/block-analysis.ts` + the integration test + progress.md)
- The exact plumbing fix (what you threaded, raw vs preprocessed source, why)
- R26: before/after endLine, raw-source cross-check, dock true-extents output, full suite counts
- Maps feedback; deferred items

Commit after each change. Update progress.md each step. WIP commits expected.
