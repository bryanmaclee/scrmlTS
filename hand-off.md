# scrmlTS — Session 104 (OPEN)

**Date:** 2026-05-18 → (in flight)
**Previous:** `handOffs/hand-off-106.md` (S103 CLOSE — rotated at S104 open)
**Machine:** single-machine (per S100 directive)
**HEAD at S104 OPEN:** `5f4ada4` (S103 wrap commit — hand-off + master-list + changelog)
**Origin sync at OPEN:** scrmlTS 0/0; scrml-support 0/0

---

## S104 OPEN — session-start checklist completed

1. ✅ Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL (886 lines)
2. ✅ Read `compiler/SPEC-INDEX.md` IN FULL (347 lines; absorbed S103 §41.15 / §53.14.3 / §53.14.5 / §39.5.8 amendments)
3. ✅ Read `master-list.md` §0 LIVE DASHBOARD IN FULL (lines 120-292; S103 CLOSE addendum + Phase 3 + L22 schemaFor SPEC'D / serialize STASHED context loaded)
4. ✅ Read `hand-off.md` (S103 CLOSE → rotated to `handOffs/hand-off-106.md`)
5. ✅ Read last ~12 contentful user-voice entries (S98 typestate stub → S99 reuse-over-reinvent + bug-k auth + dev-server gaps + gingerBill DM + drift catches + Tailwind option-A + 61% context datum → S100 single-machine → S102 README staleness paradox + skip-OQ-FF-7 rule + vanilla baseline → S103 surface-form-debated + STASH-with-revival-triggers + Playwright-is-standard)
6. ✅ Session-start sync hygiene: scrmlTS 0/0 + scrml-support 0/0 (both fetched clean)
7. ✅ Inbox check — `handOffs/incoming/*.md` empty (68 prior in `read/`)
8. ✅ Worktree check — `git worktree list` shows main only
9. ✅ Hook check — `core.hooksPath = .git/hooks`; pre-commit + post-commit + pre-push all installed (configuration B per S88)
10. ✅ Self-host bootstrap dist state check — **PARTIAL state.** 9 of 13 files at May 18 17:47 (S102 broken regen); 4 files at May 18 18:33 (cg.js, meta-checker.js, module-resolver.js, tab.js). Heterogeneous; dist gitignored; nothing propagated to origin. Pre-commit subset excludes self-host parity tests; pre-push gate skipped per S100 hand-off describe.skip on `bs.test.js` setup-throws. Decision pending — leave as-is for now, surface if it blocks.
11. ✅ Maps currency check — `primary.map.md` watermark `84c736e` (S103 open); HEAD `5f4ada4` is **22 commits ahead**. Substantive code/spec deltas since (Phase 3 Candidate A + `!=` extension + §41.15 schemaFor + Playwright bench port + 4 SCOPING flips). Refresh before next scrml-source-shape dispatch.

## PA absorbed key state

**Three S103 narrative anchors carried into S104:**

1. **Phase 3 select-row 0/10-wins narrative is dead** — cumulative −98% in happy-dom; 561× faster than v0.3.0 STABLE in real Chrome (168.2ms → 0.30ms). Playwright real-Chrome bench is now the standard (Puppeteer legacy). scrml wins 1/10 outright + competitive across all bulk-DOM ops.

2. **L22 family schemaFor SPEC'D; impl pending (~12-18h dispatch).** Form B function-call `${ schemaFor(Users) }` interpolated inside `<schema>`. OQ-SCH-12 enum-lowering is the **FLAGSHIP value-add** — bare-variant enum fields lower to `text req oneOf([variants...])` automatically (closes enum-knowledge-loss-at-DB-boundary gap; 23-trucking-dispatch has 7 enum columns losing constraint today). 8 error codes in §34. serialize STASHED with revival triggers documented (Gate 2 synonym risk vs wireEncode).

3. **3 NEW durable methodology rules ratified S103:**
   - **Surface-form questions get DEBATED**, not PA-leaned-and-carried-forward (Q-SCH-OPEN-3 precedent; cousin to S102 OQ-FF-7-skip rule but OPPOSITE direction)
   - **STASH pattern with revival triggers** for §53.14.4-discipline-filtered family members (serialize precedent)
   - **Hybrid file-delta + cherry-pick** for sibling-collision dispatches when diff hunks are line-disjoint (Phase 3 select-row landing precedent)
   - **Surface form: output-kind match** — function-call for string output, markup-element for markup output (OQ-SCH-1 5th argument)

## Tests baseline (as of S103 CLOSE)

- Pre-commit subset (unit + integration + conformance): **12,807 pass / 88 skip / 1 todo / 0 fail / 668 files / 43,219 expect**
- 0 regressions across S103's 22 substantive commits

## S104 candidate priorities (per S103 CLOSE carry-forward)

### High (substantive compiler/L22)

| Track | Item | Cost |
|---|---|---|
| **L22 family** | **schemaFor impl dispatch** — type-system pass + `emit-schema-for.ts` + stdlib re-export + tests + sample/example. Form B function-call. OQ-SCH-12 enum-lowering is FLAGSHIP framing. | ~12-18h |
| Runtime-perf Phase 2.2 | partial-update + swap-rows attribution (PA-direct; sequential after Phase 3.A landed; produces Phase 3.B SCOPING) | ~4-6h |
| Native parser | M2 expression parser (~2-4 sessions per DD §D7; M1 lexer ladder complete; M1.2 in flight per master-list) | ~2-4 sessions |
| Native parser | §48.6.4 `pinned fn` parser-recognition impl (SPEC landed S98) | ~2-4h |
| Self-host bootstrap | Investigate broken-import-path regen state (S102 carry; not addressed S103) | ~2-4h |

### Medium (closes pre-existing gaps)

| Track | Item | Cost |
|---|---|---|
| formFor follow-on | `disabled=!@cell` reactive-attr wiring fix | ~2-4h |
| formFor v1.next | per-type renderer registry `data.registerRenderer` (OQ-FF-1 verdict) | ~3-5h |
| formFor v1.next | `@label("...")` type-field annotation (OQ-FF-7 verdict) | ~3-5h |
| formFor v1.next | auto-recurse into nested struct fields (OQ-FF-11 verdict) | ~5-8h |
| formFor follow-on | L2 label-store consultation IN expander | ~3-5h |
| PGO Phase 3 followup | `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h |
| PGO Phase 3 followup | Markup/for-stmt double-walk fold in `detectRuntimeChunks` | ~2-3h |
| Phase 3 detector extensions | `in` / `.includes()` / deep-path-key detector | ~3-5h each |

### Light (cleanup / orthogonal)

- Puppeteer dep cleanup after 1-2 release cycles of clean Playwright runs (~30min)
- LEGACY `_scrml_subscribers` retirement (v0.4+ proposal; ~5-10h)
- Pre-existing equality runtime-chunk detector bug (~2-3h)
- 5 carried non-compliance items batch cleanup (~30min)
- Maps incremental refresh — 22 commits since last watermark (~PA-direct)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- README republish of runtime-perf narrative (currently runtime-silent with pointer)
- v0.3.3 / v0.4 announce content
- 561× select-row Chrome recovery narrative — LinkedIn / X snippets
- formFor sample app + scrml.dev refresh

## Open questions to surface immediately

- **None at S104 OPEN.** Inbox empty. No unfinished cross-repo coordination. No mid-flight dispatches. All S103 work landed clean.

## Standing rules / S103-NEW carry-forward

All S96-S103 durable rules remain load-bearing. S103-NEW rules ratified:
- Surface-form questions get DEBATED (not PA-leaned)
- STASH pattern with revival triggers for §53.14.4-filtered candidates
- Hybrid file-delta + cherry-pick for sibling-collision dispatches
- Surface form: output-kind match (string→function-call; markup→markup-element)

## Things S104 PA must NOT screw up (carried verbatim from S103 CLOSE)

- **schemaFor impl dispatch — Form B is function-call, not markup-element.** SPEC §41.15 + OQ-SCH-1 debate verdict are LOAD-BEARING. Don't re-litigate. Mirror parseVariant call-site recognition pattern, NOT formFor markup-element recognition.
- **OQ-SCH-12 enum lowering is the FLAGSHIP value-add** — frame this LEAD in impl SCOPE + changelog, not as a side feature.
- **serialize STASH stays stashed unless revival triggers fire** — require trigger evidence; don't re-propose from cold.
- **Phase 3 chip-aways have bounded scope** — Q-RT3-SR-OPEN-3 (LEGACY system retirement) ratified DEFER.
- **L22 family discipline is empirically working** — next candidate (tableFor or variantNames) GETS THE SAME 4-gate honest walk. Don't shortcut.
- **Chrome bench is now Playwright + Vanilla.** Puppeteer harness is legacy/orphaned.
- **README staleness paradox** — refresh-or-remove inline warnings whenever you touch the table.
- **Self-host bootstrap broken-import-path** — still partial-broken state. Pre-commit subset doesn't run self-host parity tests.
- **No marketing without prompt** (Rule 1).

## Tags

#session-104 #OPEN #single-machine #schemaFor-impl-pending #runtime-phase-2-2-pending #m2-expression-parser-pending #pre-commit-12807
