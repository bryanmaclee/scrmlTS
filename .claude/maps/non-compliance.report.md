# non-compliance.report.md
# project: scrmlts
# generated: 2026-05-21T04:30:00-06:00
# scan mode: INCREMENTAL_UPDATE (S114 OPEN — refresh against e613621)

## Summary

Refresh scope: the S113 13-dispatch native-parser arc landed 4 milestones + M4.1
+ K2 with zero `compiler/src/` edits. Most prior-scan non-compliance findings are
UNCHANGED (the `docs/changes/**` regrowth is the dominant baseline, surveyed by
the 2026-05-20 scan and unchanged in shape). This refresh adds:

  - SPEC editorial inconsistency: §4.18.3 vs §4.18.4 escape-count (NEW finding —
    surfaced by MK3.2 implementation).
  - Native-parser-local `E-STMT-*` / `E-EXPR-*` diagnostic codes (32 distinct codes)
    NOT in SPEC §34 — intentional pre-M5; flag for the §34 reconciliation that
    must land alongside the pipeline swap-in.
  - K9 + K10 native-parser `.scrml` cleanups (in-flight, NOT bugs — 9 of 27
    files still fail `.scrml`-compile post-K2; the `.js` shadows execute fine).
  - 15 new `docs/changes/native-parser-front-end/progress-*.md` per-dispatch
    files — KEEP-LIVE while the arc is in flight, mirror the prior scan's
    handling of the M2.1 / MK1.* progress notes.
  - `docs/changes/` regrew 89 dirs (was 91; net -2 — small natural churn).

Total docs scanned: ~200 (excluding node_modules, framework-comparison dirs,
.git/.jj/.claude, handOffs/, dist/, docs/website/**/dist/)
Compliant: ~98
Non-compliant: ~99 (prior baseline)
Uncertain: 5 (prior 4 + the §4.18 SPEC editorial item)
NEW items added this scan: 3 (SPEC §4.18 editorial; native-parser §34 codes; K9/K10 ledger)

## NEW since prior scan (87453fb → e613621)

### NEW item 1 — SPEC §4.18.3 vs §4.18.4 escape-count editorial inconsistency
**Type:** SPEC editorial (no code or doc to deref — flagged for the user to
correct at a future SPEC amendment).
**Location:** `compiler/SPEC.md`, §4.18.3 (line ~1158) + §4.18.4 (line ~1182).
**Detail:** §4.18.3 normatively states: *"A literal double-quote `\"` inside a
display-text literal SHALL be written as the escape sequence `\"`. The backslash
escape sequence `\\` produces a literal backslash. **These are the only two
escape sequences inside a display-text literal**"* — a closed two-element set.
But §4.18.4 (the immediately-following subsection on interpolation) introduces
a third: *"A literal `${` sequence intended as display text … SHALL be escaped
— `\${` produces the literal two-character sequence `${`."* — a third escape.
The two normative statements contradict on the cardinality.

The native parser implements the CORRECT 3-escape union (`\"` / `\\` / `\${`) —
see `compiler/native-parser/display-text-literal.js:130` `LEGAL_FROM_IN_LITERAL_TEXT`
and `classifyEscape`/`scanLiteralEscape`. MK3.2's progress note flagged the
inconsistency explicitly (see `docs/changes/native-parser-front-end/progress-mk3.2.md`).

**Suggested disposition:** SPEC editorial amendment to §4.18.3 — replace
"the only two" with the correct enumeration ("these escape sequences — `\"`,
`\\`, and `\${` (§4.18.4) — are the legal escapes inside a display-text
literal"). Spec-only landing; no code change required (native parser already
implements the union).

### NEW item 2 — Native-parser-local `E-STMT-*` / `E-EXPR-*` codes not in SPEC §34
**Type:** intentional pre-M5 gap; flag for M5 §34 reconciliation.
**Location:** `compiler/native-parser/parse-stmt.js` + `parse-expr.js`.
**Detail:** Grep-confirmed: the native parser emits **32 distinct
`E-STMT-*`/`E-EXPR-*` codes** (e.g. `E-STMT-MISSING-SEMICOLON`,
`E-STMT-RETURN-OUTSIDE-FUNCTION`, `E-EXPR-UNCLOSED-PAREN`,
`E-EXPR-MATCH-ARROW`, …). SPEC §34 (the normative error-code catalog) contains
**zero** `E-STMT-*` or `E-EXPR-*` rows at HEAD `e613621`.

This is INTENTIONAL — the native parser is a parallel track; until M5 (pipeline
swap behind `--parser=scrml-native`) these codes are not user-visible (only
`parser-conformance-*.test.js` consumes them). At M5 the native parser becomes
selectable user-facing; at M6 it becomes the ONLY front-end. The §34 catalog
must be reconciled at M5 (add the codes that survive triage; map / merge any
that overlap existing §34 codes — e.g. `E-STMT-MISSING-SEMICOLON` may merge
into existing `E-SYNTAX-*`).

The codes the native parser does emit that ARE in SPEC §34 — `E-MARKUP-002`,
`E-CTX-001`, `E-CTX-003`, `E-UNQUOTED-DISPLAY-TEXT`, `E-PARSE-001` — are
correctly placed.

**Suggested disposition:** Track as part of the M5 dispatch brief. NOT a
non-compliance to act on now; the M5 brief should include a §34-reconciliation
task that audits all `E-STMT-*` / `E-EXPR-*` for keep / merge / rename decisions
+ SPEC amendment. Until then this is a known parallel-track condition.

### NEW item 3 — K9 + K10 native-parser `.scrml`-compile cleanups (NOT bugs)
**Type:** in-flight cleanup ledger; flag for tracking, not for action.
**Location:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`
§4.4 K-ledger rows K9 + K10.
**Detail:** The roadmap §4.4 K-ledger tracks `.scrml`-compile-cleanness of the
27 native-parser `.scrml` files. At HEAD `e613621`:

  - K2 ✅ FIXED S113 (M1.x cluster) — `char-classify.scrml` leaf extracted;
    `lex-in-code` + `lex-in-regex` + `lex` compile clean.
  - K7 ✅ FIXED S113 (M3.3) — `JS_KEYWORDS` own-property guard in `token.scrml`.
  - K9 — markup-layer twin of K2: `block-context.scrml` ↔ `parse-ctx.scrml`
    circular import (E-IMPORT-002) + aliased imports across `block-context` /
    `parse-ctx` / `parse-markup` / `tag-frame`. **Open. 9 of 27 native-parser
    `.scrml` files still fail compile post-K2.** Must be fixed before M6
    (self-host). Mirror the K2 recipe.
  - K10 — `ast-expr.scrml` ~L575 uses `!= not` (E-EQ-002); should be `is not`.
    `parse-expr.scrml` + `parse-stmt.scrml` import `ast-expr` and transitively
    inherit the compile failure. **Open. One-line fix. Sequence post-M4** to
    avoid collision with M4.2/M4.3 edits to `ast-expr.scrml`.
  - K3/K4/K5 — M1 lexer maximal-munch gaps (compound-assign / `?.` /
    `#`/`~`/`::`); parse-expr-coupled; **post-M4 sequence**.
  - K8 — whole-parser `function`→`fn` refactor (K2-unblocked); standalone.
  - K6 — folded into M4.2.

The `.js` shadows are UNAFFECTED by K8-K10 — the full test suite passes
(17,812/0 at HEAD). These are scrml-source-side cleanups that pre-date the
swap-in, NOT regressions or bugs.

**Suggested disposition:** Continue tracking in IMPLEMENTATION-ROADMAP §4.4
K-ledger (which is the authoritative tracker — this report just surfaces it).
No deref. The K-ledger format works.

### NEW item 4 — `docs/changes/native-parser-front-end/progress-*.md` (15 files)
**Type:** in-flight progress notes; KEEP-LIVE while the arc is in flight.
**Location:** `docs/changes/native-parser-front-end/progress-{m1x-cluster, m2.4,
m3.1, m3.2, m3.3, m3.4, m4.1, mk2.1, mk2.2, mk2.3, mk3.1, mk3.2, mk3.3}.md` +
the prior `SPIKE-markup-js-seam-2026-05-20.md` + `IMPLEMENTATION-ROADMAP.md`.
**Detail:** Mirror the prior scan's UNCERTAIN/KEEP-LIVE handling of the M2.1 /
MK1.* progress notes. These are per-dispatch landing reports for the active
charter-B arc; the roadmap §5 progress table is the single source of truth.
**Suggested disposition:** HOLD all as KEEP-LIVE for the duration of the arc.
Deref `docs/changes/native-parser-front-end/` to `scrml-support/archive/changes/`
only when M6 lands (the entire arc closes together — charter Q5 retirement).

## Inherited from prior scan (87453fb) — UNCHANGED

The substantive content of the 2026-05-20 scan stands. Quoting the headline
findings without re-enumerating each entry:

- **docs/changes/** — 89 directories (was 91; M2.1 substrate dir landed and
  M2.2/M2.3 dispatched without spawning new dirs, so churn is small).
  Dominant non-compliance: completed-and-landed dispatch dirs that should
  deref to `scrml-support/archive/changes/`. **Per the S61/S79 precedent and
  the S91 maps refresh, this remains the PA-decided batch deref item.**
  Disposition matrix: `docs/curation/2026-05-05-changes-dir-disposition.md`.
- **docs/audits/** — 7 of 9 historical audit reports → deref to
  `scrml-support/archive/audits/`. Two KEEP-LIVE (compiler-forgotten-surface,
  scope-c-findings-tracker).
- **docs/changes/quoted-text-model/** — 4 files SUPERSEDED by charter B
  (the dir self-marks `STATUS SUPERSEDED — S111 charter-B pivot`; Waves 2-7
  are explicitly throwaway since charter B implements §4.18 natively in MK3).
  **MK3 has now LANDED at S113** — Wave 1 (the §4.18 SPEC amendment, already
  in `SPEC.md`) is now realized in code by the native parser. The quoted-text-
  model `IMPLEMENTATION-ROADMAP.md`'s "Waves 2-7 are unnecessary under charter
  B" claim is now empirically verified. Deref to
  `scrml-support/archive/changes/quoted-text-model/` is the recommended next
  step; confirm with PA before executing.
- **docs/articles/*-devto-*.md + drafts** — 16 published-marketing files.
  Deref to `scrml-support/docs/articles/`.
- **docs/website/** — 3 source files (1 superseded announce, 1 draft roadmap,
  1 current announce). Deref the two superseded; HOLD the current per PA call.
- **docs/curation/2026-05-05-changes-dir-disposition.md** — historical
  curation log; HOLD until the `docs/changes/` deref executes, then archive.
- **docs/pinned-discussions/w-program-001-warning-scope.md** — parked decision.
  Deref to `scrml-support/docs/`.
- **docs/m1-benchmark-results.md** — gitignored per-run dump; delete.

## Map-set state

This refresh updated 8 map files (primary / structure / dependencies / schema /
config / build / error / test) + this report. No new map files were created;
no conditional-map trigger fired (this remains a compiler, not a web app).
The 9th map — `domain.map.md` — was also updated to reflect the M-ladder
status. Total maps at HEAD: 9 (8 substantive + primary) + this report.

## Uncertain docs (needs human review)

Same as prior scan (4 items), plus NEW item 1 above:

### NEW (this scan) — `compiler/SPEC.md` §4.18.3 vs §4.18.4 escape-count
**Reason:** Editorial inconsistency between two adjacent normative
subsections. The native parser implements the union (correct); the SPEC says
"only two" in §4.18.3 but defines a third in §4.18.4.
**What to check:** PA-decide whether to land this as a SPEC editorial
amendment now (small surface; ~2-line edit to §4.18.3), or batch it with a
future §4.18 amendment.

### Carried — `docs/changes/native-parser-front-end/` (now 16 files: IMPLEMENTATION-ROADMAP.md + SPIKE-markup-js-seam-2026-05-20.md + 15 progress-*.md)
**Reason:** Current in-flight arc. ALL files KEEP-LIVE per prior-scan precedent.

### Carried — `docs/changes/predicate-gaps-deep-dive-prep/SCOPE.md`
**Reason:** S79 matrix KEEP-LIVE; status unchanged.

### Carried — `docs/changes/v0next-audit/` + `v0next-inventory/`
**Reason:** Likely now historical; PA should confirm against current master-list.

### Carried — `docs/audits/scrml-dev-content-spec-fidelity-2026-05-19.md`
**Reason:** Recent enough that it may still be an active tracker.

## Compliant — confirmed current-truth (mapped or map-eligible)

compiler/SPEC.md, compiler/SPEC-INDEX.md, compiler/PIPELINE.md — authoritative,
  at current HEAD (SPEC.md mtime ≈ commit time). NOTE: SPEC.md has the
  §4.18.3/§4.18.4 escape-count editorial item (new flag above) — still
  current-truth on every other axis.
README.md, DESIGN.md, scrmlFormula.md — current project reference.
docs/tutorial.md, docs/lin.md, docs/external-js.md — current language reference docs.
docs/known-gaps.md — explicitly the "honest current state" spec-vs-impl drift
  ledger; describes drift accurately — compliant by design.
docs/changelog.md — current rolling log (S113 baseline; updated this window).
docs/PA-SCRML-PRIMER.md — current PA primer.
pa.md, master-list.md, hand-off.md — current project operating docs (hand-off.md
  rotated to S114 OPEN at e613621).
compiler/src/codegen/README.md — current source-tree README.
compiler/native-parser/README.md — CURRENT source-tree README; M-ladder table
  ALIGNED with HEAD (M1/M2/M3 ✅, MK1/MK2/MK3 ✅, M4.1 ✅) — every backticked
  identifier grep-resolves into compiler/native-parser/*.js. UPDATED S113.
docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md — the
  authoritative M-ladder + K-ledger tracker; §5 progress table is the single
  source of truth. CURRENT.
e2e/README.md, examples/README.md, examples/VERIFIED.md, editors/neovim/README.md,
  scripts/git-hooks/README.md, benchmarks/README dirs, samples gauntlet READMEs —
  current dir-local READMEs.
examples/23-trucking-dispatch/{README,FRICTION}.md — current example docs.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #docs-changes #scope-principle #native-parser #spec-editorial

## Links
- [primary.map.md](./primary.map.md)
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [docs/changes curation matrix](../../docs/curation/2026-05-05-changes-dir-disposition.md)
- [native-parser IMPLEMENTATION-ROADMAP](../../docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
