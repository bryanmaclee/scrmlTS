# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-20T00:30:00Z
# scan mode: INCREMENTAL_UPDATE (S108 / post-v0.3.3 era — commit df1211d)
# prior baseline: 2026-05-19 @ 6616a69 (S107 close)

## Summary

Total docs scanned: ~196 (prior ~192 + ~4 new docs from S108 wave: scrml-support deep-dive `bug-4-docs-mode-escape-2026-05-19.md` + 9 new test files in compiler/tests/unit + known-gaps.md rotated 4× + handoff rotation + 1 hand-off rotation S107 → S108 → S109)
Compliant: ~193 (incl. all S108 wave docs)
Non-compliant: 0 fresh items this session
Uncertain: 2 (carries forward from S107 — neither resolved this session)

## S108 → S109 OPEN status flips (auto-resolved since S107 close)

- `docs/changes/match-block-form-scoping/` — was `in-impl` at S107 close; **Phases 3+4 SHIPPED S108** end-to-end via emit-match.ts (~430L) + `:`-shorthand body codegen. SCOPING document should rotate `SCOPE-CLOSED` footer or have its remaining Phase 5 polish carry-forward annotated. (Action: surface to user at S109; not flagged as non-compliance because progress.md is append-only by convention and the SCOPING is a live dispatch artifact.)
- `docs/known-gaps.md` — was `HIGH match block-form in-impl` + `HIGH Bug 5 P3 scoping` + `MED-HI Bug 1 Tailwind spec'd` + `MED-HI Bug 2 phantom E-SYNTAX-050 spec'd` + `LOW-MED Bug 4 docs-mode escape spec'd` at S107 close. **Rotated 4× during S108**: Bug 5 P3 closed; Bug 1 floor + full-fix-3-waves closed; Bug 4 C-narrow closed; match `:`-shorthand closed; bare-`/` half retained as deferred. Open at S109: Bug 2 (MED-HI) + Bug 4 bare-`/` half (LOW-MED) + Bug 1 still-deferred families (ring/gradient/string-shaped/safelist).
- `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` (NEW S108) — 530-line deep-dive ratified Approach C-narrow per SPEC §3.1 + §8.1 conformance ("SQL is a child of Logic, not markup-text"). 11 prior-art systems analyzed, 372 workaround occurrences in adopter corpus, 86% of pages used entity-escapes. **NOTE: scrml-support working-tree was untracked at S109 OPEN — this file exists locally but may not have been committed yet. Surface to user.**

---

## NEW S107 compliant items (audit verified)

### docs/known-gaps.md  [NEW S107]

**Type:** Adopter-direct surface (project-root linked from README current-state blockquote)
**Status:** Compliant — content matches code state at HEAD `6616a69`
**Per-section verification:**
- HIGH `match block-form` `in-impl` — matches landed state (Phases 1+2 SHIPPED + Phase 3 carry-forward); SCOPING link resolves to `docs/changes/match-block-form-scoping/SCOPING.md`; cross-ref to `compiler/SPEC.md §18.0.1/§18.0.2/§18.0.3` accurate
- HIGH `Bug 5 Phase 3` `scoping` — matches landed state (Phases 1+2 SHIPPED via `c70176e` + `a7fbfa8`; Phase 3 = SPEC §7.4.2 polish queued); commit SHAs cited verifiable
- MED-HI `Bug 1 Tailwind` `spec'd` — content + workaround + reproducer link match handoff
- MED-HI `Bug 2 phantom E-SYNTAX-050` `spec'd` — same
- LOW-MED `Bug 4 docs-mode escape` `spec'd` — same
- "Closed in S107" section names commits `c70176e` + `a7fbfa8` + `2e9f9c3` + `c4d1114` (all 4 verifiable in git log)

**Disposition:** No action — `docs/known-gaps.md` is an adopter-facing live ledger by design. Rotates contents as gaps open + close. No compliance flag.

### docs/changes/match-block-form-scoping/  [NEW S107]

**Type:** Active impl-arc dispatch dir
**Status:** Compliant — content matches `in-impl` classification from `docs/known-gaps.md` HIGH section
**Per-file:**
- `SCOPING.md` (26KB) — 5-phase plan + 10 OQs (4 ratified S107: Q-MB-1 / Q-MB-3 / Q-MB-5 / Q-MB-7); Q-MB-2 / 4 / 6 / 8 / 9 / 10 remain PA-internal-decidable during Phase 3+ dispatches; Phases 1+2 SHIPPED at HEAD; Phases 3+4+5 queued
- `progress.md` (15KB) — Phase 1 + Phase 2 entries dated 2026-05-19 S107; append-only convention per PA Rule 8

**Disposition:** No action — active dispatch in flight; SCOPING + progress are dispatch-discipline artifacts.

### Match block-form code surface (NEW S107)

**Type:** NEW source file + extended source files + new SYM PASS + 5 new diagnostics + 27 new unit tests + SPEC normative
**Verified:**
- `compiler/src/match-statechild-parser.ts` (NEW, 530L) — file header docstring matches `match-block` AST node consumption + SYM PASS 20 downstream contract
- `compiler/src/block-splitter.js` — STRUCTURAL_RAW_BODY_ELEMENTS Set added (line 123-125); COMPOUND_LIFT_EXEMPT_TAGS extended with "match" (line 140-144); header comments reference SPEC §18.0.1
- `compiler/src/ast-builder.js:10521+` — dispatcher case produces `kind: "match-block"` with `forType` + `onExprRaw` + `armsRaw`; comment block cites SCOPING + Q-MB-1
- `compiler/src/symbol-table.ts:8952+` — SYM PASS 20 docblock cites SPEC §18.0.1 line 9561+ / §18.0.2 line 9618+ / Q-MB-5 (new §34 row)
- `compiler/SPEC.md §18.0.1` — normative bullet added per Q-MB-5
- `compiler/SPEC.md §34` — +1 row for E-MATCH-ON-REQUIRED
- 4 new test files at `compiler/tests/unit/` — all green at S107 close

**Disposition:** No action — compliant SHIPPED state.

### `docs/known-gaps.md` README cross-reference (NEW S107)

**Verified:** README.md current-state blockquote (post-v0.3.0 STABLE section) adds "Known gaps" paragraph naming match block-form inline + linking to `docs/known-gaps.md`. No README compliance issue.

---

## Carry-forward uncertain items (from prior baselines + 1 NEW S107)

### docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md  [CARRY from S103]

**Reason:** content-heuristic — status "SCOPE PREPARED — awaits convener authorization to fire deep-dive (when corpus signal warrants)"; trigger conditions may still be unmet.

**What to check:** Has the deep-dive been authorized? If trigger conditions remain unmet, deref to `scrml-support/archive/` if no active dispatch planned. Status unchanged S104-S107.

### docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md  [NEW UNCERTAIN S107]

**Reason:** content-heuristic — Article references `E-CHANNEL-INSIDE-PROGRAM` (retired in S87 v0.3 direction reversal; canonical is `E-CHANNEL-OUTSIDE-PROGRAM`). S107 changelog explicitly flags this article as **"pre-S87 channel direction (archived pre-v0.3 article)"** — a documented carry-forward but NOT yet derefed.

**What to check:** Article is dated 2026-04-29 (pre-S87 ~2026-05-12 direction reversal). Either (a) update text to current direction + rename, or (b) deref to `scrml-support/archive/articles-skipped/` as historical with pre-v0.3 framing. Decision-point for the next maps-refresh / non-compliance pass.

**PA-internal note:** Same article also surfaced in S107 Bug-6 commit body as out-of-scope-this-session ("docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md describes pre-S87 channel direction").

### docs/PA-SCRML-PRIMER.md lines 615/780/781/785  [PA-internal — not a publish surface]

**Reason:** content-heuristic — Same `E-CHANNEL-INSIDE-PROGRAM` retired-code references appear in PRIMER text describing B19 SYM PASS 15 (channel placement validation).

**What to check:** PRIMER is PA-internal — NOT an adopter surface. Sentinel framing per S96 memory directive ("PA SHALL read the SPEC at session start") supersedes PRIMER paraphrasing per Rule 4. PRIMER stale-text follow-up: PRIMER refresh for §7/§18/channel-direction pre-S87 stale sections.

**Disposition:** Not surfacing as actionable compliance flag — PRIMER is non-load-bearing; SPEC is normative per Rule 4. PRIMER refresh is carry-forward in S108-open queue (master-list S107 close addendum line ~6).

---

## Bug 6 verification (S107 — completed; no follow-up)

**Bug 6 SHIPPED:** S107 `c4d1114` retired 2 hallucinated error-code references in `docs/website/pages/`:
- `engine.scrml:65-66` E-ENGINE-INCOMPLETE-COVERAGE → E-ENGINE-STATE-CHILD-MISSING (canonical per §34 line 14825)
- `logic.scrml:179` E-PURE-VIOLATION → E-PURE-001 (canonical per §34 line 14678)

**Verified post-S107:** `grep -rn 'E-ENGINE-INCOMPLETE-COVERAGE\|E-PURE-VIOLATION' docs/` returns 0 hits.

**Side-session-predicted retired-rename class (verified 0 hits in S107 sweep):**
- E-DERIVED-ENGINE-INITIAL-UNDEFINED → -ABSENT
- E-REACTIVE-005 → E-DERIVED-CIRCULAR-DEP
- E-CHANNEL-002 → E-CHANNEL-SHARED-MODIFIER
- W-NULL-IN-SCRML-SOURCE → W-ABSENCE-IN-SCRML-SOURCE

**Disposition:** Closed — methodology validated Rule 4 (canonical catalog had answers; predicted-drift list was prior-mental-model).

---

## S107 Changes vs S106 Baseline

**New compliant docs added S107:**
- `docs/known-gaps.md` (NEW; adopter-direct ledger) ✓
- `docs/changes/match-block-form-scoping/SCOPING.md` (NEW; 5-phase plan + 10 OQs) ✓
- `docs/changes/match-block-form-scoping/progress.md` (NEW; append-only progress log) ✓
- `compiler/src/match-statechild-parser.ts` (NEW; 530L Phase 2 parser) ✓
- 4 new unit test files (bug-3-diagnostic-file-paths + bug-5-const-interpolation + match-block-parser-phase1 + match-block-phase2) ✓
- 6 dogfood bug reports archived to `handOffs/incoming/read/` (S106 side-session origin pull; processed during S107 triage cascade) ✓
- SPEC.md §18.0.1 normative bullet + §34 +1 row E-MATCH-ON-REQUIRED ✓
- master-list.md S107 CLOSE addendum (~600 lines at top) ✓
- docs/changelog.md S107 entries (per-commit detail) ✓
- README.md (designer note section + Known gaps paragraph + rule= clarification + Tier-ladder table row updates) ✓
- handOffs/hand-off-109.md (S107 close rotation; S108 OPEN scaffolded) ✓

**S106 non-compliant items previously fixed:** Already addressed in S106 non-compliance.report.md (runtime-perf SCOPING status flip + SPEC §48.6.4 implementation-pending sentence flip).

---

## Compliant (no action needed)

The following categories were scanned and found compliant at S107 HEAD:

- compiler/SPEC.md (post-S107 §18.0.1 normative + §34 +1 row), compiler/SPEC-INDEX.md, compiler/PIPELINE.md (v0.7.2) — authoritative specs, current
- compiler/native-parser/README.md — M1.4 + M1.5 template-mode status consistent with code
- docs/articles/* (15 articles) — devto content; **carry-forward: realtime-and-workers-as-syntax-devto-2026-04-29.md flagged uncertain (pre-S87 direction)**
- docs/audits/* — dated audit snapshots, compliant as historical records
- docs/changes/runtime-perf-scoping/SCOPING.md — closed SCOPING ✓
- docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md — active SCOPING (B2 SHIPPED S106; B4 queued S107) ✓
- docs/changes/runtime-perf-phase-3-select-row/ — closed S103 ✓
- docs/changes/§13.2-*, §36-*, a1-closeout, a2-1, a2-2, a2-reachability-solver-scoping, a-2-8-* — closed dispatch records
- docs/changes/a3-auth-graph-scoping/ — A-3 all sub-phases closed S91
- docs/changes/a-4-2-* through a-4-7-* — A-4 sub-phase dispatch records (all closed S91)
- docs/changes/a-5-1-* through a-5-5-* — A-5 sub-phase dispatch records (all closed S92)
- docs/changes/m-7c-d-12-runtime-sentinel-scoping/ — M-7C-D-12 completed S90
- docs/changes/03-contact-book-auth-redirect-SCOPING/ + 03-contact-book-auth-redirect/ — closed dispatch record
- docs/changes/null-eradication-*, undefined-eradication-* (post-derefs S104), stdlib-phase-1-5-null-sweep — closed dispatch records
- docs/changes/wave-4-*, v0next-inventory/ — closed or current inventory (post-S104 derefs)
- docs/changes/schemaFor-scoping/SCOPING.md — closed S104 with SCOPE-CLOSED footer ✓
- docs/changes/tableFor-scoping/SCOPING.md — closed S105 with SCOPE-CLOSED footer ✓
- **docs/changes/match-block-form-scoping/ — active S107 (Phases 1+2 SHIPPED; Phases 3+4+5 queued)** ✓
- docs/changelog.md — current S107 ✓
- docs/PA-SCRML-PRIMER.md — **carry-forward: stale pre-S87 channel-direction sections at lines 615/780/781/785 (PA-internal; non-load-bearing)**
- docs/tutorial.md, docs/lin.md, docs/external-js.md — reference docs, compliant
- docs/website/v0.3.0-announce-2026-05-14.md, docs/website/roadmap-from-v0.3-2026-05-14.md — release announcements, compliant
- docs/website/pages/ (post-Bug-6 sweep) — 2 hallucinated codes retired; canonical §34 names now used ✓
- docs/pinned-discussions/w-program-001-warning-scope.md — pinned decision record, compliant
- **docs/known-gaps.md (NEW S107)** — adopter-direct live ledger ✓
- DESIGN.md, README.md (post-S107 refresh), scrmlFormula.md, pa.md, master-list.md — live project documents, compliant
- examples/, e2e/, samples/, benchmarks/, lsp/, editors/, scripts/ READMEs — operational docs, compliant
- compiler/src/codegen/README.md, compiler/tests/ READMEs — test fixtures docs, compliant
- docs/changes/m1-1-native-lexer-skeleton/, m1-2-strings-and-templates/, m1-3-comments/, m1-4-regex/, m1-5-template-mode/ — closed dispatch records, match code ✓
- docs/changes/combined-lint-additions-s98/ — S98 lint dispatch records, match code ✓
- docs/changes/s100-tailwind-engine-extension/ — §26.6 typography dispatch, matches tailwind-classes.js ✓
- docs/changes/mpa-entity-decoding-fix/ — $& injection fix dispatch, matches codegen/index.ts ✓
- docs/changes/heads-up-s95-bugs/ — S95 bug catalog and progress; closed items match code ✓
- docs/changes/perf-characterization/ — S94 perf characterization baseline; historical data ✓
- benchmarks/RESULTS.md — benchmark results record (S103 Playwright update + S105 README refresh + S106 B2 cross-Bun caveat), compliant ✓
- handOffs/incoming/read/ — 6 archived dogfood bug reports (post-S106 triage); processed in S107 ✓

## Note on INDEX.md staleness

`.claude/maps/INDEX.md` was stale at last scan (S88 close, commit `9b98118`). Refreshed at this S107 maps refresh to align test counts + commit SHA.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s108 #v0.3.3 #match-block-shipped-end-to-end #bug-5-p3-closed #bug-1-floor-plus-full-fix-3-waves #bug-4-c-narrow #form-for-b5-shipped #pgo-c2-fold #spec-7-4-2 #spec-4-17 #spec-26-4 #spec-41-14-7 #w-tailwind-unrecognized-class #known-gaps-rotated-4x #scrml-support-untracked

## Links
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [primary.map.md](./primary.map.md)
- [docs/known-gaps.md](../../docs/known-gaps.md)
- [docs/changes/match-block-form-scoping/SCOPING.md](../../docs/changes/match-block-form-scoping/SCOPING.md)
