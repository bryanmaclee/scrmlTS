# Progress: m66-b1-impl

- [START] /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a00cc900ffa1bdc52, baseline pretest 13819/0/92skip/1todo
- Plan: 2-part landing
  - Part 1: extend tokenizeOpener to recognize in-opener :-shorthand body, stamp colonShorthandBody on Markup blocks
  - Part 2: write compiler/native-parser/M6.6-CONTRACT-DERIVATION.md cookbook

## SURVEY revisit (mid-implementation)

The initial design assumed `:`-shorthand was POST-`>` per the live's
engine-statechild-parser.ts pattern (`<Small> : startGame()`). Mid-task
review of SPEC §4.14 line 961 + the worked example at line 989
(`<Idle : startGame()>`) showed the SPEC form is IN-opener
(`<Tag attrs : single-expression>` — body lives INSIDE the opener's `>`
terminator). Per S86 ratification ("SPEC catches up when implementation is
right; implementation catches up when SPEC is design-intent"), the SPEC
form is the canonical native-parser shape since SPEC §4.14 was a v0.next
formalisation explicitly written for the block-grammar layer.

The live engine-statechild-parser.ts's POST-`>` recognition is a defensive
post-process that runs OUTSIDE the BS opener tokenizer. The b.2-b.4
consumers are themselves being rewritten — they will read directly from the
SPEC-aligned native output (the b.2 cookbook recipe `block.
colonShorthandBody` is the discriminator).

The initial inspectAfterOpener `colonAt`/`colonBodyEnd` extension was
reverted; the recognizer now lives INSIDE `tokenizeOpener`'s opaque scan.

## Part 1 — Implementation (LANDED)

### Files touched
- compiler/native-parser/tag-frame.js
  - `tokenizeOpener` opaque scan extended:
    - Tracks `colonAt` (depth-0 `:` preceded by whitespace — the SPEC §4.14
      line 969 mandatory-whitespace test; excludes `bind:value` / `class:hidden`
      / `on:click` namespace separators).
    - Tracks `angleDepth` AFTER colonAt to handle embedded markup-as-value
      bodies (SPEC §4.13 / §4.14 line 990's `<Loading : <p>Loading...</>>`).
    - `>` only terminates when `bracketDepth==0 && angleDepth==0`.
  - `attrRegionEnd` adjustment — when `colonAt >= 0`, attr region ends at
    `colonAt` (the `:` is a body-introducer, not an attr).
  - Opener return shape: ADDED `colonShorthandBody: string | null` (verbatim
    post-`:` text, leading whitespace stripped; null when no `:`-shorthand).
  - `recognizeOpener` carries `opener.colonShorthandBody` onto the frame.
- compiler/native-parser/parse-markup.js
  - `dispatchInMarkupTag` adds a `colonShorthandBody`-leaf branch (mirrors
    `OpenSelfClosed` + `emitRawContentElement` short-circuits): pop the
    TagFrame, emit a child-less Markup block. No closer is expected per
    SPEC §4.14 line 968.
  - `emitMarkupElement` stamps `block.colonShorthandBody = tagFrame.
    colonShorthandBody ?? null` (null on bare-body / self-close / void —
    additive payload, existing consumers ignore).

### Mirror sync (.scrml SHAPE-only per S122 §48.3.3)
- compiler/native-parser/tag-frame.scrml — matching opaque-scan extension +
  return shape + recognizeOpener carry-over.
- compiler/native-parser/parse-markup.scrml — matching dispatcher branch +
  emitMarkupElement stamp.

### Tests added (+16 new, all passing)
compiler/tests/parser-conformance-markup.test.js — new M6.6.b.1 section
(after the `Wave 6 Unit A` section at file end):

- M6.6.b.1 §1 — tokenizeOpener `:`-shorthand capture (5 tests):
  bare form, with attrs, with quoted attr + `:`, leading-ws strip, empty body.
- M6.6.b.1 §2 — non-`:`-shorthand openers (6 tests):
  bare-body, attrs-no-`:`, self-closing, `bind:value` excluded,
  `class:hidden` excluded, `<X:expr>` no-whitespace excluded.
- M6.6.b.1 §3 — angleDepth tracking (2 tests):
  SPEC line 990 worked example, `${...}` interpolation in body.
- M6.6.b.1 §4 — parseMarkup end-to-end (3 tests):
  engine body with multiple `:`-shorthand state-children (sibling-swallow
  fix verified), bare-body `colonShorthandBody: null`, self-close
  `colonShorthandBody: null`.

## Part 2 — Cookbook (LANDED)

compiler/native-parser/M6.6-CONTRACT-DERIVATION.md (~540 lines):

- Field-by-field recipes for all 12 live `EngineStateChildEntry` fields
  (per the b.1 SURVEY classification: 1 (a), 10 (b), 1 (c)).
- 6 shared-helper definitions (`readAttrName`, `hasBareAttr`,
  `readExprValue`, `filterChildrenByName`, `sliceFromSource`,
  `sliceBodyFromChildren`) — copy-pasteable into a consumer-side
  `native-walker` module.
- Nested sub-type recipes for `EngineRuleForm` (defer to existing
  `parseRuleAttrValue`), `PayloadBinding`, `OnTimeoutEntry`,
  `NestedEngineEntry`, `OnTransitionEntry` (the 7-field `<onTransition>`
  shape — same `colonShorthandBody` discriminator as state-child entries).
- Migration order hint: b.2 (symbol-table.ts, largest consumer) →
  b.3 (dependency-graph.ts / component-3.ts, `<onTimeout>` consumers) →
  b.4 (type-system, `<onTransition>` consumers).
- 5 open questions / forward seams (e.g. `internal:rule` colon-in-attr-name
  smoke-test, helper promotion to public surface, etc.).

## Test counts

- Brief-specified (unit + integration + conformance): 13803 → 13819 (+16).
- Full compiler/tests: 19770 → 19786 (+16). 0 regressions.

## Commits

- efaafdd2 — WIP(M6.6.b.1 IMPL): start
- 644e80fd — WIP: initial post-`>` inspectAfterOpener extension (REVERTED below)
- ffdfeb48 — WIP: pivot — tokenizeOpener in-opener recognition (SPEC §4.14 line 961)
- d161e7f8 — WIP: .scrml SHAPE-only mirror sync
- bf4854d2 — test(M6.6.b.1): +16 unit tests
- 9b0c8755 — docs(M6.6.b.1): contract-derivation cookbook

## Deferred / b.2-onward

- Pre-`:` attribute-region angleDepth tracking — current `tokenizeOpener`
  doesn't track angle depth in the pre-`:` region (matches pre-existing
  behavior; would need separate dispatch if unquoted `attr=<markup>` values
  surface as gaps).
- Helper promotion to `compiler/native-parser/block-walker.js` — defer
  to b.2 (let the consumer's needs drive the public surface).
- `<onIdle>` engine-root sibling (OnIdleEntry shape) — out of b.1 scope;
  same recipe as `OnTimeoutEntry` minus `name?`, derive at b.2/b.3 engine-
  level walk.

## Tags

#m6 #m6-6 #b1 #impl #native-parser #colon-shorthand

## Links

- [b.1 SURVEY](../m66-b1-native-contract-survey/progress.md)
- [Cookbook](../../../compiler/native-parser/M6.6-CONTRACT-DERIVATION.md)
- [tag-frame.js](../../../compiler/native-parser/tag-frame.js)
- [parse-markup.js](../../../compiler/native-parser/parse-markup.js)
- [SPEC §4.14](../../../compiler/SPEC.md)
- [primary.map.md](../../../.claude/maps/primary.map.md)
