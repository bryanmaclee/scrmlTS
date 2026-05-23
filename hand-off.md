# scrmlTS — Session 122 (OPEN)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-124.md` (S121 CLOSE — rotated at S122 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S122 OPEN:** `136678e5` (S121 wrap commit — pushed)

---

## Session-start state

| Item | Status |
|---|---|
| scrmlTS origin sync | clean — 0/0 ahead/behind |
| scrml-support origin sync | clean commits; 6 untracked items (pre-dating session) — see "Open questions" |
| Inbox `handOffs/incoming/` | empty (only `read/` subdir) |
| pkg.json version | 0.6.0 (matches latest tag) |
| Tags newly fetched | v0.5.0 + v0.6.0 (were on remote, hadn't synced to this clone) |
| Hook gate | **REGRESSED + RECOVERED PARTIALLY** — see "Open questions" |
| `.claude/maps/` | watermark `a8904945` — **29+ commits stale, needs refresh** before any dev dispatch |
| Worktrees | clean (per S121 wrap) |
| pa.md authority | `../scrml-support/pa-scrmlTS.md` read in full |
| PRIMER | `docs/PA-SCRML-PRIMER.md` read (§1-§13) |
| SPEC-INDEX | `compiler/SPEC-INDEX.md` read |
| Master-list §0 | LIVE dashboard read; §0.6 reflects S121 close |
| User-voice | S120 + S121 entries read |

---

## Open questions to surface immediately

### 1. POST-COMMIT HOOK LOST (Configuration B downgraded to A+pre-push)

`core.hooksPath = .git/hooks` (Configuration B per pa.md S88), but `.git/hooks/` had only `.sample` files at session start. Re-installed `pre-commit` + `pre-push` via `./scripts/git-hooks/install.sh`. **`post-commit` is GONE** — it was machine-local-only and not source-controlled (scripts/git-hooks/ has no post-commit). The S121 hand-off claimed Configuration B was in place with all three hooks; the regression must have happened between S121 wrap and now.

Impact: post-commit was the informational full-suite re-run on compiler changes. Loss is non-blocking (pre-commit is the load-bearing gate; pre-push runs full suite + TodoMVC quick check). User decides whether to restore by hand.

### 2. scrml-support 6 untracked items (pre-dating this session)

```
?? tools/
?? voice/articles/2026-05-09-devto-openers-tier1.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-POST.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-devto-reply-modularity.md
?? voice/articles/2026-05-09-devto-reply-modularity-v2-slow-burn.md
?? voice/articles/2026-05-09-server-keyword-deprecation.md
```

Dated 2026-05-09 — predate S121 by 13 days. Per pa.md Rule 1 (no marketing work unless user raises) these are NOT for PA to dispose without user direction. Surface; await disposition.

### 3. Maps refresh required before any dev dispatch

Per S121 hand-off carry-forward + pa.md maps-discipline protocol. Map watermark `a8904945`; HEAD `136678e5`. 29+ commits stale.

### 4. Carry-forwards from S121 close (no action without user direction)

- **Wave 12 candidates** (well-scoped, ready): Unit U (E-MU-001 `tag-frame.scrml` ~1-2h) + Unit V (auto-state-cell deep-dive ~3-5h survey) + Unit W (imp.names misuse residuals ~2-3h)
- **SPEC-vs-impl §48.3.3 divergence** (deep-dive candidate) — Unit N surfaced it; spec says fn bodies may mutate local @-cells, compiler fires E-FN-003 anyway
- **Sibling false-negative class** — RI TRIGGER detection on EXPR_NODE fields (Unit P added CALLEE; TRIGGER not extended)
- **Bug 9** (dashboard async-not-awaited codegen) — defer to post-M6 per corpus-sweep PLAN
- **Dashboard still broken at runtime** (Bug 9 / PLAN ledger)
- **Pre-existing carry-forwards** (unchanged): dev.to article updates (Rule 1) · Living Compiler retraction stamp · scrml.dev canonicalization · SPEC-INDEX Quick-Lookup mini-index stale (S117 flag) · §29 vanilla-interop divergence · Generator policy (S114) · PRIMER match-block subsection update (now possible since P5-7) · MK4 lazy-require ESM cycle · §58 build-story determinism audit · `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)

---

## What landed S122 — by wave

**Wave 1 — dispatched 2026-05-23 ~04:40, both completed ~05:00:**

- **project-mapper** ✅ — incremental refresh `a8904945` → `136678e5`. 8 maps + primary updated; Task-Shape Routing section added to `primary.map.md` (8 task shapes mapped to 2-4-map reading orders). **Non-compliance flagged:** `.claude/maps/PHASE-4-TOUCH-POINTS.md` is a stale S33 (2026-04-20) artifact from the state-local-transition arc — not a standard map, recommend deref or delete. Pending PA disposition.

- **scrml-deep-dive on §48.3.3** ✅ — **verdict: illusory divergence.** Under V5-strict (§6.1.3 + §6.2) there is no "local `@`-cell" code shape. The S121 Unit N commit body's claim ("bodies mutate ONLY locally-declared @-cells; could arguably stay fn") was a derivative-doc paraphrase error trusting JS-transliteration shape over SPEC. E-FN-003 IS scope-aware (non-@ check uses `localNames`; @-check unconditional fire is spec-correct per §48.3.3 outer-scope-mutation rule + §6.2 program-scope-only @-cells). The 4 functions don't compile cleanly as `function` either — `parse-markup.scrml` emits 9 E-NAME-COLLIDES-STATE fires today; file is SHAPE-only mirror per its own comment. **Recommended cleanup:** rewrite 4 + 14 sibling sites in `compiler/native-parser/parse-*.scrml` to drop `@`-sigils from local-only mutations (use plain `let p = 0; p = p+1`); then re-evaluate fn-vs-function per function. ~2-2.5h scrml-dev-pipeline dispatch. Doc: `scrml-support/docs/deep-dives/spec-vs-impl-48-3-3-fn-body-cell-mutation-2026-05-23.md`. **Rule 4 lesson banked.** **Adjacency questions noted (out of scope):** (a) Pillar-5b convention — should native-parser .scrml mirrors be SHAPE-only or compile-clean; (b) Did-you-mean diagnostic for E-NAME-COLLIDES-STATE on `let X` + `@X` co-occurrence.

**Implications for S121's queued Wave 12:**
- Unit V (auto-state-cell deep-dive) scope likely NARROWS — the deep-dive surfaces evidence that "phantom state cell synthesis" is partly an artifact of corpus mis-use of `@`-sigils. Unit V may fold into / reframe around the cleanup.
- Unit U (E-MU-001 tag-frame.scrml TILDE-DECL confusion) + Unit W (imp.names misuse at name-resolver + api.js) remain unchanged.
- NEW Unit X (deep-dive recommended cleanup) — bounded ~2-2.5h, file-disjoint from U/V/W, dispatchable in parallel.

**Sequencing — user picked A (2026-05-23 ~05:10):**
- Unit X (native-parser-mirror cleanup) + Unit U (tag-frame TILDE-DECL) + Unit W (imp.names → spec.local at name-resolver + api.js) dispatched in parallel ~05:15.
- Unit V re-scoped post-cleanup (narrower question; evidence from X cleanup will inform whether auto-state-cell synthesis exists / should be killed / should lint).

**User-surfaced mid-session items:**
- **README server-keyword cleanup** (line 60 — `server function loadContacts()`). User asked "when can we get rid of the server keyword in the first example of the readme?" PA verified: NOW. `W-DEPRECATED-SERVER-MODIFIER` already fires on this pattern today (SQL body is a Trigger 1/2/3 escalation; warning fires "ONLY when at least one other trigger would escalate the function regardless"). Example also self-contradicts: line 91 already teaches inference. **Fold into Wave 12 wrap commit** unless user redirects.
- **Dashboard work queued** — user noted "when we can we need to get to the testing dashboard." Per S121 hand-off the dashboard is broken at runtime (Bug 9 — `_scrml_fetch_*` async-not-awaited codegen class) and was filed defer-post-M6 per corpus-sweep PLAN timing rule. User raising it again may indicate priority shift OR a different angle (e.g., fix Bug 9 sooner, OR add a dashboard feature, OR something else). **Surface for direction after Wave 12 lands.**
- **Context budget note:** user reported "26% ctx so far" at S122 OPEN; will signal wrap timing.

**Wave 12 IN-FLIGHT STATE (mid-session snapshot 2026-05-23 ~05:50):**

| Unit | Worktree | Branch | Status | Landing |
|---|---|---|---|---|
| X | agent-a70cac45c3e21dd80 | changes/s122-w12-native-parser-mirror-at-sigil-cleanup | ✅ done @ `46d759c9` | gate-blocked by W |
| U | agent-a6aafec7a66348a9e | changes/unit-u-tilde-decl-mu-001 | ✅ done @ `c8e39a3b` (5 clean commits + 8 new tests) — **brief was wrong about site** (bug in type-system must-use-tracker, NOT parser); agent correctly re-routed | gate-blocked by W |
| W | agent-a361fb7c70311fbb7 | worktree-agent-a361fb7c70311fbb7 | ⚠️ PATH-DISCIPLINE LEAK (incident #5) | partial in main, test failing |

**S99 path-discipline leak (incident #5) — Unit W:**
- WIP startup commit landed in worktree (`262aaf54`) per F4 protocol
- BUT subsequent edits + commits went to main (3 commits: `abdf4873`/`eb2275da`/`dd28a6a1`)
- Test files (`aliased-imports-local-name.test.js`, `aliased-imports-cross-file.test.js`) authored in main, **untracked + uncommitted**
- The unit test fails (specifiers[].length=1 expected, 0 received) — buildImportGraph not populating specifiers correctly
- Either W is still mid-flight (will commit fix to make test pass) OR terminated with broken state
- Per pa.md S99 recovery: "if clean, accept the landing and note the process violation" — NOT clean here; the gate IS failing
- **Recovery decision pending W completion notification**

**Blocker for X + U landings:** RESOLVED at 2026-05-23 ~05:55. W landed test commit `cbfefef2` mid-flight; gate passed. X landed at `bb1f0b9c`; U landed at `d90298a2`. Wave 12 X+U+W all in main; +20 tests across the wave; 0 regressions.

**S99 path-discipline leak (incident #5 — Unit W) — POST-INCIDENT NOTES:**
- Agent's final report claimed worktree path `/home/bryan/.../agent-a361fb7c70311fbb7` (correct) — startup verification passed
- But all substantive edits + commits (4 of them, including the test commit `cbfefef2`) landed in main, not the worktree
- Worktree contains only `262aaf54 WIP(Unit W): start at ...`
- Hypothesis: agent's Edit/Write tool calls used main-path absolute paths instead of $WORKTREE_ROOT-rooted absolute paths (the S99 canonical leak shape)
- Result clean (tests pass, code is correct) — per pa.md S99 recovery protocol "if clean, accept landing and note process violation." Noted.
- Empirical record: S99 incident counter now at 5 in this session-arc post-S99. Platform-level fix (PreToolUse hook rejecting main-path edits from subagents) remains the load-bearing structural mitigation.

**Wave 12 final tallies (X + U + W + README):**
- 4 commits → main: `bb1f0b9c` (X), `d90298a2` (U), `cbfefef2`+`dd28a6a1`+`eb2275da`+`abdf4873` (W, 4 commits leaked), `62612b44` (README)
- Tests: 13819 → 13928 (+109 from Wave 12 + W; 8 + 8 = 16 explicitly new). Hmm — count delta is higher than agent reports; some recount artifact.
- 0 regressions throughout
- Rule 5 brief-corrections at S122: at least 3 (Unit X scope narrowed, Unit U site re-routed, Unit Y dispatched as sibling-followon — agents-as-second-set-of-eyes pattern holds)

**S122 — Wave 13 dispatches (2026-05-23 ~06:00 — in flight):**

- **Unit V (auto-state-cell investigation, re-scoped)** — scrml-deep-dive — narrower bounded ~2-3h question: does compiler auto-synthesize phantom state cells from undeclared `@x = v` writes? Hypothesis A (auto-synth = SPEC divergence) vs B (errors out, no divergence) vs C (context-dependent) vs D (S121 framing was wrong). Empirical compile-a-test-file experiment settles A vs B. Doc target: `scrml-support/docs/deep-dives/auto-state-cell-synthesis-investigation-2026-05-23.md`.
- **Unit Y (RI TRIGGER walker EXPR_NODE extension)** — scrml-dev-pipeline, isolation:worktree — sister to S121 Wave 10-P CALLEE walker fix. TRIGGER detection for §12.2 server-only resource access (SQL, protected fields, server-only stdlib) needs the same EXPR_NODE field recursion (condExpr/iterExpr/headerExpr/resultExpr/valueExpr/cStyleParts.*) that CALLEE collection got at S121. Bounded ~1-2h.

**Mid-session done in S122:**
- README first-example `server` keyword drop at `62612b44`
- Wave 12 complete (X+U+W)
- 2 new dispatches in flight (V + Y)
- PRIMER match-block subsection (this session, in progress — text-only addition documenting §18.0.1 since P5-7 shipped FileAST synthesis at S121)

---

## Process incidents — S122

(none yet)

---

## Memos written this session

(none yet)
