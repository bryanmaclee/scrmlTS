---
status: current
last-reviewed: 2026-05-22
session: S121
agent: scrml-deep-dive (Wave 7 Unit D)
---

# GAP-native-extra-block survey — S121 residual (2 files)

## 1. Summary

The two surviving `GAP-native-extra-block` files are **structurally the same defect as the
9-file `LIVE-DEGENERATE` population, suppressed by the classifier's 3.0× size-ratio guard.**
Both files have `liveMarkup === 0` AND `nativeMarkup >= 1` (the LIVE-DEGENERATE
*signature*); they sit below the threshold at ratios 1.86× and 2.50× because the leading
prose-comment block inflates the live deep-length denominator.

- **`gauntlet-r11-zig-buildconfig.scrml`**: **CORPUS BUG (live drops everything) +
  cascade-induced native incompleteness**. File uses 30+ retired trailing-slash closers
  (`<h1>foo/` per Appendix E S80 migration). Live BS silently drops all markup; native
  produces a partial tree (consumes to EOF as one unterminated `<program>`, emits 34 parse
  errors). Verdict: **corpus** + **heuristic artifact**.
- **`tailwind-prose-coverage.scrml`**: **CORPUS BUG (raw-content closer-form misuse) + the
  same live-BS content drop**. File uses 33 canonical `</>` closers; the bug is `<code>foo</>`
  — per SPEC §4.17 line 1068, `</>` inside `<pre>`/`<code>` raw bodies is **literal text,
  not a closer**, so both pipelines correctly scan to EOF (this is the explicit P5-6 commit
  rationale). Verdict: **corpus** + **heuristic artifact**.

Neither file is a native bug. Both are corpus-stale; the native partial tree is parser-
correct per SPEC. The recommended classifier action is to relax the LIVE-DEGENERATE
3.0× ratio guard (the dataset shows a clean gap: max GAP=2.50, min LIVE-DEGENERATE=3.36;
a 1.5× cutoff absorbs both without disturbing classified EXACT cases).

LIVE-PHANTOM (Wave 6 Unit B, commit `1aec9c41`) does **not** generalize to this case —
that class is scoped to live-admitted phantom *state-openers* (the `< ident.` over-
admission), not silent-content-drop.

---

## 2. `gauntlet-r11-zig-buildconfig.scrml`

### File shape

- 435 lines; opens `<program>` at L8, closes `</program>` at L435.
- Two leading `${...}` blocks: `type Platform:enum`, `type Optimization:enum`,
  `type BuildTarget:struct`, `type ExportStatus:enum` (4 typeDecls), then reactive state.
- Body markup `<div class="build-config-tool">` at L249 through L433.
- **Closer form: 30+ retired trailing-slash closers.** E.g.
  L250 `<h1>Zig Build Configuration Manager/`, L251 `<p>Defined targets: ${@targetCount}/`,
  L255 `<h2>New Build Target/`, L258 `<label>Target Name/`, …, L430
  `<p>scrml ${ bun.eval("'0.5.1-draft'") } / Build Config Tool v1.0/`. **Zero `</>` in the
  whole file.**
- The trailing-slash form was retired in S80 per **Appendix E: `</>` Closer Migration Guide**
  (SPEC L12447-12478). Migration table: `<tag>content/` → `<tag>content</>`. Diagnostic
  hint: "Did you mean `</>`?"

### Live tree (`runLivePipeline` output)

```
hasProgramRoot = false   nodes.length = 7   typeDecls = 0
  comment span=0..38      // "// gauntlet-r11-zig-buildconfig.scrml"
  comment span=38..88     // "// Gauntlet Round 11 -- Zig developer perspective"
  comment span=88..116    // "// Build Configuration Tool"
  comment span=116..203   // "// Features: ..."
  comment span=203..289
  comment span=289..335
  text    span=335..336   // single "\n"
  (NO markup node — entire <program>...</program> dropped silently; live errors=0)
```

### Native tree (`runNativePipeline` output)

```
hasProgramRoot = true   nodes.length = 8   typeDecls = 4   errors = 34
  comment×6 (same spans as live)
  text span=335..336
  markup tag=program span=336..18689   ← spans to EOF
    text span=345..347     "\n\n"
    logic span=347..1306   (the type-decls block — 4 typeDecls hoisted from here)
    text span=1306..1308   "\n\n"
    logic span=1308..3107  (the reactive-state block)
    text span=3107..3109   "\n\n"
    (NO further children — the markup body L249-L433 is NOT parsed into children)
```

Native errors include `E-MARKUP-002: Explicit closer </div> does not match the open tag
<button>`, six `E-CTX-001: Unterminated tag <…>`, and finally `E-CTX-001: Unterminated tag
<program> — no closer before end of input`. The 34-error cascade is rooted in the
trailing-slash tokens being treated as either parse junk or text inside tag-frames.

### Diff metrics

- `liveDeep.length = 7`, `nativeDeep.length = 13`, `ratio = 1.86`.
- `liveMarkup = 0`, `nativeMarkup = 1` — **classic LIVE-DEGENERATE signature**.
- `isLiveDegenerate(...)` returns `false` only because `1.86 < 3.0`.

### Root cause

**Author wrote retired-syntax closers (S80 Appendix E).** The Phase-4 triage
(`phase4-triage-2026-05-22.md` §2.5 L426-457) already established that the live BS has a
content-dropping defect for files with certain `<program>` shapes; this file hits it. The
P5-13 native fix (`906c5317` — `${}` body-extent brace-in-string scanner) closed a separate
native regression that previously masked this file (per phase5-retriage L138-141).

Native's incompleteness here is a **cascade of the corpus syntax**: 30 trailing-slash tokens
generate parse errors that prevent the markup body from being structured into children.
The cause is not a single native defect; it is the file feeding pre-S80 syntax through both
front-ends.

### Verdict

| Axis | Verdict |
|---|---|
| Native bug | **No.** Native correctly rejects retired closer form; the partial tree + 34 errors are accurate parse-diagnostics. |
| Live bug | **Yes (already cataloged).** Live BS silently drops all markup with zero errors — the LIVE-DEGENERATE root defect. Out-of-scope for native parser; lives in live BS. |
| Corpus bug | **Yes — primary.** 30+ retired trailing-slash closers per S80 Appendix E. Sibling file `samples/compilation-tests/gauntlet-r10-zig-buildconfig.scrml` (different gauntlet round) uses the canonical form and is currently classified `LIVE-DEGENERATE` (ratio 16.21) — same content-shape, modernised closers. |
| Heuristic artifact | **Yes — secondary.** The LIVE-DEGENERATE 3.0× size-ratio guard suppresses this from the LIVE-DEGENERATE class. |

### Recommended action

1. **Defer the corpus fix** per `docs/changes/corpus-sweep/PLAN.md` L33-49 timing rule (no
   mass corpus fixes until M6 — native front-end is the basis we will be fixing upon).
2. **Adjust the LIVE-DEGENERATE classifier**: lower the 3.0× ratio guard to ~1.5×. Data shows a
   clean threshold gap (max GAP-NEB ratio = 2.50, min LIVE-DEGENERATE ratio = 3.36); no
   ambiguous in-between cases exist in the current corpus.
3. **Do NOT** ship a parser change for this file — native is correct per SPEC.

---

## 3. `tailwind-prose-coverage.scrml`

### File shape

- 80 lines; flat `<article class="prose prose-slate prose-lg">…</article>` (no `<program>`).
- Heavy use of inline `<code>` for SPEC §26.6 prose utility documentation (utility-class
  text-tokens displayed verbatim).
- **33 canonical `</>` closers** (zero retired trailing-slash). Closer form is correct in
  free-text mode.
- **The defect is `<code>foo</>` shape.** Per SPEC §4.17 L1068:
  > `<TagName>` / `<TagName ...>` / `</TagName>` / `</>` SHALL NOT be recognized as
  > markup-element openers or closers; the literal characters `<`, `>`, `/` pass through as
  > text.
  Inside `<pre>`/`<code>` raw-content bodies, **only `</code>` (case-insensitive literal
  match) closes the element** — `</>` is text. The file's first `<code>prose</>` at L9
  therefore correctly scans to EOF.
- Mirror form at L18-20:
  ```
  <pre><code>function greet(name) {
    return `Hello, ${name}`;
  }</></>
  ```
  Author intent: `</></>` to close `<code>` then `<pre>`. Per §4.17 both `</>` are text; the
  whole rest-of-file is consumed as raw text inside the first opened `<code>`.

### Live tree

```
hasProgramRoot = false   nodes.length = 6   typeDecls = 0   errors = 0
  comment×5 (L1-5 prose-comments)
  text span=300..301      // "\n"
  (NO markup — silent content drop, same defect as zig-buildconfig)
```

### Native tree

```
hasProgramRoot = false   nodes.length = 7   typeDecls = 0   errors = 3
  comment×5
  text span=300..301
  markup tag=article span=301..2656   ← EOF
    text "\n    "
    markup tag=h1 span=350..379       (children: text "Typography Plugin Test")
    text "\n\n    "
    markup tag=p span=384..2656       ← spans to EOF
      text "This article exercises the "
      markup tag=code span=414..2656  ← spans to EOF (raw-content scan)
        text "prose</> utility family per SPEC §26.6. …" (everything to EOF)
```

Native errors:
- `E-CTX-001: Unclosed <code> raw-content element (expected '</code>')` — the §4.17
  closer-recovery diagnostic.
- `E-CTX-001: Unterminated tag <article>`
- `E-CTX-001: Unterminated tag <p>`

These are the **normatively-correct errors per §4.17 closer-recovery clause L1075**.

### Diff metrics

- `liveDeep.length = 6`, `nativeDeep.length = 15`, `ratio = 2.50`.
- `liveMarkup = 0`, `nativeMarkup = 4` — **classic LIVE-DEGENERATE signature**.
- `isLiveDegenerate(...)` returns `false` only because `2.50 < 3.0`.

### Root cause

**Author used `<code>…</>` expecting `</>` to close `<code>`. Per SPEC §4.17 it does not.**
This is the explicit P5-6 commit rationale (`192071c4`):
> SPEC §4.17 line 1068 says `</>` does NOT close raw-content; both pipelines correctly
> scan to EOF on these forms.

P5-6 added the `isRawContentElement` recognition to native; the migration from
`LIVE-DEGENERATE` to `GAP-native-extra-block` is exactly the P5-6 native fix shrinking the
native tree from a deeply-misparsed 18+-node form to a 15-node `<article>/<p>/<code>` chain
where `<code>` correctly EOF-scans. The shrink pushed the size ratio from above-3.0 to
2.50, dropping it under the guard.

### Verdict

| Axis | Verdict |
|---|---|
| Native bug | **No.** Native is correct per §4.17 — raw-content scanning to EOF on `<code>…</>` is normatively the right behavior, with `E-CTX-001` being the prescribed recovery diagnostic (§4.17 L1075). |
| Live bug | **Yes (already cataloged).** Same live BS silent-drop as zig-buildconfig. Not in this Unit's remit. |
| Corpus bug | **Yes — primary.** Lines 9, 12, 15, 17, 18-20 all use `<code>text</>` against §4.17. Per S101 amendment intent (close Bug-#2 friction class), the canonical form is `<code>text</code>` literal closer, OR the §4.17 entity-escape form for code-display blocks. |
| Heuristic artifact | **Yes — secondary.** P5-6 shrunk the native tree (correctly), pushing the LIVE-DEGENERATE ratio from above-3.0 to 2.50. The classifier 3.0× guard was sized against the pre-P5-6 LIVE-DEGENERATE population; the post-P5-6 native tree for this file is smaller and falls outside. |

### Recommended action

1. **Defer the corpus fix** per corpus-sweep timing rule. When the sweep runs, replace
   `<code>x</>` with `<code>x</code>` (canonical raw-content closer per §4.17 L1071).
2. **Adjust the LIVE-DEGENERATE classifier**: same 1.5× ratio relaxation as for
   zig-buildconfig absorbs this file. No false positives in the current corpus.
3. **Do NOT** ship a parser change — native conforms to SPEC §4.17. If LIVE-PHANTOM (Wave 6
   Unit B) is extended to cover other "credit-native-correctness" cases, this file is a
   candidate for a **new** class (e.g. `LIVE-DEGENERATE-RELAXED` or a unified
   `LIVE-CONTENT-DROP` covering all liveMarkup=0 + nativeMarkup≥1 with no ratio gate). The
   LIVE-PHANTOM scope (`isStateTagBoundaryAfterLt` phantom-opener) does **not** fit — that
   class is for live admitting extra nodes, not live dropping content.

---

## 4. Recommended Wave 8 follow-ups

Two work items emerge — both are **single-locus, low-cost classifier changes**, not parser fixes:

### Unit W8-CANARY-DEGEN-GUARD (small, 1-2h)

**Locus:** `compiler/tests/parser-conformance/dual-pipeline-canary.js` L154-160
(`isLiveDegenerate`).

**Change:** lower the size-ratio guard from `>= 3 * liveDeep.length` to `>= 1.5 *
liveDeep.length` (or remove it entirely; the `liveMarkup === 0 && nativeMarkup >= 1` gate
is itself strong).

**Effect:** two files (`gauntlet-r11-zig-buildconfig`, `tailwind-prose-coverage`)
re-classify GAP-native-extra-block → LIVE-DEGENERATE, becoming `explained: true` and
strict-pass eligible. Histogram: GAP-NEB 2 → 0; LIVE-DEGENERATE 9 → 11. Strict-pass count:
992 + 2 = 994/1000 (99.4%).

**Risk:** the 3.0× guard's stated rationale (L151-152 in canary) is to exclude "small
legitimate non-`<program>` files (whose two pipelines agree at comparable size)." The
empirical gap in the current corpus is 2.50 → 3.36 (no in-between case), so 1.5× is safe
for today's corpus. A future small component-only file with ZERO live markup but ≥1 native
markup at ratio ~1.5× would be a regression; the `liveMarkup === 0` gate makes that
shape exotic.

**Parallel-safe:** ✓ — touches a different leg of the classifier than Wave 6 Unit B's
LIVE-PHANTOM. Conflict surface: zero.

### Unit W8-CORPUS-NOTE (writeup-only, 15min)

**Locus:** `docs/changes/corpus-sweep/PLAN.md` corpus-bug ledger.

**Change:** record the two files as known corpus-stale, with the specific fix:
- `gauntlet-r11-zig-buildconfig.scrml`: trailing-slash → `</>` per Appendix E (S80
  migration). ~30 sites.
- `tailwind-prose-coverage.scrml`: `<code>x</>` → `<code>x</code>` per §4.17 L1071. ~6
  sites.

Defer the actual edits to the M6-gated corpus sweep.

---

## Notes for the next agent

- **Maps consulted:** none (the canary file + SPEC + the two corpus files were sufficient).
- **Read-only diagnostic scripts** dropped in `/tmp/` (not committed):
  `inspect-gap-files.mjs`, `inspect-deep.mjs`, `inspect-live-deg.mjs`,
  `inspect-prog-children.mjs`, `inspect-prog-span.mjs`, `inspect-nat-tw.mjs`,
  `inspect-near-threshold.mjs`. These can be re-run by the next agent to confirm metrics.
- **No code, test, or corpus file was edited.** Pure survey.
- **Wave 6 Unit B (LIVE-PHANTOM, commit `1aec9c41`) does not subsume this case** — that
  class fires on `deepFirstDivergence.liveKind === 'state'` AND `isStateTagBoundaryAfterLt`
  phantom-site predicate AND DIFF-deep-seq/GAP. The two surveyed files diverge with
  `liveKind = (end)` (live truncated before the markup, no `state`-shaped phantom), so the
  Wave 6-B classifier branch correctly does NOT match. The mechanism here is silent
  content-drop in live BS, which is the LIVE-DEGENERATE root mechanism — the only thing
  missing is the size-ratio relaxation.

## Tags

#wave-7-unit-d #gap-native-extra-block #live-degenerate #canary-classifier
#s121 #m5-c2-gap-ledger #corpus-stale #spec-section-4.17 #spec-appendix-e
#trailing-slash-migration #raw-content-elements #read-only-survey

## Links

- Phase-4 triage (LIVE-DEGENERATE class genesis): `docs/changes/m5-c2-gap-ledger/phase4-triage-2026-05-22.md` §2.5
- Phase-5 retriage (zig-buildconfig Wave 5 flag): `docs/changes/m5-c2-gap-ledger/phase5-retriage-s121-2026-05-22.md` §2.5
- Canary classifier: `compiler/tests/parser-conformance/dual-pipeline-canary.js` L138-160 (`isLiveDegenerate`), L426-432 (`GAP-native-extra-block` branch)
- SPEC §4.17 (raw-content `<pre>`/`<code>`): `compiler/SPEC.md` L1060-1107
- SPEC Appendix E (`</>` closer migration, S80): `compiler/SPEC.md` L12447-12478
- P5-6 commit (raw-content recognition added to native): `192071c4`
- P5-13 commit (`${}` brace-in-string scanner — unmasked the r11 zig-buildconfig divergence): `906c5317`
- Wave 6-B LIVE-PHANTOM (state-opener case, distinct from this): commit `1aec9c41`
- Corpus-sweep timing rule (defer corpus fixes to M6): `docs/changes/corpus-sweep/PLAN.md` L33-49
