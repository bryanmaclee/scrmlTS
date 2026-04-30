# scrmlTS — Session 50 (OPEN)

**Date opened:** 2026-04-29
**Previous:** `handOffs/hand-off-51.md` (S49 close — wrapped + pushed; rotated at S50 open).
**Baseline entering S50:** scrmlTS at `a70c6aa` (S49 close); clean / **8,094 pass / 40 skip / 0 fail across 383 files**. scrml-support at `e83c993` (S49 close); clean / 0 ahead 0 behind origin.

---

## 0. Session-start checklist (per pa.md §"Session-start checklist")

- [x] Read `pa.md`
- [x] Read `hand-off.md` (S49 closed state)
- [x] Read last ~10 contentful entries from `scrml-support/user-voice-scrmlTS.md` (S46-S49 covered: dev.to article authoring, bio sign-off + Tier 2-3 dispatch, S48 backfill flag, S49 validation principle + parallel autonomy)
- [x] Cross-machine sync check (scrmlTS + scrml-support both 0/0 origin/local; no uncommitted/untracked surprises)
- [x] Rotate `hand-off.md` → `handOffs/hand-off-51.md`
- [x] Create fresh `hand-off.md` (this file)
- [x] Check `handOffs/incoming/*.md` — none (only `dist/` shared assets + `read/` archive)
- [x] Verify baseline tests (`bun test` → 8,094 / 40 / 0 across 383 files at `a70c6aa`)
- [x] Surface caught-up + next priority to user (S50 opener)
- [x] **Phase 2g LANDED** — merge `b362b33` (chain branches mount/unmount via per-branch B1 dispatch). Deep-dive `scrml-support/docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md` (753 lines) → T2 pipeline → merge. Tests **8,094 → 8,125** (+31). Phase 2h SKIPPED per user (deep-dive §7 allow-list samples were found pre-existing-broken upstream; Phase 2g's 31 unit tests cover observable shapes; pivot direct to dispatch app).

---

## 1. Caught-up summary

**S49 was a multi-track parallel fix-the-cracks session ending in a clean wrap + push.** Eight tracks shipped to main:

1. Tutorial Pass 2 (mechanical edits)
2. compiler.* phantom closure (Option B → all 4 audit phantoms closed; 2 pre-existing fails resolved as side effect)
3. W-TAILWIND-001 warning (over-fired initially; PA-corrective edit landed)
4. Phase 2c B1 (if= mount/unmount via template + marker)
5. Tailwind 3 (arbitrary values + variant expansion + compile-time CSS validation)
6. lin Approach B verification (FALSE ALARM — already shipped, audit row 124 amended ✅)
7. E-META-004 numbering gap (reserved-row in §22.11 + §34)
8. Hook drift fix (`.git/hooks/pre-commit` synced to canonical)

**Net delta:** +153 tests (7,941 → 8,094) across 383 files. -2 pre-existing fails resolved (Bootstrap L3 timeout + tokenizer self-host parity). 0 regressions.

**Audit fix-the-cracks scoreboard:** 4 of 5 closed. Item 5 (component overloading tutorial) deferred — SPEC-ISSUE-010 must lock the syntax before tutorial can teach it.

**Distribution shift in audit (post-S49 amendments):** ✅ 53 → 57 / 🟡 22 → 21 / ❌ 10 → 7 / 👻 4 → 0.

**Validation principle locked durable** (S49 user-voice): *"if the compiler is happy, the program should be good."* No silent failures at compiler/runtime boundary. PA recommendations of "pass-through; runtime will reject" are anti-patterns going forward.

---

## 2. Open / pending state at S50 open

| Item | State | Notes |
|---|---|---|
| Tutorial Pass 3-5 (ordering + gap-filling) | NOT STARTED | ~30h estimated |
| Tutorial component overloading | DEFERRED | gated on SPEC-ISSUE-010 |
| Phase 2g (chain branches mount/unmount) | ✅ DONE S50 | merge `b362b33`; Approach A + W-keep-chain-only + per-branch dispatch |
| Phase 2h sample-suite sweep | SKIPPED | §7 allow-list samples blocked on pre-existing upstream errors; Phase 2g unit tests cover observable shapes |
| 3-5k LOC trucking dispatch app (#10) | NOT STARTED | language stress test |
| 5 unpublished article drafts | PENDING | user-driven publish; "no amendments for now" per S49 |
| `scrml migrate` CLI command (audit row 92) | OPEN | T2 fix opportunity; adopter friction |
| Comprehensive SPEC-INDEX realign | PARTIAL | header + §26/§27/§34 refreshed S49; rest deferred |
| Audit row 165-169 (nested `<program>` claims) | DEFERRED | "no amendments to published articles for now" |
| Audit row 183 (Tailwind custom theme) | DEFERRED | v2 |
| Audit row 184 (`class={expr}`) | OPEN | SPEC-ISSUE-013, separately tracked |
| Audit row 250 (targeted HTML spec version) | OPEN | SPEC-ISSUE-005, minor |

---

## 3. ⚠️ Things this session needs to NOT screw up (carry-forward from S49)

1. **The 7 remaining ❌ rows** — most are user-deferred or tracked-elsewhere. DO NOT pick up without explicit user direction.
2. **Phase 2c B1 covers only NARROW path** — clean-subtree single if= elements only. 2g (chain branches) is real T2 work; 2h is small T1 sweep gated on a curated allow-list. Don't assume Phase 2 is fully done.
3. **The S49 if-chain-strip precursor (`934f62d`)** decoupled chain handling from B1 emission. Chain branches use `data-scrml-if-chain` wrapper + display-toggle; B1 only applies to single non-chain if=.
4. **`runtime-template.js` template-literal-of-JSDoc-with-backticks trap** still — future runtime-helper additions need `\\\``-escaping for JSDoc backticks (existing escapes at line 623 are reference pattern).
5. **Validation principle is load-bearing for ALL future feature design** (S49 user-voice). PA recommendations of "pass-through; runtime will reject" are anti-patterns.
6. **W-TAILWIND-001 + Tailwind 3 had a coordination gap in S49** — when feature-X is in flight, dispatch-Y that depends on X's behavior must explicitly note the assumed pre-state OR be deferred until X lands.
7. **Audit's "10 ❌" claim** is internally inconsistent with raw matrix grep of 24 ❌ markers. The 10 represents the most-prominent unqualified rows. Future audit work should explicitly enumerate which rows count toward the distribution claim.
8. **Component overloading scaffold** (`emit-overloads.ts`, 60 LOC) ships dispatch on `__scrml_state_type` runtime tag but has no unit tests + no samples. Could be dead code OR pre-locking-of-syntax scaffold.
9. **Authorization scope discipline** — S49 had a session-scoped autonomy directive ("merge to main is fine" + "go go go"). That does NOT carry into S50. Re-confirm before any merge / push / cross-repo write.
10. **Worktree-isolation pattern (S42 finding F4)** — every dispatch with `isolation: "worktree"` MUST include the startup verification block from pa.md §"Worktree-isolation: startup verification + path discipline."

---

## 4. Open questions to surface immediately

- **Next priority?** No carry-forward task is auto-promoted. Wait for user direction.
- **Authorization scope?** S49's broad autonomy directive does NOT carry into S50.
- **Any cross-repo notice to land?** None pending.

---

## 5. State-as-of-open tables

### Test counts

| Checkpoint | Pass | Skip | Fail | Files |
|---|---|---|---|---|
| `bun test` (S50 baseline at S49 close) | 8,094 | 40 | 0 | 383 |
| Phase 2g merge (`b362b33`) | **8,125** | 40 | 0 | **384** |

### Repo state

| Repo | HEAD | Ahead | Behind | Working tree |
|---|---|---|---|---|
| scrmlTS | `b362b33` | 7 | 0 | clean (mod hand-off.md + master-list.md + changelog.md from S50 bookkeeping) |
| scrml-support | `e83c993` | 0 | 0 | clean (Phase 2g deep-dive already pushed at S49 close) |

### Phase 2g — merged

| Item | Value |
|---|---|
| Branch | `changes/phase-2g-chain-mount` (worktree at `.claude/worktrees/agent-a029b575e76ac3d3b/`) |
| Merge commit | `b362b33 merge: Phase 2g — if=/else-if=/else chain branches mount/unmount via per-branch B1 dispatch (S50)` |
| Branch commits | `8522b95` pre-snapshot · `6bdcea8` Step 1 emit-html · `625f232` Step 2 binding-registry · `2a02ffd` Step 3 emit-event-wiring · `bf64bb4` Step 4 chain-mount-emission tests · `6b19911` finalize progress.md |
| Files touched | `compiler/src/codegen/binding-registry.ts` · `compiler/src/codegen/emit-event-wiring.ts` · `compiler/src/codegen/emit-html.ts` · `compiler/tests/unit/chain-mount-emission.test.js` (NEW) · `compiler/tests/unit/else-if.test.js` · `docs/changes/phase-2g/{pre-snapshot,progress}.md` |
| Diff stat | +1,035 / -79 across 7 files |
| Routed-to-Phase-2h findings | (a) Pre-existing chain-controller condition-emission bug `if=@var == lit` (NOT 2g regression); (b) 6/6 §7 allow-list samples fail upstream pipeline errors; (c) chain-test fixture 099 expected E-CTRL-001 |
| Phase 2h status | SKIPPED — pivot direct to dispatch app |

### Inbox

| Path | Count |
|---|---|
| `handOffs/incoming/*.md` (this repo) | 0 unread |

---

## Tags
#session-50 #open #post-s49-clean-wrap #baseline-8094-40-0 #cross-machine-sync-clean #validation-principle-active #autonomy-not-carried

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/changelog.md](./docs/changelog.md)
- [handOffs/hand-off-51.md](./handOffs/hand-off-51.md) — S49 close
