# scrmlTS — Session 35 Wrap

**Date opened:** 2026-04-20
**Date closed:** 2026-04-20 (single-day session)
**Previous:** `handOffs/hand-off-35.md` (S34 wrap — 9 commits, 11 adopter bugs fixed)
**Baseline entering S35:** 7,373 pass / 40 skip / 2 fail / 338 files at `d23fd54`.
**Final at S35 close:** **7,384 pass / 40 skip / 2 fail / 339 files** at `3f8d88c`. Push requested via master inbox.

---

## 0. Close state

### S35 commits — 4 commits in scrmlTS + 1 in scrml-support, all awaiting push via master

#### scrmlTS (`d23fd54..3f8d88c`)

| Commit | Summary |
|---|---|
| `3f79d71` | fix(parser): coalesce consecutive text tokens in lift markup (GITI-008) |
| `b8f3b51` | fix(tokenizer): descendant combinator selector recognition (GITI-007) |
| `fd51d70` | refactor(codegen): require boundary in EmitLogicOpts (B2) |
| `8c64a98` | feat(codegen): per-file WinterCG fetch handler + aggregate routes |
| `3f8d88c` | refactor(codegen): remove 3 dead rewriteExpr imports (C-arc step 1) |

#### scrml-support (`ebf3164..c91d466`)

| Commit | Summary |
|---|---|
| `c91d466` | design-insights: insight 22 — server-mount scaffolding (S35 scrmlTS) |

Push request: `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-1905-scrmlTS-to-master-push-s35-bug-fixes-plus-server-mount.md`.

### Outbound messages

- `giti/handOffs/incoming/2026-04-20-1900-scrmlTS-to-giti-s35-bugs-plus-mount-verdict.md` — per-bug summaries (GITI-007 + GITI-008), Q1-Q4 mount verdict, fetch-ready composition note, re-verify + try-composition asks.

### Incoming archived

- `read/2026-04-20-1604-giti-to-scrmlTS-server-mounting-design.md`
- `read/2026-04-20-1614-giti-to-scrmlTS-two-new-bugs-from-status-scrml.md`

### Unread at wrap — QUEUED FOR S36

- `handOffs/incoming/2026-04-20-1624-6nz-to-scrmlTS-fn-decl-body-dropped.md` — **Bug G**: `fn name() -> T { body }` with return-type annotation + match body emits orphan `-> string {` at module scope, fails `node --check`. 6nz-confirmed idiomatic grammar (matches `examples/14-mario-state-machine.scrml`). Easy workaround for 6nz (use `function` instead of `fn`), so not blocking. S36 triage target.

Note: 6nz also sent `read/2026-04-20-1609-6nz-to-scrmlTS-all-6-bugs-verified.md` — S34 fixes all verified green. Giti verification: `read/2026-04-20-1558-giti-to-scrmlTS-bugs-verified-all-pass.md`.

### Uncommitted at wrap

- `docs/SEO-LAUNCH.md` — still uncommitted, **13 sessions running**. Unchanged.
- `hand-off.md` — this file.

---

## 1. Session theme — "verify-before-fix + refactor-deep-dive + obvious wins"

Three user directives shaped S35:

1. **Verify-before-fix posture.** "These other PA's have clearly demonstrated they don't fully understand the language." New standing rule — no fix without spec-backed bug confirmation. Surfaced when I jumped straight to fixing GITI-008 without verifying. Triggered a full revert + §10 spec read before re-applying.

2. **Refactor-deep-dive pre-empt.** "Just a couple bug fixes have added 10,000 LOC" — user's rough sense of S34's growth (actual: +954 src LOC for 9 bugs, ~110 LOC/bug). Triggered dispatching scrml-deep-dive in parallel with the server-mount debate.

3. **Obvious-wins distillation.** User wanted clarity through the noise. Four obvious wins identified: both spec-confirmed bug fixes, B2 alone from DD verdict (no debate needed), per-file fetch() emission from debate verdict. Sequenced as one session.

---

## 2. Session log — arc by arc

### Arc 1 — Session open + inbox surface

**User:** `read pa.md and start session`

Rotated S34 wrap → `handOffs/hand-off-35.md`. Fresh `hand-off.md`. Two unread messages at open: both from giti.

- `2026-04-20-1604-giti-to-scrmlTS-server-mounting-design.md` — design consultation, 4 questions, giti ranks A ≈ C > D > B, "no rush"
- `2026-04-20-1614-giti-to-scrmlTS-two-new-bugs-from-status-scrml.md` — S34 5 bugs all confirmed fixed; 2 new: GITI-008 (lift whitespace, blocking) + GITI-007 (CSS bare-tag, cosmetic)

### Arc 2 — Parallel dispatch decision

**User:** "we can work on those while the debate is running."

Dispatched debate-curator in background for server-mount debate. Started reproducing GITI-008 + localizing root cause in `parseLiftTag`. Jumped to fix without verifying via spec.

### Arc 3 — Verify-before-fix correction

**User:** "these other pa s have clearly demonstrated they dont fully understand the language. lets fully varify that every reported bug is actually a bug"

Halted forward motion. Reverted the ast-builder.js edit (git diff clean). Switched to spec-verification mode:
- GITI-007: §9.2 — CSS block content is "CSS with scrml variable syntax." Bare descendant combinators are standard CSS. **Real bug confirmed.**
- GITI-008: §10 read through §10.5 at this point. Static-path preserves whitespace; spec imposes no divergent lift-text semantics. Divergence IS the bug. §10.6–10.8 not yet read.

### Arc 4 — Refactor-deep-dive dispatch

**User:** "I have some concern that just a couple bug fixes have added 10,000 loc to the code base. we might be looking at a refactor deep-dive soon."

Checked actual LOC: S34 +4,799 / −1,044 total, +954 src LOC / 9 bugs, +2,169 tests. Number was rough but the per-bug density IS a refactor signal. Mangler regex needing lookbehinds, threading declaredNames through control flow, post-emit rewrite passes — all seam indicators.

**User:** "I think D" (option D from a menu: dispatch refactor-deep-dive NOW in parallel with debate, pause all fixes until verdict).

Dispatched scrml-deep-dive in background. Both agents now running. All fixes paused.

### Arc 5 — Debate-curator failure + damage recovery

Debate-curator background agent stalled 600s after attempting to append insight 22 to `scrml-support/design-insights.md`. The append step truncated the file from 760 lines to 24 — an empty `Write` with only the new content, no read-merge. Recovered via `git checkout design-insights.md`. The 117-line insight 22 draft survived in `design-insights.md.append-22.tmp` (the curator's staging file).

### Arc 6 — Deep-dive verdict + obvious-wins distillation

**Deep-dive output** at `scrml-support/docs/deep-dives/DD-codegen-seams-2026-04-20.md` (519 lines). Key findings:

- All 5 user-hypothesized seams confirmed with citations.
- Buried prior deep-dive from 2026-04-11 (`expression-ast-phase-0-design`) laid out a 5-phase migration from string-based to AST-based codegen. Phases 1, 2, 3a done; Phase 3 ~50% complete. 94 call sites of `rewriteExpr`/`rewriteServerExpr` across 11 files.
- 5 of 7 newly-crystallized seam markers are from S34 alone — seams accelerating, not stable.
- 982 test assertions key on runtime API names, not internal structure. Refactor-pinning risk lower than feared.

**Ranked recommendation:**
- **Now:** B1+B2+B3 (2.5–3.5 sessions) — unify `EmitOpts`, require `boundary` with exhaustive check, add effect annotations.
- **Scheduled:** Option C (4–6 + 1–2 sessions) — finish Phase 3→4, design pre-existing in 2026-04-11 DD.
- **Eliminated:** Option D (full rewrite) — 2026-04-02 audit already ran this debate.

**Phase 5 feed-forward:**
- Debate-worthy (1 sub-question): execute B1+B2+B3 now vs defer for adopter bugs.
- Implementation-ready now: B2 alone (0.5 session).
- Scheduled: Option C.

### Arc 7 — User asks for obvious wins

**User:** "this is alot to process. What are the obvious wins?"

Distilled 4 obvious wins, ranked by payoff/cost:
1. Fix GITI-008 + GITI-007 (both spec-confirmed, localized).
2. B2 alone (DD-greenlit, 0.5 session).
3. Accept insight 22 + ship per-file `fetch(request)` emission (debate Q2+Q3 verdict).
4. Actively do nothing on CSRF middleware (Q4 Move 1 — rejects scope creep).

Pitched holding off on: B1+B3 refactor arc, Move 2 of Q4, `scrml-server` package, refactor-now-vs-defer debate.

**User:** "looks good lets go"

### Arc 8 — Sequenced execution (one session)

Six steps completed in order:

**Step 1 — Verify GITI-008 via §10.6-10.8.** Read; no divergent text semantics for lift markup in spec. Bug confirmed real. Static/lift divergence is itself a bug.

**Step 2a — GITI-008 fix** (`3f79d71`). Re-applied the `parseLiftTag` coalesce fix (~20 LOC) in `ast-builder.js`. +3 tests in `lift-approach-c.test.js §10`. Zero regressions.

**Step 2b — GITI-007 fix** (`b8f3b51`). Root at `tokenizer.ts:1032` — descendant-combinator case (`ident + ws + ident-start` before `{`) had no disambiguator. Added `isDescendantCombinator` + `hasBraceBeforeSemiOrRbrace` lookahead (mirrors existing `colonIntroducesSelector`). +3 tests in `css-program-scope.test.js`. Zero regressions.

**Step 3 — B2** (`fd51d70`). Made `boundary: "server" | "client"` required in `EmitLogicOpts` interface. Added runtime default with one-time warning for stray callers. Added exhaustive `never` guard at the lift-expr boundary branch. Fixed 3 silent `emitLogicNode()` sites in `emit-server.ts` (lines 313, 351, 438) that were dropping `boundary: "server"` — latent GITI-004-shape leaks in middleware handle() + middleware body + SSE generator body. Zero regressions.

**Step 4 — Per-file `fetch(request)` emission** (`8c64a98`). Added post-emission pass in `generateServerJs` that scans emitted `export const <name> = { path:, method:, handler: }` exports, then appends `export const routes = [...]` + `export async function fetch(request) { ... }`. Returns `Response | null` for composition seam. Valid ES module (`node --check` passes). Zero behavior change for existing handlers. +5 tests in `server-client-boundary.test.js §6`. No-server-fn files emit no aggregate block (negative control).

**Step 5 — Append insight 22** (`c91d466` in scrml-support). Read 117-line tmp content, appended to `design-insights.md` (760 → 877 lines). Removed `.tmp`.

**Step 6 — Reply to giti + push request + archive**. Giti reply dropped with per-bug summaries + Q1-Q4 verdicts + one-line composition example. Push request sent to master inbox. Both S35 giti inbounds archived to `read/`.

### Arc 9 — Missed 6nz Bug G

Listing `handOffs/incoming/` after the archive step revealed `2026-04-20-1624-6nz-to-scrmlTS-fn-decl-body-dropped.md` — a new 6nz bug report that arrived 16:24, 10 minutes after the giti S35 inbounds. I missed it at session open (listed only the two giti messages). The message describes Bug G (`fn name() -> T { body }` dropping the body and emitting orphan syntax), confirms all 6 S34 bugs verified, and includes an easy `function` workaround. Queued for S36. Not fixed this session per the verify-before-fix rule.

---

## 3. Files changed this session

### Source

| File | Commit | Purpose |
|---|---|---|
| `compiler/src/ast-builder.js` | `3f79d71` | parseLiftTag coalesces consecutive text tokens |
| `compiler/src/tokenizer.ts` | `b8f3b51` | descendant combinator selector recognition + hasBraceBeforeSemiOrRbrace helper |
| `compiler/src/codegen/emit-logic.ts` | `fd51d70` | EmitLogicOpts.boundary required + _ensureBoundary warning shim + exhaustive never guard |
| `compiler/src/codegen/emit-server.ts` | `fd51d70` | 3 sites pass `boundary: "server"` |
| `compiler/src/codegen/emit-server.ts` | `8c64a98` | per-file routes aggregate + WinterCG fetch handler post-emit |

### Tests

| File | Commit | Purpose |
|---|---|---|
| `compiler/tests/unit/lift-approach-c.test.js` | `3f79d71` | +3 GITI-008 tests |
| `compiler/tests/unit/css-program-scope.test.js` | `b8f3b51` | +3 GITI-007 tests |
| `compiler/tests/unit/server-client-boundary.test.js` | `8c64a98` | +5 server-mount fetch tests |

Total new tests: 11 across 3 existing files.

### scrml-support

| File | Commit | Purpose |
|---|---|---|
| `design-insights.md` | `c91d466` | insight 22 (server-mount verdict) |

---

## 4. Test suite health

| Snapshot | Pass | Skip | Fail | Files |
|---|---|---|---|---|
| Entering S35 (`d23fd54`) | 7,373 | 40 | 2 | 338 |
| After GITI-008 (`3f79d71`) | 7,376 | 40 | 2 | 338 |
| After GITI-007 (`b8f3b51`) | 7,379 | 40 | 2 | 338 |
| After B2 (`fd51d70`) | 7,379 | 40 | 2 | 338 |
| **Close (`8c64a98`)** | **7,384** | **40** | **2** | **339** |

Zero regressions at every commit. Pre-existing fails unchanged.

---

## 5. Non-compliance (current state)

Carried:
- `master-list.md` header **12 sessions stale** (S23 baseline). S33/S34 wraps flagged; not refreshed.
- `docs/SEO-LAUNCH.md` uncommitted **13 sessions**. Ask user once, close.
- `benchmarks/fullstack-react/CLAUDE.md` — out-of-place agent tooling.
- §48.9 prose stale under §33.6.
- NC-3 (S33): §54.6 Phase 4h return-type-narrow-fit code assignment gap.

Fresh this session:
- **NC-4 (S35)** — `_ensureBoundary` runtime warning fires in tests for client-side call sites that don't pass boundary. Informational only (defaults to "client"), but a reminder that S35 B2 was the minimal delivery. B1+B3 refactor arc, when dispatched, should thread `boundary` through the remaining entry points so the warning path can be removed.

Resolved this session:
- **NC-5 (S34-open)** — both giti S35 bugs fixed + shipped.

---

## 6. Design-insights ledger

- **Insight 22** appended this session: server-mount scaffolding (Hono-WinterCG won 114/140; per-file `fetch(request): Response | null` + aggregate `routes`; `scrml-server` package deferred; CSRF inlining retained Move 1). Lines 761-877 of `scrml-support/design-insights.md`.

Insight 21 (§54 + pure modifier + state-local transitions) unchanged at lines 632-760.

---

## 7. User memory touched this session

All existing memories honored:

- `feedback_verify_compilation` — every fix verified with `node --check` before committing; every commit ran full test suite.
- `feedback_user_voice` — appending to `user-voice-scrmlTS.md` this wrap (not deferred).
- `feedback_push_protocol` — no direct push; `needs: push` message sent to master.
- `feedback_batch_size` — 4 focused commits, one per concern.
- `feedback_agent_model` — both background agents dispatched with `model: "opus"`.
- `feedback_persist_plans` — sequenced plan surfaced to user before execution; hand-off §2 arcs written contemporaneous with work.
- `user_truck_driver` — session stayed efficient. Terse user directives ("I think D", "looks good lets go", "What are the obvious wins?") minimized wasted context.
- `feedback_language_cohesion` — fetch handler uses the same `Response | null` convention already familiar from other WinterCG code; new helper (`hasBraceBeforeSemiOrRbrace`) mirrors the existing `colonIntroducesSelector` shape; the `never` guard is a standard TypeScript pattern.
- `project_public_pivot` — every S35 deliverable was adopter-unblocking: GITI-007 + GITI-008 unblock giti's `status.scrml` (536 LOC), server-mount turns integration into one line, B2 prevents future GITI-004-shape regressions.
- `project_lin_redesign` — untouched this session.

No new memories written.

New meta-signal this session (worth remembering):
- **Verify-before-fix is now a standing rule for adopter bug reports.** Other PAs write scrml code that can itself be wrong; the compiler-side fix should only land after spec verification. Applies to GITI-007, GITI-008 (both verified this session) AND to Bug G (queued for S36 under the same rule).

---

## 8. Next PA priorities — ordered

### 8.1 Probably-top — Bug G (6nz)

Message: `handOffs/incoming/2026-04-20-1624-6nz-to-scrmlTS-fn-decl-body-dropped.md`

Source: `fn colorName(c: Color) -> string { match c { ... } }` drops the body, emits `-> string {` at module top, fails `node --check`.

Verification step required first: does `fn name(p: T) -> ReturnType { match-expr-body }` produce valid JS for `examples/14-mario-state-machine.scrml`? If yes, shape-specific bug. If no, broader problem. Check `examples/14-mario-state-machine.scrml` — 6nz's claim is the shape is idiomatic.

Workaround for 6nz is cheap (`function` instead of `fn`), so not blocking.

### 8.2 Await giti S35 verify

S35 giti reply asks giti to (1) re-verify GITI-007 + GITI-008 on `ui/status.scrml`, (2) try the `scrml(req) ?? myApi(req)` composition pattern. Expect one inbound message at S36 open with per-bug pass/fail and composition feedback.

### 8.3 B1 + B3 refactor arc (DD-flagged, NOT yet dispatched)

Per `DD-codegen-seams-2026-04-20.md` Phase 5, ONE sub-question is debate-worthy: execute B1+B2+B3 now as 2.5–3.5-session refactor arc, or defer entirely and spend budget on adopter bugs under Option A? B2 is now done (shipped this session), so the scoped debate is about B1+B3 alone.

If dispatching: candidate experts per DD are `scrml-dev-cs-phd` + `rust-traits` (refactor-now) vs `scrml-dev-rails` + `scrml-dev-go` (defer). Staging via master.

### 8.4 Option C (STARTED — step 1 shipped this session, S36 picks up step 2)

Finish Phase 3→4 of the pre-existing AST-based codegen migration (`scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md`). 4–6 + 1–2 sessions total.

**S35 step 1 (`3f8d88c`):** Removed 3 dead `rewriteExpr` imports from `scheduling.ts`, `emit-reactive-wiring.ts`, `emit-server.ts`. Zero behavior change. Cuts import surface from 11 files → 8.

**S36 step 2 (PRE-SCOPED):** First real emit-logic.ts call-site migration. Pre-existing `emitExprField(exprNode, str, ctx)` bridge handles fallback automatically. Approach:
1. Pick a self-contained semantic cluster in `emit-logic.ts` (candidate: `tilde-decl` case, ~3 sites at lines 429, 431, 477).
2. Replace each `rewriteExpr(stringField)` with `emitExprField(node.exprNodeField, stringField, ctx)`.
3. Find the parallel ExprNode field name in `ast-builder.js` (e.g., `node.init` ↔ `node.initExpr`, `node.expr` ↔ `node.exprNode`).
4. Run full suite. Invariant: char-identical JS output (already enforced by existing 7,384 tests).
5. Commit. Repeat for next cluster.

**Remaining migration scope (after S35 step 1):**
- `emit-logic.ts`: 22 callsites (primary)
- `rewrite.ts`: 16 (the rewrite module itself; can stay until Phase 4)
- `emit-lift.js`: 12
- `emit-control-flow.ts`: 11
- `emit-machines.ts`: 6
- `emit-event-wiring.ts`: 6

Per DD: per-emitter migration order is emit-logic → emit-control-flow → emit-functions → emit-server → emit-event-wiring → emit-html → remaining.

### 8.5 Non-compliance cleanup (unchanged from S34 §8.5)

1. `master-list.md` refresh (12 sessions stale).
2. NC-3 spec decision (§54.6 code assignment) — unblocks Phase 4h.
3. `docs/SEO-LAUNCH.md` — ask, close.
4. `benchmarks/fullstack-react/CLAUDE.md` — move or delete.
5. §48.9 cleanup — fold into any future SPEC-touching commit.

### 8.6 `_ensureBoundary` warning removal

When B1+B3 ships (threading `boundary` through all entry points), the `_ensureBoundary` warning shim in `emit-logic.ts` becomes unnecessary. Remove at that time.

### 8.7 F8 / F9 adopter polish (unchanged)

Scaffold `package.json` + `README.md` + inline orientation comments. Cheap side-quests between arcs.

---

## 9. Agents + artifacts reference

### Background agents dispatched this session

1. **debate-curator** — server-mount scaffolding 4-expert debate. **STALLED + failed** 600s into the file-write step (truncated `design-insights.md` from 760 → 24 lines; recovered via git). Content survived in `.tmp`; insight 22 recovered and committed manually. Lesson: debate-curator's internal append-to-canonical-file path has a bug where it writes-without-read-prepend.

2. **scrml-deep-dive** — codegen-seams refactor DD. **COMPLETED.** Output at `scrml-support/docs/deep-dives/DD-codegen-seams-2026-04-20.md` (519 lines).

### Repro corpus

- `/tmp/s35-repros/` — GITI-007 + GITI-008 repros + compiled outputs. Also one server-fn-test.scrml for fetch emission verification.

### Test artifacts

- `compiler/tests/unit/lift-approach-c.test.js §10` (GITI-008)
- `compiler/tests/unit/css-program-scope.test.js` (GITI-007)
- `compiler/tests/unit/server-client-boundary.test.js §6` (server-mount emission)

### Spec (no changes this session)

- `compiler/SPEC.md` — 20,439 lines, 54 sections.
- `compiler/SPEC-INDEX.md` — unchanged from S33 open.

### Design-insights ledger

- `scrml-support/design-insights.md` — 22 insights, 877 lines.

### Deep-dive corpus (updated)

- `scrml-support/docs/deep-dives/DD-codegen-seams-2026-04-20.md` — NEW.
- `scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md` — referenced by DD, pre-existing.

### Live touch-point map

- `.claude/maps/PHASE-4-TOUCH-POINTS.md` — S33 artifact, not refreshed (S35 was adopter-bug + server-mount-scoped, different surface).

### Primary agents used

None this session besides the two background dispatches above. All direct PA work for the 6 deliverables.

---

## 10. Session-close protocol executed

User directives: "I think D" (refactor-DD in parallel) → "this is alot to process" → "looks good lets go" → (6 steps executed).

- **1 (verify)**: §10.6-10.8 read; GITI-008 confirmed; §9.2 had already confirmed GITI-007.
- **2 (fix)**: GITI-008 + GITI-007 committed with tests, zero regressions each.
- **3 (B2)**: Boundary required + exhaustive check + 3 silent-server-site fixes.
- **4 (feature)**: Per-file `fetch(request)` + `routes` aggregate emission.
- **5 (insight)**: Insight 22 appended to scrml-support.
- **6 (reply + push + archive)**: Giti reply dropped, push request to master inbox, both S35 inbounds archived.

Bonus at wrap: surfaced missed 6nz Bug G for S36 queue.

---

## 11. Summary for the next PA — one paragraph

S35 closed six obvious wins in one session against a "verify-before-fix" standing rule: two spec-confirmed adopter bug fixes (GITI-008 lift-branch text whitespace coalescing in parseLiftTag; GITI-007 CSS descendant-combinator recognition via ident+ws+ident-start lookahead), one DD-greenlit refactor increment (B2: `EmitLogicOpts.boundary` required + exhaustive `never` guard + 3 silent server-site fixes), and one new feature from the server-mount debate verdict (per-file `export async function fetch(request): Response | null` + aggregate `export const routes` enabling adopter composition via `scrml(req) ?? myApi(req)`). Four scrmlTS commits plus one scrml-support insight 22 commit, all awaiting master push. Suite 7,373 → 7,384 / 40 / 2 with zero regressions at every commit; 11 new tests across 3 existing files. One debate-curator background agent failed mid-file-write (truncated `design-insights.md` — recovered via git; content preserved from the curator's .tmp staging file and appended manually). One scrml-deep-dive background agent succeeded (519-line DD at `scrml-support/docs/deep-dives/DD-codegen-seams-2026-04-20.md` with ranked recommendation B1+B2+B3 now / Option C scheduled / Option D eliminated; Phase 5 flagged B1+B3 as debate-worthy). One 6nz inbound arrived mid-session (Bug G — `fn name() -> T { match body }` emits orphan `-> string {` at module scope) and was missed at the open; queued for S36 under the same verify-before-fix rule. Next session opens on Bug G triage + expected giti re-verify reply + B1+B3 debate-vs-defer decision.
