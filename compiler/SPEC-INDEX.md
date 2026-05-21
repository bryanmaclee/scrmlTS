# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bun run scripts/regen-spec-index.ts` (in-tree TS regen; updates the Sections table line ranges + sizes in-place from SPEC.md headings, preserving summaries). The legacy `bash scripts/update-spec-index.sh` is a print-only helper that lists current heading line numbers.
> Last updated: 2026-05-13 (S90 M-7C-D-12 Track 4 amendments — `s90-m-7c-d-12-t4-spec-amendments` branch: §12.5.1 wire-format envelope amendment (+13 lines); §42.8 "Runtime Representation" extended with DevTools / debugger experience subsection (OQ-7, +8 lines); NEW §57 Wire Format normative section (~95 lines); E-DERIVED-ENGINE-INITIAL-UNDEFINED renamed to E-DERIVED-ENGINE-INITIAL-ABSENT in §34 / §51.0.J / §55-summary (OQ-6). Net SPEC.md growth: +107 lines (27,037 → 27,144). Section count: 56 → 57. Cumulative line-shifts: §13-§41 +7; §42 prologue +7 / §42.8 internal +8; §43-§56 +15. Quick-Lookup line anchors with leading `~` are approximate and may drift by ±7 to ±15 — re-derive via `bun run scripts/regen-spec-index.ts` for surgical updates. PRIOR S89 SPEC growth: mechanical line-range refresh after S89 undefined-eradication SPEC growth: §42.1.1 new subsection — "Defined Values vs. Absence — `""` is NOT Absence" (S89 user ruling clarification); §34 row renamed `W-NULL-IN-SCRML-SOURCE` → `W-ABSENCE-IN-SCRML-SOURCE` (Option α — code covers BOTH absence tokens, mirrors the rule shape); §42.1 / §42.6 / §42.7 / §6.8.1 cross-refs updated; 6 scrml-prose sites migrated to `not` across §6.7.6 (`<#id>.value` of empty/multi-assignment `<poll>`) + §6.7.6 W-LIFECYCLE-008 row + §18 worked example + §34 E-TYPE-081 row; PRIOR S89 Wave 7.A (null) landing notes preserved below.)
>
> Substantive content landings since the prior S58 line-range baseline:
> - S111 R3 — §4.18.1 vs §40.8 body-mode reconciliation (2026-05-20): the native-parser charter deep-dive surfaced an inconsistency between §4.18.1 (quoted-text model Wave 1, below) — which listed `<program>` / `<page>` bodies under **free-text mode** — and §40.8, which says those bodies parse in **default-logic mode**. Resolution: `default-logic` is a **distinct THIRD body-mode**, owned and defined by §40.8 — neither the free-text mode nor the code-default mode of §4.18. The §4.18 free-text / code-default split governs **only** the relationship between the three code-bearing loci (engine state-children, match block-form arms, `:`-shorthand bodies) and plain markup; it does NOT classify or reclassify `<program>` / `<page>` bodies. Edits: §4.18.1 — `<program>` / `<page>` removed from the free-text-mode table row, section heading + intro scoped to "the two §4.18 body modes", new S111-amendment normative note recording `default-logic` as the distinct third mode; §40.8 — the `default-logic`-mode normative bullet augmented with an S111-amendment note (the three-mode picture is free-text / code-default / default-logic) + a reciprocal §4.18 line added to the §40.8 Cross-references block; §3.4 S111 note + §4.15 structural-element-registry S111 note corrected (both had echoed §4.18.1's free-text over-reach; §4.15's clause was also internally self-contradictory — "default-logic body ... remain free-text bodies"). §40.8's existing "default-logic mode" wording was already correct and needed no change — the resolution fit cleanly. Surgical SPEC-text reconciliation — no compiler source, no tests, no body-mode redesign, no change to the three code-bearing loci rules or §4.17. Net SPEC.md growth: +3 lines (28,486 → 28,489). Section count unchanged. Sections-table line ranges below §3.4 shift; regenerated via `bun run scripts/regen-spec-index.ts`.
> - S111 quoted-text model SPEC amendment, Wave 1 (2026-05-20): NEW §4.18 — the single canonical definition of the **code-default body mode** and the **display-text literal**. Quoted-text model, scope (b) — code-bearing-only (investigation closed GO at S111; design locked). In a code-default body — engine state-child bodies (§51.0), match block-form arm bodies (§18.0.1), `:`-shorthand bodies (§4.14) — a bare run is code; display text is an explicit `"..."` display-text literal. Plain-markup bodies (`<p>`/`<h1>`/HTML/component elements, `<program>`/`<page>`, `<errors>` override-template) stay free-text — UNCHANGED. §4.18 nine sub-subsections: §4.18.1 two body modes; §4.18.2 bare-run-means-code; §4.18.3 the `"..."` display-text literal (`"`-only — cites §5 attribute-string precedent; `'` is a free interior char; `\"`/`\\` escapes); §4.18.4 `${...}` interpolation inside the literal (syntax-quote/unquote shape, one body child); §4.18.5 verbatim whitespace inside the literal (plain-markup free-text keeps HTML-collapse); §4.18.6 codegen auto-HTML-escapes literal text content (`<`→`&lt;` etc.; interpolated values escape per existing rules); §4.18.7 `E-UNQUOTED-DISPLAY-TEXT`; §4.18.8 `text`/`TextNode` kind SURVIVES (scope b — not deleted; that was scope a); §4.18.9 cross-refs. Amended sections: §3.4 (code-default-body loci note), §4.14 (explicit `:`-shorthand body grammar — within-body construct, no new structural delimiter, per Wave-0 spike), §4.15 (`<engine>`/`<match>` body-form notes mark code-default), §4.17 (orthogonality note — raw-content is independent of the code-default model; `<pre>`/`<code>` unchanged), §5.1 (one cross-ref line — `"`-only precedent), §18.0/§18.0.1 (match arm bodies code-default; worked examples updated), §51.0.A/B/B.1/I (engine state-child bodies code-default; worked examples migrated to quoted form). §34 +1 code: `E-UNQUOTED-DISPLAY-TEXT` (bare display text where the code-default body model expects code; spec-ahead-of-implementation — Wave 2+ wires the compiler fire); scoping notes added to `E-SYNTAX-050` (bare-`/` `looksLikeCloser` — fires in plain-markup free-text bodies, NOT code-default bodies) and `E-CTX-003` (`:`-shorthand shape-confusion). SPEC-only landing — Wave 1 of the quoted-text-model implementation arc (Waves 2-7 are compiler source). Authority: deep-dives `scrml-support/docs/deep-dives/quoted-text-model-{design-space,depth-of-fix,friction-and-prior-art}-2026-05-20.md`; roadmap `scrml-support/archive/changes/quoted-text-model/IMPLEMENTATION-ROADMAP.md`; Wave-0 spike `scrml-support/archive/changes/quoted-text-model/SPIKE-bs-mode-flag.md`. Net SPEC.md growth: +252 lines (28,234 → 28,486). Section count unchanged (§4.18 is a subsection of §4). Line ranges across the whole SPEC shift; the Sections table below was regenerated via `bun run scripts/regen-spec-index.ts`.
> - S102 §41.14 formFor API entry (2026-05-18): NEW §41.14 `scrml:data` `formFor` — type-driven form generation from struct definition. SECOND general-position L22 type-as-argument family member after `parseVariant` (§41.13). 11 normative subsections covering: type-arg shape (bare `:struct` ident), auto-synthesized compound state cell + Shape 2 sub-cells, submit handler wiring via §5.2.3 `onsubmit=fn` bare-form event handler + structural-default progressive-enhancement `<form action=>` for server-fn handlers, per-field customization via §16 component slots (slot-style customization wins debate 51.5/60 over function-valued attributes), field-set transforms (`pick=`/`omit=`/`partial=true`), 4-level label resolution chain (slot > registerLabels > type-annotation reserved > title-case default), nested-struct disposition (explicit slot required; auto-recurse deferred), error rendering (`error-strategy=` attr; per-field default), 5 v1.0-out-of-scope deferrals listed. §53.14.3 family-roster row flipped from "planned" to "spec'd; impl pending"; §53.14.5 recognition list extended to name formFor. §34 +8 error codes: `E-FORMFOR-TYPE-NOT-STRUCT`, `E-FORMFOR-SLOT-UNKNOWN`, `E-FORMFOR-PICK-INVALID-FIELD`, `E-FORMFOR-OMIT-INVALID-FIELD`, `E-FORMFOR-PICK-OMIT-CONFLICT`, `E-FORMFOR-ONSUBMIT-SIGNATURE`, `E-FORMFOR-ERROR-STRATEGY-INVALID`, `E-FORMFOR-NESTED-STRUCT-NO-SLOT`. Authority chain: deep-dive `scrml-support/docs/deep-dives/formFor-design-2026-05-18.md` (10 OQs; 7 closed HIGH/MED + 3 to debate + 2 newly-surfaced) + OQ-FF-1 debate verdict slot-style 51.5/60 + OQ-FF-2 debate verdict explicit-attr+slot+PE-default 52/60. Total SPEC growth: ~638 lines (§41.14 ~140L + §34 +8 rows + §53.14.3 row revision + §53.14.5 list extension). Line ranges below §41.14 shift ~140 lines; regen via `bun run scripts/regen-spec-index.ts` for surgical updates.
> - S98 §51.0.B.1 payload-binding amendment (2026-05-17): NEW §51.0.B.1 normatively authorizes payload binding on engine state-children (three forms — bare-attribute, named, parenthesized; positional + named semantics inherit from §18.7; sister form to §18.0.1 match block-form). §51.0.B gains a normative-statements list documenting the state-child attribute surface + reserved attribute set `{rule, effect, history, internal:rule}` + cross-ref. §51.0.M worked example normalized (`<Done count>` → `<Done rows>` for field-name uniformity with `Done(rows: int)`; positional name-divergence remains spec-conformant per §51.0.B.1, editorial note added). §34 +3 codes: `E-ENGINE-PAYLOAD-ON-UNIT-VARIANT`, `E-ENGINE-PAYLOAD-ARITY-MISMATCH`, `E-ENGINE-PAYLOAD-RESERVED-COLLISION`. SPEC-only landing — track 1 of two-track recommendation in the authority deep-dive (`scrml-support/docs/deep-dives/payload-bearing-engine-state-child-variants-SURVEY-2026-05-17.md`). Track 2 (compiler-feature wiring — parser + typer + codegen) sequences as a separate dispatch. Net SPEC.md growth: ~265 lines (§51.0.B.1 ~210; §51.0.B normative list ~17; §51.0.M editorial note ~14; §34 +3 rows ~3; remaining lines from spacing).
> - S90 M-7C-D-12 Track 4 spec amendments (`s90-m-7c-d-12-t4-spec-amendments`, 2026-05-13): SPEC §12.5.1 server-fn wire-format envelope amendment; §42.8 DevTools/debugger-experience subsection (OQ-7 — JS `null` bit-pattern surface is the scaffold-lifetime trade-off; native scrml debugger experience deferred to post-v1.0 self-host); NEW §57 Wire Format normative section (§57.1 scope; §57.2 canonical envelope `{"__scrml_absent": true}` per OQ-2 (b); §57.3 encoder rules; §57.4 dual-decoder per OQ-4 (b); §57.5 v1.0 clean break per OQ-4 (a); §57.6 forward-compat with potential Option-β sentinel naming; §57.7 cross-refs); E-DERIVED-ENGINE-INITIAL-UNDEFINED → E-DERIVED-ENGINE-INITIAL-ABSENT rename per OQ-6 at §34 / §51.0.J / §55-summary (runtime condition is scrml-absence per §42, not JS-host `undefined`). Authority: SCOPING `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md` Option ε + α-style internal cleanup; OQ-disposition commit 725e07c. Section count 56 → 57; total lines 27,037 → 27,144.
> - S89 undefined-eradication (`s89-undef-spec-A`, 2026-05-13): mirrors null-eradication for the `undefined` token per S89 user ruling extension ("yes this extends to undefined. `""` is still defined. it is a string, it is empty but a string none the less"). 6 scrml-prose sites migrated `undefined` → `not` (§6.7.6 `<poll>.value` rules + W-LIFECYCLE-008 catalog row; §18 match-without-else worked example; §34 E-TYPE-081 row). §34 + §42 catalog code RENAMED `W-NULL-IN-SCRML-SOURCE` → `W-ABSENCE-IN-SCRML-SOURCE` (Option α — code shape now mirrors the rule, which has always covered BOTH absence tokens). NEW §42.1.1 "Defined Values vs. Absence — `""` is NOT Absence" articulates the user-voice distinction: `""`, `0`, `false`, `[]`, `{}` are DEFINED values (not absence) and SHALL NOT be migrated to `not` by mechanical sweeps. Predicate-result table contrasts `is some` / `is not` / `req` outcomes.
> - S89 null-eradication (`s89-null-spec-A`, 2026-05-13): SPEC §42 canonical rule articulated in strongest terms per S89 user ruling ("null does NOT EXIST IN SCRML! and never will!"); §34 +1 row `W-NULL-IN-SCRML-SOURCE` (info-level regression-guard companion to E-SYNTAX-042; renamed S89-Wave-7.B → `W-ABSENCE-IN-SCRML-SOURCE`); §6.8.1 amended to make `default=not` the canonical absence form; §42.1 Overview adds explicit JS-host / SQL-DDL / wire-format / runtime-ABI exclusion list (positions that legitimately use JS `null` and do NOT trigger the lint); §42.6 + §42.7 amended; 24 scrml-syntax `null` sites migrated to `not` across §6.8 / §8.4 / §14.3 / §14.9 / §15.10 / §15.11 / §16.7 / §16.8 / App.D / §51.0.N / §51.11 / §52 / §55.1 / §55.12; §50 nine `!== null` migrations to `is some` (canonical scrml presence-check per §42.2.2a).
> - S81 (`ab980c0` F.1+F.2): §39.2.1 amended — `<program cors-max-age=N>` override paragraph (default 86400); §38.3.1 NEW subsection — `<program channel-reconnect=N>` project-level default override; §38.3 attribute table cleanup (S80 stale `protect` row dropped, `auth` row added, `reconnect` row clarified with precedence note).
> - S78 audit fold-in (post-Phase-A10-SHIP, 2026-05-10): §4.15 + §24.4 +1 row each (`<onIdle>` — §51.0.R reference, S77 registry omission caught at S78 audit); §34 +20 rows: `I-MATCH-PROMOTABLE` (§56 cross-ref claim now true), `W-CG-001` (top-level statement suppression), `E-ERRORS-001/002` (`<errors>` element validation), `E-SWITCH-FORBIDDEN` (§17 — `switch` not in scrml vocabulary), W-LINT-001..008 + W-LINT-010..015 (14 ghost-pattern rows from `compiler/src/lint-ghost-patterns.js`).
> - S74 (A8 / A6-1, 2026-05-08): §19.12 +3 subsections (§19.12.6 `test-bind` declaration; §19.12.7 dispatch contract + 0-byte production guarantee + Position B forward-compat (S67-style, no flip-condition gating) + S67-style OQ deferral footnote; §19.12.8 worked example); §19.13 +1 row E-TEST-006; §47.5 +1 cross-reference paragraph (test-mode dispatch hook keys by §47-encoded names; dead-code-eliminated from release builds); §34 +1 row E-TEST-006. Spec-only landing — 0 compiler source changes (parser A6-2, typer A6-3, codegen A6-4, tests A6-5, scrml:test API alignment A6-6 are subsequent sub-steps). Authority: design-insight 22 + S67 user-direction methodology rule (flip conditions are NOT a feature-adoption gating mechanism).
> - S65 (`f963a75`): §41.13 `parseVariant` API entry; §53.14 type-as-argument primitives (L22 family — `parseVariant` shipped, `serialize`/`formFor`/`schemaFor`/`tableFor`/reflective metadata planned);
> - S66 (`I-MATCH-PROMOTABLE` Tier B SHIPPED): §56 NEW Promotion Ergonomics — fire conditions, three message shapes, `bun scrml promote` CLI, `--engine` Tier-1→2 sibling (deferred to Tier C); §34 +1 row I-MATCH-PROMOTABLE; §6.6.10 + §6.6.8 footnote convention precedent;
> - S68 (`1de05ef` — A5-1 spec amendments): §51.0.K Machine Cohesion footnote (singleton invariant articulated; nested engines permitted in composite state-children); §51.0.M `<onTimeout>` element; §51.0.N `history` attribute + `.Variant.history` structured target form (shallow-only); §51.0.O `internal:rule=` prefix; §51.0.P `parallel` attribute (struck 2026-05-08 — see [parallel-disposition deep-dive](../docs/deep-dives/parallel-attribute-disposition-2026-05-08.md); section number retired, gap §51.0.O → §51.0.Q intentional); §51.0.Q hierarchy / nested engines + parent-rule cascade dispatch; §51.12.3.1 computed-delay relaxation; §34 +2 codes E-HISTORY-NO-INNER-ENGINE + E-INTERNAL-RULE-NOT-COMPOSITE; §4.15 + §24.4 structural-elements registries updated for `<onTimeout>`;
> - S69 wrap (`f59bbcc`): §6.8.2 multi-level compound-nav clarification (B22) + §34 new row E-RESET-INVALID-TARGET (B22); A1b functionally COMPLETE (22/22 steps).
> - S78 (`spec-conformance-2026-05-10` §1.2 backfill — legacy prose-only catalog rows): §34 +88 catalog rows for legacy codes whose spec-body prose existed but `§34` row was absent (E-ATTR-013, E-DG-002, E-SQL-006/008, E-COMPONENT-013/014/020/021, W-COMPONENT-001, E-CTRL-001..005, E-MATCH-012, W-MATCH-003, E-IMPORT-005/006/007, E-META-002/003/005..008, E-LIFECYCLE-009/010/012/015/017/018, W-LIFECYCLE-002/007, E-LIN-005/006, E-INPUT-001..004, E-CHANNEL-008/EXPORT-001/002, E-MW-001/002/005/006, E-USE-001/002/005, E-EQ-001..004, W-EQ-001, E-CG-006/010/014, E-ENGINE-001/003..005/010/013..021, E-TIMEOUT-001/002, E-REPLAY-001..003, E-TYPE-041/042/045/071/081, E-PROTECT-003, E-SYNTAX-042..044, E-BATCH-001/002, W-BATCH-001). Companion to the earlier S78 fold-in (audit items 1+3); §1.2 backfill closes the remaining 88-row gap. E-MW-001/002/005/006 + I-MATCH-PROMOTABLE noted as already-present-via-earlier-S78-fold-in / un-fireable per the audit follow-up.
>
> Earlier S58 baseline (preserved for reference): Tier 8 small SPEC edits across §4 / §5 / §7 / §10 / §13 / §14 / §15 / §16 / §21 / §24 / §31 / §41 / §50; Tier 10 reviews (§22 / §28 / §47 / §52); Tier 9 §34 +7 error codes (E-CLOSER-001, E-NAME-COLLIDES-RESERVED, E-STRUCTURAL-ELEMENT-MISPLACED, E-MULTI-STATEMENT-HANDLER, E-IMPORT-PINNED-INVALID, E-DERIVED-CIRCULAR-DEP, E-USE-INVALID-CTX); Tier 11 PIPELINE.md v0.7.0 — per-stage v0.next addenda + Integration Failure Mode Catalog +11 v0.next entries.

Total lines: 28,489 | Total sections: 57 + appendices  (S111 quoted-text model Wave 1, 2026-05-20: NEW §4.18 code-default body mode + display-text literal; §3/§4.14/§4.15/§4.17/§5/§18.0/§51.0 amended; §34 +1 code E-UNQUOTED-DISPLAY-TEXT; net +252L, 28,234 → 28,486; section count unchanged — §4.18 is a §4 subsection. S111 R3 reconciliation (2026-05-20): §4.18.1 / §40.8 / §3.4 / §4.15 — `default-logic` (`<program>`/`<page>` body mode) recorded as a distinct THIRD body-mode owned by §40.8, removed from §4.18.1's free-text-mode listing; net +3L, 28,486 → 28,489)

> **Note on §49 heading format:** SPEC.md §49 uses a single `#` (H1) at line 19410 (`# §49. ...`) instead of the `## N.` pattern every other section uses. The in-tree `bun run /tmp/regen-spec-index.ts` regenerator handles this case explicitly via a `^# §<N>\.` regex branch; the legacy `bash scripts/update-spec-index.sh` print-only helper does NOT pick it up.

## Sections

| § | Section | Lines | Size | Summary |
|---|---------|-------|------|---------|
| — | Table of Contents | 20-102 | 83 | Section listing |
| 1 | Overview | 103-184 | 82 | Design principles, Bun runtime, markup-as-value (§1.4), north-star ladder (§1.5), V5-strict access (§1.6) |
| 2 | File Format and Compilation Model | 185-225 | 41 | Source files, output, entry point, perf target |
| 3 | Context Model | 226-288 | 63 | Contexts, stack rules, coercion, V5-strict access form per locus (§3.4). **S111 amendment (2026-05-20):** §3.4 note — engine state-child / match-arm / `:`-shorthand bodies are code-default-body loci (cross-ref §4.18). |
| 4 | Block Grammar | 289-1268 | 980 | Tags, states, closer forms, PA rules, keywords, angleDepth (PA-005). **D4 +3 subsections:** §4.14 `:`-shorthand body form (M15, L20); §4.15 scrml-defined structural elements registry (`<engine>`/`<match>`/`<errors>`/`<onTransition>`); §4.16 M7 multi-close `<///>` negative-space anchor. **S101 +1 subsection (2026-05-17):** §4.17 raw-content elements `<pre>` / `<code>` — bodies are a single text run; scrml tokens (`${...}`, `<TagName>`, brace sigils) NOT recognized inside; HTML entity-escaping of `<` / `>` / `&` for display remains author responsibility. Closes Bug-#2 friction class. **S111 +1 subsection (2026-05-20 — quoted-text model, scope b):** §4.18 code-default body mode + display-text literal — the single canonical definition. Engine state-child / match block-form arm / `:`-shorthand bodies are code-default bodies (a bare run is code; display text is an explicit `"..."` display-text literal); plain-markup bodies stay free-text (unchanged). §4.18.1 the two §4.18 body modes; §4.18.3 the `"..."` display-text literal (`"`-only — §5 precedent; `'` is a free interior char); §4.18.4 `${...}` interpolation inside the literal; §4.18.5 verbatim whitespace inside the literal; §4.18.6 codegen auto-HTML-escape of literal text content; §4.18.7 `E-UNQUOTED-DISPLAY-TEXT`; §4.18.8 `text`/`TextNode` kind survives (scope b — not deleted). §4.14 amended with the explicit `:`-shorthand body grammar (within-body construct, no new structural delimiter); §4.15 `<engine>`/`<match>` body-form notes mark code-default. **S111 R3 reconciliation (2026-05-20):** §4.18.1 no longer lists `<program>`/`<page>` bodies under free-text mode — that body mode is `default-logic`, a distinct THIRD body-mode owned by §40.8; the §4.18 free-text/code-default split governs only the three code-bearing loci vs plain markup and does not classify `<program>`/`<page>`. §4.18.1 + §3.4 note + §4.15 registry note carry the reciprocal cross-ref. Line ranges below §4.17 shift; regen via `bun run scripts/regen-spec-index.ts` for surgical updates. |
| 5 | Attribute Quoting Semantics | 1269-1919 | 651 | Three forms, bind:, dynamic class, event handler binding (§5.2.2). **D4 +2 subsections:** §5.2.3 bare-form event handler rule (L19, M11) — single-expression discipline + E-MULTI-STATEMENT-HANDLER; §5.4.1 bind-dispatch table by render-spec shape (L17). |
| 6 | Reactivity and the V5-Strict Access Model | 1920-5362 | 3443 | V5-strict two forms (§6.1), three RHS shapes (§6.2), compound state (§6.3), render-by-tag (§6.4), arrays (§6.5), derived+in-compound (§6.6+§6.6.16-17), lifecycle (§6.7), default+reset (§6.8), hoisting (§6.9), pinned (§6.10), validity stub (§6.11), §11 inheritance (§6.12). **S69 amendment (2026-05-08):** §6.8.2 normatively allows multi-level compound-nav targets in `reset(@a.b.c.d)` (B22). **S89 amendment (2026-05-13):** §6.8.1 makes `default=not` the canonical absence form; `null` AND `undefined` in attribute-value position are rejected via E-SYNTAX-042 + surfaced via W-ABSENCE-IN-SCRML-SOURCE (§34; renamed from W-NULL-IN-SCRML-SOURCE). |
| 7 | Logic Contexts | 5363-5669 | 307 | `{}` syntax, function forms, markup-as-expr, type annotations, file-level scope (§7.6). **D4 +3 subsections:** §7.4.1 markup-as-expression under markup-as-value pillar (L1); §7.6.1 file-level scope under V5-strict + hoisting + `pinned` (M11); §7.7 logic-markup interleaving (M8). |
| 8 | SQL Contexts | 5670-6231 | 562 | `?{}` syntax, bound params, chaining, WHERE, INSERT/UPDATE/DELETE, **§8.9 per-handler coalescing, §8.10 N+1 loop hoist, §8.11 mount hydration** |
| 9 | CSS Contexts | 6232-6274 | 43 | Inline CSS (§9.1), style block, CSS files |
| 10 | The `lift` Keyword | 6275-6668 | 394 | Semantics, coercion, syntax forms, ordering, value-lift, accumulation (§10.8). **D4 +1 subsection:** §10.1.1 lift under markup-as-value pillar (L1 reframe). |
| 11 | State Objects and `protect=` (Reserved — Folded) | 6669-6690 | 22 | Content distributed: state declarations → §6; protect=, schema, authority → §52 |
| 12 | Route Inference | 6691-6795 | 105 | Default placement, escalation triggers, generated infra, server return (§12.5). **S90 amendment (M-7C-D-12 Track 4):** §12.5.1 +5 normative bullets — wire-format envelope `{"__scrml_absent": true}` for `T | not` server-fn returns (OQ-2 (b)); cross-ref new §57 wire-format section. |
| 13 | Async Model | 6796-7066 | 271 | Developer-visible syntax, compiler-managed async, RemoteData enum (§13.5). **D4:** §13.5 v0.next cross-ref to engine recipe (Tier 2 idiom for state-driven loading). |
| 14 | Type System | 7067-7670 | 604 | Structs (§14.3.2 enum fields), enums, pattern matching, asIs, schema types, snippet type. **D4 +2 subsections:** §14.10 bare-variant inference (M9); §14.11 positional binding for predefined-shape compound state (M10). |
| 15 | Component System | 7671-8784 | 1114 | Definition, props, shapes, slots, callbacks, rendering syntax, reactive scope (§15.13). **D4 +2 subsections:** §15.13.5 components-stay-distinct-from-engines (M20, E-COMPONENT-ENGINE-SCOPE); §15.13.6 component reactive scope under V5-strict. |
| 16 | Component Slots | 8785-9054 | 270 | Named slots, unnamed children, fill syntax, render validation. **D4:** §16 markup-as-value pillar (L1) reaffirmation note for slots. |
| 17 | Control Flow | 9055-9775 | 721 | **§17.0 Tier ladder (S57 D2.8)**: Tier 0 (`if=`) + cross-refs to §18 / §51 + W-LIFECYCLE-CANDIDATE; if=, show=, lifecycle, iteration, overloading, if-as-expression (§17.6). **S64 (2026-05-06):** §17.5 amended — function-overload retired (debate-02 verdict); component-overload closed-without-resolution (debate-03 verdict, SPEC-ISSUE-010-COMPONENT closed); trio (`match`/`engine`/derived) named as canonical replacement. |
| 18 | Pattern Matching and Enums | 9776-11120 | 1345 | **§18.0 (S57 D2.8)**: two match shapes — block-form `<match for=Type>` (Tier 1, §18.0.1) + JS-style; §18.0.2 attribute legality (rule= inert, effect=/onTransition forbidden); §18.0.3 bare-variant inference; existing JS-style match content preserved (§18.1+). **S111 amendment (2026-05-20 — quoted-text model):** §18.0.1 match block-form arm bodies are code-default bodies (§4.18) — a bare run is code; display text is a `"..."` display-text literal; bare prose fires `E-UNQUOTED-DISPLAY-TEXT`. Worked examples updated. |
| 19 | Error Handling (Revised) | 11121-12263 | 1143 | Renderable enum variants, fail, ?, !, errorBoundary, renders clause, **§19.10.5 implicit per-handler tx**. **S74 A8/A6-1 (2026-05-08):** §19.12 extended with `test-bind` declaration form — §19.12.6 surface syntax + scope + explicit-unchanged claims (E-TEST-004 / E-FN-004 / Insight 21); §19.12.7 dispatch contract + 0-byte production guarantee + Position B forward-compat (S67-style, no flip-condition gating) + S67-style OQ deferral footnote (OQ-8b / OQ-test-bind-concurrency / OQ-test-bind-passthrough / OQ-audit-log-compose); §19.12.8 worked example. §19.13 +1 row E-TEST-006 (fail-fast unbound server-fn in active test-bind context). **S114 (2026-05-21):** §19.9.8 NEW — "No `async`/`await` — language-wide standing rule" — formalises the rule the §48.3.5 (E-FN-005) was the partial expression of. References the body-split / CPS (§19.9.3) as canonical async surface; documents the three new parse-layer error codes (E-ASYNC-NOT-IN-SCRML, E-AWAIT-NOT-IN-SCRML, E-FOR-AWAIT-NOT-IN-SCRML) added to §34. Generators (yield/function*) preserved per S114 user direction. §48.3.5 amended to subordinate to §19.9.8. |
| A | Appendix A: Interaction Matrix | 12264-12282 | 19 | Error system feature interactions |
| B | Appendix B: Superseded Spec Text | 12283-12291 | 9 | What §19 replaced |
| C | Appendix C: Future Considerations | 12292-12300 | 9 | Error composition, retry, telemetry, async errors |
| D | Appendix D: JS Standard Library | 12301-12321 | 21 | JS stdlib access in logic contexts |
| E | Appendix E: `</>` Closer Migration | 12322-12356 | 35 | Migration guide for `/` → `</>` |
| 20 | Navigation API | 12357-12528 | 172 | navigate(), route params, session context |
| 21 | Module and Import System | 12529-12964 | 436 | Export/import syntax (incl. §21.2 Form 1 / Form 2 — P2 2026-04-30), re-export, pure-type files. **D4 +1 subsection:** §21.8 cross-file engine import (M18) + §21.8.1 `pinned` on imports. **S114 (2026-05-21):** NEW §21.3.1 `import:host` declaration form — bounded self-host bootstrap bridge per Approach C ratification (^{} expressiveness DD) + α-shape verdict (import:host grammar-shape sub-DD). Manifest-gated via §22.13; 2 new error codes E-IMPORT-008 (manifest-gate violation) + E-IMPORT-009 (unknown host-tag). Forward-pluggable to `import:wasm` / `import:wat` / etc. via SPEC amendment. |
| 22 | Metaprogramming | 12965-13632 | 668 | `^{}` meta context, compile-time/runtime meta, Option D scope model. **D4:** Reviewed-for-v0.next note at section start — markup-as-value pillar reinforces splicing; no spec changes required. **S114 (2026-05-21):** §22.5.1 +4 timer primitives (`meta.interval` / `meta.timeout` / `meta.clearInterval` / `meta.clearTimeout`) — Approach C closes the runtime `meta` API at 12 closed primitives. NEW §22.12 "Approach C — what scrml-native fully describes" — formal ratification + M6 total-retirement implication (BS + Acorn + BPP + JS-parser-in-^{}-body all retired). NEW §22.13 "Manifest entry — `[capabilities] host-import`" — composes with the 2026-05-17 SPEC-capability-boundary draft. |
| 23 | Foreign Code Contexts (`_{}`) | 13633-14075 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 14076-14138 | 63 | Element registry, shape constraints. **D4 +1 subsection:** §24.4 scrml-defined structural elements (NOT HTML — `<engine>`/`<match>`/`<errors>`/`<onTransition>`/`<onTimeout>` per S68 A5-1). |
| 25 | CSS Variable Syntax | 14139-14237 | 99 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 14238-14417 | 180 | Integration model; **§26.3 Variant Prefixes (S49)** with W-TAILWIND-001 emission rule; **§26.4 Arbitrary Values (S49 NEW; S109 grid/flex/aspect family + underscore-as-space + ratio shape + decl-transform path)** with §26.4.1 validation + §26.4.2 cross-feature; **§26.5 Open Items (S49)** group-*/peer-*/custom-theme deferred + **W-TAILWIND-UNRECOGNIZED-CLASS (S108 FLOOR / S109 grid+flex+aspect full-fix)**; **§26.6 Typography Plugin (S100 NEW)** prose family — §26.6.1 base prose styling with `:where()`+`:not(:where([class~="not-prose"] *))` selectors, §26.6.2 color variants (slate/gray/zinc/neutral/stone), §26.6.3 size variants (sm/base/lg/xl/2xl), §26.6.4 not-prose opt-out, §26.6.5 open items |
| 27 | Comment Syntax | 14418-14438 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 14439-14481 | 43 | html-content-model setting. **D4:** Reviewed-for-v0.next note + 4 new lint-suppression configs (`lint.lifecycle-candidate`, `lint.match-rule-inert`, `lint.engine-initial-missing`, `lint.deprecated-machine`). |
| 29 | Vanilla File Interop | 14482-14490 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 14491-14521 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 14522-14594 | 73 | Purpose, construction, route analysis. **D4 +2 subsections:** §31.4 validator predicate-arg dependency tracking (L14); §31.5 derived-state expression dependency tracking (L15, L20). |
| 32 | The `~` Keyword | 14595-14806 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 14807-14871 | 65 | Purity constraints, **§33.6 fn ≡ pure function (S32)**, W-PURE-REDUNDANT |
| 34 | Error Codes | 14872-15428 | 557 | All error code definitions. **S111 +1 (2026-05-20 — quoted-text model, scope b):** E-UNQUOTED-DISPLAY-TEXT — bare (unquoted) display text in a code-default body (engine state-child / match arm / `:`-shorthand); display text must be a `"..."` display-text literal (§4.18.3). Spec-ahead-of-implementation (Wave 2+ wires the fire). Scoping notes added to E-SYNTAX-050 (bare-`/` `looksLikeCloser` — still fires in plain-markup free-text bodies, NOT in code-default bodies where `/` is an operator) and E-CTX-003 (`:`-shorthand-vs-full-body shape confusion surfaces as this code; §4.18/§4.14 recognition prevents the misfire). **S98 +3:** E-ENGINE-PAYLOAD-ON-UNIT-VARIANT, E-ENGINE-PAYLOAD-ARITY-MISMATCH, E-ENGINE-PAYLOAD-RESERVED-COLLISION (engine state-child payload-binding diagnostics; cross-ref §51.0.B.1 NEW). **S89 +1:** W-ABSENCE-IN-SCRML-SOURCE (info-level regression-guard lint companion to E-SYNTAX-042; covers BOTH `null` and `undefined` absence tokens; cross-ref §42.1 / §6.8.1 / §42.9; renamed S89-undefined-eradication-dispatch from W-NULL-IN-SCRML-SOURCE). **S74 A1b B17.3 +1:** E-ONTRANSITION-NO-TARGET (`<onTransition>` with neither `to=` nor `from=`). **S74 A8/A6-1 +1:** E-TEST-006 (fail-fast unbound server-fn in active test-bind context, §19.12.7; design-insight 22). **S69 +1:** E-RESET-INVALID-TARGET (B22). **S68 A5-1 +2:** E-HISTORY-NO-INNER-ENGINE, E-INTERNAL-RULE-NOT-COMPOSITE. **S66 +1:** I-MATCH-PROMOTABLE info-level lint (Promotion Ergonomics §56). **S65 +4:** E-PARSEVARIANT-* (parseVariant, §41.13). **D4 (2026-05-04) +7:** E-CLOSER-001, E-NAME-COLLIDES-RESERVED, E-STRUCTURAL-ELEMENT-MISPLACED, E-MULTI-STATEMENT-HANDLER, E-IMPORT-PINNED-INVALID, E-DERIVED-CIRCULAR-DEP, E-USE-INVALID-CTX. **D3 +2:** E-CHANNEL-INSIDE-PROGRAM, E-CHANNEL-SHARED-MODIFIER. **D2.8 +17:** match/engine/derived-engine/component-engine-scope/validator-circular/derived-with-validators. |
| 35 | Linear Types — `lin` | 15429-15890 | 462 | Declaration (exactly-once + restricted intermediate visibility), consumption, control flow, closures, lin function params (§35.2.1), cross-`${}` block lin (§35.2.2), E-LIN-005 shadowing + E-LIN-006 deferred-ctx (§35.5) |
| 36 | Input State Types | 15891-16248 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 16249-16490 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 16491-17236 | 746 | **D3 MAJOR REWRITE (M19, 2026-05-04).** `<channel>` at FILE LEVEL (sibling of `<program>`, not child); `@shared` modifier REMOVED — auto-sync from being declared in channel body; V5-strict body (`<x> = init` declares; `@x` reads/writes); §38.1 file-level placement, §38.4 V5-strict reactive sync, §38.4.1 v1→v0.next migration; broadcast/disconnect/onserver:*/onclient:* preserved; cross-file inline expansion (§38.12) updated. E-CHANNEL-002 retired; E-CHANNEL-INSIDE-PROGRAM + E-CHANNEL-SHARED-MODIFIER added (§34). |
| 39 | Schema and Migrations | 17237-17635 | 399 | `< schema>`, column types, migration diff. **D3 (L4, 2026-05-04) +3 subsections:** §39.5.7 additive shared-core validator vocabulary (`req`/`length`/`pattern`/`min`/`max`/`gt`/`lt`/`gte`/`lte`/`eq`/`neq`/`oneOf`/`notIn`); §39.5.8 lowering to standard SQL DDL (`CHECK`, `NOT NULL`); §39.5.9 when-to-use SQL-mirror vs shared-core. SQL-mirror remains canonical; shared-core is purely additive. |
| 40 | Middleware and Request Pipeline | 17636-18407 | 772 | Auto middleware, handle() escape hatch. **+ §40.7 documentary attributes** (`title`/`description`/`version`/`author`/`license` on `<program>`; HTML head metadata; W-PROGRAM-TITLE-NESTED on nested `<program>` blocks; landed S59 `4620290`). **§40.8 v0.3 program shape** — one-program-per-application; `<program>`/`<page>` body parses in `default-logic` mode (bare top-level decls auto-lift; W-PROGRAM-REDUNDANT-LOGIC). **S111 R3 reconciliation (2026-05-20):** §40.8 amended — `default-logic` recorded as a distinct THIRD body-mode owned by §40.8, separate from §4.18's free-text / code-default split; reciprocal §4.18 cross-ref added so the three-mode picture is coherent from both sides. |
| 41 | Import System — `use`/`import` | 18408-19217 | 810 | Capability imports, value imports, vendoring. **D4 +1 subsection:** §41.12 `scrml:data` `registerMessages` — project-level error message registration (L12). **S65 +1 subsection:** §41.13 `scrml:data` `parseVariant(json, EnumType)` — boundary-parsing primitive for tagged-variant JSON; FIRST general-position type-as-argument family member (L22); failure type `ParseError:enum` with `MissingDiscriminator`/`UnknownVariant`/`InvalidPayload`/`Malformed`. **S102 +1 subsection:** §41.14 `scrml:data` `formFor(StructType)` — type-driven form generation FLAGSHIP; SECOND general-position L22 family member (cross-ref §53.14.3); markup-element form `<formFor for=Signup onsubmit=fn pick=[...]/>` with named slots for per-field customization (§16); progressive-enhancement `<form action=>` structural default when handler is `server function`; auto-synthesized state cell + Shape 2 + auto-synth validity surface + `<errors of=>` + submit button; 8 error codes in §34; v1.0 scope excludes multi-step / read-only / nested-struct-auto-recurse / per-type renderer registry / `@label` annotation (all reserved for v1.next). **S103 +1 subsection:** §41.15 `scrml:data` `schemaFor(StructType)` — type-driven SQL DDL generation; THIRD general-position L22 family member (cross-ref §53.14.3); FUNCTION-CALL form `${ schemaFor(Users) }` interpolated inside `<schema>` block per OQ-SCH-1 debate verdict (Form B 50/60 vs Form A markup-element 39/60 vs Form C block-attribute 37/60 — output-kind match: schemaFor produces DDL string, not markup); emits `<schema>` `table-declaration` fragment (body-only — caller wraps in `<schema>`); shared-core emit vocabulary (per OQ-SCH-11 + §39.5.7); enum-typed struct fields lower to `text req oneOf([variant-names...])` automatically (OQ-SCH-12 — load-bearing v1.0 value-add; closes enum-knowledge-loss-at-DB-boundary gap); pick/omit field-set transforms; payload-bearing enums + nested struct fields + non-mappable types REJECTED (per-error-code); 8 `E-SCHEMAFOR-*` codes in §34. Path B pivot from serialize STASH (`docs/changes/serialize-scoping/SCOPING.md`). Closes §39+L4 vocabulary-unification loop waiting since L4 landed S58. |
| 42 | `not` — Unified Absence Value | 19218-19571 | 354 | `not` keyword, `is not`, `is some`, `given x =>`, `T | not`, compound exprs (§42.2.4). **D3 (L5, 2026-05-04) +1 subsection:** §42.2.5 `is some` vs `req` are distinct predicates — `is some` checks existence (`""` IS some), `req` checks meaningful value (`""` fails req); three native loci of "exists/required" semantic. **S89 amendment (2026-05-13):** §42.1 Overview reworked — S89 user ruling ("null does NOT EXIST IN SCRML! and never will!", extended to `undefined`) articulated as canonical rule; W-ABSENCE-IN-SCRML-SOURCE info lint (renamed S89-undefined-dispatch from W-NULL-IN-SCRML-SOURCE) named as regression-guard companion to E-SYNTAX-042; explicit exclusion list enumerates JS-host / SQL-DDL / wire-format / runtime-ABI positions that do NOT trigger the lint; §42.6 +1 row (W-ABSENCE-IN-SCRML-SOURCE); §42.7 +2 normative bullets (default=not canonical form + compiler-emission-SHALL clause). **S89 undefined-eradication amendment (2026-05-13):** §42.1.1 NEW subsection — "Defined Values vs. Absence — `""` is NOT Absence" — articulates user ruling that `""` / `0` / `false` / `[]` / `{}` are DEFINED values (not absence) and SHALL NOT be migrated to `not`; predicate-result table contrasts `is some` / `is not` / `req` outcomes. |
| 43 | Nested `<program>` | 19572-19654 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 19655-19770 | 116 | Bun.SQL target, driver resolution, `.get()` → `T | not`; **§44.8 bracket-matched `?{` scanner (F-SQL-001)** + E-SQL-008 hard-error |
| 45 | Equality Semantics | 19771-19832 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 19833-19879 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 19880-20423 | 544 | Encoded JS variable names, kind prefixes, hash scheme. **D4:** Reviewed-for-v0.next note — synthesised validity props, auto-declared engine vars, derived engines all ride existing kind markers (`p`/`a`/`t`); no new kind markers required. **S74 A8/A6-1 (2026-05-08):** §47.5 +1 cross-reference paragraph — test-mode `test-bind` dispatch hook (§19.12.6 / §19.12.7) keys its scope-local dispatch table by §47-encoded names; no new naming scheme; dead-code-eliminated from release builds. |
| 48 | The `fn` Keyword | 20424-21124 | 701 | Body prohibitions, return-site completeness, lift in fn, calling conventions; **S32: Layer 2 retired, §54 cross-ref**. **S98 (2026-05-17) +1 subsection:** §48.6.4 Mutual Recursion and Hoisting — `fn` declarations at file scope hoist per §6.9, mirroring `function`; mutual recursion supported without source-order constraints; `pinned fn` opt-out (parser-recognition implementation-pending, normative semantics specified); +2 normative statements at §48.13. Resolves Acorn-replacement Phase 0 DD §D4 P2 missing-primitive. Line counts may shift by ~60 lines; regen pending. |
| 49 | `while` and `do...while` Loops | 21125-21827 | 703 | Grammar, break/continue, labels, lift in loops, E-LOOP errors (heading uses H1, not H2) |
| 50 | Assignment as Expression | 21828-22333 | 506 | Assign-expr syntax, semantics, type rules, fn interaction. **D4 +2 subsections:** §50.14 composition with markup-as-value pillar (L1); §50.15 composition with bare-form event handlers (L19). |
| 51 | State Transition Rules / `< machine>` / `<engine>` | 22334-25748 | 3415 | **S111 amendment (2026-05-20 — quoted-text model, scope b):** §51.0.A / §51.0.B / §51.0.I — engine state-child bodies (bare-body and `:`-shorthand) are code-default bodies (§4.18); a bare run is code, display text is a `"..."` display-text literal, bare prose fires E-UNQUOTED-DISPLAY-TEXT. Worked examples migrated to the quoted form (§51.0.B.1 + §51.0.N + §51.0.Q.1). **S98 amendment (2026-05-17):** §51.0.B normative-statements list added (state-child attribute surface + reserved attribute set `{rule, effect, history, internal:rule}` + cross-ref to §51.0.B.1); NEW §51.0.B.1 payload binding on engine state-children — three forms (bare-attribute, named, parenthesized) normatively authorized; sister normative form to §18.0.1 match block-form; positional + named semantics inherit from §18.7; reserved-name precedence rule; unit-variant rejection; arity-match rule; worked examples for `BracketStack.OpenAt` (multi-field) + `ErrorRecovery.AccumulatingSkipped` (array-typed). §34 +3 codes: E-ENGINE-PAYLOAD-ON-UNIT-VARIANT, E-ENGINE-PAYLOAD-ARITY-MISMATCH, E-ENGINE-PAYLOAD-RESERVED-COLLISION. §51.0.M worked example normalized — `<Done count>` -> `<Done rows>` for field-name uniformity with `Done(rows: int)`; positional name-divergence is still spec-conformant per §51.0.B.1 (editorial note added). Authority: `scrml-support/docs/deep-dives/payload-bearing-engine-state-child-variants-SURVEY-2026-05-17.md`. Track 1 of two-track recommendation; track 2 (compiler-feature wiring) sequences separately. **§51.0 (S57 D2.8) — engines as Tier 2**: §51.0.A overview/singleton; §51.0.B declaration syntax; §51.0.C auto-declared variable + var=; §51.0.D mount position (decl=mount; cross-file singleton); §51.0.E initial= + W-ENGINE-INITIAL-MISSING; §51.0.F rule= contract (compile-time + runtime) + §51.0.F.1 idempotent self-write semantics (v0.3 Option-d, 2026-05-12 — self-writes are no-ops, NOT rule= violations; W-ENGINE-SELF-WRITE-DETECTED info lint surfaces the no-op at compile time); §51.0.G .advance() loud; §51.0.H effect= / <onTransition> (to/from/once/if=); §51.0.I :-shorthand; §51.0.J derived engines (L20); §51.0.K components vs engines (Move 20, E-COMPONENT-ENGINE-SCOPE) + S67 Machine Cohesion footnote; §51.0.L relationship to legacy §51.1+. **S67 amendments LANDED S68 `1de05ef`:** §51.0.M `<onTimeout>` element (Item C — Candidate C; engine temporal surface; rides §51.12 runtime); §51.0.N `history` attribute on composite state-children (Insight 23 #2; tree-shakeable synth cell `@_<outerVar>_<variant>_history`; shallow-only this revision; `.Variant.history` structured target form); §51.0.O `internal:rule=` prefix (Insight 23 #4; preserves inner-engine lifecycle on internal transitions); ~~§51.0.P `parallel` attribute~~ (S68 ratification STRUCK 2026-05-08 per [parallel-disposition deep-dive](../docs/deep-dives/parallel-attribute-disposition-2026-05-08.md) — synonym-test failure conceded by spec text; section number retired, gap §51.0.O → §51.0.Q intentional); §51.0.Q hierarchy / nested `<engine>` declarations + parent-rule cascade dispatch (Insight 23 #1 + #3; composite state-children; OQ-Harel-1..7 bundled). +2 new error codes: E-HISTORY-NO-INNER-ENGINE, E-INTERNAL-RULE-NOT-COMPOSITE. §51.12.3.1 computed-delay relaxation (S67 — applies to both engine and machine forms). Legacy `<machine>` content preserved §51.1-§51.16. |
| 52 | State Authority Declarations | 25749-26363 | 615 | Two-tier authority, server @var, sync infrastructure. **D4:** Reviewed-for-v0.next note — V5-strict access composes; auto-synth validity surface synthesises regardless of authority; channels are not §52 authority. |
| 53 | Inline Type Predicates | 26364-27424 | 1061 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs. **D3 (L4, 2026-05-04) +2 subsections:** §53.6.1 shared-core vocabulary in refinement-type position (cross-ref §55.1 for the universal-core predicate listing); §53.6.2 composition with state-cell validators (type predicate + `req` stack as independent enforcement layers). **S65 +1 subsection:** §53.14 type-as-argument primitives (L22 family; §53.14.1 motivation type-establishment vs predicate-enforcement; §53.14.2 `reflect(TypeName)` meta-block precedent; §53.14.3 family roster — `parseVariant` shipped, `serialize`/`formFor`/`schemaFor`/`tableFor` planned; §53.14.4 discipline; §53.14.5 compile-time recognition; §53.14.6 stdlib-declared types). |
| 54 | Nested Substates and State-Local Transitions | 27425-27725 | 301 | **S32 (2026-04-20).** Nested substate grammar (§54.2), state-local transitions (§54.3), field narrowing (§54.4), terminal states (§54.5), 4 new error codes (§54.6), interaction matrix (§54.7). Companion to §51.15 cross-check. **S57 D2.8 composition note**: §54 composes uniformly with §51.0 engine state-children. |
| 55 | Validators and the Auto-Synthesized Validity Surface | 27726-28214 | 489 | **NEW S57 D2.8.** §55.1 universal-core vocabulary (req, length, pattern, min/max, gt/lt/gte/lte, eq/neq, oneOf/notIn — L4); §55.2 state-cell validators; §55.3 refinement-type validators (cross-ref §53); §55.4 schema-column validators (cross-ref §39); §55.5/§55.6 auto-synth validity surface compound + per-field (L11) — isValid/errors/touched/submitted; §55.7 synthesized-property semantics (read-only); §55.8 `<errors of=expr/>` first-class element (L13); §55.9 ValidationError enum (L12); §55.10 4-level message resolution chain (L12); §55.11 cross-field via predicate args (L14); §55.12 multi-errors / short-circuit; §55.13 reset interaction (cross-ref §6.8); §55.14 engine + derived cells; §55.15 cross-refs + error-code listing. |
| 56 | Promotion Ergonomics — `I-MATCH-PROMOTABLE` and `bun scrml promote` | 28215-28394 | 180 | **NEW S66 — Tier B SHIPPED 2026-05-07.** §56.1 motivation; §56.2 fire conditions for `I-MATCH-PROMOTABLE` info-level lint; §56.3 three message shapes (exhaustive / near-miss / compound); §56.4 compound-condition advisory; §56.5 `bun scrml promote --match` CLI subcommand (per-branch rewrite rule, idempotent, `--dry-run`); §56.6 `--engine` Tier 1→2 sibling (deferred to Tier C — needs W-MATCH-TRANSITIONS-ACCRUING groundwork); §56.7 tooling integration; §56.8 cross-references. Predicate matrix supports both `if (@cell is .Variant)` AND `if (@cell == .Variant)` per S66 narrowing reversal. |
| 57 | Wire Format | 28395-28490 | 96 | **NEW S90 (2026-05-13) — M-7C-D-12 Track 4 / D-12.4b.** §57.1 scope (server-fn / channel / SSE for `T | not`); §57.2 canonical envelope shape `{"__scrml_absent": true}` (OQ-2 (b)); §57.3 encoder rules — envelope on absence, raw value on presence; §57.4 decoder dual-decoder — accepts envelope + raw null (OQ-4 (b)); §57.5 clean break at v1.0 (OQ-4 (a) forward-deprecation); §57.6 forward-compat with potential Option-β runtime sentinel naming; §57.7 cross-refs §12.5.1 / §37 / §38 / §41.13 / §42. Slot note: SCOPING's working label `§50.x` lands at §57 because §50 is occupied by Assignment-as-Expression. |

## Quick Lookup: Topic → Section

- raw-content elements `<pre>` / `<code>` (S101 — scrml tokens NOT parsed inside; HTML entity-escaping for display remains author concern) → §4.17 + §24.3.1
- code-default body mode (S111 — quoted-text model, scope b; engine state-child / match arm / `:`-shorthand bodies: a bare run is code, display text is a `"..."` literal; plain markup stays free-text) → §4.18
- display-text literal `"..."` (S111 — body-position display-text vehicle in code-default bodies; `"`-only, `'` is a free interior char; `${...}` interpolation inside; verbatim whitespace; codegen auto-HTML-escapes literal text) → §4.18.3 + §4.18.4 + §4.18.5 + §4.18.6
- `:`-shorthand body grammar (S111 — within-body construct bounded by `:` and the opener `>`; no new structural delimiter; code-default sub-mode) → §4.14 + §4.18.1
- `text` / `TextNode` block/AST kind survives (S111 — scope b keeps it for plain-markup free text; NOT deleted) → §4.18.8
- attribute parsing → §5 (1026-1674)
- bind:value → §5 (~1147+)
- event handler binding → §5.2.2 (1105-1126)
- bare-form event handler / multi-statement rule → §5.2.3 (1127+) (D4)
- bind-dispatch table by render-spec → §5.4.1 (1318+) (D4)
- dynamic class → §5 (1255+)
- reactive declaration → §6.1-§6.2 (1675+) (V5-strict two forms + three RHS shapes)
- V5-strict access → §6.1 (1677+) + §1.6 (169+) + §3.4 (267+)
- three RHS shapes for state declarations → §6.2 (~1764+)
- Variant C compound state → §6.3 (~1827+)
- render-by-tag semantics → §6.4 (~1895+)
- default= attribute → §6.8 (~4716+)
- reset keyword → §6.8 (~4716+)
- hoisting model → §6.9 (~4774+)
- pinned keyword → §6.10 (~4816+)
- validity surface (auto-synthesized) → §6.11 (~4856+) + §55
- markup-as-value pillar → §1.4 (126+)
- north star + Tier ladder → §1.5 (145+)
- in-compound derived values → §6.6.16 (~2960+)
- markup-typed derived cells → §6.6.17 (~2997+)
- reactive arrays → §6.5 (~1945+)
- reactive array mutation → §6.5 (~1945+)
- derived values → §6.6 + §6.6.16-17 (~2363+)
- lifecycle / cleanup → §6.7 (~2960+)
- timeout / single-shot timer → §6.7.8 (~3774+)
- logic context → §7 (4910-5149)
- markup-as-expr in logic context → §7.4 (4991+) + §7.4.1 (5011+) (L1 reframe, D4)
- file-level scope sharing → §7.6 (~5060+) + §7.6.1 (5096+) (V5-strict + pinned, D4)
- logic-markup interleaving → §7.7 (5113+) (M8, D4)
- SQL / ?{} → §8 (5150-5686)
- SQL per-handler coalescing (Tier 1) → §8.9 (~5552+)
- SQL N+1 loop hoisting (Tier 2) → §8.10 (~5600+)
- SQL mount-hydration coalescing → §8.11 (~5670+)
- CSS → §9 (5687-5729)
- CSS inline block → §9.1 (5691+)
- lift → §10 (5730-6123)
- lift under markup-as-value → §10.1.1 (5746+) (L1 reframe, D4)
- lift accumulation order → §10.8 (~6088+)
- state objects / protect= → §11 (6124-6145) (reserved stub; see §6.12 and §52)
- route inference → §12 (6146-6241)
- server function return values → §12.5 (~6206+)
- async → §13 (6242-6512)
- async loading / RemoteData → §13.5 (6329+) (D4: cross-ref to engine recipe)
- type system / structs / enums → §14 (6513-7116)
- enum types as struct fields → §14.3.2 (~6529+)
- bare-variant inference (general) → §14.10 (7034+) (M9, D4)
- positional binding for predefined-shape compound → §14.11 (7070+) (M10, D4)
- components / props → §15 (7117-8230)
- component reactive scope → §15.13 (~7908+)
- components-vs-engines distinction → §15.13.5 (7960+) (M20, D4)
- component reactive scope under V5-strict → §15.13.6 (7993+) (D4)
- slots → §16 (8231-8500)
- if= / show= / control flow → §17 (8501-9210)
- if-as-expression → §17.6 (~8855+)
- match / pattern matching → §18 (9211-10486)
- is operator → §18.17 (~10093+)
- partial match → §18.18 (~10223+)
- error handling / fail / ? / ! → §19 (10487-11358)
- implicit per-handler transactions → §19.10.5 (~11038+)
- navigation / navigate() → §20 (11452-11623)
- module / import / export → §21 (11624-12059)
- export <ComponentName> Form 1 / Form 2 (P2 §21.2) → §21.2 (~11632+)
- cross-file engine import → §21.8 (11989+) (M18, D4)
- pinned on imports → §21.8.1 (12034+) (D4)
- meta / ^{} → §22 (12060-12727)
- foreign code / _{} → §23 (12728-13170)
- WASM sigils → §23.3 (~12950+)
- sidecars / use foreign: → §23.4 (~13105+)
- HTML elements → §24 (13171-13223)
- scrml-defined structural elements (NOT HTML) → §24.4 (13195+) (D4)
- CSS variables → §25 (13224-13322)
- comments → §27 (13421-13441)
- compiler settings → §28 (13442-13483)
- lint suppression configs (v0.next) → §28 (13442-13483) (D4)
- bun.eval() → §30 (13493-13523)
- dependency graph → §31 (13524-13596)
- validator predicate-arg dependency tracking → §31.4 (13546+) (L14, D4)
- derived-state expression dependency tracking → §31.5 (13574+) (L15, L20, D4)
- tilde / ~ → §32 (13597-13808)
- pure → §33 (13809-13873)
- error codes → §34 (13874-14126)
- E-UNQUOTED-DISPLAY-TEXT (S111 — quoted-text model, scope b; bare display text in a code-default body — engine state-child / match arm / `:`-shorthand; display text must be a `"..."` literal; spec-ahead-of-implementation, Wave 2+ wires the fire) → §34 + §4.18.7
- E-SYNTAX-050 / E-CTX-003 scoping notes (S111 — bare-`/` `looksLikeCloser` fires in plain-markup free-text bodies NOT code-default bodies; `:`-shorthand shape-confusion surfaces as E-CTX-003) → §34 + §4.18 + §4.14
- linear types / lin → §35 (14127-14588)
- lin function params → §35.2.1 (~14127+)
- keyboard / mouse / gamepad → §36 (14589-14946)
- SSE / server function* → §37 (14947-15188)
- WebSocket / channel → §38 (15189-15898)
- schema / migrations → §39 (15899-16268)
- middleware / handle() → §40 (16269-16492)
- `<program>` documentary attributes / HTML head metadata → §40.7 (Phase A1a, 2026-05-05)
- use / import system → §41 (16493-16742)
- registerMessages / scrml:data → §41.12 (16698+) (L12, D4)
- formFor — type-driven form generation FLAGSHIP (S102 — L22 family second general-position member; SHIPPED S102-S103 end-to-end incl. stdlib re-export) → §41.14 (18389+)
- schemaFor — type-driven SQL DDL generation (S104 — L22 family THIRD general-position member; SHIPPED S104 incl. stdlib re-export + 62 tests + flagship enum-lowering per OQ-SCH-12) → §41.15 (~18540+)
- tableFor — type-driven `<table>` rendering FOURTH general-position L22 member; admin-UI-lift sibling to formFor (S105 — SPEC §41.16 + 13 `E-TABLEFOR-*` codes; impl pending). Markup-element form `<tableFor for=T rows=@cell>` per OQ-TF-1 synthesis-mode verdict 53/60 → §41.16 (~18700+)
- tableFor markup-element form `<tableFor for=Type rows=@cell/>` (OQ-TF-1 debate verdict Form A 53/60 vs Form B function-call 34/60 vs Form C block-attribute 29/60; 19-pt margin) → §41.16
- tableFor `<column field="X">` slot grammar (OQ-TF-7; rides §16 component slots; mirror formFor OQ-FF-1 51.5/60 verdict) → §41.16.3
- tableFor sort surface — opt-in `<column sortable>` + auto-synth `@<varName>.sortedBy: TableSort | not` state cell (OQ-TF-2 + OQ-TF-12) → §41.16.7
- tableFor selection surface — opt-in `selectable=@cell` outer attribute + leading checkbox column + mechanical `id`-field PK derivation + `selectedBy="field"` override (OQ-TF-3 + OQ-TF-12) → §41.16.8
- tableFor empty-state default + `<empty>` slot override (OQ-TF-6) → §41.16.9
- tableFor `pick:`/`omit:` field-set transforms (OQ-TF-8 family-vocabulary symmetry with formFor + schemaFor) → §41.16.5
- tableFor per-cell type-driven default rendering (string/integer/real/boolean/timestamp/bare-variant-enum → text; payload-enum → E-TABLEFOR-VARIANT-PAYLOAD-ENUM-V1; nested-struct → E-TABLEFOR-NESTED-STRUCT-NO-SLOT) → §41.16.6
- tableFor row binding inside `<column>` slot — explicit `:let={(row) => ...}` per §16.6 (OQ-TF-11 MEDIUM verdict; sub-debate optional if user contests implicit `@row` alternative) → §41.16.3
- tableFor v1.0 scope-OUT (filtering / pagination / auto-recurse nested struct / `@label`/`@column` annotations / positional column slots / row-click handlers / server-side sort-filter-pagination / CSS-shipped styling / `<actions>` named slot / `registerColumnRenderer` registry / implicit `@row` magic var) → §41.16.10
- schemaFor compiler-source impl (S104 — type-system walker + emit-schema-for.ts expander + 8 E-SCHEMAFOR-* codes wired) → compiler/src/type-system.ts (collectSchemaForImports + walkAndExpandSchemaForCalls + _processSchemaForCallInSchemaContext) + compiler/src/codegen/emit-schema-for.ts
- schemaFor function-call form `${ schemaFor(Users) }` inside `<schema>` (OQ-SCH-1 debate verdict Form B 50/60) → §41.15.1
- schemaFor `pick:`/`omit:` field-set transforms → §41.15.4
- schemaFor predicate → SQL CHECK lowering (per §39.5.8) → §41.15.5
- schemaFor enum-typed field lowering (`text req oneOf([variants...])`; OQ-SCH-12 load-bearing value-add) → §41.15.6 + §39.5.8 enum row
- schemaFor nested struct REJECTED v1.0 (`E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1`) → §41.15.7
- schemaFor v1.0 scope exclusions (`@table`/`@column` annotations / FK derivation / variant-payload enums / array-form / partial) → §41.15.8
- formFor markup-element form `<formFor for=Signup onsubmit=fn/>` → §41.14
- formFor slot-style per-field customization (OQ-FF-1 debate verdict 51.5/60) → §41.14.4
- formFor submit handler wiring + progressive-enhancement default (OQ-FF-2 debate verdict 52/60) → §41.14.3
- formFor `pick=` / `omit=` / `partial=true` field-set transforms → §41.14.5
- formFor `error-strategy=` per-field / summary / both → §41.14.6
- formFor label resolution layered chain (title-case + registerLabels + slot) → §41.14.7
- formFor nested-struct disposition (explicit slot required; auto-recurse v1.next) → §41.14.8
- formFor v1.0 scope exclusions (multi-step / read-only / `@label` annotation / per-type renderer registry) → §41.14.9
- not keyword / absence → §42 (18221-18532)
- compound is not / is some → §42.2.4 (~18346+)
- W-ABSENCE-IN-SCRML-SOURCE info lint (S89 regression-guard, companion to E-SYNTAX-042; covers BOTH null AND undefined absence tokens; renamed from W-NULL-IN-SCRML-SOURCE by S89-undefined-eradication-dispatch) → §34 + §42.1 (18228+) + §42.6 + §42.7 + §6.8.1 (4848+)
- defined values vs absence — `""` / `0` / `false` / `[]` / `{}` are NOT absence (S89-undefined-eradication user ruling) → §42.1.1 (18250+)
- wire format / `{"__scrml_absent": true}` envelope for `T | not` JSON payloads (S90 — M-7C-D-12 Track 4) → §57 (27050+)
- server-fn return wire format / `T | not` envelope encoding → §12.5.1 + §57 (27050+)
- decoder dual-decoder (envelope + raw JSON null) for v0.3..v0.x → §57.4 (S90)
- v1.0 clean break (canonical envelope only) → §57.5 (S90)
- DevTools / debugger experience — JS `null` bit-pattern surface for scrml `not` (S90 OQ-7) → §42.8 (~18545+)
- `default=not` canonical attribute-default absence form (S89) → §6.8.1 (4848+)
- nested program / workers → §43 (17034-17116)
- multi-database / ?{} adaptation → §44 (17117-17232)
- equality / == → §45 (17233-17294)
- worker lifecycle / when...from → §46 (17295-17341)
- output name encoding → §47 (17342-17863)
- auto-synthesized property encoding → §47 (17342-17863) + §47-Reviewed-for-v0.next note (D4)
- fn keyword / pure functions → §48 (17864-18524)
- fn mutual recursion / hoisting (S98, 2026-05-17) → §48.6.4 (~19805+) — `fn` declarations at file scope hoist per §6.9, mirroring `function`; mutual recursion supported without source-order constraints; `pinned fn` opt-out spec'd, parser-recognition implementation-pending
- pinned fn (opt-out of hoisting, implementation-pending) → §48.6.4 (~19805+) + §6.10 (4816+)
- while / do...while loops → §49 (18525-19219)
- assignment as expression → §50 (19220-19723)
- assign-as-expr × markup-as-value → §50.14 (19688+) (L1, D4)
- assign-as-expr × bare-form handlers → §50.15 (19707+) (L19, D4)
- state transitions / machine → §51 (19724-22026)
- §51.15 machine cross-check (S32) → §51 (~21482+)
- state authority / server @var → §52 (22027-22621)
- inline predicates / constraints → §53 (22622-23295)
- nested substates / state-local transitions → §54 (23296-23596)
- E-STATE-COMPLETE (S32) → §54.6 (~23472+)
- state-local transitions (S32) → §54.3 (~23358+)
- field narrowing on substates (S32) → §54.4 (~23438+)
- terminal states (S32) → §54.5 (~23455+)

<!-- Stage 0b D2.8 (2026-05-04) — v0.next additions -->
- Tier 0/1/2 ladder → §1.5 (145+) + §17.0 (8503+) + §18.0 (9232+) + §51.0 (~19734+)
- match block / `<match for=Type [on=expr]>` → §18.0.1 (~9257+)
- W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN → §18.0.2 (~9308+)
- E-MATCH-NOT-EXHAUSTIVE → §18.0.1 (~9299+)
- bare-variant inference (match arm patterns) → §18.0.3 (~9329+)
- E-VARIANT-AMBIGUOUS → §18.0.3 + §14.10
- engine declaration / `<engine for=Type initial=.X>` → §51.0.B (~19759+)
- engine state-child attribute surface (S98 normative-statements list — reserved attribute set `{rule, effect, history, internal:rule}` + payload-binding cross-ref) → §51.0.B
- engine payload binding on state-children (S98 — three forms: bare-attribute / named / parenthesized; positional + named semantics per §18.7; reserved-name precedence; unit-variant rejection; arity match) → §51.0.B.1
- payload-bearing engine state-child variants (S98 — `<OpenAt depth opener span rule=...>` canonical M1.x form; sister normative form to §18.0.1 match block-form) → §51.0.B.1
- E-ENGINE-PAYLOAD-ON-UNIT-VARIANT (S98 — payload binding attrs on a unit variant) → §51.0.B.1 + §34
- E-ENGINE-PAYLOAD-ARITY-MISMATCH (S98 — binding count != variant payload field count; attribute-list locus; §18.7 E-TYPE-021 remains for parenthesized form's arity/mixed-form per inheritance) → §51.0.B.1 + §34
- E-ENGINE-PAYLOAD-RESERVED-COLLISION (S98 — payload binding name shadows reserved state-child attribute) → §51.0.B.1 + §34
- engines as singleton → §51.0.A (~19734+)
- auto-declared engine variable → §51.0.C (~19804+)
- engine `var=` override → §51.0.C (~19826+)
- E-ENGINE-VAR-DUPLICATE → §51.0.C (~19836+)
- engine mount position (decl=mount; cross-file singleton) → §51.0.D (~19840+)
- engine `initial=` + W-ENGINE-INITIAL-MISSING → §51.0.E (~19888+)
- engine `rule=` contract (single/multi-target/wildcard) → §51.0.F (~19918+)
- E-ENGINE-INVALID-TRANSITION → §51.0.F (~19961+)
- idempotent self-write semantics (v0.3 Option-d, 2026-05-12 — self-writes to current variant are runtime no-ops, NOT rule= violations) → §51.0.F.1
- W-ENGINE-SELF-WRITE-DETECTED (v0.3 Option-d info lint — surfaces self-writes at compile time; STRICT inside-state-child + CONSERVATIVE outside-state-child fire conditions) → §51.0.F.1 + §34
- `.advance(.X)` engine method → §51.0.G (~19968+)
- engine `effect=` / `<onTransition>` (to/from/once/if=) → §51.0.H (~19996+)
- E-ENGINE-EFFECT-AMBIGUOUS → §51.0.H (~20021+)
- E-ONTRANSITION-NO-TARGET (S74 — A1b B17.3; `<onTransition>` with neither to= nor from=) → §51.0.H + §34
- `:`-shorthand for state-child body → §51.0.I (~20047+) + §4.14 (943+) (D4 universal grammar registration)
- derived engines / `derived=expr` (L20) → §51.0.J (~20067+)
- E-DERIVED-ENGINE-NO-RULES / -NO-INITIAL / -NO-WRITE / -INITIAL-ABSENT / -CIRCULAR → §51.0.J (~20098+)  (-INITIAL-ABSENT renamed S90 from -INITIAL-UNDEFINED per M-7C-D-12 Track 4 / OQ-6; line shifted +7 by §12.5.1 wire-format amendment)
- components vs engines (Move 20) / E-COMPONENT-ENGINE-SCOPE → §51.0.K (~20108+) + §15.13.5 (7960+) (D4)
- `<engine>` keyword vs legacy `<machine>` deprecation → §51.0.L (~20129+) + W-DEPRECATED-001 (§34)
- Machine Cohesion footnote (S67 — singleton invariant articulated; nested engines permitted in composite state-children) → §51.0.K
- `<onTimeout after= to=>` element (S67 — engine temporal surface; rides §51.12 runtime) → §51.0.M
- `history` attribute on composite state-children (S67 — Insight 23 #2; tree-shakeable synth cell; shallow-only) → §51.0.N + E-HISTORY-NO-INNER-ENGINE (§34)
- `.Variant.history` structured target form (S67 — for transitioning into history-restored composite state) → §51.0.N
- `internal:rule=` prefix on composite state-children (S67 — Insight 23 #4; preserves inner-engine lifecycle) → §51.0.O + E-INTERNAL-RULE-NOT-COMPOSITE (§34)
- nested `<engine>` declarations / composite state-children / hierarchy (S67 — Insight 23 #1) → §51.0.Q.1
- parent-rule cascade dispatch (S67 — Insight 23 #3; standard §51.0.F enforcement applied per variable from inside composite) → §51.0.Q.2
- cascade-miss diagnostic (S67 — extended E-ENGINE-INVALID-TRANSITION message; OQ-Harel-6) → §51.0.Q.3
- DD-Harel hierarchy interaction matrix (S67 — §51.4/§51.9/§51.11/§51.12/§51.14/§54 + .advance discipline) → §51.0.Q.4
- `<machine>` → `<engine>` cross-ref pointer (S67 — new code prefers `<engine>` + `<onTimeout>`) → §51.12 prologue
- computed-delay relaxation (S67 — `${expr}<unit>` form for both engine and machine temporal) → §51.12.3.1
- validators / req / is some / length / pattern / min / max / gt / gte / eq / oneOf → §55.1 (~23610+)
- validators on state cells (L4) → §55.2 (~23642+)
- validators on refinement types → §55.3 (~23675+) (cross-ref §53)
- validators on schema columns → §55.4 (~23702+) (cross-ref §39)
- auto-synthesized validity / isValid / errors / touched / submitted (compound) → §55.5 (~23731+)
- per-field validity surface → §55.6 (~23768+)
- synthesized-property semantics (read-only) → §55.7 (~23790+)
- E-SYNTHESIZED-WRITE → §55.7 + §34 + §6.11
- `<errors of=expr/>` first-class element (L13) → §55.8 (~23804+)
- ValidationError enum (L12) → §55.9 (~23858+)
- error message resolution / 4-level / messageFor → §55.10 (~23889+) + §41.12 (16698+) (D4)
- registerMessages / `scrml:data` → §41.12 (16698+) (L12, D4) + §55.10 (~23905+)
- cross-field validation (L14) → §55.11 (~23949+)
- E-VALIDATOR-CIRCULAR-DEP → §55.11 + §31.4 (D4) + §34
- multiple errors per field / short-circuit → §55.12 (~23977+)
- reset + validity surface → §55.13 (~23995+) (cross-ref §6.8)
- validators on engine state-cells / derived cells → §55.14 (~24010+)
- E-DERIVED-WITH-VALIDATORS → §55.14 + §34

<!-- Stage 0b D3 (2026-05-04) — channels + schema + predicates + `not` clarification -->
- channel file-level placement → §38.1 (~15191+)
- channel V5-strict body (auto-sync from placement) → §38.4 (~15298+)
- v1→v0.next channel migration note → §38.4.1 (~15347+)
- E-CHANNEL-INSIDE-PROGRAM → §38.1 + §34
- E-CHANNEL-SHARED-MODIFIER → §38.4 + §34
- schema additive shared-core vocabulary (req/length/pattern/min/max/...) → §39.5.7 (~16036+)
- schema lowering shared-core to SQL DDL → §39.5.8 (~16061+)
- schema SQL-mirror vs shared-core (when to use) → §39.5.9 (~16121+)
- refinement-type shared-core (cross-ref §55) → §53.6.1 (22975+)
- refinement-type + state-validator composition → §53.6.2 (23000+)
- `is some` vs `req` distinct predicates (L5) → §42.2.5 (~16842+)
- three loci of exists/required semantic → §42.2.5 (~16857+)

<!-- Stage 0b D4 (2026-05-04) — cleanup + structural elements + cross-refs -->
- `:`-shorthand body form (universal block-grammar) → §4.14 (943+)
- scrml-defined structural elements registry (`<engine>`/`<match>`/`<errors>`/`<onTransition>`) → §4.15 (986+) + §24.4 (13195+)
- M7 multi-close `<///>` negative-space (NOT scrml) → §4.16 (1014+)
- E-CLOSER-001 → §4.14 + §34
- E-NAME-COLLIDES-RESERVED → §4.15 + §24.4 + §34
- E-STRUCTURAL-ELEMENT-MISPLACED → §4.15 + §51.0.H + §55.8 + §34
- E-MULTI-STATEMENT-HANDLER → §5.2.3 + §4.14 + §34
- E-IMPORT-PINNED-INVALID → §21.8.1 + §34
- E-DERIVED-CIRCULAR-DEP → §31.5 + §34 (distinct from E-DERIVED-ENGINE-CIRCULAR)
- E-USE-INVALID-CTX → §41.12 + §34
- bare-form event handler bare-call / bare-assignment / bare-single-expression → §5.2.3 (1127+)
- bind dispatch by render-spec shape (text/textarea/select/checkbox/radio/file/component) → §5.4.1 (1318+)
- markup-as-expression under L1 pillar → §7.4.1 (5011+)
- V5-strict file-level scope + hoisting + pinned composition → §7.6.1 (5096+)
- logic-markup interleaving canonical form → §7.7 (5113+)
- lift under markup-as-value pillar (reframe) → §10.1.1 (5746+)
- RemoteData → engine recipe v0.next cross-ref → §13.5 (6329+)
- bare-variant inference (general expression positions) → §14.10 (7034+)
- positional binding for predefined-shape struct → §14.11 (7070+)
- components-vs-engines distinction (M20) → §15.13.5 (7960+)
- markup-as-value pillar reaffirmation for slots → §16 (8231+)
- cross-file engine import (M18) → §21.8 (11989+)
- pinned on imports → §21.8.1 (12034+)
- §22 metaprogramming v0.next reviewed → §22 (12060+)
- §28 lint suppression configs (v0.next) → §28 (13442+)
- validator predicate-arg dependency tracking (L14) → §31.4 (13546+)
- derived-state expression dependency tracking (L15, L20) → §31.5 (13574+)
- §47 output name encoding v0.next reviewed → §47 (17342+)
- registerMessages / scrml:data → §41.12 (16698+)
- §52 state authority v0.next reviewed → §52 (22027+)
- assignment-as-expression × markup-as-value (L1) → §50.14 (19688+)
- assignment-as-expression × bare-form handlers (L19) → §50.15 (19707+)
