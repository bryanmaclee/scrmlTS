# Progress — F1 native-parser attribute tokenizer

Append-only. Timestamps local.

## 2026-05-21 — startup
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a65c87caccd7d78be
- merge main (e6d2ae59) clean; bun install + pretest OK.

## 2026-05-21 — Phase 0 survey complete
- Target shape (compiler/src/types/ast.ts L42-101): `AttrValue` 6-variant union:
  string-literal / variable-ref / call-ref / expr / props-block / absent.
  `AttrNode = { name, value, span }`. `MarkupNode.attrs: AttrNode[]`.
- `tokenizedAttrs` term NOT present in compiler/src/ — it is the raw token
  stream from `tokenizeAttributes` (tokenizer.ts L247). F1 produces it as the
  parity datum.
- Live two-step: `tokenizeAttributes` (tokenizer.ts) emits ATTR_* tokens;
  `parseAttributes` (ast-builder.js L1625) folds them into `attrs[]`.
  `exprNode`/`argExprNodes` are optional Phase-3/4 fields (not tokenize-time).
- Native attach point: `tokenizeOpener` (tag-frame.{scrml,js}) currently scans
  the attr region as opaque bytes. F1 replaces that with a real attr tokenizer
  that produces `attrs[]` + `tokenizedAttrs` directly (no double-tokenize).
  `recognizeOpener` carries them onto the TagFrame; `emitMarkupElement`
  (parse-markup.js) stamps them on the Markup block.

## next
- Implement native attr tokenizer in tag-frame.{scrml,js}; thread through
  recognizeOpener + parse-markup emit; add conformance tests with live parity.

## 2026-05-21 — implementation complete
- tag-frame.js: tokenizeAttributeRegion + helpers (isEventHandlerAttrName,
  collectRefs, splitCallArgs, attrBareExprContinuation, isAttr* predicates).
  tokenizeOpener opaque scan made bracket-depth-aware; descriptor gains
  attrs[] + tokenizedAttrs.
- parse-markup.js: emitMarkupElement stamps attrs + tokenizedAttrs on the
  Markup block.
- tag-frame.scrml + parse-markup.scrml: canonical Pillar-5b shapes mirrored
  (readAttrValue / readUnquotedAttrValue / readBareHandlerExpr split out so
  the scrml form stays shallow). .scrml/.js pair 1:1.
- 48 F1 conformance tests in parser-conformance-markup.test.js (429->477):
  6-variant AttrValue, bare-form handlers, state typed-decls, helpers,
  token-stream parity vs live tokenizeAttributes, Markup-block stamping.
- Parity divergence surfaced: <a title='x>y'> — native tokenizeOpener
  treats single-quote runs as string-opaque (MK2.1 contract); live
  tokenizeAttributes recognizes only double-quoted string VALUES. Pre-existing
  MK2.1 divergence; excluded from the parity corpus with a documenting note.
- .scrml compile: zero errors attributed to tag-frame.scrml / parse-markup.scrml;
  the 56/48 transitive errors are all in display-text-literal.scrml
  (pre-existing README ANOMALY-5).
- Full suite: 17948 pass / 0 fail. markup conformance 477 pass / 0 fail.
