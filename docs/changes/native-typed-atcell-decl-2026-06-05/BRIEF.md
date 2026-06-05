NATIVE-PARSER PARITY FIX — typed `@cell` declaration (`@name: Type = e`) recognition (change-id: native-typed-atcell-decl-2026-06-05)

# Context
scrml has two front-ends: legacy default (BS+Acorn+TAB) and the scrml-native parser (`compiler/native-parser/` + `compiler/src/native-walker/`), selected via `--parser=scrml-native`. We're closing native↔default parity, family by family, toward an eventual default-flip (v0.8 target; the flip is a standing USER decision). This session already landed F2-match (`2c2e5bb2`) + promote-each (`785f24d1`); flip-failures 509→506→(re-measuring).

This dispatch is **R1** of the enum-subset cluster decomposition (a PA per-family survey REFINED the S164 TRIAGE row-21 over-lump: the b2 cluster ~14 is dominated by R1 typed-`@cell` + R3 bare-variant-in-let, NOT struct-constructor). R1 = **the cleanest remaining grind: parser-only, single-root, emit-producing**. PA-confirmed the symptom + locus on current HEAD `785f24d1` (below) — treat as a strong hypothesis the Phase-0 step CONFIRMS (S164 lesson: loci are hypotheses; the empirical default-clean/native-fail SYMPTOM is reliable; promote-each's Phase-0 found 2 ADJACENT same-locus gaps the per-family survey missed, so EXPECT to verify thoroughly).

# THE ROOT (PA-confirmed on HEAD 785f24d1 — single, parser-only)
A bare **typed** `@`-cell declaration at statement position — `@role: Role = .Admin` / `@count: int = 0` — fails native with `E-STMT-MISSING-SEMICOLON` + `E-EXPR-UNEXPECTED (Colon)` cascade (phase=TAB), while DEFAULT compiles exit 0. The PLAIN isolator (`@count: int = 0`, no enum) fails IDENTICALLY → this is the typed-`@cell`-decl PARSE gap, NOT enum-subset-specific.

`compiler/native-parser/parse-stmt.js : parseStatement` (~L482 dispatch) has arms for `server @var: Type = e` (`parseServerAtStateDecl` ~L670) and structural `<name> = e` (`parseStructuralStateDecl` ~L739), but NO arm for a bare `@name: Type = e`. So `@name` parses as an AtCell expression atom (`parse-expr.js makeAtCell`), then the following `:` is unexpected → cascade.

# THE FIX
Add a typed-`@cell`-decl arm to native `parseStatement`: when the cursor is at an `@`-cell AND the lookahead is `@ Ident : <type> = <expr>` (type annotation PRESENT), parse it as a typed cell declaration — **mirror `parseServerAtStateDecl` minus the `server` modifier** and build the SAME native state-decl node it produces (so the existing translate-bridge + codegen handle it unchanged). Match LIVE's node shape for `@role: Role = .Admin` (byte-parity-with-default is the parity charter).

# CRITICAL SCOPE BOUNDARY — typed form ONLY (V-kill seam)
This fix is SCOPED to the **typed** form `@name : Type = e` (a `:` type annotation directly after `@name`). A BARE `@name = e` (NO type annotation) is a WRITE per SPEC §6.1.2, NOT a declaration — it is the separate over-render / V-kill seam (a known parked native gap). **DO NOT touch the bare `@name = e` path; DO NOT re-open `@x =` decl-vs-write semantics.** The disambiguation is purely the `:` lookahead: `@ Ident :` → the new typed-decl arm; `@ Ident =` (or anything else) → the existing path UNCHANGED. Phase-0 MUST verify the bare write form + `@name` reads + `@name.field = e` are unregressed.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; Task-Shape Routing for "compiler-source bug fix" / native-parser. Maps reflect HEAD `f11db672` — now **13+ native-parser commits stale** (incl. F2-match + promote-each). Verify any native-parser map claim against current source. Feedback line required in the final report.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
## Startup (BEFORE any other tool call)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo (e.g. scrml-support), STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge --ff-only main` (S112). The worktree branches from origin/main (`c02e2860`), BEHIND local main (`785f24d1` = the two unpushed landings F2-match + promote-each). The ff-merge brings both in → worktree ends at `785f24d1`. MUST fast-forward; if not, STOP + report.
4. `git status --short` clean.
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates dist; use `bun run test` not `bun test` for baseline).
If ANY check fails: STOP, report, do not proceed.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** (`perl`/`python`/heredoc) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment**, NOT Edit/Write (S126). Echo path before each write; re-verify with `git diff`/`grep`.
- NEVER `cd` into the main repo (use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only — S126).
- Read from WORKTREE_ROOT.

# PHASE 0 — SURVEY-STOP CONFIRM (mandatory BEFORE the heavy edit)
Confirm ALL; if any fails, STOP + report:
1. `parseServerAtStateDecl` (~L670) is the right template — identify the EXACT native state-decl node it builds (kind + fields) + the translate-bridge that consumes it, so the new arm produces the identical node minus the `server` flag.
2. **Disambiguation is clean + non-regressing:** the `@ Ident :` lookahead routes ONLY the typed form to the new arm; `@name = e` (bare write), `@name` (read), `@name.field = e`, `@name++`, `@name :> ...` (if any) all parse as before. Build probes for each + confirm 0 new errors.
3. `@count: int = 0` (plain) + `@role: Role = .Admin` (enum) both parse native exit 0 after the fix AND emit live-matching shape (compile both default + native, diff the emitted JS — functionally equivalent).
4. **Scope-expansion (promote-each precedent):** if Phase-0 finds ADJACENT same-locus typed-`@cell` gaps (e.g. typed `@cell` with validators, or refinement-typed `@cell: int(>0) = 0`) needed to clear the b2 cluster, you MAY extend WITHIN the parser-bridge charter — but DOCUMENT it explicitly in progress.md + the final report (do NOT silently expand), and KEEP the bare `@name = e` V-kill seam OUT.

# PHASE 3 — EMPIRICAL VERIFICATION (MANDATORY before DONE)
1. **No regression (default):** the b2/b4 test files (`compiler/tests/unit/enum-subset-match-exhaustiveness-da-b2.test.js` + `enum-subset-enforcement-reach-da-b4.test.js`) green under default + the plain/enum probes default exit 0 + emitted JS unchanged vs pre-fix.
2. **Fix confirmed (native):** flip the parser default in the worktree's `compiler/src/api.js` (line-agnostic perl: `s/^(\s*)parser = null,$/$1parser = "scrml-native",/`; native selected when `parser === "scrml-native"`, line ~631), re-run the b2/b4 test files → the R1-attributable fails CLEAR. **Then REVERT the api.js flip** (`git -C "$WORKTREE_ROOT" checkout -- compiler/src/api.js`) — it is a verification harness ONLY, MUST NOT be in your committed diff.
3. **within-node parity:** `bun --cwd "$WORKTREE_ROOT" test compiler/tests/parser-conformance-within-node.test.js`. Adding the state-decl arm makes native MORE match live → expect FEWER MISSING-FIELD on `@cell`-typed-decl-bearing fixtures (improvement). If a fixture sits BELOW its budget you MAY re-baseline DOWNWARD (improvement-direction only). within-node MUST stay 1005/0 (or improve); if any UPWARD bump is needed, JUSTIFY it (raw==allowlist, correct-shadow, not masking — per the promote-each audit precedent). Report the per-fixture delta.
4. **Full suite:** `bun run test` → 0 regressions. Report pass/skip/fail. (NOTE: `bun test compiler/tests/` ends without a summary line because `promote-match.test.js` overrides process.exit — count `(fail)` markers + look for the post-commit "Tests: N pass, N fail"; 0 fail is the contract.)

DO NOT mark DONE without Phase-3 (1)+(2)+(4) passing and the api.js flip REVERTED out of the diff.

# COMMIT DISCIPLINE
- Edit via Bash on worktree-absolute paths; `git -C "$WORKTREE_ROOT" diff` to verify; `git -C "$WORKTREE_ROOT" add`; commit IMMEDIATELY (don't batch). First commit message includes verbatim startup `pwd`: `WIP(typed-atcell): start at <pwd>` (S99).
- Before DONE: `git -C "$WORKTREE_ROOT" status --short` clean; confirm api.js NOT in the final diff.
- **NEVER `--no-verify`.** Update `docs/changes/native-typed-atcell-decl-2026-06-05/progress.md` after each step (append-only, timestamped).

# FINAL REPORT (your final message = data for the PA)
- WORKTREE_PATH (pwd) + FINAL_SHA
- FILES_TOUCHED (exact paths; api.js MUST NOT appear)
- The fix diff summary (the new typed-`@cell`-decl arm; how it disambiguates from the bare write form; what node it builds)
- Phase-0 confirm results (template node, disambiguation probes incl. the bare-write-unregressed check, plain+enum parity)
- Phase-3: b2/b4 default (green) + native-flip (R1 fails cleared, N) + within-node delta (+ justification for any upward bump) + full-suite delta
- Maps feedback line
- Deferred/flagged: anything adjacent you did NOT do (esp. the bare `@name = e` V-kill seam, R2 struct-ctor, R3 bare-variant-in-let); any documented scope-expansion
- Confirm git status clean + first-commit pwd echo + api.js flip reverted
