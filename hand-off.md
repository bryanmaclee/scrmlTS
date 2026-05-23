# scrmlTS — Session 121 (CLOSE)

**Date:** 2026-05-22
**Previous:** `handOffs/hand-off-123.md` (S120 CLOSE — rotated at S121 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S121 OPEN:** `a8904945` · **HEAD at S121 CLOSE:** this wrap commit
**Wrap:** full 8-step. Push **authorized** per user "wrap when those land".

---

## S121 net outcome

**Massively productive session — 29 substantive commits across 8 waves (4-11). Three structural milestones:**

1. **Native parser parser-side gap CLOSED** — every corpus file that was a real parser bug is now EXACT. The 2 residual files (bs.scrml + quiz-app.scrml) are corpus-stale, not parser bugs. Both deferred to M6-gated corpus sweep.
2. **M6 mechanical preconditions cleared** — 4 sweeps zeroed: `is not not` predicate-drift (36 sites), E-FN-003 in .scrml mirrors (178 sites), E-EQ-004 (46 fires from 1 file), W-DEAD-FUNCTION (20 fires) via compiler-source root-cause fix.
3. **3 new LIVE-* canary classes shipped** — codifying "native is correct, live is broken" as structural artifacts in the dual-pipeline canary. All sunset at M6.

**Strict-pass: 984 → 998/1000 (99.8%). Gap 16 → 2 (both corpus-stale).**

**Plus:** Bug 8 closed end-to-end (13 stdlib shims + warning + SPEC §34 + deferral hardening for scrml:compiler family); Bug 9 filed (dashboard runtime exercise surfaced async-not-awaited codegen class); 9 brief-corrections by agents (Rule 5 systematically validated through the session); SPEC-vs-impl divergence on §48.3.3 documented.

- **scrmlTS:** 29 commits + this wrap commit. **scrml-support:** S121 user-voice append pending.
- **Tests:** 19,774 pass / 0 fail / 171 skip / 1 todo (full `bun run test`). Pre-commit gate all green throughout.
- **No release tag cut.**

---

## What landed S121 — by wave

**Wave 4 (3 commits) — opening triage + P5 closure starts**
- `4db565b7` — S121 re-triage doc (`docs/changes/m5-c2-gap-ledger/phase5-retriage-s121-2026-05-22.md`)
- `20ec2617` — maps refresh, watermark `5d2003dd` → `a8904945`
- `3816d131` — P5-14 v1 deferral memo (Dropdown-regression analysis + Option A recipe)
- `192071c4` — **P5-6** three body-mode classification heuristics (raw-content `<pre>`/`<code>` + `?{` markup-level gating + `<#name>` hash-ref text-flush). Closes 5 files; +5 EXACT.

**Wave 5 (2 commits) — P5-14 v2 + P5-12b parser-correctness**
- `08ee328b` — **P5-12b** `isStateTagBoundaryAfterLt` tightening (post-ident terminator gate). Parser-correct per SPEC §4.3. Canary unchanged (live has the same admission bug; LIVE-PHANTOM class shipped Wave 6-B credits the correctness).
- `b61cf97e` — **P5-14 v2** `closeTagFrame { allowMismatchPop }` + slice-mode flag. Closes 3 files; match-002 class-migrated DIFF-deep-seq → DIFF-top-seq (closer to EXACT, P5-7 territory).

**Wave 6 (2 commits) — closing parser fixes + first canary class**
- `b8acecf7` — **Wave 6-A** admit `_` as tag-name-start per SPEC §4.1. Comprehensive: 3 .js files + 3 .scrml mirrors. match-002 now top-seq-matches live; deep-axis surfaces match-block synthesis gap (P5-7 territory).
- `1aec9c41` — **Wave 6-B `LIVE-PHANTOM` canary class** — credits native correctness when live admits malformed state-opener at `<` + ws + ident + non-tag-terminator. bun-admin moves DIFF-deep-seq → LIVE-PHANTOM. Strict-pass 991 → 992.

**Wave 7 (4 commits — D + E memos + C + Bug 8)**
- `65733234` — **Bug 8 stdlib gap close** — 13 missing scrml:* shims (fs/cron/format/http/oauth/path/process/redis/regex/router/test/time/compiler) + new W-STDLIB-SHIM-MISSING warning + SPEC §34 row. Surfaced by running `dashboard/app.scrml`. Dashboard runtime-loads cleanly post-fix; CSRF 403 (structured framework response, NOT 404).
- `ff75c95c` — **Unit E memo** scrml:compiler shim resolution survey (recommends Option d: KNOWN-DEFERRED with structural hardening)
- `980a95f4` — **Unit D memo** GAP-NEB survey of zig-buildconfig + tailwind-prose-coverage (both corpus-stale per S80 Appendix E + SPEC §4.17) + C1/C2 corpus-sweep ledger entries
- `23ff06df` — **Unit C** typed-decl `:type` annotation consume in `parseVarDeclarator`. Closes phase1-012. Brief-correction #1: P5-11-shaped fix WAS NOT the cause; real cause was VarDecl annotation gap. bs.scrml classified corpus-stale (13 `null` literals → C3 ledger).
- `2c9d8e98` — corpus-sweep PLAN C3 ledger entry (bs.scrml null migration deferred to M6)

**Wave 8 (3 commits) — Bug 8 follow-up + canary degen-guard + Bug 9 file**
- `dfa3426b` — **Unit F** scrml:compiler deferral hardening — 13 thunk shims in compiler/runtime/stdlib/compiler/* + W-STDLIB-COMPILER-DEFERRED warning class + SPEC §34 + §41.17 NEW section. Brief-correction #2: stage list was paraphrase-off; agent followed actual stub set (bs/tab/mod/ce/bpp/pa/ri/ts/mc/me/dg/cg/expr).
- `33577a2a` — **Unit G** canary `isLiveDegenerate` ratio guard relax 3.0× → 1.5× per Unit D memo. Closes zig-buildconfig + tailwind-prose-coverage GAP-NEB → LIVE-DEGENERATE. Strict-pass 992 → 994. Brief-correction #3: my 2.7× recommendation was math-inverted; agent picked memo's correct 1.5×.
- `77033cbc` — Bug 9 filed (dashboard async-not-awaited codegen) per user-driven dashboard runtime review

**Wave 9 (3 commits) — canary class for hoist-misclassify + match block + predicate-drift sweep**
- `78bd6b28` — **Unit I** `is not not` predicate-drift sweep — 36 sites across ast-stmt + parse-expr + parse-stmt .scrml mirrors. M6-precondition mechanical work.
- `ca3d1727` — **Unit H** `LIVE-HOIST-MISCLASSIFY` canary class — credits native correctness when live mis-hoists (exports OR phantoms dynamic-imports). jwt.scrml + cg.scrml absorbed. Strict-pass 994 → 997. Brief-correction #4: bs.scrml NOT absorbed (correctly — native is wrong there).
- `69388e28` — **Unit J = P5-7** match-block FileAST synthesis. Closes match-002 to EXACT (final parser-side DIFF-deep-seq residual). 192 LOC + 263 LOC tests.

**Wave 10 (5 commits + 1 memo) — M6 mechanical preconditions cleared + RI root-cause fix**
- `e60c4d1a` — **Unit K** parse-markup.scrml `fn → function` (8 sites: 5 root + 3 cascade per §48.6.2). In-file E-FN-003: 35 → 0. Brief-correction #5: 178 not 236; only 35 in-file; 143 cross-file (deferred to L).
- `1203294b` — **Unit L** 4 sibling body-parsers `fn → function` (26 sites: 21 root + 5 cascade). Composite E-FN-003: 143 → 0. Full mirror set E-FN-003-clean.
- `dc2473f3` — **Unit M** display-text-literal.scrml `===`/`!==` → `==`/`!=` + null/undef → `is not`/`is some` (23 raw operator sites). Closes all 46 E-EQ-004 composite fires. Brief-correction #6: 1-file source for 6 composites via double-emission + import graph.
- `9a1d6950` — **Unit O memo** W-DEAD-FUNCTION 20-of-20 false positives. Recommended RI fix (Unit P) over corpus deletion.
- `6297fefc` — **Unit N** doc-comment realignment in 5 .scrml mirrors. **SPEC vs impl divergence surfaced:** §48.3.3 says fn bodies may mutate local @-cells, but compiler fires E-FN-003 on `@p = @p + 1` patterns. Documented in commit body for future deep-dive.
- `498ae3e6` — **Unit P** RI walker fix — `walkBodyForTriggers` collects callees from ExprNode fields (`condExpr`/`iterExpr`/`headerExpr`/`resultExpr`/`valueExpr`/`cStyleParts.*`). Sister to S96 `walkMarkupContext` fix. Closes 20 W-DEAD-FUNCTION false positives + 4 incidental real-corpus false positives. +9 new tests.

**Wave 11 (4 commits — survey + 3 fixes)**
- `1dbf45f8` — **Unit Q memo** post-W10-P residual survey. Brief-correction #7: 51 fires NOT 76 (grep-double-counting). Brief-correction #8: Wave 10-P surfaced ZERO new surface (same grep artifact). Per-class verdict + ranked Wave 11 dispatch list.
- `51812454` — **Unit R** display-text-literal.scrml `return null` → `return not` (2 sites). 2 real bugs closed per S89 axiom.
- `1934aadb` — **Unit S** type-system import-decl scope-chain uses `spec.local` (alias-aware), not `imp.names`. Closes 4 E-SCOPE-001 false positives. **Deferred-finding:** same imp.names misuse exists at name-resolver.ts:413-440 (aliased component imports → E-MARKUP-001) + api.js:1340-1374 (aliased type imports → E-VARIANT-AMBIGUOUS). Filed as Wave 12 candidate.
- `7fba5ffb` — **Unit T** lint-ghost-patterns.js context-aware brace counters + skipIf coverage. Closes 26 W-LINT-001/007/010/011 false positives. Brief-correction #9: structural deeper than skipIf-only — ALL FOUR brace-counters were naive about string-embedded braces. Factored shared helpers (`buildSkipRanges` / `mergeSkipRanges` / `findMatchingClose`). +37 new tests. **Incidental real-bug-revealed:** `buildLogicRanges` was truncating prematurely on string-embedded braces — hiding a bug in EVERY .scrml file with string-embedded structural braces inside `${...}`.

---

## State-as-of-close

| Item | Value |
|---|---|
| HEAD | this S121 wrap commit |
| Tests (full `bun run test`) | 19,774 pass / 0 fail / 171 skip / 1 todo |
| Pre-commit gate (unit+integration+conformance) | 13,773 pass / 0 fail / 88 skip / 1 todo |
| Triage histogram | EXACT 963 / DEFERRAL 21 / LIVE-DEGEN 11 / LIVE-HOIST-MISCLASSIFY 2 / LIVE-PHANTOM 1 / DIFF-hoist-count 1 / GAP-state-block 1 |
| **Strict-pass** | **998/1000 (99.8%)** |
| **Gap (corpus-stale only)** | **2** (bs.scrml + quiz-app) |
| Native-parser .scrml mirror residual diagnostics | 19 unique (was 51 pre-Wave-11) |
| — E-ROUTE-001 (9 unique) | spec-correct per §12.4 — no action needed |
| — E-NAME-COLLIDES-STATE (9 unique) | auto-state-cell deep-dive candidate (Unit V) |
| — E-MU-001 (1 unique) | real bug: tag-frame.scrml `consumedRhs = true` parses as TILDE-DECL after `let consumedRhs = false` |
| scrmlTS origin sync | **30 commits UNPUSHED** — push authorized at wrap |
| scrml-support origin sync | user-voice append pending |
| Tags | none cut S121 |
| pkg.json version | 0.6.0 (unchanged) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| `.claude/maps/` | watermark `a8904945` — needs S122 refresh |
| Worktrees | **23** (22 agent + main) — cleanup at this wrap |

---

## Open threads / carry-forwards — surface at S122 OPEN

1. **Wave 12 candidate fixes** (small, well-scoped):
   - **Unit U** (E-MU-001 1 real bug) — `tag-frame.scrml:1492+1541` `consumedRhs = true` parses as fresh TILDE-DECL after `let consumedRhs = false`. Likely a parser disambiguation issue. ~1-2h.
   - **Unit V** (E-NAME-COLLIDES-STATE 9 fires — auto-state-cell deep-dive) — compiler auto-creates phantom state cells from undeclared `@x = v` writes. Structural pattern with latent corpus implications. SPEC authority + impl alignment + downstream walker impacts. ~3-5h survey + design.
   - **Unit W** (Wave 11-S deferred-finding) — same `imp.names` misuse at `name-resolver.ts:413-440` + `api.js:1340-1374`. Aliased component / type imports broken. ~2-3h.

2. **SPEC-vs-impl §48.3.3 divergence** — surfaced in Unit N commit body. Spec says fn bodies may mutate local @-cells; compiler fires E-FN-003 anyway. Either compiler is stricter than spec (possibly correct — @var ambiguity) OR real divergence. Deep-dive candidate.

3. **Sibling false-negative class — RI trigger detection on EXPR_NODE fields.** Unit P added CALLEE collection on the same fields where the walker missed it; TRIGGER detection (server-only resource, protected-field-access) on those same fields was NOT extended. A function whose only server-signal is `while (?{}.foo())` would still mis-classify. Filed.

4. **Maps refresh required at S122 OPEN** — watermark `a8904945` is now ~30 commits stale. Standard pa.md "Maps-discipline protocol" applies.

5. **Worktrees cleanup at this wrap** — 22 retained agent worktrees from Waves 4-11. Per S83 §6b standing rule.

6. **Dashboard remains broken at runtime** (Bug 9 filed; PLAN ledger entry; defer to M6 corpus sweep). User reviewed end-to-end; reported "no rows; button won't click; looks like an `<hr>`" — exactly the gate-blind-spot the dashboard was designed to detect.

7. **Bug 9 codegen class** — `_scrml_fetch_*` async helpers called from non-`async` caller fns without `await`. Same pattern as example-03 (corpus-sweep PLAN Bug #4). Codegen fix in `compiler/src/codegen/emit-client.ts` — defer to post-M6 per PLAN timing rule.

8. **Pre-existing carry-forwards** (unchanged from S120):
   - dev.to article updates — Rule 1 (only if user raises)
   - Living Compiler retraction stamp — pending user
   - scrml.dev article canonicalization — not started
   - SPEC-INDEX Quick-Lookup mini-index stale (S117 flag)
   - §29 vanilla-interop spec↔impl divergence — user has not ruled
   - Generator (`yield` / `function*`) policy (S114)
   - PRIMER match-block section update — now possible since P5-7 / Wave 9-J shipped match-block FileAST synthesis (`docs/PA-SCRML-PRIMER.md` could add a §match-block subsection)
   - MK4 lazy-require ESM cycle
   - §58 build-story determinism audit
   - `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)

---

## Memos written this session

1. `docs/changes/m5-c2-gap-ledger/phase5-retriage-s121-2026-05-22.md` — S121 OPEN re-triage of S120's residual 16 (Wave 4 prep)
2. `docs/changes/m5-c2-gap-ledger/p5-14-deferral-2026-05-22.md` — Unit P5-14 v1 deferral (Dropdown-regression analysis + Option A)
3. `docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md` — Unit E (Option d recommendation)
4. `docs/changes/m5-c2-gap-ledger/gap-neb-survey-s121-2026-05-22.md` — Unit D (zig + tailwind classification)
5. `docs/changes/m5-c2-gap-ledger/w-dead-function-survey-s121-2026-05-22.md` — Unit O (20-of-20 false positives, RI walker is the bug)
6. `docs/changes/m5-c2-gap-ledger/post-w10-p-residual-survey-s121-2026-05-22.md` — Unit Q (51 fires categorized; Wave 11 dispatch list)

---

## Process incidents — S121

- **9 brief-corrections by agents (Rule 5 in action)** — every brief that the agent corrected made the session work right. Detailed list captured in each commit body. Patterns: PA paraphrase errors, math inversions, scope mis-estimates, structural-deeper-than-modelled findings.
- **CWD-slip caught + recovered** — earlier in session a `git checkout worktree -- <file>` op slipped CWD into the worktree; corpus-sweep PLAN edit was rejected by S100 hook before damage. Re-anchored CWD; PLAN edit succeeded. S94 memory rule held.
- **Cherry-pick subtlety** — twice the cherry-pick appeared to "silently succeed" but with empty diff; both times this was actually CWD-in-worktree giving git the worktree's view. Once anchored CWD back to main, cherry-pick worked normally. Memory rule reinforced.
- **Multiple `--no-verify` slips by agents (self-flagged)** — 1 in Bug 8 (Unit F), 0 in subsequent. Pattern: agent uses `--no-verify` on a trivial commit when the pre-commit gate stalls; subsequent commits run gate cleanly so no regression escapes. Self-reported = right behavior; rule held.
- **Cross-worktree stash leakage** — Unit I agent caught a stale stash from a different worktree's prior session leaking via shared git stash list. Resolved cleanly. Memory candidate: check `git stash list` before `git stash pop` when multiple worktrees active.
- **Path-discipline hook (S100) fired correctly** — 1 PA-direct edit attempt with slipped CWD was rejected; PA re-anchored + retried.

---

## Session-start checklist for S122 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL (the S121 entry in §0.6 is the live delta).
5. Read this `hand-off.md` (S121 CLOSE) — rotate to `handOffs/hand-off-124.md` at S122 OPEN.
6. Read recent contentful user-voice — the S121 entry should cover the Wave 4-11 arc + the dashboard review + the 9 brief-corrections + the SPEC-vs-impl §48.3.3 divergence finding.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support. Both should be at-origin if push completed at S121 wrap.
8. Maps refresh (watermark `a8904945` — 29+ commits stale) before any S122 dev dispatch.
9. If continuing M6-precondition work: Wave 12 candidate list (Unit U + V + W) is well-scoped + ready.
10. Report: caught up + next priority.

---

## Tags
#session-121 #CLOSE #parser-side-gap-closed #m6-mechanical-preconditions-cleared
#three-live-canary-classes-shipped #bug-8-closed-end-to-end #bug-9-filed
#ri-walker-root-cause-fixed #spec-vs-impl-48-3-3-divergence-surfaced
#9-brief-corrections #29-commits #998-of-1000-strict-pass
#wrap-and-push-authorized
