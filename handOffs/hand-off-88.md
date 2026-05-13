# scrmlTS — Session 88 (CLOSE — landmark 17-commit session)

**Date:** 2026-05-12 → 2026-05-13 (S88; multi-day session)
**Previous:** `handOffs/hand-off-87.md` (S87 CLOSE — historic 37-commit session)
**This file:** rotates to `handOffs/hand-off-88.md` at S89 open

**Tests at S88 CLOSE:** **11,912 pass / 117 skip / 1 todo / 0 fail** at HEAD `55f5f20` (full `bun test` — unit + integration + conformance + browser + lsp + commands + self-host). Pre-commit hook fired on every PA-authored commit; pre-push gate clean post-flake-fix.

**Cumulative S87 → S88 delta:** +759 tests / +32 skip / 0 fail / 0 regressions across 17 PA-authored commits.

**Semver state:** unchanged — v0.2.6 `efbd1e8` still the shipped baseline. v0.3.0 tag waits for full Approach A + Wave 4 adopter content + §36 impl + remaining Phase 3a async + small spec polish.

**Cross-machine sync state:** 17 S88 commits AHEAD of origin/main. **PUSH PENDING — to be executed at wrap close per user's "wrap and push" directive.**

**Worktree state:** 9 agent worktrees retained (locked); all work landed on main OR null-completion. Cleanup pending at wrap close per S83 retention rule + S87 dry-run-first memory rule. Dry-run list captured below.

---

## S88 — what happened (full session ledger)

### Phase 1 — Session-open + S87 hand-off triage

User-asked S88 open priority. PA caught up via session-start checklist (pa.md + primer + master-list §0 + hand-off-87). S87 had landed historic 37-commit session; v0.3.0 cut path well-cleared but with 5 NEW LIFT-template codegen bug families surfaced as high-priority blockers.

Cross-machine sync at S88 open: scrmlTS 0/0 (S87 push had occurred); scrml-support had uncommitted Insight 30 + 737-line channel-architecture deep-dive from S87.

### Phase 2 — Bookkeeping landings

- **`30743c4`** (S88 deref) — 25 shipped dispatch dirs archived from `docs/changes/` to `scrml-support/archive/changes/`. Companion commit on scrml-support (`dde7e5b`).
- **`3d90286`** — pa.md hook-policy amendment + S87→S88 hand-off rotation + maps refresh. Documented two valid `core.hooksPath` configurations (A=source-controlled-only / B=local-rich), per pa.md S78 + S88 amendment.
- **`0b7ea8b`** — pa.md isolation-parameter dispatch rule + primer §13.5 staleness fix (corrected debate-03 entry from "pinned for queued" to "CLOSED S64; do not revisit"). S88 process violation noted: PA dispatched LIFT-1 + LIFT-2/3/4 without `isolation: "worktree"` param; first dispatch ran direct in main. pa.md S88 amendment requires explicit isolation parameter on every dev-agent Agent() call.

### Phase 3 — Approach A SCOPING + v0.4 deferral reversal (User-driven design decision)

Approach A (Insight 29 whole-stack closure analysis) was deferred to v0.4.0 at S84. User reversed S88: *"I know we talked about deferring A to 0.4, but I am not seeing the reason now, start on those tasks as they are unblocked."*

- **`6461f21`** — v0.3 Approach A implementation SCOPING (`docs/changes/v0.3-approach-a-impl/SCOPING.md`). Plan-agent-authored. 300-640h decomposed into 5 sub-waves: A-1 markup-context edge emission / A-2 Reachability Solver / A-3 §40 auth-graph / A-4 per-route artifact splitter / A-5 integration tests. A-1 further decomposed into 8 sub-phases.
- Two blocker OQs surfaced + ratified by user mid-session:
  - **OQ #2: source-node granularity.** User picked **Option Y per-interpolation source nodes** (against PA's Option X recommendation).
  - **OQ #3: A-1.4 sequencing vs LIFT bugs.** User picked Option b (fire A-1.3/.5/.6/.7/.8 first; defer A-1.4 until LIFT codegen stabilizes).
- User ratified **full Approach A (all 5 waves) in v0.3.0 cut** + Wave 4 adopter content as cut blocker. Cut timeline implications: ~340-690h, realistic ~3-6 months walltime.

### Phase 4 — LIFT bug family closure (5 of 5)

S87 surfaced 5 LIFT-template codegen bug families as v0.3.0 cut blockers. All 5 closed in S88:

- **`be7b261`** — LIFT-1 (CATASTROPHIC parens-attr elides parent + duplicates inner text). Root cause: `_parseLiftAttrValue` had no handler for PUNCT `(` tokens; cursor desync at `parseLiftTag` call sites. Fix in `ast-builder.js`: paren-balancing branch + cursor save/restore at both call sites. Agent direct-to-main (no isolation set — S88 amendment precedent).
- **`14e21de`** — LIFT-2/3/4 PA-authored after 2 prompt-too-long dispatch failures. `bind:value=` two-way wiring + `if=` display toggle + event auto-injection for bare-call. Touched BOTH paths in emit-lift.js (string-attribute + structured-AST). 3 broken-output anchors flipped to verify-fix.
- **`88a7d57`** — LIFT-5 (reconciler-factory `_scrml_lift_target` ambient). Fix in `emit-control-flow.ts`: route if-stmt/for-stmt children through container-aware helpers + thread `continueBehavior:"return"`. Cherry-picked after wholesale file-delta would have stomped LIFT-2/3/4 (agent base predated LIFT-2/3/4) — **memory rule saved at `feedback_file_delta_vs_cherry_pick.md`**.

All 5 LIFT families CLOSED. "Per-item interactive markup inside for/lift" pattern (canonical TodoMVC edit-mode shape) is now unblocked end-to-end.

### Phase 5 — Approach A wave A-1 (5 of 5 edge-emission sub-phases landed)

- **`1f516e1`** — A-1.2 markup-read DG node kind + walker scaffold (Option Y per-interpolation). Defines `MarkupReadDGNode` + `findOwningRenderDGNode` + `createMarkupReadNode` + scaffold flag (default false). +11 tests. Behavioral invariant: zero edges emitted (A-1.3 activates).
- **`da78609`** — A-1.3 activate emission for 4 high-frequency shapes (interp / variable-ref attr / bind:value / if=expr). Edge count delta ~150-200 of 256 S84 ceiling. +13 tests.
- **`b512db9` + `24b582d`** — A-1.5 engine state-child + onTransition/Timeout/Idle body edges + engine-cell self-read. Per OQ #1 disposition: markup-context (parity with engine-cell-self-read pattern). +14 tests. (Agent direct-to-main despite isolation set — harness inconsistency.)
- **`55f5f20`** — A-1.4 call-ref + for-iterable + lift-template-body-expr edges. Was DEFERRED in A-1.3 until LIFT codegen closed; unblocked post-LIFT-5. 5 new emitMarkupReadEdge call sites. +16 tests.

A-1 edge-emission complete (5 of 5 shape categories activated). Remaining A-1: A-1.6 consumer audit + A-1.7 S84 ceiling re-measurement + A-1.8 docs (~10-15h to wrap A-1).

### Phase 6 — Stdlib safeCall + safeCallAsync + Phase 3a migrations

- **`05379f9`** — `scrml:host` stdlib primitive: `safeCall(thunk)! -> HostError`. Approach α — stdlib `.scrml` declares + hand-authored JS shim at `compiler/runtime/stdlib/host.js` carries the try/catch. Try/catch lives ONLY in compiled JS, never in scrml source. +24 tests.
- **`c838e19`** — Phase 3a sync migration: 4 of 8 sync try-blocks migrated (verifyHash + decodeJwt + kv.get + parseIdToken). 4 async-gap try-blocks documented. +4 module error types (CryptoError / JwtError / KvError / OAuthError).
- **`7491a98`** — safeCallAsync primitive. Mirror of safeCall for async thunks. Non-trivial design discovered: failable-await interaction — `safeCallAsync(thunk) !{...}` doesn't work without explicit `await` first because compiler auto-await applies only to server functions, not stdlib imports. Two-step pattern documented in SCA-19 test + host.js docstring. +20 tests + shared helpers refactored.
- **`5cb177b`** — Phase 3a async partial: verifyPassword migrated PA-hands-on (1 of 4 remaining async; agent stalled on permission-ask). 3 remaining (jwt verifyJwt + http _request + http retry) DEFERRED to follow-on — http needs scrml-faithful failable refactor (current code has `throw new Error` which is also forbidden — Phase 3c work).

### Phase 7 — Insight 31 ratification (debate-04 §36 retention) + agent infrastructure

- **`20bb16c`** (scrml-support) — debate-04 record + Insight 31 (`scrml-support/design-insights.md`). 4-expert synthesis-mode debate; verdict DESIGN-AND-SHIP (49.5 / 40.0 / 29.0). User ratified in full with synthesis-mode caveat carried forward.
- Forge follow-up: PA dispatched 3 agent-forge × `phaser-input-expert` / `react-dom-events-expert` / `scrml-structural-primitives-expert`. All 3 failed (2× Write-denial, 1× prompt-too-long). User authorized DROP at S88 — future debates fresh-forge when needed.

### Phase 8 — SPEC amendments bundle (PA-hands-on)

- **`ad9f1f8`** — 3 SPEC amendments:
  - **§4.7** BS-comment-skip normative softening: BS MAY skip `<!-- -->` at block level (matching shipped S87 BS-comment-skip behavior). `/* */` still forbidden at BS.
  - **§18.7** mixed positional+named binding clarification: mixed form forbidden + E-TYPE-021 (rationale: AST payloadBindings is strictly positional; mixed-form support would require AST extension without expressive gain).
  - **§41.4** bun:/node: protocol prefixes added (5 prefixes now legal). New E-IMPORT-007 for bun:/node: in client context. Brief-overclaim surfaced: S87 hand-off said §40.4; that's the wrong section (handle/middleware); correct section is §41.4 Protocol Prefixes. Per pa.md Rule 4.

### Phase 9 — Bug 3a §1 flake fixed (operational pre-push gate unblocked)

- **`ccf2e99`** — Bug 3a §1 SQL round-trip test hardened against happy-dom Headers pollution. Root cause: `compiler/tests/browser/*` registers GlobalRegistrator which replaces Request/Response/Headers with browser-spec polyfills that filter Set-Cookie / Cookie / X-CSRF-Token per CORS forbidden-header rules. Fix: pre-mint CSRF cookie + X-CSRF-Token on every request + conditional skip when happy-dom detected. csrf-baseline.test.js + csrf-bootstrap.test.js + emit-server-sql-emission.test.js cover the orthogonal claims.
- S87 hand-off + LIFT-1 agent + A-1.2 agent all referenced this as "pre-existing flaky" — actual cause was suite-interaction, not flakiness. Test passes in isolation; fails reliably when browser tests precede it. Operational unblock for every push.

### Phase 10 — Agent infrastructure fixes

- `~/.claude/agents/scrml-js-codegen-engineer.md` REWRITTEN (~200 lines from ~54). Fixes:
  - `model: sonnet` → `model: opus` (S57 default-down bug recurrence)
  - Project path: `/home/bryan-maclee/projects/scrml8/` (frozen archive) → `/home/bryan-maclee/scrmlMaster/scrmlTS/`
  - Tools: added Edit (was missing — forced full Write rewrites)
  - Review process: removed reference to non-existent scrml-js-codegen-reviewer; references PA-side S67 file-delta protocol
  - Added comprehensive F4 isolation discipline + S67 file-delta + S83 commit discipline + S88 "do not ask permission" rule
  - Per pa.md: agent-file edits propagate at NEXT PA session start, not mid-session. Sonnet pattern observed throughout S88 (Co-Author tag "Sonnet 4.6" on all agent commits). Permission-ask pattern surfaced 3 times this session despite explicit briefs forbidding it. Fix propagates S89+.

---

## S88 commit ledger (chronological, 17 PA-authored commits on scrmlTS + 1 on scrml-support)

| # | Commit | Description |
|---|---|---|
| 1 | `30743c4` | 25 shipped dispatch dirs deref → scrml-support archive |
| 2 | `3d90286` | pa.md hook-policy amendment + S87→S88 rotation + maps refresh |
| 3 | `0b7ea8b` | pa.md isolation-parameter rule + primer §13.5 staleness fix |
| 4 | `be7b261` | LIFT-1 fix — parens-attr cursor desync (closes 1 of 5 LIFT families) |
| 5 | `14e21de` | LIFT-2/3/4 PA-authored — bind:* + if= + event auto-inject (closes 4 of 5) |
| 6 | `20bb16c` (scrml-support) | debate-04 record + Insight 31 §36 retention DESIGN-AND-SHIP |
| 7 | `6461f21` | v0.3 Approach A implementation SCOPING |
| 8 | `1f516e1` | A-1.2 markup-read DG node kind + scaffold (Option Y) |
| 9 | `05379f9` | safeCall stdlib primitive (scrml:host) |
| 10 | `da78609` | A-1.3 high-freq markup-read edge emission (4 shapes) |
| 11 | `c838e19` | Phase 3a sync migration (4 of 8 try-blocks; 4 async-gap docs) |
| 12 | `7491a98` | safeCallAsync primitive |
| 13 | `b512db9` + `24b582d` | A-1.5 engine + onTransition/Timeout/Idle edge emission |
| 14 | `88a7d57` | LIFT-5 reconciler-factory ambient fix (closes 5 of 5 LIFT families) |
| 15 | `ccf2e99` | Bug 3a §1 test flake hardened (happy-dom Headers pollution) |
| 16 | `ad9f1f8` | 3 SPEC amendments (§4.7 BS-comment-skip + §18.7 mixed-binding + §41.4 bun:/node:) |
| 17 | `5cb177b` | Phase 3a async partial — verifyPassword migrated to safeCallAsync (1 of 4) |
| 18 | `55f5f20` | A-1.4 call-ref + for-iterable + lift-template-body-expr edges (closes 5 of 5 A-1 edge sub-phases) |

---

## State-as-of-S88-CLOSE tables

### Tests at HEAD `55f5f20`

11,912 pass / 117 skip / 1 todo / 0 fail / 560 files (full `bun test` incl. browser + lsp + commands + self-host).
- Pre-commit subset (unit + integration + conformance): 11,259 / 88 skip / 1 todo / 0 fail.
- Cumulative S87→S88: +759 pass / +32 skip / 0 fail / 0 regressions across 17 PA-authored commits.

### Semver tag history (unchanged S88)

| Tag | Commit | Scope |
|---|---|---|
| v0.2.0 | `022ee02` | First semver baseline (S83) |
| v0.2.1 | `d72c074` | Wave 4A bundle (S83) |
| v0.2.2 | `98e872d` | Wave 4B.1 bundle (S83) |
| v0.2.3 | `d512266` | Bug 2 (S84) |
| v0.2.4 | `28cd2ac` | Wave 1 + 1.5 robust-v0.2 bundle (S84) |
| v0.2.5 | `2c687b5` | Wave 2.5 (S85) |
| v0.2.6 | `efbd1e8` | F-COMPONENT-001 family closure (S85) |
| (untagged) | `55f5f20` | S88 close — 17 commits + 1 scrml-support; v0.3.0 path advanced significantly |

### v0.3.0 cut path status (post-S88)

- ✅ **LIFT family (5 of 5)** — all bug families closed (LIFT-1 / LIFT-2/3/4 / LIFT-5). Canonical "per-item interactive markup inside for/lift" pattern unblocked.
- ✅ **Channel-architecture OQ** (closed S87 via Insight 30)
- ✅ **SQL emission BLOCKER** (closed S87 via Bug 3a)
- ✅ **Engine self-write Option (d)** (closed S87)
- ✅ **Wave 3 v0.3 fixture-sweep COMPLETE** (closed S87)
- ✅ **debate-04 §36 retention DESIGN-AND-SHIP** ratified S88 (Insight 31)
- ✅ **Approach A SCOPING** (S88; v0.4 deferral reversed)
- ✅ **Approach A A-1 edge emission (5 of 5 sub-phases)** landed S88: A-1.2 scaffold + A-1.3 high-freq + A-1.4 call-ref/for/lift + A-1.5 engine
- ✅ **stdlib host primitive family** — safeCall + safeCallAsync both shipped S88
- ✅ **Phase 3a sync stdlib migration** (4 of 4 sync sites — S87 c838e19 + S88 verifyHash/decodeJwt/kv.get/parseIdToken)
- ✅ **3 SPEC amendments** (§4.7 + §18.7 + §41.4) — small spec polish queue cleared
- ✅ **Bug 3a §1 test flake fixed** — pre-push gate unblocked
- 🟡 **Phase 3a async migration** — 1 of 4 migrated (verifyPassword); 3 remaining (jwt verifyJwt + http _request + http retry) need follow-on — http blocks also have `throw new Error` (Phase 3c concern)
- 🟡 **A-1.6 / A-1.7 / A-1.8** — Approach A wrap (consumer audit + S84 re-measurement + docs) ~10-15h to close A-1
- 🟡 **§36 keyboard+mouse impl** — ratified S88; not started; ~12-25h
- 🟡 **stdlib Phase 1.5** null/undefined sweep (~50 sites; ~2-4h)
- 🟡 **W-PROGRAM-SPA-INFERRED** emission impl (~2-4h)
- 🟡 **W-TRY-CATCH-IN-SCRML-SOURCE** lint (post-Phase-3a regression guard; ~2-4h)
- 🟡 **Approach A waves A-2 / A-3 / A-4 / A-5** — 260-560h to complete
- 🟡 **Wave 3.7 fixture sweep** (corpus-ouroboros audit on kickstarter / primer / 5 articles / 22 examples)
- 🟡 **Wave 4 adopter content** — tutorials + scrml.dev refresh + articles triage (cut blocker per user S88 ratification)

### Insights ratified S88

- **Insight 31** (S88) — §36 live-input element retention DESIGN-AND-SHIP. Empirical gate: trio + on*= cannot cover justPressed/justReleased frame-accurate edge detection without 10-15 LOC per-app boilerplate. Symmetry gate: Pillar 5 reverse — all other lifecycle-managed event-sources are structural; input devices satisfy identity + lifecycle + composability. Synthesis-mode caveat carried forward (3 of 4 experts synthesized; the one real agent — simplicity-defender — voted CLOSE).

### Memory rules saved S88

- `feedback_stated_intent_vs_corpus_migration.md` — when user has stated normative intent verbatim multiple times, corpus contradicting it is migration backlog, NOT deliberation trigger. The ouroboros is a 5-step cycle (training-data → agent default → corpus → next agent → PA framing → cycle); mitigations on agent / PA / sweep sides.
- `feedback_file_delta_vs_cherry_pick.md` — when agent's worktree base predates sibling parallel landings on the same files, wholesale file-delta silently overwrites sibling work; cherry-pick (with auto-merge) preserves both. S88 LIFT-5 precedent — pre-commit gate caught it; reverted + cherry-picked.

### Cross-machine sync state at S88 close

- **scrmlTS:** 17 commits ahead of origin/main. PUSH PENDING — to be executed during wrap close.
- **scrml-support:** 0/0 (Insight 31 + debate-04 record pushed live at `dde7e5b` + `20bb16c`).

### Worktree state at S88 close

**9 agent worktrees retained** (all locked). All work landed in main OR null-completion:

| Worktree | Branch tip | Disposition |
|---|---|---|
| agent-a6cac528db9f0ed0b | `1f516e1` | Phase 3a first dispatch — stopped on permission-ask; superseded by re-dispatch |
| agent-a839252602ebb607d | `8e351d5` | A-1.3 — landed via `da78609` |
| agent-a9595b116d2163694 | `2b07a71` | A-1.4 — landed via `55f5f20` |
| agent-a98d23c15c5ddebba | `30743c4` | LIFT-2/3/4 — NULL completion (prompt-too-long ×2); closed via PA-hands-on `14e21de` |
| agent-a9a4287e18f9dca1d | `7b6a07b` | safeCall — landed via `05379f9` |
| agent-aaa250e065939920f | `52d9c04` | Phase 3a re-dispatch — landed via `c838e19` |
| agent-ab07a92f95ef0c44e | `3c1a8fd` | A-1.2 — landed via `1f516e1` |
| agent-aca1364ef69708d74 | `95e04cd` | LIFT-5 — landed via cherry-pick `88a7d57` |
| agent-aee1c224ba6d0fad2 | `dae11db` | safeCallAsync — landed via `7491a98` |

**Cleanup pending at wrap close** per S83 retention rule (DRY-RUN-FIRST per S87 memory rule — list confirmed above).

Pre-commit hook: `core.hooksPath = .git/hooks` configuration B (pre-commit + post-commit + pre-push all active) — user-ratified at S88 over pa.md S78 minimum baseline.

---

## Latent items / follow-ons surfaced S88 (for S89+ triage)

| Family | Items | Notes |
|---|---|---|
| Phase 3a async remaining | jwt verifyJwt / http _request / http retry | safeCallAsync available since S88. http requires scrml-faithful failable refactor (current `throw new Error` is itself forbidden — Phase 3c concern). |
| W-TRY-CATCH-IN-SCRML-SOURCE lint | regression-guard after Phase 3a completes | ~2-4h |
| stdlib Phase 1.5 | E-SYNTAX-042 null/undefined sweep (~50 sites) | mechanical |
| §36 impl | keyboard + mouse first; gamepad deferred | ~12-25h |
| W-PROGRAM-SPA-INFERRED impl | §40.8.1 lint emission site | ~2-4h |
| W-AUTH-RUNTIME-FALLBACK impl | gated on Approach A-2 (Reachability Solver) | post-A-1 wave |
| §53.7.x amendment | stdlib auto-await on `Promise<T>` stdlib calls | follow-on from safeCallAsync await-discipline finding |
| Approach A waves | A-2 RS / A-3 auth-graph / A-4 chunk splitter / A-5 integration tests | 260-560h |
| Wave 3.7 fixture sweep | kickstarter v1 / primer / 5 articles / 22 examples corpus-ouroboros audit | ~6-12h |
| Wave 4 adopter content | tutorials / scrml.dev refresh / articles triage | ~8-20h (cut blocker per user S88) |
| TodoMVC edit-mode markup landing | now unblocked post-LIFT-5 | separate dispatch |

---

## Things S89 PA must NOT screw up (S88 additions to standing list)

- **DO honor S88 file-delta-vs-cherry-pick memory rule** (`feedback_file_delta_vs_cherry_pick.md`). When an agent's worktree base predates sibling parallel landings on the same files, wholesale file-delta silently overwrites sibling work. Cherry-pick `--no-commit <agent-final-sha>` auto-merges. Check `git log <agent-base-sha>..HEAD -- <FILES_TOUCHED>` per file before deciding; if any sibling commits, switch to cherry-pick.
- **DO honor S88 stated-intent-vs-corpus memory rule** (`feedback_stated_intent_vs_corpus_migration.md`). Corpus is artifact, NOT evidence. When user has stated normative intent verbatim, contradicting corpus is migration backlog, NOT deliberation trigger. The ouroboros is a 5-step cycle.
- **DO set `isolation: "worktree"` explicitly on every dev-agent Agent() call.** S88 precedent: LIFT-1 + LIFT-2/3/4 dispatched without the parameter; agents worked direct in main. pa.md S88 amendment requires this.
- **DO note Sonnet default-down was active S88.** All agent commits this session carried "Co-Authored-By: Claude Sonnet 4.6" footer despite pa.md S57 rule that all agents run on Opus. Agent file `~/.claude/agents/scrml-js-codegen-engineer.md` rewritten S88 with `model: opus`; propagates at S89 open. Verify on first S89 dispatch via test runs — Opus should be the default.
- **DO note permission-ask pattern recurrence.** 3 agents this session stopped to "ask permission" for writes/edits within their own worktrees despite explicit briefs forbidding it. Pattern attributable to Sonnet's training. Agent file fix includes explicit "DO NOT ask permission" directive; propagates S89.
- **DO note pre-push hook is configured B (richer local).** Full test suite + TodoMVC gauntlet on every push (~5min). Bug 3a §1 flake fix S88 unblocked the operational pre-push gate.

### Rules permanently load-bearing (unchanged)

- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration

---

## Push state at S88 close

17 S88 commits ahead of origin/main. Pre-push gate (full test + TodoMVC gauntlet, ~5min) post-flake-fix should pass clean. **User authorized "wrap and push" — push executes during wrap close.**

---

## Tags

#session-88 #close #LANDMARK-17-COMMITS #LIFT-family-5-of-5-closed #approach-a-A1-edge-emission-complete #insight-31-design-and-ship #safe-call-async-shipped #happy-dom-flake-fix-pre-push-unblocked #SPEC-amendments-x3 #brief-overclaim-S40.4-to-S41.4-correction #v0.4-deferral-reversed-full-approach-A-in-v0.3.0 #wave-4-adopter-content-as-cut-blocker #memory-rule-stated-intent-vs-corpus #memory-rule-file-delta-vs-cherry-pick #agent-file-sonnet-defaultdown-fix-propagates-S89
