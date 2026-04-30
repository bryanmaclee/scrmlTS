# scrmlTS — Session 50 (CLOSED — fat wrap, push authorized)

**Date opened:** 2026-04-29 (machine-A, post-S49 close)
**Date closed:** 2026-04-30 (crossed midnight during dispatch app M2)
**Previous:** `handOffs/hand-off-51.md` (S49 close — wrapped + pushed; rotated at S50 open).
**Baseline entering S50:** scrmlTS at `a70c6aa` (S49 close); clean / **8,094 pass / 40 skip / 0 fail / 383 files**. scrml-support at `e83c993` (S49 close); clean / 0/0 origin.
**State at S50 close:** scrmlTS at `c3b6669` (57 commits ahead of origin pre-push); scrml-support at `e83c993` (0 ahead BUT has untracked Phase 2g deep-dive). Tests **8,196 pass / 40 skip / 0 fail / 385 files**. **Net delta: +102 tests (regression suite for Phase 2g + chain-mount-emission + F-RI-001), -2 fail (no carryover from S49 close), 0 regressions.**

---

## 0. The big shape of S50

**One of the longest + most productive sessions in the project.** Three major tracks shipped in sequence + parallel:

### Track A: Phase 2g (compiler — chain branches mount/unmount via per-branch B1 dispatch)

- Structured 5-phase deep-dive at `scrml-support/docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md` (753 lines). Surfaced 2 findings the dispatch missed: §17.1.1 line 7533 is normative-by-implication ("only one span exists in the DOM at any time"); mixed-cleanliness chains are the DOMINANT pattern (5/10 audited samples), not corner case.
- 4 OQs in the deep-dive — user accepted all 4 suggestions on first read; no debate needed.
- T2 pipeline dispatch (worktree-isolated). First dispatch timed out after 43min/68 tool calls (had committed 1 pre-snapshot; emit-html.ts in-flight uncommitted with 130/-33 changes; substantial plan in progress.md). RESUME via fresh `scrml-dev-pipeline` dispatch on the same existing worktree (since SendMessage tool isn't available in this env). Resume completed cleanly in 10min — landed 6 commits including 31-test regression suite.
- Merged via `b362b33 merge: Phase 2g — if=/else-if=/else chain branches mount/unmount via per-branch B1 dispatch (S50)`.
- Approach A + W-keep-chain-only + per-branch mixed-cleanliness dispatch. Single chain-region wrapper retained `<div data-scrml-if-chain="N">`; clean branches → `<template>` + marker; dirty branches → per-branch `<div data-scrml-chain-branch="K" style="display:none">` retained as fallback. Strip-precursor (`stripChainBranchAttrs`) preserved in BOTH paths.
- No new runtime helpers (Phase 2c B1 helpers reused verbatim). No spec amendment (§17.1.1 line 7533 stays normative-by-implication).

### Track B: Triage — F-RI-001 (route-inference E-RI-002 over-firing)

- Triage dispatch via `scrml-dev-pipeline` T2. Result: F-RI-001 was filed against an OLDER RI mental model. Commit `7462ae0` (S39 boundary-security) had already removed callee-based escalation. Doc-comment fix in `route-inference.ts:34-47 + 1387-1394` to remove misleading "purely-transitively-escalated function is suppressed" wording. **7 regression tests** in new `compiler/tests/unit/route-inference-f-ri-001.test.js` (§A 3 narrow-canonical, §B 2 server-bound-still-fires-correctly, §C 2 CPS-applicable still splits).
- Cherry-picked clean to main (4 commits: `d19faab..2b3b31b`).
- **HOWEVER, partial-resolution discovered post-merge** when I tried to revert M2's workaround in `pages/dispatch/load-detail.scrml`: even after the doc fix, the canonical Promise-chain pattern still fires E-RI-002 in real-app file context (when `transition` and `saveAssignment` coexist in same file). The narrow regression tests pass in isolation but don't cover this shape. Reverted load-detail.scrml workaround verbatim. Updated F-RI-001 to **PARTIAL** in FRICTION.md.
- **Two adjacent findings split out:**
  - F-RI-001-FOLLOW (P1): `obj.error is not` fails E-SCOPE-001 (`is not` doesn't support member-access targets). Repro: `docs/changes/f-ri-001/repro-follow.scrml`.
  - F-CPS-001 (P1, architectural): `analyzeCPSEligibility` doesn't recurse into nested control-flow while `findReactiveAssignment` does. Architectural fix would require CPS protocol to carry multiple intermediates. Out-of-scope. Repro: `docs/changes/f-ri-001/repro4.scrml`.

### Track C: Triage — F-COMPONENT-001 (cross-file component expansion)

- Triage dispatch via `scrml-dev-pipeline` T2. **Diagnostic finding much bigger than the friction described.** Cross-file component expansion does not work end-to-end on current scrmlTS:
  - **F1:** `hasAnyComponentRefsInLogic` (in `component-expander.ts:1454`) doesn't recurse into nested markup. Wrapped patterns silently skip CE entirely via early-return.
  - **F2:** `runCEFile` looks up `exportRegistry.get(imp.source)` by raw import-path string, but production `exportRegistry` (in `module-resolver.js:303`) and `fileASTMap` (in `api.js:335`) are both keyed by absolute filesystem path. Lookup always misses. Tests at `cross-file-components.test.js` synthesize key-matched fixtures (test header documents the convention).
  - **F3:** CLI reads `inputFiles` only, never auto-gathers files reachable through imports.
- Pipeline agent did exactly what was asked: refused conservative fix, surfaced as architectural BLOCKED. Diagnosis at `docs/changes/f-component-001/diagnosis.md` (322 lines).
- **Independent confirmation from PA:** compiled `examples/22-multifile/`. The emitted `dist/app.client.js` line 12 contains `document.createElement("UserBadge")` — phantom custom element. **The canonical multi-file scrml example is silently broken.** It compiles clean, runs without throwing, but renders blank where components should be.
- **User picked Plan B disposition:** park architectural defect with proper documentation, unblock M3-M6 with inline-only pattern, deep-dive scheduled post-M6.
- Bookkeeping: kickstarter v1 multi-file section now flags cross-file *components* as KNOWN-BROKEN; recommends import-types+helpers+inline-markup pattern. master-list E. Examples: `22-multifile` flipped to `[x][❌]`. Cherry-picked diagnosis commits to main (`053e1ea` + `50ff1f8` + `91ecacd`).

### Track D: Trucking dispatch app (6 milestones + 26+ friction findings)

The headline track. User chose all-three-slices integrated, 3 personas, real-time, 5,000+ LOC. Domain matches user's actual operation (NE Utah, oil and gas, owner-operator).

**Locked decisions** (per user input):
- Path: `examples/23-trucking-dispatch/`
- Auth: **Option A** — `auth="role:dispatcher"` etc. (deliberately surface the silent-inert friction; server-side fallback layered)
- Customer self-register: open at `/register`
- HOS: simple 11/14 rule
- 6 sequential dispatches via Agent (general-purpose, opus, worktree-isolated)
- Forge `scrml-app-writer`: deferred (user said "rest looks good" — accepted general-purpose default)

**Milestones shipped (all cherry-picked to main):**

| # | Slice | Wall | Commits | LOC | Friction findings (new) |
|---|---|---|---|---|---|
| M1 | Schema + auth scaffold | 18 min | 5 | 1,587 | 7 (F-AUTH-001 / F-AUTH-002 / F-EQ-001 / F-SCHEMA-001 / F-EXPORT-001 / F-AUTH-003 / F-DESTRUCT-001) |
| M2 | Dispatcher slice (6 pages + 8 components) | 9.5 hr (idle timeout — work was 99% done) | 10 | 2,199 | 4 (F-COMPONENT-001 / F-COMPONENT-002 / F-COMMENT-001 / F-RI-001) |
| M3 | Driver slice + HOS `<machine>` | 26 min | 7 | 2,259 | 3 (F-MACHINE-001 / F-NULL-001 / F-PAREN-001) |
| M4 | Customer slice | 22 min | 5 | 1,799 | 2 (F-NULL-002 / F-CONSUME-001) |
| M5 | Real-time channels (4 channels × 12 pages) | 28 min | 5 | 587 net | 6 (F-CHANNEL-001 through F-CHANNEL-006) |
| M6 | lin tokens + README + final summary | 23 min | 6 | 343 net | 2 (F-LIN-001 / F-DG-002-PREFIX) |

**LOC tally: ~8,200 LOC across 32 .scrml files.** Past the 5,000+ ceiling user named.

**Triage dispatches between milestones:**
- After M2: F-RI-001 triage (4 commits) → cherry-pick clean
- After M2: F-COMPONENT-001 triage (2 commits diagnosis) → cherry-pick clean → bookkeeping landed Plan B

**Mid-session user-prompted findings (extra value the dispatch app didn't surface on its own):**
- "has any code used 'is not' 'is some'?" → grep showed **zero usage across 5,650 LOC**. Logged as F-IDIOMATIC-001 (P2 observation). Three plausible chilling effects: familiarity bias / F-RI-001-FOLLOW / F-NULL-001+002.
- "are we actually compiling all code?" → audit revealed **32 source .scrml → 17 HTML / 46 JS in dist/** = 15 silent overwrites (5 HTML + 10 JS). Confirmed the basename-collision codegen flaw via grep — `home.html` won by driver, `profile.html` won by driver. **Customer's home + profile + 2/3 load-detail are not in dist.** Logged as **F-COMPILE-001 (P0)** — the largest and most consequential finding of S50.

---

## 1. Commits this session — scrmlTS (57 commits ahead of origin)

```
c3b6669 feat(dispatch-app-m6): lin tokens + README + final summary
6ce6ae3 WIP(m6): FRICTION.md — final summary section + 2 new findings + 5 reconfirmations
5c7337f WIP(m6): README — final run instructions + persona walkthrough + lin token semantics
[m6 partial — pages/dispatch/billing + customer/invoices wire payment token]
[m6 partial — pages/{dispatch,customer,driver}/load-detail wire acceptance + BOL tokens]
[m6 partial — schema.scrml + app.scrml lin_tokens table + bootstrap]
eb5cf2a docs(s50): F-COMPILE-001 (P0) — scrml compile <dir> flattens output by basename
815a986 feat(dispatch-app-m5): real-time channels — 4 channels wired across 12 pages
3ec2a99 WIP(m5): billing publishes invoice events; driver delivers → customer-events
1f6219e WIP(m5): customer-events channel — invoice + delivery notifications
[m5 partial — driver-events channel + load-events publisher (driver side)]
[m5 partial — dispatch-board channel — publishers + subscribers]
6e75073 docs(s50): F-IDIOMATIC-001 — canonical is not/is some saw zero adopter reach
ef8040b feat(dispatch-app-m4): customer slice — 6 pages
4053fba WIP(m4): pages/customer/quote.scrml + profile.scrml — quote form + read-only billing
1f531ea WIP(m4): pages/customer/invoices.scrml — list + mark-paid demo
[m4 partial — pages/customer/loads.scrml + load-detail.scrml — list + tracking]
[m4 partial — pages/customer/home.scrml — landing]
7de8d79 feat(dispatch-app-m3): driver slice — 6 pages + HOS <machine>
36ffba1 WIP(m3): pages/driver/profile.scrml — read-only + edit form
558c5b8 WIP(m3): pages/driver/messages.scrml — chat thread (server-rendered)
df4e4f1 WIP(m3): pages/driver/hos.scrml — <machine> + cycle tracking
d06920f WIP(m3): pages/driver/load-log.scrml — chronological history
5bc27d7 WIP(m3): pages/driver/load-detail.scrml — driver actions + BOL/POD/fuel/breakdown
58b3814 WIP(m3): pages/driver/home.scrml — landing + status + current load
91ecacd docs(s50): F-COMPONENT-001 plan B — flag cross-file component expansion as known-broken
50ff1f8 docs(f-component-001): diagnosis — BLOCKED, needs deep-dive
053e1ea WIP(f-component-001): phase 1 diagnosis in progress
fdc9795 docs(s50): F-RI-001 partial resolution + F-RI-001-FOLLOW + F-CPS-001 split
2b3b31b fix(f-ri-001): canonical client-fn → server-call → branch → @var pattern compiles
b264ef7 WIP(f-ri-001): fix + regression tests
7916bc1 WIP(f-ri-001): diagnosis — root cause is stale-friction (already fixed by 7462ae0)
d19faab WIP(f-ri-001): pre-snapshot — baseline 8165p/0f, repro confirmed
1a9a011 WIP(m2): FRICTION.md final entries + load-status-badge attr reorder
ffc9784 WIP(m2): pages/dispatch/billing.scrml — invoices outbound + mark-paid action
e6d92a9 WIP(m2): pages/dispatch/customers.scrml — list + outstanding invoices
7beedac WIP(m2): pages/dispatch/drivers.scrml — roster view with inlined row markup
7a37622 WIP(m2): pages/dispatch/load-detail.scrml — detail + assignment + timeline
6704645 WIP(m2): pages/dispatch/load-new.scrml — book-a-load form
b9d959c WIP(m2): pages/dispatch/board.scrml — kanban view, F-COMPONENT-001 logged
915b027 WIP(m2): components — status-picker + assignment-picker + address-form
c8dfbc7 WIP(m2): components — driver-card + customer-card + invoice-card
b555438 WIP(m2): components — load-status-badge + load-card
03f6244 feat(dispatch-app-m1): schema + auth scaffold — login + register pages, README
14199b3 WIP(m1): app.scrml + bootstrap dispatch.db, F-SCHEMA-001 logged
5fb8182 WIP(m1): seeds.scrml — NE Utah oil/gas seed data, F-EXPORT-001 logged
e585589 WIP(m1): models/auth.scrml — cookie + role helpers, F-AUTH-001/002 logged
d9b4b79 WIP(m1): schema.scrml — shared enum types + DDL reference comment
fa7b7d9 docs(s50): trucking dispatch app scoping — locked design (M1 ready)
98fcfcf docs(s50): bookkeeping — Phase 2g landed + S50 hand-off + master-list refresh + S49→S50 rotation
b362b33 merge: Phase 2g — if=/else-if=/else chain branches mount/unmount via per-branch B1 dispatch (S50)
6b19911 docs(phase-2g): finalize progress.md — READY FOR MERGE
bf64bb4 test(phase-2g): Step 4 — new chain-mount-emission.test.js (31 tests, N1-N31)
2a02ffd WIP(phase-2g): Step 3 — emit-event-wiring.ts chain controller (per-branch dispatch)
625f232 WIP(phase-2g): Step 2 — binding-registry.ts LogicBinding interface for chain shape
6bdcea8 WIP(phase-2g): Step 1 — emit-html.ts chain handler rewrite (per-branch B1 dispatch)
8522b95 WIP(phase-2g): pre-snapshot — baseline 8094p/0f, greenlit design captured
a70c6aa (S49 close baseline)
```

Plus the wrap commits landing at session close (this hand-off + master-list + changelog refresh).

## 2. Commits this session — scrml-support

scrml-support has the Phase 2g deep-dive untracked. Needs commit + push at S50 close:
```
phase-2g-chain-mount-strategy-2026-04-29.md  (753 lines) - written by deep-dive agent during Track A
```

User-voice S50 entry to be appended to `user-voice-scrmlTS.md` at session close (verbatim quotes captured below in §7).

---

## 3. Test count timeline

| Checkpoint | Pass | Skip | Fail | Files |
|---|---|---|---|---|
| S49 close (`a70c6aa`) | 8,094 | 40 | 0 | 383 |
| Phase 2g merge (`b362b33`) | 8,125 | 40 | 0 | 384 |
| Bookkeeping commit (`98fcfcf`) | 8,125 | 40 | 0 | 384 |
| Scoping doc (`fa7b7d9`) | 8,125 | 40 | 0 | 384 |
| M1 cherry-pick (`03f6244`) | 8,137 | 40 | 0 | 384 |
| F-RI-001 cherry-pick (`2b3b31b`) | 8,172 | 40 | 0 | 385 |
| F-RI-001 partial doc (`fdc9795`) | 8,172 | 40 | 0 | 385 |
| F-COMPONENT-001 plan B (`91ecacd`) | 8,172 | 40 | 0 | 385 |
| M2 cherry-pick (`1a9a011`) | unchanged | unchanged | 0 | 385 |
| M3 cherry-pick (`7de8d79`) | 8,184 | 40 | 0 | 385 |
| M4 cherry-pick (`ef8040b`) | 8,196 | 40 | 0 | 385 |
| F-IDIOMATIC-001 (`6e75073`) | 8,196 | 40 | 0 | 385 |
| M5 cherry-pick (`815a986`) | 8,196 | 40 | 0 | 385 |
| F-COMPILE-001 (`eb5cf2a`) | 8,196 | 40 | 0 | 385 |
| **M6 cherry-pick — S50 close (`c3b6669`)** | **8,196** | **40** | **0** | **385** |

Net delta from S49 close: **+102 pass, 0 skip-change, 0 fail-change.** All test growth from compiler-side (Phase 2g 31 chain-mount tests + F-RI-001 7 regression tests) plus corpus invariants on new dispatch-app files (+64 from M1-M4 dist artifacts being picked up by example-compile invariants).

---

## 4. Audit / project state

### dispatch app state (after M6)

| Layer | Source | Output |
|---|---|---|
| .scrml files | 32 | — |
| HTML output | — | 17 (15 silent overwrites — F-COMPILE-001) |
| client.js output | — | 28 |
| server.js output | — | 17 |
| FRICTION.md entries | — | 26+ (6 P0 / 10 P1 / 5 P2 / 1 observation / 5 reconfirmations / 1 partial-resolution) |

### FRICTION.md complete inventory at S50 close

**P0 (silent failures / validation-principle violations) — 6:**
1. **F-AUTH-001** — `auth="role:X"` silently inert. Cumulative: 35+ inline role-check exercises across M2-M6.
2. **F-AUTH-002** — Cross-file server fns with `?{}` SQL hit E-SQL-004; pure-fn files have no `<program db=>` ancestor. Cumulative inline-duplication M2-M6: ~450 LOC.
3. **F-COMPONENT-001 (architectural)** — Cross-file component expansion does not work end-to-end. Three intersecting faults (CE recursion gate / registry key mismatch / CLI file-gathering). 22-multifile silently broken. Plan B parked.
4. **F-RI-001 (PARTIAL)** — Narrow Promise-chain pattern compiles clean; multi-server-fn file context still fires E-RI-002. Doc-fix + 7 regression tests landed; M2 workaround restored in `pages/dispatch/load-detail.scrml`.
5. **F-CHANNEL-001** — Channel name interpolation silently inert. `<channel name="driver-${id}">` mangles to literal underscore. Auth/privacy contract broken.
6. **F-COMPILE-001** — `scrml compile <dir>` flattens output by basename. 32 source → 17 HTML = 15 silent overwrites.

**P1 (working but awkward) — 10:**
- F-RI-001-FOLLOW: `obj.error is not` fails E-SCOPE-001 (member-access targets unsupported).
- F-CPS-001: CPS-eligibility skips nested control-flow (architectural).
- F-SCHEMA-001: `<schema>` block doesn't satisfy E-PA-002.
- F-EXPORT-001: `export server function` not a recognized form.
- F-COMPONENT-002: Component prop names at call site become spurious local declarations.
- F-COMMENT-001: HTML comments leak content into BS+TS passes.
- F-MACHINE-001: `<machine for=Type>` rejects imported types.
- F-NULL-001: Files containing `<machine>` reject `== null`/`!= null` in client-fn bodies.
- F-NULL-002: `!= null` / `== null` in server-fn body fires E-SYNTAX-042 in GCP3.
- F-CHANNEL-002: `@shared` mutation has no on-change effect hook.
- F-CHANNEL-003: Channels per-page, not cross-file (180 LOC duplication).
- F-CHANNEL-005: Per-channel auth scoping not declarative; WebSocket open-broadcast at wire level.
- F-LIN-001: SQL `?{}` interpolation does NOT count as `lin` consume per §35.3 rule 1; template-literal `${ticket}` does.

**P2 (DX paper cuts) — 5:**
- F-EQ-001: `===` ban (already well-handled in kickstarter; data point only).
- F-AUTH-003: W-AUTH-001 false positive when `auth="optional"` IS explicit.
- F-DESTRUCT-001: Array destructuring inside `for-of` may confuse type-scope.
- F-PAREN-001: Cosmetic parens trigger corpus-invariant idempotency test.
- F-CONSUME-001: `@var` read inside attribute-string template not recognized as consumption (E-DG-002 false positive).
- F-CHANNEL-004: Channel-scope ↔ page-scope rules undocumented.
- F-CHANNEL-006: Channel-internal `@shared` decls fire false E-DG-002 unless also read in markup.
- F-DG-002-PREFIX: `@_var` underscore-prefix doesn't suppress E-DG-002 (warning text claims it does).

**Observation — 1:**
- F-IDIOMATIC-001: Canonical `is not`/`is some` saw zero adopter reach across 8,200 LOC of natural scrml writing.

**Reconfirmations:** F-AUTH-001 + F-AUTH-002 + F-COMPONENT-001 + F-IDIOMATIC-001 + F-COMPILE-001 confirmed across multiple milestones.

**The systemic meta-finding:** scrml repeatedly accepts inputs that produce silently-wrong outputs. At least 5 distinct mechanisms hit the same pattern:
- Attribute values silently dropped (F-AUTH-001, F-CHANNEL-005)
- Interpolation silently inert (F-CHANNEL-001)
- Phantom code emission (F-COMPONENT-001 emits `document.createElement("Component")`)
- Output collisions (F-COMPILE-001 silent overwrite)
- File-context-dependent escalation (F-RI-001 partial)

Belongs in post-S50 deep-dive scope as a unified silent-failure sweep, NOT 5 independent triages.

---

## 5. ⚠️ Things the next PA needs to NOT screw up

1. **F-COMPILE-001 is the most consequential and most likely to bite next session.** The dispatch app cannot run as advertised — basename collisions silently drop 5 pages from dist/. Next session's first move on the dispatch app should likely be triaging this. Diagnosis at `examples/23-trucking-dispatch/FRICTION.md` §F-COMPILE-001. Conservative fix likely: codegen preserves source dir structure in `dist/` (emit `dist/pages/customer/home.html` instead of `dist/home.html`). Or: hard error on basename collision. Or: flat-but-prefixed (e.g. `dist/pages_customer_home.html`).

2. **5 distinct architectural defects need post-S50 triage:**
   - F-COMPONENT-001 (cross-file CE — diagnosis already done; the deep-dive scope question is in `docs/changes/f-component-001/diagnosis.md`)
   - F-AUTH-002 (cross-file SQL portability — `?{}` resolution should propagate from importing file's `<db>` ancestor)
   - F-MACHINE-001 (machine type imports)
   - F-NULL-001 + F-NULL-002 (asymmetric null-literal handling: machine-presence trigger + GCP3 server-fn-body trigger)
   - F-COMPILE-001 (codegen output flattening)
   - OQ-2 (dev-server `scrml:auth` import bootstrap)
   
   The systemic-silent-failure meta-pattern argues for a unified deep-dive sweep, not 5 separate dispatches. Worth the user explicitly weighing in on next session: deep-dive vs. piecemeal.

3. **F-RI-001 is partially-resolved.** Narrow Promise-chain pattern compiles clean (regression tests pin it); multi-server-fn-in-same-file context STILL fires E-RI-002. The M2 workaround (`@errorMessage = ""` anchor + `setError()` indirection) is preserved verbatim in `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` AND in `pages/customer/load-detail.scrml` (M6 added more workaround usage on signRateConfirmationServer). Don't try to revert the workaround until the file-context fix lands.

4. **22-multifile is silently broken.** master-list E. Examples row was flipped to `[x][❌]`. Don't promote it back without verifying cross-file CE actually works. Ditto `examples/23-trucking-dispatch/components/` — the components dir exists with 8 component files, but they're NOT used by any consumer page (M2's pattern was inline-only, M3-M6 followed). The components dir is type-export host + helper-fn host only. Don't refactor pages to "use the components" until F-COMPONENT-001 is fixed end-to-end.

5. **Validation principle is THE through-line of S50.** Per S49 user-voice (still in force): *"if the compiler is happy, the program should be good."* Every P0 in the FRICTION.md list violates this. The dispatch app's load-bearing artifact is FRICTION.md — the P0 sweep is the deliverable, not the running app.

6. **The dispatch app does NOT actually run today.** Two blockers: (a) OQ-2 — dev server fails to import every server.js with `Cannot find package 'scrml:auth'` and `Unexpected .`/`;`; (b) F-COMPILE-001 — even if dev server worked, customer/home + customer/profile + 2/3 load-detail pages are not in dist. The "compile clean" verdict was misleading throughout M3-M5 because the agents didn't audit input-count vs output-count. Smoke testing was deferred and never happened.

7. **Worktree creation off stale main was a recurring pattern.** Every isolation: "worktree" dispatch this session created the worktree off origin/main rather than local main. Workaround: brief includes explicit rebase prelude. Worked for Phase 2g resume (after first dispatch's worktree was off `a70c6aa`), F-RI-001, F-COMPONENT-001, and all 6 milestone dispatches. Keep this prelude in every isolation: "worktree" brief going forward. Cause: harness uses origin/main as branch base. Fix would be either pushing more often OR getting harness to use local main.

8. **Authorization scope discipline.** Each milestone dispatch is its own action. User explicitly authorized M1, M2, M3, M4, M5, M6 individually + each triage + the wrap. S50's "go" pattern was per-milestone, not session-scoped. Next session should NOT carry forward an autonomy directive — re-confirm per action.

9. **Push state at S50 close (BOTH repos) IS authorized — user said "fat wrap" in message that included push.** scrmlTS at 57 ahead pre-push; scrml-support has Phase 2g deep-dive untracked + needs user-voice S50 append. Both should be pushed at session close.

10. **Cross-machine sync hygiene.** S43 directive: every session-end push, every session-start fetch. S50 close pushes both repos to origin so the other machine has continuity.

11. **`is not`/`is some` adoption.** F-IDIOMATIC-001 P2 observation: zero adopter reach across 8,200 LOC. Next session could re-grep at any point to confirm trend. If the deep-dive sweep extends `is not` to member-access (F-RI-001-FOLLOW), the question is whether adopters would START reaching for it once it reliably works. Worth tracking as a long-term ecosystem-identity signal.

12. **Component overloading scaffold (`emit-overloads.ts`, 60 LOC) STILL ships dead** — no unit tests, no samples. SPEC-ISSUE-010 still gates it. Pre-S50 carry-forward; not touched in S50.

13. **Tutorial Pass 3-5 (~30h) STILL not started.** Pre-S50 carry-forward.

14. **5 unpublished article drafts STILL pending.** Pre-S50 carry-forward; user said "no amendments for now" S49.

15. **Master inbox 2 stale messages (S26 giti, S43 reconciliation) STILL OPEN** at S50 open per S49 hand-off. PA didn't touch master inbox this session.

---

## 6. Open questions to surface immediately at S51 open

- **Push state confirmed at S50 close?** Both scrmlTS + scrml-support pushed.
- **First move on S51?** Plausible candidates:
  - Triage F-COMPILE-001 (likely narrow codegen-output-path fix)
  - Triage F-NULL-001 + F-NULL-002 (smaller; pair them since both are null-literal handling)
  - Open the systemic-silent-failure deep-dive (architectural; unifies 5 P0 + several P1)
  - Continue dispatch app: smoke-test once F-COMPILE-001 + OQ-2 are fixed, then exercise the seeded flows end-to-end
- **OQ-2 status?** Dev server `scrml:auth` import bootstrap. Known to fail M1 onward; pre-existing on main; couldn't smoke-test ever.
- **F-RI-001 file-context fix?** The narrow tests pass; the real shape doesn't. Worth a deeper RI dispatch?
- **Component overloading + Tutorial Pass 3-5 + 5 unpublished articles** — multi-session carry-forward; due any session?

---

## 7. User direction summary (the through-line)

Verbatim user statements + interpretations (S50). Captured here for hand-off completeness; will also append to `scrml-support/user-voice-scrmlTS.md` per pa.md:

### S50 open
> "read pa.md and start session"

PA followed session-start checklist. Sync clean both repos. Read last 10 contentful user-voice entries.

### Pipeline overview prompt
> "lets look at masterlist and see what all is in the pipe next"

Surfaced the carry-forward queue. PA recommended Phase 2g+2h then dispatch app.

### Sequencing decisions
> "we also have the 3 - 5 k loc examp to get to"

User surfacing the dispatch app as the load-bearing language stress test.

> "looks good. lets do that in that order"

Approved Option A: Phase 2g+2h first, dispatch app after.

### Phase 2g
> "green"

Greenlit Phase 2g recon (deep-dive at scrml-support).

> "green light"

Greenlit Phase 2g recommended approach (A + W-keep-chain-only + per-branch mixed-cleanliness dispatch). "If no debate desired (default). Greenlight A + W-keep-chain-only + per-branch mixed-cleanliness dispatch" — accepted on first read; no debate needed.

> "go"

Greenlit Phase 2g T2 dispatch via scrml-dev-pipeline.

> "go" (post-merge)

Authorized merge to main.

### Sequencing
> "looks good. lets do that in that order"

Phase 2g+2h first → 3-5k LOC dispatch app. PA followed; eventually skipped 2h (samples blocked on upstream errors).

### Dispatch app scoping
> "all three. 3 roles, yes realtime 5000 loc or more if needed, go"

Locked: all-three slices integrated, 3 personas, real-time, 5,000+ LOC ceiling (no artificial constraint).

> "auth= , self register, the rest looks good"

Locked: Option A `auth="role:X"` (deliberately surface the silent-inert friction), customer self-register YES. Other open questions accepted as proposed.

### Per-milestone greenlights
> "go" (M1), "1" (M4 from menu), "green" (M3), "1" (M4 again actually push M4), "yes, then 5" (F-IDIOMATIC + push M5), "2 push on" (push M6 with F-COMPILE-001 known-broken)

### Triage decisions
> "B go"

After F-COMPONENT-001 architectural finding, user picked Plan B: park as known-broken with proper documentation, unblock M3-M6 with inline-only pattern, deep-dive scheduled post-M6.

### User-prompted findings (high-value)
> "has any code used 'is not' 'is some'?"

→ Zero usage across 5,650 LOC. Logged as F-IDIOMATIC-001.

> "are we actually compiling all code?"

→ THE meta-prompt of S50. Audit revealed F-COMPILE-001: 32 source → 17 HTML output (15 silent overwrites). The largest finding of the session.

> "yes, then 5"

Approved F-IDIOMATIC-001 entry + push M5.

### Wrap directive
> "once this is done we can do a fat wrap, get everything ready for next session. dont plan just pass along all the needed info"

Authorized: M6 finish, then fat wrap with full info pass-through to next session. Push authorized as part of wrap.

### Through-line
- User mode: "go go" sequencing across multiple greenlights — fast cadence, per-action authorization.
- Validation principle (locked S49) reinforced in S50 by every P0 finding being a violation of it. The dispatch app's purpose (per scoping doc) was specifically to surface this pattern — and it did, 5+ times.
- Adopter-friction + production-grade language goal preserved.
- No amendments to published articles. No reactivating known-broken examples.

---

## 8. Tasks (state at S50 close)

| # | Subject | State |
|---|---|---|
| Phase 2g (chain branches mount/unmount) | T2 fix | ✅ DONE — merge `b362b33` |
| Phase 2h (sample-suite verification sweep) | T1 follow-on | SKIPPED — §7 allow-list samples blocked on pre-existing upstream errors; Phase 2g unit tests cover observable shapes |
| F-RI-001 triage | T2 doc fix + tests | ⚠️ PARTIAL — narrow patterns work; file-context still fails; M2 workaround preserved |
| F-COMPONENT-001 triage | T2 → BLOCKED | ARCHITECTURAL (Plan B parked) — deep-dive needed |
| Trucking dispatch app | 3-5k LOC stress test | ✅ ALL 6 MILESTONES SHIPPED — ~8,200 LOC total |
| F-IDIOMATIC-001 logged | observation | ✅ DONE |
| F-COMPILE-001 logged | P0 architectural | ✅ DOC ONLY — fix triage queued for next session |
| Master inbox stale messages (S26 giti, S43 reconciliation) | move to read/ | OPEN — carry-forward |
| Component overloading tutorial | gated on SPEC-ISSUE-010 | DEFERRED |
| Tutorial Pass 3-5 (~30h) | docs | NOT STARTED |
| 5 unpublished article drafts | user-driven publish | PENDING |
| `scrml migrate` CLI command | T2 fix | OPEN |
| Comprehensive SPEC-INDEX realign | bookkeeping | PARTIAL |
| Audit row 184 (`class={expr}`) | SPEC-ISSUE-013 | OPEN |
| Audit row 250 (HTML spec version) | SPEC-ISSUE-005 | OPEN |
| F-COMPILE-001 fix | P0 codegen path | OPEN |
| F-AUTH-002 fix | cross-file SQL portability | OPEN |
| F-MACHINE-001 fix | machine type imports | OPEN |
| F-NULL-001 + F-NULL-002 fix | asymmetric null-literal handling | OPEN |
| OQ-2 fix | dev server scrml:auth bootstrap | OPEN |
| Systemic silent-failure deep-dive | architectural sweep | RECOMMENDED — covers F-AUTH-001/CHANNEL-001/COMPONENT-001/COMPILE-001 |

---

## 9. needs:push state

scrmlTS commits on `main`: **57 ahead of origin** at this hand-off write (will be 60+ after the wrap commits + this hand-off + master-list + changelog).

scrml-support commits on `main`: 0 ahead of origin BUT has untracked `phase-2g-chain-mount-strategy-2026-04-29.md` deep-dive + needs user-voice S50 append.

**S50 close: PUSH AUTHORIZED** by user ("fat wrap, get everything ready for next session"). Both repos pushed at session close.

---

## 10. File modification inventory (forensic — at S50 close)

### scrmlTS — modified files this session

**Compiler source (Phase 2g + F-RI-001):**
- `compiler/src/codegen/binding-registry.ts` (+63/-7 — Phase 2g LogicBinding interface for chain shape)
- `compiler/src/codegen/emit-event-wiring.ts` (+119/-7 — Phase 2g chain controller per-branch dispatch)
- `compiler/src/codegen/emit-html.ts` (+163/-33 — Phase 2g chain handler rewrite)
- `compiler/src/route-inference.ts` (+23/-7 — F-RI-001 doc-comment fix; lines 34-47 + 1387-1394)

**Tests:**
- `compiler/tests/unit/chain-mount-emission.test.js` (NEW, 483 lines, 31 tests N1-N31)
- `compiler/tests/unit/route-inference-f-ri-001.test.js` (NEW, 429 lines, 7 tests §A 3 + §B 2 + §C 2)
- `compiler/tests/unit/else-if.test.js` (+53/-3 — Phase 2g assertion inversions)

**Spec / docs:**
- `master-list.md` (S50 entries multiple times throughout session — refreshed at close)
- `docs/changelog.md` (S50 entries multiple times — refreshed at close)
- `docs/articles/llm-kickstarter-v1-2026-04-25.md` (cross-file components flagged KNOWN-BROKEN; recipe rewritten)
- `hand-off.md` (this file — S50 mid-session updates + close fat wrap)
- `handOffs/hand-off-51.md` (S49-close rotation, created S50 open)

**Dispatch app (NEW dir):**
- `examples/23-trucking-dispatch/` — 32 .scrml files + README.md + FRICTION.md + dispatch.db (binary 77KB)
- `docs/changes/dispatch-app/scoping.md` (S50 scoping doc, 267 lines)
- `docs/changes/dispatch-app-m{1..6}/progress.md` (per-milestone progress logs)
- `docs/changes/f-ri-001/{pre-snapshot, diagnosis, progress, anomaly-report, repro1-canonical, repro4, repro-follow}.md` + .scrml repros + .gitignore
- `docs/changes/f-component-001/{progress, diagnosis}.md` (322-line architectural diagnosis)
- `docs/changes/phase-2g/{pre-snapshot, progress}.md`

### scrml-support — modified files this session

- `docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md` (UNTRACKED, 753 lines — needs commit + push at S50 close)
- `user-voice-scrmlTS.md` — to be appended at S50 close (S50 entry per §7 above)

---

## Tags
#session-50 #closed #fat-wrap #push-authorized #phase-2g-merged #f-ri-001-partial #f-component-001-architectural #plan-b #dispatch-app-6-milestones-shipped #8200-loc #f-compile-001-major-finding #f-idiomatic-001 #systemic-silent-failure-pattern #post-s50-deep-dive-recommended #cross-machine-sync-clean

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — refreshed S50 close
- [docs/changelog.md](./docs/changelog.md) — S50 close entry
- `examples/23-trucking-dispatch/` — the dispatch app
- `examples/23-trucking-dispatch/FRICTION.md` — 26+ entries (the load-bearing output)
- `examples/23-trucking-dispatch/README.md` — run instructions + persona walkthrough
- `docs/changes/dispatch-app/scoping.md` — locked design
- `docs/changes/f-component-001/diagnosis.md` — architectural BLOCKED writeup
- `docs/changes/f-ri-001/diagnosis.md` — stale-friction triage
- `scrml-support/docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md` — Phase 2g deep-dive
- `scrml-support/user-voice-scrmlTS.md` — S50 entry (appended at close)
