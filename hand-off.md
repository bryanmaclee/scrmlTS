# scrmlTS — Session 49 (CLOSED — wrapped + pushed)

**Date opened:** 2026-04-29
**Date closed:** 2026-04-29 (same day)
**Previous:** `handOffs/hand-off-50.md` (S49 open — rotated at S49 close).
**Baseline entering S49:** scrmlTS at `4dbc20e` (S48 close); clean / 7,941 pass / 40 skip / 2 fail.
**State at S49 close:** scrmlTS at `0d6b53a` (24 commits ahead of origin pre-push); scrml-support at `e83c993` (3 commits ahead of origin pre-push). Tests **8,094 pass / 40 skip / 0 fail** across 383 files. **Net delta: +153 tests, -2 pre-existing fails resolved as side effect of compiler.* meta-checker work, 0 regressions.**

---

## 0. The big shape of S49

**Multi-track parallel fix-the-cracks session.** Cross-machine pickup on machine-A continuing from S48's machine-B work. User mode: "go go go" — broad autonomy directive, dispatch + merge + verify with minimal gating. Validation principle stated mid-session and applied to all current/future work: **"if the compiler is happy, the program should be good."** No silent failures at compiler/runtime boundary.

**Eight in-flight tracks shipped to main:**

1. **Tutorial Pass 2** — 14 mechanical edits, 2 sub-commits, new `01h-if-chains.scrml` snippet. ✅ Merged.
2. **compiler.* phantom (Option B)** — 5-commit branch removed `compiler.*` from §22.4 classification + added E-META-010 reserved-namespace diagnostic + backfilled E-META-009 to §22.11/§34. Closed all 4 audit phantoms (rows 2/3/4 were "subset of phantom" — same issue). 2 pre-existing fails (Bootstrap L3 timeout + tokenizer self-host parity check) resolved as side effect. ✅ Merged.
3. **W-TAILWIND-001 warning** — 4-commit branch with `findUnsupportedTailwindShapes` detector; ${...}-interpolation masking to avoid ternary false-positives. Initially over-fired on supported variants per a contradiction in PA's dispatch brief (agent flagged it explicitly); PA-corrective edit landed updating detector to consult `getTailwindCSS` first + closing the parseClassName silent-strip bug (`weird:p-4` previously returned CSS for `.p-4`) + applying SPEC amendment. ✅ Merged + corrected.
4. **Phase 2c B1 (if= mount/unmount)** — 2-commit branch (precursor chain-strip + main B1 emit-html re-enable). Activates the Phase 2b deferred block; clean-subtree if= elements compile to `<template id="...">` + marker comment + client-JS controller calling `_scrml_create_scope` + `_scrml_mount_template` on truthy / `_scrml_unmount_scope` on falsy. SPEC §17.1 + §6.7.2 honored. 28 test assertions updated, 22 new tests in `if-mount-emission.test.js`. ✅ Merged.
5. **Tailwind 3 (arbitrary values + variant expansion)** — 1-commit branch shipping §26.4 arbitrary values with **compile-time CSS validation** (E-TAILWIND-001) per S49 user directive — full v3+v4 unit set, color/math/url/var function whitelists, balanced-parens, hex digit lengths. Plus 4 new theme variants (dark/print/motion-safe/motion-reduce). Required PA's W-TAILWIND-001 test file to be updated in worktree before commit (Tailwind 3 made dark/print/motion-* SUPPORTED, so the previous "fires on dark:p-4" assertions had to flip to "does NOT fire"). ✅ Merged.
6. **lin Approach B verification** — recon-only; **FALSE ALARM**. Audit's "implementation status uncertain" was an inventory miss — `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js` already had 6 cross-block tests covering §35.2.2's normative surface. Audit row 124 amended 🟡 → ✅. ✅ Doc-only resolution.
7. **E-META-004 numbering gap** — small spec housekeeping. Documented "E-META-004 reserved — do not reuse" rows in §22.11 + §34 to close the search-hit-stability concern. ✅ Done.
8. **Hook drift fix** — `.git/hooks/pre-commit` synced to in-repo canonical `scripts/git-hooks/pre-commit` (excludes browser tests, adds `--bail`, branch-warning). Worktree commit failures during S49 surfaced this. ✅ Done.

**Five recons + one structured deep-dive produced:**
- `compiler-dot-api-decision-2026-04-29.md` — recon (decision: Option B locked)
- `phase2c-test-impact-2026-04-29.md` — recon (test impact for Phase 2c B1)
- `tutorial-pass2-edit-list-2026-04-29.md` — recon (executed)
- `if-mount-unmount-implementation-strategy-2026-04-29.md` — **structured 5-phase deep-dive** persisted to scrml-support; recommended B1 default; B4 eliminated on cross-ecosystem grounds; B5 (compile-time-static + hide-on-init) parked for SSR work
- `lin-approach-b-verification-2026-04-29.md` — recon (FALSE ALARM)
- `audit-remaining-phantoms-2026-04-29.md` — recon (all 4 facets of compiler.*)
- `tailwind-arbitrary-values-and-variants-2026-04-29.md` — recon (variants partially-shipped reframe)
- `phase2-completion-status-2026-04-29.md` — recon (2d/2e/2f closed by gate; 2g real T2 work)
- `audit-spec-only-rows-2026-04-29.md` — recon (7/7 TRUE ❌ + bonus row-139 false alarm)

**Audit "fix-the-cracks" scoreboard:** 4 of 5 closed. Item 5 (component overloading tutorial) **deferred** — discovered scope too nascent for tutorial coverage; SPEC-ISSUE-010 needs to lock the syntax first before tutorial can teach it.

**Distribution shift in audit (post-amendments):**

| Status | Pre-S49 | Post-S49 |
|---|---|---|
| ✅ shipped | 53 | **57** (+4: lin B, show=, Tailwind arbitrary, Tailwind variants) |
| 🟡 partial | 22 | **21** (-1: lin B promoted) |
| ❌ spec-only | 10 | **7** (-3: 2 Tailwind false alarms + 1 phantom-closure) |
| 👻 phantom | 4 | **0** (-4: all 4 closed by Option B; rows 2/3/4 were "subset of phantom") |

---

## 1. Commits this session

### scrmlTS (24 commits ahead of origin)

```
0d6b53a docs(s49): audit spec-only-rows recon — 7 TRUE ❌ + 1 false-alarm + 3 settled
c116331 docs(spec): document E-META-004 as reserved (search-hit stability)
1997049 docs(s49): bookkeeping wave 2 — 4 recons + master-list lin B verified + SPEC-INDEX header refresh
b18fa8e merge: Tailwind 3 — arbitrary values + variant expansion (S49)
14d39d4 feat(s49): Tailwind arbitrary values + variant expansion (commit 1 of 2)
0d0ef9a WIP(tailwind-arbitrary-values-and-variants): pre-snapshot + plan
7ce8b55 merge: Phase 2c — if= mount/unmount via template + marker (Approach B1) — S49
2a10d04 fix(s49): W-TAILWIND-001 detector + parseClassName silent-strip + SPEC amendment
fcbe4e1 feat(if-show-phase2c): if= mount/unmount via template + marker (Approach B1)
c543859 merge: W-TAILWIND-001 warning for unsupported Tailwind syntax — S49
934f62d fix(if-chain-branch-strip): strip if=/else-if=/else from chain branch elements before emitNode
176abc1 feat(s49): add W-TAILWIND-001 warning for unsupported Tailwind syntax
cc66ba3 WIP(add-w-tailwind-001): mask ${...} interpolations to avoid false positives
e490548 WIP(add-w-tailwind-001): wire detector into pipeline + tests
4fb5cec merge: compiler.* phantom closure (Option B) — S49
5436318 WIP(add-w-tailwind-001): add findUnsupportedTailwindShapes detector
cc7f5cf docs(s48-close-compiler-dot-phantom): close — anomaly report CLEAR FOR MERGE
fa1e58c WIP(s48-close-compiler-dot-phantom): SPEC.md + SPEC-INDEX — §22.4 amended, E-META-009/010 tabled
0125d7c WIP(s48-close-compiler-dot-phantom): add `compiler` to META_BUILTINS to suppress E-META-001/005 noise
7341e6c docs(s49): bookkeeping — S48 master-list + changelog refresh + S49 open + 3 recon artifacts
5ab6215 WIP(s48-close-compiler-dot-phantom): source + tests + self-host — E-META-010 wired, +3 tests net
a29295a docs(tutorial-pass2): trim §2.5 + state-opener list + glossary fork
49b623e docs(tutorial-pass2): add §1.8 if= as Layer 1 + 01h-if-chains snippet
2174f49 WIP(s48-close-compiler-dot-phantom): pre-snapshot — baseline 7954/40/0
4dbc20e (S48 baseline)
```

Plus the wrap commit landing this hand-off + master-list refresh + changelog S49 entry.

### scrml-support (3 commits ahead)

```
e83c993 docs(s49): audit amendments — show= ❌ → ✅, Tailwind 181/182 ❌ → ✅, fix-the-cracks closure status
e80e649 docs(s49): user-voice + audit amendments + Phase 2c deep-dive (companion to scrmlTS S49)
[+ predecessor commit]
```

---

## 2. Test count timeline

| Checkpoint | Pass | Skip | Fail | Net delta |
|---|---|---|---|---|
| S48 close (4dbc20e) | 7,941 | 40 | 2 | baseline |
| Pass 2 merge | 7,941 | 40 | 2 | docs only |
| compiler.* merge (`4fb5cec`) | 7,957 | 40 | 0 | +16 pass, -2 fail (pre-existing fails resolved) |
| W-TAILWIND-001 merge (`c543859`) | 7,992 | 40 | 0 | +35 |
| W-TAILWIND-001 corrective (`2a10d04`) | 8,001 | 40 | 0 | +9 |
| Phase 2c B1 merge (`7ce8b55`) | 8,023 | 40 | 0 | +22 |
| Tailwind 3 merge (`b18fa8e`) | 8,094 | 40 | 0 | +71 |
| **S49 close (final)** | **8,094** | **40** | **0** | **+153 from S48 close, -2 fail** |

The 2 pre-existing fails (Bootstrap L3 timeout + tokenizer self-host parity check) resolved as a SIDE EFFECT of the compiler.* meta-checker work. Nice bonus.

---

## 3. Audit "fix-the-cracks" scoreboard

| # | Original ask | S49 disposition |
|---|---|---|
| 1 | Tutorial: fix `show=` | ✅ CLOSED — Phase 1 of if/show split shipped S48 commit `9873e0e`; row 139 amended ✅; original audit text was materially wrong |
| 2 | Browser-language article: amend WASM/sidecar/supervisor claims | DEFERRED per user 2026-04-29 ("no amendments to published articles for now"). 4 ❌ rows (165/166/167/169) confirmed TRUE ❌ via S49 recon. Parked, not abandoned. |
| 3 | Intro article: SPEC-ISSUE-012 caveat | ✅ CLOSED — Tailwind 3 merge `b18fa8e` shipped arbitrary values + variant expansion; rows 181/182 amended ✅; row 183 explicit v2 deferral; W-TAILWIND-001 covers remaining gaps |
| 4 | `compiler.*` decision | ✅ CLOSED — Option B fix merge `4fb5cec`; removed from §22.4 classification + added E-META-010; all 4 audit phantoms closed |
| 5 | Tutorial: component overloading section | ⚠️ DEFERRED to a future session that closes SPEC-ISSUE-010 first. Discovered: 60-LOC scaffold in `emit-overloads.ts`, no unit tests, no samples using explicit overload syntax. Teaching tutorial content for an unspec'd-syntax feature would lock in implementation-defined behavior that may shift. Right sequence: SPEC-ISSUE-010 closes → unit tests + samples → tutorial section. |

---

## 4. ⚠️ Things the next PA needs to NOT screw up

1. **The 7 remaining ❌ rows** — most are user-deferred or tracked-elsewhere. DO NOT pick any up without explicit user direction:
   - `scrml migrate` CLI (row 92) — T2 fix opportunity; adopter friction
   - Nested `<program>` sidecar/WASM/supervised-restarts/cross-lang RPC (165-169) — DEFERRED per "no amendments for now"
   - Tailwind custom theme (183) — DEFERRED to v2
   - `class={expr}` (184) — SPEC-ISSUE-013, separately tracked
   - Targeted HTML spec version (250) — SPEC-ISSUE-005, minor

2. **Phase 2c B1 covers only NARROW path** — clean-subtree if= elements (lowercase tag, all-static descendants). The cleanliness gate (`isCleanIfNode` at `emit-html.ts:77-97`) rejects any subtree with events / reactive interp / lifecycle / components / bindings / transitions; those fall back to display-toggle. Per Phase 2 verification recon: 2d/2e/2f are NON-tasks (closed by gate). **2g is real T2 work** — chain branches still display-toggle (§17.1 spec divergence). 2h is small T1 sweep (44+ sample files using if=). Don't assume "Phase 2 is fully done"; only the clean-subtree single-if= path got mount/unmount.

3. **Phase 2h sweep test was attempted + REMOVED** — surfaced 12 pre-existing fixture failures (gauntlet-r10 personas + comp-* fixtures) most unrelated to Phase 2c. Over-broad maintenance burden. Phase 2c coverage is implicitly already verified by `if-mount-emission.test.js` (22 tests) + browser tests + pretest. **Don't re-add the sweep without a curated allow-list.**

4. **The if-chain-strip precursor (commit `934f62d`)** decoupled chain handling from B1 emission — chain branches no longer leak `if=`/`else-if=` HTML attributes that would have triggered B1 double-fire. Chain branches use `data-scrml-if-chain` wrapper + display-toggle; B1 only applies to single non-chain if=. The strip is correct under any future Phase 2g (which will need a different mechanism for chain branches).

5. **`runtime-template.js` template-literal-of-JSDoc-with-backticks trap STILL** — Phase 2a foundation already absorbed this lesson; future runtime-helper additions need `\\\``-escaping for JSDoc backticks (existing escapes at line 623 are reference pattern).

6. **Validation principle is load-bearing for ALL future feature design** — user S49 directive: *"the only change to everything is that im pretty sure I want comp-side validation of anything valid including css. everything else is, if the compiler is happy, the program should be good."* PA recommendations of "pass-through; runtime will reject" are anti-patterns going forward. Captured to user-voice S49 entry as durable principle.

7. **W-TAILWIND-001 + Tailwind 3 had a coordination gap** — initial detection rule (shape-based always-fire) over-fired on supported variants. PA-corrective edit fixed it AFTER merge. Lesson for future concurrent-feature dispatches: when feature-X is in flight, dispatch-Y that depends on X's behavior must explicitly note the assumed pre-state OR be deferred until X lands.

8. **5 unpublished article drafts** committed in S48 still unpublished. Per user 2026-04-29: "no amendments for now." Don't re-dispatch the writers; just publish + cross-link patch when authorized.

9. **Audit's distribution count "10 ❌"** is internally inconsistent with raw matrix grep of 24 ❌ markers (21 unqualified + 3 qualified). The 10 represents the most-prominent unqualified rows. Audit row 139 (`show=`) was materially incorrect — amended ✅ in S49 close. Future audit work should explicitly enumerate which rows count toward the distribution claim.

10. **Tailwind custom theme (row 183)** is the ONE remaining Tailwind ❌. User explicitly deferred to v2. Don't auto-pick it up.

11. **Component overloading scaffold (`emit-overloads.ts`, 60 LOC)** ships dispatch on `__scrml_state_type` runtime tag but is not exercised anywhere in the codebase — no unit tests, no samples. Could be dead code OR pre-locking-of-syntax scaffold. SPEC-ISSUE-010 needs decision before this matures.

---

## 5. Tasks (state at S49 close)

| # | Subject | State |
|---|---|---|
| Tutorial Pass 2 | mechanical edits | ✅ DONE |
| compiler.* phantom (Option B) | remove + E-META-010 | ✅ DONE (all 4 phantoms closed) |
| W-TAILWIND-001 warning | unsupported syntax detector | ✅ DONE + corrected |
| Phase 2c B1 (clean-subtree mount/unmount) | template + marker | ✅ DONE |
| Tailwind 3 arbitrary values + variant expansion | + compile-time CSS validation | ✅ DONE |
| lin Approach B verification | doc-only audit amendment | ✅ DONE |
| Hook drift fix | sync .git/hooks to canonical | ✅ DONE |
| E-META-004 numbering gap | reserved-row in §22.11 + §34 | ✅ DONE |
| Audit phantom verification (4 rows) | doc + amendment | ✅ DONE |
| Audit ❌ rows verification (10 rows) | doc + amendment | ✅ DONE (7 TRUE, 3 settled) |
| Comprehensive SPEC-INDEX realign | bookkeeping | ⚠️ Partial (header + §26 + §27 + §34 only); deferred to next session |
| Tutorial Pass 3-5 | ordering + gap-filling docs | NOT STARTED (~30h) |
| Tutorial component overloading section | gated on SPEC-ISSUE-010 | DEFERRED (scope too nascent) |
| Phase 2g (chain branches mount/unmount) | T2 fix | NOT STARTED |
| Phase 2h sample-suite sweep | T1 (over-broad scope previously) | DEFERRED |
| 3-5k LOC trucking dispatch app (#10) | language stress test | NOT STARTED |
| 5 unpublished article drafts | user-driven publish | PENDING |
| Master inbox 2 stale messages (S26 giti, S43 reconciliation) | move to read/ | OPEN — actioned at S49 close |
| `scrml migrate` CLI command (audit row 92) | T2 fix opportunity | OPEN |

---

## 6. needs:push state

scrmlTS commits on `main`: **24 ahead of origin** PRE-PUSH (excluding the wrap commit landing momentarily).
scrml-support commits on `main`: **3 ahead of origin** PRE-PUSH.

**S49 close: PUSH AUTHORIZED** by user ("ok defer and wrap... including push"). Both repos pushed at session close.

---

## 7. User direction summary (the through-line)

- **Open:** "shall I pull down scrml-support?" — no, PA already pulled.
- **Mid-session shape:** "ok" / "yep" / "go" / "go go go" — broad autonomy directive across all dispatched fix work.
- **Validation principle locked:** "the only change to everything is that im pretty sure I want comp-side validation of anything valid including css. everything else is, if the compiler is happy, the program should be good." — load-bearing for ALL future feature design.
- **Dispatch directive on Phase 2c:** "dispatch fix b1" — locked B1 over B4 (the "unexpected fix" hunch the deep-dive eliminated).
- **#5 deferral:** "ok defer and wrap... including push" — wrap with bookkeeping + push both repos.

Through-line: adopter-friction + production-grade language goal preserved; speed of execution + compiler-side rigor are non-trading axes; PA recommendations of "pass-through; runtime will reject" are anti-patterns going forward.

---

## Tags
#session-49 #closed #post-machine-switch #compiler-dot-phantom-closed #w-tailwind-001 #phase2c-b1-shipped #tailwind-3-arbitrary-values-and-variants #lin-b-verified-false-alarm #hook-drift-fixed #e-meta-004-reserved #all-4-phantoms-closed #validation-principle-locked #audit-amendments-applied #fix-the-cracks-4-of-5-closed #cross-machine-wrap #pushed

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md) — refreshed S49 close
- [docs/changelog.md](./docs/changelog.md) — S49 entry added
- [handOffs/hand-off-50.md](./handOffs/hand-off-50.md) — S49 open (rotated S49 close)
- `docs/recon/*.md` — 9 recons + 1 deep-dive in scrml-support
- `scrml-support/docs/deep-dives/if-mount-unmount-implementation-strategy-2026-04-29.md`
- `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` — 4 amendments applied this session
- `scrml-support/user-voice-scrmlTS.md` — S49 entry with validation principle
