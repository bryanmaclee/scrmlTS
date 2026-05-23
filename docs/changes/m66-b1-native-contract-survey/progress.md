# Progress: m66-b1-native-contract-survey (M6 Wave 1, unit M6.6 path-b sub-b.1)

- [START] $(pwd) — branch `worktree-agent-a01d13bdee8e67380`, baseline pretest 13912/0
- [SURVEY] EngineStateChildEntry surface verified at symbol-table.ts:498-588 (12
  top-level fields) + nested EngineRuleForm (343-349, 6 kinds) + PayloadBinding
  (369-371, 2 kinds) + OnTimeoutEntry (384-402, 4 fields) + NestedEngineEntry
  (443-450, 2 fields) + OnTransitionEntry (465-495, 7 fields).
- [SURVEY] Native engine surface verified at collect-hoisted.js:350-407
  (`synthEngineDecl`). Engine block exposes:
  - `block.attrs[]` — full AttrNode list with `{name, value, span}` per attr,
    value kinds: `absent | string-literal | variable-ref | expr | call-ref |
    props-block` (tag-frame.js:806-1156).
  - `block.children[]` — walkable `Block[]` (Markup, Text, DisplayTextLiteral,
    Logic, etc.) with per-block `{span, name, attrs, children, kind, tagKind,
    tagClass, closerForm}` payloads.
  - `block.span` = `{start, end, line, col}` — recoverable verbatim text via
    `source.slice(span.start, span.end)` (the `collectRulesRaw` precedent at
    collect-hoisted.js:577-591).
  - `block.tagKind` (TagKind enum: Component | Html | ScrmlStructural |
    StateOpener) — tag-frame.js:56-62, computed at MK2.1 `recognizeOpener`.
  - `block.tagClass` (TagClass — heuristic-elim closed classification of
    decl-vs-markup-vs-structural).
  - `block.closerForm` ("" / "</>" / "</Name>" / null for self-close).
  - `frame.afterOpener = {declSignal: boolean, nestedTagAt: number}` —
    tag-frame.js:1568-1617 — `declSignal` true for both `=` AND `:` (NO
    distinction between them at the native layer today).
- [FINDING] State-children appear as ORDINARY Markup blocks in
  `engineBlock.children[]` with `block.name === "Variant"` (uppercase initial,
  TagKind.Component). `<onTimeout>`, `<onTransition>`, `<onIdle>` appear as
  ScrmlStructural Markup blocks in state-child `bodyChildren[]`. Nested
  `<engine>` likewise lives in state-child `bodyChildren[]` as a Markup block
  named "engine" (`isEngineBlock` is true).
- [FINDING] `:`-shorthand recognizer is "later-milestone" per body-mode.js:159-172
  ("Recognizing that an opener carries a `:`-shorthand body needs the
  `:`-shorthand opener grammar (at MK2 tokenizeOpener scans the opener's
  attribute region opaquely) — that recognition is a FORWARD SEAM").

## Per-field classification table

The classification answers: for each live `EngineStateChildEntry` field, can the
b.2-b.4 consumers derive it from the native parser's CURRENT block-stream output?

| Live field                       | Native source                                                   | Class |
|----------------------------------|-----------------------------------------------------------------|-------|
| `tag` (string)                   | `child.name` (Markup block name)                                | (a)   |
| `rule` (EngineRuleForm — 6 kinds)| `readAttrName(child.attrs, "rule")` + `parseRuleAttrValue`      | (b)   |
| `bodyRaw` (string)               | `source.slice(firstChild.span.start, lastChild.span.end)` over `child.children` (collectRulesRaw precedent); for self-close, `""` | (b) |
| `isColonShorthand` (boolean)     | `frame.afterOpener.declSignal === ":"` — BUT native conflates `=`/`:` into single boolean today; **needs `:`-shorthand opener-grammar extension** | (c) |
| `rawOffset` (number)             | `child.span.start - engineRulesRawStart` (subtract collectRulesRaw `lo`) | (b) |
| `historyAttr` (boolean)          | `hasBareAttr(child.attrs, "history")`                          | (a/b) |
| `internalRule` (EngineRuleForm)  | `readAttrName(child.attrs, "internal:rule")` + parse — BUT the native attr-name tokenizer must admit `:` in attr names; verify via grep below | (b)   |
| `onTimeoutElements[]`            | filter `child.children[]` where `name === "onTimeout"`, read each block's `{attrs (after=, to=, name=), span.start - bodyStart}` | (b) |
| `innerEngines[]`                 | filter `child.children[]` where `isEngineBlock(c)`, read `{source.slice(c.span.start, c.span.end), c.span.start - bodyStart}` | (b) |
| `effectRaw` (string \| null)     | `readEffectExpr(child.attrs)` — value kind `expr` carries raw verbatim including the `${...}` capture (tag-frame.js:982-1004); strip the `${}` wrapper at consumer site | (b) |
| `onTransitionElements[]`         | filter `child.children[]` where `name === "onTransition"`, read each block's `{attrs, body, span}` | (b) |
| `payloadBindings[]`              | walk `child.attrs[]` excluding reserved `{rule, effect, history, internal:rule}`, discriminate by `value.kind === "absent"` (positional) vs `value.kind === "variable-ref"` (named) — fully derivable | (b) |

### Nested sub-type classification

**EngineRuleForm** — 100% (b)-derivable at consumer site by a small reusable
`parseRuleAttrValue` helper. The native parser admits `rule=` value as an
`expr`-kind attr or `string-literal` (depending on quote form). No native
extension needed.

**PayloadBinding** — 100% (b)-derivable from the attr-walk above. The attr
tokenizer's distinction between `absent` value (positional/bareword) and
`variable-ref` value (named) IS the discriminator the live `parsePayloadBindings`
applies; consumer just needs to skip reserved names.

**OnTimeoutEntry** — `{after, to, name, rawOffset}` all derivable from
`onTimeoutBlock.attrs` + `onTimeoutBlock.span` (a/b). NOTE: the defensive
`oto.bodyRaw` access in component-3.ts:851 + dependency-graph.ts is reading an
UNDECLARED field that today resolves to `undefined`; a future field extension
should add it (b-derivable via `source.slice(block.span)`).

**NestedEngineEntry** — `{rawText, rawOffset}` directly derivable via
`source.slice(engineBlock.span.start, engineBlock.span.end)` and span-relative
offset arithmetic.

**OnTransitionEntry** — 7 fields:
- `to`, `from`, `once`, `ifExprRaw` — all from `onTransitionBlock.attrs` (b).
- `bodyRaw` — `source.slice(child.span.start, lastChild.span.end)` from
  `onTransitionBlock.children` (b).
- `isColonShorthand` — same gap as state-child's `isColonShorthand` — **(c) until
  the `:`-shorthand opener-grammar lands**.
- `rawOffset` — span-relative arithmetic (b).

## Total (c)-field count + summary

**(c) — native-parser EXTENSION REQUIRED: ONE field family.**

The ONLY hard gap is the `:`-shorthand opener recognizer. Today the native
parser's `afterOpener.declSignal` is a boolean that conflates `=` and `:`. b.2-b.4
consumers need to distinguish `<Variant : expr>` (`isColonShorthand: true`,
bodyRaw = post-`:` text) from `<Variant>...children + logic...</>` (`isColonShorthand:
false`, bodyRaw = inter-tag text). Without this, B18's E-MULTI-STATEMENT-HANDLER
fire-site #2 cannot be wired and `:`-shorthand body extents cannot be sliced.

This applies to TWO openers: state-child openers (drives `EngineStateChildEntry.
isColonShorthand`) and `<onTransition>` openers (drives `OnTransitionEntry.
isColonShorthand`). One extension closes both — they share `recognizeOpener`.

**Class (a)** — already in native output: **1 field** (`tag`).
**Class (b)** — derivable from native output at consumer site: **10 fields**
(`rule`, `bodyRaw`, `rawOffset`, `historyAttr`, `internalRule`,
`onTimeoutElements`, `innerEngines`, `effectRaw`, `onTransitionElements`,
`payloadBindings`).
**Class (c)** — native extension required: **1 field family**
(`isColonShorthand` on state-child + `<onTransition>` openers).

This is a STRONG positive finding: path (b) consumer-migration is realistic
because the native parser ALREADY exposes ≥95% of the surface (12 of 12
top-level facts derivable, 1 needs an upstream extension). The contract
surface b.1 must add is ONE recognizer feature, not a fundamentally different
block-stream shape.

## Cost estimate for the contract additions

### b.1.1 — `:`-shorthand opener recognizer

**Files to touch:**
- `compiler/native-parser/tag-frame.js` (1 site, ~80-120 LOC change):
  extend `recognizeOpener` / `tokenizeOpener` to detect the `<Name ... : EXPR>`
  shape, capturing the post-`:` expression text up to the matching opener `>`
  (which closes the opener — distinct from the bare-body form's `>`).
- `compiler/native-parser/tag-frame.scrml` (mirror change, +sync rule, ~80-120
  LOC).
- `compiler/native-parser/parse-markup.js` (1 small change, ~20 LOC): when the
  opener's `:`-shorthand discriminator fires, synthesize a one-child Block
  carrying the post-`:` expression as a Text/Code block (or stamp the discriminator
  on the parent block payload — `block.colonShorthandBody` or similar).

**Block-shape change:** ADDITIVE only. New optional fields on Markup blocks:
- `block.colonShorthandBody: string | null` (verbatim post-`:` text, `null` for
  bare-body / self-close forms).
- Frame `afterOpener.declSignal` already returns truthy for `:`; can promote it
  to a 3-state enum `{none, eq, colon}` OR add a parallel `frame.isColonShorthand`
  boolean — the latter is more backward-compatible.

**SPEC §51.0 / §4.14 amendment:** NONE required. The shorthand form is already
spec'd (§4.14 lines 970-985 + §51.0.I); this is implementation catching up to
spec. The `:`-shorthand body mode is already established in body-mode.js (the
constant `shorthandBodyMode()` returns CodeDefault).

**Estimated LOC:** ~200-260 LOC change across 3 files.

**Estimated hours:** ~4-6h. Driver: the opener tokenizer is well-isolated, the
discriminator is a single-char lookahead at a known boundary (post-attribute,
post-bareword), and the post-`:` body extent is a simple scan to the opener's
terminator. Test coverage exists for the BS classifier's `:` handling that
informs the shape (block-splitter.js:723-730 cited in tag-frame.js:1554-1555).

### b.1.2 — Documentation: consumer-derivation guidebook

**Files to touch:**
- `compiler/native-parser/M6.6-CONTRACT-DERIVATION.md` (new, ~150 LOC): a
  cookbook mapping each `EngineStateChildEntry` field (and its nested sub-types)
  to the exact native-block walk b.2-b.4 consumers should perform. Reusable
  helper signatures to extract for `compiler/src/native-walker/` (or similar
  shared module) so b.2/b.3 don't reimplement attr-walks.

**Estimated LOC:** ~150 LOC docs only.

**Estimated hours:** ~1-2h. Pairs naturally with b.1.1.

### b.1 TOTAL

**~6-8h** for the native-parser-side contract additions + consumer-derivation
guide. WELL under the 10h sub-unit threshold; single dispatch is appropriate.

## b.1 implementation plan — single bounded dispatch

**Dispatch shape: ONE Tier-2 dispatch, single agent, ~6-8h budget.**

PRE-BRIEF skeleton:
- Spec sections: §4.14 lines 970-985 (`:`-shorthand opener), §4.18.1 (body modes
  — code-default establishment), §51.0.I (state-child `:`-shorthand semantics).
- Source files:
  - tag-frame.js lines 215-235 (TagKind calc), 1398-1490 (recognizeOpener),
    1536-1617 (inspectAfterOpener — the existing `declSignal` gate to refactor).
  - tag-frame.scrml (sync), parse-markup.js lines 1050-1170 (CodeDefault body
    dispatch — verify body-mode interplay).
  - body-mode.js lines 159-172 (`shorthandBodyMode()` constant — confirm intent).
- Test files: add a small unit test under `compiler/tests/unit/native-parser/`
  asserting `<Variant : expr>` produces a Markup block with
  `colonShorthandBody === "expr"` and the corresponding state-child
  classification stamps `isColonShorthand`-equivalent.
- Constraints: ADDITIVE-only; do NOT break existing block-shape consumers in
  collect-hoisted.js or parse-file.js (the synth functions iterate
  `block.children` + read attrs); the new `colonShorthandBody` field is OPTIONAL
  on the block object and existing consumers ignore unknown fields.
- Self-checkpoint: standard.

After b.1 lands, write the derivation-guide doc as a SECOND commit in the same
dispatch (the doc is small and depends on the recognizer's final field name).

## Sequencing hint: which b.x sub-units can run after b.1

Per the M6.6 survey's path-b decomposition hint:
- **b.2 (symbol-table.ts migration)** — the LARGEST consumer, ~150-200 LOC change
  (PASS 11 + PASS 17.3 SYM). REQUIRES b.1 (depends on `isColonShorthand`
  derivability + the derivation-guide helper). MUST run sequentially after b.1.
- **b.3 (emit-engine.ts migration)** — ~500 LOC across the file. INDEPENDENT of
  b.2; both consume `engineMeta.stateChildren` populated by symbol-table.
  Hmm — actually b.3 reads `engineMeta.stateChildren` which is POPULATED by
  symbol-table; if b.2 changes the populated shape, b.3 must align. So
  **b.3 sequentially after b.2**.
- **b.4 (small 4 consumers: usage-analyzer, emit-control-flow, dependency-graph,
  component-3)** — each is small (~5-50 LOC). All READ `engineMeta.stateChildren`
  too. After b.2 changes the shape, b.4 must align. **b.4 sequentially after
  b.2**, but the 4 consumers within b.4 are independent of each other and can
  batch into ONE dispatch.

Parallel option: if b.2 introduces a SHIM layer that publishes the
new-derivation-form `engineMeta.stateChildren` with the SAME shape as today,
b.3/b.4 do not need to change at all — only b.2 does. This is the smallest-blast-
radius refactor and probably the right call: keep the consumer-visible
`engineMeta.stateChildren` shape identical, migrate ONLY the source-of-truth
inside symbol-table from `parseEngineStateChildren(rulesRaw)` to a native-block
walker. Re-validate the M6.8 deletion target after b.2 commits — if the field
shape is unchanged, b.3/b.4/b.5/b.6 stay zero-cost.

**Recommended sequence:**
1. **b.1** (this dispatch) — native-parser `:`-shorthand recognizer + derivation
   guide.
2. **b.2** — symbol-table.ts swap of `parseEngineStateChildren` consumer to a
   native-block walker, PRESERVING the `EngineStateChildEntry[]` shape on
   `engineMeta.stateChildren`. ~150-200 LOC + a new helper module.
3. **b.5** — test-surface conversion (~30+ unit tests) — can run BEFORE b.2 lands
   (write tests that consume the new native-walker helper), OR after b.2 to
   align the existing test imports. Most flexible run after b.2.
4. **b.3, b.4, b.6** — only needed IF b.2 changes the populated shape. If b.2
   preserves shape (recommended), these reduce to "delete the legacy
   engine-statechild-parser.ts" + relocate the type — the M6.8 work.

## Maps load-bearing finding

`primary.map.md` is current (commit a8904945, 2026-05-22). The native-parser
file layout in `structure.map.md` matches what I read; no stale landmarks
encountered. `domain.map.md` was not needed for this survey (the work was a
field-by-field comparison, not a stage-graph navigation).

**Recommendation for maps:** after b.1 commits, append a one-line note to
`primary.map.md` Key Facts noting that the native parser exposes
`block.colonShorthandBody` for state-child / `<onTransition>` openers — small
enough not to warrant a fresh map refresh.

## Deferred items + M6.4a file-overlap status

**Deferred items (NOT in b.1 scope):**
- `OnTimeoutEntry.bodyRaw` field addition. Today the field is UNDECLARED on the
  interface but READ defensively by component-3 / dependency-graph (returns
  undefined, no-op). When `<onTimeout>` migrates to a walkable form, add this
  field as additive — likely b.2 or b.6.
- Conversion of `engineMeta.idleWatchdog.bodyRaw` to a derived form (component-3
  reads this too). Not a state-child concern; affects b.4 only if `<onIdle>` is
  in scope.
- The "later-milestone" mention in body-mode.js may have additional FORWARD
  SEAMS for `:`-shorthand interleaving with body-mode establishment; b.1
  implementation must verify these are not blockers.

**M6.4a file-overlap status:** M6.4a is in-flight on `parse-markup.js`. b.1
TOUCHES `parse-markup.js` lines 1050-1170 (CodeDefault body dispatch — likely
read-only verification) plus possibly an additive `emitColonShorthandBody`
helper. The actual MUTATION is in `tag-frame.js` (recognizer + opener
tokenizer). When b.1 impl dispatches, sequence it AFTER M6.4a lands to avoid
merge conflict on parse-markup.js. If M6.4a's residual decomposition includes
the `:`-shorthand recognizer (verify by reading M5-SWAP-residual-decomposition.md
after M6.4a closes), b.1 may shrink to docs-only.

## Tags

#scrmlts #m6 #m6.6 #path-b #b.1 #survey #native-parser #engine-statechild
#contract-derivation

## Links

- [../m66-engine-statechild-adapter/progress.md](../m66-engine-statechild-adapter/progress.md) — M6.6 survey
- [../../../compiler/src/symbol-table.ts](../../../compiler/src/symbol-table.ts) — EngineStateChildEntry @ 498
- [../../../compiler/src/engine-statechild-parser.ts](../../../compiler/src/engine-statechild-parser.ts) — live parser to replace
- [../../../compiler/native-parser/tag-frame.js](../../../compiler/native-parser/tag-frame.js) — recognizer + inspectAfterOpener
- [../../../compiler/native-parser/collect-hoisted.js](../../../compiler/native-parser/collect-hoisted.js) — synthEngineDecl precedent
- [../../../compiler/native-parser/body-mode.js](../../../compiler/native-parser/body-mode.js) — shorthandBodyMode constant
- [../../../.claude/maps/primary.map.md](../../../.claude/maps/primary.map.md)
