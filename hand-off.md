# scrmlTS — Session 107 (CLOSE)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-109.md` (S106 CLOSE — rotated at S107 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S107 CLOSE (pre-wrap):** `c91fae0` (match-block Phase 2 SHIPPED)
**HEAD at S107 CLOSE (post-wrap):** `<wrap-sha>` (this hand-off + master-list + changelog wrap commit)
**Origin sync at CLOSE:** scrmlTS post-push 0/0; scrml-support 0/0 (no changes this session)

---

## S107 net outcome — 9 substantive commits + major spec-vs-impl gap discovery + impl arc through Phase 2

Session was scoped at OPEN as "drain dogfood-bug carry from S106." Net result: **9 substantive PA-direct commits** + the discovery of a structural spec-vs-impl gap (`<match>` block-form unparsed) that triggered a 5-phase impl arc, with **Phases 1 + 2 shipped** end-to-end this session. The "Known gaps" surface added to docs/known-gaps.md is a new adopter-direct meta-doc that didn't exist before — closes the mouth-to-reality framing the user surfaced ("v0.3.0 stable was overclaimed if it means every spec'd surface implemented").

Commits in order:

1. **`c70176e`** `feat(codegen): bug-5 Phase 1 — ${IDENT} non-reactive interpolation wires textContent` — closed dogfood Bug 5 HIGH-severity symptom; added one-shot textContent write at DOMContentLoaded for non-reactive `${VERSION}` / `${"literal"}` interpolations; 19 unit tests + tilde-guard; 17 regressions surfaced + fixed via kind-guard restriction.

2. **`a7fbfa8`** `feat(codegen): bug-5 Phase 2 — close Anomalies B + C (phantom placeholder + orphan no-op)` — closed phantom `<span data-scrml-logic>` from decl-only logic bodies + orphan `IDENT;` / `_scrml_reactive_get("count");` no-op JS at file-scope; 7 new tests + 4 brittle pre-existing tests fixed (engine-event-handler-writes `_scrml_attr_onclick_2` hardcoding → regex).

3. **`f5d35b6`** `docs(readme): add "A note from the designer" section` — user-authored personal note inserted between tagline and v0.3.0 STABLE blockquote; PA fixed user-confirmed typos (department / husband / doesn't / experiments / language / at least), preserved deliberate casualness (fudging / regurget-asemble-ing / lowercase "i" / fragments).

4. **`2e9f9c3`** `fix(diagnostics): bug-3 — [BS] / [TAB] errors + warnings carry file:line:col` — closed dogfood Bug 3 (MED, internal-consistency between W-LINT-* and BS/TAB diagnostic streams); api.js collectErrors enriched with optional filePath; bsSpan→span normalization; dev.js + build.js formatters mirror W-LINT-* shape; 6 unit tests.

5. **`c4d1114`** `docs(website): bug-6 — retire 2 hallucinated error-code references` — closed dogfood Bug 6 (MED, DOC-DRIFT); discovered the actual drift was different from side-session prediction (zero retired-rename hits; instead 2 codes that were NEVER in §34: E-ENGINE-INCOMPLETE-COVERAGE → E-ENGINE-STATE-CHILD-MISSING + E-PURE-VIOLATION → E-PURE-001); also surfaced PRIMER + article follow-ups as out-of-scope.

6. **`b4a8db1`** `docs(scoping): match-block-form impl arc — 5-phase plan, 4 OQs ratified` — README rule= clarification investigation traced silent acceptance of `<match>` to opaque html-fragment fallthrough; entire SPEC §18.0.1+§18.0.2+§18.0.3 unparsed; SCOPING.md authored with 5-phase plan + 10 OQs (4 ratified: Q-MB-1 new AST kind / Q-MB-3 reuse §51.0.B.1 payload parser / Q-MB-5 new E-MATCH-ON-REQUIRED row / Q-MB-7 cut-over no migration); README rule= clarification + Tier-ladder table row updates bundled in.

7. **`a3629fe`** `docs: honest "Known gaps" surface — README callout + docs/known-gaps.md` — user-direction: "honest current state, link to error log, major ones called out on front page"; new `docs/known-gaps.md` adopter-direct curated list of spec-vs-impl drift (HIGH/MED-HI/MED/LOW-MED severity; status: spec'd/scoping/in-impl/blocked); README current-state blockquote adds "Known gaps" paragraph naming match block-form inline + linking to the file.

8. **`82c48fd`** `feat(match-block): Phase 1 — structured AST node for <match> block-form` — found actual root cause was one line in block-splitter.js (`<match>` missing from `COMPOUND_LIFT_EXEMPT_TAGS`); two-site fix produces structured `kind: "match-block"` AST node with `forType` + `onExprRaw` + `armsRaw`; 9 unit tests; Phase 1 known limitation: bare-body only (`:`-shorthand deferred to Phase 2).

9. **`c91fae0`** `feat(match-block): Phase 2 — 5 SYM diagnostics + arm-parser + :-shorthand` — Phase 2 ships full structural validation: STRUCTURAL_RAW_BODY_ELEMENTS BS gate + match-statechild-parser.ts (NEW, 440 lines) recognizing 3 body forms + wildcard + payload bindings + new SYM PASS 20 firing all 5 diagnostics + SPEC §34 + §18.0.1 amendments naming E-MATCH-ON-REQUIRED; 18 unit tests; `:`-shorthand limitation closed.

## Tests at S107 CLOSE

- **Pre-commit subset** (unit + integration + conformance): **13,087 pass / 88 skip / 1 todo / 0 fail / 681 files / 44,430 expect**
- **Full `bun test compiler/tests/`**: **15,930 pass / 169 skip / 1 todo / 0 fail / 714 files / 46,845 expect**
- Delta vs S106 close (full 15,867 / 710 files / 46,721 expect): **+63 pass / +4 files / +124 expect / 0 fail / 0 regressions**
- New tests by track: Bug 5 const-interpolation (Phase 1 + 2) 26 · Bug 3 diagnostic file paths 6 · Match Phase 1 9 · Match Phase 2 18 = 59 new + 4 fixture-shape adjustments to existing tests

## S107 commit ledger

| # | Commit | What | Tests |
|---|---|---|---|
| 1 | `c70176e` | bug-5 Phase 1 (${IDENT} interpolation) | +19 |
| 2 | `a7fbfa8` | bug-5 Phase 2 (Anomalies B + C) | +7 |
| 3 | `f5d35b6` | README designer note | — |
| 4 | `2e9f9c3` | bug-3 ([BS]/[TAB] file:line:col) | +6 |
| 5 | `c4d1114` | bug-6 (hallucinated error refs) | — |
| 6 | `b4a8db1` | match-block SCOPING + README rule= | — |
| 7 | `a3629fe` | known-gaps surface + README callout | — |
| 8 | `82c48fd` | match-block Phase 1 (AST node) | +9 |
| 9 | `c91fae0` | match-block Phase 2 (5 diagnostics + parser + `:`-shorthand) | +18 |
| 10 | `<wrap-sha>` | this wrap commit | — |

Both repos pushed at close.

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 13,087 / 88 / 1 / 0 fail / 681 files / 44,430 expect |
| Tests full pre-push gate | 15,930 / 169 / 1 / 0 fail / 714 files / 46,845 expect |
| Test delta from S106 | +63 pass / +4 files / +124 expect / 0 fail / 0 regressions |
| Worktree list | main only (no in-flight dispatches) |
| Origin sync (scrmlTS) | post-wrap push: 0/0 |
| Origin sync (scrml-support) | 0/0 (no changes this session) |
| Inbox `handOffs/incoming/` | empty |
| Path-discipline hook | active (Configuration B installed; `.git/hooks/` has pre-commit + post-commit + pre-push) |
| Post-commit hook | INSTALLED (full-suite re-run on compiler changes + TodoMVC gauntlet + browser validation) |
| Pre-push hook | INSTALLED (full suite + TodoMVC quick check + README scrml gate on release-tag pushes; ~5min) |
| Self-host bootstrap | unchanged (S102 broken-import-path still unaddressed) |
| Maps watermark | `d8427f2` (S105) — **9 commits behind HEAD** (this session's 9 substantive landings + wrap). **S108 session-start MUST refresh BEFORE any dev-agent dispatch.** |
| scrml-support untracked | unchanged from S106 (voice articles + tools/ — user's territory) |
| docs/known-gaps.md | NEW THIS SESSION (4 open + 3 closed-in-S107; adopter-facing) |
| Match block-form impl arc | Phases 1+2 SHIPPED; Phase 3 (codegen render dispatch, ~3-5h) queued; Phase 4 (bare-variant inference + edges, ~2-3h) queued; Phase 5 (samples + tests + docs, ~2-3h) queued |
| pkg.json version | 0.3.3 (unchanged — no release cut this session) |

## Carry-forwards for S108

### High priority — match block-form Phase 3 (codegen render dispatch)

| Phase | Item | Cost |
|---|---|---|
| **Match Phase 3** | Codegen — per-arm render dispatch + reactive subscription on on= cell; mirrors engine state-child render dispatch shape | ~3-5h PA-direct |
| **Match Phase 4** | Bare-variant inference (§18.0.3) + payload-binding type-system integration (§18.0.1 line 9586-9588 parenthesized form) | ~2-3h PA-direct |
| **Match Phase 5** | Sample fixtures + integration tests + browser test (runtime arm-swap on reactive change) + docs/known-gaps.md rotation (match-block moves from "in-impl" to closed) + PRIMER §18 refresh | ~2-3h PA-direct |

### High priority — remaining dogfood bugs (carried from S106)

| # | Severity | Item | Cost |
|---|---|---|---|
| Bug 1 | HIGH | Tailwind arbitrary-value classes silent no-op (`grid-cols-[auto_1fr_auto]`) | floor (lint unrecognized): ~2-3h; full fix: medium |
| Bug 2 | MED-HI | Phantom E-SYNTAX-050 + 4-cascade on multi-line `<a>` + entity-encoded body | needs bisecting reducer; ~2-4h |
| Bug 4 | LOW-MED | Bare `?{` / `/` in markup copy — no docs-mode escape | deep-dive on design space; ~3-5h |

### High priority — Bug 5 Phase 3 (carried from S106)

| Phase | Item | Cost |
|---|---|---|
| **Bug 5 Phase 3** | Constant-folding (Option γ) + SPEC §7.4.2 normative section + tilde context threading + multi-binding placeholder dedup | ~5-8h aggregate |

### Substantive (mid-tier remaining from S105 / S106)

| Track | Item | Cost |
|---|---|---|
| Phase 3.B | B4 count-derived dep precision (agent-dispatched; Q-RT3B-OPEN-2 ratified) | ~3-5h |
| formFor v1.next | B2/B3/B4/B5 (registerRenderer / @label / auto-recurse / L2 label-store) | ~12-22h aggregate |
| PGO Phase 3 follow-up | C2 Markup/for-stmt double-walk fold + C3 detector extensions + C4 equality runtime-chunk cleanup | ~7-11h |
| Native parser | M2 expression parser | ~2-4 sessions |
| Self-host bootstrap | broken-import-path investigation (S102 carry; still unaddressed S103-S107) | ~2-4h |

### tableFor v1.next follow-ups (carried from S106)

| # | Item | Cost |
|---|---|---|
| 2 | §41.16.7 sort-state cell as explicit state-decl | small |
| 3 | §41.16.8 E-TABLEFOR-SELECTABLE-CELL-WRONG-TYPE strict-mode fire-site | small |
| 4 | OQ-TF-7 positional/computed `<column>` slots | medium |
| 5 | §17.4a for/else codegen (pre-existing gap; `<empty>` slot text emission) | medium |
| 6 | `date`/`timestamp` BUILTIN_TYPE entries | small (cross-L22 scoping) |
| 7 | Inline event handler shape with non-`event` arrow param | small |

### Investigations + follow-ups noted in commits

- **Engine `:`-shorthand at file-top has same BS trap** (noted in match Phase 2 commit body): compound-state-decl misclassification + text-block split. Engine tests use bare-body so doesn't surface in CI. Same fix shape as match (STRUCTURAL_RAW_BODY_ELEMENTS gate) but engine state-children have structural needs beyond raw-body capture — design needed. Filed for follow-up.
- **PRIMER §7 / §18 / channel-direction sections** describe pre-S87 state in 4-5 lines (PA-internal doc; not adopter-facing). Queue for primer-audit follow-up (per Bug 6 commit body).
- **docs/articles/realtime-and-workers-as-syntax-devto-2026-04-29.md** (line 131) describes pre-S87 channel direction; archived article describing pre-v0.3 behavior. Needs editorial reframe OR "pre-v0.3 snapshot" header (per Bug 6 commit body).
- **docs/website build** currently fails on Bug 2/4 patterns in 4 files (9 E-SYNTAX-050 errors); pre-existing dogfood findings. dist/ regen will follow once Bug 2/4 close.
- **runtime-results.json drift** — committed baseline on Bun 1.3.13; S106 measurement was on 1.3.6; if S108 does runtime-perf work, re-measure on matched Bun.
- **Maps refresh required BEFORE any dev-agent dispatch S108** (9 commits behind).

### v1.0+ follow-up

- Structural cleanup of browser-test effect-leak pattern (G1 close residue from S105)

### Light (cleanup)

- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER; awaiting 1-2 release cycles post-S103 Playwright cutover)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)

- formFor + schemaFor + tableFor combined sample app + scrml.dev refresh + README compile-gate block
- L22 family 4-of-6-shipped narrative + tableFor admin-UI-lift adoption pitch
- v0.4 announce content
- Match block-form + Known gaps frame ("we're being honest about gaps now") adoption story

## Things S108 PA must NOT screw up

In addition to S96-S106 carry-forwards:

- **Maps refresh BEFORE any dev-agent dispatch** — 9 commits behind watermark `d8427f2`. PA-direct fold-in OR re-attempt project-mapper agent at session-start.
- **Match block-form Phase 3 codegen mirror** — Phase 3 implements per-arm render dispatch; the natural mirror is engine state-child render dispatch in `emit-engine.ts` + `emit-html.ts`. PA must read those files in full per pa.md Rule 4 (SPEC §51 is the spec authority for engine; §18.0.1 is for match — both are normative). Phase 3 codegen should produce output that adopters CAN run in browser (not just compile-time validation).
- **`</match>` is the canonical closer for match block-form at Phase 2 baseline** — Phase 5 may add `</>` support but until then, adopters must write `</match>` explicitly. The `docs/known-gaps.md` Phase 5 item documents this.
- **Engine `:`-shorthand follow-up** — orthogonal to match arc but discovered during Phase 2 investigation. If S108 touches engine codegen or any engine `:`-shorthand work, the BS-layer trap surfaces.
- **Known gaps file is adopter-direct** — rotate as gaps close (each closure should remove the entry from open list + add to closed-for-reference section). PA maintains.
- **Hook gate is Configuration B** — local-rich (pre-commit + post-commit + pre-push). `--no-verify` is the S88 process-violation surface; never bypass without explicit authorization.

## Session-start checklist for S108 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (Pillar 5b applies)
3. Read `compiler/SPEC-INDEX.md` IN FULL — note S107 SPEC change: §34 +1 row (E-MATCH-ON-REQUIRED) + §18.0.1 normative bullet
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — note S107 CLOSE addendum at top
5. Read this `hand-off.md` (S107 CLOSE) — will be rotated to `handOffs/hand-off-110.md` at S108 open
6. Read last ~10 contentful user-voice entries — no new entries this session
7. Sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0
8. Inbox check — `handOffs/incoming/*.md` should be empty
9. Verify worktrees: `git worktree list` shows main only
10. Verify hook gate: `git config --get core.hooksPath` empty (Configuration B `.git/hooks/`) with pre-commit + post-commit + pre-push installed
11. Self-host bootstrap state check — `ls -la compiler/dist/self-host/`; partial-broken state persists from S102; decide whether to investigate OR delete to skip cleanly
12. **Maps currency check + REFRESH** — `head -3 .claude/maps/primary.map.md` will show `d8427f2` watermark; HEAD is 9 commits ahead. REFRESH BEFORE any scrml-source-shape dispatch.
13. **Read `docs/known-gaps.md`** — NEW THIS SESSION; adopter-facing gap log. Update as Phase 3/4/5 close match-block; update as Bug 1/2/4 close.
14. **Surface carry-forward list** — top priority is match-block Phase 3 (codegen); secondary is remaining dogfood bugs (1/2/4) + Bug 5 Phase 3 + mid-tier (Phase 3.B B4, formFor v1.next).
15. Report: caught up + next priority

## Tags

#session-107 #CLOSE #match-block-impl-arc #bug-5-phase-1-2 #bug-3 #bug-6 #known-gaps-surface #readme-designer-note #spec-vs-impl-gap-discovery #9-commits #+63-pass #pre-commit-13087 #full-suite-15930
