# scrmlTS — Session 78 (CLOSE — Phase A10 engine state-child body render SHIPPED · 6-deep deferral chain CLOSED · A5-6 Feature 1 UNBLOCKED · SPEC conformance audit complete (on-course verdict) · test conformance audit dispatched async)

**Date opened:** 2026-05-10
**Date closed:** 2026-05-10 (single-day session; substantial throughput on a single thread)
**Previous:** `handOffs/hand-off-77.md` (S77 close — A5 computed-delay family CLOSED · A5-6 Feature 2 SHIPPED · memory-leak deep-dive REFRESHED · 7 SHIPs + 2 chore + 1 SPEC docs commits · +82 tests · 0 regressions)
**This file:** rotates to `handOffs/hand-off-78.md` at S79 open
**Tests at open (S77 close baseline):** 10,961 pass / 64 skip / 1 todo / 6 fail
**Tests at S78 close:** **11,006 pass / 64 skip / 1 todo / 6 fail** (516 files; 6 fails ALL environmental on this machine — same as S77; net delta from open baseline: **+45 pass / +0 skip net (3 added Phase 3+4 + 3 .skip integration tests converted to .test) / +0 todo / +0 fail**.)

---

## S78 close — summary

Single-thread session focused on the Phase A10 unblock thread. **Phase A10 engine state-child body render** went from "deferred 6 times across a month" to **fully SHIPPED end-to-end** in one session, including closure of the v1 reactive-subscription gap that the original Phase 3+4 SHIP would have left open. **A5-6 Feature 1** (named timer + `cancelTimer` builtin — the original closure target of the deferral chain) is now structurally unblocked. Two read-only audits dispatched in parallel: SPEC conformance returned "on course" verdict; test conformance still running async at session close.

### S78 commit chain (in order)

1. `b4b9bd9` chore(s78): SCOPE + SURVEY for Phase A10 engine state-child body-render
2. `9f888d0` feat(a10): SHIP — Phase 1+2 engine bodyChildren walkable AST + 7 A1b walker recursion branches (+14 tests)
3. `6a1b15e` feat(a10): SHIP — Phase A10 engine state-child body render COMPLETE (Phase 3+4+5+re-wire) (+31 tests, -3 skip → test)

**Total: 3 commits / +45 pass / 0 regressions / 6 environmental fails preserved.**

### Phase A10 architectural commitment (Option C-prime, ratified S78)

User picked Option C-prime over Option A (bundle match-block-form codegen) and plain Option C (build engine-only with future fork). C-prime is "factored variant-guard helper that future match-block-form codegen reuses without forking; preserves promotion-ladder fidelity at codegen layer." User verbatim S78 weighing-matrix decision: "C prime." The factored helper at `compiler/src/codegen/emit-variant-guard.ts` (~830 LOC) is variant-source-agnostic — `emitVariantGuardedRender(variantExprAccessor, arms, ctx, opts)` has zero knowledge of `<engine>` vs `<match for=Type on=expr>`. When match-block-form codegen lands (separate dispatch), it adds a thin second consumer with no fork to merge.

### Phase 0 SURVEY headline finding (cost reduction)

Estimated cost ~10-17h → revised down to ~6.5-12h post-survey. The block-splitter ALREADY descends into engine bodies recursively via the generic `pushTagContext("markup")` path (block-splitter.js:1138-1228); ast-builder.js:9098-9103 was THROWING THE WALKABLE CHILDREN AWAY by re-serializing them into `rulesRaw: string`. The fix was "stop discarding the walkable children" — not new infrastructure. Phase 1 collapsed from "build new parser infrastructure" to a ~30-50 LOC change.

Actual SHIP cost across two dispatches: ~5-7h (within revised estimate).

### Re-wire mechanism choice (B over A)

Original Phase 3+4 SHIP would have left a v1 limitation: `${@cell}` reactive interpolation inside non-initial-arm bodies wouldn't update across variant changes (file-level `_scrml_reactive_subscribe` callbacks cached `document.querySelector` handles at module init; after dispatcher's `innerHTML` replace, those handles point at detached DOM). PA + user reviewed; user picked Option 2 (re-dispatch agent to fix before SHIP) over Option 1 (ship with v1 limitation). Mechanism B chosen by re-wire agent: per-arm wire function + dispose handle from `_scrml_effect`. No new runtime registry needed; idempotency via dispose-before-rewire on every fire (including same-variant re-render); tree-shake invariant preserved.

### Cross-machine sync (session-start protocol)

scrmlTS 0/0 origin (clean) at S78 open. scrml-support 0/0 origin at open (5 untracked voice/articles drafts, no conflict). At S78 close: scrmlTS **3 ahead of origin** (S78 chore + 2 SHIPs + this wrap commit, push pending per "no push" auth all session); scrml-support 0/0 unchanged.

---

## S78 open — caught up

**Cross-machine sync (session-start protocol):** scrmlTS 0/0 origin (clean working tree). scrml-support 0/0 origin (5 untracked voice/articles drafts + tools/ — voice-author work; no conflict). Both repos clean and synced with origin.

**S77 wrap state inherited:** large 6-SHIP single-day session that closed the A5 computed-delay family entirely (A5-4 + A5-5 + A5-5b + A5-6 + §51.12.4 spec amendment + W-LEAK-010 spec row). Memory-leak deep-dive refreshed on scrml-support with one new leak surface (W-LEAK-010 idempotency unbounded growth). String-token quote-preservation fix landed across all 4 test-block parsers. Codegen-tightening fix (consecutive-`let` in `~{}` body) shipped.

**Push state at S78 open:** scrmlTS clean **0/0 origin** — HEAD is `699d85f` (S77 wrap commit) and origin/main is at the same SHA. All S77 commits pushed. The S77 hand-off §"Push state" section reported "4 ahead of origin" because it was written DURING wrap before the final wrap-commit + push step ran. Both `699d85f` (wrap) and the prior 4 SHIPs are upstream. Same for scrml-support — `1f71ef3` is on origin.

**Inbox state:** scrmlTS `handOffs/incoming/` empty (only `read/` archive). No pending action items.

**Master inbox carry-overs (3 legacy/superseded — safe-to-ignore unless sweep requested):**
- `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy, S30s era)
- `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md` (renamed at master-push retirement)
- `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md` (UNREAD; pipeline-substitution clean across 30+ dispatches in S73-S76)

**User-voice state:** last contentful entries are at S72 (2026-05-08). S73-S77 produced no new user-voice entries; this is consistent with those sessions being primarily implementation/SHIP work. The S78 PA should append normally if any durable user statements arise.

**Worktree branches retained:** 10 from S75 + 1 from S76 + 1 from S77 (`worktree-agent-a07c10f3c25603c26`). Forensic per S67; not cleanup priority.

---

## Next priority — menu (S77 carry-over)

Awaiting user direction. Carrying the S77-close menu forward:

1. **A5 family follow-on (S67-ratified engine extensions, A5-6/A5-7 deferred):**
   - A5-6 Item G remaining B-shakeable timer extensions (~3-7h optional; A5-6 Feature 2 `<onIdle>` shipped S77)
   - A5-7 tests + samples (~12-18h)

2. **A9 Ext 5 follow-ups (3 in-scope-but-thin, deferred from S76 dispatch):**
   - D1 export-synth modifier propagation
   - D3 pure-fn-call detection in classifier (over-emits keys)
   - D5 Redis backend inlining

3. **A6-6 optional API alignment** — LSP/CG API design dive (TBD).

4. **Insight 28 OQ-bridge-5** — compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit pass.

5. **Insight 28 OQ-bridge-2** — passive (re-debate trigger on ≥3 adopter friction reports).

6. **W-LEAK-010 follow-up (per memory-leak deep-dive refresh §7.2):**
   - Step 1: W-LEAK-010 SPEC §34 catalog row + cross-ref from §19.9.6 (LANDED S77 at `7d8de4a` — verify; this may be done already)
   - Step 2: `<program idempotency-store=>` background sweeper (CG/runtime dispatch)
   - Step 3: LC pass implementation (Stage 7.6, SCOPE-AND-DECOMPOSITION dispatch)
   - Recommendation: hold for v0.3.0+ unless W-LEAK-010 spec-amendment is fast-tracked

**Articles thread (5 in-flight drafts at scrml-support/voice/articles/):** Per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads.

---

## Open questions to surface immediately at S79 open

1. **Push state — 3 commits ahead of origin.** scrmlTS at HEAD (S78 wrap commit + 3 prior S78 commits — `b4b9bd9` chore SCOPE/SURVEY + `9f888d0` feat Phase 1+2 + `6a1b15e` feat Phase 3+4+rewire). User authorized "no push" all S78. Push at PA's discretion at next session open or on user request.

2. **Test conformance audit COMPLETE.** Returned post-wrap (agent `accfe3ec14a10b1a0`). Audit at `docs/audits/test-conformance-2026-05-10.md` (401 lines, 36KB). **Verdict: SHIP-READY after closing ~4-6h of mechanical test additions.** No agent-cheated pattern detected — corpus is structurally honest (no mocks, no snapshot tests, no `.only`, no self-referential mock-return assertions, no expected-fail-disguised-as-skip). The 54 skip directives are all documented with explanatory comments OR live under a `REGISTRY.md` spelling out the gating regime (31 of 54 are S32 fn-state-machine conformance tests designed to un-skip when implementation lands).

   **Top priority items (ranked by risk × ease):**

   - **A. 21 codes cataloged-but-untested (~3-5h).** Codes with §34 catalog rows AND "SHALL emit" normative claims AND real source firing sites AND zero test references. Confirmed list: `E-LOOP-003/005/006/007`, `E-CHANNEL-004/005`, `E-AUTH-003/004/005`, `E-CG-010/014`, `E-LIFECYCLE-015`, `E-CTRL-004/011`, `E-IMPORT-007`, `E-FN-009`, `E-META-EVAL-002`, `E-STRUCTURAL-ELEMENT-MISPLACED`, `E-ERROR-008`. Plus `W-CG-001` from SPEC audit's §1.3.
   - **B. Phase A10 binding-registry arm-context unit gap (~30 min).** `pushArmContext` / `popArmContext` / `engineArm` field stamping (S78 SHIP) has zero direct unit test in `binding-registry.test.js` (8 existing tests cover only the data-class API). Indirect coverage via `engine-body-render.test.js` integration tests but a registry-only regression would slip the unit tier.
   - **C. Pre-commit / full-suite divergence (~30 min).** Pre-commit hook excludes `browser/`, `lsp/`, `self-host/`, `commands/` (~28 files). No automated full-suite gate between commits. Recommendation: post-commit hook OR CI gate for `bun run test`.
   - **D. 6-9 vacuous tests** in `conf-TAB-005.test.js` + `conf-TAB-022.test.js` — `if (sqlNode) expect(...)` with trailing `expect(true).toBe(true)` — passes whether SQL recognition works or not. Plus ~12-15 more soft-mode conditional fallbacks in the same `tab/` directory. **Lower priority** (audit framing it as cleanup, not correctness gate).

   **Total estimated effort: ~4-6h to close items A-C; another ~2-3h for item D cleanup. NOT ship-blocking.**

   **What's NOT a problem (audit's positive findings):**
   - No agent-cheated tests. Corpus runs real `compileScrml(...)` end-to-end or real compiler functions on real source.
   - Implementation-peg risk essentially zero — codegen tests use structural regex assertions, not literal-string equality.
   - 31/54 skips are documented S32 fn-state-machine conformance tests (designed to un-skip when implementation lands).
   - Verdict aligns with parallel SPEC audit's "catalog-bookkeeping drift, not design-level drift" finding.

3. **SPEC conformance audit findings — actionable items pending decision.** Audit at `docs/audits/spec-conformance-2026-05-10.md` returned "on course" verdict (committed alongside this wrap). Top 5 priority items totaling ~5-7h:
   - **W-LINT-001..015 family backfill** (~30 min) — 15 user-visible warnings with zero spec mention.
   - **`<onIdle>` row in SPEC §4.15 + §24.4** (~10 min) — S77 A5-6 shipped element + §34 catalog rows but missed registry tables.
   - **5 catalog rows for fully-described codes** (~12 min total) — `E-ERRORS-001/002`, `E-SWITCH-FORBIDDEN`, `W-CG-001`, `I-MATCH-PROMOTABLE` (last is most embarrassing — SPEC-INDEX header line 9 falsely claims row was added S66).
   - **debounce/throttle deliberation** — code parses `@debounced(N)`, `debounce()`, `throttle()` as language-level keywords; SPEC has zero mention. **This IS src-ahead-of-spec.** Either parser cleanup or spec extension; needs user-direction deliberation.
   - **Legacy prose-only catalog backfill** (~2-3h mechanical) — 90 codes pre-dating §34 catalog convention. Largely E-ENGINE-* / E-LIFECYCLE-* / E-TYPE-* / E-LIN-* / E-USE-* / E-IMPORT-* / E-META-* / E-EQ-* / E-MW-* / E-CTRL-* / E-SQL-* / E-CG-* / E-COMPONENT-* / E-MATCH-* / E-SYNTAX-* / E-PROTECT-* / E-TIMEOUT-* / E-DG-* / E-ATTR-* / E-BATCH-* / W-* family.
   No language-design drift detected outside the debounce/throttle finding.

4. **A5-6 Feature 1 (named timer + cancelTimer) UNBLOCKED.** Phase A10 closes the original deferral chain. Estimated ~2-3h dispatch. Open as next-thread candidate after audit work + push decisions.

5. **Worktree branches retained.** `worktree-agent-ad20cd804c0aaf101` (Phase 1+2) + `worktree-agent-a15b0eefec8d5fae1` (Phase 3+4 — predecessor for re-wire) + `worktree-agent-a4bb977c87382ef9c` (re-wire fix; final landing branch). Forensic per S67 standing rule. Plus `worktree-agent-a4bb977c87382ef9c`, `worktree-agent-a15b0eefec8d5fae1`, etc. per prior sessions retained.

6. **Project-mapper refresh recommended.** User flagged at S78 mid-thread that the existing maps probably underestimated the reactive-wiring + event-wiring runtime infrastructure surface (which is why PA's "1-3h" re-wire estimate was off). Dispatch `project-mapper` to refresh `.claude/maps/` with the new `emit-variant-guard.ts` surface + revised reactive-wiring topology + non-compliance report. Out-of-band of the audit work; can run any time.

7. **Versioning-discipline discussion deferred.** User raised at S78 mid-thread the idea of putting weight behind patch-version numbers (e.g., `0.2.1` = post-`0.2.0`-SHIP audit/smoke/edge-exhaustion phase; `0.2.2` = next-feature increment). PA leaned: do it cheaply pre-1.0 — declare `0.2.1` is the audit phase, move A4 + recurring audit work under that label, no new gates added; main tradeoff is semver patch-is-bug-fix-only convention divergence. Adjacent question: should `0.2.0` itself be re-scoped (currently has too much scope; if patches mean something, `0.2.0` becomes "engines + temporal + body-render ship" and rest moves to `0.2.2`/`0.2.3`/etc.). Hold for a session of its own.

---

## Things S78 PA must NOT screw up (S77 close standing list)

S77-close standing list (items 1-217) carries forward verbatim. **No new S78 additions yet.**

---

## Tags

#session-78 #close #phase-a10-shipped-end-to-end #6-deep-deferral-chain-closed #a5-6-feature-1-unblocked #spec-conformance-audit-complete #test-conformance-audit-async #push-pending
