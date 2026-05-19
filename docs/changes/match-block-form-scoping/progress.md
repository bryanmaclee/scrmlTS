# `<match>` block-form implementation arc — progress

## 2026-05-19 (S107) — SCOPING.md authored

Surfaced during S107 README clarification on `rule=` semantics. User asked PA to make "rule= accepted + compiler-checked but inert at runtime" explicit. PA investigation discovered W-MATCH-RULE-INERT is spec'd but unimplemented; attempted PASS-20 walker landed on a deeper finding: the WHOLE `<match>` block-form (§18.0.1 + §18.0.2 + §18.0.3) is spec'd but the parser captures the entire block as a single `kind: "html-fragment"` AST node — no structural arm-children, no exhaustiveness check, no rule= validation, no payload binding, no codegen dispatch, no runtime render.

PASS-20 walker reverted at S107 (would never fire against html-fragment AST). User direction: "fix this the right way, right now" → SCOPING this session, impl across N sessions.

SCOPING content:
- §1 reproducer + §2 observed output (html-fragment + zero diagnostics + zero render)
- §3 spec verification per Rule 4 (§17.0 / §18.0 / §18.0.1 / §18.0.2 / §18.0.3 / §34 rows read in full from SPEC.md directly)
- §4 root cause analysis (4 sites: parser / SYM / codegen / type-system)
- §5 five-phase plan (~12-19h aggregate; parser → SYM → codegen → bare-variant + edges → tests+samples+docs)
- §6 PA recommendation: PA-direct sequenced phases (tight integration, agent-dispatch loses)
- §7 ten OQs (Q-MB-1 AST node kind / Q-MB-2 arm-child kind / Q-MB-3 payload binding mirror / Q-MB-4 bare-variant inference reuse / Q-MB-5 missing-on= error code / Q-MB-6 parser locus / Q-MB-7 backward compat / Q-MB-8 auto-implied on= scope / Q-MB-9 test infra / Q-MB-10 article+PRIMER audit)
- §8 files affected (preliminary 18-file inventory)
- §9 cross-references
- §10 tags

README posture confirmed: existing rule= clarification stays — nominal language consistent with designer's note disclaimer. This arc closes the gap between nominal + implemented.

**Next step:** surface OQs to user for ratification, then commit SCOPING. Phase 1 dispatch (parser) is the natural next-PA-action; could fit this session if budget allows OR cleanly defer.

## 2026-05-19 (S107, mid-session) — OQ ratifications via AskUserQuestion

User ratified all 4 PA recommendations:
- **Q-MB-1: New `match-block` AST kind** (not flag-on-markup) — Phase 1 introduces the kind
- **Q-MB-3: Reuse §51.0.B.1 parenthesized-form parser** — zero parallel surfaces; spec restricts match-locus to parenthesized only
- **Q-MB-5: New §34 row `E-MATCH-ON-REQUIRED`** — Phase 2 adds the row + normative bullet in §18.0.1
- **Q-MB-7: Ship the impl, let new errors surface** — no feature flag; PA greps adopter surface pre-Phase-1 + fixes/removes broken instances as part of Phase 5

Remaining OQs (Q-MB-2 / 4 / 6 / 8 / 9 / 10) are PA-internal-decidable during dispatch — surface decisions in per-phase commits.

**Next step:** commit SCOPING standalone; Phase 1 (parser) follows as the next PA action (this session if budget, otherwise next).

## 2026-05-19 (S107, post-SCOPING) — Phase 1 attempt found deeper-than-expected scope; paused

**Pre-flight grep complete (Q-MB-7 verification).** Zero adopter source files use `<match>` block-form today:
- `examples/` + `samples/compilation-tests/` — all hits are inside gitignored `dist/scrml-runtime.js` (compiled-runtime comments)
- `docs/website/pages/` — 4 hits are reference pages ABOUT `<match>` + its error codes (descriptive content with `//` comment headers + HTML-escaped descriptions), NOT live syntax
- Cut-over is safe with no migration window. Q-MB-7 ratification holds.

**Phase 1 attempt — ast-builder.js dispatch alone is insufficient.** Authored a `block.name === "match"` dispatch branch in `compiler/src/ast-builder.js` (mirroring the engine-decl `block.name === "engine"` branch at line 10657). Smoke-test failed: the new dispatch never fires.

**Root cause:** the **block-splitter (BS layer) doesn't recognize `<match>` as a structural opener** at all. BS captures the entire `<match for=Phase>...</>` block as a single `type: "text"` raw-text child of the enclosing `<program>`. By the time ast-builder.js sees the data, there's no `block.name === "match"` to dispatch on — there's only opaque text inside a synthetic logic wrapper, which becomes the `kind: "html-fragment"` AST node seen earlier.

Empirical confirmation via `splitBlocks` output for the reproducer:
```
- name="program" type=markup (children: 3)
  - name=null type=text  raw-preview="<match for=Phase on=@phase>     <Idle rule=Loading> : ..."
  - name=null type=text  raw-preview=" "
```

`name=null type=text` — the BS layer treats the whole match block as ambient text, never enters a structural-block recognizer. This is parallel to the channel + page + program + engine recognition that BS DOES perform (`name="program"` is the surrounding block in this dump).

**Revised Phase 1 scope:** must include BS-layer recognition of `<match>` as a structural opener BEFORE ast-builder.js can structure it. Need to find the BS-layer block-recognizer (likely at `block-splitter.js`'s opener-token discrimination) and add `match` to whatever known-structural-tags surface it consults.

**Reverted the ast-builder.js change** — it's dead until BS recognizes `<match>`. Saved this finding for next-session pickup. The SCOPING §8 file-inventory already lists `block-splitter.js` under Phase 1 ("recognize `<match>` as structural so it doesn't fall to html-fragment") with a `(maybe)` qualifier — that `(maybe)` is now confirmed REQUIRED.

**Phase 1 revised file inventory:**
1. `compiler/src/block-splitter.js` — add `<match>` to structural-tag recognition (probably ~1-2h investigation + edit)
2. `compiler/src/ast-builder.js` — dispatch branch as already-drafted (~30min once BS feeds it)
3. `compiler/src/attribute-registry.js` — register match-block attribute schema (`for=`, `on=`)
4. parser unit tests covering AST shape

**Phase 1 estimate refinement:** ~4-6h (was ~3-5h; +1h for BS-layer recognition + investigation).

**Pause point:** README amendment requested by user mid-session ("honest current state, link to error log, major ones called out on front page"). Phase 1 deferred to next session OR continued after the README amendment + commit. The match block-form gap is the first entry in the new `docs/known-gaps.md`; the README current-state blockquote names it explicitly with link out.

## 2026-05-19 (S107, post-README-pause) — Phase 1 SHIPPED

Resumed Phase 1 after the README amendment commit. Real root cause located + fix shape simplified dramatically from the original revised estimate.

**Actual root cause was one line in block-splitter.js.** The pre-existing `COMPOUND_LIFT_EXEMPT_TAGS = new Set(["program", "page", "channel", "schema", "seeds", "module"])` excludes those tags from `classifyOpenerForCompoundScan`'s compound-state-decl misclassification. `match` was NOT in the list, so `<match for=Phase on=@phase> <Idle>...</> ... </>` (which structurally looks like a compound-state-decl parent: opener + nested `<...>` children + `</>` close) got captured as opaque text. Adding `"match"` to the exempt list routes the block through the regular markup-opener path → BS produces `type=markup name=match` → ast-builder dispatches.

**Two-site fix:**

1. `compiler/src/block-splitter.js` — added `"match"` to `COMPOUND_LIFT_EXEMPT_TAGS` (one line + a 7-line comment explaining the S107 fix). Closes the BS-layer misclassification.

2. `compiler/src/ast-builder.js` — added `if (block.name === "match")` dispatch at the TOP of `case "markup":` (NOT in `case "state":` where my first attempt mis-placed it; BS produces `type=markup` for `<match>`, not `type=state`). The dispatch produces a `kind: "match-block"` AST node with three fields:
   - `forType: string` — bareword type name from `for=Type` (REQUIRED per §18.0.1)
   - `onExprRaw: string | null` — raw text of `on=expr` attribute (null when omitted; Phase 2 SYM PASS will fire `E-MATCH-ON-REQUIRED` when null AND no engine for Type is in scope)
   - `armsRaw: string` — raw body text (concatenated child .raw + fallback raw-slice). Phase 2's `match-statechild-parser.ts` will convert this into structured `MatchArmEntry[]`.

Plus a defensive duplicate dispatch in `case "state":` documented as unreachable (mirrors engine's historical dual-residence pattern — engine is also `type=markup` in S107+ but has dispatch code in `case "state":` for the legacy `< machine>` whitespace-state-opener path).

**Phase 1 known limitations (documented in `:`-shorthand comment + test file):**

- **`:`-shorthand body form NOT yet supported** (SPEC §18.0.1 line 9592: `<Variant> : expr`). The BS-layer treats `<Variant>` as a markup opener that needs a closer; `:`-shorthand has no closer. Arm-children today MUST use bare-body form `<Variant>...</>` or self-closing `<Variant/>`. `:`-shorthand support requires BS-layer extension parallel to engine state-child `:`-shorthand handling; deferred to Phase 2 (when the arm-parser lands and can coordinate the BS-level shape recognition).

- **AST-only landing.** SYM PASS for the 4 §18.0.2 diagnostics + E-MATCH-ON-REQUIRED ships in Phase 2. Codegen render dispatch ships in Phase 3.

**9 new unit tests at `compiler/tests/unit/match-block-parser-phase1.test.js`:**
- §1 basic recognition
- §2 field extraction (forType, onExprRaw, armsRaw)
- §3 multi-arm (3 variants all captured)
- §4 missing on= → null (Phase 2 will validate)
- §5 degenerate empty match — still produces AST node
- §6 regression — `<engine>` still produces `engine-decl` (zero overlap)
- §7 regression — `<div>` still produces regular `markup`

**Tests at Phase 1 HEAD:** 13,069 pass / 88 skip / 1 todo / 0 fail / 680 files (delta vs pre-Phase-1: +9 pass / +1 file / +22 expect / 0 regressions).

**Phase 1 file inventory (actual landings):**
1. `compiler/src/block-splitter.js` — +9 lines (1 list entry + 7 comment lines)
2. `compiler/src/ast-builder.js` — +145 lines (primary dispatch in `case "markup":` + defensive duplicate in `case "state":`)
3. `compiler/tests/unit/match-block-parser-phase1.test.js` — +180 lines (new test file)

**Phase 1 actual effort:** ~1.5h (was estimated ~4-6h after BS-layer discovery; actual much smaller because root cause was a single exempt-list entry, not a sweeping BS-layer rework).

**Next: Phase 2** — match-statechild-parser.ts that converts `armsRaw` → structured `MatchArmEntry[]`, new SYM PASS firing the 4 §18.0.2 diagnostics + E-MATCH-ON-REQUIRED, §34 catalog row for E-MATCH-ON-REQUIRED + §18.0.1 normative bullet. `:`-shorthand body form support is the natural Phase 2 surface since the arm-parser needs to recognize all three body forms anyway (self-closing, bare-body, `:`-shorthand).

## 2026-05-19 (S107, post-Phase-1) — Phase 2 SHIPPED

Phase 2 shipped end-to-end in one session-arc. All 5 diagnostics + parser + SPEC amendments + tests. Substantial deliverable; ~2.5h elapsed.

**Investigation findings (Phase 2 step 1):**

`:`-shorthand BS handling investigation surfaced that ENGINE `:`-shorthand body form ALSO breaks at BS-time when engine is at file-top (caught in same compound-state-decl + text-block-split trap that affected match). Engine tests using `:`-shorthand exist in spec but aren't exercised by the existing engine-statechild-parser tests (which use bare-body shape). Engine `:`-shorthand gap noted for follow-up but ORTHOGONAL to Phase 2 scope — engine tests pass, no regressions, fix is in match-side only this commit.

**Phase 2 deliverables (5 files):**

1. **`compiler/src/block-splitter.js` +75 lines** — added `STRUCTURAL_RAW_BODY_ELEMENTS = new Set(["match"])` + dedicated raw-body-with-explicit-close handler (mirrors RAW_CONTENT_ELEMENTS for `<pre>`/`<code>` but with `</match>` closer requirement). Match body now captured as single text-node child; arm-shape recognition deferred entirely to match-statechild-parser at SYM-time. Eliminates `:`-shorthand vs bare-body shape-confusion BEFORE downstream stages see anything.

2. **`compiler/src/match-statechild-parser.ts` NEW (+440 lines)** — Tokenizes `armsRaw` → `MatchArmEntry[]`. Recognizes all 3 body forms (self-closing / `:`-shorthand / bare-body), wildcard arm `<_>`, parenthesized payload bindings `<Ready(rows)>` (raw text; Phase 4 will tokenize). Returns parser-time diagnostics for malformed arms. Helper `extractEnumVariants(rawText)` for SYM-side variant resolution from `type Foo:enum = { ... }` decl raw text.

3. **`compiler/src/symbol-table.ts` +245 lines** — New SYM PASS 20 (`walkValidateMatchBlocks`) fires all 5 diagnostics:
   - **W-MATCH-RULE-INERT** — `rule=` attr on any arm (§18.0.2)
   - **E-MATCH-EFFECT-FORBIDDEN** — `effect=` attr on any arm (§18.0.2)
   - **E-MATCH-ONTRANSITION-FORBIDDEN** — `<onTransition>` text in any bare-body arm (§18.0.2; body-text scan, Phase 4 may upgrade to structural-AST walk)
   - **E-MATCH-NOT-EXHAUSTIVE** — variants missing AND no `<_>` wildcard (§18.0.1)
   - **E-MATCH-ON-REQUIRED** — `on=` missing AND no `<engine for=Type>` in scope (NEW §34 row this commit per Q-MB-5 ratification)
   
   File-scope helpers `collectEnumTypes` + `collectEngineGovernedTypes` walk the AST once each to build registries; per-match-block validation looks up against those registries. Engine-orthogonal — runs last alongside PASS 18/19.

4. **`compiler/SPEC.md` +2 lines** — §34 row for `E-MATCH-ON-REQUIRED` (between E-MATCH-NOT-EXHAUSTIVE and E-VARIANT-AMBIGUOUS) + §18.0.1 normative bullet at line 9615-9616 naming the diagnostic + cross-ref to Q-MB-5 ratification.

5. **`compiler/tests/unit/match-block-phase2.test.js` NEW (+255 lines / 18 tests / 45 expects)**:
   - §1 3 body forms (self-closing / `:`-shorthand / bare-body)
   - §2 wildcard arm `<_>`
   - §3 payload bindings captured as raw
   - §4 arm attrs captured
   - §5-7 attr-position diagnostics (W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN)
   - §8-9 exhaustiveness (E-MATCH-NOT-EXHAUSTIVE fires when missing; silent when `<_>` present)
   - §10-11 E-MATCH-ON-REQUIRED (fires without engine; silent with engine)
   - §12 regression — engine state-child `rule=` is NOT flagged as W-MATCH-RULE-INERT (engine path untouched)
   - §13 well-formed match block produces zero match diagnostics
   - §14 `:`-shorthand now compiles cleanly (Phase 1 limitation closed)
   - Helper unit: extractEnumVariants

**Tests at HEAD:** 13,087 pass / 88 skip / 1 todo / 0 fail / 681 files / 44,430 expect (vs Phase 1 close 13,069 / 88 / 1 / 0 / 680 / 44,385). Delta: +18 pass / +1 file / +45 expect / **0 regressions**.

**Phase 1 test fixture updates folded in:** updated `compiler/tests/unit/match-block-parser-phase1.test.js` to use `</match>` explicit closer (Phase 2 baseline; `</>` unambiguous closer for outer match is Phase 5 follow-up). Also incremented `p3-follow-no-isComponent-routing.test.js` block-splitter.js budget 21 → 23 to account for the new STRUCTURAL_RAW_BODY_ELEMENTS gate (1 isComp guard + 1 emit-stamp).

**Phase 2 scope-out (deferred to Phase 3):**
- Codegen render dispatch (per-arm DOM update on reactive cell change)
- Bare-variant inference + payload-binding type-system integration (Phase 4)
- `</>` unambiguous closer for outer match block (Phase 5; depth-tracking requires arm-parser/BS coordination)

**Phase 2 actual effort:** ~2.5h (was estimated ~2-3h). Same shape as estimate; no surprises after the BS-layer approach was locked.

**Next: Phase 3** — codegen render dispatch. Per-arm body emission with reactive subscription on `onExpr` cell. Mirrors engine state-child render dispatch shape. Estimate ~3-5h.

## 2026-05-19 (S108) — Phase 3 SHIPPED — codegen render dispatch

Phase 3 v1 landed at `ef9d219`. New file `compiler/src/codegen/emit-match.ts` (~430 LOC) consumes the variant-source-agnostic `emit-variant-guard.ts:emitVariantGuardedRender` helper (factored at S78 specifically for this match-block-form reuse). Pipeline integration: `emit-html.ts` dispatches `kind: "match-block"` to `emitMatchMountHtml` (mount slot at source position); `emit-client.ts` aggregates `emitMatchBodyRenderForFile` alongside C12/C14 engine body-render.

**Phase 3 v1 scope:**
- on= resolution: `on=@cell` (Shape A subscribe), `on=${expr}` (Shape B effect or Shape A on root @cell), `on=@cell.path` (Shape A on root), auto-implied via in-scope engine var
- Unit variants + parenthesized payload bindings (canonical §18.0.1 Tier-1 form)
- Positional payload field-name resolution per §51.0.B.1 (declaration order)
- Tree-shake on all-empty arm bodies
- Multiple match-blocks per file → independent dispatchers indexed by AST id

**Body parsing approach:** match's BS-layer STRUCTURAL_RAW_BODY_ELEMENTS gate (Phase 2) captures arm-children as a single raw text run — `bodyChildren` on the AST node carries just the text run, NOT walkable arm-body AST. Phase 3 codegen bridges by re-parsing each arm's `bodyRaw` via the BS+TAB pipeline as a synthetic fragment. Cost minimal; arm bodies are small.

**9 new unit tests in `match-block-phase3-codegen.test.js`** — AST retrofit shape + mount HTML + dispatcher + Shape A subscribe + tree-shake + multiple matches + auto-implied on=.

**Tests at HEAD:** 13,096 pass / 88 skip / 1 todo / 0 fail / 682 files (+9 from Phase 2 close; 0 regressions).

## 2026-05-19 (S108) — Phase 4 SHIPPED — `:`-shorthand body codegen

Phase 4 v1 landed. Closes the v0.3.x adopter-visible gap left by Phase 3: `<Variant> : expr` shorthand body now renders the expression value (not the literal source text including quotes).

**Implementation:** `compiler/src/codegen/emit-match.ts:buildMatchArms` extended with a `bodyForm === "shorthand"` branch. The bodyRaw is parsed as an **expression** (not as markup) via `expression-parser:parseExprToNode`. The resulting ExprNode is wrapped in a synthesized `logic > bare-expr` AST node and pushed as the arm's body. generateHtml's existing logic-node interpolation case fires unchanged:
- Compile-time-known constants (literal, `const`-bound, simple arith on consts) → folded inline via Bug 5 P3 path (`tryFoldInterpolation` → `escapeHtmlText`)
- Reactive cell refs (`@x`) → placeholder + reactive `_scrml_effect` subscription
- Non-foldable non-reactive (e.g., `someFn()`) → placeholder + one-shot textContent at DOMContentLoaded

**Pre-Phase-4 behavior:** bodyRaw flowed through the bare-body re-parse path (BS+TAB on the expression text as if it were markup). For `"Press to load"` this produced a single text node with the QUOTED source-string as text content. Output rendered as literal `"Press to load"` with quotes. Phase 4 closes this gap.

**6 new unit tests in `match-block-phase4-shorthand.test.js`** — string literal / const reference (fold) / reactive cell / compound reactive expression + regressions for bare-body + self-closing.

**Phase 4 v1 deferred (Phase 5 follow-ons):**
- Bare-variant inference in arm patterns (§18.0.3) — currently handled by Phase 2 SYM PASS for top-level arm openers; nested-position inference (e.g., `<Idle> : @phase = .Loading` writing a bare variant) is broader typer work.
- Payload-binding typer scope (`<Ready(rows)> : doSomething(rows)` — the `rows` local needs to be in the typer's scope when checking the arm body). Codegen passes `payloadBindings` to the wire-fn params; the typer-side scope extension is a sibling enhancement.
- Wildcard `<_>` explicit render — currently the helper's no-default-branch fall-through means unmatched variants keep the mount unchanged; explicit wildcard render is a Phase 5 enrichment.

**Tests at HEAD (Phase 4):** 10,909 pass / 40 skip / 0 fail (unit only; +6 from Phase 3 close in unit dir).

**Next:** Phase 5 polish (samples + integration tests + browser test for runtime arm-swap on reactive change + PRIMER §18 refresh) OR move on to other priority items.
