# scrmlTS — Session 42

**Date opened:** 2026-04-25
**Date closed:** 2026-04-25 (or still active if you're reading this mid-session)
**Previous:** `handOffs/hand-off-42.md` (S41 closed)
**Baseline entering S42:** **7,852 pass / 40 skip / 0 fail / 372 files** at `b1ce432`. 4 commits ahead of `origin/main` (the four S41-end docs commits: `c9e1800`, `ecd59b6`, `f3c2061`, `b1ce432`).
**State at S42 close:** **7,889 pass / 40 skip / 0 fail / 375 files** at `9a07d07`. **10 commits ahead of `origin/main`** (4 from S41 close + 6 from S42).

---

## 0. The TL;DR for the next session

**Read this hand-off in full.** S42 was a deep, multi-thread session. Per S41 user directive (S41 hand-off §5, captured in `scrml-support/user-voice-scrmlTS.md`): *"if we go multi session, we need to pass all possible context along. I dont care if pa starts with slightly more bloated context if it knows exactly what we're doing."* This hand-off is deliberately verbose. Don't optimize for terseness when the next-session PA will need re-derivation otherwise.

**One-sentence state:** Scope C audit Stages 1+2+3+6 done; 6 compiler bugs catalogued (3 fixed, 3 intake-filed), kickstarter v1 published, examples 15-22 added; **10 commits ahead of origin awaiting push authorization**; **3 ready-to-dispatch intakes** queued (A6 → A3 → A4).

---

## 1. Open questions to surface IMMEDIATELY at session start

These are decisions the next session needs to make before doing further work:

1. **Push the 10 commits to origin?** S41 close left 4 unpushed; S42 added 6 more. PA has not pushed. Authorization needed.
2. **Dispatch the next compiler-bug intake?** Three are ready: A6 (T1, smallest), A3 (T2, parser-trace-needed), A4 (T2 surgical). Recommended order is A6 → A3 → A4. Could also dispatch all three in parallel since they touch disjoint files (`lint-ghost-patterns.js` vs `component-expander.ts`/`ast-builder.js` vs `expression-parser.ts`).
3. **Send any cross-repo notices?** S42 made significant changes (kickstarter v1 supersedes v0, 8 new examples, A5 fix changes `liftBareDeclarations` semantics inside markup). giti and 6nz may want to know. S41 already sent kickstarter+fixes notices; S42's incremental changes may not need new outbound messages. Ask user.
4. **Stage 4 / Stage 5 (Scope C)?** Stage 4 is deep warn-only sample classification; Stage 5 is README/PIPELINE/maps audit. Both deferred at S42 because Stage 6 (kickstarter v1) was the higher-leverage priority. Likely worth pursuing now that compiler-bug intakes are in flight.
5. **`dist/` pollution under `handOffs/incoming/dist/`** — still pending disposition, carried from S40 → S41 → S42. Bug I sidecar artifacts + scrml-runtime.js. Decision needed.

---

## 2. What S42 actually accomplished — full thread inventory

S42 ran six interlocking threads. Each is summarized here so the next session has the full picture without re-deriving.

### 2.1 Scope C audit (the umbrella thread)

**Stages completed:**
- **Stage 1 — Inventory + per-example status + spec coverage matrix.** Compiled all 14 (later 22) examples, classified all 275 top-level samples (background agent), built spec → example coverage matrix, identified 8 critical kickstarter-v1-blocking gaps. Outputs:
  - `docs/audits/scope-c-stage-1-2026-04-25.md` (per-example status + coverage matrix)
  - `docs/audits/scope-c-stage-1-sample-classification.md` (sample audit)
  - `docs/audits/.scope-c-audit-data/` (raw data + scripts for re-running)
- **Stage 1.5 — master-list count fix.** Was 297, actual top-level is 275. Fixed.
- **Stage 2 — Kickstarter v0 verification matrix.** Cross-referenced every non-trivial v0 claim against SPEC. Found 22 correct, 10 wrong, 8 originally-unverified-now-resolved. Output at `docs/audits/kickstarter-v0-verification-matrix.md`.
- **Stage 3 — Refresh stale examples + add new for gaps.** 8 polish/structural refreshes (ex 04, 05, 06, 07, 08, 12, 13, 14) + 8 new examples (15-channel-chat through 22-multifile/). 22/22 example files compile.
- **Stage 6 — Kickstarter v1.** All 10 v0 errors corrected; auto-await rule promoted to §2 anchor; 8 recipes each citing a working example file. Output at `docs/articles/llm-kickstarter-v1-2026-04-25.md`. pa.md updated to point at v1.

**Stages NOT completed (deferred):**
- **Stage 4** — deeper sub-classification of the 224 warning-only samples (mostly W-PROGRAM-001 systemic). Lower priority now that W-PROGRAM-001 is pinned for discussion.
- **Stage 5** — README, PIPELINE, master-list, `.claude/maps/` audit against current code. Mostly verification work; defer until stable post-bug-fix state.
- **Stage 7** — re-run validation experiments against kickstarter v1. Target: avg compile probability >75%, run probability >65% (vs v0's ~58% / ~48%). Required before publishing v1 externally.
- **Stage 8** — cross-model validation (GPT-4, Gemini, smaller models) of kickstarter v1. Currently all validation is on Opus 4.7.

### 2.2 Findings tracker (consolidation thread)

**`docs/audits/scope-c-findings-tracker.md`** is the **single source of truth** for everything Scope C surfaced as a real issue. Stable IDs across 6 categories:

- **§A Compiler bugs (6 entries):** A1, A2, A3, A4, A5, A6
- **§B Spec gaps (3 entries):** B1 (`auth=` not in §40), B2 (`csrf="auto"` value), B3 (CSRF mint-on-403 mechanism not in §39)
- **§C Scaffold-only features (3 entries):** C1 (§52 Tier 1 type-level authority no auto-SELECT), C2 (§52 Tier 2 W-AUTH-001 detection), C3 (W-PROGRAM-001 — pinned, not a bug per se)
- **§D Documentation drift (10 entries):** all kickstarter v0 → v1 corrections
- **§E Sample-corpus debt (2 entries):** post-S20 strict-scope drift batch + 23-of-24 stale failures
- **§F Process notes (3 entries):** living-state docs

**Current §A status (compiler bugs):**
| ID | Title | Status | Tier | Source |
|---|---|---|---|---|
| A1 | W-LINT-013 misfires on `@reactive` reads | ✅ FIXED commit `9a07d07` | T1 | `lint-ghost-patterns.js:316` (regex `(?!=)` lookahead) |
| A2 | W-LINT-007 misfires on comment text | ✅ FIXED commit `9a07d07` | T1 | `lint-ghost-patterns.js` (added `buildCommentRanges`) |
| A3 | Component-def text+handler-child fails to register | 📋 intake-filed | T2 | `docs/changes/fix-component-def-text-plus-handler-child/` |
| A4 | `lin` template-literal interpolation walk | 📋 intake-filed | T2 | `docs/changes/fix-lin-template-literal-interpolation-walk/` |
| A5 | `function`/`fn` markup-text auto-promote | ✅ FIXED commit `284c21d` | T1 | `ast-builder.js:235-282` (`liftBareDeclarations` parentType flag) |
| A6 | W-LINT-013 misfires inside `~{}` | 📋 intake-filed | T1 | `docs/changes/fix-w-lint-013-tilde-range-exclusion/` |

**3 fixed, 3 intake-filed and ready to dispatch.**

### 2.3 The two pipeline runs that landed (the dev-pipeline thread)

**A5 pipeline run** (worktree `worktree-agent-a04eafaed62431350`, commit `088d920`):
- Tier T1 originally, fix turned out to need Option 2 (parentType flag) instead of Option 1 (drop recursion) because Option 1 broke 7 existing tests in `top-level-decls.test.js` (`<program>` is a markup-typed block at BS level — needed to retain the lift for top-level bare decls).
- Final fix: **`parentType` flag** carves `<program>` out as a declaration site (its direct text children still lift; any other markup tag suppresses lift for descendants).
- **Bonus fix:** `samples/compilation-tests/func-007-fn-params.scrml` flipped FAIL → PASS (same bug class). Sample-corpus failure baseline 24 → 23.
- Cherry-picked to main as `284c21d` (fix) + `a7d9705` (progress).

**A1+A2 combined pipeline run** (worktree `worktree-agent-a7ecf2afa4b522a64`, commit `c530157`):
- Both T1, both touch `lint-ghost-patterns.js`. Combined dispatch worked cleanly.
- Added `buildCommentRanges` helper. Threaded 4th `commentRanges` arg through skipIf signature. Updated W-LINT-007 + W-LINT-013 skipIfs. Added `(?!=)` lookahead to W-LINT-013 regex.
- **Unexpected partial result on ex 10:** went from 14 lints → 8, NOT 0. The 8 remaining are `@var = N` single-`=` assignments inside `~{}` test sigil bodies — anticipated by A1 intake §"Step 3 deferred" — surfaced as new finding **A6**.
- Cherry-picked to main as `9a07d07`.

### 2.4 Compiler-bug deep-dives (the investigation thread)

For each of the 5 originally-cataloged compiler bugs, did a source-level investigation. Findings:

- **A1 / A2:** root cause confirmed in `lint-ghost-patterns.js`. Fix sketches landed in intakes; both implemented in pipeline; both fixed.
- **A3:** original hypothesis (walkLogicBody not recursing into match arms) was **WRONG**. Match nodes use `body: LogicStatement[]` key, which the walker DOES recurse into. Bisected the actual trigger: **component-def with `<wrapper>{text}+<element with onclick=fn()>` shape fails to register in the component registry.** All references (direct `<Foo/>` OR via match-with-lift) then fail with E-COMPONENT-020 because the def isn't in the registry. Hypothesis pending: `component-expander.ts:1376-1383` raw-normalization regex `([^"=])\s*>` may collapse text-vs-tag boundaries. Intake explicitly defers fix-sketch to dispatch agent ("trace first, fix second").
- **A4:** root cause located. Template literals are stored as **single `lit` ExprNodes with `litType: "template"`** (`expression-parser.ts:745-759`). `forEachIdentInExprNode` treats `lit` as a **leaf node** (`expression-parser.ts:1598-1604`: "Leaf nodes with no sub-expressions. Nothing to walk."). So `${ticket}` interpolations are part of opaque `raw` text — never visited. **Same gap affects all ExprNode walkers**, not just lin tracking (dep-graph, type narrowing, etc.). Two fix paths scoped: Option 1 surgical T2 (descend into template interpolations in walker), Option 2 structural T3 (represent template literals as structured ExprNode with `quasis: string[]` + `expressions: ExprNode[]`). Recommend Option 1.
- **A5:** root cause located in pre-investigation. Bug in `ast-builder.js:211 BARE_DECL_RE` + `liftBareDeclarations` recursing into markup children. Two fix options scoped (drop recursion vs `parentType` flag). Original intake recommended Option 1; Option 2 was the actual landing approach (Option 1 broke top-level-decls tests).

### 2.5 Pinned discussions (the open-question thread)

**`docs/pinned-discussions/w-program-001-warning-scope.md`** — W-PROGRAM-001 fires on 224/229 warn-only samples (~98%). Decision parked: option 1 (path-based suppression in `samples/compilation-tests/`) chosen as **working assumption for downstream audit reasoning**. **NOT compiler-change-authorized.** Live questions:
1. Convention question: is `samples/compilation-tests/` officially "fragment territory" or "should-be-runnable apps"?
2. Heuristic feasibility for Option 3 (detection-based) if preferred over path-based
3. Mass-migrate cost vs benefit (~224 file-touch alternative)
4. Cross-corpus: does same question apply to `gauntlet-*/` subdirs?
5. Coupling to lint scoping family (W-LINT-007 / W-LINT-013) — whatever scoping mechanism W-PROGRAM-001 uses may inform other lints

### 2.6 User-voice + cross-repo (the persistence thread)

- **`scrml-support/user-voice-scrmlTS.md`** created S42 (was missing — pa.md pointed at it but file didn't exist). Seeded with 2 retroactive S41 entries (kickstarter-must-be-right + Scope C authorization) + 4 S42 entries (W-PROGRAM-001 disposition, examples-as-source-of-truth, corpus-coverage clarification, push directive).
- No outbound notices sent in S42 beyond what S41 already sent. New notices may be appropriate now that kickstarter v1 ships and A5 fix changes `liftBareDeclarations` semantics — ASK USER at session start.

---

## 3. Standing rules in force (carried + updated)

- **Every dev dispatch that writes scrml MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md`** AND `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` in the briefing. v1 supersedes v0 (S42). v0 had 10 structural errors. v1 is fully verified against current spec + has compile-tested examples 15-22 to point at. **pa.md updated S42 to point at v1.**
- **Compiler-bug fixes go through `scrml-dev-pipeline`** with `isolation: "worktree"`, `model: "opus"`. Do not edit compiler source directly without express user authorization.
- **Commits to `main` only after explicit user authorization in this session.** Push only after explicit authorization. Authorization stands for the scope specified, not beyond. (S42 had this granted twice — once for cherry-pick of A5, once for cherry-pick of A1+A2.)
- **All agents on Opus 4.6** (`model: "opus"`).
- **Background dev dispatches** use `isolation: "worktree"` and follow the pa.md global incremental-commit + progress-report rule (at `docs/changes/<id>/progress.md`).
- **Bug L is reverted;** main is at the post-revert + S41-fixes baseline. Re-attempt requires widened scope (string + regex + template + comment in one pass). NOT live for S42; carried for future.

---

## 4. Carried queue (not Scope C, but live)

Order roughly by priority. Some items may have been touched by S42 work — flagged inline.

- **S42 follow-ups (top of queue):**
  - Dispatch A6 (T1) — `~{}` tilde-range exclusion. Cleans up ex 10's 8 leftover lints.
  - Dispatch A3 (T2) — component-def text+handler-child trigger. Restores match-with-lift component-per-state pattern. May allow ex 05 to revert to original match form (currently uses if-chain workaround).
  - Dispatch A4 (T2 surgical) — lin template-literal interpolation walk. May allow ex 19 to drop the `const consumed = ticket` workaround.
  - Push the 10 commits to origin (awaiting authorization).

- **Bug L re-attempt** (widened scope; depends on string/regex/template/comment unification). Carried from S41.
- **Self-host parity** (couples to Bug L). Carried.
- **Auth-middleware CSRF mint-on-403 (session-based path)** — STATE: **partially shipped per S42 audit.** `_scrml_fetch_with_csrf_retry` exists in `emit-client.ts:504`; mint-on-403 server bootstrap exists in `emit-server.ts:332,379,545` (per GITI-010 commit). The "session-based path deferred" referenced in S41's queue is the part that's STILL deferred. Worth scoping the remaining gap.
- **Phase 0 `^{}` audit continuation** (4 items). Carried from S41.
- **`scrml vendor add <url>` CLI** — called out in npm-myth article as a real adoption gap. Not yet started. Intake-able when prioritized.
- **Bun.SQL Phase 2.5** — async PA + real Postgres introspection at compile time. Phase 2 entry point in place; Phase 2.5 work remaining.
- **LSP follow-up:** `endLine`/`endCol` Span detached as standalone follow-up (mentioned S40 close, carried).
- **Strategic / non-coding:**
  - **Problem B (discoverability/SEO/naming).** Kickstarter solves Problem A (build path); Problem B is upstream and still unaddressed. S41 hand-off §2.7 strategic follow-up.
  - **Cross-repo: 6nz playground-four cosmetic reverts** (visibility flag — not scrmlTS-side work).
  - **`dist/` build pollution under `handOffs/incoming/dist/`** — still pending disposition, carried S40 → S42.

- **Stage 7 (Scope C) — re-run validation experiments against kickstarter v1.** S42 done with v1 publication; not yet validated empirically. Required before external publish.
- **Stage 8 (Scope C) — cross-model validation.** All current validation on Opus 4.7. Other model classes (GPT-4, Gemini, smaller) unverified.

---

## 5. State of examples corpus (the normative-content thread)

22 example files across 21 top-level + 1 multifile-dir. **All 22 compile.** Three have known pending-bug WARN states:

| File | Pending issue | Awaiting |
|---|---|---|
| `examples/05-multi-step-form.scrml` | Uses `if=`/`else-if=`/`else` chain workaround instead of canonical `match { .V => { lift <Comp> } }` | A3 fix — can revert to match-with-lift after |
| `examples/10-inline-tests.scrml` | 8 W-LINT-013 misfires inside `~{}` test bodies | A6 fix — will go to 0 lints |
| `examples/14-mario-state-machine.scrml` | 0 lints (post-A1+A2) | n/a — clean |
| `examples/18-state-authority.scrml` | 1 W-AUTH-001 (Tier 2 detection scaffold-only — §52.6.5) | C2 (scaffold landing in compiler) |
| `examples/19-lin-token.scrml` | Uses `const consumed = ticket` workaround for template-literal lin consumption | A4 fix — can drop workaround after |
| `examples/20-middleware.scrml` | Rephrased prose to avoid the A5 `function`-in-text trigger | A5 is fixed → could revert prose to original `<code>&lt;program&gt;</code>` style if desired, but not required |

**Examples 15-22 are NEW** (added S42 to fill Stage 1 critical coverage gaps):
- 15-channel-chat (§38)
- 16-remote-data (§13.5 RemoteData enum)
- 17-schema-migrations (§39 declarative `<schema>`)
- 18-state-authority (§52 Tier 2 `server @var` — scaffold)
- 19-lin-token (§35 linear types)
- 20-middleware (§40 `<program>` attrs + `handle()`)
- 21-navigation (§20 `navigate()` + `route`)
- 22-multifile/ (§21 cross-file `import`/`export` + pure-type files)

---

## 6. What this PA must believe (carried + updated from S41)

1. **Examples and docs are likely stale.** Don't trust them as canonical without spec cross-reference. (Carried from S41.)
2. **PA's memory is unreliable.** S41 async/await reveal proved this; S42 A3-hypothesis-revision proved it again (the original A3 cause hypothesis was wrong; bisection changed it). **Verify before stating.**
3. **The kickstarter is normative content. Wrong content propagates.** v1 is the verified shape; if a future v2 is needed, do another verification pass first.
4. **The LLM adoption funnel is the strategic priority.** S41 produced the highest-leverage finding (kickstarter ⇒ ~17-23× compile-probability lift). S42 published v1 against that finding. Stage 7 validation is the next empirical step.
5. **Two problems, not one.** Kickstarter solves Problem A (build path); Problem B (discoverability/SEO/naming) is upstream and unaddressed.
6. **NEW S42:** **examples are corpus-level source of truth, not per-feature demos.** Per-feature spec coverage is achieved through the union of examples, not 1:1 spec-section-to-example mapping. (Per user-voice §S42, "spec should be fully represented in the examples. not that there should be an example for each thing in the spec.")

---

## 7. What this PA must NOT do (carried from S41 + updated)

- DO NOT patch kickstarter v0 → v1 without first running Scope C inventory ✅ already DONE in S42.
- DO NOT trust validation agent reports as ground truth (the async/await false positive proves this).
- DO NOT add `await` to the auth recipe (the specific trap; v1 hardens against this in §2 auto-await).
- DO NOT re-attempt Bug L without scoping in regex + template + comment handling.
- DO NOT consider examples directory as ground truth until each file is verified against current spec — ✅ S42 verified all 22.
- **NEW S42:** DO NOT assume the original A3 hypothesis ("match-arm walker gap") is the real cause — bisection proved it wrong. The actual A3 trigger is component-def with `<wrapper>{text}+<elem with onclick=>` shape.
- **NEW S42:** DO NOT commit compiler source directly. All compiler changes go through `scrml-dev-pipeline` with worktree isolation.

---

## 8. Pinned discussions (deferred decisions)

**`docs/pinned-discussions/w-program-001-warning-scope.md`** — W-PROGRAM-001 fires on 224/229 warn-only samples (98%). User chose option 1 (path-based suppression in `samples/compilation-tests/`) as **working disposition for downstream audit reasoning**. NOT compiler-change-authorized. Pinned for deeper conversation later. Live questions there.

---

## 9. Findings tracker — the live state of "what we know is broken"

**`docs/audits/scope-c-findings-tracker.md`** — single source of truth. Stable IDs (A1-A6, B1-B3, C1-C3, D1-D10, E1-E2, F1-F3) for cross-reference. **Read this first** when picking up Scope C work. Update entries when something becomes an intake / lands a fix.

---

## 10. Files modified / added / committed in S42

This list is comprehensive — use it to understand what's actually changed if cherry-picking selectively or doing forensic review.

**S42 commits on main (in order):**
1. `bbbcc37` — `docs(scope-c): Stage 1+2 audits, findings tracker, intakes, pinned discussion`
2. `f7c2c10` — `examples(scope-c): Stage 3 — refresh stale + add 8 new for spec gaps`
3. `2a299c7` — `docs(s42): kickstarter v1, pa.md update, S41 hand-off rotated`
4. `284c21d` — `fix(fix-bare-decl-markup-text-lift): suppress BARE_DECL leak into markup prose` (A5 cherry-pick)
5. `a7d9705` — `docs(fix-bare-decl-markup-text-lift): finalize progress.md with tags+links` (A5 cherry-pick)
6. `9a07d07` — `fix(fix-w-lint-007/013): comment-range exclusion + W-LINT-013 equality lookahead` (A1+A2 cherry-pick)

**S42 doc additions (in audits/intakes/articles/pinned-discussions):**
- `docs/audits/scope-c-stage-1-2026-04-25.md`
- `docs/audits/scope-c-stage-1-sample-classification.md`
- `docs/audits/.scope-c-audit-data/` (8 files: scripts + classification.json + results.tsv)
- `docs/audits/kickstarter-v0-verification-matrix.md`
- `docs/audits/scope-c-findings-tracker.md`
- `docs/pinned-discussions/w-program-001-warning-scope.md`
- `docs/articles/llm-kickstarter-v1-2026-04-25.md`
- `docs/changes/fix-bare-decl-markup-text-lift/{intake.md,progress.md}` (A5)
- `docs/changes/fix-w-lint-007-comment-range-exclusion/{intake.md,progress.md}` (A2)
- `docs/changes/fix-w-lint-013-context-scope/{intake.md,progress.md}` (A1)
- `docs/changes/fix-w-lint-013-tilde-range-exclusion/intake.md` (A6 — pending dispatch)
- `docs/changes/fix-component-def-text-plus-handler-child/intake.md` (A3 — pending dispatch)
- `docs/changes/fix-lin-template-literal-interpolation-walk/intake.md` (A4 — pending dispatch)

**S42 source changes (compiler):**
- `compiler/src/ast-builder.js` — `liftBareDeclarations` now takes `parentType` flag (A5 fix)
- `compiler/src/lint-ghost-patterns.js` — added `buildCommentRanges`, threaded 4-arg skipIf, `(?!=)` regex tweak (A1+A2 fix)
- `compiler/tests/unit/bare-decl-markup-text-no-lift.test.js` — NEW (6 tests, A5)
- `compiler/tests/unit/lint-ghost-patterns-comment-exclusion.test.js` — NEW (5 tests, A2)
- `compiler/tests/unit/lint-w-lint-013-equality-no-misfire.test.js` — NEW (6 tests, A1)

**S42 example changes:**
- `examples/04-live-search.scrml` — header drift fix
- `examples/05-multi-step-form.scrml` — forward-ref fix via if-chain (E-COMPONENT-020 workaround for A3)
- `examples/06-kanban-board.scrml` — header inaccuracy fix
- `examples/07-admin-dashboard.scrml` — added `^{}` reflect() metaprog block
- `examples/08-chat.scrml` — converted to "message log" + defined `formatTime`
- `examples/12-snippets-slots.scrml` — `is some` instead of `not (... is not)`; added unnamed-children demo
- `examples/13-worker.scrml` — `is some` cleanup
- `examples/14-mario-state-machine.scrml` — onclick normalization
- `examples/15-channel-chat.scrml` — NEW (§38)
- `examples/16-remote-data.scrml` — NEW (§13.5)
- `examples/17-schema-migrations.scrml` — NEW (§39)
- `examples/18-state-authority.scrml` — NEW (§52 scaffold)
- `examples/19-lin-token.scrml` — NEW (§35)
- `examples/20-middleware.scrml` — NEW (§40)
- `examples/21-navigation.scrml` — NEW (§20)
- `examples/22-multifile/{app,components,types}.scrml` — NEW (§21)
- `examples/notes.db`, `examples/tasks.db` — NEW (compile-time schema introspection targets)
- `examples/README.md` — updated entry list 14 → 22

**S42 root-level docs:**
- `pa.md` — kickstarter brief pointer v0 → v1
- `master-list.md` — sample count fix (297 → 275 + ~509 fixtures), examples count 14 → 22, findings tracker reference
- `hand-off.md` — this file (S42 active state)
- `handOffs/hand-off-42.md` — S41 closed (rotated at S42 open)
- `scrml-support/user-voice-scrmlTS.md` — created S42, 2 retroactive S41 entries + 4 S42 entries

---

## 11. Recommended next-session opening sequence

When the next session starts:

1. Read `pa.md` (standard).
2. Read this hand-off in full (deliberate verbosity per S41 directive).
3. Read `docs/audits/scope-c-findings-tracker.md` (the live bug state).
4. Read the last ~10 contentful entries from `scrml-support/user-voice-scrmlTS.md` (per pa.md S42 directive).
5. Check `handOffs/incoming/` for new messages.
6. **Surface §1 open questions to user immediately** (push? next dispatch? cross-repo notices? Stage 4/5? `dist/` pollution?).
7. Don't begin work until user has answered §1 questions.

---

## 12. Session log (chronological)

- 2026-04-25 — S42 opened. Read pa.md, hand-off.md (S41 close). Rotated S41-closed file to `handOffs/hand-off-42.md`. Inbox empty of new messages (`dist/` pollution still pending). Surfaced open question (push S41 commits) and Scope C Stage 1 ordering for user confirmation.
- 2026-04-25 — Created `scrml-support/user-voice-scrmlTS.md` (was missing — pa.md pointed at it but file didn't exist). Seeded with two retroactive S41 strategic statements (kickstarter-must-be-right + Scope C authorization).
- 2026-04-25 — Scope C Stage 1 executed. Master-list count fixed (1.5). 14 examples read + compiled — 9 clean+canonical, 2 warn (compiler issues), 1 fail (ex 05 forward-ref), 2 stale-shape header drift. Background sample-classification agent ran 275 samples → 22/229/24 clean/warn/fail. Spec coverage matrix built — 23 covered, 14 weak, 17 gaps (8 critical for kickstarter v1). Three compiler intakes surfaced (W-LINT-013 misfire, W-LINT-007 comment-scan, ex05 E-COMPONENT-020). Outputs at `docs/audits/scope-c-stage-1-2026-04-25.md` + `docs/audits/scope-c-stage-1-sample-classification.md`.
- 2026-04-25 — User: "1 for now. I want to pin this issue for further discussion later" — re W-PROGRAM-001 disposition. Pinned at `docs/pinned-discussions/w-program-001-warning-scope.md`. User-voice updated.
- 2026-04-25 — User authorized "go" to Stage 2 (kickstarter v0 spec cross-reference matrix). Done. 22 confirmed correct, 10 confirmed wrong (3 CRITICAL + 5 HIGH + 2 LOW), 0 unverified after follow-up resolution. Output at `docs/audits/kickstarter-v0-verification-matrix.md`.
- 2026-04-25 — User authorized resolution of all 8 unverified claims before Stage 3. Done. 4 confirmed correct (auth=, scrml: imports, mint-on-403, CLI), 4 confirmed wrong (.debounced syntax, prop:Type form, protect= separator, @debouncedX phrasing).
- 2026-04-25 — Stage 3 executed. 5 polish refreshes (04, 06, 12, 13, 14) + 4 structural rewrites (05, 07, 08, 12). Ex 05 forward-ref fixed via if-chain (workaround for then-unknown A3 bug). 8 new examples for critical gaps (15 channel, 16 remote-data, 17 schema, 18 state-authority, 19 lin, 20 middleware, 21 navigation, 22-multifile/). 22/22 example files compile. README + master-list updated.
- 2026-04-25 — Findings tracker landed at `docs/audits/scope-c-findings-tracker.md` consolidating 20 bugs/anomalies. Stable IDs A1-A5/B1-B3/C1-C3/D1-D10/E1-E2/F1-F3.
- 2026-04-25 — Stage 6 executed: kickstarter v1 written from verified ground truth at `docs/articles/llm-kickstarter-v1-2026-04-25.md`. All 10 v0 errors corrected. Auto-await rule promoted to §2 (anchor against JS muscle memory). 8 recipes (auth, real-time, reactive, loading, schema, multi-page, middleware, lin) each cite a working example file. pa.md updated to point at v1.
- 2026-04-25 — Compiler bug investigations (§A1-§A5 in tracker). Found source locations + tier classifications. A5 reclassified T2/T3 → T1 after deep-dive located `liftBareDeclarations` markup-recursion bug in `ast-builder.js`. Three T1 intakes filed (A5, A2, A1).
- 2026-04-25 — User authorized dispatch + cherry-pick. Three S42 commits landed on main (`bbbcc37`/`f7c2c10`/`2a299c7`) covering audits/intakes, examples, and kickstarter v1+pa.md+hand-off. Then A5 fix cherry-picked from worktree (`284c21d`/`a7d9705`). Test suite: 7878 pass / 40 skip / 0 fail / 373 files. Bonus: `samples/compilation-tests/func-007-fn-params.scrml` fixed by A5 (same bug class). A1+A2 dispatch next.
- 2026-04-25 — A1+A2 combined pipeline returned. Cherry-picked to main (`9a07d07`). Test suite: 7889 pass / 40 skip / 0 fail / 375 files. Ex 14: 2 lints → 0 ✓. Ex 10: 14 → 8 (the 8 remaining are a NEW finding — `@var = N` single-`=` assignments inside `~{}` test bodies, anticipated by A1's intake §"Step 3 deferred"; filed as A6).
- 2026-04-25 — A3 + A4 deep-dives. **A3 hypothesis revised** — original "match-arm walker gap" was wrong (match nodes use `body` key which the walker DOES recurse into). Actual trigger: component-def with `<wrapper>{text}+<element with onclick=fn()>` shape fails to register. Verified via keyword sweep. **A4 root cause located** — template literals are stored as opaque `lit` ExprNodes; `forEachIdentInExprNode` treats lit as a leaf, never visits `${...}` interpolations. Three intakes filed: A6 (T1, tilde-range exclusion), A3 (T2, parser trace deferred to dispatch), A4 (T2 surgical / T3 structural).
- 2026-04-25 — Findings tracker: 3 fixed, 3 intake-filed and ready to dispatch. Hand-off rewritten with full S42 thread inventory per user directive ("im fine with bloat in the hand off to give the full picture. we are curently nested deed on many threads").

---

## Tags
#session-42 #active-or-just-closed #scope-c-audit-stages-1-2-3-6-done #compiler-bugs-3-fixed-3-intaked #kickstarter-v1-published #push-pending #ten-commits-ahead-origin

## Links
- [handOffs/hand-off-42.md](./handOffs/hand-off-42.md) — S41 closed, comprehensive Scope C plan
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/articles/llm-kickstarter-v1-2026-04-25.md](./docs/articles/llm-kickstarter-v1-2026-04-25.md) — v1, verified
- [docs/articles/llm-kickstarter-v0-2026-04-25.md](./docs/articles/llm-kickstarter-v0-2026-04-25.md) — v0, archive only (superseded — has 10 known errors)
- [docs/audits/scope-c-findings-tracker.md](./docs/audits/scope-c-findings-tracker.md) — **READ FIRST**
- [docs/audits/scope-c-stage-1-2026-04-25.md](./docs/audits/scope-c-stage-1-2026-04-25.md)
- [docs/audits/scope-c-stage-1-sample-classification.md](./docs/audits/scope-c-stage-1-sample-classification.md)
- [docs/audits/kickstarter-v0-verification-matrix.md](./docs/audits/kickstarter-v0-verification-matrix.md)
- [docs/pinned-discussions/w-program-001-warning-scope.md](./docs/pinned-discussions/w-program-001-warning-scope.md)
- [docs/changes/fix-w-lint-013-tilde-range-exclusion/intake.md](./docs/changes/fix-w-lint-013-tilde-range-exclusion/intake.md) — A6 next
- [docs/changes/fix-component-def-text-plus-handler-child/intake.md](./docs/changes/fix-component-def-text-plus-handler-child/intake.md) — A3 needs trace
- [docs/changes/fix-lin-template-literal-interpolation-walk/intake.md](./docs/changes/fix-lin-template-literal-interpolation-walk/intake.md) — A4 surgical recommended
- [docs/experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md](./docs/experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md)
- [docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md](./docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md)
