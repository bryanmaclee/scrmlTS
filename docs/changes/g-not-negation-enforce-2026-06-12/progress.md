# progress — g-not-negation-enforce-2026-06-12

Append-only. Timestamped: what was done / what's next / blockers.

- 2026-06-12 S188 PA — SCOPE + BRIEF authored. Gap `g-not-negation-unenforced` (MED). User ruled "Error + full migration". Root cause + locus + census verified by 3 read-only investigation agents (S188). Fix locus = expression-parser.ts lowering choke-point (Locus 2). Migration: 66 FORBIDDEN corpus sites (flagship 33 bare is the epicenter) + auth generator + test inversions + SPEC §34/§42.10 broaden + `:5556` cite repoint. Dispatching scrml-js-codegen-engineer (isolation:worktree). Next: agent Phase 0 survey-confirm.

## Phase 0 — survey-confirm (2026-06-12, agent-a2cd30a3f9aebd229)
DONE:
- Worktree verified, merged base 0b80a79d, bun install + pretest OK.
- Empirically reproduced bug @ base: bare `not @loggedIn` AND paren `not (@x==1)` in a TERNARY compile clean (emit `!...`); only if/while paren fires E-TYPE-045. Confirms SCOPE §1.
- Located the two lowering substitutions: expression-parser.ts:1170 (paren `not(`→`!(`) + :1207-1210 (bare `not <operand>`→`!`), inside rewriteCodeSegments fence (GITI-017/6nz-s guards intact).
- preprocessForAcorn:1009 is pure string→string; sole structural caller parseExprToNode:2259 returns ExprNode.
- checkNotPrefixNegation:10986 (paren-only `not\s*\(`) called at type-system.ts:9563 on if/while raw condition ONLY.
LOCUS CHOICE: Option (ii) node-attach + harvest. parseExprToNode has 30+ callers (many in codegen, post-typecheck) → threading a diags out-param (option i) is invasive + incomplete. Instead: preprocessForAcorn records a detector flag when either substitution fires; parseExprToNode attaches `_notPrefixNegation` (+span) onto the returned ExprNode; type-system adds a harvest walk over every ExprNode in the FileAST emitting E-TYPE-045 once per node. Existing if/while checkNotPrefixNegation RETIRED (harvest covers it; no double-fire).
NEXT: Phase 1 implement choke-point fire + harvest; then run baseline suite.
BLOCKERS: none.

## Phase 1-5 COMPLETE (2026-06-12, agent-a2cd30a3f9aebd229)
- Phase 1 (impl): preprocessForAcorn detector + parseExprToNode wrapper attaches _notPrefixNegation; harvestNotPrefixNegation (type-system TS-J) emits E-TYPE-045 once per stamped node (all positions + both forms); if/while checkNotPrefixNegation retired (dead fn removed). within-node-classifier STRIP_KEYS += _notPrefixNegation. Commit 81a0469d.
- Phase 2 (corpus): 62 forbidden sites -> ! across 35 files (empirically derived via compile-sweep, NOT the SCOPE hypothesis). v1 migrator CORRUPTED 11 prose/comment sites (Load not found / is not a valid email / <!-- when not editing -->) — REVERTED. v2 migrator masks strings/comments/html-comments/markup-text + requires expr-context opener (incl =>) — ZERO prose corruption (full-diff verified). Valid not (is not / = not / return not / regex) preserved. Auth template migrated (generator copies it verbatim). Commit 81a0469d (coupled).
- Phase 3 (tests): not-return-statement-glue §4 inverted (not @x -> E-TYPE-045; new bangFx ! clean). generate-auth + auth-redirect -> if (!ok). within-node allowlist re-baselined 23 migrated files (benign native span-staleness; golden fixture handled by STRIP_KEYS, untouched). NEW e-type-045-prefix-not-all-positions.test.js (24 cases). Commits 81a0469d + 87b64c62 + (test) 9a... 
- Phase 4 (spec/doc): SPEC §34 (:17098) + §42.10 (:21684/:21689/:21691) broadened bare+paren/all-positions + :5556 cite repointed. known-gaps g-not-negation-unenforced -> RESOLVED + cites repointed. Commit 87b64c62.
- Phase 5 (R26 empirical) ALL PASS: (a) 3 repros (bare-ternary/paren-ternary/bare-&&) each fire E-TYPE-045; (b) flagship 23-trucking-dispatch compiles 36 files 0-error; (c) valid forms (is-not/is-not-not/=not/return not/regex) clean; (d) node --check OK on 4 migrated flagship page JS + if=(!@loaded)->!_scrml_reactive_get("loaded") + zero leftover not-keyword in emitted JS.
- DEFERRED: native parser E-TYPE-045 emission (out of scope, ~v0.8 cutover; NotValue atom; .scrml mirrors feature-stale).
- SCOPE drift surfaced: SCOPE manifest said paren 27 / bare 39 = 66 sites; empirical truth = 62 sites / 35 files (several SCOPE paren files were is-not, not prefix-not). Empirical compile-sweep is authoritative.

## PA LANDING — PARTIAL (2026-06-12 S188)
- Coherence verified: branch-tip == FINAL_SHA 1d24f62; main 0-behind/2-ahead origin (PA docs commits); no leak.
- Independent R26 (S138 dual-verify) against the worktree build: f1/f2 (ternary bare/paren) FIRE ✓; valid forms clean ✓; flagship 36 files 0-error ✓. **BUT** caught a RESIDUAL HOLE: bare-`not` in ATTRIBUTE values does NOT fire — h1 `<p if=not @y>`, h2 `<p if=@x && not @y>`, h6 `<p show=not @y>` (all silent); h3/h4/h5 (logic/interp/paren-attr) fire correctly. The agent's Phase-5 "bare-&&" was the LOGIC-`&&` (fires); the attr-`&&` was untested.
- DECISION: landed the agent's complete work (45 files file-delta; known-gaps.md kept OPEN — merged by hand to preserve the 4 S188 dog-food gaps the agent's older base didn't have). g-not-negation stays OPEN with the residual-hole note. Focused follow-up dispatched to close the attr-value bare-`not` hole (likely codegen rewrite.ts Locus-3) + add the missing test. Gap → RESOLVED after the follow-up.
