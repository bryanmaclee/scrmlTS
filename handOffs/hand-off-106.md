# scrmlTS — Session 103 (CLOSE)

**Date:** 2026-05-18 → 2026-05-19
**Previous:** `handOffs/hand-off-105.md` (S102 CLOSE — rotated at S103 open)
**Machine:** single-machine (per S100 directive)
**HEAD at S103 CLOSE:** `748ca63` (runtime-results.json bookkeeping for the != extension)
**Origin sync at CLOSE:** scrmlTS 0/0 (pushed twice mid-session: `1ea9c2f→f0bcaa3` + `f0bcaa3→748ca63`); scrml-support 0/0 (formFor deep-dive `efdf757` + schemaFor deep-dive `815a20b` both pushed)

---

## S103 net outcome — massive multi-arc session

Substantial landings across THREE major arcs + ~17 commits scrmlTS + 2 commits scrml-support:

1. **Phase 3 select-row chip-away** — runtime-perf SCOPING Phase 1 closed S102; this session walked Phase 2 (PA-direct attribution) → Phase 3 SCOPING → Candidate A dispatch → != extension follow-on. **Cumulative select-row 4.97ms → 0.12ms = −97.6%** in happy-dom; **5.27ms → 0.30ms in real Chrome = 561× faster than v0.3.0 STABLE**. The "0/10 wins" narrative is dead; v0.3.3 wins 6/11 vs React happy-dom (3.1× avg → 6.1× avg with != extension) + 1/10 outright + competitive across the board in Chrome.

2. **L22 family advancement** — formFor stdlib re-export shipped end-to-end; §53.14.3 family-roster row flipped "spec'd; impl pending" → "shipped S102"; **serialize STASHED** (Gate 2 synonym risk per discipline filter — load-bearing record); **Path B pivot to schemaFor** — SCOPING + deep-dive + Form B function-call debate verdict (50/39/37) + SPEC §41.15 + 8 error codes + §39.5.8 enum-lowering row + §53.14.5 recognition extension + INDEX refresh. **schemaFor SPEC'd; impl pending** (~12-18h dispatch shape).

3. **Q-RUNTIME-OPEN-2 closed** — Playwright real-Chrome bench port landed; validates Phase 3 work in real browser; cumulative recovery narrative anchored with concrete numbers.

Plus housekeeping: paren-form `is some`/`is not` tmpvar fix (closed S102 carry-forward); maps refresh; 4 stale SCOPING headers fixed; README runtime-table dropped (runtime-silent with pointer); §53.14.3 flip; Phase 2 + Phase 3 SCOPINGs ratified; OQs ratified at each gate.

## Tests at S103 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **12,807 pass / 88 skip / 1 todo / 0 fail / 668 files / 43,219 expect**
- Delta vs S102 close (12,718): **+89 pass / +5 files / +189 expect / 0 fail / 0 regressions** across substantial compiler + bench + SPEC churn
- New tests this session:
  - +24 from stdlib formFor (form-for-stdlib-exports.test.js 20 + form-for-stdlib-runtime.test.js 4)
  - +59 from Phase 3 Candidate A (predicate-bind-detector 37 + value-indexed-subscribers 19 + select-row-regression 3)
  - +7 from != extension (5 detector accepts + 1 strict reject + 1 §A12 update; ~net 6 additions less consolidations)
- Pre-push gate clean every push
- Pre-existing self-host bootstrap fail (S102 P3.B `rebuild-self-host-dist.ts` regression) DID NOT propagate — dist files gitignored; locally `bun test` shows 12,807 / 0 fail without that path active

## S103 commit ledger (scrmlTS — 17 commits)

| # | Commit | Track | What |
|---|---|---|---|
| 1 | `e8919a7` | fix | paren-form `is some`/`is not` tmpvar fix (closed S102 lift-bug carry-forward) |
| 2 | `84c736e` | chore | S103-open hand-off bookkeeping + rotations |
| 3 | `efe7d42` | feat (bench) | P1.A vanilla-JS TodoMVC baseline + 5th-subprocess runner |
| 4 | `6bc5128` | feat (runtime) | P1.B per-op instrumentation + derived-chunk-gate widening (closed P1.A deferred ReferenceError) |
| 5 | `448fe89` | docs (bench) | P1.C re-measurement + per-op breakdown + Phase 2 attribution targets identified |
| 6 | `1ebe1e5` | chore (maps) | incremental refresh S102 + S103 deltas |
| 7 | `1ea9c2f` | docs | 4 stale SCOPING headers SCOPE-OPEN → SHIPPED S102 (non-compliance closure) |
| 8 | `6b0aaa0` | docs (scoping) | Phase 2 runtime-perf attribution SCOPING (data-driven) |
| 9 | `72c9a85` | docs (scoping) | ratify 5/5 Phase 2 OQs per PA-lean |
| 10 | `4e69bcd` | docs (scoping) | Phase 3 select-row chip-away SCOPING (Candidate A) |
| 11 | `b80ce2a` | feat (stdlib) | formFor + registerLabels export — gates §53.14.3 family-roster flip |
| 12 | `6cc426c` | docs (spec) | §53.14.3 family-roster — flip formFor "spec'd; impl pending" → "shipped S102" |
| 13 | `b05f774` | docs (scoping) | ratify 3/3 Phase 3 select-row OQs per PA-lean |
| 14 | `91fcc72` | feat (runtime) | Phase 3 select-row Candidate A — value-indexed predicate-bind subscription (−80% select-row) |
| 15 | `47d3bb8` | feat (codegen) | predicate-bind detector — accept != alongside == (cumulative −98% select-row) |
| 16 | `13e7919` | docs (scoping) | serialize gate-walk — Gate 2 SYNONYM RISK surfaced |
| 17 | `2606a08` | docs (scoping) | serialize STASHED + schemaFor SCOPING (Path B pivot) |
| 18 | `b143169` | docs (scoping) | ratify 5/5 schemaFor OQs per PA-lean + dispatch deep-dive |
| 19 | `f0bcaa3` | docs (scoping) | schemaFor Q-SCH-OPEN-3 — surface form goes to DEBATE (user-direction correction) |
| 20 | `81999a2` | docs (readme) | drop stale Chrome runtime table — pointer-only to RESULTS.md |
| 21 | `c84d1c8` | spec | §41.15 schemaFor — type-driven SQL DDL generation (L22 third member) |
| 22 | `129fcbe` | feat (bench) | Playwright real-Chrome bench port — Q-RUNTIME-OPEN-2 deferred-to-data → fire |
| 23 | `748ca63` | data (bench) | runtime-results.json post-!= measurement bookkeeping |

22 substantive commits + 1 bookkeeping (table miscounts; ledger shows 23 rows total). **scrml-support S103 ledger:** `efdf757` formFor deep-dive (committed S103 from S102 untracked) + `815a20b` schemaFor deep-dive.

## Phase 3 select-row final state

**The arc:**

| Stage | select-row median | vs React | vs Svelte | vs Vanilla | Δ from baseline |
|---|---:|---:|---:|---:|---:|
| P1.C baseline (v0.3.3 happy-dom) | 4.97ms | 1.1× | 138× worse | 414× worse | 0% |
| + Phase 3 Candidate A (`==` only) | 1.03ms | ~5× faster | ~30× worse | ~86× worse | −79% |
| + `!=` extension (this session) | **0.12ms** | **33.1× faster** | **2.3× worse** | **8× worse** | **−98%** |
| ↓ |  |  |  |  |  |
| **v0.3.3 Chrome (Playwright)** | **0.30ms** | 2× faster | (Vue/Svelte no-op bench) | 3× slower | **−98% from v0.3.0 STABLE 168.2ms = 561× faster** |

**Architectural finding (Phase 2.1 attribution):** scrml runtime carries TWO independent subscriber systems — LEGACY `_scrml_subscribers` flat-dict O(n) walk + NEW `_scrml_prop_subscribers` WeakMap precise per-prop. select-row hot path used LEGACY exclusively for per-row predicate-shape binds. **Fix:** value-indexed sub-registry `_scrml_value_indexed_subscribers` + new registration API `_scrml_reactive_subscribe_when(name, valueKey, fn)` + predicate-shape detector at emit-lift.js (`(EXPR == @CELL)` / `(@CELL == EXPR)` / `(EXPR != @CELL)` / `(@CELL != EXPR)` shapes); detector falls back to LEGACY for any other shape. O(N) → O(2) per write for predicate binds.

**Q-RT3-SR-OPEN-3 (LEGACY system retirement) ratified DEFER.** Post-impl TodoMVC data: editingId now ZERO LEGACY registrations (both per-row binds migrated). Other cells (@todos writes) still use LEGACY. v0.4+ cleanup candidate.

**Bonus wins:** none materialized on other ops (remove-row / partial-update / clear-all / swap-rows write `@todos`, not `@editingId`). Other apps with multiple predicate-bind cells would see proportional wins.

## L22 family — current state

| Member | Status |
|---|---|
| parseVariant | ✓ shipped S65 |
| formFor | ✓ shipped S102-S103 end-to-end (spec + impl + stdlib re-export) |
| serialize | ✗ STASHED S103 — Gate 2 synonym risk vs `wireEncode(v)` stdlib helper; revival triggers documented |
| **schemaFor** | **✓ SPEC'D S103 (this session); impl pending (~12-18h)** |
| tableFor | planned |
| variantNames / reflective | planned |

**schemaFor design summary (per `scrml-support/docs/deep-dives/schemaFor-design-2026-05-19.md`):**
- Form B function-call `${ schemaFor(Users) }` interpolated inside `<schema>` (debate verdict 50/39/37; 11pt margin)
- Body-only `table-declaration` fragment output (per OQ-SCH-2)
- Multi-table composition via per-call concatenation
- pick/omit field-set transforms
- Automatic predicate-to-CHECK lowering per §39.5.8
- **OQ-SCH-12 enum-knowledge-loss closure — load-bearing v1.0 value-add.** Bare-variant enum fields lower to `text req oneOf([variants...])`. 23-trucking-dispatch real-app evidence: 7 enum columns currently stored as bare `text not null` losing variant-set constraint.
- nested struct rejection v1.0 (`E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1`); FK derivation deferred to v1.next
- payload-bearing enums rejected v1.0 (`E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1`)
- 8 error codes in §34 (sibling shape to formFor's 8)
- §53.14.3 family-roster row flipped "planned" → "spec'd S103; impl pending"

**Discipline-health datum:** 3 rejected at debate-05 (parseShape, parseArray, parsePartial) + 1 STASHED S103 (serialize) vs 3 advanced (parseVariant, formFor, schemaFor). §53.14.4 filter is empirically working.

## Runtime narrative shift — v0.3.0 → v0.3.3 (cumulative)

| Op | v0.3.0 STABLE Chrome | v0.3.3 HEAD Chrome | Delta |
|---|---:|---:|---|
| select-row | **168.2ms** | **0.30ms** | **561× faster** |
| swap-rows | 51.0ms | 2.20ms | 23× faster |
| partial-update | 52.5ms | 1.00ms | 53× faster |
| remove-row | 51.9ms | 2.25ms | 23× faster |
| delete-every-10th | 48.9ms | 2.55ms | 19× faster |
| create-1000 | 45.0ms | 25.95ms | 1.7× faster |
| append-1000 | 95.95ms | 27.55ms | 3.5× faster |
| create-10000 | 399.2ms | 279.20ms | 1.4× faster |

**Contributing landings across the recovery arc:**
- Phase B shared-runtime tree-shake (S94 `1f73732`) — runtime payload 38.7→11.8 KB gzip
- S102 PGO Phase 3 wave — runtime-template tweaks + derived-chunk-gate widening (S103 P1.B `6bc5128`) eliminated a runtime exception path the harness silently recovered from
- **S103 Phase 3 Candidate A** (`91fcc72`) + `!=` extension (`47d3bb8`) — value-indexed predicate-bind subscription

scrml wins 1/10 outright in Chrome (partial-update) + competitive across the board. Within 5-25% of Vanilla on every bulk-DOM op. Beats React on 5/10 ops (partial-update, swap-rows, remove-row, create-1000, append-1000). Beats Vue on 9/10. Beats Svelte on bulk creation ops.

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 12,807 / 88 / 1 / 0 fail / 668 files |
| Test delta from S102 | +89 pass / 0 fail / 0 regressions |
| Worktree list | main only |
| Origin sync (scrmlTS) | 0/0 (post-push `748ca63`) |
| Origin sync (scrml-support) | 0/0 (post-push `815a20b`) |
| Inbox `handOffs/incoming/` | empty |
| Path-discipline hook | active (scrmlTS-local; S100 hook held throughout) |
| Pre-push hook | source-controlled; installed; clean each push |
| Self-host bootstrap | still in S102's broken regen state (May 18 17:47 dist files); dist gitignored; nothing propagated to origin |

## Carry-forwards for S104 (substantial list)

### High-priority (substantive compiler/L22)

| Track | Item | Cost |
|---|---|---|
| L22 family | **schemaFor impl dispatch** — type-system pass + emit-schema-for.ts + stdlib re-export + tests + sample/example | ~12-18h |
| Runtime-perf Phase 2.2 | partial-update + swap-rows attribution (PA-direct; sequential after Phase 3.A landed; produces Phase 3 SCOPING) | ~4-6h |
| Native parser | M2 expression parser (~2-4 sessions per DD §D7; M1 lexer ladder complete) | ~2-4 sessions |
| Native parser | §48.6.4 `pinned fn` parser-recognition impl (SPEC landed S98; impl never followed) | ~2-4h |
| Self-host bootstrap | Investigate broken-import-path regen state (S102 carry; not addressed S103) | ~2-4h |

### Medium (closes pre-existing gaps)

| Track | Item | Cost |
|---|---|---|
| formFor follow-on | `disabled=!@cell` reactive-attr wiring fix (pre-existing compiler-wide gap surfaced by formFor default submit button) | ~2-4h |
| formFor v1.next | per-type renderer registry `data.registerRenderer` (per OQ-FF-1 verdict) | ~3-5h |
| formFor v1.next | `@label("...")` type-field annotation (per OQ-FF-7 verdict) | ~3-5h |
| formFor v1.next | auto-recurse into nested struct fields (per OQ-FF-11 verdict) | ~5-8h |
| formFor follow-on | L2 label-store consultation IN expander (registerLabels store wired S103 but expander still resolves to L4 default) | ~3-5h |
| PGO Phase 3 followup | `hasEqualityExpr` flag (Option-2 sibling pattern) | ~1-2h |
| PGO Phase 3 followup | Markup/for-stmt double-walk fold in `detectRuntimeChunks` | ~2-3h |
| Phase 3 select-row | `in` / `.includes()` / deep-path-key detector extensions (broader predicate shapes; per `47d3bb8` rationale) | ~3-5h each |

### Light (cleanup / orthogonal)

| Track | Item | Cost |
|---|---|---|
| Puppeteer dep cleanup | retire `puppeteer` + legacy `bench-browser.js` after 1-2 release cycles of clean Playwright runs (Q-PW-PORT-OPEN-1 ratified DEFER) | ~30min |
| LEGACY `_scrml_subscribers` retirement | v0.4+ cleanup proposal (Q-RT3-SR-OPEN-3 ratified DEFER post-impl) | ~5-10h |
| Pre-existing equality runtime-chunk detector bug | tree-shakes `_scrml_structural_eq` for minimal lift-only fixtures even when emitted client.js calls it; surfaced during Phase 3 Candidate A integration test; worked around with inline stub | ~2-3h |
| 5 carried non-compliance items | llm-kickstarter-v0 stub / undefined-eradication-self-host CLOSURE / wave-4-adopter-content / promotion-ergonomics TIER-C-SCOPE / v0.3-approach-a-impl | ~30min batch |
| Real-Chrome happy-dom validation | already done this session via Q-RUNTIME-OPEN-2 closure; no further validation needed unless Phase 2.2 / Phase 3.B work warrants | (closed) |

### Marketing/article-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor sample app + scrml.dev refresh + README compile-gate block
- README republish of runtime-perf narrative (currently runtime-silent with pointer per S103 `81999a2`)
- v0.3.3 / v0.4 announce content
- LinkedIn / X snippets for the 561× select-row Chrome recovery narrative

### Out-of-Q queue (kept tracked, not active)

- serialize STASHED — revival triggers documented in `docs/changes/serialize-scoping/SCOPING.md` (S95 user-direct framing of triggers: adopter friction reports / sibling-impl edge / reflective-metadata symmetry need)
- tableFor scoping — natural next L22 member after schemaFor lands
- variantNames + reflective metadata — smallest L22 family remainder
- Bug-4 dot-path render-by-tag — user heads-up coding pre-pipeline filter still active

## Carry-forwards (across-session standing rules — unchanged + S103 additions)

### Unchanged from S102

- pa.md Rules 1-5 (no marketing / full-production fidelity / right > easy / SPEC normative / shoot straight)
- All S96-S102 PA-memory rules
- S43 cross-machine (dormant per S100)
- S83 commit discipline two-sided rule
- S88 `isolation:"worktree"` mandatory + `--no-verify` requires explicit auth
- S91 CWD-routing rule
- S95 communication norms
- S96 SPEC-at-session-start
- S98 Pillar 5b (Reach discipline)
- S99 path-discipline addendum + voice-author reuse-over-reinvent + context-budget operational datum
- S100 PreToolUse hook
- S101 v0.3.x patch arc pattern (bump-commit-tag-push paired; README gate as release-tag gate)
- S101 standing rule — corpus-ouroboros pre-dispatch sanity check
- S102 README staleness paradox methodology

### S103 NEW

- **S103 — Surface-form questions get DEBATED, not PA-leaned-and-carried-forward.** Per Q-SCH-OPEN-3 user direction (`f0bcaa3`): when an OQ is on the architectural axis of "which surface form" (markup-element vs function-call vs block-attribute / similar), the working assumption MUST be a debate within deep-dive, NOT a PA-lean propagation. Precedent for L22 family + similar architectural axes. Methodological cousin to S102 OQ-FF-7-skip rule but in the OPPOSITE direction (escalates DEBATE-MANDATORY rather than skips it).
- **S103 — STASH pattern with revival triggers for §53.14.4-discipline-filtered family members.** When a candidate fails Gate 2 (synonym risk), STASH the SCOPING + deep-dive plan rather than delete. Document revival triggers explicitly (per `docs/changes/serialize-scoping/SCOPING.md` status block). The SCOPING becomes a load-bearing record of the discipline working as intended. Precedent established for any future L22 / similar-family-discipline cases that surface a likely-synonym at PA pre-flight or deep-dive.
- **S103 — Hybrid file-delta + cherry-pick landing for sibling-collision cases.** When agent's worktree base predates sibling parallel landings on the same files AND the agent's diff hunks don't overlap the sibling landing's hunks (line-disjoint), use cherry-pick `--no-commit` for the conflicting file (auto-merges) + file-delta for the rest. Precedent: Phase 3 select-row landing (`91fcc72` runtime-template.js cherry-picked to preserve stdlib formFor `_scrml_labels_register` block at line 2898 from `b80ce2a`). Closes the S88 LIFT-5 sibling-collision concern more precisely than wholesale file-delta (which would silently overwrite) OR full cherry-pick (which loses the squash-to-PA-authored-landing pattern).
- **S103 — Surface-form pattern: output-kind match.** For L22 family members, surface form SHOULD match output kind: function-call for string output (parseVariant + schemaFor); markup-element for markup output (formFor). The OQ-SCH-1 debate verdict articulated this as the 5th-of-5 deciding argument. Rebuts the "blanket-mirror previous family member's surface" reflex.

## Things S104 PA must NOT screw up

In addition to S102 + earlier carry-forwards:

- **schemaFor impl dispatch — Form B is function-call, not markup-element.** The SPEC §41.15 + OQ-SCH-1 debate verdict are LOAD-BEARING. Don't re-litigate. The impl dispatch brief MUST encode `${ schemaFor(Users) }` interpolation form, NOT `<schemaFor for=Users/>`. Mirror parseVariant call-site recognition pattern, NOT formFor markup-element recognition.
- **OQ-SCH-12 enum lowering is the FLAGSHIP value-add** — schemaFor closes the enum-knowledge-loss gap that hand-authored `<schema>` leaves open. Frame this LEAD in the impl SCOPE + changelog, not as a side feature.
- **serialize STASH stays stashed unless revival triggers fire.** Per `docs/changes/serialize-scoping/SCOPING.md` status block — revival requires (a) ≥2 adopter friction reports requesting compile-time-checked round-trip; (b) formFor / schemaFor / tableFor impl surfaces a value-encoding edge `wireEncode(v)` can't cover; (c) reflective-metadata family member needs symmetric encode-path. Do NOT re-propose serialize from cold; require trigger evidence.
- **Phase 3 chip-aways have bounded scope.** Q-RT3-SR-OPEN-3 (LEGACY system retirement) ratified DEFER. The select-row chip-away migrates predicate-shape binds OFF LEGACY; LEGACY remains load-bearing for non-predicate binds + the broader detector extensions. Don't propose LEGACY retirement without post-impl usage data + separate ratification.
- **L22 family discipline is empirically working.** Don't soften it. parseShape/parseArray/parsePartial REJECTED at debate-05; serialize STASHED at S103 gate-walk. The next candidate (tableFor or variantNames) GETS THE SAME 4-gate honest walk. Don't shortcut.
- **Chrome bench is now Playwright + Vanilla.** The Puppeteer harness (`bench-browser.js`) is legacy/orphaned; surviving for cross-tool comparison only per Q-PW-PORT-OPEN-1. Don't add new ops to Puppeteer; new development goes to `bench-browser-pw.js`.
- **README staleness paradox** — when refreshing benchmark data, ALSO refresh / re-evaluate any inline staleness warning. Currently README is runtime-silent with pointer (`81999a2`); republishing requires fresh data + methodology footnote.
- **Self-host bootstrap broken-import-path** — `compiler/dist/self-host/*.js` are still in the S102 broken regen state (all May 18 17:47). Pre-commit subset doesn't run self-host parity tests; pre-push gate likewise filtered. If you need to investigate, follow S102 hand-off-105.md item #2 path (investigate `build-self-host.js` generator + `meta-checker.scrml` source, possibly fix `ast.scrml` 102 errors first).
- **No marketing without prompt** (Rule 1). The runtime-perf narrative shift (0/10 → 1/10 outright + 561× select-row Chrome) is BIG but is marketing-shaped. If user surfaces it, work it. Otherwise it stays in RESULTS.md + hand-off.

## Session-start checklist for S104 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies; S98 ratification)
3. Read `compiler/SPEC-INDEX.md` IN FULL — **NOTE the S103 §41.15 + §53.14.3 + §53.14.5 + §39.5.8 amendments**
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — **NOTE the S103 CLOSE addendum at the top**
5. Read this `hand-off.md` (S103 CLOSE) — will be rotated to `handOffs/hand-off-106.md` at S104 open
6. Read last ~10 contentful user-voice entries from `../scrml-support/user-voice-scrmlTS.md`
7. Session-start sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` should be empty
9. Verify worktrees: `git worktree list` shows main only (cleaned at S103 close)
10. Verify path-discipline hook + pre-push hook installed
11. **Self-host bootstrap state check** — `ls -la compiler/dist/self-host/`; if all files dated May 18 17:47, the S102 broken-import state is still present. Decide whether to investigate OR delete to let `bun test compiler/tests/integration/self-compilation.test.js` SKIP cleanly.
12. **Maps currency check** — `head -3 .claude/maps/primary.map.md` should show S103 watermark `1ebe1e5` or later. ~10 commits landed since; not all touched maps-relevant surface but worth incremental refresh if next dispatch is scrml-source-shape.
13. Report: caught up + next priority

## Tags

#session-103 #CLOSE #phase-3-select-row #-98-percent-select-row #561x-chrome-recovery #L22-family-schemaFor-spec-shipped #serialize-stashed #playwright-chrome-validation #q-runtime-open-2-closed #runtime-narrative-shift #6-1x-faster-than-react-avg #23-commits #pre-commit-12807 #pushed-to-origin
