# scrmlTS — Session 129 (CLOSE)

**Date:** 2026-05-24 (OPEN) → 2026-05-25 (CLOSE)
**Previous:** `handOffs/hand-off-131.md` (S128 CLOSE)
**Machine:** same as S128 (no switch).
**HEAD at S129 OPEN:** `63aff3b4` (S128 wrap commit).
**HEAD at S129 CLOSE:** `1b8317bd` (Q8 close) — will advance to wrap-docs commit on the chore(s129-close).
**pkg.json:** 0.6.0 (no tag).
**Push state at close:** scrmlTS unpushed (S129 has 10+ commits ahead of origin); scrml-support unpushed (user-voice S129 appended). **NOT PUSHED** — user said "wrap" without push verb; per pa.md default-no-push without explicit push authorization.

---

## S129 CLOSE SUMMARY — read first

A pivotal session. PA was about to dispatch a D8c parser-fix that would have ADDED a contradiction back into scrml. User pulled the brakes hard and ratified a 4-phase grammar-lockdown plan. **3 audits ran (Phase 1a + 1b + 1c). HU-2 Phase-2 batch fully closed (6 questions + 2 in-session-surfaced findings ratified).** Plus the D8a-i parser fix landed before the brakes-pull.

**Substantive ratifications closed:**
- F-001 / F-009 / F-008 / F-016 (V-kill cluster — 4 LB closed on Q5)
- F-021 (PIPELINE deriveEngineVarName — Q6)
- F-019 (§39.12 schema placement — Q7)
- F-018 (§55.5 validity surface predictability — Q8)
- F-003 + F-002 + F-009-1a + F-010 (Approach C bun.eval cascade — HU-1 close)
- E-EVAL-001 retire (Q4 — F-003 source-cascade clean-up)
- F-023 + F-024 (NEW — lifecycle annotation flagship catch-up + `to` contextual keyword)
- D8a-i parser fix landed (commits `6b6e3086` + `7d2ef528`)

**Tests at close:** **21,414 pass / 0 fail / 170 skip / 1 todo / 784 files.** strict-pass EXACT held 964. Within-node 1005/0. Zero regressions across any HU-2 commit.

**Banked methodology (7 new memory files):** amendment-direction-and-target-explicit · triage-genuine-needs-spec-crosscheck · no-greek-chars-in-options · bidirectional-hole-detection · grep-fire-sites-before-claiming-coverage · cohesion-and-falls-under-fingers · plus banked observation (3x re-validated): PIPELINE/SPEC prose drift from already-correct compiler behavior is the dominant Phase 2 work shape.

**Audit deliverables (3 docs landed in main):**
- `docs/audits/spec-consolidation-inventory-2026-05-24.md` — Phase 1a (17 findings, 5 LB)
- `docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md` — Phase 1b (22 findings, 11 LB)
- `docs/audits/spec-feature-canon-coverage-2026-05-25.md` — Phase 1c (26 GAP findings, 11 LB)

**Heads-up running log:** `docs/heads-up/spec-consolidation-2026-05-25.md` — HU-1 + HU-2 ratifications + Phase 2 amendment scope per ratification.

---

## S129 OPEN STATE

Session opened clean under the still-governing S127 directive ("keep momentum until I stop you / do everything right") + the S126 M6 register ("intentional and exacting through M6").

**Session-start protocol completed read-only:** pa.md · PRIMER §1-§13.5 · SPEC-INDEX (full) · master-list §0.1-§0.6 · S128 CLOSE hand-off · last 3 sessions of user-voice (S126/S127/S128) · inbox (empty) · hooks (configuration B, all 3 installed) · cross-machine sync (both repos clean).

---

## S129 LANDING — flip-harness RE-MEASURE (reversible diagnostic; main untouched)

**Method.** Single throwaway-worktree isolation:worktree agent (`agent-aa6c735c7844b9c1c`). Bash-edit + no-`cd` discipline per S126. Single-line temp-flip at `compiler/src/api.js:604` (`parser = null` → `parser = "scrml-native"`); full `bun run test`; classify failing-file first-error into A/B/C/D/E per S127 scheme; discard. Main HEAD `63aff3b4` unchanged. Worktree cleaned post-report (`git worktree remove --force` + `branch -D`).

**Headline.**

| Measurement | Pass | Fail | vs S127 |
|---|---|---|---|
| Baseline (no flip) at HEAD `63aff3b4` | 21,397 | 0 | — |
| Under flip (default = scrml-native) | ~21,138 | **429** | **−138 / −24% vs 567** |

The 7 native-parser levers closed since S127 (D1+D2+C1+C2 from S127; D3+D6+D7 from S128 + D4-empty confirmation) moved the count from 567 → 429.

**Classification — file count of distinct first-fail-per-file (heuristic, by upstream first-error code):**

| Bucket | Files | Top first-error codes | M6.7-blocker? |
|---|---|---|---|
| A — engine bodyChildren | 13 | engine-assert-drift (8) · E-EXPR-UNEXPECTED (4) · E-STMT-MISSING-SEMICOLON (1) | NO — M6.6 work |
| B — within-node | 0 | (canary GREEN under allowlist) | NO |
| C — codegen-shape (DOMINANT) | 68 | assert-drift (6) · E-TYPE-020 (6) · E-SCOPE-001 (5) · E-CTX-001 (5) · W-TRY-CATCH-IN-SCRML-SOURCE (4) · E-COMPONENT-020 (3) | YES |
| D — parse-error | 37 | **E-EXPR-UNEXPECTED (23/37 = 62%)** · E-EXPR-UNCLOSED-BLOCK (4) · E-EXPR-UNCLOSED-BRACE (3) · E-STMT-MISSING-SEMICOLON (3) · E-UNQUOTED-DISPLAY-TEXT (2) | YES |
| E — cascade downstream | 325 fails / ~82 files | (same upstream classes) | closes with upstream |
| **Total fails** | **429** | **118 first-fails** (A+B+C+D real work) + 325 cascade | |

**Densest single-unit lever.** **D8 — E-EXPR-UNEXPECTED cluster (23 of 37 D-files).** A targeted D8 unit on this single error code could close ~62% of D-bucket. Triage genuine-vs-fixture FIRST (S128 D5 lesson — partly test-fixture-placeholder).

**Caveats from the diagnostic (banked operational signal):**

1. **Bun summary line missing under flip** — `promote-match.test.js` mocks `process.exit` via throw; under flip-default the native parser causes more failures in that file, and the cleanup path corrupts bun's final-summary printer. Counts derived from `(fail)` line count + at-anchors. Suite ran to completion (files alphabetically after promote-match had at-anchors). Not measurement-blocking. Worth filing as a small follow-on.
2. **`engine-body-render.test.js` (20 fails — largest single file) borderline A vs C.** Classifier put it in C because filename doesn't match engine-name whitelist, but first error is `E-UNQUOTED-DISPLAY-TEXT`. If reclassified A, A=14/C=67 (cosmetic — doesn't change the dominant-lever picture).
3. **A=13 vs S127's A=128 is NOT directly comparable.** S127 used M6.6-expectation-set; this agent's classifier used a strict engine-name whitelist. Use the trend signal (still A-class residual present + small), not the raw delta.
4. **Within-node + parser-conformance-corpus + parser-conformance-canary all GREEN under flip** (allowlist-gated; budget held).
5. **TodoMVC baseline noise** — first baseline run had 2 fails due to `benchmarks/todomvc/dist/` being gitignored + not built by `pretest`. Second run clean. Small recommendation: `pretest` could build todomvc dist explicitly; out-of-scope here.

**File-level recovery aids** (live only on the throwaway worktree, gone post-cleanup): `/tmp/s129-baseline.log`, `/tmp/s129-baseline2.log`, `/tmp/s129-stderr-raw.log`, `/tmp/s129-classification.tsv`. The TSV had per-file bucket+first-err+fail-count. If a future dispatch needs the per-file granularity again, re-run the harness — cost is ~20-25 min.

---

## S129 LANDING — D8 fixture-triage (read-only, no source touched, worktree auto-cleaned)

**Method.** Read-only isolation:worktree diagnostic (`agent-a76940cb28037d8db`). For each of the 23 D8-candidate test files: extract scrml source(s) under test, probe both live (`compileScrml({parser:null})`) AND native (direct `nativeParseFile` / `parseProgram` — NOT compileScrml's escape-hatch path), classify file into GENUINE-PARSE-GAP / FIXTURE-PLACEHOLDER / CASCADE-ONLY / UNCERTAIN, and decompose GENUINE bucket into sub-forms with minimal reproducers.

**Headline re-classification (the 23 files / 83 fails):**

| Classification | Files | Notes |
|---|---|---|
| **GENUINE-PARSE-GAP** | **10** | 9 distinct sub-forms (D8a–D8i below) |
| FIXTURE-PLACEHOLDER (metadata-tag) | 1 | unit-cc-write-at-body-top — native doesn't emit `_isUnitCCWrite` AST flag (parser-side metadata-tagging gap, not parse-gap) |
| CASCADE-ONLY | 12 | Native PARSES but downstream-pass divergence (codegen-shape / enum-variant-table / attr-scope / struct-field-extraction / stdlib-gather). Re-routes to C-bucket. |
| UNCERTAIN | 0 | — |

**LOAD-BEARING CLASSIFIER-LABEL DRIFT confirmed** (pa.md Rule 4 / S128 ops learning #5 in action). Of the 10 GENUINE files, **7 had a DIFFERENT first-error than the classifier's "E-EXPR-UNEXPECTED" label** on re-probe (E-STMT-FUNCTION-BODY, E-STMT-MISSING-SEMICOLON, E-EXPR-PARAM, E-AWAIT-NOT-IN-SCRML, etc.). E-EXPR-UNEXPECTED was usually the SECOND cascading error, not the first. The S129 re-measure's classifier-buckets are HEURISTIC — re-probe codes are authoritative. (NB: this means D-bucket total of 37 from the re-measure may have similar drift in the 14 non-D8 files — worth treating that count as ±5.)

**CASCADE BUCKET IS LOAD-BEARING TOO** — 12/23 files (52%) had no native parse-error at all; their fails are downstream-pass divergence (codegen-shape assertions, enum-variant table not populated by native, native `@x` not recognized as reactive-ref in attribute values, struct-field hoisting missing constraint-modifiers, stdlib gather re-entering host-fence parse). **These are NOT D-class** — they're C-class (codegen-shape) or M6.5-path-a adapter territory. The re-measure's D=37 should be re-categorized to D≈22-25 (after pulling CASCADE out) and C≈80-83 (after adding CASCADE in).

### GENUINE sub-form decomposition (9 sub-forms — these ARE D-class)

| Sub-form | Files | Re-probed fails | Shape | Density |
|---|---|---|---|---|
| **D8a — function param/return type annotation `(x: T) -> T`** | 4 (cross-file-components, fn-implicit-return, tilde-carry-forward, tilde-gaps-567) | ~30 | MULTI-FORM (param-type / return-arrow / fn-shorthand variants — splits into D8a-i / -ii / -iii) | **LARGEST** |
| **D8b — `^{}` host-fence opaque-passthrough (no JS mode switch)** | 2 (compiler-api, stdlib-shim-resolution) | ~16 | SINGLE-FORM | **HIGHEST SINGLE-UNIT LEVERAGE** — closes stdlib/compiler family |
| D8i — markup-literal as RHS `const x = <markup/>` at file-top | 1 (c22-bare-variant-codegen) | 5 | SINGLE-FORM | medium |
| D8c — typed-reactive-decl `@x: T = value` | overlaps D8a | ≥1 | SINGLE-FORM; may auto-close with D8a | small (and composed) |
| D8d — statement-boundary after `const x = [array]\n<y> = ...` | 1 (bug-5) | 1 | SINGLE-FORM | small |
| D8e — failable return marker `function f() ! T { ... }` | 1 (form-for-stdlib-runtime) | 1 | SINGLE-FORM; minimal repro includes D8a | small |
| D8f — scrml keyword as JS identifier (`fn`/`lin`/...) | 1 (arrow-object-literal-body subset) | 1-2 | SINGLE-FORM (keyword-list parity) | small |
| D8g — structured `<match for=T on=expr>...</match>` statechild block | 1 (match-block-phase2) | 1 | SINGLE-FORM but HIGH-COMPLEXITY (S107 Phase 2 parity required) | small files / large work |
| D8h — `when message.type == X { }` worker-message handler | 1 (program-documentary-attrs) | 1 | SINGLE-FORM | small |

**Total GENUINE fails ≈ 56-58** (of the 83 originally bucketed as D8 by the heuristic classifier). The 25-27 remainder is the 12 CASCADE files + 1 FIXTURE-PLACEHOLDER.

## S129 LANDING — D8a-i function return-type annotation FIX (PA-authored, S67 file-delta)

**HEAD:** `7d2ef528` (was `63aff3b4` at S129 open).

**Method.** Single isolation:worktree agent (`agent-acd69aa6d7bd2d5ec`). Phase-0 root-cause confirmation MANDATED + executed (caught PA hypothesis error: `TokenKind.Arrow` is `=>` not `->`; correct gate is `arrowFollows` predicate consuming `Minus`+`GreaterThan` per the sibling parseScrmlFunctionDecl pattern). SPEC §14 line 5590 anchored. Fix landed in BOTH `parse-stmt.js` AND `parse-stmt.scrml` mirror per S115. Coupled code+test commit per S113. Within-node canary spliced per-fixture per S128 ops #3 (no full-regen). S99 path-discipline: zero leaks; counter still at 15.

**Landed (S67 file-delta — 2 PA-authored commits):**
- **`6b6e3086`** fix(M6.7-D8a-i) — native `parseFunctionDecl` accepts `-> ReturnType` (parse-stmt.js +10 / parse-stmt.scrml +10 / new test m67-d8a-i-function-return-type.test.js +183L / +17 assertions across 4 blocks).
- **`7d2ef528`** test(M6.7-D8a-i) — within-node allowlist splice (13 fixtures moved; net -16 lines: 75 removed / 59 added; counts moved in both directions per expected splice pattern — some UP where the parsed function-body now exposes more spans/fields, some DOWN where formerly-divergent fields now match).

**Gates held:**
- Pre-commit hook PASSED both commits **without `--no-verify`**. One transient: PA's main checkout was missing `@modelcontextprotocol/sdk` (S126 added the dep but main hadn't `bun install`ed since). Ran install + retried clean. **Banked: post-S126 every machine needs `bun install` before first commit since MCP-V0.C added the SDK dep.**
- Post-commit hook PASSED both (full suite + TodoMVC validation green).
- strict-pass EXACT held at **964** every step.
- within-node canary post-splice: 1005 pass / 0 fail.
- Full `bun test` on main post-landing: **21,414 pass / 0 fail / 170 skip / 1 todo / 784 files** (+21 vs S128 baseline 21,393).

**4 D8a-i candidate files all PASS post-fix:** cross-file-components (13/13), fn-implicit-return-e2e (5/5), tilde-carry-forward (5/5), tilde-gaps-567 (11/11).

**Worktree cleaned post-landing** per S83 standing rule. Main-only.

**S129 banked operational signal (D8a-i Phase-0 catch):** PA hypotheses referencing token-kind names from memory MUST grep sibling call-sites before encoding into a dispatch brief. PA's `TokenKind.Arrow` suggestion would have silently failed (gate never fires — `->` is two tokens, not `Arrow` which is `=>`). The Phase-0 mandate caught it. Incident #6 of the D-class label-drift series; the rule "MANDATE Phase 0" continues to earn its keep.

---

---

## ⚠ S129 INFLECTION — BRAKES PULLED ON M6.7 PARSER-FIX WORK; GRAMMAR-CONSOLIDATION PLAN ENGAGED

**Trigger.** PA's D8c framing offered "SPEC amendment + corpus migration" as Option 2 without naming the DIRECTION of the amendment or the migration TARGET. User correctly identified this as the exact ambiguity-trap that could drift the language into unusability if mis-interpreted. Same shape as the S94 designer-card buried-axis incident and the S88 corpus-ouroboros stated-intent-vs-corpus pattern.

**User-voice S129 (verbatim, paraphrasable but record verbatim into next user-voice append):**
> "the option here is incredibly ambigous. I could misinterpret and suddenly, the langauge that I care deeply about starts to drift into unusability. the reason for the long prose at this time is that I have been biding my time. I figured we would get flipped to the native parser, and they I would start to bring up the issues that I have. I think maybe, I tried to move too fast. We're hitting the brakes hard. we are going to form a plan to solidify the grammer of this language. we need a source of truth with no contradictions. that means spec and canonical examples. once the semantics and syntax is locked in with no ambigutiy. then we will re-evaluate further refactor."
>
> "first, inventory, we need to know EVERY contradiction, ambiguity, and hole in the spec. once we have a spec that can be considered the un-equivical source of truth. we will likely to a heads up coding session or more. we will work-over every example, we will add examples as needed. once that is done, and we have confirmed that there is example code that corroborates the spec (100% coverage). then we will look at next steps."

**Plan ratified S129:**
- **Phase 1a — SPEC.md inventory** ✅ **LANDED `b3859770`.** 17 findings / 5 LB / 5 MED / 7 LOW. SPEC.md sequential walk; doc `docs/audits/spec-consolidation-inventory-2026-05-24.md` (577L).
- **Phase 1b — canon-anchored corroboration + PIPELINE.md + SPEC re-pass** ✅ **LANDED `1ac874f2`.** 22 findings / 18 substantive / 11 LB / 5 MED / 2 LOW. Canon-anchored projection out to SPEC; doc `docs/audits/spec-corroboration-canons-pipeline-2026-05-24.md` (625L). Pre-commit hook PASSED both commits; worktrees cleaned per S83.

---

## S129 CROSS-AUDIT SYNTHESIS — phase-1a × phase-1b

**Total combined LOAD-BEARING findings: ~15** (5 from 1a + 11 from 1b − 1 strong-overlap on V-kill §7.5).

### Strong corroboration (both audits independently surfaced the same surface)

| Finding | 1a | 1b | Theme |
|---|---|---|---|
| SPEC §7.5 grammar `state-decl ::= '@' identifier ...` violates V-kill (S123) | F-001 (LB) | F-009 (LB) | V-kill compliance |

The V-kill §7.5 finding is **HIGH-CONFIDENCE** — independent anchors converged. This is also the surface that triggered the brakes-pull (D8c).

### Phase 1a unique (SPEC-anchored walk caught these; canon walk didn't)

- **§52.4.1 sibling V-kill at server-authority** (F-016, LB) — pairs with §7.5
- **SPEC-wide ~30 worked example sites of pre-V-kill `@varname = init`** (F-008, LB) — mechanical example-migration corollary
- **§22.4 `bun.eval()` list** (F-002, LB) — Approach C META_BUILTINS closure
- **§30.2 `${}` interpolation Approach C subsumption** (F-003, LB, **GENUINE DESIGN QUESTION**) — `^{}` was closed by S114; `${}` was silent. Heads-up decides α (subsume) or β (carve-out).
- **§3.1 Contexts table HOLE** (F-004, MED) — missing `^{}` / `_{}` / `!{}`
- **§4.15 structural-elements registry incomplete** (F-011, MED)
- **SPEC-INDEX.md channel placement stale** (F-012, MED) — flagged for Phase 1b
- **Structural cleanup batch (LOW × 7):** F-005 TOC stops at §54 · F-006 §49 H1 · F-007 §53 H2 subsections · F-009 §7.2 cross-ref §29→§30 broken · F-014 §40 H4 numbered §39.x (11 sites) · F-015 §39 H4 mixed §38.x/§39.x · F-017 §52 deprecated `< TypeName>` space-form

### Phase 1b unique (canon-anchored projection caught these; SPEC walk didn't — including LB SPEC-internal contradictions Phase 1a missed)

- **SPEC §55.5 internal contradiction on validity-surface synthesis trigger** (F-018, LB) — PIPELINE + PRIMER pick opposite sides. **Phase 1a's sequential walk missed this entirely.**
- **SPEC §39.12 E-SCHEMA-003 contradicts §39.2 + §40.8 worked examples** on `<schema>` placement (F-019, LB) — **Phase 1a missed this.**
- **SPEC §6.11 stub uses singular `error: string`** vs auto-synth `errors: ValidationError[]` (F-005, MED) — **Phase 1a missed this.**
- **Kickstarter v2 stale wave** — channels file-level F-001 LB · `@debounced(N)` retired keyword F-002 + F-022 LB · `<x> pinned` wrong shape F-013 LB · rule= arrow form F-004 · `<*>` example shorthand F-007 · `< db>` with `protect=` F-020 · missing no-async/await F-003
- **PRIMER §6.2 code-default body bare prose** (F-014, LB) — S111 quoted-text model requires `"..."` display-text literal. **Recency-as-staleness:** PRIMER §6.2 was ADDED S122, one week after S111 ratification, and ALREADY drifted.
- **PRIMER §2 Pillar 5b ("Reach discipline", S98) absent from SPEC** (F-010, MED) — direction is SPEC catches up to canon
- **PIPELINE.md NR `deriveEngineVarName` strips "Machine" suffix** (F-021, LB) — SPEC §51.0.C explicit literal-no-strip + PRIMER B14 corroborates SPEC; PIPELINE is wrong
- **PIPELINE Stage 7.6 RS status internal inconsistency** (F-011, MED) — "INACTIVE" at 4 sites vs A-2.7 says "wired"
- **PIPELINE retired AST kinds in passive voice** (F-012, LOW)

### Heads-up agenda — proposed clustering for Phase 2 work

Cluster A (V-kill compliance — mechanical, 4 PRs of work):
1. SPEC §7.5 grammar (1a F-001 / 1b F-009) — STRONG CORROBORATION
2. SPEC §52.4.1 server-authority grammar (1a F-016)
3. SPEC-wide ~30 example migrations (1a F-008)
4. Kickstarter `<x> pinned` shape (1b F-013) — sibling adopter-doc fix

Cluster B (Approach C `bun.eval()` — 1 design decision + cascade):
1. **§30.2 `${}` Approach C subsumption** (1a F-003) — **GENUINE DESIGN QUESTION; everything downstream depends on this**
2. §22.4 list (1a F-002)
3. §7.2 list (1a F-010)
Once F-003 is decided, B2 + B3 mechanical-fix.

Cluster C (validity surface — SPEC-internal + canon drift):
1. SPEC §55.5 synthesis trigger contradiction (1b F-018)
2. SPEC §6.11 stub `error` vs `errors[]` (1b F-005)

Cluster D (schema/program shape):
1. SPEC §39.12 E-SCHEMA-003 vs §39.2 + §40.8 (1b F-019) — heads-up decides which direction `<schema>` placement goes

Cluster E (quoted-text model + bodies):
1. PRIMER §6.2 code-default bare-prose drift (1b F-014)
2. §3.1 Contexts table HOLE (1a F-004)
3. §40.8 default-logic body-mode silent in canons (1b F-008)

Cluster F (engine surface):
1. PIPELINE NR `deriveEngineVarName` (1b F-021)
2. SPEC §51.0.D cross-file mount clarity (1b F-016)
3. Kickstarter rule= arrow form scattered (1b F-004)

Cluster G (kickstarter wholesale refresh — multi-finding adopter doc):
1. `@debounced(N)` retired (1b F-002 + F-022)
2. Channels file-level stale (1b F-001)
3. `<*>` example shorthand not real (1b F-007)
4. `< db>` `protect=` (1b F-020)
5. Missing no-async/await rule (1b F-003)
6. Add Pillar 5b mention (or remove from PRIMER) (1b F-010)

Cluster H (structural cleanup batch — sed-style mechanical):
1. TOC + heading-level + renumber-leftover sweep (1a F-005/F-006/F-007/F-009/F-014/F-015/F-017)
2. SPEC-INDEX channel placement (1a F-012)
3. §4.15 structural-elements registry consolidation (1a F-011)
4. PIPELINE retired AST kinds passive-voice (1b F-012)

Cluster I (PIPELINE consistency):
1. PIPELINE Stage 7.6 RS status (1b F-011)
2. PIPELINE §55.5 synthesis trigger (1b F-018 — pairs with Cluster C1)

### Banked S129 cross-audit observations

- **Phase 1a's sequential walk missed 3 SPEC-internal contradictions Phase 1b caught** (F-005, F-018, F-019). Sequential reading creates attention budget that skips over internal cross-section contradictions if both sides are in the same "currently-reading" frame. The canon-anchored projection naturally cross-references because it consults SPEC at multiple sites per claim.
- **Phase 1b's canon-anchor naturally missed structural drift inside SPEC** (TOC, heading levels, renumber leftovers) — 7 LOW + 2 MED. Sequential walk catches these mechanically.
- **The parallel-fire was clearly worth the cost.** Combined coverage > either alone.
- **Recency-as-staleness pattern** banked: PRIMER §6.2 was added S122, drifted from SPEC §4.18 (S111) ONE WEEK later. New entries to canon docs are NOT automatically aligned to recent SPEC ratifications. Hand-authored canon entries need a "what ratifications must I conform to?" pre-write checklist.
- **Phase 2 — heads-up coding session(s).** User + PA work through findings item-by-item, ratify each, produce SPEC amendments + canonical-example additions. Iterative; may span multiple sessions.
- **Phase 3 — 100% example coverage.** Every SPEC section corroborated by canonical example code (samples/ + examples/). Add/migrate as needed.
- **Phase 4 — lock + re-evaluate.** Confirm SPEC = unequivocal source of truth. Then evaluate next steps (M6.7 D-class likely resumes with the consolidated SPEC as the GENUINE/LEGACY arbiter).

**Standing pause until Phase 4 complete:**
- M6.7 D-class parser-fix dispatches PAUSED. No D8c / D8e / D8f / D8g / D8h / D8i / D8a-ii / D8a-iii dispatches until grammar lockdown lands.
- D8a-i (commits `6b6e3086` + `7d2ef528`) stays landed — pure parser-completeness, didn't touch any SPEC-ambiguous surface.
- Flip-harness re-measure & D8 triage findings preserved in `/tmp/s129-*.{log,tsv}` + this hand-off (audit doc consumes them as Phase-1a cross-evidence).

**Banked S129 methodology rule (load-bearing for next-session PA + future dispatches):**
> When PA proposes a SPEC amendment + corpus migration, both the **direction of the amendment** (which SPEC text changes to what) and the **migration target** (which form replaces the deprecated one) MUST be named explicitly. No "amendment + migration" framing without those two specifics. Same family as S94 (designer-card framing — surface the load-bearing axis, don't bury it under a flat list) and S88 (corpus-ouroboros — stated intent vs corpus is migration, not deliberation). The S129 D8c framing was the precedent: "SPEC amendment + corpus migration" with no direction named could be read as either (α) consolidate to V5-strict (right answer) or (β) re-permit legacy `@x: T = v` and add a contradiction (drift). The user pulled the brakes.

**Banked S129 methodology rule (triage cross-check discipline):**
> Triage classifier "GENUINE-PARSE-GAP" labels MUST be PA-SPEC-cross-checked before any fix dispatch. The triage agent reads source + probes live; it does NOT cross-check against ratification order. Two examples this session — D8b `^{}` host-fence (live accepts legacy `^{ await import(...) }`; SPEC §22.12 ratifies scrml-only-inside-`^{}` per S114 Approach C; native correctly enforces) and D8c `@x: T = v` typed reactive-decl (live accepts; SPEC §14 line 5564 grammar production says it's a decl; §6.1 V5-strict + §34 V-kill (S123) ratify `<x>` as the structural-decl form and `@x = v` as a write to a pre-declared cell; native correctly enforces V-kill). Pattern: live often tolerates both canonical AND legacy; the native parser is the canonical-enforcer; "live accepts / native rejects" can mean (a) real parser-completeness gap OR (b) native correctly enforcing post-ratification SPEC against a legacy form. Disambiguation requires SPEC + ratification + canonical-canon (kickstarter/PRIMER) cross-check, NOT just "live-accepts."

---

### NEXT-DECISION — surfaced to USER (deprecated — superseded by S129 grammar-consolidation plan above)

**S129 D-class progress (now PAUSED):** S128 close baseline 429 fails-under-flip → D8a-i closes ~30 → est ~399 remaining. M6.7 D-class **paused** pending grammar lockdown.

**Recommended ordering (pa.md Rule 3 right-answer, density-per-effort) — UPDATED post-D8a-i landing:**

1. ~~**D8b — `^{}` host-fence opaque-passthrough.**~~ **DEFERRED per S129 reclassification — see banked lesson below.** Not a parser fix; SPEC §22.12 + §21.3.1 ratify scrml-only inside `^{}`. Stdlib migration to `import:host` (~10-20h multi-stage) → post-M6.
2. ~~**D8a-i — function param type annotation.**~~ **DONE S129** (`6b6e3086` + `7d2ef528`).
3. **NEXT: D8c — typed reactive-decl `@x: T = v`** (per triage, may have AUTO-CLOSED with D8a-i since D8c's repro re-uses param-type machinery; needs re-probe to confirm). If still failing, small fix similar to D8a-i shape. ~1 fail. Phase-0 SPEC-cross-check needed.
4. **OR D8e — failable return marker `function f() ! T {...}`.** 1 fail. Small fix; repro included D8a annotation (which now parses), so D8e may surface as a clean residual.
5. **OR D8i — markup-literal RHS `const x = <markup/>`.** 5 fails, SINGLE-FORM. Probably more involved (RHS-of-assignment expression-parser extension to recognize markup-literal).
3. **D8i — markup-literal RHS `const x = <markup/>`.** 5 fails, SINGLE-FORM.
4. **Singleton trickle (D8d / D8e / D8f / D8h).** 1-2 fails each, SINGLE-FORM each.
5. **DEFER D8g — match-block structured statechild.** SINGLE-FILE (1 fail) but HIGH-COMPLEXITY work (S107 Phase 2 parity). Wrong size for a quick D-class unit — file as larger structural sub-project.
6. **Re-route the 12 CASCADE files out of D-class** — they're C-bucket / M6.5-path-a adapter work, separate concern.
7. **File unit-cc-write-at-body-top as parser-side metadata-tagging gap** (not D-class; native parser doesn't emit AST metadata flags symbol-table.ts PASS-N reads).

**Banked operational learning (carry forward):**
- (S129 finding) **Classifier-label drift confirmed** on 7 of 10 files — E-EXPR-UNEXPECTED was usually the second cascading error, not the first. Heuristic bucketing is necessary-but-not-sufficient; re-probe with direct entry-points before any "D-class fix" dispatch.
- (S129 finding) **CASCADE-bucket sizing matters** — 12/23 files (52%) had no parse error at all under native. Pure-parse-gap units must be triaged out of the headline D-count or the count is misleading.
- (S129 finding — D8b PA Phase-0 catch) **Triage classifier doesn't cross-check against SPEC.** D8b ("`^{}` host-fence opaque-passthrough", 16 fails) was classified GENUINE-PARSE-GAP by the triage agent because live PARSES (BS extracts `^{}` body, Acorn handles `await import`). But SPEC §22.12 + §21.3.1 + S114 ratification ("Approach C") are unambiguous: **`^{}` body MUST NOT contain dynamic `await import(...)` calls** — that path is closed by M6 (joint retirement of BS + Acorn + BPP + JS-parser-in-`^{}`-body). The 14 stdlib/compiler/*.scrml files using the legacy `^{ await import(...) }` pattern are MIGRATION TARGETS (move to `import:host` per §21.3.1), NOT parser-fix targets. Native's rejection of `await` inside `^{}` is *correct enforcement*. **`import:host` is SPEC-only — zero references in `compiler/native-parser/` or `compiler/src/`; not implemented anywhere.** So Option-α "implement `import:host` + migrate stdlib" is a multi-stage ~10-20h work item (wrong size for a D8 sub-form unit). PA recommendation: **defer D8b entirely, pivot to D8a-i**. Pa.md Rule 3 + Rule 4 + the "stated intent vs corpus → migration not deliberation" S88 memory ([[feedback_stated_intent_vs_corpus_migration]]) all converge on this.
- (S129 banked lesson) **Every GENUINE classification from the triage agent MUST be SPEC-cross-checked by PA before dispatch.** The agent reads source + probes — it doesn't read SPEC for each sub-form's design intent. PA must apply the same Phase-0-root-cause-confirmation discipline that mandated against re-measure bucket labels. D8a (function param/return type annotation) was independently SPEC-verified as canonical per §14 + §48 — that one IS genuine. D8c-i (the others) need spot-checks before dispatch.

---

## Carry-forward state (unchanged from S128 CLOSE — see hand-off-131 §"Pre-existing carry-forwards" for the full list)

compiler-managed-async gap (A9-class) · 6nz-V (MED, GENUINE) · GITI-015 · 6nz-U / 6nz-L/T · MCP-V0.D/E · build-story arc (M6-gated) · V-kill READ fire · §29 vanilla-interop · Generator policy (S114 open) · dev.to articles · Living Compiler retraction · `~snapshot` · adopter corpus migration · **versioning drift pkg.json 0.6.0 vs changelog** (reconcile before any tag) · v0.7 cut (gated on M6.7 flip + M6.8 deletion).

---

## Operational learnings carried from S128 (apply this session)

1. `compileScrml(parser:scrml-native)` MASKS native parse failures (escape-hatch) — use direct `parseProgram` (JS bodies) / `nativeParseFile` (full .scrml) and inspect `.diagnostics`/`.errors`. [[feedback_native_parse_probe_method]]
2. Completed `isolation:worktree` agent DETERMINISTICALLY leaves PA Bash CWD in its worktree — at start of EVERY post-completion landing sequence: `cd /home/bryan-maclee/scrmlMaster/scrmlTS` + verify `pwd`, AND `git -C "$M"` for all git ops. [[feedback_cwd_slip_after_worktree_dispatch]]
3. The within-node regen LOOP has cross-file state/order artifacts — the per-fixture CANARY failure-list is ground truth. Splice ONLY moved fixtures. NEVER full-regen. NEVER trust a sequential regen loop's changed-set.
4. Parallel same-file landings (e.g., two units both touching `parse-stmt.js`) need `git diff base..branch -- file | git apply`, NOT wholesale `git checkout <branch> -- file` (the second wholesale checkout REVERTS the first). Verify both fixes coexist via grep after.
5. **D-class bucket labels keep being wrong/imprecise** (5 in a row at S128: b.3/D1/C1/C2/D4 empty; D6 narrowing wrong; D7 was KwGiven not E-EXPR-PARAM). Every brief's Phase-0 root-cause confirmation caught it each time. KEEP MANDATING IT.

---

## State-as-of-close

| Item | Value |
|---|---|
| HEAD at S129 CLOSE | `1b8317bd` (Q8 close) + chore(s129-close) wrap commit |
| pkg.json | 0.6.0 (no tag) |
| Full test (S129 CLOSE) | **21,414 pass / 0 fail / 170 skip / 1 todo / 784 files** (+21 vs S128 baseline; D8a-i +17 tests + within-node splice +4) |
| strict-pass canary | EXACT 964 (held across all D8a-i + audit landings) |
| within-node canary | 1005 pass / 0 fail (allowlist held + spliced 13 fixtures on D8a-i landing) |
| Worktrees | main only (all 4 dispatch worktrees cleaned post-landing per S83) |
| scrmlTS origin | **unpushed** — 10+ commits ahead from S129 work |
| scrml-support origin | **unpushed** — user-voice S129 appended (multiple times throughout session) |
| Inbox | empty (no incoming messages this session) |
| Hooks | configuration B (pre-commit + post-commit + pre-push); pre-commit PASSED on every commit |
| S99 path-discipline counter | 15 (zero new agent leaks across 4 dispatches: flip-harness re-measure + D8 triage + D8a-i fix + 3 audits) |
| Push state | **NOT PUSHED** — user said "wrap" without push verb; default-no-push per pa.md |

## NEXT-SESSION PRIORITY

The grammar-lockdown is in Phase 2. The HU-2 batch closed all 6 ratification questions; **Phase 2 amendment work is the next actionable wave** — predominantly doc-text editing (per the banked observation that PIPELINE/SPEC drift from compiler is the dominant work shape). Specifically:

1. **Phase 2 amendment dispatches** for the 6 LOAD-BEARING HU-2 ratifications: §7.5 grammar relocate to §6.1 + V-kill structural form + ~30 worked-example sweep + §52.4.1 grammar retirement + §52 examples migration; §22.4 list amendment + §30 retirement + §7.2 list amendment + §22.12 explicit clause + 8-site source-cascade cleanup; PIPELINE deriveEngineVarName fix; §39 prose update + E-SCHEMA-003 catalog row; §55.5 prose clarification + PIPELINE Stage 6.7 invariants extension.
2. **PRIMER + kickstarter F-023 catch-up** — flagship lifecycle annotation section + Phase 1c 8-cluster (H-O) catch-up. Substantial doc-authoring work (~25-40h spread across multiple sessions).
3. **HU-3 design questions queued:** iteration design surface (8-14h deep-dive + 2-3 HU sub-sessions); L19 multi-statement-handler relaxation; state-dynamics-design DD extension question; Q5.B sub-questions (server+pinned / server+validators / Tier1 vs Tier2 doc overlap).
4. **Compiler-implementation follow-ons:** E-SCHEMA-003 enforcement (currently no fire site).
5. **Versioning drift** reconcile (pkg.json 0.6.0 vs changelog) before any tag cut.

## Carry-forward state — combined HU-3+ queue + S128 pre-existing

**S129 new carry-forwards:**
- Iteration deep-dive (`<each>` + `@` bare + `:`-shorthand template body + multi-child + empty + key + composition; 8-14h deep-dive + 2-3 HU sub-sessions)
- L19 multi-statement-handler relaxation (HU follow-on, small)
- state-dynamics-design DD `status: active` extension question (does `(A to B)` extend to enum-state-cells?)
- Q5.B sub-questions (server+pinned composition, server+validators firing point, Tier 1 vs Tier 2 doc overlap)
- Phase 1c 8-cluster catch-up (H-O — 26 GAP findings F-025-F-055; 11 LB)
- F-003 source-cascade Phase 2 amendment work (8 compiler-source sites)
- E-SCHEMA-003 compiler-side enforcement (no current fire site)
- versioning drift reconcile (pkg.json 0.6.0 vs changelog)

**Pre-existing from S128 (still open):**
compiler-managed-async gap (A9-class transitive async-coloring; dashboard cluster) · 6nz-V (MED, GENUINE runtime class:NAME-on-for-lift) · GITI-015 (LOW) · 6nz-U / 6nz-L/T · MCP-V0.D/E · build-story arc (6 open Qs, M6-gated) · V-kill READ-side fire · §29 vanilla-interop · Generator policy (S114 open) · dev.to articles · Living Compiler retraction · `~snapshot` raw-sigil · adopter corpus migration · v0.7 cut (gated on M6.7 flip + M6.8 deletion).

**M6.7 D-class progress paused at S129 brakes-pull:** S128 close 429 fails-under-flip → D8a-i closed ~30 → est ~399 remaining. M6.7 D-class parser-fix dispatches paused; D-class resumes post-grammar-lockdown with the consolidated SPEC as the GENUINE/LEGACY arbiter.

## v0.7 critical path (post-S129)

Phase 2 amendment work (HU-2 ratifications + PRIMER/kickstarter catch-up + Phase 1c clusters; ~25-40h spread across sessions) → HU-3+ design ratifications (iteration + L19 + state-dynamics extension + Q5.B sub-Qs) → resume M6.7 D-class with consolidated SPEC → flip-harness re-measure → flip decision (USER) → M6.6 + SOAK + M6.8 deletion → v0.7 cut.

## Tags

#session-129 #CLOSE #STOP-validated #grammar-consolidation #3-audits-landed #HU-2-batch-closed #6-LB-findings-ratified #lifecycle-annotation-flagship #V-kill-cluster #cohesion-and-falls-under-fingers #to-contextual-keyword #D8a-i-parser-fix #21414-tests #not-pushed #intentional-and-exacting
