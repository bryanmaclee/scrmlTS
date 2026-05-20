# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-20T17:07:32-06:00
# scan mode: FULL_COLD_START

## Summary

Total docs scanned: 203 (excluding node_modules, framework-comparison dirs,
.git/.jj/.claude, handOffs/, dist/, docs/website/**/dist/)
Compliant: ~98
Non-compliant: ~101
Uncertain: 4

The doc-compliance picture is essentially unchanged from the prior scan
(commit 78faa65). The dominant non-compliance is still `docs/changes/**` — a
working area the S61 and S79 maps-refresh scans already swept (S79 cut it to 4
KEEP-LIVE dirs; governing matrix: `docs/curation/2026-05-05-changes-dir-disposition.md`).
It has since regrown to **91 dirs** across the S80–S112 arc (3 new since the
prior scan). Per the "current truth only" scope principle, completed-and-landed
dispatch dirs belong in `scrml-support/archive/changes/`; in-flight
scoping/proposal docs are non-compliant for a dev-scoped repo map regardless.
This is not new drift — it is the recurring regrowth the prior scans both flagged.

## Delta since the prior scan (commit 78faa65)

New docs added since 78faa65 (12-commit window):
- `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — front-matter
  `status: ACTIVE`, the live charter-B native-parser tracking artifact → UNCERTAIN
  (KEEP-LIVE candidate; see below). The native-parser README and structure.map.md
  cite it as the implementation roadmap for the in-flight M-ladder.
- `docs/changes/native-parser-front-end/SPIKE-markup-js-seam-2026-05-20.md` —
  front-matter `status: draft-for-PA-review`, dated current → spike doc for the
  active arc; UNCERTAIN (KEEP-LIVE while the arc is in flight).
- `docs/changes/m2-1-native-parser-substrate/progress.md` — a just-landed dispatch
  progress file (M2.1 substrate; the work is committed at 4c2c4a0/038dd57/etc.) →
  NON-COMPLIANT (completed dispatch; deref to archive once the M2 arc closes).
- `docs/changes/quoted-text-model/IMPLEMENTATION-ROADMAP.md` was UPDATED to
  self-mark "STATUS SUPERSEDED — S111 charter-B pivot" (Waves 2-7 PAUSED). It is
  now a frozen/superseded planning doc — see flag below.

`compiler/native-parser/README.md` was updated (39-line diff) and remains
COMPLIANT: it is a current source-tree README; every backticked identifier in it
(`lex`, `LexMode`, `BlockContext`, `ParseMode`, `BracketStack`, `ErrorRecovery`,
`makeParseContext`) grep-resolves into `compiler/native-parser/*.js`. Its "M1.4
status" table is the accurate current status of the M1 lexer.

## Map-set state

The prior scan deleted stale map files (`events.map.md`, `native-parser.map.md`,
`INDEX.md`, `non-compliance.md`). None have regrown. This FULL_COLD_START
regenerated all 8 applicable maps (structure, dependencies, schema, config,
build, error, test, domain) + primary + this report. No new map files were
created — no conditional-map trigger fired (this is a compiler, not a web app).

## Non-compliant docs

### docs/changes/** — 91 directories (per-feature working dirs)
**Reason:** combo (location + name-heuristic + content-heuristic)
**Detail:** `docs/changes/` is the in-flight working area. Its files are
`SCOPING.md`, `progress.md`, `BRIEF.md`, `SURVEY.md`, `SCOPE.md`, `CLOSURE.md`,
`DEFERRED.md`, `*-AUDIT-*.md`, `SPIKE-*.md`, `DISPATCH-*.md`, `anomaly-report.md`,
`pre-snapshot.md`, `IMPLEMENTATION-ROADMAP.md` — by name and content these are
planning / progress / proposal / audit docs describing in-flight or just-landed
work, not current-truth reference. The changelog confirms many describe SHIPPED
features — those dirs are completed dispatches.
**Suggested disposition:**
  - Dirs describing SHIPPED-and-merged work → `deref to scrml-support/archive/changes/<dir>/`
    (the S61/S79 precedent — flat layout). This is the large majority:
    e.g. `null-eradication-*` (S89), `undefined-eradication-*` (S89),
    `formFor-*` / `schemaFor-*` / `tableFor-*` (S102-S103), `§13.2-impl-phase-*`,
    `§36-impl-phase-*` / `§36-input-devices-impl`, `a1-closeout`,
    `a2-1-module-scaffold`, `a2-2-component-1`, `a-2-8-emit-reachability-canonical`,
    `a2-reachability-solver-scoping`, `a3-auth-graph-scoping`,
    `a-4-2..a-4-7` + `a-4-per-route-artifact-splitter-SCOPING`,
    `a9-ext4-body-split-min-viable`, `match-block-form-scoping`,
    `m1-1-native-lexer-skeleton`, `m1-2-strings-and-templates`,
    `m2-1-native-parser-substrate` (NEW — M2.1 substrate landed S112),
    `m-7c-d-12-runtime-sentinel-scoping`, `m-7c-d-paired-migration`,
    `bench-refresh-v0.3.0`, `bs-layer-corpus-friction-bugs`,
    `bug-5-const-interpolation-scoping`, `canonical-examples-sweep`,
    `cg-006-server-only-body-emission`, `combined-lint-additions-s98`,
    `fix-lift-async-iife-paren`, `heads-up-s95-bugs`, `mpa-entity-decoding-fix`,
    `phase-3a-async-jwt`, `s100-tailwind-engine-extension`,
    `scrml-dev-codegen-divergence`, `stdlib-phase-1-5-null-sweep`,
    `tilde-codegen`, `tilde-gaps-567`, `todomvc-edit-mode-landing`,
    `v0.3-approach-a-spec`, `v0.3-todomvc-e2e-reverify`,
    `wave-3-7-audit`, `wave-3-7-backlog-migration`, `wave-4-adopter-content-scoping`,
    `wave-4-d-track`, `wave-4-t-track`, `w-try-catch-lint`,
    `auth-redirect-tightening`, `bare-variant-inference-nested`,
    `03-contact-book-auth-redirect` + `-SCOPING`, `d-ri-pages`, `hos-restructure`,
    `pgo-scoping` / `pgo-phase-2-scoping` / `pgo-phase-3-scoping`,
    `perf-characterization`, `runtime-perf-scoping` + `runtime-perf-phase-*`,
    `v0.3.x-spa-tree-shake`, `serialize-scoping` (STASHED — superseded by schemaFor).
  - The CURRENT in-flight arc — `native-parser-front-end/` — should be HELD as
    KEEP-LIVE until the native-parser M-ladder lands (see "Uncertain docs").
  - `quoted-text-model/` is now SUPERSEDED — see the dedicated flag below.
  - PA must verify per-dir SHIPPED status against the changelog and cherry-pick
    KEEP-LIVE exceptions before any batch deref, exactly as the S61/S79 matrix did.

### docs/changes/quoted-text-model/ — 4 files (SUPERSEDED arc)
**Reason:** content-heuristic (the dir's `IMPLEMENTATION-ROADMAP.md` now self-marks
"STATUS SUPERSEDED — S111 charter-B pivot; Waves 2-7 PAUSED")
**Detail:** `IMPLEMENTATION-ROADMAP.md`, `INVESTIGATION-PLAN.md`,
`SPIKE-bs-mode-flag.md`, `wave-1-progress.md`. The prior scan held this dir as
UNCERTAIN/KEEP-LIVE because §4.18 was authored from it. The S111 charter-B pivot
PAUSED Waves 2-7 (they retrofit the block-splitter, which charter B deletes).
Wave 1 landed (§4.18 in SPEC). The roadmap explicitly says the remaining waves
are throwaway. The dir is now a frozen historical-decision record.
**Suggested disposition:** deref to `scrml-support/archive/changes/quoted-text-model/`.
Wave-1's landed content is already in SPEC §4.18 (the current truth); the dir
itself is no longer live. Confirm with the PA that no Wave-1 follow-up is pending.

### docs/audits/ — 7 of 9 files (historical audit reports)
**Reason:** location + name-heuristic (filenames carry dates older than the current SPEC mtime)
**Detail:** Audits are point-in-time forensic snapshots; they belong in
`scrml-support/archive/audits/` (the destination the S79 sweep created). The 7:
  - `null-audit-compiler-src-2026-05-13.md` — null-eradication arc audit (work landed S89)
  - `undefined-audit-compiler-src-2026-05-13.md` — undefined-eradication audit (landed S89)
  - `happy-dom-perf-regression-s87-2026-05-12.md` — S87 perf regression snapshot
  - `self-host-spec-conformance-2026-05-11.md` — S-era self-host conformance audit
  - `articles-currency-table-2026-05-13.md` — article currency snapshot
  - `wave-3-7-corpus-ouroboros-2026-05-13.md` — wave-3-7 corpus audit
  - `scrml-dev-content-spec-fidelity-2026-05-19.md` — recent (S109) — verify still active before deref
**Suggested disposition:** deref to `scrml-support/archive/audits/`.
NOT flagged (S79 explicitly designated KEEP-LIVE, still compliant):
  `compiler-forgotten-surface-2026-05-06.md`, `scope-c-findings-tracker.md`
  (the latter is an active findings tracker, not a frozen audit).

### docs/articles/*-devto-*.md + drafts — 16 files (published marketing articles)
**Reason:** location
**Detail:** dev.to / blog publications and one tweet draft
(`teej_baiting_tweet.md`, `x-snippet-zod-calibration-2026-05-06.md`). They are
adopter-marketing content, not compiler reference. Articles describe the language
at a past version snapshot and drift relative to current SPEC by design.
**Suggested disposition:** deref to `scrml-support/docs/articles/` (or an
`articles-published/` subdir). Keep only if the project deliberately ships its
own marketing corpus from the repo — PA decides. The `llm-kickstarter-v1` and
`-v2` files are version-stamped LLM primers; v1 (2026-04-25) is superseded by v2
— deref v1 at minimum.

### docs/website/ — 3 source files (landing-page announcement drafts)
**Reason:** content-heuristic (front-matter `status: draft`) + location
**Detail:**
  - `v0.2.0-announce-2026-05-05.md` — `status: draft`; superseded by the v0.3.0 announce
  - `roadmap-from-v0.3-2026-05-14.md` — `status: draft`; a forward-looking roadmap (aspirational by definition)
  - `v0.3.0-announce-2026-05-14.md` — `status: published` — the current announce; the other two are stale relative to it
(`docs/website/dist/` + `docs/website/**/dist/` are generated HTML — out of scope, not flagged.)
**Suggested disposition:** v0.2.0-announce → deref to scrml-support (superseded);
roadmap → deref to scrml-support/docs/ (roadmaps are not current-truth);
v0.3.0-announce → KEEP if the repo ships its own site content, else deref.

### docs/curation/2026-05-05-changes-dir-disposition.md
**Reason:** name-heuristic (dated curation working doc) + content (a one-shot disposition matrix)
**Detail:** The S61/S79 curation execution log; its work is done (records "all 10
batches complete; 207 deref operations"). A historical process artifact, not current truth.
**Suggested disposition:** deref to `scrml-support/archive/` — but it is the
authoritative precedent for the `docs/changes/` deref above, so HOLD it until
that deref is executed, then archive it alongside.

### docs/pinned-discussions/w-program-001-warning-scope.md
**Reason:** content-heuristic (a parked decision-needed discussion)
**Detail:** Per `scope-c-findings-tracker.md`'s own description, pinned-discussions
are "decisions the user has parked for later conversation" — open/unresolved
design questions, not current truth.
**Suggested disposition:** deref to `scrml-support/docs/` (parked discussions
belong with deep-dives / debates). If resolved by SPEC since, delete.

### docs/m1-benchmark-results.md
**Reason:** name-heuristic + .gitignore says it is a per-run dump
**Detail:** `.gitignore` line 19 explicitly lists this path — a raw per-run dump
that should never be tracked; the curated committed file is `benchmarks/RESULTS.md`.
Present in the working tree but ignored.
**Suggested disposition:** delete (regenerated artifact; not tracked).

## Uncertain docs (needs human review)

### docs/changes/native-parser-front-end/  (2 files: IMPLEMENTATION-ROADMAP.md, SPIKE-markup-js-seam-2026-05-20.md)
**Reason:** This dir is the working area for the CURRENT in-flight arc.
`IMPLEMENTATION-ROADMAP.md` carries front-matter `status: ACTIVE` (S112);
`compiler/native-parser/README.md` and structure.map.md both cite the roadmap as
the live tracking artifact for the M-ladder (M1 complete; M2 + MK1 in flight).
The SPIKE doc (`status: draft-for-PA-review`, dated 2026-05-20) is the R1 markup-JS
seam scoping spike feeding the MK milestones.
**What to check:** Confirm the native-parser-front-end arc is still in flight
(it is, per the README and the S112 commit history). If so, HOLD both files as
KEEP-LIVE — they are the live roadmap + spike for an active multi-quarter arc.
Deref the whole dir to `scrml-support/archive/changes/` only when M6 lands.

### docs/changes/predicate-gaps-deep-dive-prep/ (1 file: SCOPE.md)
**Reason:** S79 matrix explicitly designated this KEEP-LIVE. Whether it is still
live for the current arc is unclear from the changelog.
**What to check:** If the predicate-gaps deep-dive has been completed, deref to
`scrml-support/archive/changes/`. If still prep material, HOLD.

### docs/changes/v0next-audit/ + v0next-inventory/  (PARSER-AUDIT, SCOPE-MAP, SCOPE-SUPPLEMENT, ARTICLE-TRUTHFULNESS-AUDIT — all dated 2026-05-05)
**Reason:** S79 matrix designated both KEEP-LIVE (cited by master-list §0.3 at the
time). The v0.next arc has since progressed through v0.3; these 2026-05-05 audit
snapshots are likely now historical. `v0next-audit/PARSER-AUDIT-2026-05-05.md` in
particular predates the native-parser charter and audits the OLD Acorn-based
parser — almost certainly superseded.
**What to check:** Confirm master-list no longer cites them as live. If confirmed
stale, deref to `scrml-support/archive/audits/`.

### docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md
**Reason:** Recent (S109, dated 2026-05-19 — within 30 days of the current SPEC
mtime). It may still be an active content-fidelity tracker rather than a frozen audit.
**What to check:** If the dev-content fidelity sweep it tracks is complete, deref
to `scrml-support/archive/audits/`. If still being worked, HOLD.

## Compliant — confirmed current-truth (mapped or map-eligible)

compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/PIPELINE.md — authoritative,
  at current HEAD (SPEC.md mtime == commit time).
README.md, DESIGN.md, scrmlFormula.md — current project reference.
docs/tutorial.md, docs/lin.md, docs/external-js.md — current language reference docs.
docs/known-gaps.md — explicitly the "honest current state" spec-vs-impl drift
  ledger; describes drift accurately — compliant by design.
docs/changelog.md — current rolling log (S112 baseline).
docs/PA-SCRML-PRIMER.md — current PA primer.
pa.md, master-list.md, hand-off.md — current project operating docs.
compiler/src/codegen/README.md — current source-tree README.
compiler/native-parser/README.md — CURRENT source-tree README; updated this window;
  every backticked identifier grep-resolves into compiler/native-parser/*.js;
  its "M1.4 status" + "M-ladder" tables are accurate current status.
e2e/README.md, examples/README.md, examples/VERIFIED.md, editors/neovim/README.md,
  scripts/git-hooks/README.md, benchmarks/README dirs, samples gauntlet READMEs —
  current dir-local READMEs.
examples/23-trucking-dispatch/{README,FRICTION}.md — current example docs.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #docs-changes #scope-principle #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [docs/changes curation matrix](../../docs/curation/2026-05-05-changes-dir-disposition.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
