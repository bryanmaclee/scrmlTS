# Progress: high-deepset-write-loss-2026-06-06

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a53e5e892b211dfe0
Branch: worktree-agent-a53e5e892b211dfe0

## 2026-06-06T15:19:00Z — Phase 0 COMPLETE (locus confirmed)
- Startup verification passed (pwd under worktree, ff up-to-date, bun install + pretest OK).
- Reproduced bug on baseline e0269548: `_scrml_multi_4()` emits only the two scalar
  `_scrml_reactive_set("c", ...)` — both `@a.ref` deep-sets vanish.
- Tokenizer is NOT the culprit: `tokenizeLogic` produces uniform AT_IDENT "@a" + "." + "ref" + "=" + STRING
  for both deep-sets (position-agnostic).
- AST probe pins the root cause: NOT position-gating but `collectExpr` OVER-CONSUMPTION.
  - [deep,deep]: 1st reactive-nested-assign value = '"p"\n@a . ref = "q"' (2nd swallowed into RHS)
  - [scalar,deep]: state-decl init = '1\n@a . ref = "p"' (deep swallowed into scalar RHS)
  - [deep,scalar]: 2 stmts OK (deep self-terminates correctly; scalar after it fine)
- Root cause site: ast-builder.js collectExpr assignment-boundary check (~L2715-2751, "BUG-R14-002").
  It breaks on `@ident =` (peek(1) is "=") but a deep-set is `@ident . path =` (peek(1) is ".") so
  the boundary check sees no "=" and fails to break -> collectExpr keeps consuming the next statement.
  ASI-NEWLINE path (~L2760) also can't save it: tokStartsStmt requires IDENT/KEYWORD, excludes AT_IDENT.
- ARRAY-MUTATION sibling form has the SAME consuming-side bug:
  [scalar, arr.push] -> state-decl init = '1\n@arr . push ( 5 )' (push swallowed).
  ([arr.push, X] works because .push(...) self-terminates at the matching ')'.)

## Next: Phase 1 — fix
- Extend the collectExpr assignment-boundary check to break when a new statement starts with a
  dotted-path reactive form: `@ident . ...` that is either a deep-set (`... =`) or array-mutation
  (`... method (`). Minimal, routes to existing reactive-nested-assign / reactive-array-mutation builders.

## 2026-06-06T15:35:13Z — Phase 1 + 2a DONE; Phase 2b runtime caveat surfaced
- Fix landed in collectExpr (f1dbd8ce): dotted-path reactive boundary recognizer.
  Repro multi() now emits ALL FOUR statements in order (c=1, deep p, c=2, deep q);
  node --check OK. AST matrix all-green (8 deep rows + 5 arr rows + RHS-operand guard).
- Emit-shape unit test committed (f2aca488): deepset-write-loss-position.test.js, 16 tests / 87 asserts, green.
- ARRAY-MUTATION sibling: SAME consuming-side bug; fix covers it; verified [scalar,arr] etc. now emit.

### SURFACED (Phase 2b): structural-compound deep-set is a SEPARATE pre-existing RUNTIME bug
- The brief's repro uses a STRUCTURAL COMPOUND `<a>` `<ref> = ""` `</>`. For that form,
  codegen makes `a` a DERIVED cell: _scrml_derived_declare("a", () => ({ ref: _scrml_reactive_get("a.ref") })).
  The deep-set emits _scrml_reactive_set("a", _scrml_deep_set(_scrml_reactive_get("a"), ["ref"], "q"))
  — it writes the DERIVED `a` cell directly, which the derived recompute immediately overwrites
  from the (unchanged) `a.ref` source cell. Correct target would be _scrml_reactive_set("a.ref", "q").
- Fails at runtime EVEN FOR A SINGLE deep-set (position 1) — NOT introduced by my parser fix and NOT
  the write-loss bug. Distinct codegen bug: deep-set on a structural-compound cell targets the wrong
  reactive key (derived composite vs leaf source cell). OUT OF SCOPE — surfaced for PA.
- A FLAT object cell `<a> = { ref: "" }` deep-sets correctly at runtime (last-write-wins -> "q").
  Runtime acceptance test uses the flat-object form: proves the PARSER FIX delivers correct end-to-end
  mutation (all deep-sets parse -> emit -> apply), without entangling the separate derived bug.

## Next: write browser runtime acceptance (flat-object) + Phase 3 R26 + Phase 4 full suite.

## 2026-06-06T15:53:56Z — Phases 2b/3/4 COMPLETE
- Browser runtime acceptance committed (81975975): browser-deepset-write-loss.test.js, 4 tests.
  Flat-object form; DOM click -> handler -> reactive-set; @a.ref ends "q", @c ends 2; node --check gate.
- Phase 3 R26: repro emits BOTH deep_set(p) + deep_set(q); node --check exit 0; full 8-row matrix all-PASS.
- Phase 4 full suite: 1 fail surfaced = within-node parity per-fixture gate (gauntlet-r11-elixir-chat +4).
  ROOT: the fix makes LIVE correctly emit reactive-array-mutation for @messages.push(msg) (pre-fix it was
  SWALLOWED — same write-loss bug; confirmed by in-place revert: pre-fix residual {} + body MISSING the push).
  Native parser still folds it to bare-expr (separate native swap-grind gap). Correct-shadow, not masking.
  Bumped allowlist +1 each in KIND-NAME/FIELD-SHAPE/EXTRA-FIELD/SPAN-COORD for r11 (committed cd7f7aee).
  within-node now 1005/0. Full suite: 23075 pass / 220 skip / 1 todo / 0 fail / 914 files.

## DONE. FINAL_SHA = (this commit). git status clean.
## OUT-OF-SCOPE surfaced for PA:
##  1. STRUCTURAL-COMPOUND deep-set runtime bug (derived-cell key mistarget) — fails even single-write.
##  2. NATIVE parser does not recognize @arr.method()/@obj.path= dotted-path reactive in fn bodies
##     (folds to bare-expr) — same class as the live bug, now a swap-grind parity item.
##  3. Inline event-handler deep-set <button onclick=${@a.ref="x"}> emits direct prop write (per brief; NOT touched).
##  4. Module-scope orphan _scrml_reactive_get("a").ref; UNCHANGED by this fix (per brief; from <p> interp path).
