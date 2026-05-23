# scrmlTS — Session 120 (CLOSE)

**Date:** 2026-05-22
**Previous:** `handOffs/hand-off-122.md` (S119 CLOSE — rotated at S120 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S120 OPEN:** `30ce630f` · **HEAD at S120 CLOSE:** this wrap commit
**Wrap:** full 8-step (user-authorized: "commit, wrap, push"). Push **authorized**.

---

## S120 net outcome

A very long, very productive session — three big arcs:

1. **README honesty arc.** Acted on Carson Gross's (htmx) review — the README opened too nerdy. New order: hook → developer note → full-stack hero → state-machine basis → Why scrml → Benchmarks. Then diagnosed that the *new* realtime-contact-board hero was **broken at runtime** (`?{}` SQL un-lowered into the client bundle — `<program db=>` + `<schema>` alone doesn't give SQL context; needs a `<db>` element). The README gate is compile-only and never caught it. Honest-hero fix landed (gate-skip illustrative `<db>`-element form, dropped false "a real, running app" claims). Wider finding: the **flagship `examples/03-contact-book.scrml` is broken at runtime too** — `loadContacts is not a function or its return value is not iterable` (server fn called in a render `for`-loop, not awaited). The full-stack DB story has ≥6 compounding bugs across the codegen path.
2. **Corpus sweep — PLAN filed, not run.** Triggered the timing call: don't fix the corpus against the dying BS+Acorn basis. PLAN at `docs/changes/corpus-sweep/PLAN.md` — trigger M6, seed bug ledger (the ≥6 bugs found today), method (compile + **runtime** via Playwright), and the load-bearing gate fix (close the compile-only blind spot — runtime smoke-test in the README gate + a corpus runtime harness).
3. **P5 campaign — 9 units committed; gap 51 → 15.** Phase-5 triage of the post-S119 51-gap (`docs/changes/m5-c2-gap-ledger/phase5-triage-2026-05-22.md`), then 3 waves dispatched + landed. Strict-pass 949 → 984/1000 (98.4%). 0 test regressions throughout.

Plus a **self-host pushback** discussion (user asked again about writing more compiler in scrml; I pushed back — bug is in logic not language, can't trust buggy compiler to compile new compiler source, basis is shifting, the disciplined version is already happening as the native-parser arc; user agreed: "there I go gettin ahead of myself").

Plus a **new project started** — `dashboard/app.scrml` — a scrml-written verification dashboard for the examples corpus.

- **scrmlTS:** 12 commits (1 hook hadn't fully echoed; the wrap commit makes 13). **scrml-support:** 0 commits prior; this wrap appends S120 user-voice.
- **Tests:** 13,736 pass / 0 fail / 88 skip / 1 todo (unit+integration+conformance). Pre-push hook (full validation) was 0-fail on every landing.
- **No release tag cut.**

---

## What landed S120 — by arc

**README arc (2 commits):**
- `a33939ee` — `docs(readme): restructure per Carson Gross review — lead with the app, not the thesis`. The S119-pushed restructure (later found to have a broken hero).
- `48d816f2` — `docs(readme): hero was broken at runtime — swap to honest illustrative sample`. The honest fix.

**Corpus sweep + Phase-5 triage (1 combined commit):**
- `322d1e39` — `docs(m5-gap-ledger): Phase-5 triage of the 51-gap + corpus-sweep plan`. The triage doc + the PLAN doc.

**P5 campaign — 9 units committed (8 closing files + 1 latent-bug-fix commit):**
- `f141d759` — **P5-8** state-kind discrimination (`parse-state-body.js`). Partial — state-kind closed; tag-frame over-scan deferred (became P5-12 trigger).
- `2f3fe2f7` — **P5-1** suppress state-decl openers in markup trampoline (`parse-markup.js`). Gap −16, over-closed DIFF-top-seq 17→5.
- `5f464dba` — **P5-3** `^{}` meta-block loop recovery + `type:kind` decl ordering (`parse-stmt.js`). Two latent bugs fixed; target re-scoped (triage M5 was wrong — the real bug was elsewhere).
- `f3f5d5c7` — **P5-2** bare-markup `export`/`const` `= <markup>` pairing forms (`parse-markup.js`). Gap −8, `GAP-native-extra-block` eliminated.
- `291338b6` — **P5-9** `type` is a contextual keyword (`token.js` + `parse-stmt.js`). Gap −3.
- `6c78f2e0` — **P5-4** `<style>` rejection + stray-`</>` suppression (`parse-markup.js`). Gap −5.
- `e5311884` — **P5-11** structural state-decl recognition in `${}` bodies (`parse-stmt.js`). Gap −2 (056/057 closed).
- `ba2ddd76` — **P5-12** tag-frame opener-scan abort on unbalanced closer (`tag-frame.js`). Truncation fixed; `r10-bun-admin` advanced class but not yet EXACT.
- `906c5317` — **P5-13** `${}` body-extent scanner — brace-in-string skip (`parse-markup.js`). Gap −2 (bs/bpp closed via narrow-3-char oracle-faithful detection).
- **P5-10** — collect-hoisted export-count: NO-COMMIT (misdiagnosis-catch). The triage's "collect-hoisted defect" hypothesis was wrong; root cause is the `parse-markup.js` `${}` brace-in-string scanner (later closed by P5-13). Per Rule 3, the agent correctly surfaced the misdiagnosis and made no fabricated edit.

**Dashboard project (1 commit):**
- `61013d3a` — `feat(dashboard): scrml examples — verification dashboard (v1)`. New `dashboard/app.scrml` — a scrml-written tool for marking each example verified at a SHA and red-flagging on HEAD move.

---

## P5 campaign — measured scoreboard

- **Gap: 51 → 15** (71% closed). Strict-pass 949 → 984/1000 (97.6% → 98.4%).
- Histogram now: `DIFF-deep-seq` 7 · `DIFF-hoist-count` 4 · `GAP-mixed` 1 · `DIFF-top-seq` 2 · `GAP-state-block` 1 · (note: also `GAP-native-extra-block` 1 reappeared post-P5-13 — a previously-LIVE-DEGENERATE file revealed a pre-existing native-extra-markup divergence that the brace-in-string degradation was masking).
- 0 test regressions across all 9 commits. Pre-push gate green throughout.
- **Pattern worth noting (load-bearing for future triages):** 5 of 9 agents found their triage diagnosis partly wrong and corrected it. The phase5-triage doc's per-class root-cause hypotheses were starting points, not authoritative — the agents re-derived from source and corrected:
  - P5-1 found the M2 cause was trampoline mis-segmentation, not `BARE_DECL_RE`/`@ident` drift; `BARE_DECL_RE` was verbatim-identical to the live oracle. Also surfaced `samples/quiz-app.scrml` as corpus-stale (`</>`-as-division operator) — triage §4's "no corpus-stale" was wrong.
  - P5-3 found the M5 cause was `parse-markup.js` `${}` body-drop + `collect-hoisted.js` export-count — NOT `parse-stmt.js` body loop. It fixed two unrelated latent `parse-stmt.js` bugs it found along the way (test-covered) and surfaced the real causes as deferred.
  - P5-10 found `collect-hoisted.js` has no defect — the bs.scrml export under-count was the `parse-markup.js` brace-in-string scanner (same cause as P5-3's bpp/tab deferral). Made no commit (Rule 3 — no fabricated edits).
  - P5-4 found the D-void cause was `<style>` blocks (not valid scrml), not "phantom empty markup over-emission." And surfaced a `tag-frame.js` closeTagFrame no-pop defect for void-014/for-044/tag-007.
  - P5-11 found the H4 cause was `parse-stmt.js` (structural-state-decl recognition) — not `parse-expr.js`/`collect-hoisted.js`. P5-2's deferred note was right; the triage §2.1 H4 prose was wrong.

The phase5-triage doc is now **partially stale** — its §3 unit decomposition still mostly maps, but several §2 root-cause hypotheses were corrected mid-flight. Next-session re-triage of the residual 15 is recommended before Wave 5.

---

## Process incidents — S120

- **CWD slip during P5-8 landing.** Per the S94 pattern — a `git checkout <worktree-branch> -- <files>` op silently slipped CWD into the worktree; the subsequent `git commit` ran in the worktree (found nothing to commit) instead of main. No damage. Recovered by `cd /home/.../scrmlTS && pwd` re-anchor + `git -C <main>` for the file-delta + commit. **Standing mitigation:** use `git -C <main>` for ALL landing ops (CWD-independent), as I did for every subsequent landing. The S94 memory rule held.
- **Path-discipline hook fired (twice, both recovered).** S100's PreToolUse hook rejected sub-agent main-rooted Write/Edit calls in P5-2 + P5-13. Both agents corrected on first rejection. **The hook is working** — closes the S99 leak class for this project.
- **P5-12 first dispatch stalled** (watchdog 600s, no progress). No commits, no salvage — clean re-dispatch with a brief tweak (pre-empted the per-file-scan-mode rabbit-hole that hung the prior run).
- **Brief defect — omitted `bun run pretest`** in the early P5 briefs. Caused P5-2 to report 138 phantom browser-test "failures" (missing `samples/compilation-tests/dist/` artifacts; the missing-pretest pattern from pa.md F4 step 5). No real regression — pre-commit excludes browser, pre-push from main has dist populated. Fixed in P5-4 + later briefs (`bun run pretest` added). Should be a permanent brief-template item.
- **Triage diagnosis drift surfaced 5 times** (above). Not a failure mode — agents correctly re-diagnosed and surfaced the corrections. But: future triages should be sized expecting ~50% of root-cause hypotheses to be partially corrected at fix-time. This is the triage's own caveat #6 ("51 is a floor") playing out at the unit level.
- **README-shipping-broken-claim was a process miss.** I verified the realtime hero *compiles* + lint-passes and pushed it. I didn't run it. "Compiles" ≠ "runs." The lesson is encoded in the corpus-sweep PLAN: every README scrml block needs runtime verification, not just compile-gating.

---

## State-as-of-close

| Item | Status |
|---|---|
| HEAD | this S120 wrap commit |
| Tests (unit+integration+conformance) | 13,736 pass / 0 fail / 88 skip / 1 todo |
| Pre-push gate (full validation incl. TodoMVC) | green throughout |
| Worktrees | **main only** — 11 stale agent worktrees cleaned at wrap |
| scrmlTS origin sync | **12 commits + wrap commit UNPUSHED** — push authorized |
| scrml-support origin sync | 1 user-voice append staged for push |
| Tags | none cut S120 |
| pkg.json version | 0.6.0 (unchanged) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| `.claude/maps/` | watermark `5d2003dd` — STALE (12 commits behind); refresh before any S121 dev dispatch |
| Background agents | none |

---

## Open threads / carry-forwards — surface at S121 OPEN

1. **The remaining-15 gap.** Phase5-triage doc is partially stale (several root-cause hypotheses corrected at fix-time). Recommended: a quick re-triage of the 15 before Wave 5 dispatches. Mapping of the 15 by class:
   - `DIFF-deep-seq` 7: D-void residual + D-interp 3 + D-sql 1 + D-match 1 + the `< p` phantom-opener (r10-bun-admin) post-P5-12.
   - `DIFF-hoist-count` 4: bs.scrml typeDecl tail + cg.scrml imports (P5-C canary, not-bug) + jwt.scrml (P5-C canary) + 1 residual.
   - `GAP-mixed` 1: phase4-tag-mismatched-closer-007 (tag-frame no-pop).
   - `DIFF-top-seq` 2: T-extra residual (`<#tag/>` + void/for trailing).
   - `GAP-state-block` 1: quiz-app — **corpus-stale, NOT a parser fix** (`</>`-as-division operator; both pipelines choke). Defer or `</>`→`/` fix.
   - (`GAP-native-extra-block` 1: gauntlet-r11-zig-buildconfig — pre-existing divergence unmasked by P5-13; not a regression.)

2. **Remaining P5 units (Wave 4+):**
   - **P5-6** — markup-in-expr over-recognition (`parse-markup.js`) — D-interp 3 + D-sql 1 + `<#tag/>` 1. ~4–6h.
   - **P5-7** — `<match>` block-form recognition (`parse-markup.js` + `parse-file.js`) — 1 file. ~5–8h, a genuine new assembler pass.
   - **P5-14** (new, P5-4-surfaced) — `tag-frame.js` `closeTagFrame` mismatched-closer no-pop — void-014 / for-044 / tag-007. ~2–4h.
   - **`< p` phantom-opener residual** (P5-12-surfaced) — `parse-markup.js`'s `isStateTagBoundaryAfterLt` tightening OR LIVE-DEGENERATE reclassification. r10-bun-admin.
   - **`_{}` foreign-code brace-in-string** (P5-13-surfaced) — `dispatchInForeignCode` carries the structurally-identical defect; same fix recipe as P5-13. ~1–2h.
   - **bs.scrml typeDecl + cg.scrml imports** — separate hoist-count investigation (the agent for P5-10 verified `collect-hoisted.js` has no defect, so the bug is elsewhere). ~3–5h.
   - **`meta` wrapper fidelity** (P5-3-surfaced) — `^{}` emits as `Block`; needs `StmtKind.Meta` in `ast-stmt.js` + a `translate-stmt.js` arm. ~2–4h.
   - **P5-C** — canary classifier (jwt.scrml + cg.scrml — both **not native-parser bugs**; live oracle wrong). Last unit, after parser fixes complete. ~2–3h.
   - **quiz-app corpus fix** — `</>`→`/` line 60 + line 148. Trivial corpus edit, defer/PA-do as part of M6 prep.
   - **`KwType` dead enum cleanup** — P5-9 left `KwType` in the TokenKind enum (no longer emitted). Trivial sweep.
   - **`.scrml` predicate-drift sweep** (S118-queued) — 33 pre-existing `is not not` sites + the `parse-markup.scrml` ~236 E-FN-003 errors. M6 precondition. Distinct sweep.

3. **`dashboard/app.scrml` (v1) — landed; never run.** Compiles clean (1 benign `E-ROUTE-001` warning on `state[name] = …` flat-JSON computed write). I have NOT run `scrml dev dashboard/app.scrml` to verify it works end-to-end in the browser. **Expect it to hit today's full-stack runtime bug cluster** (it does server fn calls from a client handler; the pattern is closer to example 17's `publish()` shape than example 03's render-loop, so it might fare better — but unverified). If it doesn't run cleanly, that's a real signal feeding the corpus sweep. v2 follow-ups noted in the file's footer: `scrml:shell` stdlib helper, on-mount auto-load, "Run it" per row.

4. **Corpus sweep PLAN** — trigger M6. Don't mass-fix corpus before M6. Acute public-facing falsehoods (like today's README hero) are the only fix-now exception. Located at `docs/changes/corpus-sweep/PLAN.md`.

5. **README "Built around state machines" + the developer-note disclaimer** are now the only disclaimers; the hero is gate-skipped. README scrml gate: 2 passed (Counter + Engine), 2 skipped (hero + Zod fragment), 0 failed. (Caveat: the Engine example also uses `<program db=>` + `?{select}` *without* `<db>` — same broken shape as the old hero. It gate-passes but likely emits broken JS at runtime too. Flag for the corpus sweep; not fix-now per user steer.)

6. **§58 build-story determinism audit (§58.12)** — whole-compiler audit; v1.0-gate-vs-fast-follow undecided; bit-identical claim stays `*`-marked until done. Pre-S120 carry-forward.

7. **Pre-existing carry-forwards** (unchanged from S119):
   - dev.to article updates — content fixed in-repo S115; published posts unchanged. Marketing-shaped (Rule 1 — only if Bryan raises).
   - Living Compiler retraction — draft at `docs/articles/living-compiler-retraction-devto-2026-05-21.md`; pending Bryan's stamp + publish.
   - scrml.dev article canonicalization — not started.
   - SPEC-INDEX Quick-Lookup mini-index stale — flagged S117.
   - §29 vanilla-interop — spec↔impl divergence; user has not ruled.
   - Generator (`yield`/`function*`) policy (S114).
   - PRIMER match-block section.
   - MK4 lazy-require ESM cycle.
   - `eb941333` stray commit (S119, P4-2-agent CWD slip — harmless).

---

## Session-start checklist for S121 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL (the S120 entry in §0.6 is the live delta).
5. Read this `hand-off.md` (S120 CLOSE) — rotate to `handOffs/hand-off-123.md` at S121 OPEN.
6. Read recent contentful user-voice — the S120 entry covers the README arc + the self-host pushback + the dashboard idea + the ouroboros framing + the "lets get going" / "triage and disp" sequence.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support. Both should be at-origin if push completed at S120 wrap.
8. Maps refresh (watermark `5d2003dd` — 12+ commits stale) before any S121 dev dispatch.
9. If continuing the P5 campaign: a quick re-triage of the residual 15 against current source (the phase5-triage doc is partially stale).
10. Report: caught up + next priority (= remaining-15 gap / Wave 4+ / OR whatever the user steers to).

---

## Tags
#session-120 #CLOSE #readme-honest-hero #corpus-sweep-PLAN #self-host-pushback
#p5-campaign-9-units #gap-51-to-15 #strict-pass-98.4 #dashboard-v1
#worktrees-cleaned #wrap-and-push-authorized
