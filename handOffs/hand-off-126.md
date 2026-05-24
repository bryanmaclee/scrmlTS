# scrmlTS — Session 123 (CLOSE)

**Date:** 2026-05-23
**Previous:** `handOffs/hand-off-125.md` (S122 CLOSE — rotated at S123 OPEN)
**Machine:** SWITCHING — user has notified next session will be from other machine
**HEAD at S123 OPEN:** `c2d93544` · **HEAD at S123 CLOSE:** `3151f3c8`
**Wrap:** full 8-step. Push **authorized** ("wrap and push") — BOTH repos (scrmlTS + scrml-support).

---

## S123 net outcome

**~12-hour focused session — 10 commits, +26 tests, 0 regressions.**

For the full session narrative + per-unit detail see:
- `master-list.md` §0.6 S123 entry (top of "Surfaced divergences / queued follow-ups" block)
- `docs/changelog.md` 2026-05-23 S123 CLOSE entry (cross-session audit trail)
- `../scrml-support/user-voice-scrmlTS.md` Session 123 (user verbatim + dispositions)

**Four architectural arcs (sequential):**

1. **R4 OUTER wrap surface CLOSED** — U3/U4/U5 sequential (`05e48343` / `385c17ea` / `2d72820d`). `translateExpr` wired at all OUTER ride-through sites in `compiler/native-parser/translate-stmt.js`. `makeGuardedExprNode` covered transitively via `makeBareExpr` (R4-U1). The R4-U6 first attempt STOPPED (`e86b7558`) — wip-patch surfaced 5 new regressions; reverted, root-caused, three forward paths surfaced.

2. **V-kill** — auto-state-cell synth kill per `scrml-support/docs/deep-dives/auto-state-cell-synthesis-investigation-2026-05-23.md` Verdict B.
   - Base `c22b3fda` — Approach-B pivot from DD's `kind: "reactive-assign"` rename (would have cascaded 111 test failures across 73 downstream files): TAG-NOT-RENAME (`_isReactiveAssign: true` on `state-decl`). SYM PASS 3 fires `E-STATE-UNDECLARED` on tagged-decl miss.
   - Native-parser exemption `c2d2741a` — path-based exemption for `compiler/native-parser/*.scrml` self-host mirrors (sunsets at M6.7/M6.8 cutover).
   - Sample migration `489e5943` — 6 sample files converted file-root `@cell = init` → `<cell> = init` (V5-strict structural decl). 87 fires → 0.
   - SPEC §6.1.1 + §6.1.2 + §34 amendments. **READ-side fire DEFERRED** (engine var-name canonicalization unblocker).

3. **Unit CC** `9c06053f` — companion to V-kill, default-logic body-top enforcement per S122 Option-2 ratification. Bare `@x = expr` at IMMEDIATE body-top of `<program>` / `<page>` / `<channel>` fires `E-WRITE-NOT-IN-LOGIC-CONTEXT`. New `TOPLEVEL_AT_WRITE_RE` lift + `isDefaultLogicBody` discriminator + `_nestedBlockDepth` counter. SPEC §40.8 + §34 amendments. **Per-file exemption list ships EMPTY** — actual corpus scan found only 4 fires (all in `handOffs/incoming/read/*.scrml` bug-repro files; they SHOULD fire). PA's pre-flight estimate of 110 files was over-broad — meta-finding captured in user-voice S123. **Bug Q (6nz inbox) CLOSED** by Unit CC: silent runtime → loud compile error.

4. **R4-U6.b** `3151f3c8` — closes M6.2b end-to-end. Brief hypothesis (substitution-walker shape coupling) was WRONG; agent corrected mid-implementation: actual root cause was at SYNTHESIS layer (call-ref typed-arg synthesis missing; hard-keyword binding-name lex fails on `fn`/`lin` etc.; template-literal `${...}` collapsed). Fix: `upgradeNativeCallRefArgExprNodesInFileAST` walker + selective live-fallback heuristic `sourceNeedsLiveFallback`. M6.2 wip-patch LANDED. `splitBlocks`+`buildAST` removed from `component-expander.ts`; both re-parse sites route through `nativeParseFile`.

**Tests:** **19,933 pass / 0 fail / 175 skip / 1 todo across 754 files** (full `bun run test`). Pre-commit gate (unit + integration + conformance) **14,059 pass / 0 fail / 92 skip / 1 todo across 715 files**. Native-parser canary strict-pass **998/1000** (unchanged from S121 baseline).

---

## State-as-of-close

| Item | Value |
|---|---|
| HEAD | `3151f3c8` (R4-U6.b) |
| Tests (full `bun run test`) | 19,933 pass / 0 fail / 175 skip / 1 todo (754 files) |
| Pre-commit gate | 14,059 pass / 0 fail / 92 skip / 1 todo (715 files) |
| Native-parser canary strict-pass | 998/1000 (S121 baseline retained) |
| pkg.json version | 0.6.0 (unchanged — no tag cut S123) |
| scrmlTS origin sync | unpushed work — push authorized at wrap |
| scrml-support origin sync | user-voice S123 + 6 pre-existing untracked voice articles + tools/ — push authorized at wrap |
| 6NZ outbox | closure reply dropped: `2026-05-23-1900-scrmlTS-to-6nz-bug-q-closed-mno-confirmed.md` |
| Inbox `handOffs/incoming/` | empty (5 reports moved to `read/` at S123 OPEN; all triaged) |
| Hook gate | Configuration B per pa.md S88 (pre-commit + pre-push; post-commit lost since S122-open per S122 close note) |
| `.claude/maps/` | watermark `c2d93544` — refreshed S123 OPEN; next refresh needed before S124 dev dispatch |
| Worktrees | clean — 7 active + 7 stale branches cleaned at this wrap |
| Memory rules landed | +1: `feedback_agent_edit_absolute_path_selection.md` (incident #11 new shape) |

---

## Open threads / carry-forwards — surface at S124 OPEN

### High-priority inbox bug-fixes (triaged S123, queued for dispatch)

1. **GITI-017** — `not` keyword substitution applied inside regex literals (CRITICAL silent corruption). Fix: wrap rewriter with regex-mode awareness. ~2-3h. Same shape as native-parser/lex-in-regex.scrml mode-fence pattern.
2. **6nz-P** — Runtime chunker `scope` → `timers` dependency edge missing. HIGH (every adopter app hits this on first reactive scope teardown). Fix: add chunker dep edge in `compiler/src/codegen/runtime-chunks.ts`. ~1-2h.
3. **6nz-S** — `return not` + `const` mis-emit as `return !const`. HIGH (pageerror on module load). Fix: `not` disambiguation in return position (currently picks unary `!`). ~1-3h.
4. **6nz-R** — `if=@derivedReactive` mounts but never unmounts on flip-to-false. HIGH. Either effect not subscribing OR derived not propagating flip. ~2-4h.
5. **GITI-018** — Multi-`scrml:` stdlib import only first rewritten in library mode. HIGH (library mode blocker). Fix: module-resolver one-shot rewriter. ~2-4h.
6. **GITI-015** — `is some` ternary + computed-member LHS not lowered. Author-level workaround exists. ~1-2h.

**6nz-L + 6nz-T** — known, subsumed by M6 native parser cutover (BS not string-aware for `{}` / `//` in strings). No standalone fix; deletion at M6.

**6nz-M / 6nz-N / 6nz-O** — FIXED, closure reply sent to 6nz at wrap.

### V-kill READ-side fire — DEFERRED (separate session)

V-kill's WRITE-side fire is landed. READ-side fire is deferred pending a pre-existing SYM engine var-name canonicalization mismatch (`<machine name=UI>` registers as `UI` but `@ui` lookup uses lowercase). Documented in `compiler/src/symbol-table.ts:1572-1593`. Required:
1. Fix engine var-name canonicalization (probably ~2-3h — registers should use the §51.0.C lowercase-first-character convention)
2. Land READ-side E-STATE-UNDECLARED fire
3. Re-run corpus regression gate (may surface more files that read undeclared cells — separate triage)

### M6 cutover progression (still active arc)

M6 Wave 2+ remains the dominant in-flight architectural arc. Per S122 close hand-off:
- **M6.6.b.2** (~10-15h) — symbol-table consumer migration using b.1 cookbook
- **M6.4b** — deletion fold for ast-builder.js P2-Form1 site
- **M6.7** Phase A flag flip — gated on M6.6.b.2-b.6 + M6.5 + M6.4b
- **M6.8** Phase B legacy deletion — gated on M6.7 + soak time
- Native-parser self-host file deletion at M6.7/M6.8 will auto-sunset V-kill's native-parser exemption

### Pre-existing carry-forwards (unchanged from S122)

- dev.to article updates (Rule 1 — only if user raises)
- Living Compiler retraction stamp (pending user hand)
- scrml.dev article canonicalization
- SPEC-INDEX Quick-Lookup mini-index stale (S117 flag)
- §29 vanilla-interop spec↔impl divergence (user has not ruled)
- Generator (`yield` / `function*`) policy (S114)
- MK4 lazy-require ESM cycle
- §58 build-story determinism audit
- `eb941333` stray commit (S119 P4-2-agent CWD slip — harmless)
- Bug 9 (dashboard async-not-awaited codegen) — defer to post-M6
- Dashboard still broken at runtime (Bug 9)
- "Pre-existing unrelated bug" surfaced Wave 14 DD: `~snapshot = {...}` tilde-decl emits raw tilde sigil
- **NEW** — adopter migration backlog: corpus files using auto-synth `@cell = init` at file-root should convert to V5-strict `<cell> = init` over time as files are touched (not blocking — corpus scan clean post-V-kill+Unit CC because pre-existing E-CTX-001s mask the would-be fires)

---

## Process incidents — S123 (both self-recovered, zero data loss)

**Incident #10 — first R4-U5 dispatch (cd-prefix shape):** agent leaked empty WIP commit (`7b3d3256`) to main via `cd /home/bryan/scrmlMaster/scrmlTS && git commit` prefix. PA reset main to `385c17ea` (empty unpushed commit); retired the worktree; re-dispatched with hardened brief including explicit CD-DISCIPLINE clause. All subsequent dispatches held.

**Incident #11 — R4-U6.b dispatch (NEW SHAPE — Edit-call absolute-path-selection):** agent's first Edit/Read pass operated on PRIMARY MAIN absolute paths (`/home/bryan/scrmlMaster/scrmlTS/compiler/src/component-expander.ts`) instead of worktree absolute paths. **CD-discipline (no `cd` prefix) was clean** — the failure mode was DIFFERENT: ABSOLUTE-PATH-SELECTION at Edit-call time. Agent self-detected via `grep` line-number mismatch + `find` showing both paths existing; recovered via `/tmp/` stash + `git restore` on main + copy back to worktree. Filed memory `feedback_agent_edit_absolute_path_selection.md`. **Brief template tightening needed**: explicit per-Edit `WORKTREE_ROOT` echo discipline.

**Platform-level fix (still deferred — escalating urgency):** PreToolUse hook in settings.json that rejects sub-dispatched-agent Write/Edit calls whose absolute path is in main but not the active worktree subtree. Closes BOTH shape classes (cd-prefix + Edit-absolute-path). S99 leak counter now at ELEVEN (multi-shape). Filed as F4 follow-up since S42; rate-of-incidence + shape-multiplicity makes this load-bearing for v0.4+ infrastructure work.

---

## Cross-machine sync hygiene (CRITICAL for next session)

**User notified at wrap: "will be working from other machine."**

Per pa.md §"Cross-machine sync hygiene" §"Machine-switch protocol":
- This session: commit everything ✓; push everything (executing at wrap step 7 below) ✓; clean working state ✓
- **Other machine, next session-start**: BEFORE reading hand-off or doing any work:
  1. `cd /home/bryan/scrmlMaster/scrmlTS && git fetch origin && git pull --rebase origin main`
  2. `cd /home/bryan/scrmlMaster/scrml-support && git fetch origin && git pull --rebase origin main`
  3. Resolve any divergence before session-start hand-off read
  4. Only then begin S124 session-start checklist

If the other machine has uncommitted/unpushed local work from a prior session: STOP, surface to user, do the S43-style audit before any reset (per pa.md §"Recovery (when staleness is discovered mid-session)").

---

## Session-start checklist for S124 PA

1. **Cross-machine sync first** (above). Don't skip — this is the first session switching machines this week.
2. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
3. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
4. Read `compiler/SPEC-INDEX.md` IN FULL.
5. Read `master-list.md` §0 IN FULL — the S123 entry in §0.6 is the live delta.
6. Read this `hand-off.md` (S123 CLOSE) — rotate to `handOffs/hand-off-126.md` at S124 OPEN.
7. Read recent contentful user-voice — S123 entry covers the R4-V-kill-Unit-CC-R4-U6.b arc + the path-letter decision rhythm + meta-finding on corpus-estimate-vs-reality + incident #11.
8. Sync hygiene re-confirm: `git fetch` scrmlTS + scrml-support; both should be at-origin post-S123-push.
9. Maps refresh — watermark `c2d93544` (S123 OPEN); ~10 commits stale; refresh before any S124 dev dispatch.
10. **Inbox triage gate**: 5 reports triaged S123 (GITI-015 / 6nz-P / GITI-017 / 6nz-R / GITI-018 / 6nz-S queued for fix-dispatch). If user picks one for S124, brief carries the triage classification (no re-triage from cold).
11. Next-priority candidates: V-kill READ-side fire (small, deferred-by-need) / inbox fix-dispatches (5 queued) / M6.6.b.2 (next major M6 milestone) / Unit CC corpus migration (NOT blocking; opportunistic).
12. Report: caught up + next priority.

---

## Tags

#session-123 #CLOSE #r4-wrap-surface-closed #v-kill-landed #unit-cc-landed #bug-q-closed #m6-2b-closed
#path-discipline-incident-11-new-shape #cross-machine-switch #wrap-and-push-authorized #19933-tests-0-fail
